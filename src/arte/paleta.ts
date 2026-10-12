// Paleta global de 32 cores da arte (doc 13 §1.3; design/arte/style-card.md §2).
// Cada sprite é uma grade de caracteres: um caractere por cor, '.' é
// transparente. Sem Phaser e sem DOM: o jogo, os testes e o gerador de
// amostras (scripts/arte) leem o mesmo dado.

export interface CorDaPaleta {
  /** Caractere da cor nas grades. */
  readonly chave: string;
  readonly hex: number;
  readonly nome: string;
  /** Família da rampa: a regra de uso do style card §2. */
  readonly familia: 'frio' | 'brasa' | 'osso' | 'ocos' | 'sepultadoras' | 'sinal';
}

/** Ordem do índice: o style card e a folha da paleta seguem esta ordem. */
export const PALETA: readonly CorDaPaleta[] = [
  // Frio: pedra e ferro, rampa deslocada para o azul.
  { chave: 'K', hex: 0x0b0e14, nome: 'preto-pedra', familia: 'frio' },
  { chave: 'F', hex: 0x1a1f2b, nome: 'fundo', familia: 'frio' },
  { chave: 'D', hex: 0x2b3340, nome: 'ferro escuro', familia: 'frio' },
  { chave: 'M', hex: 0x4a5466, nome: 'ferro', familia: 'frio' },
  { chave: 'L', hex: 0x8a93a6, nome: 'ferro claro', familia: 'frio' },
  { chave: 'H', hex: 0xc9d0dc, nome: 'brilho frio', familia: 'frio' },
  { chave: 'W', hex: 0xffffff, nome: 'branco puro', familia: 'sinal' },
  // Brasa: o Aldric e os efeitos dele (o jogador é a coisa mais quente da tela).
  { chave: 'c', hex: 0x4a1414, nome: 'vinho escuro', familia: 'brasa' },
  { chave: 'C', hex: 0x7a1f1f, nome: 'vermelho escuro', familia: 'brasa' },
  { chave: 'B', hex: 0xe2652b, nome: 'laranja queimado', familia: 'brasa' },
  { chave: 'A', hex: 0xffb347, nome: 'âmbar', familia: 'brasa' },
  { chave: 'a', hex: 0xffd699, nome: 'brasa clara', familia: 'brasa' },
  { chave: 'Y', hex: 0xfff1b0, nome: 'núcleo da brasa', familia: 'brasa' },
  // Osso, couro e sal.
  { chave: 'G', hex: 0x5a3a22, nome: 'couro', familia: 'osso' },
  { chave: 'Z', hex: 0xb08d57, nome: 'bronze', familia: 'osso' },
  { chave: 'O', hex: 0xe8dcc4, nome: 'osso', familia: 'osso' },
  { chave: 'S', hex: 0xdfe8ea, nome: 'sal', familia: 'osso' },
  { chave: 's', hex: 0x96a5ac, nome: 'sal na sombra', familia: 'osso' },
  // Ocos: musgo e pele cinza.
  { chave: 'e', hex: 0x2f3a24, nome: 'musgo escuro', familia: 'ocos' },
  { chave: 'E', hex: 0x76884c, nome: 'musgo', familia: 'ocos' },
  { chave: 'p', hex: 0x5f645c, nome: 'pele cinza escura', familia: 'ocos' },
  { chave: 'P', hex: 0x9fa39a, nome: 'pele cinza', familia: 'ocos' },
  // Sepultadoras: sal azulado.
  { chave: 'n', hex: 0x4b5472, nome: 'sal azulado escuro', familia: 'sepultadoras' },
  { chave: 'N', hex: 0x8994b4, nome: 'sal azulado', familia: 'sepultadoras' },
  // Sinais: pickups, HUD e as duas cores reservadas aos ataques (W e R).
  { chave: 'b', hex: 0x5aa9e6, nome: 'Cinza azul', familia: 'sinal' },
  { chave: 'g', hex: 0x6cc57c, nome: 'Cinza verde', familia: 'sinal' },
  { chave: 'r', hex: 0xc8324b, nome: 'Cinza vermelha', familia: 'sinal' },
  { chave: 'V', hex: 0xb18cff, nome: 'Alma', familia: 'sinal' },
  { chave: 'v', hex: 0x9e3a52, nome: 'retardo do HP', familia: 'sinal' },
  { chave: 'y', hex: 0xffd166, nome: 'amarelo do crítico', familia: 'sinal' },
  { chave: 'o', hex: 0xa8841f, nome: 'ouro velho', familia: 'sinal' },
  { chave: 'R', hex: 0xff2a2a, nome: 'vermelho de ataque', familia: 'sinal' },
];

/** Caractere transparente das grades. */
export const VAZIO = '.';

/** Cor de cada chave. */
export const COR_DA_CHAVE: Readonly<Record<string, number>> = Object.fromEntries(PALETA.map((c) => [c.chave, c.hex]));

/** Cores que só os ataques inimigos e o flash do aparo usam (doc 13 §1.3): nenhum sprite as pinta. */
export const RESERVADAS = 'WR';

/** Cores quentes: só o Aldric e os efeitos dele as usam em quantidade (style card §3). */
export const QUENTES = 'BAaY';
