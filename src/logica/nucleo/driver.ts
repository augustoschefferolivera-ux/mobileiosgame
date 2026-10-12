// Um frame do driver do passo fixo (ADR-0002 §3): soma o delta bruto ao
// acumulador e roda de 0 a 5 passos. A cena Vigilia só repassa o rawDelta e a
// fonte de comandos: ao vivo, o vetor que o tradutor leu neste frame.
import { avancarAcumulador, type Acumulador } from './acumulador';
import type { FonteDeComandos } from './comandos';
import type { Estado } from './estado';
import type { DadosDaVigilia } from '../mundo/dados';
import { avancar } from './passo';
import { modalAberto } from '../progressao/modal';

/**
 * Devolve quantos passos rodaram neste frame. Se um modal abriu no meio, o
 * resto do quadro é descartado sem contar em passos perdidos, e o acumulador
 * volta a 0 (decisoes-F-005 M1).
 */
export function rodarFrame(e: Estado, dados: DadosDaVigilia, acc: Acumulador, deltaMs: number, fonte: FonteDeComandos): number {
  const n = avancarAcumulador(acc, deltaMs);
  const rodados = avancar(e, dados, fonte, n);
  if (rodados < n || modalAberto(e)) acc.restoMs = 0;
  return rodados;
}

/**
 * Um frame com o portão das duas pausas do driver e do modal da simulação
 * (decisoes-F-005 M1: com modal aberto, o delta também não entra) (design/decisoes-F-004.md
 * P4): a do jogador (botão ou gesto) e a dos ganchos de debug. Com qualquer
 * uma, nenhum passo roda e o delta não entra no acumulador: o tempo pausado
 * não vira rajada nem passos perdidos ao voltar. As pausas ficam fora do
 * estado, do hash e do replay.
 */
export function rodarFrameComPausas(
  e: Estado,
  dados: DadosDaVigilia,
  acc: Acumulador,
  deltaMs: number,
  fonte: FonteDeComandos,
  pausaDoJogador: boolean,
  pausaDoDebug: boolean,
): number {
  if (pausaDoJogador || pausaDoDebug || modalAberto(e)) return 0;
  return rodarFrame(e, dados, acc, deltaMs, fonte);
}
