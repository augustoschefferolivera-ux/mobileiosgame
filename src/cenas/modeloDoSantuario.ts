// Modelo do Santuário e da árvore da Fundação (design/decisoes-F-010.md SN1 a SN5, FD1 a FD3, FD9, GA2, PW3). Puro: sem Phaser e
// sem DOM; a cena só desenha e repassa os toques. Cada função devolve o meta novo (a cena grava) ou o mesmo meta se nada mudou.
import { custoDaCompra, comprar, foiRecusado, reembolsar, NO, NOS_DA_FUNDACAO, type Recusa } from '../logica/progressao/fundacao';
import { MARCO, comConviteRecusado, comMarco, type Meta } from '../logica/save/meta';
import { convitePendente } from '../plataforma/pwa';
import arvore from '../dados/arvore.json';

export interface EstadoDoSantuario {
  /** A árvore da Fundação está aberta (Iselda tocada, ou aberta sozinha na apresentação). */
  arvoreAberta: boolean;
  /** Nó selecionado (0 a 7) ou null: o 1º toque seleciona, o 2º no mesmo nó compra (FD2). */
  selecionado: number | null;
  /** O jogador já tocou no nó selecionado: false na seleção de Iselda (GA2), em que o 1º toque ainda só confirma a seleção (F-010.4: 2 toques compram). */
  tocado: boolean;
  /** O Reembolsar foi armado (FD9): o próximo toque nele confirma. */
  reembolsoArmado: boolean;
  /** A fala `A9.SANTUARIO.ISELDA_FALA_01` está na tela (GA2). */
  falaDeIselda: boolean;
  /** O painel do convite está aberto (PW3). */
  conviteAberto: boolean;
  /** A última recusa de compra (para o aviso `SEM_ALMAS`), ou null. */
  recusa: Recusa | null;
}

/** Iselda apresenta (GA2): um FIM que não seja Abandonar já houve (Apagar, A Fome ou Amanhecer, que dá Brasa) e o marco não foi visto. */
export function iseldaApresenta(m: Meta): boolean {
  return (m.marcos & MARCO.iselda) === 0 && (m.primeiroApagarFeito || m.brasas > 0);
}

/** Na chegada ao Santuário (PW3, GA2): Iselda primeiro; o convite só quando Iselda não está apresentando. */
export function entrarNoSantuario(m: Meta, standalone: boolean): EstadoDoSantuario {
  const iselda = iseldaApresenta(m);
  return {
    arvoreAberta: iselda,
    selecionado: iselda ? NO.folego : null,
    tocado: false,
    reembolsoArmado: false,
    falaDeIselda: iselda,
    conviteAberto: !iselda && convitePendente(m, standalone),
    recusa: null,
  };
}

/** Abrir a árvore pelo toque em Iselda. */
export function abrirArvore(est: EstadoDoSantuario): void {
  est.arvoreAberta = true;
  est.selecionado = null;
  est.tocado = false;
  est.reembolsoArmado = false;
  est.recusa = null;
}

/** Fechar a árvore (Voltar): liga o marco de Iselda (GA2). */
export function fecharArvore(m: Meta, est: EstadoDoSantuario): Meta {
  est.arvoreAberta = false;
  est.selecionado = null;
  est.tocado = false;
  est.reembolsoArmado = false;
  est.falaDeIselda = false;
  est.recusa = null;
  return comMarco(m, MARCO.iselda);
}

/**
 * Toque num nó (FD2): o 1º seleciona e mostra o detalhe; o 2º no mesmo nó compra. A recusa fica em `est.recusa` e o meta
 * não muda. Tocar num nó desarma o Reembolsar.
 */
export function tocarNo(m: Meta, est: EstadoDoSantuario, idx: number): Meta {
  est.reembolsoArmado = false;
  est.recusa = null;
  if (est.selecionado !== idx || !est.tocado) {
    est.selecionado = idx;
    est.tocado = true;
    return m;
  }
  const r = comprar(m, idx);
  if (foiRecusado(r)) {
    est.recusa = r.recusa;
    return m;
  }
  est.falaDeIselda = false;
  // O marco entra na mesma gravação da compra (seq + 1 só uma vez).
  return { ...r, marcos: r.marcos | MARCO.iselda };
}

/** Reembolsar (FD9): o 1º toque arma, o 2º devolve tudo. Sem gasto, nada acontece. */
export function tocarReembolsar(m: Meta, est: EstadoDoSantuario): Meta {
  est.recusa = null;
  if (m.fundacao.gasto === 0) {
    est.reembolsoArmado = false;
    return m;
  }
  if (!est.reembolsoArmado) {
    est.reembolsoArmado = true;
    return m;
  }
  est.reembolsoArmado = false;
  const r = reembolsar(m);
  return foiRecusado(r) ? m : r;
}

/** "Agora não" do convite (PW3): grava as Vigílias concluídas de agora e fecha o painel. */
export function recusarConvite(m: Meta, est: EstadoDoSantuario): Meta {
  est.conviteAberto = false;
  return comConviteRecusado(m);
}

/** O que o painel de detalhe mostra para o nó `idx` (FD1): textos por id, rank, custo da próxima compra (null se bloqueado ou no máximo). */
export interface DetalheDoNo {
  readonly nomeId: string;
  readonly efeitoId: string;
  readonly memoriaId: string;
  readonly rank: number;
  readonly maximo: number;
  readonly custo: number | null;
  readonly bloqueado: boolean;
}

const NOS_JSON = arvore.arvores.find((a) => a.id === 'fundacao')!.nos;

export function detalheDoNo(m: Meta, idx: number): DetalheDoNo {
  const n = NOS_JSON[idx]!;
  return {
    nomeId: n.nome_id,
    efeitoId: n.efeito_id,
    memoriaId: n.memoria_id,
    rank: m.fundacao.ranks[idx]!,
    maximo: NOS_DA_FUNDACAO[idx]!.ranks,
    custo: custoDaCompra(m, idx),
    bloqueado: !NOS_DA_FUNDACAO[idx]!.ativo,
  };
}
