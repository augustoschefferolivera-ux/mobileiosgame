#!/usr/bin/env python3
"""verificar_legibilidade.py — mede a legibilidade de sprites e peças de UI como um diretor de arte faria:
reduz a 1/4 ("teste de distância"/squint), converte para cinza (teste de valor), compara a silhueta reduzida
com a original e calcula o contraste WCAG entre o asset e a cor do cenário. Gera uma folha PNG para o olho humano.

Dependências: Pillow (python3 -m pip install Pillow).

Métricas por imagem (pixels com alfa ≥ 128 contam como "sprite"):
  contraste_fundo  razão de contraste WCAG entre a luminância média do sprite e o fundo (--fundo). Gráficos: ≥ 3,0.
  silhueta_1_n     IoU entre a máscara de alfa original e a máscara reduzida a 1/N e reampliada. ≥ 0,80 = a forma sobrevive.
  detalhe_1_n      fração das bordas internas (FIND_EDGES em cinza) que sobrevive a 1/N. < 0,35 = detalhe desperdiçado.
  valor_interno    desvio-padrão da luminância dentro do sprite (0–1). < 0,06 = chapado demais para ler volume.
  ocupacao_bbox    fração opaca da caixa de alfa. < 0,25 = sprite fino/esparso (some em tela pequena).
  silhueta_alvo    (opcional, --alvo-px) IoU quando a caixa de alfa é reduzida à altura em px CSS em que o asset aparece no jogo.

Exemplos:
  verificar_legibilidade.py assets/sprites/enm_bomba_idle.png --fundo "#2F5D3A" --folha production/evidencias/2026-10-10-sprites-bomba/legibilidade.png
  verificar_legibilidade.py assets/ui/*.png --fundo "#1B1F2A" --reducao 4 --alvo-px 44 --json legibilidade.json
Código de saída: 0 ok · 1 uso · 2 alguma métrica abaixo do limiar (veja --min-*).
"""
import argparse
import json
import math
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")

EXT = {".png", ".webp"}


def _pixels(img):
    return img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()


def hex_rgb(h):
    h = h.lstrip("#")
    if len(h) != 6:
        sys.exit(f"cor inválida: {h}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminancia(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contraste(l1, l2):
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def mascara(img, limiar=128):
    return img.getchannel("A").point(lambda a: 255 if a >= limiar else 0)


def iou(m1, m2):
    p1, p2 = list(_pixels(m1)), list(_pixels(m2))
    inter = sum(1 for a, b in zip(p1, p2) if a and b)
    uni = sum(1 for a, b in zip(p1, p2) if a or b)
    return inter / uni if uni else 0.0


def reduzir_e_voltar(img, fator):
    w, h = img.size
    peq = img.resize((max(1, w // fator), max(1, h // fator)), Image.LANCZOS)
    return peq, peq.resize((w, h), Image.NEAREST)


def bordas(img_rgba, fundo):
    base = Image.new("RGBA", img_rgba.size, fundo + (255,))
    base.alpha_composite(img_rgba)
    g = base.convert("L").filter(ImageFilter.FIND_EDGES)
    return sum(1 for v in _pixels(g) if v > 40)


def medir(caminho, fundo, fator, alvo_px):
    img = Image.open(caminho).convert("RGBA")
    m = mascara(img)
    bb = m.getbbox()
    if not bb:
        return {"arquivo": caminho.name, "erro": "sem pixels opacos"}
    img = img.crop(bb)
    m = m.crop(bb)
    w, h = img.size
    pix = list(_pixels(img))
    opacos = [p for p in pix if p[3] >= 128]
    lums = [luminancia(p[:3]) for p in opacos]
    lmed = sum(lums) / len(lums)
    desvio = math.sqrt(sum((x - lmed) ** 2 for x in lums) / len(lums))
    lfundo = luminancia(fundo)
    peq, volta = reduzir_e_voltar(img, fator)
    res = {
        "arquivo": caminho.name,
        "tamanho": f"{w}x{h}",
        "contraste_fundo": round(contraste(lmed, lfundo), 2),
        f"silhueta_1_{fator}": round(iou(m, mascara(volta)), 3),
        "valor_interno": round(desvio, 3),
        "ocupacao_bbox": round(len(opacos) / (w * h), 3),
    }
    b_full = bordas(img, fundo)
    b_peq = bordas(peq, fundo) * fator * fator
    res[f"detalhe_1_{fator}"] = round(min(1.0, b_peq / b_full), 3) if b_full else 1.0
    if alvo_px:
        esc = alvo_px / h
        peq2 = img.resize((max(1, round(w * esc)), max(1, round(h * esc))), Image.LANCZOS)
        volta2 = peq2.resize((w, h), Image.NEAREST)
        res["silhueta_alvo"] = round(iou(m, mascara(volta2)), 3)
        res["alvo_px"] = alvo_px
    return res, img, peq


def folha(itens, fundo, fator, saida):
    cel = 160
    cols = 5
    rot = 16
    sheet = Image.new("RGBA", (cols * cel, len(itens) * (cel + rot)), (24, 24, 24, 255))
    d = ImageDraw.Draw(sheet)
    for i, (res, img, peq) in enumerate(itens):
        y = i * (cel + rot)
        vistas = [("1x", img), ("1/2", reduzir_e_voltar(img, 2)[0]), (f"1/{fator}", peq),
                  ("cinza", img.convert("LA").convert("RGBA")), ("silhueta", Image.merge("RGBA", [mascara(img).point(lambda a: 0)] * 3 + [mascara(img)]))]
        for j, (nome, v) in enumerate(vistas):
            fundo_cel = Image.new("RGBA", (cel, cel), fundo + (255,))
            esc = min((cel - 8) / v.width, (cel - 8) / v.height, 1.0 if nome != "1x" else (cel - 8) / max(v.size))
            vv = v.resize((max(1, int(v.width * esc)), max(1, int(v.height * esc))), Image.LANCZOS) if esc < 1 else v
            fundo_cel.alpha_composite(vv, ((cel - vv.width) // 2, (cel - vv.height) // 2))
            sheet.alpha_composite(fundo_cel, (j * cel, y))
            d.text((j * cel + 3, y + cel + 1), nome if j else f"{res['arquivo'][:22]} {nome}", fill=(230, 230, 230, 255))
    Path(saida).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(saida, "PNG")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("imagens", nargs="+", help="PNG/WebP com alfa, ou pastas")
    ap.add_argument("--fundo", default="#808080", help="cor do cenário em hex (padrão cinza médio)")
    ap.add_argument("--reducao", type=int, default=4, help="fator de redução do teste de distância (padrão 4)")
    ap.add_argument("--alvo-px", type=int, help="altura em px CSS em que o asset aparece no jogo (ex.: 44 para botão)")
    ap.add_argument("--min-contraste", type=float, default=3.0)
    ap.add_argument("--min-silhueta", type=float, default=0.80)
    ap.add_argument("--min-detalhe", type=float, default=0.35)
    ap.add_argument("--min-valor", type=float, default=0.06)
    ap.add_argument("--min-ocupacao", type=float, default=0.25)
    ap.add_argument("--folha", help="PNG com 1x, 1/2, 1/N, cinza e silhueta sobre o fundo (evidência)")
    ap.add_argument("--json", help="grava as métricas em JSON")
    a = ap.parse_args()

    fundo = hex_rgb(a.fundo)
    arqs = []
    for e in a.imagens:
        p = Path(e)
        arqs += sorted(x for x in p.iterdir() if x.suffix.lower() in EXT) if p.is_dir() else ([p] if p.exists() else [])
    if not arqs:
        sys.exit("nenhuma imagem")
    itens, falhas, saida = [], [], []
    for p in arqs:
        r = medir(p, fundo, a.reducao, a.alvo_px)
        if isinstance(r, dict):
            print(f"{p.name}: {r['erro']}"); falhas.append(p.name); continue
        res, img, peq = r
        itens.append(r)
        prob = []
        if res["contraste_fundo"] < a.min_contraste: prob.append("contraste")
        if res[f"silhueta_1_{a.reducao}"] < a.min_silhueta: prob.append("silhueta")
        if res[f"detalhe_1_{a.reducao}"] < a.min_detalhe: prob.append("detalhe")
        if res["valor_interno"] < a.min_valor: prob.append("valor")
        if res["ocupacao_bbox"] < a.min_ocupacao: prob.append("ocupacao")
        if a.alvo_px and res.get("silhueta_alvo", 1) < a.min_silhueta: prob.append("silhueta_alvo")
        res["veredito"] = "OK" if not prob else "REVISAR: " + ",".join(prob)
        if prob: falhas.append(p.name)
        saida.append(res)
        print(" · ".join(f"{k}={v}" for k, v in res.items()))
    if a.folha and itens:
        folha(itens, fundo, a.reducao, a.folha); print(f"folha: {a.folha}")
    if a.json:
        Path(a.json).parent.mkdir(parents=True, exist_ok=True)
        Path(a.json).write_text(json.dumps({"fundo": a.fundo, "reducao": a.reducao, "resultados": saida}, indent=2, ensure_ascii=False), encoding="utf-8")
    if falhas:
        print(f"{len(falhas)} de {len(arqs)} precisam de revisão: {', '.join(falhas)}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
