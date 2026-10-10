#!/usr/bin/env python3
"""slice_spritesheet.py — fatia uma sprite sheet em grade N×M, valida a linha de base (baseline) pela caixa de alfa
de cada frame e exporta frames + JSON de atlas (formato "hash" ou "array", lido por Phaser e conversível para outros engines).
Também faz o inverso (subcomando `montar`): junta frames soltos em uma sheet alinhando a baseline.

Dependências: Pillow (python3 -m pip install Pillow).

Exemplos:
  slice_spritesheet.py fatiar sheet_walk.png --colunas 6 --linhas 1 --saida frames/ --prefixo chr_heroi_walk \
      --json assets/atlas/chr_heroi_walk.json --tolerancia-baseline 2 --preview production/evidencias/.../baseline.png
  slice_spritesheet.py montar frames/*.png --colunas 6 --alinhar-baseline --saida assets/sprites/chr_heroi_walk_sheet.png \
      --json assets/atlas/chr_heroi_walk.json
Código de saída 2 quando a baseline varia além da tolerância (use --forcar para exportar mesmo assim).
"""
import argparse
import json
import statistics
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")


def bbox_alfa(img: Image.Image):
    return img.getchannel("A").getbbox() if img.mode == "RGBA" else (0, 0, img.width, img.height)


def json_atlas(nome_imagem, tamanho, frames, formato):
    meta = {"app": "slice_spritesheet.py", "version": "1.0", "image": nome_imagem, "format": "RGBA8888",
            "size": {"w": tamanho[0], "h": tamanho[1]}, "scale": "1"}
    if formato == "hash":
        return {"frames": {f["filename"]: {k: v for k, v in f.items() if k != "filename"} for f in frames}, "meta": meta}
    return {"frames": frames, "meta": meta}


def entrada_frame(nome, x, y, w, h):
    return {"filename": nome, "frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}


def cmd_fatiar(a):
    sheet = Image.open(a.entrada).convert("RGBA")
    if a.frame_w and a.frame_h:
        fw, fh = a.frame_w, a.frame_h
        cols = (sheet.width - 2 * a.margem + a.espaco) // (fw + a.espaco)
        rows = (sheet.height - 2 * a.margem + a.espaco) // (fh + a.espaco)
    else:
        if not (a.colunas and a.linhas):
            sys.exit("informe --colunas e --linhas, ou --frame-w e --frame-h")
        cols, rows = a.colunas, a.linhas
        fw = (sheet.width - 2 * a.margem - (cols - 1) * a.espaco) // cols
        fh = (sheet.height - 2 * a.margem - (rows - 1) * a.espaco) // rows
        if (sheet.width - 2 * a.margem - (cols - 1) * a.espaco) % cols or (sheet.height - 2 * a.margem - (rows - 1) * a.espaco) % rows:
            print(f"aviso: {sheet.width}x{sheet.height} não divide exatamente em {cols}x{rows}; frame = {fw}x{fh} (a sheet gerada por IA pode ter grade irregular)", file=sys.stderr)

    saida = Path(a.saida)
    saida.mkdir(parents=True, exist_ok=True)
    frames, baselines, vazios = [], [], []
    idx = 0
    for r in range(rows):
        for c in range(cols):
            x = a.margem + c * (fw + a.espaco)
            y = a.margem + r * (fh + a.espaco)
            fr = sheet.crop((x, y, x + fw, y + fh))
            bb = bbox_alfa(fr)
            nome = f"{a.prefixo}_{idx:02d}.png"
            if bb is None:
                vazios.append(nome)
                if a.ignorar_vazios:
                    idx += 1
                    continue
            else:
                baselines.append(bb[3])  # fundo da caixa de alfa = linha de base (pés)
            fr.save(saida / nome, "PNG")
            frames.append(entrada_frame(nome, x, y, fw, fh) | {"_bbox": bb})
            idx += 1

    if not baselines:
        sys.exit("todos os frames estão vazios (alfa 0): a sheet tem fundo opaco? Rode remove_bg.py antes.")
    med = statistics.median(baselines)
    desvios = [abs(b - med) for b in baselines]
    pior = max(desvios)
    print(f"frames: {len(frames)} (vazios: {len(vazios)}) · frame {fw}x{fh} · baseline mediana y={med:.1f} · desvio máx {pior} px (tolerância {a.tolerancia_baseline})")
    for f in frames:
        bb = f.pop("_bbox")
        if bb:
            print(f"  {f['filename']}: bbox={bb} baseline={bb[3]} desvio={abs(bb[3]-med):.1f}")

    if a.preview:
        pv = sheet.copy()
        d = ImageDraw.Draw(pv)
        for r in range(rows):
            y0 = a.margem + r * (fh + a.espaco)
            d.line([(0, y0 + med), (pv.width, y0 + med)], fill=(255, 0, 255, 255), width=1)
            for c in range(cols):
                x0 = a.margem + c * (fw + a.espaco)
                d.rectangle([x0, y0, x0 + fw - 1, y0 + fh - 1], outline=(0, 255, 255, 180))
        Path(a.preview).parent.mkdir(parents=True, exist_ok=True)
        pv.save(a.preview, "PNG")
        print(f"preview: {a.preview}")

    if a.json:
        Path(a.json).parent.mkdir(parents=True, exist_ok=True)
        Path(a.json).write_text(json.dumps(json_atlas(Path(a.entrada).name, sheet.size, frames, a.formato), indent=2), encoding="utf-8")
        print(f"atlas JSON ({a.formato}): {a.json}")

    if pior > a.tolerancia_baseline and not a.forcar:
        print(f"FALHA: baseline varia {pior} px > {a.tolerancia_baseline}. Peça ao gerador 'align all frames on the same baseline' ou use `montar --alinhar-baseline`.", file=sys.stderr)
        sys.exit(2)


def cmd_montar(a):
    arqs = []
    for e in a.frames:
        p = Path(e)
        arqs += sorted(x for x in p.iterdir() if x.suffix.lower() == ".png") if p.is_dir() else [p]
    if not arqs:
        sys.exit("nenhum frame")
    imgs = [Image.open(p).convert("RGBA") for p in arqs]
    bbs = [bbox_alfa(i) or (0, 0, i.width, i.height) for i in imgs]
    if a.celula:
        cw, ch = map(int, a.celula.lower().split("x"))
    else:
        cw = max(b[2] - b[0] for b in bbs) + 2 * a.margem
        ch = max(b[3] - b[1] for b in bbs) + 2 * a.margem
    cols = min(a.colunas, len(imgs))
    rows = (len(imgs) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cw + (cols - 1) * a.espaco, rows * ch + (rows - 1) * a.espaco), (0, 0, 0, 0))
    frames = []
    for i, (img, bb) in enumerate(zip(imgs, bbs)):
        c, r = i % cols, i // cols
        x0, y0 = c * (cw + a.espaco), r * (ch + a.espaco)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if a.alinhar_baseline:
            dx = (cw - w) // 2 - bb[0]
            dy = (ch - a.margem) - bb[3]          # pés na mesma linha
        else:
            dx = (cw - img.width) // 2
            dy = (ch - img.height) // 2
        sheet.alpha_composite(img, dest=(max(0, x0 + dx), max(0, y0 + dy)), source=(max(0, -dx), max(0, -dy))) if (dx < 0 or dy < 0) else sheet.alpha_composite(img, (x0 + dx, y0 + dy))
        frames.append(entrada_frame(f"{a.prefixo or Path(arqs[i]).stem}_{i:02d}.png" if a.prefixo else arqs[i].name, x0, y0, cw, ch))
    Path(a.saida).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.saida, "PNG")
    print(f"ok: {a.saida} ({len(imgs)} frames, célula {cw}x{ch}, {cols}x{rows})")
    if a.json:
        Path(a.json).parent.mkdir(parents=True, exist_ok=True)
        Path(a.json).write_text(json.dumps(json_atlas(Path(a.saida).name, sheet.size, frames, a.formato), indent=2), encoding="utf-8")
        print(f"atlas JSON ({a.formato}): {a.json}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fatiar", help="sheet -> frames + JSON, com validação de baseline")
    f.add_argument("entrada")
    f.add_argument("--colunas", type=int)
    f.add_argument("--linhas", type=int)
    f.add_argument("--frame-w", type=int)
    f.add_argument("--frame-h", type=int)
    f.add_argument("--margem", type=int, default=0, help="borda externa da sheet em px")
    f.add_argument("--espaco", type=int, default=0, help="espaço entre frames em px")
    f.add_argument("--saida", required=True)
    f.add_argument("--prefixo", required=True, help="ex.: chr_heroi_walk")
    f.add_argument("--json", help="caminho do atlas JSON")
    f.add_argument("--formato", choices=["hash", "array"], default="hash")
    f.add_argument("--tolerancia-baseline", type=int, default=2)
    f.add_argument("--ignorar-vazios", action="store_true")
    f.add_argument("--preview", help="PNG com grade e linha de base desenhadas (evidência)")
    f.add_argument("--forcar", action="store_true")
    f.set_defaults(fn=cmd_fatiar)
    m = sub.add_parser("montar", help="frames -> sheet (+JSON), alinhando a baseline")
    m.add_argument("frames", nargs="+")
    m.add_argument("--colunas", type=int, default=8)
    m.add_argument("--celula", help="WxH fixo da célula; padrão = maior bbox + margem")
    m.add_argument("--margem", type=int, default=2)
    m.add_argument("--espaco", type=int, default=0)
    m.add_argument("--alinhar-baseline", action="store_true")
    m.add_argument("--saida", required=True)
    m.add_argument("--prefixo", default="")
    m.add_argument("--json")
    m.add_argument("--formato", choices=["hash", "array"], default="hash")
    m.set_defaults(fn=cmd_montar)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
