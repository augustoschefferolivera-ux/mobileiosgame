// Paleta provisória (brief §5.15: fundo #1a1f2b e brasa #ffb347; base do
// doc 13 §1.3 pela Q-27), sem Phaser: as cenas a usam por estilo.ts, e os
// testes da Playwright a importam direto para conferir os pixels da horda.

/** As cores em uso; as demais da base do doc 13 entram com o que as usar. */
export const COR = {
  /** Fundo dos painéis "pedra e osso" e da base do joystick (doc 13 §1.3 e §1.7). */
  pedra: 0x0b0e14,
  fundo: 0x1a1f2b,
  /** Também a cor dos obstáculos (design/decisoes-F-002.md §2). */
  cinzaFrio: 0x2b3340,
  brasa: 0xffb347,
  laranjaQueimado: 0xe2652b,
  osso: 0xe8dcc4,
  sal: 0xdfe8ea,
} as const;

/**
 * Cor de cada inimigo (design/decisoes-F-003.md §7, V1): a família vem do doc 13
 * §1.3 pela facção (Ocos: verde-musgo e pele cinza; Sepultadoras: sal azulado);
 * o hex é provisório, até a arte. O convertido usa a do Oco Grande.
 */
export const COR_DO_INIMIGO: Readonly<Record<string, number>> = {
  oco_das_lanternas: 0x76884c,
  oco_grande: 0x9fa39a,
  novica_de_sal: 0x8994b4,
};
