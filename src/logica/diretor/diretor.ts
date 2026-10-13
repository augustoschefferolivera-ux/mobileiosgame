// Diretor de spawn por timeline (B §3.7; ADR-0002 §8; design/decisoes-F-003.md §1 e §4).
// Roda no fim do passo, com o fluxo de RNG 'diretor':
//  - linha = a linha fixa do cenário ou o minuto inteiro do relógio;
//  - janela de 30 s antes das linhas de marco: nada nasce e `espera` = 0;
//  - garantidos: no 1º passo ativo da linha, uma vez por Vigília (bit por linha);
//  - reposição a cada intervalo efetivo: `falta = alvo − vivosEq`, `livres =
//    TETO − slots`; entram mín(falta, livres), dos quais g são convertidos;
//  - posição no anel de 468 a 624 px, com 60% no semicírculo oposto à intenção.
import { baseDoFluxo, CAB, CENARIO, ETAPA, FOGUEIRA_U8, JOGADOR, LINHA_LIVRE, MUNDO, type Estado } from '../nucleo/estado';
import { quantosAtivos } from '../nucleo/pool';
import { DOIS_A_MENOS_32, SORTEADO, sortear } from '../nucleo/rng';
import type { DadosDaVigilia } from '../mundo/dados';
import { DIRECAO_X, DIRECAO_Y, DIRECOES } from '../mundo/direcoes';
import { MASSA_POR_CONVERTIDO, NASCIMENTO, minutoDaEscala, nascerInimigoDoRascunho } from '../mundo/inimigos';
import { TIPO } from '../mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, LARGURA_DA_TELA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from '../mundo/toro';
import { PASSOS_POR_MINUTO } from './timeline';

/** Anel de spawn: 1,2 a 1,6 larguras de tela (Q-06): 468 a 624 px, medidos no centro. */
export const ANEL_INTERNO = 1.2 * LARGURA_DA_TELA;
export const ANEL_EXTERNO = 1.6 * LARGURA_DA_TELA;
/** u32 abaixo disto pede o semicírculo oposto: ⌈0,6 × 2³²⌉ (Q-07; decisoes-F-003 R6). */
export const LIMIAR_DO_LADO_OPOSTO = 2576980378;
/** 2³², exato em double. */
const DOIS_A_32 = 4294967296;

/** Linha corrente: a fixa do cenário, ou ⌊relógio / 3.600⌋ até a última (Q-10); é o minuto da escala no spawn. */
export function linhaCorrente(e: Estado, dados: DadosDaVigilia): number {
  return minutoDaEscala(e, dados);
}

/** Intervalo efetivo em passos: round(passosBase × 10 / I10) (B §3.7; ADR-0002 §3). */
export function intervaloEfetivo(passosBase: number, intensidade10: number): number {
  return Math.round((passosBase * 10) / intensidade10);
}

/** Alvo = ⌈min × I⌉, em inteiros (doc 07 §3.1: "spawna até preencher"). */
export function alvoDaLinha(minimo: number, intensidade10: number): number {
  return Math.floor((minimo * intensidade10 + 9) / 10);
}

/** Convertidos vivos (varredura dos 500 slots; só na reposição e no debug). */
export function convertidosVivos(e: Estado): number {
  let n = 0;
  const pos = e.pool.posicao;
  const conv = e.inimigos.convertido;
  for (let s = 0; s < pos.length; s++) if (pos[s]! >= 0 && conv[s] === 1) n++;
  return n;
}

/** vivosEq = slots + 9 × convertidos (ADR-0002 §8, passo 4): cada convertido vale 10 massas. */
export function vivosEquivalentes(e: Estado): number {
  return quantosAtivos(e.pool) + (MASSA_POR_CONVERTIDO - 1) * convertidosVivos(e);
}

/** Na janela de 30 s antes de uma linha de marco (3.600·M − 1.800 ≤ r < 3.600·M). */
export function naJanelaDoMarco(e: Estado, dados: DadosDaVigilia): boolean {
  if (e.cab[CAB.linhaFixa] !== LINHA_LIVRE) return false;
  const tl = dados.timeline;
  const r = e.cab[CAB.relogio]!;
  const proxima = Math.floor(r / PASSOS_POR_MINUTO) + 1;
  return proxima < tl.linhas && tl.marco[proxima] === 1 && r >= proxima * PASSOS_POR_MINUTO - tl.janelaAntesDoMarco;
}

/** Sorteia o tipo pelos pesos da linha: ⌊u × W / 2³²⌋ sobre os pesos acumulados (sem rejeição). */
export function sortearTipo(rng: Uint32Array, base: number, dados: DadosDaVigilia, linha: number): number {
  const tl = dados.timeline;
  const ini = tl.inicioDoRoster[linha]!;
  const fim = tl.inicioDoRoster[linha + 1]!;
  const total = tl.rosterAcumulado[fim - 1]!;
  sortear(rng, base);
  const alvo = Math.floor((SORTEADO[0]! * total) / DOIS_A_32);
  for (let k = ini; k < fim; k++) if (alvo < tl.rosterAcumulado[k]!) return tl.rosterTipo[k]!;
  return tl.rosterTipo[fim - 1]!;
}

/** Ponto de spawn (x, y no toro) e a direção sorteada antes da busca de ponto livre (para o teste do viés). */
export interface PontoDeSpawn {
  x: number;
  y: number;
  /** Direção sorteada (com a inversão do viés), antes da busca de ponto livre. */
  direcaoSorteada: number;
  /** Raio do anel, em double. */
  raio: number;
  /** false se nenhuma das 256 direções estava livre de obstáculo. */
  livre: boolean;
}

/**
 * Sorteia a posição de um spawn com raio de corpo `raioDoCorpo` em volta de
 * (jx, jy): 3 sorteios, sempre nesta ordem (lado, direção, raio). Com intenção
 * (dx, dy), o lado oposto sai com 60% e a frente com 40%; parado, o lado é
 * ignorado. Sobre obstáculo, testa as direções k, k + 1, k − 1, k + 2… com o
 * mesmo raio, sem novo sorteio (R7).
 */
export function sortearPontoDeSpawn(
  rng: Uint32Array,
  base: number,
  dados: DadosDaVigilia,
  jx: number,
  jy: number,
  temIntencao: boolean,
  dx: number,
  dy: number,
  raioDoCorpo: number,
  out: PontoDeSpawn,
  ativo: Uint8Array | null = null,
): void {
  ENTRADA_DO_SPAWN[0] = jx;
  ENTRADA_DO_SPAWN[1] = jy;
  ENTRADA_DO_SPAWN[2] = dx;
  ENTRADA_DO_SPAWN[3] = dy;
  ENTRADA_DO_SPAWN[4] = raioDoCorpo;
  sortearPontoDoRascunho(rng, base, dados, temIntencao, out, ativo);
}

/** Entradas de sortearPontoDoRascunho: jx, jy, dx, dy e o raio do corpo. */
const ENTRADA_DO_SPAWN = new Float64Array(5);

/**
 * sortearPontoDeSpawn com as entradas em ENTRADA_DO_SPAWN: o caminho de nascer
 * roda a cada morte, e no V8 cada double passado ou devolvido por uma chamada
 * não inlinada alocaria um HeapNumber (design/decisoes-F-004.md §8, E6). Os
 * sorteios (sortear e SORTEADO), a normalização no toro e o teste de obstáculo
 * vão em linha, com as mesmas contas de proximoUnitario, normalizarNoToro e
 * deltaNoToro.
 */
function sortearPontoDoRascunho(rng: Uint32Array, base: number, dados: DadosDaVigilia, temIntencao: boolean, out: PontoDeSpawn, ativo: Uint8Array | null): void {
  const jx = ENTRADA_DO_SPAWN[0]!;
  const jy = ENTRADA_DO_SPAWN[1]!;
  const dx = ENTRADA_DO_SPAWN[2]!;
  const dy = ENTRADA_DO_SPAWN[3]!;
  const raioDoCorpo = ENTRADA_DO_SPAWN[4]!;
  sortear(rng, base);
  const uLado = SORTEADO[0]!;
  sortear(rng, base);
  let k = SORTEADO[0]! >>> 24;
  sortear(rng, base);
  const r = ANEL_INTERNO + (ANEL_EXTERNO - ANEL_INTERNO) * (SORTEADO[0]! * DOIS_A_MENOS_32);
  if (temIntencao) {
    const s = DIRECAO_X[k]! * dx + DIRECAO_Y[k]! * dy;
    const opostoPedido = uLado < LIMIAR_DO_LADO_OPOSTO;
    if ((opostoPedido && s > 0) || (!opostoPedido && s < 0)) k = (k + DIRECOES / 2) & (DIRECOES - 1);
  }
  out.direcaoSorteada = k;
  out.raio = r;
  for (let t = 0; t < DIRECOES; t++) {
    const desvio = t === 0 ? 0 : t % 2 === 1 ? (t + 1) / 2 : -t / 2;
    const kk = (k + desvio + DIRECOES) & (DIRECOES - 1);
    let x = Math.fround(jx + r * DIRECAO_X[kk]!);
    if (x < 0) x = Math.fround(x + LARGURA_DO_MAPA);
    if (x >= LARGURA_DO_MAPA) x = Math.fround(x - LARGURA_DO_MAPA);
    let y = Math.fround(jy + r * DIRECAO_Y[kk]!);
    if (y < 0) y = Math.fround(y + ALTURA_DO_MAPA);
    if (y >= ALTURA_DO_MAPA) y = Math.fround(y - ALTURA_DO_MAPA);
    // Livre de obstáculo: nenhum a menos de r_obstáculo + raio do corpo, pelo delta toroidal.
    const o = dados.obstaculos;
    let livre = true;
    for (let i = 0; i < o.n && livre; i++) {
      if (ativo !== null && ativo[i] === 0) continue;
      let ox = x - o.x[i]!;
      if (ox > MEIA_LARGURA_DO_MAPA) ox -= LARGURA_DO_MAPA;
      if (ox < -MEIA_LARGURA_DO_MAPA) ox += LARGURA_DO_MAPA;
      let oy = y - o.y[i]!;
      if (oy > MEIA_ALTURA_DO_MAPA) oy -= ALTURA_DO_MAPA;
      if (oy < -MEIA_ALTURA_DO_MAPA) oy += ALTURA_DO_MAPA;
      const minimo = o.r[i]! + raioDoCorpo;
      if (ox * ox + oy * oy < minimo * minimo) livre = false;
    }
    if (livre) {
      out.x = x;
      out.y = y;
      out.livre = true;
      return;
    }
  }
  out.livre = false;
}

const ponto: PontoDeSpawn = { x: 0, y: 0, direcaoSorteada: 0, raio: 0, livre: false };

/** Faz nascer um inimigo no anel (3 sorteios); conta em spawns, semPontoLivre, garantidosPerdidos ou recusados. */
function nascerNoAnel(e: Estado, dados: DadosDaVigilia, codigo: number, convertido: boolean, temIntencao: boolean): void {
  const base = baseDoFluxo('diretor');
  const j = e.jogador;
  ENTRADA_DO_SPAWN[0] = j[JOGADOR.x]!;
  ENTRADA_DO_SPAWN[1] = j[JOGADOR.y]!;
  ENTRADA_DO_SPAWN[2] = j[JOGADOR.dirX]!;
  ENTRADA_DO_SPAWN[3] = j[JOGADOR.dirY]!;
  ENTRADA_DO_SPAWN[4] = dados.tipos.raio[codigo]!;
  sortearPontoDoRascunho(e.rng, base, dados, temIntencao, ponto, e.obstaculoAtivo);
  const m = e.mundo;
  if (!ponto.livre) {
    m[MUNDO.semPontoLivre] = m[MUNDO.semPontoLivre]! + 1;
    return;
  }
  // Só um garantido chega aqui com os slots no TETO: a reposição nunca pede mais que os livres.
  if (quantosAtivos(e.pool) >= e.cab[CAB.teto]!) {
    m[MUNDO.garantidosPerdidos] = m[MUNDO.garantidosPerdidos]! + 1;
    return;
  }
  NASCIMENTO[0] = ponto.x;
  NASCIMENTO[1] = ponto.y;
  if (nascerInimigoDoRascunho(e, dados, codigo, convertido) < 0) {
    m[MUNDO.recusados] = m[MUNDO.recusados]! + 1;
    return;
  }
  m[MUNDO.spawns] = m[MUNDO.spawns]! + 1;
}

/**
 * TETO efetivo (F-010 DG3; ADR-0002 §15 item 10, opção A): no nível 3 de degradação, o menor entre o TETO e o mínimo da linha
 * corrente, sem o fator `I`; a massa acima dele vira Ocos Grandes pela regra existente. Nos níveis 0 a 2, o TETO.
 */
export function tetoEfetivo(teto: number, minimoDaLinha: number, degradacao: number): number {
  return degradacao >= 3 && minimoDaLinha < teto ? minimoDaLinha : teto;
}

/** Reposição do ADR-0002 §8, passo 7 (aprovado no §15 item 9), na linha `linha`. */
function repor(e: Estado, dados: DadosDaVigilia, linha: number, temIntencao: boolean, degradacao: number): void {
  const i10 = e.mundo[MUNDO.intensidade10]!;
  const slots = quantosAtivos(e.pool);
  const falta = alvoDaLinha(dados.timeline.minimo[linha]!, i10) - vivosEquivalentes(e);
  const livres = tetoEfetivo(e.cab[CAB.teto]!, dados.timeline.minimo[linha]!, degradacao) - slots;
  if (falta <= 0 || livres <= 0) return;
  const entram = Math.min(falta, livres);
  const g = Math.min(Math.floor(Math.max(0, falta - livres) / MASSA_POR_CONVERTIDO), entram);
  const base = baseDoFluxo('diretor');
  for (let i = 0; i < entram - g; i++) nascerNoAnel(e, dados, sortearTipo(e.rng, base, dados, linha), false, temIntencao);
  for (let i = 0; i < g; i++) nascerNoAnel(e, dados, TIPO.oco_grande, true, temIntencao);
}

/**
 * Um passo do diretor (o último do passo da simulação). `temIntencao` é o
 * "houve intenção" de moverJogador neste passo; a direção é (dirX, dirY).
 */
export function rodarDiretor(e: Estado, dados: DadosDaVigilia, temIntencao: boolean, degradacao = 0): void {
  if (e.cab[CAB.cenario]! & CENARIO.diretorDesligado) return;
  const m = e.mundo;
  // Etapas (F-008 AR5): em MARCO e em FOGUEIRA nada nasce, e com um marco devido (o relógio já passou do limiar e a arena
  // ainda não se formou) também não; `espera` zera, para a reposição recomeçar no 1º passo livre. Linha fixa: sem etapas.
  if (e.cab[CAB.linhaFixa] === LINHA_LIVRE) {
    const etapa = e.fogueiraU8[FOGUEIRA_U8.etapa]!;
    const iniciados = e.fogueiraU8[FOGUEIRA_U8.marcosIniciados]!;
    if (etapa === ETAPA.marco || etapa === ETAPA.fogueira || (etapa === ETAPA.hora && iniciados < dados.marcos.n && e.cab[CAB.relogio]! >= dados.marcos.limiar[iniciados]!)) {
      m[MUNDO.espera] = 0;
      return;
    }
  }
  if (naJanelaDoMarco(e, dados)) {
    m[MUNDO.espera] = 0;
    return;
  }
  const linha = linhaCorrente(e, dados);
  const tl = dados.timeline;
  if (e.cab[CAB.linhaFixa] === LINHA_LIVRE && !((m[MUNDO.garantidosEntregues]! >>> linha) & 1)) {
    m[MUNDO.garantidosEntregues] = (m[MUNDO.garantidosEntregues]! | (1 << linha)) >>> 0;
    for (let k = tl.inicioDosGarantidos[linha]!; k < tl.inicioDosGarantidos[linha + 1]!; k++) {
      nascerNoAnel(e, dados, tl.garantidoTipo[k]!, false, temIntencao);
    }
  }
  if (m[MUNDO.espera] === 0) {
    repor(e, dados, linha, temIntencao, degradacao);
    m[MUNDO.espera] = intervaloEfetivo(tl.passosBase[linha]!, m[MUNDO.intensidade10]!);
  }
  m[MUNDO.espera] = m[MUNDO.espera]! - 1;
}
