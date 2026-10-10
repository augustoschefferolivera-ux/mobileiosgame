#!/usr/bin/env python3
"""Calcula o custo de trocas de diálogo com Claude (prompt caching + saída) e o orçamento mensal.

Preços em US$ por milhão de tokens, lidos em 10/10/2026 em
https://platform.claude.com/docs/en/about-claude/pricing . Confira antes de usar:
preços mudam e este script não consulta a rede.

Exemplo (troca típica de NPC):
  python3 calcular-custo-npc.py --cache 1000 --entrada 200 --saida 150 --trocas 1000
  python3 calcular-custo-npc.py --modelo sonnet-5-5 --cache 1500 --entrada 300 --saida 200 \
      --dau 10000 --trocas-dia 20
  python3 calcular-custo-npc.py --batch --entrada 300 --saida 150 --trocas 50000
"""
import argparse
import sys

PRECOS_DATA = "2026-10-10"
PRECOS_URL = "https://platform.claude.com/docs/en/about-claude/pricing"

# entrada, saida, cache_write_5m, cache_write_1h, cache_hit, batch_entrada, batch_saida
PRECOS = {
    "haiku-5-5": dict(entrada=0.10, saida=0.50, write5=0.125, write1h=0.20, hit=0.01,
                      batch_entrada=0.05, batch_saida=0.25,
                      nota="prompt <= 100K tokens; acima disso 0,50/2,50"),
    "sonnet-5-5": dict(entrada=2.00, saida=10.00, write5=2.50, write1h=4.00, hit=0.10,
                       batch_entrada=1.00, batch_saida=5.00,
                       nota="cache hit 0,10 na pagina de precos lida; a skill claude-api local lista 0,20 - confirme"),
    "opus-5-5": dict(entrada=4.00, saida=20.00, write5=5.00, write1h=8.00, hit=0.20,
                     batch_entrada=2.00, batch_saida=10.00, nota=""),
}
MIN_CACHE_TOKENS = 512  # minimo cacheavel nos modelos 5.5


def por_milhao(tokens: int, preco: float) -> float:
    return tokens * preco / 1_000_000


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--modelo", choices=sorted(PRECOS), default="haiku-5-5", help="modelo (padrao: haiku-5-5)")
    p.add_argument("--cache", type=int, default=0, help="tokens do prefixo em cache por troca (biblia + ficha)")
    p.add_argument("--entrada", type=int, required=True, help="tokens novos de entrada por troca (estado + fala do jogador)")
    p.add_argument("--saida", type=int, required=True, help="tokens de saida por troca")
    p.add_argument("--trocas", type=int, default=1000, help="numero de trocas para o total (padrao: 1000)")
    p.add_argument("--sessao", type=int, default=10, help="trocas por sessao, para ratear o cache write (padrao: 10)")
    p.add_argument("--ttl-1h", action="store_true", help="usar cache write de 1 h (2x) em vez de 5 min (1,25x)")
    p.add_argument("--batch", action="store_true", help="precos do Batch (-50%%); ignora cache")
    p.add_argument("--dau", type=int, default=0, help="jogadores ativos/dia para orcamento mensal")
    p.add_argument("--trocas-dia", type=int, default=0, help="trocas por jogador por dia")
    a = p.parse_args()

    pr = PRECOS[a.modelo]
    if a.batch:
        por_troca = por_milhao(a.cache + a.entrada, pr["batch_entrada"]) + por_milhao(a.saida, pr["batch_saida"])
        detalhe = f"batch: ({a.cache + a.entrada} x {pr['batch_entrada']} + {a.saida} x {pr['batch_saida']}) / 1e6"
        write = 0.0
    else:
        if 0 < a.cache < MIN_CACHE_TOKENS:
            print(f"AVISO: prefixo de {a.cache} tokens e menor que o minimo cacheavel ({MIN_CACHE_TOKENS}); "
                  "sera cobrado como entrada normal.", file=sys.stderr)
            a.entrada += a.cache
            a.cache = 0
        por_troca = (por_milhao(a.cache, pr["hit"]) + por_milhao(a.entrada, pr["entrada"])
                     + por_milhao(a.saida, pr["saida"]))
        detalhe = (f"{a.cache} x {pr['hit']} + {a.entrada} x {pr['entrada']} + {a.saida} x {pr['saida']} / 1e6")
        write = por_milhao(a.cache, pr["write1h"] if a.ttl_1h else pr["write5"])

    sem_cache = por_milhao(a.cache + a.entrada, pr["entrada"]) + por_milhao(a.saida, pr["saida"])
    rateio_write = write / max(a.sessao, 1)

    print(f"Modelo: claude-{a.modelo}  (precos de {PRECOS_DATA}, {PRECOS_URL})")
    if pr["nota"]:
        print(f"Nota: {pr['nota']}")
    print(f"Por troca: US$ {por_troca:.6f}   [{detalhe}]")
    if not a.batch:
        print(f"Cache write por sessao: US$ {write:.6f} (rateado em {a.sessao} trocas: US$ {rateio_write:.6f}/troca)")
        print(f"Sem cache, a mesma troca custaria: US$ {sem_cache:.6f} ({sem_cache / por_troca:.1f}x)")
    total = (por_troca + rateio_write) * a.trocas
    print(f"{a.trocas} trocas: US$ {total:.4f}")
    if a.dau and a.trocas_dia:
        mes = (por_troca + rateio_write) * a.dau * a.trocas_dia * 30
        print(f"Orcamento mensal: {a.dau} DAU x {a.trocas_dia} trocas/dia x 30 = US$ {mes:,.2f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
