#!/usr/bin/env python3
"""verificar_seamless.py — mede se um tile (ou cada tile de um tileset) emenda sem costura ao repetir, e gera uma
prévia 3×3 (ou 3×1 para backgrounds horizontais) para o olho humano.

Dependências: Pillow (python3 -m pip install Pillow).
Métrica: diferença média absoluta (0–255) entre a última coluna e a primeira coluna (eixo h) e entre a última
linha e a primeira linha (eixo v) — é o que encosta quando o tile repete. Limiar padrão 12.
Exemplos:
  verificar_seamless.py assets/tiles/tile_floresta_grama.png --eixos hv --preview production/evidencias/.../grama_3x3.png
  verificar_seamless.py assets/tiles/tileset_floresta.png --tile-w 32 --tile-h 32 --eixos hv --max-diff 10
  verificar_seamless.py assets/backgrounds/bg_floresta_meio.png --eixos h --preview .../bg_meio_3x1.png
Código de saída 2 se algum tile exceder --max-diff.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageStat
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def diff_media(a: Image.Image, b: Image.Image) -> float:
    d = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
    return sum(ImageStat.Stat(d).mean) / 3.0


def medir(tile: Image.Image, eixos: str):
    res = {}
    if "h" in eixos:
        res["h"] = diff_media(tile.crop((tile.width - 1, 0, tile.width, tile.height)), tile.crop((0, 0, 1, tile.height)))
    if "v" in eixos:
        res["v"] = diff_media(tile.crop((0, tile.height - 1, tile.width, tile.height)), tile.crop((0, 0, tile.width, 1)))
    return res


def preview(tile: Image.Image, eixos: str, caminho: str):
    nx, ny = (3 if "h" in eixos else 1), (3 if "v" in eixos else 1)
    out = Image.new("RGBA", (tile.width * nx, tile.height * ny), (0, 0, 0, 0))
    for j in range(ny):
        for i in range(nx):
            out.alpha_composite(tile.convert("RGBA"), (i * tile.width, j * tile.height))
    Path(caminho).parent.mkdir(parents=True, exist_ok=True)
    out.save(caminho, "PNG")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", help="tile único, background ou tileset em grade")
    ap.add_argument("--tile-w", type=int, help="largura do tile quando a entrada é um tileset")
    ap.add_argument("--tile-h", type=int)
    ap.add_argument("--eixos", choices=["h", "v", "hv"], default="hv")
    ap.add_argument("--max-diff", type=float, default=12.0)
    ap.add_argument("--preview", help="PNG com o tile repetido (3x3 ou 3x1); para tileset, usa o 1º tile ou --indice")
    ap.add_argument("--indice", type=int, default=0, help="índice do tile do tileset para o preview")
    args = ap.parse_args()

    img = Image.open(args.entrada).convert("RGBA")
    tiles = []
    if args.tile_w and args.tile_h:
        for r in range(img.height // args.tile_h):
            for c in range(img.width // args.tile_w):
                t = img.crop((c * args.tile_w, r * args.tile_h, (c + 1) * args.tile_w, (r + 1) * args.tile_h))
                if t.getchannel("A").getbbox():
                    tiles.append((f"[{r},{c}]", t))
    else:
        tiles.append(("", img))

    falhou = False
    for nome, t in tiles:
        m = medir(t, args.eixos)
        ruim = any(v > args.max_diff for v in m.values())
        falhou |= ruim
        txt = " ".join(f"{k}={v:.1f}" for k, v in m.items())
        print(f"{'COSTURA' if ruim else 'OK'} {args.entrada}{nome}: {txt} (limite {args.max_diff})")
    if args.preview and tiles:
        idx = min(args.indice, len(tiles) - 1)
        preview(tiles[idx][1], args.eixos, args.preview)
        print(f"preview: {args.preview}")
    sys.exit(2 if falhou else 0)


if __name__ == "__main__":
    main()
