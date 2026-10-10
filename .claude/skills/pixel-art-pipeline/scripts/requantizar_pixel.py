#!/usr/bin/env python3
"""requantizar_pixel.py — leva uma imagem "estilo pixel art" gerada por modelo generalista para uma grade real:
reduz para o tamanho-alvo, binariza o alfa (mata o anti-aliasing), opcionalmente encaixa cada pixel na cor mais
próxima da paleta e exporta em escala inteira (vizinho mais próximo), pronta para o engine.

Dependências: Pillow (python3 -m pip install Pillow).
Exemplos:
  requantizar_pixel.py bruto.png --grade 32 --paleta design/paleta.txt --saida assets/sprites/enm_slime_idle.png
  requantizar_pixel.py bruto.png --fator 8 --metodo box --escala 3 --saida enm_slime_idle_x3.png
Regras: nunca escala fracionária; --escala só inteiro. O resultado ainda precisa de olho humano (Aseprite): o script
remove ruído, não cria leitura de forma.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def _pixels(img):
    """Iterável de pixels compatível com Pillow antigo e novo (getdata() está deprecado no Pillow 12+)."""
    return img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()


def ler_paleta(arquivo):
    cores = []
    for linha in Path(arquivo).read_text(encoding="utf-8").splitlines():
        t = linha.strip().split()[0] if linha.strip() else ""
        if t.startswith("#") and len(t) == 7:
            h = t[1:]
            cores.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
    if not cores:
        sys.exit("paleta vazia")
    return cores


def encaixar_paleta(img, paleta):
    px = img.load()
    cache = {}
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            c = cache.get((r, g, b))
            if c is None:
                c = min(paleta, key=lambda p: (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2)
                cache[(r, g, b)] = c
            px[x, y] = c + (255,)
    return img


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("--saida", required=True)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--grade", help="tamanho-alvo em px: '32' (lado maior) ou '32x48'")
    g.add_argument("--fator", type=int, help="divide largura e altura por este inteiro")
    ap.add_argument("--metodo", choices=["nearest", "box"], default="box", help="box = média por célula (menos ruído); nearest = amostra 1 px")
    ap.add_argument("--limiar-alpha", type=int, default=128, help="alfa >= limiar vira 255, abaixo vira 0 (sem semitransparência)")
    ap.add_argument("--paleta", help="arquivo com hex por linha; cada pixel vai para a cor mais próxima")
    ap.add_argument("--escala", type=int, default=1, help="escala inteira de exportação (1 = tamanho da grade)")
    args = ap.parse_args()

    img = Image.open(args.entrada).convert("RGBA")
    bb = img.getchannel("A").getbbox()
    if bb:
        img = img.crop(bb)
    if args.grade:
        if "x" in args.grade.lower():
            tw, th = map(int, args.grade.lower().split("x"))
        else:
            lado = int(args.grade)
            esc = lado / max(img.width, img.height)
            tw, th = max(1, round(img.width * esc)), max(1, round(img.height * esc))
    else:
        if args.fator < 1:
            sys.exit("--fator deve ser >= 1")
        tw, th = max(1, img.width // args.fator), max(1, img.height // args.fator)
    pequeno = img.resize((tw, th), Image.BOX if args.metodo == "box" else Image.NEAREST)
    a = pequeno.getchannel("A").point(lambda v: 255 if v >= args.limiar_alpha else 0)
    pequeno.putalpha(a)
    if args.paleta:
        pequeno = encaixar_paleta(pequeno, ler_paleta(args.paleta))
    if args.escala < 1:
        sys.exit("--escala deve ser inteiro >= 1")
    final = pequeno.resize((tw * args.escala, th * args.escala), Image.NEAREST) if args.escala > 1 else pequeno
    Path(args.saida).parent.mkdir(parents=True, exist_ok=True)
    final.save(args.saida, "PNG")
    cores = len({p[:3] for p in _pixels(pequeno) if p[3]})
    print(f"ok: {args.saida} grade {tw}x{th} · escala {args.escala}x · {cores} cores opacas")


if __name__ == "__main__":
    main()
