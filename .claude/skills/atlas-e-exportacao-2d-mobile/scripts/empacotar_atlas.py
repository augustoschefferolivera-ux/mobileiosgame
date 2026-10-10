#!/usr/bin/env python3
"""empacotar_atlas.py — empacota PNGs em um atlas (ou vários) no formato JSON que o Phaser lê: "JSON hash" (TexturePacker)
para `this.load.atlas(key, png, json)` ou "multi-atlas" (`textures: [...]`) para `this.load.multiatlas(key, json)` quando
não cabe em uma página. Dois backends: `pillow` (embutido, shelf packing; sempre disponível) e `ftp`
(free-tex-packer-core, MIT, via Node, se `npm i -D free-tex-packer-core` estiver instalado no projeto).

Dependências: Pillow; opcional Node 20+ com free-tex-packer-core.
Regras aplicadas: padding (padrão 2 px), extrusão (padrão 1 px: repete a borda, evita sangramento com DPR 2/filtro linear),
sem rotação (Phaser suporta, mas nine-slice e tiles não), trim opcional com `spriteSourceSize`/`sourceSize` (o Phaser
restaura o offset), páginas ≤ --max (padrão 2048; iOS/WebGL seguro), potência de dois opcional, `scale9Borders` por frame
para NineSlice (`--nineslice nome=l,t,r,b`, lido pelo parser JSONHash do Phaser) e `pivot` opcional por frame.

Exemplos:
  empacotar_atlas.py assets/sprites assets/ui --nome cena_floresta --saida public/assets/atlas --padding 2 --extrude 1
  empacotar_atlas.py assets/ui --nome ui --saida public/assets/atlas --sem-trim --nineslice ui_panel_main=24,24,24,24 --nineslice ui_btn_primary_normal=20,20,20,20
  empacotar_atlas.py assets/sprites --nome cena --saida out --backend ftp --pot
Saída: <nome>.png + <nome>.json (uma página) ou <nome>-0.png, <nome>-1.png… + <nome>.json (multi-atlas). Código 2 se um
sprite não couber em uma página vazia.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")

JS_FTP = """
const fs = require('fs'), path = require('path');
const { packAsync } = require('free-tex-packer-core');
const [files, opts, out] = process.argv.slice(-3).map(s => JSON.parse(s));
const images = files.map(f => ({ path: path.basename(f), contents: fs.readFileSync(f) }));
packAsync(images, opts).then(res => {
  fs.mkdirSync(out, { recursive: true });
  for (const f of res) { fs.writeFileSync(path.join(out, f.name), f.buffer); console.log(path.join(out, f.name)); }
}).catch(e => { console.error(String(e)); process.exit(2); });
"""


def coletar(entradas):
    arqs = []
    for e in entradas:
        p = Path(e)
        if p.is_dir():
            arqs += sorted(x for x in p.rglob("*.png"))
        elif p.exists():
            arqs.append(p)
    return arqs


def pot(n):
    p = 1
    while p < n:
        p *= 2
    return p


def extrudir(img, e):
    if e <= 0:
        return img
    w, h = img.size
    out = Image.new("RGBA", (w + 2 * e, h + 2 * e), (0, 0, 0, 0))
    out.paste(img, (e, e))
    for k in range(1, e + 1):
        out.paste(img.crop((0, 0, w, 1)), (e, e - k))
        out.paste(img.crop((0, h - 1, w, h)), (e, e + h + k - 1))
        out.paste(img.crop((0, 0, 1, h)), (e - k, e))
        out.paste(img.crop((w - 1, 0, w, h)), (e + w + k - 1, e))
    for (sx, sy, dx, dy) in ((0, 0, 0, 0), (w - 1, 0, e + w, 0), (0, h - 1, 0, e + h), (w - 1, h - 1, e + w, e + h)):
        cor = img.getpixel((sx, sy))
        for yy in range(e):
            for xx in range(e):
                out.putpixel((dx + xx, dy + yy), cor)
    return out


def preparar(arqs, trim, extrude):
    itens = []
    for p in arqs:
        img = Image.open(p).convert("RGBA")
        sw, sh = img.size
        off = (0, 0)
        if trim:
            bb = img.getchannel("A").getbbox()
            if bb and bb != (0, 0, sw, sh):
                img = img.crop(bb)
                off = (bb[0], bb[1])
        itens.append({"nome": p.stem, "img": extrudir(img, extrude), "w": img.width, "h": img.height,
                      "sw": sw, "sh": sh, "off": off, "trimmed": (img.width, img.height) != (sw, sh)})
    return itens


def shelf_pack(itens, maxw, maxh, padding, extrude):
    """Shelf packing determinístico: ordena por altura, preenche linhas; abre nova página quando não cabe."""
    itens = sorted(itens, key=lambda i: (-i["h"], -i["w"], i["nome"]))
    paginas = []
    for it in itens:
        cw, ch = it["w"] + 2 * extrude + padding, it["h"] + 2 * extrude + padding
        if cw > maxw or ch > maxh:
            sys.exit(f"'{it['nome']}' ({it['w']}x{it['h']}) não cabe em uma página de {maxw}x{maxh}: reduza o asset ou aumente --max")
        colocado = False
        for pg in paginas:
            for shelf in pg["shelves"]:
                if shelf["x"] + cw <= maxw and ch <= shelf["h"]:
                    it["pos"] = (shelf["x"], shelf["y"])
                    shelf["x"] += cw
                    pg["itens"].append(it)
                    colocado = True
                    break
            if colocado:
                break
            y = pg["shelves"][-1]["y"] + pg["shelves"][-1]["h"]
            if y + ch <= maxh:
                pg["shelves"].append({"x": cw, "y": y, "h": ch})
                it["pos"] = (0, y)
                pg["itens"].append(it)
                colocado = True
                break
        if not colocado:
            paginas.append({"shelves": [{"x": cw, "y": 0, "h": ch}], "itens": [it]})
            it["pos"] = (0, 0)
    return paginas


def frame_json(it, extrude, nineslice, pivots):
    x, y = it["pos"]
    f = {"frame": {"x": x + extrude, "y": y + extrude, "w": it["w"], "h": it["h"]}, "rotated": False, "trimmed": it["trimmed"],
         "spriteSourceSize": {"x": it["off"][0], "y": it["off"][1], "w": it["w"], "h": it["h"]}, "sourceSize": {"w": it["sw"], "h": it["sh"]}}
    if it["nome"] in nineslice:
        l, t, r, b = nineslice[it["nome"]]
        if it["trimmed"]:
            print(f"AVISO: '{it['nome']}' é nine-slice e foi aparado; use --sem-trim para peças de UI", file=sys.stderr)
        f["scale9Borders"] = {"x": l, "y": t, "w": it["sw"] - l - r, "h": it["sh"] - t - b}
    if it["nome"] in pivots:
        f["pivot"] = {"x": pivots[it["nome"]][0], "y": pivots[it["nome"]][1]}
    return f


def backend_pillow(a, itens, nineslice, pivots):
    paginas = shelf_pack(itens, a.max, a.max, a.padding, a.extrude)
    out = Path(a.saida)
    out.mkdir(parents=True, exist_ok=True)
    texturas = []
    for i, pg in enumerate(paginas):
        w = max(it["pos"][0] + it["w"] + 2 * a.extrude for it in pg["itens"])
        h = max(it["pos"][1] + it["h"] + 2 * a.extrude for it in pg["itens"])
        if a.pot:
            w, h = pot(w), pot(h)
        tela = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for it in pg["itens"]:
            tela.paste(it["img"], it["pos"])
        nome_png = f"{a.nome}.png" if len(paginas) == 1 else f"{a.nome}-{i}.png"
        tela.save(out / nome_png, "PNG", optimize=True)
        frames = [dict(filename=it["nome"], **frame_json(it, a.extrude, nineslice, pivots)) for it in sorted(pg["itens"], key=lambda i: i["nome"])]
        texturas.append({"image": nome_png, "format": "RGBA8888", "size": {"w": w, "h": h}, "scale": a.scale, "frames": frames})
    meta = {"app": "empacotar_atlas.py", "version": "1.0", "padding": a.padding, "extrude": a.extrude}
    if len(texturas) == 1:
        t = texturas[0]
        js = {"frames": {f["filename"]: {k: v for k, v in f.items() if k != "filename"} for f in t["frames"]},
              "meta": dict(meta, image=t["image"], format="RGBA8888", size=t["size"], scale=str(a.scale))}
        modo = "this.load.atlas"
    else:
        js = {"textures": texturas, "meta": meta}
        modo = "this.load.multiatlas"
    (out / f"{a.nome}.json").write_text(json.dumps(js, indent=2), encoding="utf-8")
    print(f"ok ({modo}): {len(itens)} frames em {len(texturas)} página(s): " + ", ".join(f"{t['image']} {t['size']['w']}x{t['size']['h']}" for t in texturas))
    print(f"json: {out / (a.nome + '.json')}")


def backend_ftp(a, arqs, nineslice):
    node = shutil.which("node")
    if not node:
        sys.exit("backend ftp: node não encontrado")
    if nineslice:
        print("AVISO: backend ftp não grava scale9Borders; use --backend pillow para nine-slice", file=sys.stderr)
    opcoes = {"textureName": a.nome, "width": a.max, "height": a.max, "padding": a.padding, "extrude": a.extrude,
              "allowRotation": False, "detectIdentical": True, "allowTrim": a.trim, "powerOfTwo": a.pot,
              "exporter": "JsonHash", "removeFileExtension": True, "prependFolderName": False, "scale": a.scale}
    r = subprocess.run([node, "-e", JS_FTP, json.dumps([str(p) for p in arqs]), json.dumps(opcoes), json.dumps(a.saida)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"free-tex-packer-core falhou (instalado? npm i -D free-tex-packer-core):\n{r.stderr.strip()}")
    print(r.stdout.strip())
    print("ok (free-tex-packer-core, exporter JsonHash). Várias páginas saem como <nome>-0.json/-1.json: carregue cada uma com this.load.atlas, ou use --backend pillow para multi-atlas.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entradas", nargs="+", help="pastas (recursivo) ou PNGs")
    ap.add_argument("--nome", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--max", type=int, default=2048)
    ap.add_argument("--padding", type=int, default=2)
    ap.add_argument("--extrude", type=int, default=1)
    ap.add_argument("--trim", dest="trim", action="store_true", default=True)
    ap.add_argument("--sem-trim", dest="trim", action="store_false")
    ap.add_argument("--pot", action="store_true", help="páginas em potência de dois")
    ap.add_argument("--scale", type=float, default=1, help="valor gravado em meta.scale (ex.: 2 para atlas @2x)")
    ap.add_argument("--nineslice", action="append", default=[], help="nome=l,t,r,b em px da imagem original")
    ap.add_argument("--pivot", action="append", default=[], help="nome=x,y (0–1)")
    ap.add_argument("--backend", choices=["pillow", "ftp"], default="pillow")
    a = ap.parse_args()

    arqs = coletar(a.entradas)
    if not arqs:
        sys.exit("nenhum PNG")
    nomes = [p.stem for p in arqs]
    dup = {n for n in nomes if nomes.count(n) > 1}
    if dup:
        sys.exit(f"nomes de frame duplicados: {sorted(dup)}")
    nineslice = {}
    for n in a.nineslice:
        k, _, v = n.partition("=")
        nineslice[k] = tuple(int(x) for x in v.split(","))
    pivots = {}
    for n in a.pivot:
        k, _, v = n.partition("=")
        pivots[k] = tuple(float(x) for x in v.split(","))
    if a.backend == "ftp":
        backend_ftp(a, arqs, nineslice)
    else:
        backend_pillow(a, preparar(arqs, a.trim, a.extrude), nineslice, pivots)


if __name__ == "__main__":
    main()
