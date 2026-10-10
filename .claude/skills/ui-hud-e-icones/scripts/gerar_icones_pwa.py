#!/usr/bin/env python3
"""gerar_icones_pwa.py — a partir de um master 1024×1024 (PNG, com ou sem alfa) gera os ícones do jogo web:
icon-192.png e icon-512.png (manifest, purpose "any"), icon-192-maskable.png e icon-512-maskable.png (purpose "maskable":
conteúdo reduzido para a zona segura e fundo opaco), apple-touch-icon-180.png (iOS, fundo opaco, sem cantos — o iOS aplica
a máscara) e favicon-32.png; imprime o trecho `icons` do manifest.webmanifest e as tags <link>.

Dependências: Pillow. Tamanhos 192/512 e "maskable" seguem o guia de ícones de PWA da MDN; 180 px para apple-touch-icon é
prática comum [confirmar na documentação da Apple para web apps]. Zona segura do ícone maskable: o conteúdo importante
fica dentro de um círculo de 80% (padrão --zona-segura 0.8).
Exemplo:
  gerar_icones_pwa.py design/icone_master_1024.png --fundo "#1B1F2A" --saida public/icons
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def quadrado(img):
    w, h = img.size
    lado = min(w, h)
    return img.crop(((w - lado) // 2, (h - lado) // 2, (w - lado) // 2 + lado, (h - lado) // 2 + lado))


def exportar(base, lado, caminho, fundo=None, zona=None):
    img = base
    if zona:
        conteudo = base.resize((int(lado * zona), int(lado * zona)), Image.LANCZOS)
        tela = Image.new("RGBA", (lado, lado), fundo + (255,))
        tela.alpha_composite(conteudo, ((lado - conteudo.width) // 2, (lado - conteudo.height) // 2))
        img = tela
    else:
        img = base.resize((lado, lado), Image.LANCZOS)
        if fundo is not None:
            tela = Image.new("RGBA", (lado, lado), fundo + (255,))
            tela.alpha_composite(img)
            img = tela
    img.save(caminho, "PNG", optimize=True)
    return caminho


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("master", help="PNG ≥ 1024×1024")
    ap.add_argument("--saida", default="public/icons")
    ap.add_argument("--fundo", required=True, help="cor opaca para maskable/apple-touch-icon (cor do jogo)")
    ap.add_argument("--zona-segura", type=float, default=0.8)
    ap.add_argument("--prefixo-url", default="/icons")
    a = ap.parse_args()

    base = quadrado(Image.open(a.master).convert("RGBA"))
    if base.width < 1024:
        print(f"AVISO: master com {base.width} px; o ideal é ≥ 1024 (nunca ampliar)", file=sys.stderr)
    fundo = hex_rgb(a.fundo)
    out = Path(a.saida); out.mkdir(parents=True, exist_ok=True)
    gerados = [
        exportar(base, 192, out / "icon-192.png"),
        exportar(base, 512, out / "icon-512.png"),
        exportar(base, 192, out / "icon-192-maskable.png", fundo, a.zona_segura),
        exportar(base, 512, out / "icon-512-maskable.png", fundo, a.zona_segura),
        exportar(base, 180, out / "apple-touch-icon-180.png", fundo),
        exportar(base, 32, out / "favicon-32.png"),
    ]
    for g in gerados:
        print(g)
    u = a.prefixo_url.rstrip("/")
    print("\nmanifest.webmanifest → \"icons\":")
    print(f'''[
  {{ "src": "{u}/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" }},
  {{ "src": "{u}/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }},
  {{ "src": "{u}/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" }},
  {{ "src": "{u}/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }}
]''')
    print("\nindex.html →")
    print(f'<link rel="apple-touch-icon" href="{u}/apple-touch-icon-180.png">\n<link rel="icon" type="image/png" sizes="32x32" href="{u}/favicon-32.png">')


if __name__ == "__main__":
    main()
