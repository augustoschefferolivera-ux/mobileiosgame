#!/usr/bin/env python3
"""Ícones provisórios da PWA (design/decisoes-F-010.md PW4): uma brasa sobre #1a1f2b. O ícone final é da F-011.

Gera, em public/icones/, os PNG versionados: icone-192.png, icone-512.png, icone-maskable-512.png (brasa dentro da zona
segura de 80%) e apple-touch-icon.png (180, opaco). Uso: python3 scripts/gerar-icones.py
"""
import os
from PIL import Image, ImageDraw

FUNDO = (0x1A, 0x1F, 0x2B)
BRASA = (0xFF, 0xB3, 0x47)
CLARA = (0xFF, 0xD6, 0x99)
QUEIMADO = (0xE2, 0x65, 0x2B)
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "icones")


def icone(lado: int, fracao: float) -> Image.Image:
    """Fundo cheio com a brasa em camadas (queimado, brasa, clara) ocupando `fracao` do lado."""
    ss = 4  # supersampling para a borda suave
    img = Image.new("RGB", (lado * ss, lado * ss), FUNDO)
    d = ImageDraw.Draw(img)
    c = lado * ss / 2
    for cor, raio in ((QUEIMADO, 0.5), (BRASA, 0.36), (CLARA, 0.2)):
        r = lado * ss * fracao * raio
        d.ellipse((c - r, c - r, c + r, c + r), fill=cor)
    return img.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    os.makedirs(SAIDA, exist_ok=True)
    for nome, lado, fracao in (
        ("icone-192.png", 192, 0.9),
        ("icone-512.png", 512, 0.9),
        ("icone-maskable-512.png", 512, 0.7),
        ("apple-touch-icon.png", 180, 0.9),
    ):
        icone(lado, fracao).save(os.path.join(SAIDA, nome), optimize=True)
        print("ok", nome)


if __name__ == "__main__":
    main()
