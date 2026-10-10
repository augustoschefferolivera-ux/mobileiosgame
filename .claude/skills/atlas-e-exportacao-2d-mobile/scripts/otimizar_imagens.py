#!/usr/bin/env python3
"""otimizar_imagens.py — reduz o peso de PNGs do build web e gera WebP com alfa (fallback PNG), medindo antes/depois.

Ferramentas externas usadas se existirem no PATH (nunca obrigatórias):
  oxipng   (MIT)       `oxipng -o 4 --strip safe --alpha` — sem perda
  pngquant (GPL v3 ou licença comercial; a licença da ferramenta não afeta o PNG de saída) `--quality 70-95` — com perda (paleta)
  cwebp    (libwebp, BSD) `-q 85 -alpha_q 100 -m 6`
Fallback só com Pillow: PNG `optimize=True` e WebP `quality=85, method=6` (Pillow precisa ter sido compilado com libwebp).
Pixel art: use --sem-perda (nunca pngquant/WebP com perda em paleta fechada).
Exemplos:
  otimizar_imagens.py public/assets/atlas --webp --relatorio production/evidencias/2026-10-10-atlas/pesos.json
  otimizar_imagens.py public/assets --pngquant --quality 70-95
Saída: tabela de bytes antes/depois; arquivos .webp ao lado dos .png (o Phaser carrega o que o navegador suportar;
Safari suporta WebP desde a versão 14 [MDN/caniuse, secundário]). Código 2 se algum arquivo falhar.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, features
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def coletar(entradas):
    arqs = []
    for e in entradas:
        p = Path(e)
        arqs += sorted(p.rglob("*.png")) if p.is_dir() else ([p] if p.exists() else [])
    return arqs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entradas", nargs="+")
    ap.add_argument("--webp", action="store_true", help="gera .webp ao lado de cada .png")
    ap.add_argument("--qualidade-webp", type=int, default=85)
    ap.add_argument("--pngquant", action="store_true", help="quantiza com perda (fora de pixel art)")
    ap.add_argument("--quality", default="70-95", help="faixa do pngquant")
    ap.add_argument("--sem-perda", action="store_true", help="só oxipng/optimize; WebP lossless")
    ap.add_argument("--relatorio", help="JSON com bytes antes/depois")
    a = ap.parse_args()

    arqs = coletar(a.entradas)
    if not arqs:
        sys.exit("nenhum PNG")
    oxipng, pngquant, cwebp = shutil.which("oxipng"), shutil.which("pngquant"), shutil.which("cwebp")
    print(f"ferramentas: oxipng={'sim' if oxipng else 'não (Pillow optimize)'} pngquant={'sim' if pngquant else 'não'} "
          f"cwebp={'sim' if cwebp else 'não (Pillow webp=' + str(features.check('webp')) + ')'}")
    rel, falhas, tot0, tot1, totw = [], 0, 0, 0, 0
    for p in arqs:
        antes = p.stat().st_size
        try:
            if a.pngquant and not a.sem_perda:
                if pngquant:
                    subprocess.run([pngquant, "--force", "--skip-if-larger", "--quality", a.quality, "--ext", ".png", str(p)],
                                   check=False, capture_output=True)
                else:
                    img = Image.open(p).convert("RGBA")
                    img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(p, "PNG", optimize=True)
            if oxipng:
                subprocess.run([oxipng, "-o", "4", "--strip", "safe", "--alpha", "--quiet", str(p)], check=False, capture_output=True)
            else:
                Image.open(p).save(p, "PNG", optimize=True)
            depois = p.stat().st_size
            wb = None
            if a.webp:
                wp = p.with_suffix(".webp")
                if cwebp:
                    cmd = [cwebp, "-quiet", "-m", "6"] + (["-lossless"] if a.sem_perda else ["-q", str(a.qualidade_webp), "-alpha_q", "100"]) + [str(p), "-o", str(wp)]
                    subprocess.run(cmd, check=True, capture_output=True)
                else:
                    if not features.check("webp"):
                        raise RuntimeError("Pillow sem suporte a WebP e cwebp ausente")
                    Image.open(p).convert("RGBA").save(wp, "WEBP", quality=a.qualidade_webp, method=6, lossless=a.sem_perda)
                wb = wp.stat().st_size
                totw += wb
            tot0 += antes
            tot1 += depois
            rel.append({"arquivo": str(p), "antes": antes, "depois": depois, "webp": wb})
            print(f"{p.name}: {antes/1024:.1f} KB → {depois/1024:.1f} KB" + (f" · webp {wb/1024:.1f} KB" if wb else ""))
        except (OSError, RuntimeError, subprocess.CalledProcessError) as e:
            falhas += 1
            print(f"{p.name}: FALHA {e}", file=sys.stderr)
    print(f"total PNG: {tot0/1024:.1f} KB → {tot1/1024:.1f} KB" + (f" · WebP {totw/1024:.1f} KB" if a.webp else ""))
    if a.relatorio:
        Path(a.relatorio).parent.mkdir(parents=True, exist_ok=True)
        Path(a.relatorio).write_text(json.dumps({"arquivos": rel, "total_antes": tot0, "total_depois": tot1, "total_webp": totw}, indent=2), encoding="utf-8")
    if falhas:
        sys.exit(2)


if __name__ == "__main__":
    main()
