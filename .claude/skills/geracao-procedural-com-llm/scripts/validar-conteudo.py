#!/usr/bin/env python3
"""Verificador de propriedades para conteúdo gerado por LLM (nível 2D e loja de itens).

Lê arquivos JSON (um item por arquivo ou lista) e aplica testes de propriedade que o JSON Schema
não cobre: nível sempre solucionável (BFS), inimigos em células livres, orçamento de stats por
raridade, IDs únicos, limites de texto e termos proibidos. Opcionalmente valida contra um JSON
Schema se o pacote `jsonschema` estiver instalado.

Exemplos:
  python3 validar-conteudo.py nivel content/gerado/niveis/ --schema content/schemas/nivel-2d.json
  python3 validar-conteudo.py loja content/gerado/lojas/*.json --relatorio validacao.json
  python3 validar-conteudo.py nivel nivel.json --mostrar-grid

O gerador de grid aqui é uma implementação de referência (seed + densidade → grid) para que o teste
de solucionabilidade seja executável; substitua `gerar_grid` pelo gerador do seu engine ou passe
`grid` (lista de strings, '#' = bloqueado, '.' = livre) dentro do JSON para validar o grid real.
Sem dependências externas; `jsonschema` é opcional.
"""
import argparse
import glob
import json
import os
import random
import sys
from collections import deque

# ---- limites do jogo: ajuste aqui -------------------------------------------------------------
NIVEL_DIM = (8, 32)
NIVEL_DENSIDADE = (0.05, 0.45)
NIVEL_INIMIGOS_MAX = {"facil": 3, "media": 6, "dificil": 10}
NIVEL_TITULO_PALAVRAS = 6
NIVEL_DESCRICAO_PALAVRAS = 30

LOJA_ITENS = (3, 8)
LOJA_PRECO = {"comum": (5, 50), "raro": (51, 200), "epico": (201, 1000)}
LOJA_STATS_ORCAMENTO = {"comum": 10, "raro": 25, "epico": 50}
LOJA_NOME_PALAVRAS = 4
LOJA_DESCRICAO_PALAVRAS = 25

TERMOS_PROIBIDOS = ["as an ai", "como modelo de linguagem", "lorem", "claude", "gpt", "openai", "anthropic",
                    "nintendo", "pokemon", "pokémon", "disney", "marvel"]
# -----------------------------------------------------------------------------------------------


def palavras(s: str) -> int:
    return len([w for w in str(s).split() if w])


def termos_proibidos(s: str):
    t = str(s).lower()
    return [p for p in TERMOS_PROIBIDOS if p in t]


def gerar_grid(seed: int, largura: int, altura: int, densidade: float, inicio, saida):
    """Implementação de referência: ruído uniforme com seed; início/saída sempre livres."""
    rng = random.Random(seed)
    grid = [["#" if rng.random() < densidade else "." for _ in range(largura)] for _ in range(altura)]
    for c in (inicio, saida):
        if 0 <= c["y"] < altura and 0 <= c["x"] < largura:
            grid[c["y"]][c["x"]] = "."
    return ["".join(row) for row in grid]


def caminho_existe(grid, inicio, saida) -> bool:
    altura, largura = len(grid), len(grid[0])
    alvo = (saida["x"], saida["y"])
    fila = deque([(inicio["x"], inicio["y"])])
    visto = {fila[0]}
    while fila:
        x, y = fila.popleft()
        if (x, y) == alvo:
            return True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < largura and 0 <= ny < altura and (nx, ny) not in visto and grid[ny][nx] == ".":
                visto.add((nx, ny))
                fila.append((nx, ny))
    return False


def validar_nivel(n: dict, ids_vistos: set, mostrar_grid=False):
    erros = []
    for k in ("id", "tema", "dificuldade", "seed", "largura", "altura", "densidade_obstaculos", "inicio", "saida", "inimigos", "titulo", "descricao"):
        if k not in n:
            erros.append(f"campo ausente: {k}")
    if erros:
        return erros
    if n["id"] in ids_vistos:
        erros.append(f"id duplicado: {n['id']}")
    ids_vistos.add(n["id"])
    L, A = n["largura"], n["altura"]
    if not (NIVEL_DIM[0] <= L <= NIVEL_DIM[1] and NIVEL_DIM[0] <= A <= NIVEL_DIM[1]):
        erros.append(f"dimensões fora da faixa {NIVEL_DIM}: {L}x{A}")
    d = n["densidade_obstaculos"]
    if not (NIVEL_DENSIDADE[0] <= d <= NIVEL_DENSIDADE[1]):
        erros.append(f"densidade fora da faixa {NIVEL_DENSIDADE}: {d}")
    ini, sai = n["inicio"], n["saida"]
    for nome, c in (("inicio", ini), ("saida", sai)):
        if not (0 <= c.get("x", -1) < L and 0 <= c.get("y", -1) < A):
            erros.append(f"{nome} fora do grid: {c}")
    if (ini.get("x"), ini.get("y")) == (sai.get("x"), sai.get("y")):
        erros.append("inicio == saida")
    if erros:
        return erros
    grid = n.get("grid") or gerar_grid(int(n["seed"]), L, A, float(d), ini, sai)
    if len(grid) != A or any(len(r) != L for r in grid):
        erros.append("grid com dimensões diferentes de largura/altura")
        return erros
    if mostrar_grid:
        print("\n".join(grid))
    if not caminho_existe(grid, ini, sai):
        erros.append("sem caminho inicio -> saida (BFS)")
    maximo = NIVEL_INIMIGOS_MAX.get(n["dificuldade"])
    if maximo is None:
        erros.append(f"dificuldade desconhecida: {n['dificuldade']}")
    elif len(n["inimigos"]) > maximo:
        erros.append(f"{len(n['inimigos'])} inimigos > máximo {maximo} para {n['dificuldade']}")
    ocupadas = set()
    for e in n["inimigos"]:
        pos = (e.get("x"), e.get("y"))
        if not (0 <= e.get("x", -1) < L and 0 <= e.get("y", -1) < A):
            erros.append(f"inimigo fora do grid: {e}")
            continue
        if grid[e["y"]][e["x"]] != ".":
            erros.append(f"inimigo em célula bloqueada: {e}")
        if pos in ((ini["x"], ini["y"]), (sai["x"], sai["y"])):
            erros.append(f"inimigo sobre inicio/saida: {e}")
        if pos in ocupadas:
            erros.append(f"dois inimigos na mesma célula: {e}")
        ocupadas.add(pos)
    if palavras(n["titulo"]) > NIVEL_TITULO_PALAVRAS:
        erros.append(f"titulo com {palavras(n['titulo'])} palavras (> {NIVEL_TITULO_PALAVRAS})")
    if palavras(n["descricao"]) > NIVEL_DESCRICAO_PALAVRAS:
        erros.append(f"descricao com {palavras(n['descricao'])} palavras (> {NIVEL_DESCRICAO_PALAVRAS})")
    for campo in ("titulo", "descricao"):
        tp = termos_proibidos(n[campo])
        if tp:
            erros.append(f"{campo} com termos proibidos: {tp}")
    return erros


def validar_loja(l: dict, ids_vistos: set, **_):
    erros = []
    for k in ("id", "nome_loja", "tema", "itens"):
        if k not in l:
            erros.append(f"campo ausente: {k}")
    if erros:
        return erros
    if l["id"] in ids_vistos:
        erros.append(f"id duplicado: {l['id']}")
    ids_vistos.add(l["id"])
    if palavras(l["nome_loja"]) > LOJA_NOME_PALAVRAS:
        erros.append(f"nome_loja com {palavras(l['nome_loja'])} palavras (> {LOJA_NOME_PALAVRAS})")
    itens = l["itens"]
    if not (LOJA_ITENS[0] <= len(itens) <= LOJA_ITENS[1]):
        erros.append(f"{len(itens)} itens fora da faixa {LOJA_ITENS}")
    ids_itens = set()
    for it in itens:
        for k in ("id", "nome", "tipo", "raridade", "preco", "stats", "descricao"):
            if k not in it:
                erros.append(f"item sem campo {k}: {it.get('id', '?')}")
        if any(k not in it for k in ("id", "raridade", "preco", "stats")):
            continue
        if it["id"] in ids_itens or it["id"] in ids_vistos:
            erros.append(f"id de item duplicado: {it['id']}")
        ids_itens.add(it["id"])
        ids_vistos.add(it["id"])
        faixa = LOJA_PRECO.get(it["raridade"])
        if faixa is None:
            erros.append(f"raridade desconhecida: {it['raridade']}")
            continue
        if not (faixa[0] <= it["preco"] <= faixa[1]):
            erros.append(f"{it['id']}: preco {it['preco']} fora de {faixa} para {it['raridade']}")
        st = it["stats"]
        if any(st.get(k, 0) < 0 for k in ("ataque", "defesa", "vida")):
            erros.append(f"{it['id']}: stat negativo")
        soma = sum(st.get(k, 0) for k in ("ataque", "defesa", "vida"))
        if soma > LOJA_STATS_ORCAMENTO[it["raridade"]]:
            erros.append(f"{it['id']}: stats {soma} > orçamento {LOJA_STATS_ORCAMENTO[it['raridade']]} ({it['raridade']})")
        if it.get("tipo") == "pocao" and (st.get("ataque", 0) or st.get("defesa", 0)):
            erros.append(f"{it['id']}: poção com ataque/defesa")
        if palavras(it.get("nome", "")) > LOJA_NOME_PALAVRAS:
            erros.append(f"{it['id']}: nome longo")
        if palavras(it.get("descricao", "")) > LOJA_DESCRICAO_PALAVRAS:
            erros.append(f"{it['id']}: descricao longa")
        for campo in ("nome", "descricao"):
            tp = termos_proibidos(it.get(campo, ""))
            if tp:
                erros.append(f"{it['id']}: {campo} com termos proibidos {tp}")
    return erros


def carregar(caminhos):
    arquivos = []
    for c in caminhos:
        if os.path.isdir(c):
            arquivos += sorted(glob.glob(os.path.join(c, "*.json")))
        else:
            arquivos += sorted(glob.glob(c)) or [c]
    for a in arquivos:
        with open(a, encoding="utf-8") as f:
            dados = json.load(f)
        if isinstance(dados, list):
            for i, item in enumerate(dados):
                yield f"{a}[{i}]", item
        else:
            yield a, dados


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("tipo", choices=["nivel", "loja"], help="tipo de conteúdo")
    p.add_argument("caminhos", nargs="+", help="arquivos JSON, globs ou diretórios")
    p.add_argument("--schema", help="JSON Schema para validar antes das propriedades (requer `pip install jsonschema`)")
    p.add_argument("--relatorio", help="grava relatório JSON neste caminho")
    p.add_argument("--mostrar-grid", action="store_true", help="imprime o grid de referência de cada nível")
    a = p.parse_args()

    validador = None
    if a.schema:
        try:
            import jsonschema  # type: ignore
            with open(a.schema, encoding="utf-8") as f:
                validador = jsonschema.Draft202012Validator(json.load(f))
        except ImportError:
            print("AVISO: pacote jsonschema não instalado; pulando validação de schema.", file=sys.stderr)

    fn = validar_nivel if a.tipo == "nivel" else validar_loja
    ids = set()
    relatorio = {"tipo": a.tipo, "total": 0, "aprovados": 0, "rejeitados": [], "motivos": {}}
    for origem, item in carregar(a.caminhos):
        relatorio["total"] += 1
        erros = []
        if validador is not None:
            erros += [f"schema: {e.message}" for e in validador.iter_errors(item)]
        erros += fn(item, ids, mostrar_grid=a.mostrar_grid)
        if erros:
            relatorio["rejeitados"].append({"origem": origem, "erros": erros})
            for e in erros:
                chave = e.split(":")[0]
                relatorio["motivos"][chave] = relatorio["motivos"].get(chave, 0) + 1
            print(f"REJEITADO {origem}\n  - " + "\n  - ".join(erros))
        else:
            relatorio["aprovados"] += 1
            print(f"ok        {origem}")
    print(f"\n{relatorio['aprovados']}/{relatorio['total']} aprovados; motivos: {relatorio['motivos']}")
    if a.relatorio:
        with open(a.relatorio, "w", encoding="utf-8") as f:
            json.dump(relatorio, f, ensure_ascii=False, indent=2)
        print(f"relatório em {a.relatorio}")
    return 0 if relatorio["aprovados"] == relatorio["total"] else 1


if __name__ == "__main__":
    sys.exit(main())
