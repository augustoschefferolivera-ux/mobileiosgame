#!/usr/bin/env python3
"""Empacota frames PNG (saída de render_sprites.py ou qualquer pasta de PNGs com alfa) em um atlas
para Phaser (JSON hash; multi-atlas quando não cabe numa página) com pós-processamento para
sprites pré-renderizados: trim com pivot preservado, padding/extrude contra sangramento,
"alpha bleed" contra halo escuro, pixelização e quantização de paleta (pixel art), preview
rotulado e estimativa de memória de GPU.

Dependências: Pillow (python3 -m pip install Pillow). numpy é opcional (acelera o alpha bleed).

Exemplos:
  montar_atlas_phaser.py out/heroi --manifest out/heroi/manifest.json --saida assets/atlas/heroi \
      --max 2048 --padding 2 --extrude 1 --bleed --preview production/evidencias/.../heroi-atlas.png
  montar_atlas_phaser.py out/heroi --pixelizar 4 --paleta 32 --saida assets/atlas/heroi-pixel
  montar_atlas_phaser.py frames/ --pivot 0.5,0.9 --saida assets/atlas/x   # PNGs nomeados <nome>_<acao>_d<dir>_f<NN>.png

Saída: <saida>.png + <saida>.json (uma página) ou <saida>-0.png, -1.png... + <saida>.json
(formato "textures": [...] lido por this.load.multiatlas). Também grava <saida>.anims.json com
as animações (prefixo, start, end, zeroPad, frameRate, repeat) para this.anims.create e imprime
a memória estimada (páginas × w × h × 4 bytes, RGBA8 sem compressão, como o Phaser sobe para a GPU).
Código de saída 2 em erro de entrada.
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import re
import sys

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

RE_PADRAO = re.compile(r"^(?P<nome>.+?)_(?P<acao>[a-z0-9-]+)_d(?P<dir>\d+)_f(?P<frame>\d+)$")


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", help="pasta com PNGs (ou glob entre aspas)")
    ap.add_argument("--saida", required=True, help="prefixo de saída (sem extensão), ex.: assets/atlas/heroi")
    ap.add_argument("--manifest", help="manifest.json do render_sprites.py (pivot, fps, duração das ações)")
    ap.add_argument("--max", type=int, default=2048, help="lado máximo da página do atlas (padrão 2048; iPhone antigo: 2048)")
    ap.add_argument("--pot", action="store_true", help="arredonda a página para potência de 2 (necessário para mipmaps/PVRTC)")
    ap.add_argument("--padding", type=int, default=2, help="pixels transparentes entre frames (padrão 2)")
    ap.add_argument("--extrude", type=int, default=0, help="replica a borda de cada frame N px (evita sangramento com filtro linear)")
    ap.add_argument("--sem-trim", action="store_true", help="não recorta as bordas transparentes")
    ap.add_argument("--bleed", action="store_true", help="alpha bleed: pinta pixels transparentes com a cor vizinha (remove halo escuro)")
    ap.add_argument("--bleed-passos", type=int, default=4)
    ap.add_argument("--pixelizar", type=int, default=1, help="fator de redução com NEAREST (ex.: 4 → 256 px vira 64 px)")
    ap.add_argument("--paleta", type=int, default=0, help="quantiza para N cores (0 = não quantiza)")
    ap.add_argument("--paleta-de", help="PNG cujas cores viram a paleta fixa (style card)")
    ap.add_argument("--escala", type=float, default=1.0, help="reescala final (ex.: 0.5 para @1x a partir de render @2x)")
    ap.add_argument("--pivot", help="pivot normalizado x,y (0–1) quando não há manifest; padrão 0.5,1.0 (pés)")
    ap.add_argument("--fps", type=float, default=0.0, help="frameRate das animações (padrão: frames/duração do manifest, ou 10)")
    ap.add_argument("--preview", help="PNG de contato com rótulos para a evidência")
    ap.add_argument("--formato", choices=["hash", "array"], default="hash", help="formato do JSON de página única (padrão hash)")
    return ap.parse_args()


def listar(entrada):
    if any(ch in entrada for ch in "*?["):
        return sorted(glob.glob(entrada))
    if os.path.isdir(entrada):
        return sorted(glob.glob(os.path.join(entrada, "*.png")))
    return [entrada] if os.path.exists(entrada) else []


def alpha_bleed(img: Image.Image, passos: int) -> Image.Image:
    """Preenche RGB dos pixels com alfa 0 com a média dos vizinhos opacos (iterativo). Alfa não muda."""
    if np is not None:
        a = np.asarray(img, dtype=np.float32)
        rgb, alpha = a[..., :3].copy(), a[..., 3]
        conhecido = alpha > 0
        rgb[~conhecido] = 0.0
        for _ in range(passos):
            if conhecido.all():
                break
            pad_rgb = np.pad(rgb, ((1, 1), (1, 1), (0, 0)))
            pad_k = np.pad(conhecido.astype(np.float32), 1)
            soma = np.zeros_like(rgb)
            cnt = np.zeros(rgb.shape[:2], dtype=np.float32)
            h, w = cnt.shape
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    soma += pad_rgb[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
                    cnt += pad_k[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
            novo = (~conhecido) & (cnt > 0)
            rgb[novo] = soma[novo] / cnt[novo][:, None]
            conhecido |= novo
        out = np.concatenate([np.clip(rgb, 0, 255), alpha[..., None]], axis=-1).astype(np.uint8)
        return Image.fromarray(out, "RGBA")
    # fallback só com Pillow: dilatação por MaxFilter (cores aproximadas, suficientes contra halo)
    r, g, b, a = img.split()
    mask0 = a.point(lambda v: 255 if v > 0 else 0)
    canais = []
    for c in (r, g, b):
        mask = mask0.copy()  # máscara própria por canal (senão o 2º canal herda a máscara já crescida)
        c = Image.composite(c, Image.new("L", c.size, 0), mask)
        for _ in range(passos):
            dil = c.filter(ImageFilter.MaxFilter(3))
            c = Image.composite(c, dil, mask)       # mantém o conhecido, preenche o resto com a dilatação
            mask = mask.filter(ImageFilter.MaxFilter(3))
        canais.append(c)
    return Image.merge("RGBA", (*canais, a))


def quantizar(img: Image.Image, n: int, paleta_de: str | None) -> Image.Image:
    rgb, a = img.convert("RGB"), img.getchannel("A")
    if paleta_de:
        pal = Image.open(paleta_de).convert("RGB")
        pal_q = pal.quantize(colors=min(256, n or 256), method=Image.Quantize.MEDIANCUT)
        q = rgb.quantize(palette=pal_q, dither=Image.Dither.NONE)
    else:
        q = rgb.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = q.convert("RGB")
    out.putalpha(a.point(lambda v: 255 if v >= 128 else 0))  # alfa binário em pixel art
    return out


def extrude(img: Image.Image, n: int) -> Image.Image:
    w, h = img.size
    out = Image.new("RGBA", (w + 2 * n, h + 2 * n))
    out.paste(img, (n, n))
    for i in range(1, n + 1):
        out.paste(img.crop((0, 0, w, 1)), (n, n - i))            # topo
        out.paste(img.crop((0, h - 1, w, h)), (n, n + h + i - 1))  # base
    for i in range(1, n + 1):
        out.paste(out.crop((n, 0, n + 1, h + 2 * n)), (n - i, 0))              # esquerda
        out.paste(out.crop((n + w - 1, 0, n + w, h + 2 * n)), (n + w + i - 1, 0))  # direita
    return out


def empacotar(itens, lado_max, pad):
    """Shelf packing por altura decrescente. itens: list de dict com 'w','h'. Retorna lista de páginas
    [{'w','h','itens':[(item,x,y)]}]. Frames do mesmo rig têm o mesmo tamanho, então shelf basta."""
    ordem = sorted(itens, key=lambda it: (-it["h"], -it["w"], it["chave"]))
    paginas = []

    def nova():
        paginas.append({"x": pad, "y": pad, "alt_linha": 0, "w": 0, "h": 0, "itens": []})
        return paginas[-1]

    pg = nova()
    for it in ordem:
        if it["w"] + 2 * pad > lado_max or it["h"] + 2 * pad > lado_max:
            sys.exit(f"frame {it['chave']} ({it['w']}x{it['h']}) maior que a página {lado_max}; use --max maior ou --pixelizar")
        if pg["x"] + it["w"] + pad > lado_max:  # quebra de linha
            pg["x"] = pad
            pg["y"] += pg["alt_linha"] + pad
            pg["alt_linha"] = 0
        if pg["y"] + it["h"] + pad > lado_max:  # nova página
            pg = nova()
        pg["itens"].append((it, pg["x"], pg["y"]))
        pg["x"] += it["w"] + pad
        pg["alt_linha"] = max(pg["alt_linha"], it["h"])
        pg["w"] = max(pg["w"], pg["x"])
        pg["h"] = max(pg["h"], pg["y"] + it["h"] + pad)
    return paginas


def pot(n):
    return 1 << max(1, math.ceil(math.log2(max(1, n))))


def main():
    a = parse_args()
    arquivos = listar(a.entrada)
    if not arquivos:
        sys.exit(f"nenhum PNG em {a.entrada}")
    manifest = json.load(open(a.manifest, encoding="utf-8")) if a.manifest else {}
    if a.pivot:
        px, py = (float(v) for v in a.pivot.split(","))
    elif manifest.get("pivot"):
        px, py = manifest["pivot"]["x"], manifest["pivot"]["y"]
    else:
        px, py = 0.5, 1.0
    fator = a.escala / max(1, a.pixelizar)

    itens, acoes = [], {}
    for arq in arquivos:
        chave = os.path.splitext(os.path.basename(arq))[0]
        img = Image.open(arq).convert("RGBA")
        if a.bleed:
            img = alpha_bleed(img, a.bleed_passos)
        if a.pixelizar > 1:
            img = img.resize((max(1, img.width // a.pixelizar), max(1, img.height // a.pixelizar)), Image.Resampling.NEAREST)
        if a.escala != 1.0:
            metodo = Image.Resampling.NEAREST if (a.pixelizar > 1 or a.paleta) else Image.Resampling.LANCZOS
            img = img.resize((max(1, round(img.width * a.escala)), max(1, round(img.height * a.escala))), metodo)
        if a.paleta or a.paleta_de:
            img = quantizar(img, a.paleta or 256, a.paleta_de)
        sw, sh = img.size
        bbox = img.getchannel("A").getbbox() or (0, 0, 1, 1)
        if a.sem_trim:
            bbox = (0, 0, sw, sh)
        rec = img.crop(bbox)
        if a.extrude > 0:
            rec = extrude(rec, a.extrude)
        it = {"chave": chave, "img": rec, "w": rec.width, "h": rec.height, "sourceSize": {"w": sw, "h": sh},
              "spriteSourceSize": {"x": bbox[0], "y": bbox[1], "w": bbox[2] - bbox[0], "h": bbox[3] - bbox[1]},
              "trimmed": bbox != (0, 0, sw, sh)}
        itens.append(it)
        m = RE_PADRAO.match(chave)
        if m:
            k = (m.group("acao"), int(m.group("dir")))
            acoes.setdefault(k, []).append(int(m.group("frame")))

    paginas = empacotar(itens, a.max, a.padding)
    base = a.saida
    os.makedirs(os.path.dirname(base) or ".", exist_ok=True)
    multi = len(paginas) > 1
    texturas, bytes_gpu = [], 0
    for i, pg in enumerate(paginas):
        w, h = (pot(pg["w"]), pot(pg["h"])) if a.pot else (pg["w"], pg["h"])
        folha = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        frames = []
        for it, x, y in pg["itens"]:
            folha.paste(it["img"], (x, y))
            e = a.extrude
            fr = {"filename": it["chave"], "frame": {"x": x + e, "y": y + e, "w": it["w"] - 2 * e, "h": it["h"] - 2 * e},
                  "rotated": False, "trimmed": it["trimmed"], "spriteSourceSize": it["spriteSourceSize"],
                  "sourceSize": it["sourceSize"], "pivot": {"x": px, "y": py}}
            frames.append(fr)
        nome_png = f"{os.path.basename(base)}-{i}.png" if multi else f"{os.path.basename(base)}.png"
        folha.save(os.path.join(os.path.dirname(base) or ".", nome_png), optimize=True)
        bytes_gpu += w * h * 4
        texturas.append({"image": nome_png, "format": "RGBA8888", "size": {"w": w, "h": h}, "scale": 1, "frames": frames})

    meta = {"app": "montar_atlas_phaser.py", "version": "1.0", "pivot": {"x": px, "y": py},
            "pixels_por_metro": manifest.get("pixels_por_metro", None) and round(manifest["pixels_por_metro"] * fator, 2),
            "origem": manifest.get("entrada"), "blender": manifest.get("blender")}
    if multi:
        dados = {"textures": texturas, "meta": meta}
    elif a.formato == "array":
        dados = {"frames": texturas[0]["frames"], "meta": meta | {"image": texturas[0]["image"], "size": texturas[0]["size"], "format": "RGBA8888", "scale": "1"}}
    else:
        dados = {"frames": {f["filename"]: {k: v for k, v in f.items() if k != "filename"} for f in texturas[0]["frames"]},
                 "meta": meta | {"image": texturas[0]["image"], "size": texturas[0]["size"], "format": "RGBA8888", "scale": "1"}}
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=2)

    # animações para this.anims.create (prefixo + zeroPad)
    anims = []
    dur = {ac["nome"]: ac for ac in manifest.get("acoes", [])}
    for (acao, d), fr in sorted(acoes.items()):
        n = len(fr)
        info = dur.get(acao, {})
        fps = a.fps or (n / info["duracao_s"] if info.get("duracao_s") else 10.0)
        exemplo = next(it["chave"] for it in itens if RE_PADRAO.match(it["chave"]) and RE_PADRAO.match(it["chave"]).group("acao") == acao and int(RE_PADRAO.match(it["chave"]).group("dir")) == d)
        prefixo = exemplo[: exemplo.rfind("_f") + 2]
        anims.append({"key": f"{acao}-d{d}", "prefix": prefixo, "start": min(fr), "end": max(fr), "zeroPad": 2,
                      "frameRate": round(fps, 2), "repeat": -1 if info.get("loop", True) else 0})
    with open(base + ".anims.json", "w", encoding="utf-8") as f:
        json.dump({"atlas": os.path.basename(base), "multiatlas": multi, "anims": anims}, f, indent=2)

    if a.preview:
        cols = min(8, len(itens))
        cw = max(it["w"] for it in itens) + 4
        ch = max(it["h"] for it in itens) + 14
        rows = math.ceil(len(itens) / cols)
        pv = Image.new("RGBA", (cols * cw, rows * ch), (40, 40, 40, 255))
        dr = ImageDraw.Draw(pv)
        for k, it in enumerate(sorted(itens, key=lambda i: i["chave"])):
            x, y = (k % cols) * cw, (k // cols) * ch
            pv.alpha_composite(it["img"], (x + 2, y + 2))
            dr.text((x + 2, y + ch - 12), it["chave"][-14:], fill=(255, 255, 255, 255))
        os.makedirs(os.path.dirname(a.preview) or ".", exist_ok=True)
        pv.save(a.preview)

    tamanhos = ", ".join("{}x{}".format(t["size"]["w"], t["size"]["h"]) for t in texturas)
    print(f"frames: {len(itens)} · páginas: {len(paginas)} ({tamanhos})"
          f" · memória GPU RGBA8 ≈ {bytes_gpu / 1048576:.1f} MB (+33 % se mipmaps) · animações: {len(anims)}")
    print(f"escrito: {base}.json, {base}.anims.json" + (f", {a.preview}" if a.preview else ""))
    if multi:
        print("multi-atlas: carregue com this.load.multiatlas(key, '<nome>.json', '<pasta>')")
    return 0


if __name__ == "__main__":
    sys.exit(main())
