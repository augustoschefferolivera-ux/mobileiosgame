// Etapas da Vigília (design/decisoes-F-008.md AR1 a AR8, FG1, FG7, CR7): a máquina de horas, marcos e Fogueira que roda
// no fim do passo da fase VIVA, depois da mancha e da morte. Nesta parte: a convocação dos Coroados, o início do marco
// (arena e Coroados), o fim do marco (baú vem da morte; aqui a arena some e a Fogueira acende), o marco vencido pelo
// relógio, e o 20:00 e o 23:00 (o gancho da F-009). Entrar na Fogueira, Descansar, Forjar e Partir moram em fogueira.ts.
// Sem RNG: o anel da convocação, o ciclo dos ataques e as posições vêm de tabelas. Regra do laço quente: nenhum double
// atravessa chamada, nem nas funções frias (rascunhos: NASCIMENTO, FLOATS_DO_EVENTO).
import {
  CAB,
  CAPACIDADE_DE_INIMIGOS,
  CENARIO,
  CHEFE_U16,
  ETAPA,
  FOGUEIRA_F32,
  FOGUEIRA_U32,
  FOGUEIRA_U8,
  CAUSA_DO_FIM,
  FASE,
  JOGADOR,
  JOGADOR4_U8,
  LINHA_LIVRE,
  MUNDO,
  SEM_CHEFE,
  type Estado,
} from '../nucleo/estado';
import { CAUSA, EVENTO, FLOATS_DO_EVENTO, gravarEvento } from '../nucleo/eventos';
import { quantosAtivos } from '../nucleo/pool';
import { desfazerArena, formarArena } from './arena';
import type { DadosDaVigilia } from './dados';
import { DIRECAO_X, DIRECAO_Y } from './direcoes';
import { GRANDES, MAX_GRANDES } from './grade';
import { NASCIMENTO, matarInimigo, nascerInimigoDoRascunho } from './inimigos';
import { TIPO } from './tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, MEIA_ALTURA_DO_MAPA, MEIA_LARGURA_DO_MAPA } from './toro';
import { verificarFaseDoChefe } from './ataquesDoChefe';
import { chefeLigado, surgirChefe } from './chefe';
import { apagarFogueira, verificarRaio } from './fogueira';
import { encerrarVigilia } from './vigilia';

const N = CAPACIDADE_DE_INIMIGOS;
/** Distância do centro da arena em que os Coroados nascem (AR2), em px. */
const DISTANCIA_DE_NASCIMENTO = 128;
/** Os convocados que caem fora da arena são levados para 224 − 16,5 do centro (CR7). */
const MARGEM_DO_CONVOCADO = 16.5;
/** Direções literais da Fogueira (FG1): os índices 0, 32 … 224 da tabela, e a ordem de teste k, k+1, k−1, k+2 … */
const PASSO_DA_DIRECAO = 32;
const DIRECOES_DA_FOGUEIRA = 8;

/** Ponto em construção (x, y): `levarAoToro` o grava em Float32, em [0, L), sem passar double pela chamada. */
const PONTO = new Float64Array(2);
function levarAoToro(): void {
  let x = Math.fround(PONTO[0]!);
  if (x < 0) x = Math.fround(x + LARGURA_DO_MAPA);
  if (x >= LARGURA_DO_MAPA) x = Math.fround(x - LARGURA_DO_MAPA);
  let y = Math.fround(PONTO[1]!);
  if (y < 0) y = Math.fround(y + ALTURA_DO_MAPA);
  if (y >= ALTURA_DO_MAPA) y = Math.fround(y - ALTURA_DO_MAPA);
  PONTO[0] = x;
  PONTO[1] = y;
}

/**
 * Fim do passo da fase VIVA (AR1, ordem do §3): 20:00 e 23:00; a convocação dos Coroados vivos; o fim do marco (os
 * Coroados todos mortos, a morte no passo do vencimento vale); o marco vencido pelo relógio; o início do marco. Com linha
 * fixa de cenário a máquina fica presa em HORA. Na etapa FOGUEIRA o passo é `passoFogueira`.
 */
export function rodarEtapa(e: Estado, dados: DadosDaVigilia): void {
  // Imunidade ao pulso do Círculo (CR8): o afastamento que a aura gravou neste passo nos corpos grandes imunes é desfeito
  // antes de a horda andar. Fora de rodarAura, que precisa caber inlinada em rodarArmas (ADR-0008).
  if (GRANDES[MAX_GRANDES]! > 0) zerarEmpurraoDosImunes(e, dados);
  // Início da transição de fase do Lanterneiro (F-009 FS1): no fim do passo, depois dos acertos e da máquina do chefe.
  if (e.chefeU16[CHEFE_U16.slot] !== SEM_CHEFE) verificarFaseDoChefe(e, dados);
  if (e.cab[CAB.linhaFixa] !== LINHA_LIVRE || e.jogador4U8[JOGADOR4_U8.fase] !== FASE.viva) return;
  const u8 = e.fogueiraU8;
  const etapa = u8[FOGUEIRA_U8.etapa]!;
  if (etapa === ETAPA.fogueira || etapa === ETAPA.aFome) return;
  const relogio = e.cab[CAB.relogio]!;
  const marcos = dados.marcos;
  if (etapa === ETAPA.chefe) {
    // 23:00 (AR8): A Fome. O dano de fome e o Lanterneiro são da F-009; aqui o FIM é imediato, como o gancho pede.
    if (relogio >= marcos.aFomeEm && (e.cab[CAB.cenario]! & CENARIO.semFome) === 0) {
      u8[FOGUEIRA_U8.etapa] = ETAPA.aFome;
      encerrarVigilia(e, dados, CAUSA_DO_FIM.aFome);
    }
    return;
  }
  if (relogio >= marcos.chefeEm) {
    // 20:00 (AR8): os Coroados viram cinza, a Fogueira acesa se apaga, a arena do marco some e a etapa é CHEFE; o Lanterneiro surge (F-009).
    const k = u8[FOGUEIRA_U8.marcosIniciados]! - 1;
    const cinzas = converterEmCinza(e, dados);
    if (cinzas > 0) emitirMarcoVencido(e, k, cinzas);
    desfazerArena(e);
    if (u8[FOGUEIRA_U8.fogueiraAcesa] === 1) apagarFogueira(e);
    u8[FOGUEIRA_U8.etapa] = ETAPA.chefe;
    // O Lanterneiro surge na arena de 224 px (F-009 AB1), com os ataques ligados.
    if (chefeLigado(e)) surgirChefe(e, dados);
    return;
  }
  if (u8[FOGUEIRA_U8.coroadosVivos]! > 0) rodarConvocacoes(e, dados);
  const iniciados = u8[FOGUEIRA_U8.marcosIniciados]!;
  const devido = iniciados < marcos.n && relogio >= marcos.limiar[iniciados]!;
  if (etapa === ETAPA.marco) {
    // A morte do último Coroado no passo em que o relógio vence o marco vale a morte (o baú saiu, a Fogueira acende).
    if (u8[FOGUEIRA_U8.coroadosVivos] === 0) concluirMarco(e, dados);
    else if (devido) {
      // Marco vencido (AR7): cinza, sem baú, Cinza, Alma nem `mortes`; a Fogueira desse marco não acende; o seguinte começa já.
      const cinzas = converterEmCinza(e, dados);
      emitirMarcoVencido(e, iniciados - 1, cinzas);
      desfazerArena(e);
      iniciarMarco(e, dados);
    }
  } else if (devido) iniciarMarco(e, dados);
  // Entrar no raio da Fogueira acesa (FG2), depois do início do marco (que a apaga).
  if (u8[FOGUEIRA_U8.etapa] === ETAPA.hora) verificarRaio(e, dados);
}

function zerarEmpurraoDosImunes(e: Estado, dados: DadosDaVigilia): void {
  const n = GRANDES[MAX_GRANDES]!;
  const ini = e.inimigos;
  for (let k = 0; k < n; k++) {
    const s = GRANDES[k]!;
    if (dados.combate.posturaQuebrada[ini.tipo[s]!] === 0) ini.kbPassos[s] = 0;
  }
}

/** Os Coroados vivos viram cinza (`CAUSA.cinza`, sem baú, Cinza, Alma nem `mortes`); devolve quantos. */
function converterEmCinza(e: Estado, dados: DadosDaVigilia): number {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  let n = 0;
  for (let s = 0; s < N; s++) {
    if (pos[s]! < 0 || ini.tipo[s] !== TIPO.oco_grande_coroado) continue;
    matarInimigo(e, dados, s, CAUSA.cinza);
    n++;
  }
  return n;
}

function emitirMarcoVencido(e: Estado, k: number, cinzas: number): void {
  const f = e.fogueiraF32;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.arenaX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.arenaY]!;
  FLOATS_DO_EVENTO[2] = k;
  FLOATS_DO_EVENTO[3] = cinzas;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.marcoVencido, 0, 0, -1, 0, 0, 0, 0);
}

/**
 * Início do marco `k` = `marcosIniciados` (AR1, AR2): forma a arena no jogador (obstáculos, massa e médios, Sal), apaga a
 * Fogueira acesa e faz nascer os Coroados da linha de marco a 128 px do centro, nas direções 0 e 128 da tabela, com o
 * `hp_base` da linha (CR6). `marcosIniciados` sobe, a etapa vira MARCO e sai o evento 29.
 */
function iniciarMarco(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.fogueiraU8;
  const k = u8[FOGUEIRA_U8.marcosIniciados]!;
  const marcos = dados.marcos;
  formarArena(e, dados);
  if (u8[FOGUEIRA_U8.fogueiraAcesa] === 1) apagarFogueira(e);
  const f = e.fogueiraF32;
  const cx = f[FOGUEIRA_F32.arenaX]!;
  const cy = f[FOGUEIRA_F32.arenaY]!;
  const quantos = marcos.coroados[k]!;
  let nasceram = 0;
  for (let i = 0; i < quantos; i++) {
    const direcao = i * 128;
    PONTO[0] = cx + DISTANCIA_DE_NASCIMENTO * DIRECAO_X[direcao]!;
    PONTO[1] = cy + DISTANCIA_DE_NASCIMENTO * DIRECAO_Y[direcao]!;
    levarAoToro();
    NASCIMENTO[0] = PONTO[0]!;
    NASCIMENTO[1] = PONTO[1]!;
    NASCIMENTO[2] = marcos.hpBase[k]!;
    if (nascerInimigoDoRascunho(e, dados, TIPO.oco_grande_coroado, false) >= 0) nasceram++;
    else e.mundo[MUNDO.recusados] = e.mundo[MUNDO.recusados]! + 1;
  }
  u8[FOGUEIRA_U8.marcosIniciados] = k + 1;
  u8[FOGUEIRA_U8.etapa] = ETAPA.marco;
  FLOATS_DO_EVENTO[0] = cx;
  FLOATS_DO_EVENTO[1] = cy;
  FLOATS_DO_EVENTO[2] = k;
  FLOATS_DO_EVENTO[3] = nasceram;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.marcoIniciado, 0, 0, -1, 0, 0, 0, 0);
}

/**
 * Fim do marco (AR6, FG1, FG7): o último Coroado morreu. A etapa volta a HORA, a arena some (os obstáculos seguem
 * inativos), `I` volta a 1,0 e a Fogueira acende a 96 px do jogador. Os convocados vivos seguem como inimigos comuns.
 */
function concluirMarco(e: Estado, dados: DadosDaVigilia): void {
  const u8 = e.fogueiraU8;
  desfazerArena(e);
  u8[FOGUEIRA_U8.etapa] = ETAPA.hora;
  const j = e.jogador;
  FLOATS_DO_EVENTO[0] = j[JOGADOR.x]!;
  FLOATS_DO_EVENTO[1] = j[JOGADOR.y]!;
  FLOATS_DO_EVENTO[2] = u8[FOGUEIRA_U8.marcosIniciados]! - 1;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.marcoConcluido, 0, 0, -1, 0, 0, 0, 0);
  acenderFogueira(e, dados);
}

/**
 * Acende a Fogueira (FG1) a `fogueira.distancia_px` (96) do jogador, na 1ª das 8 direções literais (índices 0, 32 … 224 da
 * tabela) a partir da mira, em ordem k, k+1, k−1, k+2 …, cujo disco de `fogueira.raio_px` (64) não toque obstáculo ativo;
 * nenhuma livre: a da mira. A hora é o marco que a acendeu (1 a 3); `I` volta a 10 (FG7) e as ações da Fogueira zeram.
 */
export function acenderFogueira(e: Estado, dados: DadosDaVigilia): void {
  const j = e.jogador;
  const jx = j[JOGADOR.x]!;
  const jy = j[JOGADOR.y]!;
  const mx = j[JOGADOR.dirX]!;
  const my = j[JOGADOR.dirY]!;
  // A direção literal mais próxima da mira (maior produto escalar; empate: a de menor índice).
  let melhor = 0;
  let melhorProduto = -2;
  for (let m = 0; m < DIRECOES_DA_FOGUEIRA; m++) {
    const p = DIRECAO_X[m * PASSO_DA_DIRECAO]! * mx + DIRECAO_Y[m * PASSO_DA_DIRECAO]! * my;
    if (p > melhorProduto) {
      melhorProduto = p;
      melhor = m;
    }
  }
  const c = dados.combate;
  const o = dados.obstaculos;
  const raioDoDisco = c.fogueiraRaio;
  let escolhida = melhor;
  for (let t = 0; t < DIRECOES_DA_FOGUEIRA; t++) {
    const desvio = t === 0 ? 0 : t % 2 === 1 ? (t + 1) / 2 : -t / 2;
    const m = (melhor + desvio + DIRECOES_DA_FOGUEIRA) % DIRECOES_DA_FOGUEIRA;
    const d = m * PASSO_DA_DIRECAO;
    PONTO[0] = jx + c.fogueiraDistancia * DIRECAO_X[d]!;
    PONTO[1] = jy + c.fogueiraDistancia * DIRECAO_Y[d]!;
    levarAoToro();
    const x = PONTO[0]!;
    const y = PONTO[1]!;
    let livre = true;
    for (let i = 0; i < o.n && livre; i++) {
      if (e.obstaculoAtivo[i] === 0) continue;
      let dx = x - o.x[i]!;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = y - o.y[i]!;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const lim = o.r[i]! + raioDoDisco;
      if (dx * dx + dy * dy <= lim * lim) livre = false;
    }
    if (livre) {
      escolhida = m;
      break;
    }
  }
  const d = escolhida * PASSO_DA_DIRECAO;
  const f = e.fogueiraF32;
  PONTO[0] = jx + c.fogueiraDistancia * DIRECAO_X[d]!;
  PONTO[1] = jy + c.fogueiraDistancia * DIRECAO_Y[d]!;
  levarAoToro();
  f[FOGUEIRA_F32.fogueiraX] = PONTO[0]!;
  f[FOGUEIRA_F32.fogueiraY] = PONTO[1]!;
  const u8 = e.fogueiraU8;
  u8[FOGUEIRA_U8.fogueiraAcesa] = 1;
  u8[FOGUEIRA_U8.fogueiraHora] = u8[FOGUEIRA_U8.marcosIniciados]!;
  u8[FOGUEIRA_U8.fogueiraAcoes] = 0;
  e.mundo[MUNDO.intensidade10] = 10;
  FLOATS_DO_EVENTO[0] = f[FOGUEIRA_F32.fogueiraX]!;
  FLOATS_DO_EVENTO[1] = f[FOGUEIRA_F32.fogueiraY]!;
  FLOATS_DO_EVENTO[2] = u8[FOGUEIRA_U8.fogueiraHora]!;
  FLOATS_DO_EVENTO[3] = 0;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.fogueiraAcesa, 0, 0, -1, 0, 0, 0, 0);
}

/**
 * Convocação dos Coroados vivos (CR7), em slot crescente. `convocaEspera` cai 1 por passo; em 0, `convocacoes` sobe,
 * entram até 10 Ocos das Lanternas num anel de 80 px em volta do Coroado (direção `(desl + ⌊i·256/10⌋) & 255` na tabela, com
 * `desl = (convocacoes × 37) & 255` depois de somar), os fora da arena levados para dentro (≤ 224 − 16,5 do centro), e a
 * regra do ADR-0002 §8.7 com `falta` = 10: entram `min(10, TETO − slots)`, nunca convertem, o resto é descartado. Ponto
 * sobre obstáculo ativo é descartado e conta em `semPontoLivre`. Não nascem atordoados. Sem RNG.
 */
function rodarConvocacoes(e: Estado, dados: DadosDaVigilia): void {
  const ini = e.inimigos;
  const pos = e.pool.posicao;
  const c = dados.combate;
  for (let s = 0; s < N; s++) {
    if (pos[s]! < 0) continue;
    const tipo = ini.tipo[s]!;
    if (c.convocaPassos[tipo] === 0) continue;
    const espera = ini.convocaEspera[s]! - 1;
    if (espera > 0) {
      ini.convocaEspera[s] = espera;
      continue;
    }
    ini.convocaEspera[s] = c.convocaPassos[tipo]!;
    convocar(e, dados, s, tipo);
  }
}

export function convocar(e: Estado, dados: DadosDaVigilia, s: number, tipo: number): void {
  const c = dados.combate;
  const ini = e.inimigos;
  const cx = ini.x[s]!;
  const cy = ini.y[s]!;
  const quantidade = c.convocaQuantidade[tipo]!;
  const anel = c.convocaAnel[tipo]!;
  const convocados = c.convocaTipo[tipo]!;
  const u32 = e.fogueiraU32;
  u32[FOGUEIRA_U32.convocacoes] = u32[FOGUEIRA_U32.convocacoes]! + 1;
  const desl = (u32[FOGUEIRA_U32.convocacoes]! * 37) & 255;
  const livres = e.cab[CAB.teto]! - quantosAtivos(e.pool);
  const arena = e.fogueiraU8[FOGUEIRA_U8.arenaAtiva] === 1;
  const acx = e.fogueiraF32[FOGUEIRA_F32.arenaX]!;
  const acy = e.fogueiraF32[FOGUEIRA_F32.arenaY]!;
  const limiteDaArena = c.arenaRaio - MARGEM_DO_CONVOCADO;
  const o = dados.obstaculos;
  const raioDoConvocado = dados.tipos.raio[convocados]!;
  let entraram = 0;
  let descartados = 0;
  for (let i = 0; i < quantidade; i++) {
    if (entraram >= livres) {
      descartados++;
      continue;
    }
    const direcao = (desl + Math.floor((i * 256) / quantidade)) & 255;
    let x = cx + anel * DIRECAO_X[direcao]!;
    let y = cy + anel * DIRECAO_Y[direcao]!;
    if (arena) {
      let dx = x - acx;
      if (dx > MEIA_LARGURA_DO_MAPA) dx -= LARGURA_DO_MAPA;
      if (dx < -MEIA_LARGURA_DO_MAPA) dx += LARGURA_DO_MAPA;
      let dy = y - acy;
      if (dy > MEIA_ALTURA_DO_MAPA) dy -= ALTURA_DO_MAPA;
      if (dy < -MEIA_ALTURA_DO_MAPA) dy += ALTURA_DO_MAPA;
      const d2 = dx * dx + dy * dy;
      if (d2 > limiteDaArena * limiteDaArena) {
        const k = Math.fround(limiteDaArena / Math.sqrt(d2));
        x = acx + Math.fround(dx * k);
        y = acy + Math.fround(dy * k);
      }
    }
    PONTO[0] = x;
    PONTO[1] = y;
    levarAoToro();
    x = PONTO[0]!;
    y = PONTO[1]!;
    let livre = true;
    // Dentro da arena nenhum obstáculo ativo chega perto: os ativos ficam a mais de 224 + r do centro (AR3) e o ponto a ≤ 207,5,
    // com o corpo de 16, deixa 0,5 px de folga. A conta só vale fora dela (um Coroado posto à mão, nos testes).
    for (let q = 0; q < o.n && livre && !arena; q++) {
      if (e.obstaculoAtivo[q] === 0) continue;
      let ox = x - o.x[q]!;
      if (ox > MEIA_LARGURA_DO_MAPA) ox -= LARGURA_DO_MAPA;
      if (ox < -MEIA_LARGURA_DO_MAPA) ox += LARGURA_DO_MAPA;
      let oy = y - o.y[q]!;
      if (oy > MEIA_ALTURA_DO_MAPA) oy -= ALTURA_DO_MAPA;
      if (oy < -MEIA_ALTURA_DO_MAPA) oy += ALTURA_DO_MAPA;
      const lim = o.r[q]! + raioDoConvocado;
      if (ox * ox + oy * oy < lim * lim) livre = false;
    }
    if (!livre) {
      e.mundo[MUNDO.semPontoLivre] = e.mundo[MUNDO.semPontoLivre]! + 1;
      descartados++;
      continue;
    }
    NASCIMENTO[0] = x;
    NASCIMENTO[1] = y;
    NASCIMENTO[2] = 0;
    if (nascerInimigoDoRascunho(e, dados, convocados, false) < 0) {
      e.mundo[MUNDO.recusados] = e.mundo[MUNDO.recusados]! + 1;
      descartados++;
    } else entraram++;
  }
  FLOATS_DO_EVENTO[0] = cx;
  FLOATS_DO_EVENTO[1] = cy;
  FLOATS_DO_EVENTO[2] = entraram;
  FLOATS_DO_EVENTO[3] = descartados;
  gravarEvento(e.eventos, e.cab[CAB.passo]!, EVENTO.convocacao, 0, 0, s, e.pool.geracao[s]!, tipo, 0, 0);
}
