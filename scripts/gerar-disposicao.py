#!/usr/bin/env python3
"""Gera a disposição dos 54 obstáculos da Charneca (design/decisoes-F-002.md §2).

Usado uma vez, na F-002 (ADR-0004 §4). O JSON da região é a fonte e
tests/disposicao.test.ts trava as regras; este script só reproduz como a
disposição foi feita, por amostragem com rejeição (semente 2026):

  scripts/gerar-disposicao.py             imprime a lista "obstaculos" em JSON
  scripts/gerar-disposicao.py --conferir  compara com o JSON da região (sai com 1 se diferir)

Regras: centro a um raio das costuras; folga de 64 px entre bordas, medida no
toro; zona livre de 192 px em volta do início; corredor livre do início até a
costura em x; do outro lado da costura, o 1º obstáculo no caminho é o do
deslize, fixo em (230, 1.278); contagem por tela 6/7/5, 8/4/6, 5/7/6.
"""
import json
import math
import random
import sys
from pathlib import Path

W, H, TW, TH = 1170, 2532, 390, 844
SX, SY = 585, 1266
RAIO_DO_JOGADOR = 16
CONTAGEM = {(0, 0): 6, (1, 0): 7, (2, 0): 5, (0, 1): 8, (1, 1): 4, (2, 1): 6, (0, 2): 5, (1, 2): 7, (2, 2): 6}
FIXOS = [(230, 1278, 80)]  # o obstáculo do deslize, na tela (0, 1)
REGIAO = Path(__file__).resolve().parent.parent / 'src' / 'dados' / 'regioes' / 'charneca_das_lanternas.json'


def delta(a, b, L):
    d = a - b
    if d > L / 2:
        d -= L
    if d < -L / 2:
        d += L
    return d


def aceita(o, lista):
    x, y, t = o
    R = t / 2
    if x < R or x > W - R or y < R or y > H - R:
        return False
    if math.hypot(x - SX, y - SY) - R < 192:
        return False
    if x + R > SX - RAIO_DO_JOGADOR and abs(y - SY) < R + RAIO_DO_JOGADOR:
        return False
    if x - R < FIXOS[0][0] and abs(y - SY) < R + RAIO_DO_JOGADOR:
        return False
    return all(math.hypot(delta(x, a, W), delta(y, b, H)) - R - u / 2 >= 64 for (a, b, u) in lista)


def gerar():
    rng = random.Random(2026)
    for _ in range(2000):
        lista = list(FIXOS)
        falhou = False
        for (c, r), n in sorted(CONTAGEM.items(), key=lambda kv: (kv[0][1], kv[0][0])):
            ja = sum(1 for (x, y, _) in lista if (x // TW, y // TH) == (c, r))
            for _ in range(n - ja):
                for _ in range(4000):
                    t = rng.choice([64, 80, 96])
                    x = rng.randrange(c * TW, (c + 1) * TW)
                    y = rng.randrange(r * TH, (r + 1) * TH)
                    if aceita((x, y, t), lista):
                        lista.append((x, y, t))
                        break
                else:
                    falhou = True
                    break
            if falhou:
                break
        if not falhou:
            lista.sort(key=lambda o: (o[1] // TH, o[0] // TW, o[1], o[0]))
            return [{'x': x, 'y': y, 'forma': 'circulo', 'tamanho_px': t} for (x, y, t) in lista]
    raise SystemExit('gerar-disposicao: nenhuma disposição aceita')


if __name__ == '__main__':
    obstaculos = gerar()
    if '--conferir' in sys.argv[1:]:
        atual = json.loads(REGIAO.read_text(encoding='utf-8'))['obstaculos']
        if atual != obstaculos:
            raise SystemExit('gerar-disposicao: a disposição do JSON difere da gerada')
        print(f'gerar-disposicao: igual ({len(obstaculos)} obstáculos)')
    else:
        print(json.dumps(obstaculos, ensure_ascii=False, indent=2))
