#!/usr/bin/env python3
"""verificar_paleta.py — mede quanto de uma imagem está fora da paleta da art bible (seção 2) e marca os pixels fora.

Dependências: Pillow (python3 -m pip install Pillow).
Paleta: arquivo texto com um hex por linha (#RRGGBB; linhas com # no início após espaço ou vazias são ignoradas),
ou lista inline com --hex "#112233,#445566".
Exemplo:
  verificar_paleta.py assets/sprites/chr_heroi_idle.png --paleta design/paleta.txt --tolerancia 28 --max-fora 8 \
      --mapa production/evidencias/2026-10-10-heroi/paleta_fora.png
Código de saída 2 se a fração de pixels fora da paleta exceder --max-fora (%). Pixel art: use --tolerancia 0..8;
arte pintada: 24..40 (há gradientes legítimos). Pixels com alfa < 128 são ignorados.
"""
import argparse
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def _pixels(img):
    """Iterável de pixels compatível com Pillow antigo e novo (getdata() está deprecado no Pillow 12+)."""
    return img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()


def ler_paleta(arquivo, inline):
    hexes = []
    if arquivo:
        for linha in Path(arquivo).read_text(encoding="utf-8").splitlines():
            linha = linha.strip().split()[0] if linha.strip() else ""
            if linha.startswith("#") and len(linha) == 7:
                hexes.append(linha)
    if inline:
        hexes += [h.strip() for h in inline.split(",") if h.strip()]
    cores = []
    for h in hexes:
        h = h.lstrip("#")
        cores.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
    if not cores:
        sys.exit("paleta vazia")
    return cores


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("imagens", nargs="+")
    ap.add_argument("--paleta", help="arquivo .txt com hex por linha")
    ap.add_argument("--hex", help="paleta inline separada por vírgula")
    ap.add_argument("--tolerancia", type=float, default=24, help="distância RGB máxima (euclidiana) para considerar 'na paleta'")
    ap.add_argument("--max-fora", type=float, default=10, help="percentual máximo de pixels fora da paleta")
    ap.add_argument("--mapa", help="PNG destacando em magenta os pixels fora (só para a 1ª imagem, ou use com 1 imagem)")
    ap.add_argument("--top", type=int, default=5, help="quantas cores 'fora' mais frequentes listar")
    args = ap.parse_args()

    paleta = ler_paleta(args.paleta, args.hex)
    tol2 = args.tolerancia ** 2
    falhou = False
    for n, caminho in enumerate(args.imagens):
        img = Image.open(caminho).convert("RGBA")
        dados = _pixels(img)
        fora = Counter()
        total = 0
        mapa = Image.new("RGBA", img.size, (0, 0, 0, 0)) if (args.mapa and n == 0) else None
        px_mapa = mapa.load() if mapa else None
        cache = {}
        for i, (r, g, b, a) in enumerate(dados):
            if a < 128:
                continue
            total += 1
            chave = (r >> 2, g >> 2, b >> 2)
            ok = cache.get(chave)
            if ok is None:
                ok = any((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2 <= tol2 for pr, pg, pb in paleta)
                cache[chave] = ok
            if not ok:
                fora[(r, g, b)] += 1
                if px_mapa is not None:
                    px_mapa[i % img.width, i // img.width] = (255, 0, 255, 255)
            elif px_mapa is not None:
                px_mapa[i % img.width, i // img.width] = (r, g, b, 60)
        pct = 100.0 * sum(fora.values()) / total if total else 0.0
        status = "OK" if pct <= args.max_fora else "FORA"
        print(f"{status}: {caminho} — {pct:.1f}% dos {total} pixels opacos fora da paleta (tolerância {args.tolerancia}, limite {args.max_fora}%)")
        for (r, g, b), c in fora.most_common(args.top):
            print(f"   #{r:02X}{g:02X}{b:02X} x{c}")
        if mapa:
            Path(args.mapa).parent.mkdir(parents=True, exist_ok=True)
            mapa.save(args.mapa)
            print(f"   mapa: {args.mapa}")
        falhou |= pct > args.max_fora
    sys.exit(2 if falhou else 0)


if __name__ == "__main__":
    main()
