#!/usr/bin/env python3
"""Verifica se uma textura é "sem costura" (tileable) e gera um preview 2×2 para inspeção.

Método: compara a coluna da borda esquerda com a da direita (e a linha de cima com a de
baixo) e divide essa diferença média pela diferença média entre colunas/linhas vizinhas do
interior. Razão ≈ 1 significa que a emenda é tão suave quanto o interior; acima do limiar
(padrão 1.5) há costura visível. Também confere potência de 2 e proporção.

Requer Pillow (`pip install pillow`). Sem dependência de numpy.

Uso:
  verificar_tiling.py textura.png [--eixo both|horizontal|vertical] [--limiar 1.5]
                      [--preview preview-2x2.png] [--json]
Códigos: 0 sem costura; 1 costura detectada ou dimensão inadequada; 2 erro/dependência.
"""
from __future__ import annotations

import argparse
import json
import sys


def pot(n: int) -> bool:
    return n > 0 and (n & (n - 1)) == 0


def media_diff(a, b) -> float:
    from PIL import ImageChops, ImageStat
    d = ImageChops.difference(a, b)
    m = ImageStat.Stat(d).mean
    return sum(m) / len(m)


def analisar(caminho: str, eixo: str, limiar: float, preview: str | None):
    from PIL import Image
    img = Image.open(caminho).convert("RGB")
    w, h = img.size
    res = {"arquivo": caminho, "largura": w, "altura": h, "potencia_de_2": pot(w) and pot(h),
           "quadrada": w == h, "limiar": limiar, "eixos": {}}
    if eixo in ("both", "horizontal"):
        borda = media_diff(img.crop((0, 0, 1, h)), img.crop((w - 1, 0, w, h)))
        interior = media_diff(img.crop((0, 0, w - 1, h)), img.crop((1, 0, w, h)))
        razao = borda / interior if interior > 1e-6 else (0.0 if borda < 1e-6 else float("inf"))
        res["eixos"]["horizontal"] = {"diff_borda": round(borda, 3), "diff_interior": round(interior, 3),
                                      "razao": round(razao, 3), "sem_costura": razao <= limiar}
    if eixo in ("both", "vertical"):
        borda = media_diff(img.crop((0, 0, w, 1)), img.crop((0, h - 1, w, h)))
        interior = media_diff(img.crop((0, 0, w, h - 1)), img.crop((0, 1, w, h)))
        razao = borda / interior if interior > 1e-6 else (0.0 if borda < 1e-6 else float("inf"))
        res["eixos"]["vertical"] = {"diff_borda": round(borda, 3), "diff_interior": round(interior, 3),
                                    "razao": round(razao, 3), "sem_costura": razao <= limiar}
    if preview:
        tile = Image.new("RGB", (w * 2, h * 2))
        for dx in (0, w):
            for dy in (0, h):
                tile.paste(img, (dx, dy))
        tile.save(preview)
        res["preview"] = preview
    res["ok"] = all(e["sem_costura"] for e in res["eixos"].values()) and res["potencia_de_2"]
    return res


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("imagem", help="PNG/JPEG/WebP da textura")
    ap.add_argument("--eixo", choices=["both", "horizontal", "vertical"], default="both",
                    help="both para texturas; horizontal para panoramas equiretangulares")
    ap.add_argument("--limiar", type=float, default=1.5, help="razão borda/interior aceita (padrão 1.5)")
    ap.add_argument("--preview", help="salva um mosaico 2×2 neste caminho para inspeção humana")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    try:
        import PIL  # noqa: F401
    except ImportError:
        print("Pillow ausente: pip install pillow", file=sys.stderr)
        return 2
    try:
        res = analisar(args.imagem, args.eixo, args.limiar, args.preview)
    except (OSError, ValueError) as e:
        print(f"erro ao abrir {args.imagem}: {e}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"{res['arquivo']}: {res['largura']}x{res['altura']} pot2={res['potencia_de_2']} quadrada={res['quadrada']}")
        for nome, e in res["eixos"].items():
            print(f"  {nome}: borda {e['diff_borda']} / interior {e['diff_interior']} = razão {e['razao']} "
                  f"→ {'sem costura' if e['sem_costura'] else 'COSTURA'} (limiar {res['limiar']})")
        if "preview" in res:
            print(f"  preview 2x2: {res['preview']}")
        print("OK" if res["ok"] else "REPROVADA")
    return 0 if res["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
