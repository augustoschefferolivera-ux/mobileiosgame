#!/usr/bin/env python3
"""chroma_para_alfa.py — converte um fundo chroma-key (padrão verde #00FF00, como o template "Sprite Sheet Generator" do
ComfyUI pede) em transparência real, com remoção do "vazamento" verde nas bordas (despill), e opcionalmente apara a imagem.

Dependências: Pillow (python3 -m pip install Pillow).
Como funciona: pixels cuja distância RGB até a cor-chave é < --tolerancia viram alfa 0; entre --tolerancia e
--tolerancia+--suavidade recebem alfa proporcional (borda suave); pixels restantes com G dominante próximo da chave
têm o verde reduzido a max(R,B) (despill). Depois disso use `slice_spritesheet.py fatiar` para cortar a grade.
Exemplos:
  chroma_para_alfa.py sheet_walk.png --saida sheet_walk_alfa.png
  chroma_para_alfa.py sheet_walk.png --chave "#00FF00" --tolerancia 60 --suavidade 40 --despill --aparar --margem 4 --saida out.png
Código 2 se menos de --min-fundo % da imagem era chroma (sinal de que o modelo não respeitou o fundo).
"""
import argparse
import math
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--chave", default="#00FF00")
    ap.add_argument("--tolerancia", type=float, default=60, help="distância RGB abaixo da qual o pixel é fundo (0–441)")
    ap.add_argument("--suavidade", type=float, default=40, help="faixa de transição para alfa parcial")
    ap.add_argument("--despill", action="store_true", help="reduz verde residual nas bordas (só para chave verde)")
    ap.add_argument("--aparar", action="store_true", help="recorta à caixa de alfa")
    ap.add_argument("--margem", type=int, default=2)
    ap.add_argument("--min-fundo", type=float, default=20, help="%% mínimo de pixels de fundo esperado")
    a = ap.parse_args()

    img = Image.open(a.entrada).convert("RGBA")
    kr, kg, kb = hex_rgb(a.chave)
    px = img.load()
    w, h = img.size
    fundo = 0
    for y in range(h):
        for x in range(w):
            r, g, b, al = px[x, y]
            d = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
            if d < a.tolerancia:
                px[x, y] = (r, g, b, 0); fundo += 1
            elif d < a.tolerancia + a.suavidade:
                novo = int(255 * (d - a.tolerancia) / a.suavidade)
                if a.despill and g > max(r, b):
                    g = max(r, b)
                px[x, y] = (r, g, b, min(al, novo))
            elif a.despill and kg > kr and kg > kb and g > max(r, b) + 20 and d < a.tolerancia + 3 * a.suavidade:
                px[x, y] = (r, max(r, b), b, al)
    frac = 100.0 * fundo / (w * h)
    if a.aparar:
        bb = img.getchannel("A").getbbox()
        if bb:
            bb = (max(0, bb[0] - a.margem), max(0, bb[1] - a.margem), min(w, bb[2] + a.margem), min(h, bb[3] + a.margem))
            img = img.crop(bb)
    Path(a.saida).parent.mkdir(parents=True, exist_ok=True)
    img.save(a.saida, "PNG")
    print(f"ok: {a.saida} · {frac:.1f}% da imagem era fundo chroma · tamanho final {img.width}x{img.height}")
    if frac < a.min_fundo:
        print(f"AVISO: só {frac:.1f}% de fundo chroma (< {a.min_fundo}%): o modelo pode ter ignorado o fundo ou a tolerância está baixa", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
