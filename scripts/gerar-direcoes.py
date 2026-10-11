#!/usr/bin/env python3
"""Gera a tabela literal das direções do anel de spawn (ADR-0002 §5; design/decisoes-F-003.md §4, R4).

São 256 vetores unitários nos ângulos (k + 1/2) x 360/256 graus. O script calcula
as 64 entradas do 1º quadrante com 50 dígitos (série de Taylor em Decimal, com pi
pela fórmula de Machin) e as arredonda para o double mais próximo; as outras 192
o código monta por rotação exata de 90 graus e por negação (src/logica/mundo/direcoes.ts),
de modo que v[k + 64] = (-y, x) e v[k + 128] = -v[k] valem bit a bit.

  scripts/gerar-direcoes.py             imprime o bloco de literais do TypeScript
  scripts/gerar-direcoes.py --conferir  compara com src/logica/mundo/direcoes.ts por
                                        igualdade exata (sai com 1 se diferir): a tabela é
                                        a fonte bit a bit da simulação, e o gerador arredonda
                                        corretamente a partir de 50 dígitos
"""
import re
import sys
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50
POR_QUADRANTE = 64
ARQUIVO = Path(__file__).resolve().parent.parent / 'src' / 'logica' / 'mundo' / 'direcoes.ts'


def atan_inverso(n):
    """atan(1/n) pela série de Taylor."""
    x = Decimal(1) / n
    x2 = x * x
    termo, soma, k = x, x, 1
    while True:
        termo *= -x2
        parcela = termo / (2 * k + 1)
        if parcela == 0 or abs(parcela) < Decimal(10) ** -60:
            return soma
        soma += parcela
        k += 1


PI = 16 * atan_inverso(5) - 4 * atan_inverso(239)


def cos_sen(theta):
    """cos e sen de theta (Decimal) pelas séries de Taylor."""
    c, s = Decimal(0), Decimal(0)
    termo, n = Decimal(1), 0
    while abs(termo) > Decimal(10) ** -60:
        if n % 2 == 0:
            c += termo if (n // 2) % 2 == 0 else -termo
        else:
            s += termo if (n // 2) % 2 == 0 else -termo
        n += 1
        termo = termo * theta / n
    return c, s


def gerar():
    saida = []
    for k in range(POR_QUADRANTE):
        theta = (Decimal(k) + Decimal('0.5')) * 2 * PI / 256
        c, s = cos_sen(theta)
        saida.append((float(c), float(s)))
    return saida


def literal(v):
    return repr(v)


def bloco(pares):
    linhas = [f'  {literal(x)}, {literal(y)},' for (x, y) in pares]
    return '\n'.join(linhas)


def conferir(pares):
    texto = ARQUIVO.read_text(encoding='utf-8')
    m = re.search(r'QUADRANTE = Float64Array\.of\(\n(.*?)\n\);', texto, re.S)
    if not m:
        print(f'conferir: bloco QUADRANTE não achado em {ARQUIVO}', file=sys.stderr)
        return 1
    numeros = [float(t) for t in re.findall(r'-?[0-9.]+(?:e-?[0-9]+)?', m.group(1))]
    esperados = [v for par in pares for v in par]
    if len(numeros) != len(esperados):
        print(f'conferir: {len(numeros)} números no arquivo, {len(esperados)} esperados', file=sys.stderr)
        return 1
    ruins = [i for i, (a, b) in enumerate(zip(numeros, esperados)) if a != b]
    if ruins:
        print(f'conferir: {len(ruins)} valores diferentes (o 1º no índice {ruins[0]})', file=sys.stderr)
        return 1
    print(f'conferir: {len(esperados)} valores iguais, bit a bit')
    return 0


if __name__ == '__main__':
    pares = gerar()
    if '--conferir' in sys.argv[1:]:
        sys.exit(conferir(pares))
    print(bloco(pares))
