#!/usr/bin/env python3
"""estimar_memoria_atlas.py — estima a memória de GPU de uma textura/atlas por formato de compressão e, opcionalmente,
soma os PNGs de uma pasta para dizer quantos atlases 2048² eles ocupam.

Dependências: só biblioteca padrão; Pillow opcional para ler dimensões de PNG (--pasta).
Bits por pixel (padrão dos formatos; blocos ASTC são 128 bits): rgba32=32 rgba16=16 astc4x4=8 astc5x5=5.12
astc6x6=3.56 astc8x8=2 astc10x10=1.28 astc12x12=0.89 pvrtc4=4 pvrtc2=2 etc2_rgba8=8 etc2_rgb8=4. Mipmaps ≈ +33%.
Exemplos:
  estimar_memoria_atlas.py --largura 2048 --altura 2048 --formatos rgba32,astc4x4,astc6x6 --mipmaps
  estimar_memoria_atlas.py --pasta assets/sprites --formato astc6x6
Conferência clássica: 256×256 PVRTC 4 bpp = 32 KB (manual do Unity para iOS).
"""
import argparse
import sys
from pathlib import Path

BPP = {"rgba32": 32.0, "rgba16": 16.0, "astc4x4": 8.0, "astc5x5": 128 / 25, "astc6x6": 128 / 36, "astc8x8": 2.0,
       "astc10x10": 1.28, "astc12x12": 128 / 144, "pvrtc4": 4.0, "pvrtc2": 2.0, "etc2_rgba8": 8.0, "etc2_rgb8": 4.0}


def bytes_textura(w: int, h: int, fmt: str, mipmaps: bool) -> float:
    b = w * h * BPP[fmt] / 8.0
    return b * 4 / 3 if mipmaps else b


def fmt_kb(b: float) -> str:
    return f"{b/1024:,.0f} KB" if b < 1024 ** 2 else f"{b/1024**2:,.2f} MB"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--largura", type=int)
    ap.add_argument("--altura", type=int)
    ap.add_argument("--formatos", default="rgba32,astc4x4,astc6x6,astc8x8,pvrtc4", help="lista separada por vírgula")
    ap.add_argument("--formato", default="astc6x6", help="formato usado no modo --pasta")
    ap.add_argument("--mipmaps", action="store_true", help="inclui cadeia de mipmaps (+1/3); sprites 2D normalmente não usam")
    ap.add_argument("--pasta", help="soma a área dos PNGs da pasta (recursivo) e estima atlases 2048²")
    ap.add_argument("--atlas", type=int, default=2048, help="lado do atlas para a estimativa de contagem")
    ap.add_argument("--ocupacao", type=float, default=0.85, help="fração útil do atlas após empacotar (padrão 0,85)")
    args = ap.parse_args()

    if args.pasta:
        try:
            from PIL import Image
        except ImportError:
            sys.exit("Pillow ausente para ler PNGs: python3 -m pip install Pillow")
        area, n = 0, 0
        for p in sorted(Path(args.pasta).rglob("*.png")):
            with Image.open(p) as im:
                area += im.width * im.height
                n += 1
        if not n:
            sys.exit("nenhum PNG")
        atlases = area / (args.atlas ** 2 * args.ocupacao)
        print(f"{n} PNGs · área total {area:,} px² ≈ {atlases:.2f} atlases de {args.atlas}² (ocupação {args.ocupacao:.0%})")
        for fmt in ("rgba32", args.formato):
            print(f"  GPU em {fmt}: {fmt_kb(area * BPP[fmt] / 8)} (sem mipmaps) — fonte PNG descomprimido em RAM: {fmt_kb(area * 4)}")
        return

    if not (args.largura and args.altura):
        sys.exit("informe --largura e --altura, ou --pasta")
    print(f"{args.largura}x{args.altura}{' + mipmaps' if args.mipmaps else ''}")
    for fmt in [f.strip() for f in args.formatos.split(",") if f.strip()]:
        if fmt not in BPP:
            sys.exit(f"formato desconhecido: {fmt}; use {sorted(BPP)}")
        print(f"  {fmt:10s} {BPP[fmt]:5.2f} bpp -> {fmt_kb(bytes_textura(args.largura, args.altura, fmt, args.mipmaps))}")


if __name__ == "__main__":
    main()
