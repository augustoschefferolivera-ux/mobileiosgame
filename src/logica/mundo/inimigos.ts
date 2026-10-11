// Inimigos no pool (ADR-0002 §4; design/decisoes-F-003.md §2 e §6;
// design/decisoes-F-004.md M3): nascer, remover e matar. Um slot só é escrito
// por nascerInimigo, que grava xAnt = x (sem isso o render interpolaria a
// partir do ocupante anterior), e removerInimigo zera todos os campos, para o
// hash do buffer inteiro conter só os slots vivos. HP e dano são fixados no
// spawn pela escala do minuto (B §3.6; Q-10), em inteiros. matarInimigo é o
// único caminho de morte: grava o evento, conta e remove.
import { CAB, LINHA_LIVRE, MUNDO, type Estado } from '../nucleo/estado';
import { CAUSA, EVENTO, FLAG, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { alocar, liberar } from '../nucleo/pool';
import type { DadosDaVigilia } from './dados';
import { PASSOS_POR_MINUTO } from '../diretor/timeline';
import { TIPO } from './tipos';
import { desmarcarInimigo } from '../armas/ondas';
import { soltarCinza } from '../progressao/pickups';

/** Minuto da escala (Q-10): a linha fixa do cenário ou o minuto inteiro do relógio, até a última linha. */
export function minutoDaEscala(e: Estado, dados: DadosDaVigilia): number {
  const fixa = e.cab[CAB.linhaFixa]!;
  if (fixa !== LINHA_LIVRE) return fixa;
  return Math.min(Math.floor(e.cab[CAB.relogio]! / PASSOS_POR_MINUTO), dados.timeline.linhas - 1);
}

/**
 * HP no spawn: fround(hp_base × (100 + 12·min) × I10 / 1.000) (B §3.6;
 * decisoes-F-003 §1), escrito em `out[i]` (no V8, um double devolvido alocaria
 * um HeapNumber a cada nascimento; decisoes-F-004 E6).
 */
export function gravarHpNoSpawn(out: Float32Array, i: number, hpBase: number, minuto: number, intensidade10: number): void {
  out[i] = (hpBase * (100 + 12 * minuto) * intensidade10) / 1000;
}

/** Dano no spawn: fround(dano_base × (100 + 5·min) / 100) (B §3.6), escrito em `out[i]`. */
export function gravarDanoNoSpawn(out: Float32Array, i: number, danoBase: number, minuto: number): void {
  out[i] = (danoBase * (100 + 5 * minuto)) / 100;
}

const RESULTADO = new Float32Array(1);

/** O HP de gravarHpNoSpawn, devolvido (testes). */
export function hpNoSpawn(hpBase: number, minuto: number, intensidade10: number): number {
  gravarHpNoSpawn(RESULTADO, 0, hpBase, minuto, intensidade10);
  return RESULTADO[0]!;
}

/** O dano de gravarDanoNoSpawn, devolvido (testes). */
export function danoNoSpawn(danoBase: number, minuto: number): number {
  gravarDanoNoSpawn(RESULTADO, 0, danoBase, minuto);
  return RESULTADO[0]!;
}

/** Posição de nascerInimigoDoRascunho: x e y, já no toro. */
export const NASCIMENTO = new Float64Array(2);

/** Inimigos de massa que um convertido substitui (B §3.7: "a cada 10 massa"). */
export const MASSA_POR_CONVERTIDO = 10;

/**
 * Ocupa um slot com um inimigo do tipo `codigo` em (x, y), já no toro, e
 * devolve o slot, ou −1 sem slot livre. O convertido é um Oco Grande com o HP
 * de 10 Ocos das Lanternas, calculado de uma vez (nunca como soma de 10 Float32),
 * e o dano de Oco Grande (ADR-0002 §8.7).
 */
export function nascerInimigo(e: Estado, dados: DadosDaVigilia, codigo: number, x: number, y: number, convertido: boolean): number {
  NASCIMENTO[0] = x;
  NASCIMENTO[1] = y;
  return nascerInimigoDoRascunho(e, dados, codigo, convertido);
}

/** nascerInimigo com a posição em NASCIMENTO (o caminho do diretor, sem double atravessando a chamada). */
export function nascerInimigoDoRascunho(e: Estado, dados: DadosDaVigilia, codigo: number, convertido: boolean): number {
  const x = NASCIMENTO[0]!;
  const y = NASCIMENTO[1]!;
  const t = dados.tipos;
  if (t.existe[codigo] !== 1) throw new Error(`nascerInimigo: o tipo ${codigo} não nasce nesta feature`);
  const slot = alocar(e.pool);
  if (slot < 0) return -1;
  const min = minutoDaEscala(e, dados);
  const i10 = e.mundo[MUNDO.intensidade10]!;
  const ini = e.inimigos;
  ini.x[slot] = ini.xAnt[slot] = x;
  ini.y[slot] = ini.yAnt[slot] = y;
  ini.tipo[slot] = codigo;
  ini.convertido[slot] = convertido ? 1 : 0;
  ini.salPct[slot] = ini.salPassos[slot] = ini.kbPassos[slot] = 0;
  if (convertido) gravarHpNoSpawn(ini.hp, slot, MASSA_POR_CONVERTIDO * t.hpBase[TIPO.oco_das_lanternas]!, min, i10);
  else gravarHpNoSpawn(ini.hp, slot, t.hpBase[codigo]!, min, i10);
  gravarDanoNoSpawn(ini.dano, slot, t.danoBase[codigo]!, min);
  return slot;
}

/**
 * Libera o slot e zera os campos, sem efeito de morte (testes e rotação do
 * cenário). Tira a marca do slot nas ondas vivas (decisoes-F-005 U4): um
 * inimigo novo no mesmo slot nunca herda o "já acertou".
 */
export function removerInimigo(e: Estado, slot: number): void {
  liberar(e.pool, slot);
  desmarcarInimigo(e, slot);
  const ini = e.inimigos;
  ini.x[slot] = ini.y[slot] = ini.xAnt[slot] = ini.yAnt[slot] = ini.hp[slot] = ini.dano[slot] = 0;
  ini.tipo[slot] = 0;
  ini.convertido[slot] = 0;
  ini.salPct[slot] = ini.salPassos[slot] = ini.kbPassos[slot] = 0;
}

/**
 * Morte de um inimigo (M3): grava o evento `morte` com o handle da geração
 * que morreu, a posição, o tipo, a causa e o bit de convertido; soma 1 em
 * `mortes` se a causa é arma; solta a Cinza de XP, só com causa arma
 * (decisoes-F-005 X3); e só então remove. Chamada só pela varredura do fim da
 * fase de armas.
 */
export function matarInimigo(e: Estado, dados: DadosDaVigilia, slot: number, causa: number): void {
  const ini = e.inimigos;
  FLOATS_DO_EVENTO[0] = ini.x[slot]!;
  FLOATS_DO_EVENTO[1] = ini.y[slot]!;
  FLOATS_DO_EVENTO[2] = 0;
  FLOATS_DO_EVENTO[3] = 0;
  const flags = ini.convertido[slot] === 1 ? FLAG.convertido : 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.morte, 0, 0, slot, e.pool.geracao[slot]!, ini.tipo[slot]!, flags, causa);
  if (causa === CAUSA.arma) {
    e.mundo[MUNDO.mortes] = e.mundo[MUNDO.mortes]! + 1;
    soltarCinza(e, dados, slot);
  }
  removerInimigo(e, slot);
}

/** Slot ativo? (a posição dele na lista densa é ≥ 0). */
export function ativo(e: Estado, slot: number): boolean {
  return e.pool.posicao[slot]! >= 0;
}
