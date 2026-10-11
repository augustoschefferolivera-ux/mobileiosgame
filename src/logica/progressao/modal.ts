// Fila de modais (design/decisoes-F-005.md §3, M1 a M3): baús primeiro, depois
// os níveis, um modal por vez, tudo no estado e no hash. Com modal aberto,
// nenhum passo roda. A escolha entra fora do passo e dos ComandosDoPasso, por
// confirmarModal (M2; diverge do ADR-0002 §12): com baú na frente, fecha o
// baú e não usa k; senão, aplica a carta k e tira um nível da fila. Nos dois
// casos, se a fila chegou a um nível sem oferta, gera a oferta. O contador de
// modais confirmados dá a ordem das escolhas no replay.
import type { DadosDaVigilia } from '../mundo/dados';
import { BYTES_POR_BAU, CARTAS, FILA_DE_BAUS, PROGRESSAO, type Estado } from '../nucleo/estado';
import { aplicarCarta, gerarOfertaSeFor, limparOferta, ofertaAberta } from './oferta';

/** Há modal aberto (baú por fechar ou nível pendente)? */
export function modalAberto(e: Estado): boolean {
  return e.progresso[PROGRESSAO.bausPorFechar]! > 0 || e.progresso[PROGRESSAO.niveisPendentes]! > 0;
}

/** O modal da frente é um baú? */
export function bauNaFrente(e: Estado): boolean {
  return e.progresso[PROGRESSAO.bausPorFechar]! > 0;
}

/** Confirma o modal da frente (M2). Lança sem modal, ou com a carta fora de 0 a 2 numa oferta. */
export function confirmarModal(e: Estado, dados: DadosDaVigilia, k: number): void {
  const pr = e.progresso;
  const baus = pr[PROGRESSAO.bausPorFechar]!;
  if (baus > 0) {
    const f = e.filaDeBaus;
    f.copyWithin(0, BYTES_POR_BAU, FILA_DE_BAUS * BYTES_POR_BAU);
    f.fill(0, (FILA_DE_BAUS - 1) * BYTES_POR_BAU);
    pr[PROGRESSAO.bausPorFechar] = baus - 1;
  } else {
    if (pr[PROGRESSAO.niveisPendentes] === 0 || !ofertaAberta(e)) throw new Error('confirmarModal: nenhum modal aberto');
    if (!Number.isInteger(k) || k < 0 || k >= CARTAS) throw new Error(`confirmarModal: carta ${k} fora de 0 a ${CARTAS - 1}`);
    aplicarCarta(e, dados, k);
    pr[PROGRESSAO.niveisPendentes] = pr[PROGRESSAO.niveisPendentes]! - 1;
    limparOferta(e);
  }
  pr[PROGRESSAO.modaisConfirmados] = pr[PROGRESSAO.modaisConfirmados]! + 1;
  gerarOfertaSeFor(e, dados);
}
