// Atributos, passivas e o dano vivo (design/decisoes-F-005.md §2, P1 a P5):
// o nível sobe no cruzamento da XP (FOR + 1 até o teto, hpMax pelo HP por
// nível, o HP atual sobe o mesmo tanto); Poder e Armadura são derivados das
// passivas, sem campo; o dano por (arma, nível) vive nos derivados do Estado,
// fora do buffer, e é recalculado só quando mudam os atributos ou o Poder, com
// a mesma fórmula do boot (gravarDanoPorAcerto), em dano.ts.
import type { DadosDaVigilia } from '../mundo/dados';
import { EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { CAB, JOGADOR, JOGADOR2, PROGRESSAO, VAGAS_DE_PASSIVA, type Estado } from '../nucleo/estado';
import { recalcularDano } from './dano';
import { hpMaximo } from './tabela';

export { armadura, poderPct, recalcularDano } from './dano';

/** Vaga da passiva na build, ou −1. */
export function vagaDaPassiva(e: Estado, codigo: number): number {
  const c = e.passivas.codigo;
  for (let v = 0; v < VAGAS_DE_PASSIVA; v++) if (c[v] === codigo) return v;
  return -1;
}

/** Vaga da arma na build, ou −1. */
export function vagaDaArma(e: Estado, codigo: number): number {
  const c = e.build.codigo;
  for (let v = 0; v < c.length; v++) if (c[v] === codigo) return v;
  return -1;
}

/**
 * Cruzamentos de nível do fim da fase de pickups (X1, P1 a P3), em todo passo:
 * enquanto a XP paga o custo do nível, sobe um nível, soma um pendente, o
 * ponto de FOR (até o teto) e o HP por nível, e grava o evento `nivel`. No
 * nível máximo técnico, a XP que sobra se perde. Devolve quantos níveis subiu.
 */
export function cruzarNiveis(e: Estado, dados: DadosDaVigilia): number {
  const t = dados.progressao;
  const pr = e.progresso;
  let nivel = pr[PROGRESSAO.nivel]!;
  let xp = pr[PROGRESSAO.xp]!;
  let subiu = 0;
  while (nivel < t.nivelMaximo && xp >= t.custo[nivel]!) {
    xp -= t.custo[nivel]!;
    nivel++;
    subiu++;
    const k = t.atributoDoNivel;
    const novoAtributo = e.atributos[k]! + t.pontoPorNivel;
    e.atributos[k] = novoAtributo > t.tetoDoAtributo ? t.tetoDoAtributo : novoAtributo;
    const antigo = e.jogador2[JOGADOR2.hpMax]!;
    const novo = hpMaximo(t.hpBase + t.hpPorNivel * (nivel - 1), t.hpPct);
    e.jogador2[JOGADOR2.hpMax] = novo;
    const hp = e.jogador[JOGADOR.hp]!;
    if (hp > 0) {
      const somado = Math.fround(hp + (novo - antigo));
      e.jogador[JOGADOR.hp] = somado > novo ? novo : somado;
    }
    FLOATS_DO_EVENTO[0] = nivel;
    FLOATS_DO_EVENTO[1] = xp;
    FLOATS_DO_EVENTO[2] = 0;
    FLOATS_DO_EVENTO[3] = 0;
    gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.nivel, 0, 0, -1, 0, 0, 0, 0);
  }
  if (nivel >= t.nivelMaximo) xp = 0;
  pr[PROGRESSAO.nivel] = nivel;
  pr[PROGRESSAO.xp] = xp;
  pr[PROGRESSAO.niveisPendentes] = pr[PROGRESSAO.niveisPendentes]! + subiu;
  if (subiu > 0) recalcularDano(e, dados);
  return subiu;
}

