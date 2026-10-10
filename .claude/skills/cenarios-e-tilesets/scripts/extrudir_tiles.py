#!/usr/bin/env python3
"""extrudir_tiles.py — "extruda" cada tile de um tileset (repete a borda de cada tile para fora por N px) e insere
espaçamento, para que o Phaser não mostre linhas/sangramento entre tiles ao escalar (DPR 2, zoom fracionário, câmera em movimento).
Imprime os parâmetros `margin` e `spacing` a passar em `map.addTilesetImage(nome, chave, tileW, tileH, margin, spacing)`.

Dependências: Pillow. Alternativa em Node: pacote `tile-extruder` (npm) [não verificado nesta pesquisa].
Exemplo:
  extrudir_tiles.py assets/tiles/tileset_floresta.png --tile 32 --extrude 1 --saida assets/tiles/tileset_floresta_ext.png
  extrudir_tiles.py tileset.png --tile 16x16 --margem-origem 0 --espaco-origem 0 --extrude 2 --saida tileset_ext.png
Código 2 se a imagem não dividir exatamente na grade informada.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("--tile", required=True, help="lado ou WxH em px")
    ap.add_argument("--margem-origem", type=int, default=0)
    ap.add_argument("--espaco-origem", type=int, default=0)
    ap.add_argument("--extrude", type=int, default=1)
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()

    tw, th = (int(x) for x in a.tile.lower().split("x")) if "x" in a.tile.lower() else (int(a.tile), int(a.tile))
    src = Image.open(a.entrada).convert("RGBA")
    e, m0, s0 = a.extrude, a.margem_origem, a.espaco_origem
    cols = (src.width - 2 * m0 + s0) // (tw + s0)
    rows = (src.height - 2 * m0 + s0) // (th + s0)
    if cols * (tw + s0) - s0 + 2 * m0 != src.width or rows * (th + s0) - s0 + 2 * m0 != src.height:
        print(f"FALHA: {src.width}x{src.height} não divide em tiles de {tw}x{th} com margem {m0}/espaço {s0}", file=sys.stderr)
        sys.exit(2)
    passo_w, passo_h = tw + 2 * e, th + 2 * e
    out = Image.new("RGBA", (cols * passo_w, rows * passo_h), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(cols):
            x0, y0 = m0 + c * (tw + s0), m0 + r * (th + s0)
            tile = src.crop((x0, y0, x0 + tw, y0 + th))
            dx, dy = c * passo_w + e, r * passo_h + e
            out.paste(tile, (dx, dy))
            for k in range(1, e + 1):  # bordas repetidas
                out.paste(tile.crop((0, 0, tw, 1)), (dx, dy - k))
                out.paste(tile.crop((0, th - 1, tw, th)), (dx, dy + th + k - 1))
                out.paste(tile.crop((0, 0, 1, th)), (dx - k, dy))
                out.paste(tile.crop((tw - 1, 0, tw, th)), (dx + tw + k - 1, dy))
            for k in range(1, e + 1):  # cantos
                for j in range(1, e + 1):
                    out.putpixel((dx - k, dy - j), tile.getpixel((0, 0)))
                    out.putpixel((dx + tw + k - 1, dy - j), tile.getpixel((tw - 1, 0)))
                    out.putpixel((dx - k, dy + th + j - 1), tile.getpixel((0, th - 1)))
                    out.putpixel((dx + tw + k - 1, dy + th + j - 1), tile.getpixel((tw - 1, th - 1)))
    Path(a.saida).parent.mkdir(parents=True, exist_ok=True)
    out.save(a.saida, "PNG")
    print(f"ok: {a.saida} ({cols}x{rows} tiles, {out.width}x{out.height})")
    print(f"Phaser: map.addTilesetImage('<nome no Tiled>', '<chave>', {tw}, {th}, {e}, {2 * e})  // margin={e}, spacing={2 * e}")


if __name__ == "__main__":
    main()
