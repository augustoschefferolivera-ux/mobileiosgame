// Estado da sonda do TETO (ADR-0002 §13; ADR-0005 §8 item 8;
// design/decisoes-F-004.md §5): a simulação real, num estado descartável, com
// a carga do TETO 500. 500 Ocos numa malha fixa a pelo menos 34 px do jogador
// e 400 projéteis sintéticos (dano 0, vida máxima, nas 256 direções da tabela
// do anel) com a perfuração que não se gasta, para continuarem 400 durante os
// 360 passos da medida. Jogador invulnerável, diretor desligado, sem armas.
// Puro: quem mede o tempo é src/plataforma/sonda.ts, com o relógio injetado.
import { ARMA, indiceDoNivel } from '../armas/tabela';
import type { DadosDaVigilia } from '../mundo/dados';
import { DIRECAO_X, DIRECAO_Y, DIRECOES } from '../mundo/direcoes';
import { nascerInimigo } from '../mundo/inimigos';
import { TIPO } from '../mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, normalizarNoToro } from '../mundo/toro';
import {
  CAPACIDADE_DE_INIMIGOS,
  CAPACIDADE_DE_PROJETEIS,
  CENARIO,
  JOGADOR,
  PERFURACAO_INFINITA,
  TIPO_DE_PROJETIL,
  TODOS_OS_TUTORIAIS,
  criarEstado,
  type Estado,
} from './estado';
import { SEM_ALVO } from './eventos';
import { alocar } from './pool';

/** Espaçamento da malha dos Ocos: 36 px (um Oco tem 32), e nenhum a menos de 34 px do jogador. */
const MALHA_PX = 36;
const DISTANCIA_MINIMA_PX = 34;

export function montarEstadoDaSonda(dados: DadosDaVigilia): Estado {
  const e = criarEstado(0, dados, {
    teto: 500,
    cenario: CENARIO.jogadorInvulneravel | CENARIO.diretorDesligado,
    tutoriaisVistos: TODOS_OS_TUTORIAIS,
    armas: [],
  });
  const jx = e.jogador[JOGADOR.x]!;
  const jy = e.jogador[JOGADOR.y]!;
  // Malha de 25 × 21 em volta do jogador, em ordem fixa; as 500 primeiras posições a ≥ 34 px.
  let n = 0;
  for (let gy = -10; gy <= 10 && n < CAPACIDADE_DE_INIMIGOS; gy++) {
    for (let gx = -12; gx <= 12 && n < CAPACIDADE_DE_INIMIGOS; gx++) {
      if ((gx * gx + gy * gy) * MALHA_PX * MALHA_PX < DISTANCIA_MINIMA_PX * DISTANCIA_MINIMA_PX) continue;
      const x = normalizarNoToro(jx + gx * MALHA_PX, LARGURA_DO_MAPA);
      const y = normalizarNoToro(jy + gy * MALHA_PX, ALTURA_DO_MAPA);
      if (nascerInimigo(e, dados, TIPO.oco_das_lanternas, x, y, false) < 0) throw new Error('sonda: pool de inimigos cheio');
      n++;
    }
  }
  if (n !== CAPACIDADE_DE_INIMIGOS) throw new Error(`sonda: ${n} Ocos na malha`);
  // 400 facas sintéticas: a velocidade das Facas nv1, dano 0, a perfuração que não se gasta.
  const faca = ARMA.facas_de_sal;
  const v = dados.armas.velocidade[indiceDoNivel(faca, 1)]!;
  const p = e.projeteis;
  for (let k = 0; k < CAPACIDADE_DE_PROJETEIS; k++) {
    const s = alocar(e.poolDeProjeteis);
    if (s < 0) throw new Error('sonda: pool de projéteis cheio');
    const d = k % DIRECOES;
    p.x[s] = p.xAnt[s] = jx;
    p.y[s] = p.yAnt[s] = jy;
    p.vx[s] = DIRECAO_X[d]! * v;
    p.vy[s] = DIRECAO_Y[d]! * v;
    p.dano[s] = 0;
    p.ultimoAlvo[s] = SEM_ALVO;
    p.vida[s] = 0xffff;
    p.tipo[s] = TIPO_DE_PROJETIL.faca;
    p.arma[s] = faca;
    p.perfuracoes[s] = PERFURACAO_INFINITA;
  }
  return e;
}
