#!/usr/bin/env python3
"""nomear_e_registrar.py — renomeia um asset gerado para o padrão do projeto e registra uma seção no PROVENANCE.md
(formato de `templates/PROVENANCE.md`, auditado por `.claude/skills/licencas-e-proveniencia/scripts/check_provenance.py`).

Dependências: só biblioteca padrão (Python 3.10+).

Padrão de nome: <categoria>_<nome>[_<variante>][_<NN>].<ext>, ASCII minúsculo (snake_case).
Categorias: chr enm itm prp fx (-> assets/sprites) · ui icn (-> assets/ui) · tile (-> assets/tiles) · bg (-> assets/backgrounds).
Outras com --categoria-livre (-> assets/<categoria>).

Campos obrigatórios do PROVENANCE: tipo, ferramenta, versao, edicao_humana, master, data, licenca.
`--licenca` recebe o `id` da tabela de LICENCAS.md (ex.: gpt-image-1-5) e vira `LICENCAS.md#<id>`.
`--nivel` (gerado | assistido | humano) é deduzido de --edicao-humana quando omitido.

Exemplo:
  nomear_e_registrar.py assets/brutos/2026-10-10/enm_bomba/recortes/var_02_cut.png --categoria enm --nome bomba --variante idle \
    --ferramenta "gpt-image-1.5 (API OpenAI)" --versao "gpt-image-1.5, chamada em 2026-10-10" --seed n/a \
    --prompt-arquivo prompts/sprites/enm_bomba_idle.txt --referencia "art bible v1; style card v1" --selecao "1 de 4 candidatos" \
    --edicao-humana "curadoria e aparo; contorno retocado no Aseprite (Augusto, 2026-10-10)" --master masters/sprites/enm_bomba_idle.aseprite \
    --licenca gpt-image-1-5 --pos "fundo transparente nativo; Lanczos para 384 px" --aprovado-por Augusto
Use --dry-run para ver o que aconteceria. Use --copiar para manter o original em assets/brutos/.
Se PROVENANCE.md não existir, é criado a partir de templates/PROVENANCE.md (sem os exemplos) ou com cabeçalho mínimo.
"""
import argparse
import hashlib
import re
import shutil
import struct
import sys
from datetime import date
from pathlib import Path

CATS = {"chr": "assets/sprites", "enm": "assets/sprites", "itm": "assets/sprites", "prp": "assets/sprites",
        "fx": "assets/sprites", "ui": "assets/ui", "icn": "assets/ui", "tile": "assets/tiles", "bg": "assets/backgrounds"}
TIPOS = {"chr": "sprite 2D (personagem)", "enm": "sprite 2D (inimigo)", "itm": "sprite 2D (item)", "prp": "sprite 2D (prop)",
         "fx": "sprite 2D (efeito)", "ui": "peça de UI", "icn": "ícone", "tile": "tile/tileset", "bg": "background (camada de parallax)"}
ACENTOS = str.maketrans("àáâãäèéêëìíîïòóôõöùúûüç", "aaaaaeeeeiiiiooooouuuuc")
CABECALHO_MINIMO = ("# PROVENANCE — [Nome do jogo]\n\nRegistro de proveniência por asset (ver templates/PROVENANCE.md para as convenções).\n\n## Assets\n")


def slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", s.strip().lower().translate(ACENTOS)).strip("_")
    if not s:
        sys.exit("nome/variante vazio após normalização")
    return s


def dimensoes_png(p: Path):
    try:
        with p.open("rb") as fh:
            cab = fh.read(24)
        if cab[:8] == b"\x89PNG\r\n\x1a\n" and cab[12:16] == b"IHDR":
            w, h = struct.unpack(">II", cab[16:24])
            return f"{w}×{h} px"
    except OSError:
        pass
    return None


def criar_provenance(prov: Path, template: Path):
    if template.exists():
        texto = template.read_text(encoding="utf-8")
        i = texto.find("## Assets")
        texto = (texto[: i + len("## Assets")] + "\n") if i >= 0 else texto.rstrip() + "\n\n## Assets\n"
    else:
        texto = CABECALHO_MINIMO
    prov.write_text(texto, encoding="utf-8")


def inserir_secao(prov: Path, caminho: str, secao: str):
    texto = prov.read_text(encoding="utf-8")
    padrao = re.compile(r"^### " + re.escape(caminho) + r"\s*$.*?(?=^### |^## |\Z)", re.M | re.S)
    if padrao.search(texto):
        texto = padrao.sub(lambda _m: secao, texto, count=1)
        acao = "atualizada"
    else:
        if not texto.endswith("\n"):
            texto += "\n"
        texto += "\n" + secao
        acao = "adicionada"
    prov.write_text(texto, encoding="utf-8")
    return acao


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("arquivo", help="arquivo gerado (já curado e recortado)")
    ap.add_argument("--categoria", required=True)
    ap.add_argument("--categoria-livre", action="store_true")
    ap.add_argument("--nome", required=True)
    ap.add_argument("--variante", default="")
    ap.add_argument("--indice", type=int, help="força o sufixo NN; sem isso, incrementa se o nome já existir")
    ap.add_argument("--destino", help="pasta de destino (padrão por categoria)")
    ap.add_argument("--copiar", action="store_true", help="copia em vez de mover")
    ap.add_argument("--provenance", default="PROVENANCE.md")
    ap.add_argument("--template-provenance", default="templates/PROVENANCE.md")
    ap.add_argument("--tipo", help="padrão deduzido da categoria + dimensões do PNG")
    ap.add_argument("--ferramenta", required=True, help='ex.: "gpt-image-1.5 (API OpenAI)", "PixelLab", "humano (Aseprite)"')
    ap.add_argument("--versao", required=True, help='ex.: "gpt-image-1.5, chamada em 2026-10-10" ou snapshot do modelo')
    ap.add_argument("--seed", default="n/a")
    ap.add_argument("--prompt-arquivo", help="prompts/<tipo>/<nome>.txt (um arquivo por asset)")
    ap.add_argument("--referencia", default="nenhuma", help="folha de referência, moodboard, versão da art bible")
    ap.add_argument("--selecao", default="", help='ex.: "1 de 4 candidatos"')
    ap.add_argument("--edicao-humana", required=True, help='o que a pessoa fez, quando e quem; "nenhuma" é permitido')
    ap.add_argument("--master", default="n/a (sem master editável)", help="arquivo editável em masters/ (Aseprite, PSD, SVG)")
    ap.add_argument("--licenca", required=True, help="id da tabela de LICENCAS.md (ex.: gpt-image-1-5) ou LICENCAS.md#id")
    ap.add_argument("--nivel", choices=["gerado", "assistido", "humano"])
    ap.add_argument("--c2pa", default="nao")
    ap.add_argument("--pos", default="", help="pós-processo: recorte (modelo), upscale, requantização, redimensionamento")
    ap.add_argument("--aprovado-por", default="")
    ap.add_argument("--observacoes", default="")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    origem = Path(a.arquivo)
    if not origem.exists():
        sys.exit(f"não existe: {origem}")
    cat = slug(a.categoria)
    if cat not in CATS and not a.categoria_livre:
        sys.exit(f"categoria '{cat}' desconhecida; use uma de {sorted(CATS)} ou --categoria-livre")
    destino_dir = Path(a.destino) if a.destino else Path(CATS.get(cat, f"assets/{cat}"))
    base = "_".join([cat, slug(a.nome)] + ([slug(a.variante)] if a.variante else []))
    ext = origem.suffix.lower()
    if a.indice is not None:
        novo = destino_dir / f"{base}_{a.indice:02d}{ext}"
    else:
        novo, n = destino_dir / f"{base}{ext}", 1
        while novo.exists():
            n += 1
            novo = destino_dir / f"{base}_{n:02d}{ext}"

    sha = hashlib.sha256(origem.read_bytes()).hexdigest()[:12]
    dims = dimensoes_png(origem)
    tipo = a.tipo or (TIPOS.get(cat, cat) + (f" ({dims})" if dims else ""))
    edicao = a.edicao_humana.strip() or "nenhuma"
    nivel = a.nivel or ("gerado" if edicao.lower() == "nenhuma" else "assistido")
    lic = a.licenca if a.licenca.startswith("LICENCAS.md#") else f"LICENCAS.md#{a.licenca}"
    obs = "; ".join(x for x in [f"sha256 {sha}", f"pós-processo: {a.pos}" if a.pos else "",
                                 f"aprovado por {a.aprovado_por}" if a.aprovado_por else "", a.observacoes] if x)
    campos = [("tipo", tipo), ("ferramenta", a.ferramenta), ("versao", a.versao), ("seed", a.seed),
              ("prompt", a.prompt_arquivo or "n/a"), ("referencia", a.referencia)]
    if a.selecao:
        campos.append(("selecao", a.selecao))
    campos += [("edicao_humana", edicao), ("master", a.master), ("data", date.today().isoformat()), ("licenca", lic),
               ("c2pa", a.c2pa), ("nivel", nivel), ("observacoes", obs)]
    secao = f"### {novo.as_posix()}\n" + "".join(f"- {k}: {v}\n" for k, v in campos)

    print(f"{'[dry-run] ' if a.dry_run else ''}{origem} -> {novo}\n{secao.rstrip()}")
    if a.dry_run:
        return
    destino_dir.mkdir(parents=True, exist_ok=True)
    (shutil.copy2 if a.copiar else shutil.move)(str(origem), str(novo))
    prov = Path(a.provenance)
    if not prov.exists():
        criar_provenance(prov, Path(a.template_provenance))
    acao = inserir_secao(prov, novo.as_posix(), secao)
    print(f"seção {acao} em {prov}")


if __name__ == "__main__":
    main()
