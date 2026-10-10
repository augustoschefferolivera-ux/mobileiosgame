#!/usr/bin/env python3
"""verificar_contraste.py — calcula a razão de contraste WCAG 2.x entre pares de cores do style card e confere alvos de toque.

Só biblioteca padrão. Limiares padrão: texto ≥ 4,5:1 (WCAG 1.4.3 AA), gráficos/ícones ≥ 3,0:1 (WCAG 1.4.11),
alvo de toque ≥ 44×44 pt (HIG da Apple, "Designing for games": tamanho padrão de botão em iOS 44×44 pt; mínimo 28×28 pt).
Exemplos:
  verificar_contraste.py --texto "#F2F2F2,#1B1F2A" --texto "#FFD166,#2E3A4F" --grafico "#FF3C8E,#0D0F1A" --toque 48x48 --toque 160x44
  verificar_contraste.py --style-card design/style-card.md      # lê todos os hex da tabela "Paleta de UI" e testa cada um contra o 1º (fundo de painel)
Código 2 se algum par ou alvo ficar abaixo do limiar.
"""
import argparse
import re
import sys
from pathlib import Path


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"hex inválido: {h}")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def razao(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--texto", action="append", default=[], help='"#frente,#fundo" (repetível)')
    ap.add_argument("--grafico", action="append", default=[], help='"#frente,#fundo" (repetível)')
    ap.add_argument("--toque", action="append", default=[], help="LARGURAxALTURA em pt (repetível)")
    ap.add_argument("--style-card", help="markdown com tabela de paleta; 1º hex = fundo de painel")
    ap.add_argument("--min-texto", type=float, default=4.5)
    ap.add_argument("--min-grafico", type=float, default=3.0)
    ap.add_argument("--min-toque", type=int, default=44)
    a = ap.parse_args()

    pares = [(p, "texto", a.min_texto) for p in a.texto] + [(p, "grafico", a.min_grafico) for p in a.grafico]
    if a.style_card:
        hexes = re.findall(r"#[0-9A-Fa-f]{6}", Path(a.style_card).read_text(encoding="utf-8"))
        if len(hexes) >= 2:
            fundo = hexes[0]
            pares += [(f"{h},{fundo}", "grafico", a.min_grafico) for h in dict.fromkeys(hexes[1:])]
    if not pares and not a.toque:
        ap.error("informe --texto/--grafico/--toque ou --style-card")
    falhas = 0
    for par, tipo, minimo in pares:
        try:
            f, b = [x.strip() for x in par.split(",")]
            r = razao(f, b)
        except ValueError as e:
            print(f"{par}: {e}"); falhas += 1; continue
        ok = r >= minimo
        falhas += 0 if ok else 1
        print(f"{tipo:8} {f} sobre {b}: {r:5.2f}:1  (mín {minimo}) {'OK' if ok else 'FALHA'}")
    for t in a.toque:
        try:
            w, h = (int(x) for x in t.lower().split("x"))
        except ValueError:
            print(f"--toque inválido: {t}"); falhas += 1; continue
        ok = w >= a.min_toque and h >= a.min_toque
        falhas += 0 if ok else 1
        print(f"toque    {w}x{h} pt (mín {a.min_toque}x{a.min_toque}) {'OK' if ok else 'FALHA'}")
    if falhas:
        print(f"{falhas} item(ns) abaixo do limiar", file=sys.stderr); sys.exit(2)


if __name__ == "__main__":
    main()
