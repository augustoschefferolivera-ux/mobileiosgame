// Os estados dos três botões do menu da Fogueira (design/decisoes-F-008.md FG4, FG5, FG8), sem Phaser.
import { ACAO_DA_FOGUEIRA } from '../logica/mundo/fogueira';

/** O que cada botão mostra: o id do título e o do efeito (com os parâmetros), e se o toque ainda vale. */
export interface BotaoDaFogueira {
  readonly efeito: string;
  readonly custo?: number;
  readonly habilitado: boolean;
}

/**
 * Descansar vale uma vez; Forjar União vale uma vez, com uma União possível e Almas para o custo da hora (FG4, FG5); Partir
 * vale sempre. A ordem dos ids de falta: já forjada, sem União, sem Almas.
 */
export function botoesDaFogueira(acoes: number, forjavel: boolean, almas: number, custo: number): readonly [BotaoDaFogueira, BotaoDaFogueira, BotaoDaFogueira] {
  const descansou = (acoes & ACAO_DA_FOGUEIRA.descansou) !== 0;
  const forjou = (acoes & ACAO_DA_FOGUEIRA.forjou) !== 0;
  const forjar: BotaoDaFogueira = forjou
    ? { efeito: 'I1.FOGUEIRA.USADA', habilitado: false }
    : !forjavel
      ? { efeito: 'I1.FOGUEIRA.SEM_UNIAO', habilitado: false }
      : almas < custo
        ? { efeito: 'I1.FOGUEIRA.SEM_ALMAS', custo, habilitado: false }
        : { efeito: 'I1.FOGUEIRA.FORJAR_EFEITO', custo, habilitado: true };
  return [
    descansou ? { efeito: 'I1.FOGUEIRA.USADA', habilitado: false } : { efeito: 'I1.FOGUEIRA.DESCANSAR_EFEITO', habilitado: true },
    forjar,
    { efeito: 'I1.FOGUEIRA.PARTIR_EFEITO', habilitado: true },
  ];
}
