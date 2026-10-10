#!/usr/bin/env python3
"""extrair_paleta.py — extrai as N cores dominantes de uma ou mais imagens (moodboard aprovado) e grava
uma paleta em hex (uma por linha) + uma amostra PNG. Ignora pixels transparentes.

Dependências: Pillow (python3 -m pip install Pillow).
Exemplo:
  extrair_paleta.py assets/referencias/moodboard_escolhido.png --cores 7 --saida design/paleta.txt --amostra design/paleta.png
A paleta resultante é ponto de partida para a seção 2 da art bible; o humano ajusta e nomeia os papéis.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def _pixels(img):
    """Iterável de pixels compatível com Pillow antigo e novo (getdata() está deprecado no Pillow 12+)."""
    return img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("imagens", nargs="+")
    ap.add_argument("--cores", type=int, default=7)
    ap.add_argument("--saida", help="arquivo .txt com um hex por linha")
    ap.add_argument("--amostra", help="PNG com as faixas de cor")
    ap.add_argument("--max-lado", type=int, default=512, help="reduz a imagem antes de quantizar (velocidade)")
    args = ap.parse_args()

    pixels = []
    for caminho in args.imagens:
        img = Image.open(caminho).convert("RGBA")
        img.thumbnail((args.max_lado, args.max_lado))
        pixels += [p[:3] for p in _pixels(img) if p[3] >= 128]
    if not pixels:
        sys.exit("nenhum pixel opaco")
    tira = Image.new("RGB", (len(pixels), 1))
    tira.putdata(pixels)
    q = tira.quantize(colors=args.cores, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[: args.cores * 3]
    contagem = sorted(q.getcolors(), reverse=True)  # (n, índice)
    cores = []
    for n, i in contagem:
        r, g, b = pal[i * 3: i * 3 + 3]
        cores.append((f"#{r:02X}{g:02X}{b:02X}", n / len(pixels)))
    for hexa, frac in cores:
        print(f"{hexa}  {frac*100:5.1f}%")
    if args.saida:
        Path(args.saida).parent.mkdir(parents=True, exist_ok=True)
        Path(args.saida).write_text("\n".join(h for h, _ in cores) + "\n", encoding="utf-8")
        print(f"paleta: {args.saida}")
    if args.amostra:
        w = 96
        am = Image.new("RGB", (w * len(cores), 120), "white")
        d = ImageDraw.Draw(am)
        for k, (hexa, frac) in enumerate(cores):
            d.rectangle([k * w, 0, (k + 1) * w - 1, 95], fill=hexa)
            d.text((k * w + 4, 100), hexa, fill="black")
        Path(args.amostra).parent.mkdir(parents=True, exist_ok=True)
        am.save(args.amostra)
        print(f"amostra: {args.amostra}")


if __name__ == "__main__":
    main()
