#!/usr/bin/env python3
"""comparar-screenshots.py — diff de pixels entre referência e screenshot atual.

Uso: comparar-screenshots.py referencia.png atual.png [--limiar 2.0] [--tolerancia 24]
                              [--regiao x,y,w,h] [--diff saida-diff.png]
Saída: imprime JSON {percent_diferente, limiar, aprovado, tamanho} e grava diff.png (pixels diferentes em vermelho).
Código de saída: 0 aprovado (percent <= limiar), 2 reprovado, 3 Pillow ausente, 4 argumentos/tamanhos incompatíveis.
Requer Pillow (pip install pillow). Imagens de tamanhos diferentes são redimensionadas para o menor (aviso).
"""
import argparse
import json
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("referencia")
    ap.add_argument("atual")
    ap.add_argument("--limiar", type=float, default=2.0, help="percentual máximo de pixels diferentes (padrão 2.0)")
    ap.add_argument("--tolerancia", type=int, default=24, help="diferença RGB somada abaixo da qual o pixel é igual (padrão 24)")
    ap.add_argument("--regiao", help="x,y,w,h em pixels para comparar só uma área (ex.: HUD)")
    ap.add_argument("--diff", default="diff.png", help="arquivo de saída do diff (padrão diff.png)")
    args = ap.parse_args()
    try:
        from PIL import Image, ImageChops
    except ImportError:
        print("Pillow não instalado: pip install pillow", file=sys.stderr)
        return 3
    a = Image.open(args.referencia).convert("RGB")
    b = Image.open(args.atual).convert("RGB")
    if a.size != b.size:
        w, h = min(a.width, b.width), min(a.height, b.height)
        print(f"aviso: tamanhos diferentes {a.size} vs {b.size}; redimensionando para {(w, h)}", file=sys.stderr)
        a, b = a.resize((w, h)), b.resize((w, h))
    if args.regiao:
        try:
            x, y, w, h = (int(v) for v in args.regiao.split(","))
        except ValueError:
            print("--regiao deve ser x,y,w,h", file=sys.stderr)
            return 4
        a, b = a.crop((x, y, x + w, y + h)), b.crop((x, y, x + w, y + h))
    diff = ImageChops.difference(a, b)
    px = diff.load()
    total = a.width * a.height
    diferentes = 0
    out = b.copy()
    opx = out.load()
    for yy in range(a.height):
        for xx in range(a.width):
            r, g, bl = px[xx, yy]
            if r + g + bl > args.tolerancia:
                diferentes += 1
                opx[xx, yy] = (255, 0, 0)
    percent = 100.0 * diferentes / total if total else 0.0
    out.save(args.diff)
    aprovado = percent <= args.limiar
    print(json.dumps({"percent_diferente": round(percent, 3), "limiar": args.limiar, "aprovado": aprovado,
                      "tamanho": [a.width, a.height], "diff": args.diff}, ensure_ascii=False))
    return 0 if aprovado else 2


if __name__ == "__main__":
    sys.exit(main())
