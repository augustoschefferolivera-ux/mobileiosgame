#!/usr/bin/env python3
"""contact_sheet.py — monta uma folha de contato (grade com rótulos) para curadoria e evidência humana.

Dependências: Pillow (python3 -m pip install Pillow).
Exemplo:
  contact_sheet.py assets/brutos/2026-10-10/recortes --colunas 4 --celula 256 --fundo xadrez \
    --saida production/evidencias/2026-10-10-sprites-heroi/contact-sheet.png
Fundo "xadrez" revela halos e alfa sujo; "#RRGGBB" testa a leitura sobre a cor do cenário.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")

EXT = {".png", ".webp", ".jpg", ".jpeg"}


def coletar(entradas):
    arqs = []
    for e in entradas:
        p = Path(e)
        if p.is_dir():
            arqs += sorted(x for x in p.iterdir() if x.suffix.lower() in EXT)
        elif p.exists():
            arqs.append(p)
    return arqs


def fundo_celula(tam, modo):
    if modo == "xadrez":
        img = Image.new("RGBA", (tam, tam), (200, 200, 200, 255))
        d = ImageDraw.Draw(img)
        q = max(8, tam // 16)
        for y in range(0, tam, q):
            for x in range(0, tam, q):
                if (x // q + y // q) % 2 == 0:
                    d.rectangle([x, y, x + q - 1, y + q - 1], fill=(150, 150, 150, 255))
        return img
    cor = modo.lstrip("#")
    rgb = tuple(int(cor[i:i + 2], 16) for i in (0, 2, 4))
    return Image.new("RGBA", (tam, tam), rgb + (255,))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entradas", nargs="+")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--colunas", type=int, default=4)
    ap.add_argument("--celula", type=int, default=256, help="lado da célula em px (imagem reduzida para caber; ampliada só com --ampliar)")
    ap.add_argument("--fundo", default="xadrez", help="'xadrez' ou '#RRGGBB'")
    ap.add_argument("--ampliar", action="store_true", help="amplia imagens pequenas em escala inteira (vizinho mais próximo; pixel art)")
    ap.add_argument("--sem-rotulos", action="store_true")
    args = ap.parse_args()

    arqs = coletar(args.entradas)
    if not arqs:
        sys.exit("nenhuma imagem")
    rot = 0 if args.sem_rotulos else 18
    cel = args.celula
    cols = max(1, min(args.colunas, len(arqs)))
    linhas = (len(arqs) + cols - 1) // cols
    folha = Image.new("RGBA", (cols * cel, linhas * (cel + rot)), (30, 30, 30, 255))
    d = ImageDraw.Draw(folha)
    for i, arq in enumerate(arqs):
        img = Image.open(arq).convert("RGBA")
        esc = min(cel / img.width, cel / img.height)
        if esc < 1:
            img = img.resize((max(1, int(img.width * esc)), max(1, int(img.height * esc))), Image.LANCZOS)
        elif esc >= 2 and args.ampliar:
            k = int(esc)
            img = img.resize((img.width * k, img.height * k), Image.NEAREST)
        celula = fundo_celula(cel, args.fundo)
        celula.alpha_composite(img, ((cel - img.width) // 2, (cel - img.height) // 2))
        x, y = (i % cols) * cel, (i // cols) * (cel + rot)
        folha.alpha_composite(celula, (x, y))
        if rot:
            d.text((x + 3, y + cel + 2), arq.name[:38], fill=(230, 230, 230, 255))
    Path(args.saida).parent.mkdir(parents=True, exist_ok=True)
    folha.save(args.saida, "PNG")
    print(f"ok: {args.saida} ({len(arqs)} imagens, {cols}x{linhas})")


if __name__ == "__main__":
    main()
