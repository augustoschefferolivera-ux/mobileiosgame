// Um passo da simulação (1/60 s). Só lê o estado, os dados fixos da Vigília e
// os ComandosDoPasso; nunca lê relógio, DOM nem Math.random (ADR-0002 §2).
// Ordem (design/decisoes-F-003.md §2; design/decisoes-F-004.md §4; F-006 ET4): congelamento
// (fase 0: o passo congelado só decrementa o contador); relógio;
// jogador (bloqueado pelos inimigos e pelos obstáculos) e prompt; horda
// (comportamento com Sal e afastamento, grade, separação, jogador e
// obstáculos); armas (grade das posições finais, projéteis, vagas e mortes);
// pickups (decisoes-F-005 §5: Cinzas, baús, níveis e a oferta); contato, só
// com os sobreviventes; rotação do cenário; diretor. Com modal aberto (nível
// pendente ou baú por fechar), nenhum passo roda: `avancar` para e só volta
// depois de confirmarModal (decisoes-F-005 M1 e M2).
import { rodarArmas } from '../armas/armas';
import { rodarDiretor } from '../diretor/diretor';
import { aplicarRotacao } from '../mundo/cenario';
import { aplicarContato } from '../mundo/contato';
import type { DadosDaVigilia } from '../mundo/dados';
import { moverHorda } from '../mundo/horda';
import { atualizarPromptDeMover, moverJogador } from '../mundo/jogador';
import { confirmarModal, modalAberto } from '../progressao/modal';
import { rodarPickups } from '../progressao/pickups';
import { criarComandos, type ComandosDoPasso, type FonteDeComandos } from './comandos';
import { CAB, JOGADOR3_U8, PROGRESSAO, type Estado } from './estado';

export function passo(e: Estado, dados: DadosDaVigilia, cmd: ComandosDoPasso): void {
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
  moverHorda(e, dados);
  rodarArmas(e, dados);
  // Logo depois das armas e antes do contato (ET4, EP3): o Poder da esquiva perfeita vale 120 fases de armas.
  const poder = e.jogador3U8[JOGADOR3_U8.poderPassos]!;
  if (poder > 0) e.jogador3U8[JOGADOR3_U8.poderPassos] = poder - 1;
  rodarPickups(e, dados);
  aplicarContato(e, dados);
  aplicarRotacao(e);
  rodarDiretor(e, dados, moveu);
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
    passo(e, dados, comandos);
    i++;
  }
  return i;
}
