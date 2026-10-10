#!/usr/bin/env python3
"""remove_bg.py — recorte determinístico de fundo com BiRefNet (via rembg, local) ou Replicate (nuvem).

Dependências (instale você mesmo; este script NÃO baixa nada sem aviso):
  python3 -m pip install Pillow "rembg[cpu]"      # backend local (padrão)
  python3 -m pip install replicate                  # backend nuvem, opcional (REPLICATE_API_TOKEN; pago)

Modelos do rembg são baixados na primeira execução para ~/.u2net/ (ou $U2NET_HOME). Este script
procura o modelo localmente (heurística pelo nome) e ABORTA se não encontrar, a menos que você passe
--permitir-download. Lista de modelos aceitos pelo rembg: `rembg --help` ou a documentação do pacote
(nomes como "birefnet-general", "isnet-anime", "u2net"; confirme na sua versão).

Exemplos:
  remove_bg.py assets/brutos/2026-10-10/*.png --saida assets/brutos/2026-10-10/recortes --aparar --margem 4
  remove_bg.py sprite.png --backend replicate --replicate-modelo sprited/birefnet-toonout --saida out/
Saída: PNG RGBA com sufixo (padrão "_cut") + relatório JSON opcional com a caixa de alfa de cada arquivo.
"""
import argparse
import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow ausente: python3 -m pip install Pillow")

EXT = {".png", ".jpg", ".jpeg", ".webp"}


def coletar(entradas):
    arquivos = []
    for e in entradas:
        p = Path(e)
        if p.is_dir():
            arquivos += sorted(x for x in p.iterdir() if x.suffix.lower() in EXT)
        elif p.exists():
            arquivos.append(p)
        else:
            print(f"aviso: {p} não existe", file=sys.stderr)
    return arquivos


def modelo_local_existe(modelo: str) -> bool:
    """Heurística: procura em $U2NET_HOME (ou ~/.u2net) um arquivo cujo nome contenha todos os
    tokens do nome do modelo (ex.: 'birefnet' e 'general'). Não é garantia; evita download surpresa."""
    home = Path(os.environ.get("U2NET_HOME", Path.home() / ".u2net"))
    if not home.exists():
        return False
    tokens = [t for t in modelo.lower().replace("_", "-").split("-") if t]
    for f in home.iterdir():
        nome = f.name.lower().replace("_", "-")
        if all(t in nome for t in tokens):
            return True
    return False


def aparar(img: Image.Image, margem: int) -> Image.Image:
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l, t = max(0, l - margem), max(0, t - margem)
    r, b = min(img.width, r + margem), min(img.height, b + margem)
    return img.crop((l, t, r, b))


def recortar_rembg(img: Image.Image, sessao, matting: bool) -> Image.Image:
    from rembg import remove
    out = remove(img, session=sessao, alpha_matting=matting)
    return out.convert("RGBA")


def recortar_replicate(caminho: Path, modelo: str, chave: str) -> Image.Image:
    """Chama um modelo hospedado no Replicate (pago). O nome do campo de entrada varia por modelo;
    confira o README do modelo e ajuste --replicate-input-key."""
    import io
    import replicate

    with open(caminho, "rb") as fh:
        saida = replicate.run(modelo, input={chave: fh})
    # A SDK pode devolver um FileOutput (com .read()), uma URL (str) ou uma lista deles.
    item = saida[0] if isinstance(saida, list) else saida
    if hasattr(item, "read"):
        dados = item.read()
    else:
        import urllib.request
        with urllib.request.urlopen(str(item)) as resp:
            dados = resp.read()
    return Image.open(io.BytesIO(dados)).convert("RGBA")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entradas", nargs="+", help="arquivos ou pastas (png/jpg/webp)")
    ap.add_argument("--saida", required=True, help="pasta de saída (criada se não existir)")
    ap.add_argument("--backend", choices=["rembg", "replicate"], default="rembg")
    ap.add_argument("--modelo", default="birefnet-general", help="modelo do rembg (padrão: birefnet-general)")
    ap.add_argument("--permitir-download", action="store_true", help="autoriza o rembg a baixar o modelo se faltar")
    ap.add_argument("--matting", action="store_true", help="alpha matting do rembg (bordas suaves; mais lento)")
    ap.add_argument("--replicate-modelo", default="sprited/birefnet-toonout", help="modelo no Replicate (pago)")
    ap.add_argument("--replicate-input-key", default="image", help="nome do campo de imagem do modelo (confira o README do modelo)")
    ap.add_argument("--aparar", action="store_true", help="recorta a imagem à caixa de alfa (bounding box)")
    ap.add_argument("--margem", type=int, default=2, help="margem em px ao aparar (padrão 2)")
    ap.add_argument("--sufixo", default="_cut")
    ap.add_argument("--sobrescrever", action="store_true")
    ap.add_argument("--relatorio", help="grava JSON com bbox/dimensões por arquivo")
    args = ap.parse_args()

    arquivos = coletar(args.entradas)
    if not arquivos:
        sys.exit("nenhuma imagem encontrada")
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)

    sessao = None
    if args.backend == "rembg":
        try:
            from rembg import new_session
        except ImportError:
            sys.exit("rembg ausente: python3 -m pip install 'rembg[cpu]'  (ou use --backend replicate)")
        if not modelo_local_existe(args.modelo) and not args.permitir_download:
            sys.exit(f"modelo '{args.modelo}' não encontrado em {os.environ.get('U2NET_HOME', '~/.u2net')}. "
                     "O rembg o baixaria agora (dezenas a centenas de MB). Rode de novo com --permitir-download para autorizar.")
        sessao = new_session(args.modelo)
    else:
        if not os.environ.get("REPLICATE_API_TOKEN"):
            sys.exit("defina REPLICATE_API_TOKEN para usar --backend replicate (cada chamada é cobrada)")

    relatorio = []
    for arq in arquivos:
        destino = saida / f"{arq.stem}{args.sufixo}.png"
        if destino.exists() and not args.sobrescrever:
            print(f"pulado (existe): {destino}")
            continue
        if args.backend == "rembg":
            out = recortar_rembg(Image.open(arq).convert("RGBA"), sessao, args.matting)
        else:
            out = recortar_replicate(arq, args.replicate_modelo, args.replicate_input_key)
        if args.aparar:
            out = aparar(out, args.margem)
        out.save(destino, "PNG", optimize=True)
        bbox = out.getchannel("A").getbbox()
        relatorio.append({"origem": str(arq), "saida": str(destino), "largura": out.width, "altura": out.height,
                          "bbox_alfa": bbox, "backend": args.backend,
                          "modelo": args.modelo if args.backend == "rembg" else args.replicate_modelo})
        print(f"ok: {destino} ({out.width}x{out.height}, bbox={bbox})")

    if args.relatorio:
        Path(args.relatorio).write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"relatório: {args.relatorio}")


if __name__ == "__main__":
    main()
