// A retomada da Vigília guardada, sem Phaser (design/decisoes-F-008.md SV5, SV6): na Tela de Acender, lê o `vigilia`, carrega
// o estado num buffer novo (`restaurar`) e devolve a oferta; a disposição de obstáculos diferente vale como Recusar sem
// oferta (SV6); Recusar usa `encerrarVigilia(abandonar)` no estado carregado e grava o meta antes de remover os saves (SV4).
import { criarEstado, type Estado } from '../logica/nucleo/estado';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { Meta } from '../logica/save/meta';
import { recusarComEstado, recusarSemEstado, restaurar, type AndamentoDaVigilia, type EnvelopeDaVigilia } from '../logica/save/vigilia';
import type { ArmazenamentoDoMeta } from '../plataforma/armazenamento';
import { lerRetomada, type ArmazenamentoDaVigilia } from '../plataforma/vigiliaGuardada';

/** O que o Acender oferece: o estado já carregado (a Vigília o usa no lugar de um estado novo) e o resumo. */
export interface OfertaDeRetomada {
  readonly estado: Estado;
  readonly envelope: EnvelopeDaVigilia;
  readonly andamento: AndamentoDaVigilia | null;
}

/**
 * Lê a retomada do boot. Devolve a oferta, ou null (sem save, Vigília já encerrada, save de build mais novo, quebrado ou
 * de disposição diferente). A disposição diferente é Recusar sem oferta: o meta leva as Almas × 0,5 do envelope e a Vigília
 * conta como concluída (`recusarSemEstado`); o `meta` novo vai a `gravarMeta`, e só então os saves saem. Nunca lança.
 */
export function lerOferta(
  arm: ArmazenamentoDaVigilia,
  meta: Meta,
  criarDados: () => DadosDaVigilia,
  seed: number,
  gravarMeta: (novo: Meta) => boolean | void,
): OfertaDeRetomada | null {
  const lida = lerRetomada(arm, meta);
  if (lida === null) return null;
  const dados = criarDados();
  const estado = criarEstado(seed, dados);
  const r = restaurar(estado, dados, lida.envelope);
  if (r === 'ok') return { estado, envelope: lida.envelope, andamento: lida.andamento };
  if (r === 'layout') return null;
  if (r === 'disposicao') {
    // Só com o meta gravado de fato os saves saem; `false` (cota, modo privado) mantém o `vigilia` para o próximo boot.
    if (gravarMeta(recusarSemEstado(meta, lida.envelope.idVigilia, lida.envelope.almas, lida.andamento)) === false) return null;
  }
  arm.removerTudo();
  return null;
}

/**
 * Recusar a oferta (PE4: o chamador pede dois toques): Abandonar no estado carregado, com as Almas do maior entre o
 * `vigilia` e o `andamento`; grava o meta e só então remove o `vigilia` e o `andamento`. Devolve o meta novo.
 */
export function recusarOferta(oferta: OfertaDeRetomada, dados: DadosDaVigilia, meta: Meta, armMeta: ArmazenamentoDoMeta, arm: ArmazenamentoDaVigilia): Meta {
  const novo = recusarComEstado(oferta.estado, dados, meta, oferta.andamento);
  if (armMeta.gravar(novo)) arm.removerTudo();
  return novo;
}
