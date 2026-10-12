// Um passo da simulação (1/60 s). Só lê o estado, os dados fixos da Vigília e
// os ComandosDoPasso; nunca lê relógio, DOM nem Math.random (ADR-0002 §2).
// Ordem (design/decisoes-F-003.md §2; design/decisoes-F-004.md §4; F-006 ET4): congelamento
// (fase 0: o passo congelado só decrementa o contador); relógio;
// jogador (bloqueado pelos inimigos e pelos obstáculos) e prompt; horda
// (comportamento com Sal e afastamento, grade, separação, jogador e
// obstáculos); armas (grade das posições finais, projéteis, vagas e mortes);
// pickups (decisoes-F-005 §5: Cinzas, baús, níveis e a oferta); ataques dos
// inimigos (fase 6, com o bit `ataques`); contato, só
// com os sobreviventes; rotação do cenário; diretor. Com modal aberto (nível
// pendente ou baú por fechar), nenhum passo roda: `avancar` para e só volta
// depois de confirmarModal (decisoes-F-005 M1 e M2).
import { rodarArmas } from '../armas/armas';
import { rodarDiretor } from '../diretor/diretor';
import { rodarAtaques } from '../mundo/ataques';
import { aplicarRotacao } from '../mundo/cenario';
import { aplicarContato } from '../mundo/contato';
import type { DadosDaVigilia } from '../mundo/dados';
import { rodarFrasco } from '../mundo/frasco';
import { rodarEtapa } from '../mundo/etapas';
import { armasAtivas, passoFogueira } from '../mundo/fogueira';
import { moverHorda } from '../mundo/horda';
import { atualizarPromptDeMover, moverJogador } from '../mundo/jogador';
import { encerrarVigilia, rodarApagando, rodarMancha, verificarMorte } from '../mundo/vigilia';
import { confirmarModal, modalAberto } from '../progressao/modal';
import { rodarPickups } from '../progressao/pickups';
import { ACAO, criarComandos, type ComandosDoPasso, type FonteDeComandos } from './comandos';
import { CAB, CAPACIDADE_DE_INIMIGOS, CAUSA_DO_FIM, CENARIO, FASE, JOGADOR, JOGADOR3_U8, JOGADOR4_U8, PROGRESSAO, type Estado } from './estado';

/** `quebradaPassos` cai 1 em todo inimigo com valor > 0: gravado 121 na fase 6, vale > 0 de h+1 a h+120 (PQ2). */
function decrementarPostura(e: Estado): void {
  const q = e.inimigos.quebradaPassos;
  const pos = e.pool.posicao;
  for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) if (q[s]! > 0 && pos[s]! >= 0) q[s] = q[s]! - 1;
}

/**
 * Um passo da fase VIVA (o corpo de sempre). Fica sem nenhuma linha da F-007: a fase, o Abandonar, a morte e a
 * mancha moram em `passo` e em `avancar`, para o orçamento de inlining do V8 ficar onde estava (E4: um byte
 * a mais aqui, e as chamadas de toro.ts deixavam de ser inlinadas: +9 B/passo).
 */
export function passoVivo(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  // Fase 0 (ET4, ET7): o passo congelado só decrementa o contador; `passo`, `relogio`
  // e as posições anteriores não andam. Nada liga o contador ainda (esquiva perfeita e aparo, adiante).
  const congelamento = e.jogador3U8[JOGADOR3_U8.congelamento]!;
  if (congelamento > 0) {
    e.jogador3U8[JOGADOR3_U8.congelamento] = congelamento - 1;
    return;
  }
  e.cab[CAB.passo] = e.cab[CAB.passo]! + 1;
  e.cab[CAB.relogio] = e.cab[CAB.relogio]! + 1;
  const moveu = moverJogador(e, dados, cmd);
  atualizarPromptDeMover(e, moveu);
  // Cura do Frasco (FR2, LY2): depois dos comandos e antes de todo dano do passo.
  rodarFrasco(e, dados);
  moverHorda(e, dados);
  rodarArmas(e, dados);
  // Logo depois das armas e antes do contato (ET4, EP3): o Poder da esquiva perfeita vale 120 fases de armas.
  const poder = e.jogador3U8[JOGADOR3_U8.poderPassos]!;
  if (poder > 0) e.jogador3U8[JOGADOR3_U8.poderPassos] = poder - 1;
  rodarPickups(e, dados);
  // Fase 6 (ET4): ataques dos inimigos e projéteis tipo 2, só com o bit `ataques` (VT1).
  if (e.cab[CAB.cenario]! & CENARIO.ataques) rodarAtaques(e, dados);
  aplicarContato(e, dados);
  // Fase 8 (ET4): o único decremento da Postura Quebrada, antes da rotação do cenário; passo congelado não chega aqui.
  decrementarPostura(e);
  aplicarRotacao(e);
  rodarDiretor(e, dados, moveu);
}

const INDICE_DA_FASE = JOGADOR4_U8.fase;
const FASE_VIVA = FASE.viva;
const BIT_ABANDONAR = ACAO.abandonar;

/** Fase APAGANDO, FIM ou o Abandonar da fase VIVA (a fase não é VIVA, ou o bit 16 veio). */
function passoFora(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  const fase = e.jogador4U8[INDICE_DA_FASE]!;
  if (fase === FASE.apagando) rodarApagando(e, dados);
  else if (fase === FASE_VIVA && (cmd.acoes[0]! & BIT_ABANDONAR) !== 0) encerrarVigilia(e, dados, CAUSA_DO_FIM.abandonar);
}

/** Depois do passo vivo: encostar na mancha (MC7) e a morte (AG1), que descarta a fila de modais do passo. */
function depoisDoPasso(e: Estado, dados: DadosDaVigilia): void {
  if (e.jogador4U8[JOGADOR4_U8.manchaAtiva] !== 0) rodarMancha(e, dados);
  if (e.jogador[JOGADOR.hp]! <= 0) verificarMorte(e);
}

/**
 * O passo completo (ADR-0002 §3; F-007 AG4, PE5): o bit abandonar vem antes de qualquer outra coisa e só vale com a
 * fase VIVA; em FIM não faz nada (hash congelado); em APAGANDO só os inimigos andam (AG3); na fase VIVA roda
 * `passoVivo` e, depois dele, a mancha e a morte. Só o passo exato de Abandonar da pausa o chama direto; `avancar`
 * traz as mesmas linhas em linha.
 */
export function passo(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
  if (e.jogador4U8[INDICE_DA_FASE]! !== FASE_VIVA || (cmd.acoes[0]! & BIT_ABANDONAR) !== 0) {
    passoFora(e, dados, cmd);
    return;
  }
  // Etapa FOGUEIRA (F-008 FG3): o tempo da Vigília para; o passo é o da Fogueira.
  if (!armasAtivas(e)) {
    passoFogueira(e, dados, cmd);
    return;
  }
  const congelado = e.jogador3U8[JOGADOR3_U8.congelamento]! > 0;
  passoVivo(e, dados, cmd);
  depoisDoPasso(e, dados);
  // Etapas (F-008): horas, marcos e a convocação do Coroado; o passo congelado não conta (nada andou).
  if (!congelado) rodarEtapa(e, dados);
}

const comandos = criarComandos();

/**
 * Roda até `n` passos, cada um com os comandos que a fonte dá para o seu passo
 * absoluto (driver, testes e `__GAME_DEBUG__.avancar`); com o jogador congelado, o passo
 * roda sem a fonte e `CAB.passo` não anda. Com modal aberto,
 * confirma pela escolha da fonte, na ordem dos modais; se a fonte não tem
 * escolha (ao vivo: espera o jogador), para. Devolve os passos rodados.
 */
export function avancar(e: Estado, dados: DadosDaVigilia, fonte: FonteDeComandos, n: number): number {
  let i = 0;
  while (i < n) {
    if (modalAberto(e)) {
      const k = fonte.escolhaDoModal ? fonte.escolhaDoModal(e.progresso[PROGRESSAO.modaisConfirmados]!) : -1;
      if (!(k >= 0)) return i;
      confirmarModal(e, dados, k);
      continue;
    }
    // Passo congelado (ET7): roda sem consultar a fonte (não consome a borda) e conta 1 dos n pedidos.
    if (e.jogador3U8[JOGADOR3_U8.congelamento]! === 0) fonte.comandosDoPasso(e.cab[CAB.passo]!, comandos);
    if (e.jogador4U8[INDICE_DA_FASE]! !== FASE_VIVA || (comandos.acoes[0]! & BIT_ABANDONAR) !== 0) {
      passoFora(e, dados, comandos);
    } else if (!armasAtivas(e)) {
      passoFogueira(e, dados, comandos);
    } else {
      const congelado = e.jogador3U8[JOGADOR3_U8.congelamento]! > 0;
      passoVivo(e, dados, comandos);
      if (e.jogador4U8[JOGADOR4_U8.manchaAtiva] !== 0 || e.jogador[JOGADOR.hp]! <= 0) depoisDoPasso(e, dados);
      if (!congelado) rodarEtapa(e, dados);
    }
    i++;
  }
  return i;
}
