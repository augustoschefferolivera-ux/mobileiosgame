#!/usr/bin/env python3
"""nomear_e_registrar.py — renomeia um asset gerado para o padrão do projeto e anexa uma linha ao PROVENANCE.md.

Dependências: só biblioteca padrão (Python 3.10+).

Padrão de nome: <categoria>_<nome>[_<variante>][_<NN>].<ext>, tudo ASCII minúsculo (snake_case).
Categorias: chr enm itm prp ui icn tile bg fx (outras aceitas com --categoria-livre).
Pasta padrão por categoria: chr/enm/itm/prp/fx -> assets/sprites, ui/icn -> assets/ui, tile -> assets/tiles, bg -> assets/backgrounds.

Exemplo:
  nomear_e_registrar.py assets/brutos/2026-10-10/img_003_cut.png --categoria chr --nome heroi --variante idle \
    --modelo gpt-image-1.5 --versao 2025-12-16 --seed n/a --prompt-arquivo prompts/heroi_idle.txt \
    --refs "assets/referencias/chr_heroi_sheet.png" --pos "remove_bg.py birefnet-general; aparar" \
    --edicao-humana "curadoria 1/4; retoque de contorno no Aseprite" --aprovado-por "Augusto" \
    --licenca "OpenAI: uso comercial (confirmar termos)"
Use --dry-run para ver o que aconteceria. Use --copiar para manter o original em assets/brutos/.
"""
import argparse
import hashlib
import re
import shutil
import sys
from datetime import date
from pathlib import Path

CATS = {"chr": "assets/sprites", "enm": "assets/sprites", "itm": "assets/sprites", "prp": "assets/sprites",
        "fx": "assets/sprites", "ui": "assets/ui", "icn": "assets/ui", "tile": "assets/tiles", "bg": "assets/backgrounds"}
CABECALHO = (
    "# PROVENANCE — registro de origem dos assets\n\n"
    "Uma linha por arquivo final. Prompt longo: aponte para o arquivo em `prompts/`. "
    "Edição humana é o que gera direito autoral; descreva-a.\n\n"
    "| Data | Arquivo | SHA-256 (12) | Modelo | Versão/snapshot | Seed | Prompt | Referências | Pós-processo | "
    "Edição humana | Aprovado por | Licença/termos de saída | Notas |\n"
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n"
)
ACENTOS = str.maketrans("àáâãäèéêëìíîïòóôõöùúûüç", "aaaaaeeeeiiiiooooouuuuc")


def slug(s: str) -> str:
    s = s.strip().lower().translate(ACENTOS)
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    if not s:
        sys.exit("nome/variante vazio após normalização")
    return s


def celula(texto: str) -> str:
    return (texto or "").replace("|", "\\|").replace("\n", " ").strip() or "—"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("arquivo", help="arquivo gerado (já curado e recortado)")
    ap.add_argument("--categoria", required=True, help="chr enm itm prp ui icn tile bg fx (ou outra com --categoria-livre)")
    ap.add_argument("--categoria-livre", action="store_true")
    ap.add_argument("--nome", required=True)
    ap.add_argument("--variante", default="")
    ap.add_argument("--indice", type=int, help="força o sufixo numérico NN; sem isso, incrementa se o nome já existir")
    ap.add_argument("--destino", help="pasta de destino (padrão por categoria)")
    ap.add_argument("--copiar", action="store_true", help="copia em vez de mover")
    ap.add_argument("--provenance", default="PROVENANCE.md")
    ap.add_argument("--modelo", required=True, help="ex.: gpt-image-1.5, gemini-3-pro-image-preview, PixelLab, humano")
    ap.add_argument("--versao", default="", help="snapshot/data da versão do modelo")
    ap.add_argument("--seed", default="", help="seed usado (ou n/a quando o provedor não expõe)")
    ap.add_argument("--prompt", default="")
    ap.add_argument("--prompt-arquivo", help="caminho de um .txt com o prompt completo (preferível a --prompt longo)")
    ap.add_argument("--refs", default="", help="imagens de referência usadas (caminhos ou n/a)")
    ap.add_argument("--pos", default="", help="pós-processo: recorte (modelo), upscale, requantização, etc.")
    ap.add_argument("--edicao-humana", default="", help="o que a pessoa escolheu/alterou (curadoria N/M, retoque, recolor)")
    ap.add_argument("--aprovado-por", default="")
    ap.add_argument("--licenca", default="", help="termos de saída do provedor (comercial? exclusões?) — marque 'confirmar' se não lido")
    ap.add_argument("--notas", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    origem = Path(args.arquivo)
    if not origem.exists():
        sys.exit(f"não existe: {origem}")
    cat = slug(args.categoria)
    if cat not in CATS and not args.categoria_livre:
        sys.exit(f"categoria '{cat}' desconhecida; use uma de {sorted(CATS)} ou --categoria-livre")
    destino_dir = Path(args.destino) if args.destino else Path(CATS.get(cat, f"assets/{cat}"))
    partes = [cat, slug(args.nome)] + ([slug(args.variante)] if args.variante else [])
    base = "_".join(partes)
    ext = origem.suffix.lower()

    if args.indice is not None:
        novo = destino_dir / f"{base}_{args.indice:02d}{ext}"
    else:
        novo = destino_dir / f"{base}{ext}"
        n = 1
        while novo.exists():
            n += 1
            novo = destino_dir / f"{base}_{n:02d}{ext}"

    prompt = f"`{args.prompt_arquivo}`" if args.prompt_arquivo else args.prompt
    sha = hashlib.sha256(origem.read_bytes()).hexdigest()[:12]
    campos = [date.today().isoformat(), str(novo), sha, args.modelo, args.versao, args.seed, prompt, args.refs,
              args.pos, args.edicao_humana, args.aprovado_por, args.licenca, args.notas]
    linha = "| " + " | ".join(celula(x) for x in campos) + " |\n"

    print(f"{'[dry-run] ' if args.dry_run else ''}{origem} -> {novo}")
    print(linha.rstrip())
    if args.dry_run:
        return
    destino_dir.mkdir(parents=True, exist_ok=True)
    (shutil.copy2 if args.copiar else shutil.move)(str(origem), str(novo))
    prov = Path(args.provenance)
    if not prov.exists():
        prov.write_text(CABECALHO, encoding="utf-8")
    with prov.open("a", encoding="utf-8") as fh:
        fh.write(linha)
    print(f"registrado em {prov}")


if __name__ == "__main__":
    main()
