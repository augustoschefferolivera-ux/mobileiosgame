// Estado da simulação: um único ArrayBuffer com views tipadas (ADR-0002 §4).
// Nada é alocado depois de criarEstado(). Na F-004 (layout 4;
// design/decisoes-F-004.md §4): cabeçalho com os parâmetros da Vigília, fluxos
// de RNG, registro do jogador com a build (5 vagas de arma), bloco do mundo e
// do diretor, o pool de inimigos e o pool de projéteis. Na F-005 (VERSAO_LAYOUT
// 5; design/decisoes-F-005.md §5), no fim, para os 42.988 bytes do v4 não
// mudarem de lugar: progressão, hpMax, atributos, passivas, oferta, fila de
// baús, o 2º bloco do mundo, o pool de pickups (Cinzas e baús) e o de efeitos
// de chão (ondas). As seções ficam em múltiplos de 4 bytes. O anel de eventos
// e os derivados (o dano vivo) moram no objeto, fora do buffer, do hash e do
// save. Cada feature seguinte aumenta VERSAO_LAYOUT. Na F-006 (VERSAO_LAYOUT 6;
// design/decisoes-F-006.md ET1), de novo só no fim, depois dos 67.488 bytes do
// v5: stamina, esquiva, aparo e Poder do jogador, a Sequência do Contra-ataque
// por vaga, os ataques dos inimigos e o dono dos projéteis. Na F-007
// (VERSAO_LAYOUT 7; design/decisoes-F-007.md LY1), mais uma vez só no fim,
// depois dos 74.636 bytes do v6: a fase da Vigília, o Frasco, a mancha das
// Cinzas Perdidas e os contadores da pausa e do Resultado. Na F-008 (VERSAO_LAYOUT 8;
// design/decisoes-F-008.md §1), outra vez só no fim, depois dos 74.680 bytes do v7: a etapa e os marcos, a
// arena, a Fogueira, o empurrão do Grito, os obstáculos ativos e, por inimigo, o ataque e a convocação do Coroado.
import type { DadosDaVigilia } from '../mundo/dados';
import { criarAnel, esvaziarAnel, type AnelDeEventos } from './eventos';
import { fnv1aByte, fnv1aBytes, FNV_BASE } from './hash';
import { alocar, bytesDoPool, esvaziarPool, viewsDoPool, type Pool } from './pool';
import { FLUXOS, PALAVRAS_POR_FLUXO, indiceDoFluxo, semear, type Fluxo } from './rng';
import { CODIGOS_DE_ARMA, NUMERO_DE_ATRIBUTOS, POR_NIVEL } from '../armas/tabela';
import { recalcularDano } from '../progressao/dano';
import { PASSOS_POR_MINUTO } from '../diretor/timeline';
import { gravarDanoNoSpawn, gravarHpNoSpawn } from '../mundo/escala';
import { TIPO } from '../mundo/tipos';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, normalizarNoToro } from '../mundo/toro';

export const VERSAO_LAYOUT = 8;

/** Palavras do cabeçalho (Uint32). As não usadas ficam em zero e entram no hash. */
export const CAB = {
  versao: 0,
  seed: 1,
  /** Passos simulados desde o início da Vigília. */
  passo: 2,
  /** Relógio da Vigília em passos; para na Fogueira (a partir da F-008). */
  relogio: 3,
  /** Parâmetro da Vigília: bits de TUTORIAL já cumpridos (ADR-0002 §3; Q-26). */
  tutoriaisVistos: 4,
  /** Impressão da disposição dos obstáculos (design/decisoes-F-002.md §2). */
  disposicao: 5,
  /** Parâmetro da Vigília: TETO de inimigos vivos, 300 ou 500 (ADR-0002 §13). */
  teto: 6,
  /** Parâmetro da Vigília: bits de CENARIO (só os cenários de debug os ligam). */
  cenario: 7,
  /** Parâmetro da Vigília: linha fixa do diretor (LINHA_LIVRE = nenhuma). */
  linhaFixa: 8,
  /** Parâmetro da Vigília: inimigos removidos a cada 60 passos pelo cenário (0 = nenhum). */
  rotacao: 9,
} as const;
const PALAVRAS_CAB = 16;

/** Bits de `CAB.tutoriaisVistos` (decisoes-F-006 ET2). */
export const TUTORIAL = { mover: 1, esquiva: 2, aparo: 4 } as const;
/** Todos os bits de TUTORIAL (?tutorial=0). */
export const TODOS_OS_TUTORIAIS = TUTORIAL.mover | TUTORIAL.esquiva | TUTORIAL.aparo;

/** Bits de TUTORIAL dos prompts cumpridos, para a F-007/F-010 gravarem no meta (decisoes-F-006 TU5). */
export function tutoriaisCumpridos(e: Estado): number {
  return (
    (e.jogadorU8[JOGADOR_U8.promptMover] === PROMPT.cumprido ? TUTORIAL.mover : 0) |
    (e.jogador3U8[JOGADOR3_U8.promptEsquiva] === PROMPT.cumprido ? TUTORIAL.esquiva : 0) |
    (e.jogador3U8[JOGADOR3_U8.promptAparo] === PROMPT.cumprido ? TUTORIAL.aparo : 0)
  );
}

/** Bits de `CAB.cenario` (design/decisoes-F-003.md §5). */
export const CENARIO = {
  jogadorInvulneravel: 1,
  diretorDesligado: 2,
  semCinzas: 4,
  /** Os médios telegrafam, golpeiam e lançam (decisoes-F-006 VT1); desligado por padrão. */
  ataques: 8,
} as const;
/** `CAB.linhaFixa` sem linha fixa: o diretor segue o relógio. */
export const LINHA_LIVRE = 0xffffffff;
/** TETO de fallback (ADR-0002 §13; B §3.7). */
export const TETO_PADRAO = 300;

/** Registro do jogador, Float32. (x, y) é o incentro do triângulo. */
export const JOGADOR = { x: 0, y: 1, xAnt: 2, yAnt: 3, dirX: 4, dirY: 5, hp: 6 } as const;
const FLOATS_JOGADOR = 7;
/** Registro do jogador, Uint8 (os 2 bytes seguintes ficam reservados, em zero). */
export const JOGADOR_U8 = {
  promptMover: 0,
  /** Passos restantes da invulnerabilidade pós-contato (B §3.3; decisoes-F-003 §3). */
  invulContato: 1,
} as const;
const BYTES_JOGADOR_U8 = 4;

/** Vagas de arma da build (B §3.3; vigilantes.json `vagas.armas`). */
export const VAGAS_DE_ARMA = 5;

/** A build no registro do jogador: uma posição por vaga, na ordem de aquisição (design/decisoes-F-004.md W17). */
export interface Build {
  /** Passos até o próximo disparo (no Círculo, o timer do tick); 0 = dispara neste passo. */
  readonly recarga: Uint16Array;
  /** Passos até o próximo pulso do Círculo nv7. */
  readonly esperaPulso: Uint16Array;
  /** Código da arma (ARMA em src/logica/armas/tabela.ts); 0 = vaga vazia. */
  readonly codigo: Uint8Array;
  readonly nivel: Uint8Array;
  /** Índice do próximo golpe da sequência da Espada; 0 = nenhuma sequência em andamento. */
  readonly golpe: Uint8Array;
  /** Passos até o próximo golpe da sequência. */
  readonly esperaGolpe: Uint8Array;
  /** Contra-ataque: índice da salva em andamento da vaga; 0 = nenhuma (decisoes-F-006 ET1). Mora na seção `vagas3`. */
  readonly caSeq: Uint8Array;
  /** Passos até a próxima salva do Contra-ataque da vaga. */
  readonly caEspera: Uint8Array;
}
const BYTES_BUILD = VAGAS_DE_ARMA * (2 + 2 + 1 + 1 + 1 + 1);

/** Estados de cada prompt de tutorial (A2.TUTORIAL.01 a .03; design/decisoes-F-002.md §7; decisoes-F-006 TU). */
export const PROMPT = { aguardando: 0, visivel: 1, cumprido: 2 } as const;

/** Bloco do mundo e do diretor, Uint32 (design/decisoes-F-003.md §4 e §6). */
export const MUNDO = {
  /** I em décimos: 10 (1,0) ou 11 (1,1, depois de Descansar, F-008). */
  intensidade10: 0,
  /** Passos até a próxima reposição do diretor; 0 = repõe no próximo passo ativo. */
  espera: 1,
  /** Um bit por linha da timeline: garantido já entregue. */
  garantidosEntregues: 2,
  /** Inimigos que o diretor fez nascer (reposição, garantidos e convertidos), acumulado. */
  spawns: 3,
  /** Spawns recusados com o pool físico cheio (ADR-0002 §4); com TETO ≤ 500, fica em 0. */
  recusados: 4,
  /** Spawns recusados por não achar ponto livre de obstáculo no anel. */
  semPontoLivre: 5,
  /** Inimigos removidos pela rotação do cenário, acumulado. */
  removidos: 6,
  /** Garantidos que não nasceram porque os slots estavam no TETO. */
  garantidosPerdidos: 7,
  /** Inimigos mortos por arma, 1 por slot (design/decisoes-F-004.md M3). */
  mortes: 8,
  /** Projéteis recusados com o pool no limite (design/decisoes-F-004.md §4). */
  projeteisRecusados: 9,
} as const;
const PALAVRAS_MUNDO = 10;

/** Capacidade física do pool de inimigos nos dois TETOs (ADR-0002 §4 e §15 item 13). */
export const CAPACIDADE_DE_INIMIGOS = 500;

/** Campos Float32 de cada inimigo, um Float32Array de 500 por campo. */
export interface CamposDosInimigos {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly xAnt: Float32Array;
  readonly yAnt: Float32Array;
  /** HP atual, fixado no spawn pela escala do minuto (Q-10). */
  readonly hp: Float32Array;
  /** Dano escalado, fixado no spawn (por segundo de contato no Oco das Lanternas). */
  readonly dano: Float32Array;
  /** Código do tipo (TIPO em src/logica/mundo/tipos.ts); 0 = vazio. */
  readonly tipo: Uint8Array;
  /** 1 se é um Oco Grande convertido do excedente (ADR-0002 §8.7). */
  readonly convertido: Uint8Array;
  /** Redução de velocidade do Sal em %: 0, 50 ou 60 (design/decisoes-F-004.md §3). */
  readonly salPct: Uint8Array;
  /** Passos restantes do Sal. */
  readonly salPassos: Uint8Array;
  /** Passos restantes do afastamento do pulso do Círculo (K1). */
  readonly kbPassos: Uint8Array;
  /** Postura Quebrada: passos restantes (121 no passo em que é marcada, 120 depois); 0 = não está (ET1). */
  readonly quebradaPassos: Uint8Array;
  /** Fase do ataque: 0 livre, 1 telegrafo, 2 recuperação (valores em src/logica/mundo/ataques.ts). */
  readonly ataqueFase: Uint8Array;
  /** Passos restantes da fase do ataque. */
  readonly ataqueTimer: Uint8Array;
  /** Direção do golpe ou do lançamento, fixada no início do telegrafo. */
  readonly miraX: Float32Array;
  readonly miraY: Float32Array;
  /** Ataque em curso do Coroado: 0 Patada, 1 Grito (CR4). */
  readonly ataqueId: Uint8Array;
  /** Ataques já telegrafados pelo Coroado; `ataqueSeq` mod 3 = 2 é o Grito (CR4). */
  readonly ataqueSeq: Uint8Array;
  /** Passos até a próxima convocação do Coroado (CR7); 0 nos outros tipos. */
  readonly convocaEspera: Uint16Array;
}

/** Capacidade física do pool de projéteis nos dois TETOs (ADR-0002 §4 e §15 item 2). */
export const CAPACIDADE_DE_PROJETEIS = 400;

/** Tipos de projétil; 0 = slot vazio. */
/** O tipo 2 é o projétil de Sal da Noviça, no mesmo pool (decisoes-F-006 ET1). */
export const TIPO_DE_PROJETIL = { vazio: 0, faca: 1, sal: 2 } as const;
/** Perfurações que não se gastam (só a sonda do TETO). */
export const PERFURACAO_INFINITA = 255;

/** Campos de cada projétil, um array de 400 por campo. */
export interface CamposDosProjeteis {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly xAnt: Float32Array;
  readonly yAnt: Float32Array;
  /** Velocidade em px por passo, fixada no disparo. */
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  /** Dano de cada acerto, fixado no disparo (W13). */
  readonly dano: Float32Array;
  /** Handle do último inimigo acertado (0xFFFFFFFF = nenhum). */
  readonly ultimoAlvo: Uint32Array;
  /** Passos de voo restantes. */
  readonly vida: Uint16Array;
  readonly tipo: Uint8Array;
  /** Código da arma que disparou (vai no evento `acerto`). */
  readonly arma: Uint8Array;
  /** Acertos que ainda atravessa (PERFURACAO_INFINITA não se gasta). */
  readonly perfuracoes: Uint8Array;
  /** Sal que aplica, em % e em passos, fixado no disparo; 0 = nenhum. */
  readonly salPct: Uint8Array;
  readonly salPassos: Uint8Array;
  /** Dono do projétil de Sal (slot e geração do atirador); 0 nas facas (ET1). */
  readonly donoSlot: Uint16Array;
  readonly donoGeracao: Uint16Array;
}

/** Uma arma da build inicial: código da tabela de armas e nível. */
export interface ArmaInicial {
  readonly codigo: number;
  readonly nivel: number;
}
/** Um inimigo posto no início: tipo (código) e deslocamento do início do jogador, em px. */
export interface InimigoInicial {
  readonly codigo: number;
  readonly dx: number;
  readonly dy: number;
}
/** Uma passiva inicial: código da tabela de passivas e nível. */
export interface PassivaInicial {
  readonly codigo: number;
  readonly nivel: number;
}
/** Um baú no chão no início: deslocamento do início do jogador, em px. */
export interface BauInicial {
  readonly dx: number;
  readonly dy: number;
  readonly dourado: boolean;
}

export interface ParametrosDaVigilia {
  /** Bits de TUTORIAL já cumpridos: do meta (F-007) ou de ?tutorial=0. */
  readonly tutoriaisVistos: number;
  readonly teto: number;
  readonly cenario: number;
  readonly linhaFixa: number;
  readonly rotacao: number;
  /** Build inicial, na ordem das vagas; null = a arma inicial do Vigilante no nv1 (design/decisoes-F-004.md §5). */
  readonly armas: readonly ArmaInicial[] | null;
  /** Passivas iniciais, na ordem das vagas. */
  readonly passivas: readonly PassivaInicial[];
  /** Baús no chão no início, soltos nessa ordem. */
  readonly baus: readonly BauInicial[];
  /** XP dada no início: os níveis que ela cruza abrem no passo 1. */
  readonly xpInicial: number;
  /** Relógio no início, em passos (exige linha fixa). */
  readonly relogioInicial: number;
  /** Inimigos postos no início, nessa ordem (receitas de cenário e testes; decisoes-F-006 VT1). */
  readonly inimigos: readonly InimigoInicial[];
  /** Stamina no início; null = a capacidade do Vigilante (decisoes-F-006 ST1). */
  readonly staminaInicial: number | null;
  /** Só o ?inicio do build de debug liga: dispensa a linha fixa do relógio inicial > 0 (decisoes-F-006 TU7). */
  readonly inicioLivre: boolean;
  /** Mancha das Cinzas Perdidas do meta, nascida no passo 0; null = nenhuma (decisoes-F-007 MC6). Entra no hash. */
  readonly mancha: ManchaInicial | null;
  /** Almas dadas no início (só o ?almas do build de debug; decisoes-F-007 MC12). Entra no hash; não grava no meta. */
  readonly almasIniciais: number;
}
/** A mancha de uma Vigília anterior: posição no mapa e Almas a devolver (decisoes-F-007 MC6; `almas` ≥ 1 e < 2^30). */
export interface ManchaInicial {
  readonly x: number;
  readonly y: number;
  readonly almas: number;
}
export const PARAMETROS_PADRAO: ParametrosDaVigilia = {
  tutoriaisVistos: 0,
  teto: TETO_PADRAO,
  cenario: 0,
  linhaFixa: LINHA_LIVRE,
  rotacao: 0,
  armas: null,
  passivas: [],
  baus: [],
  xpInicial: 0,
  relogioInicial: 0,
  inimigos: [],
  staminaInicial: null,
  inicioLivre: false,
  mancha: null,
  almasIniciais: 0,
};
/** Os saldos de Almas (`almas`, mancha, `valor` do pickup) ficam abaixo de 2^30 (decisoes-F-007 AM7; regra do laço quente). */
export const LIMITE_DE_ALMAS = 1_073_741_824;

/** Bloco da progressão, Uint32 (design/decisoes-F-005.md §5). */
export const PROGRESSAO = {
  nivel: 0,
  /** XP no nível atual (o resto depois dos cruzamentos). */
  xp: 1,
  /** Níveis cruzados ainda sem carta escolhida. */
  niveisPendentes: 2,
  /** Baús abertos cujo modal ainda não fechou (até a capacidade da fila). */
  bausPorFechar: 3,
  /** Modais confirmados: a ordem das escolhas no replay (M2). */
  modaisConfirmados: 4,
  almas: 5,
  xpTotal: 6,
} as const;
const PALAVRAS_PROGRESSAO = 8;
/** Floats do 2º registro do jogador: [0] = hpMax (valor inteiro). */
export const JOGADOR2 = { hpMax: 0 } as const;
const FLOATS_JOGADOR2 = 2;
const BYTES_ATRIBUTOS = 8;
/** Vagas de passiva (B §3.3; vigilantes.json `vagas.passivas`). */
export const VAGAS_DE_PASSIVA = 6;
/** Cartas da oferta e os tipos de carta (0 = vaga, sem oferta). */
export const CARTAS = 3;
export const TIPO_DE_CARTA = { nenhuma: 0, melhoriaDeArma: 1, armaNova: 2, melhoriaDePassiva: 3, passivaNova: 4, bolsa: 5 } as const;
const BYTES_OFERTA = 8;
/** Fila de baús: até 4 entradas de 20 bytes [itens, união, categoria × 5, código × 5, nível × 5, 3 livres]. */
export const FILA_DE_BAUS = 4;
export const BYTES_POR_BAU = 20;
export const BAU = { itens: 0, uniao: 1, categoria: 2, codigo: 7, nivel: 12 } as const;
/** Categoria de cada item do baú (e do evento `item`). */
export const CATEGORIA_DE_ITEM = { arma: 1, passiva: 2, bolsa: 3 } as const;
/** 2º bloco do mundo, Uint32. */
export const MUNDO2 = {
  /** Cinzas juntadas na mais próxima com o pool cheio (X6). */
  juncoes: 0,
  /** Baús soltos: o índice de queda do próximo é este + 1. */
  bausSoltos: 1,
  /** Ondas recusadas pelo limite de projéteis e efeitos (U5). */
  efeitosRecusados: 2,
} as const;
const PALAVRAS_MUNDO2 = 4;
/** Pool de pickups (ADR-0002 §4). */
export const CAPACIDADE_DE_PICKUPS = 512;
/** A Alma (4) é da F-007 (decisoes-F-007 AM2); os códigos só crescem no fim. */
export const TIPO_DE_PICKUP = { vazio: 0, cinza: 1, bauComum: 2, bauDourado: 3, alma: 4 } as const;
/** Pool de efeitos de chão (ADR-0002 §4): as ondas da União. */
export const CAPACIDADE_DE_EFEITOS = 64;
/** Bits de "já acertou" por onda: 512 slots de inimigo em 16 Uint32 (U4). */
export const PALAVRAS_DO_BITSET = 16;

/** Campos de cada pickup. */
export interface CamposDosPickups {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly xAnt: Float32Array;
  readonly yAnt: Float32Array;
  /** XP da Cinza, valor da Alma (< 2^30) ou o índice de queda do baú. */
  readonly valor: Uint32Array;
  readonly tipo: Uint8Array;
}

/** Campos de cada efeito de chão (onda). */
export interface CamposDosEfeitos {
  /** Origem: o centro do jogador no passo do golpe. */
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** A mira do golpe. */
  readonly dirX: Float32Array;
  readonly dirY: Float32Array;
  /** Dano fixado na criação (W13). */
  readonly dano: Float32Array;
  /** "Já acertou", [slot da onda × 16 + palavra]. */
  readonly bits: Uint32Array;
  /** Passos desde a criação (0 no passo do golpe). */
  readonly idade: Uint8Array;
  readonly arma: Uint8Array;
}

/** Derivados por Estado, fora do buffer (P4): o dano por (arma, nível) e o da onda por arma. */
export interface Derivados {
  readonly danoVivo: Float64Array;
  readonly danoOnda: Float64Array;
  /** As mesmas duas tabelas com o Poder temporário da esquiva perfeita (+15%; decisoes-F-006 EP3): o disparo escolhe por `poderPassos > 0`. */
  readonly danoVivoPoder: Float64Array;
  readonly danoOndaPoder: Float64Array;
}

/** Registro do jogador da F-006, Float32 (3 campos, 12 B; decisoes-F-006 ET1). */
export const JOGADOR3 = {
  /** Stamina em múltiplos de 0,5, de 0 à capacidade do Vigilante (ST1). */
  stamina: 0,
  /** Direção fixa da esquiva em curso (módulo 1). */
  esquivaDirX: 1,
  esquivaDirY: 2,
} as const;
const FLOATS_JOGADOR3 = 3;
/** Registro do jogador da F-006, Uint8 (14 campos, 16 B com 2 de folga em zero). */
export const JOGADOR3_U8 = {
  /** Passos sem regenerar a stamina (o atraso do gasto e do aparo falho). */
  esperaRegen: 0,
  /** Passo da esquiva em curso: 1 no passo do comando, 21 no último; 0 = fora dela. */
  esquivaPasso: 1,
  /** 1 se a esquiva em curso já deu a esquiva perfeita (uma por esquiva). */
  esquivaPerfeitaDada: 2,
  /** Passos restantes do Poder da esquiva perfeita. */
  poderPassos: 3,
  /** Passos restantes da janela do aparo (12 ou 18 no passo do comando). */
  aparoJanela: 4,
  /** Último passo protegido da janela em curso (11 ou 17), gravado junto de `aparoJanela`. */
  aparoLimite: 5,
  /** Passos restantes do aparo falho (24). */
  aparoFalho: 6,
  /** Passos restantes do congelamento da esquiva perfeita e do aparo (5). */
  congelamento: 7,
  /** 1 se a próxima salva das Facas leva a faca extra da esquiva perfeita. */
  facaExtra: 8,
  promptEsquiva: 9,
  promptAparo: 10,
  /** Aparos falhos seguidos (2 ligam a janela estendida enquanto o prompt está visível). */
  falhasDeAparo: 11,
  /** Sal no jogador: redução de velocidade em % e passos restantes. */
  salPct: 12,
  salPassos: 13,
} as const;
const BYTES_JOGADOR3_U8 = 16;
/** Registro do jogador da F-006, Uint16 (3 campos, 8 B com 2 de folga em zero). */
export const JOGADOR3_U16 = {
  /** Slot e geração do último inimigo aparado (alvo do Contra-ataque). */
  alvoAparadoSlot: 0,
  alvoAparadoGeracao: 1,
  /** Ataques aparáveis a caminho no passo anterior: decide o aparo falho em `c + 12`. */
  ameacasAparaveis: 2,
} as const;
const BYTES_JOGADOR3_U16 = 8;
/** `caSeq` e `caEspera`: 5 vagas, Uint8 cada, 12 B com 2 de folga. */
const BYTES_VAGAS3 = 12;
/** Campos novos dos inimigos e dos projéteis (ET1). */
const CAMPOS_INIMIGO3_F32 = ['miraX', 'miraY'] as const;
const CAMPOS_INIMIGO3_U8 = ['quebradaPassos', 'ataqueFase', 'ataqueTimer'] as const;
const CAMPOS_PROJETIL3_U16 = ['donoSlot', 'donoGeracao'] as const;

/** Fases da Vigília (decisoes-F-007 AG4): em FIM o `passo` não faz nada e o hash fica congelado. */
export const FASE = { viva: 0, apagando: 1, fim: 2 } as const;
/** Por que a Vigília acabou; 3 e 4 ficam reservados às F-009 (decisoes-F-007 AG4). */
export const CAUSA_DO_FIM = { nenhuma: 0, apagar: 1, abandonar: 2, aFome: 3, amanhecer: 4 } as const;

/** Registro da F-007, Float32 (5 campos, 20 B; decisoes-F-007 LY1). */
export const JOGADOR4 = {
  /** Cura do Frasco por passo, gravada no toque: `0,4 × hpMax / 120` (FR2). */
  frascoPorPasso: 0,
  /** O que falta curar do Frasco em curso; o passo 120 soma o resto (FR2). */
  frascoRestante: 1,
  /** HP efetivamente perdido, depois da armadura e da Brasa Firme (DM5; Resultado e pausa). */
  danoRecebido: 2,
  /** Posição da mancha das Cinzas Perdidas (MC6). */
  manchaX: 3,
  manchaY: 4,
} as const;
const FLOATS_JOGADOR4 = 5;
/** Registro da F-007, Uint32 (4 campos, 16 B; todos < 2^30). */
export const JOGADOR4_U32 = {
  /** Aparos bem-sucedidos (PE2). */
  aparos: 0,
  /** Esquivas perfeitas, 1 por esquiva (PE2; alimenta os Feitos da F-011). */
  esquivasPerfeitas: 1,
  frascosUsados: 2,
  /** Almas da mancha, a devolver ao encostar (MC6). */
  manchaAlmas: 3,
} as const;
const PALAVRAS_JOGADOR4_U32 = 4;
/** Registro da F-007, Uint8 (6 campos, 8 B com 2 de folga em zero). */
export const JOGADOR4_U8 = {
  /** FASE (AG4). */
  fase: 0,
  /** CAUSA_DO_FIM (AG4). */
  causaDoFim: 1,
  /** Passos de APAGANDO já decorridos (0 a `apagar.duracao_passos`). */
  apagandoPassos: 2,
  /** Cargas do Frasco; começa em `vigilantes.json` `frascos.cargas` (FR8). */
  frascoCargas: 3,
  /** Passo da cura em curso: 1 no passo do toque, 120 no último; 0 = fora dela (FR2). */
  frascoPasso: 4,
  /** 1 enquanto a mancha existe e não foi recuperada (MC6). */
  manchaAtiva: 5,
} as const;
const BYTES_JOGADOR4_U8 = 8;

/** Etapas da Vigília (decisoes-F-008 AR1): a máquina de horas, marcos e Fogueira. */
export const ETAPA = { hora: 0, marco: 1, fogueira: 2, chefe: 3, aFome: 4 } as const;
/** Registro da F-008, Float32 (6 campos, 24 B; decisoes-F-008 §1): a Fogueira, o centro da arena e o empurrão do Grito. */
export const FOGUEIRA_F32 = {
  fogueiraX: 0,
  fogueiraY: 1,
  arenaX: 2,
  arenaY: 3,
  /** Deslocamento por passo do empurrão do Grito, aplicado ao jogador enquanto `empurraoPassos` > 0 (CR3). */
  empurraoX: 4,
  empurraoY: 5,
} as const;
const FLOATS_FOGUEIRA = 6;
/** Registro da F-008, Uint32 (2 campos, 8 B; ambos < 2^30). */
export const FOGUEIRA_U32 = {
  /** Identificador da Vigília no meta (SV4, parte 2b). */
  idVigilia: 0,
  /** Convocações já feitas por todos os Coroados da Vigília; gira o anel da próxima (CR7). */
  convocacoes: 1,
} as const;
const PALAVRAS_FOGUEIRA_U32 = 2;
/** Registro da F-008, Uint8 (8 campos usados e 4 de folga em zero, 12 B). */
export const FOGUEIRA_U8 = {
  /** ETAPA. */
  etapa: 0,
  /** Marcos já iniciados, 0 a 3 (AR1). */
  marcosIniciados: 1,
  /** 1 enquanto a arena existe (AR2). */
  arenaAtiva: 2,
  /** Coroados vivos; sobe no nascimento e cai em qualquer causa de morte (CR9). */
  coroadosVivos: 3,
  /** 1 enquanto a Fogueira está acesa (FG1). */
  fogueiraAcesa: 4,
  /** Hora da Fogueira acesa, 1 a 3: o marco que a acendeu (FG5). */
  fogueiraHora: 5,
  /** Bit 1: já descansou; bit 2: já forjou (FG4, FG5). */
  fogueiraAcoes: 6,
  /** Passos que faltam do empurrão do Grito (CR3). */
  empurraoPassos: 7,
} as const;
const BYTES_FOGUEIRA_U8 = 12;
/** Obstáculos que cabem no registro `obstaculoAtivo` (AR3); mais que isso é erro no boot. */
export const OBSTACULOS_MAXIMOS = 64;
/** Campos Uint8 novos dos inimigos (F-008): qual ataque do Coroado está em curso e o contador do ciclo (CR4). */
const CAMPOS_INIMIGO8_U8 = ['ataqueId', 'ataqueSeq'] as const;

const PALAVRAS_RNG = FLUXOS.length * PALAVRAS_POR_FLUXO;
const BYTES_CAB = PALAVRAS_CAB * 4;
const BYTES_RNG = PALAVRAS_RNG * 4;
const INICIO_JOGADOR = BYTES_CAB + BYTES_RNG;
const INICIO_JOGADOR_U8 = INICIO_JOGADOR + FLOATS_JOGADOR * 4;
const INICIO_BUILD = INICIO_JOGADOR_U8 + BYTES_JOGADOR_U8;
const INICIO_MUNDO = INICIO_BUILD + BYTES_BUILD;
const INICIO_POOL = INICIO_MUNDO + PALAVRAS_MUNDO * 4;
const INICIO_INIMIGOS_F32 = INICIO_POOL + bytesDoPool(CAPACIDADE_DE_INIMIGOS);
const FLOATS_POR_CAMPO = CAPACIDADE_DE_INIMIGOS;
const CAMPOS_F32 = ['x', 'y', 'xAnt', 'yAnt', 'hp', 'dano'] as const;
const INICIO_INIMIGOS_U8 = INICIO_INIMIGOS_F32 + CAMPOS_F32.length * FLOATS_POR_CAMPO * 4;
const CAMPOS_U8 = ['tipo', 'convertido', 'salPct', 'salPassos', 'kbPassos'] as const;
const INICIO_POOL_PROJETEIS = INICIO_INIMIGOS_U8 + CAMPOS_U8.length * CAPACIDADE_DE_INIMIGOS;
const P = CAPACIDADE_DE_PROJETEIS;
const CAMPOS_PROJETIL_F32 = ['x', 'y', 'xAnt', 'yAnt', 'vx', 'vy', 'dano'] as const;
const INICIO_PROJETEIS_F32 = INICIO_POOL_PROJETEIS + bytesDoPool(P);
const INICIO_PROJETEIS_U32 = INICIO_PROJETEIS_F32 + CAMPOS_PROJETIL_F32.length * P * 4;
const INICIO_PROJETEIS_U16 = INICIO_PROJETEIS_U32 + P * 4;
const INICIO_PROJETEIS_U8 = INICIO_PROJETEIS_U16 + P * 2;
const CAMPOS_PROJETIL_U8 = ['tipo', 'arma', 'perfuracoes', 'salPct', 'salPassos'] as const;
/** Fim do layout v4 da F-004 (a regressão v4 compara os bytes até aqui). */
export const BYTES_DO_LAYOUT_4 = INICIO_PROJETEIS_U8 + CAMPOS_PROJETIL_U8.length * P;
const INICIO_PROGRESSAO = BYTES_DO_LAYOUT_4;
const INICIO_JOGADOR2 = INICIO_PROGRESSAO + PALAVRAS_PROGRESSAO * 4;
const INICIO_ATRIBUTOS = INICIO_JOGADOR2 + FLOATS_JOGADOR2 * 4;
const INICIO_PASSIVAS = INICIO_ATRIBUTOS + BYTES_ATRIBUTOS;
const INICIO_OFERTA = INICIO_PASSIVAS + 2 * VAGAS_DE_PASSIVA;
const INICIO_FILA_DE_BAUS = INICIO_OFERTA + BYTES_OFERTA;
const INICIO_MUNDO2 = INICIO_FILA_DE_BAUS + FILA_DE_BAUS * BYTES_POR_BAU;
const INICIO_POOL_PICKUPS = INICIO_MUNDO2 + PALAVRAS_MUNDO2 * 4;
const K = CAPACIDADE_DE_PICKUPS;
const INICIO_PICKUPS_F32 = INICIO_POOL_PICKUPS + bytesDoPool(K);
const CAMPOS_PICKUP_F32 = ['x', 'y', 'xAnt', 'yAnt'] as const;
const INICIO_PICKUPS_U32 = INICIO_PICKUPS_F32 + CAMPOS_PICKUP_F32.length * K * 4;
const INICIO_PICKUPS_U8 = INICIO_PICKUPS_U32 + K * 4;
const INICIO_POOL_EFEITOS = INICIO_PICKUPS_U8 + K;
const F = CAPACIDADE_DE_EFEITOS;
const INICIO_EFEITOS_F32 = INICIO_POOL_EFEITOS + bytesDoPool(F);
const CAMPOS_EFEITO_F32 = ['x', 'y', 'dirX', 'dirY', 'dano'] as const;
const INICIO_EFEITOS_BITS = INICIO_EFEITOS_F32 + CAMPOS_EFEITO_F32.length * F * 4;
const INICIO_EFEITOS_U8 = INICIO_EFEITOS_BITS + F * PALAVRAS_DO_BITSET * 4;
/** Fim do layout v5 da F-005 (a regressão v5 compara os bytes até aqui). */
export const BYTES_DO_LAYOUT_5 = INICIO_EFEITOS_U8 + 2 * F;
// F-006: tudo depois de BYTES_DO_LAYOUT_5, em múltiplos de 4 bytes.
const INICIO_JOGADOR3 = BYTES_DO_LAYOUT_5;
const INICIO_JOGADOR3_U8 = INICIO_JOGADOR3 + FLOATS_JOGADOR3 * 4;
const INICIO_JOGADOR3_U16 = INICIO_JOGADOR3_U8 + BYTES_JOGADOR3_U8;
const INICIO_VAGAS3 = INICIO_JOGADOR3_U16 + BYTES_JOGADOR3_U16;
const INICIO_INIMIGOS3_F32 = INICIO_VAGAS3 + BYTES_VAGAS3;
const INICIO_INIMIGOS3_U8 = INICIO_INIMIGOS3_F32 + CAMPOS_INIMIGO3_F32.length * CAPACIDADE_DE_INIMIGOS * 4;
const INICIO_PROJETEIS3_U16 = INICIO_INIMIGOS3_U8 + CAMPOS_INIMIGO3_U8.length * CAPACIDADE_DE_INIMIGOS;
/** Fim do layout v6 da F-006 (a regressão v6 compara os bytes até aqui). */
export const BYTES_DO_LAYOUT_6 = INICIO_PROJETEIS3_U16 + CAMPOS_PROJETIL3_U16.length * P * 2;
// F-007: tudo depois de BYTES_DO_LAYOUT_6, em múltiplos de 4 bytes.
const INICIO_JOGADOR4 = BYTES_DO_LAYOUT_6;
const INICIO_JOGADOR4_U32 = INICIO_JOGADOR4 + FLOATS_JOGADOR4 * 4;
const INICIO_JOGADOR4_U8 = INICIO_JOGADOR4_U32 + PALAVRAS_JOGADOR4_U32 * 4;
/** Fim do layout v7 da F-007 (a regressão v7 compara os bytes até aqui). */
export const BYTES_DO_LAYOUT_7 = INICIO_JOGADOR4_U8 + BYTES_JOGADOR4_U8;
// F-008: tudo depois de BYTES_DO_LAYOUT_7, em múltiplos de 4 bytes (decisoes-F-008 §1).
const INICIO_FOGUEIRA = BYTES_DO_LAYOUT_7;
const INICIO_FOGUEIRA_U32 = INICIO_FOGUEIRA + FLOATS_FOGUEIRA * 4;
const INICIO_FOGUEIRA_U8 = INICIO_FOGUEIRA_U32 + PALAVRAS_FOGUEIRA_U32 * 4;
const INICIO_OBSTACULO_ATIVO = INICIO_FOGUEIRA_U8 + BYTES_FOGUEIRA_U8;
const INICIO_INIMIGOS8_U8 = INICIO_OBSTACULO_ATIVO + OBSTACULOS_MAXIMOS;
const INICIO_INIMIGOS8_U16 = INICIO_INIMIGOS8_U8 + CAMPOS_INIMIGO8_U8.length * CAPACIDADE_DE_INIMIGOS;
export const BYTES_ESTADO = INICIO_INIMIGOS8_U16 + CAPACIDADE_DE_INIMIGOS * 2;

/** Deslocamento de cada seção no buffer (o teste de layout trava todos e o alinhamento de cada view). */
export const LAYOUT = {
  cabecalho: 0,
  rng: BYTES_CAB,
  jogador: INICIO_JOGADOR,
  jogadorU8: INICIO_JOGADOR_U8,
  build: INICIO_BUILD,
  mundo: INICIO_MUNDO,
  poolDeInimigos: INICIO_POOL,
  inimigosF32: INICIO_INIMIGOS_F32,
  inimigosU8: INICIO_INIMIGOS_U8,
  poolDeProjeteis: INICIO_POOL_PROJETEIS,
  projeteisF32: INICIO_PROJETEIS_F32,
  projeteisU32: INICIO_PROJETEIS_U32,
  projeteisU16: INICIO_PROJETEIS_U16,
  projeteisU8: INICIO_PROJETEIS_U8,
  progressao: INICIO_PROGRESSAO,
  jogador2: INICIO_JOGADOR2,
  atributos: INICIO_ATRIBUTOS,
  passivas: INICIO_PASSIVAS,
  oferta: INICIO_OFERTA,
  filaDeBaus: INICIO_FILA_DE_BAUS,
  mundo2: INICIO_MUNDO2,
  poolDePickups: INICIO_POOL_PICKUPS,
  pickupsF32: INICIO_PICKUPS_F32,
  pickupsU32: INICIO_PICKUPS_U32,
  pickupsU8: INICIO_PICKUPS_U8,
  poolDeEfeitos: INICIO_POOL_EFEITOS,
  efeitosF32: INICIO_EFEITOS_F32,
  efeitosBits: INICIO_EFEITOS_BITS,
  efeitosU8: INICIO_EFEITOS_U8,
  fimDoV5: BYTES_DO_LAYOUT_5,
  jogador3: INICIO_JOGADOR3,
  jogador3U8: INICIO_JOGADOR3_U8,
  jogador3U16: INICIO_JOGADOR3_U16,
  vagas3: INICIO_VAGAS3,
  inimigos3F32: INICIO_INIMIGOS3_F32,
  inimigos3U8: INICIO_INIMIGOS3_U8,
  projeteis3U16: INICIO_PROJETEIS3_U16,
  fimDoV6: BYTES_DO_LAYOUT_6,
  jogador4: INICIO_JOGADOR4,
  jogador4U32: INICIO_JOGADOR4_U32,
  jogador4U8: INICIO_JOGADOR4_U8,
  fimDoV7: BYTES_DO_LAYOUT_7,
  fogueira: INICIO_FOGUEIRA,
  fogueiraU32: INICIO_FOGUEIRA_U32,
  fogueiraU8: INICIO_FOGUEIRA_U8,
  obstaculoAtivo: INICIO_OBSTACULO_ATIVO,
  inimigos8U8: INICIO_INIMIGOS8_U8,
  inimigos8U16: INICIO_INIMIGOS8_U16,
  fim: BYTES_ESTADO,
} as const;

export interface Estado {
  readonly buffer: ArrayBuffer;
  /** O buffer inteiro, para o hash e para o save. */
  readonly bytes: Uint8Array;
  readonly cab: Uint32Array;
  /** Estados dos fluxos de RNG, 4 palavras por fluxo, na ordem de FLUXOS. */
  readonly rng: Uint32Array;
  /** Campos Float32 do jogador, pelos índices de JOGADOR. */
  readonly jogador: Float32Array;
  /** Campos Uint8 do jogador, pelos índices de JOGADOR_U8. */
  readonly jogadorU8: Uint8Array;
  /** Stamina e direção da esquiva, pelos índices de JOGADOR3 (F-006). */
  readonly jogador3: Float32Array;
  /** Timers e flags de esquiva, aparo, Poder e Sal do jogador, pelos índices de JOGADOR3_U8. */
  readonly jogador3U8: Uint8Array;
  /** Alvo aparado e ameaças aparáveis, pelos índices de JOGADOR3_U16. */
  readonly jogador3U16: Uint16Array;
  /** Frasco (cura), dano recebido e posição da mancha, pelos índices de JOGADOR4 (F-007). */
  readonly jogador4: Float32Array;
  /** Contadores e Almas da mancha, pelos índices de JOGADOR4_U32 (F-007). */
  readonly jogador4U32: Uint32Array;
  /** Fase, causa do fim, Apagar, cargas e passo do Frasco e mancha ativa, pelos índices de JOGADOR4_U8 (F-007). */
  readonly jogador4U8: Uint8Array;
  /** Fogueira, centro da arena e empurrão do Grito, pelos índices de FOGUEIRA_F32 (F-008). */
  readonly fogueiraF32: Float32Array;
  /** `idVigilia` e `convocacoes`, pelos índices de FOGUEIRA_U32 (F-008). */
  readonly fogueiraU32: Uint32Array;
  /** Etapa, marcos, arena, Coroados vivos, Fogueira e empurrão, pelos índices de FOGUEIRA_U8 (F-008). */
  readonly fogueiraU8: Uint8Array;
  /** 1 = o obstáculo i (na ordem do JSON da região) colide; 0 = tirado pela arena (AR3). Nasce em 1 nos `n` primeiros. */
  readonly obstaculoAtivo: Uint8Array;
  /** Build: as 5 vagas de arma. */
  readonly build: Build;
  /** Bloco do mundo e do diretor, pelos índices de MUNDO. */
  readonly mundo: Uint32Array;
  /** Pilha de livres, lista densa e gerações dos slots de inimigo. */
  readonly pool: Pool;
  readonly inimigos: CamposDosInimigos;
  /** Pool dos projéteis do jogador (facas). */
  readonly poolDeProjeteis: Pool;
  readonly projeteis: CamposDosProjeteis;
  /** Progressão (nível, XP, fila de modais, Almas), pelos índices de PROGRESSAO. */
  readonly progresso: Uint32Array;
  /** 2º registro Float32 do jogador, pelos índices de JOGADOR2. */
  readonly jogador2: Float32Array;
  /** Atributos, na ordem de ATRIBUTOS (FOR, DES, INT, FE, VIG). */
  readonly atributos: Uint8Array;
  /** As 6 vagas de passiva, na ordem de aquisição; código 0 = vazia. */
  readonly passivas: { readonly codigo: Uint8Array; readonly nivel: Uint8Array };
  /** A oferta aberta: tipo (TIPO_DE_CARTA) e item (código) de cada carta. */
  readonly oferta: { readonly tipo: Uint8Array; readonly item: Uint8Array };
  /** Baús abertos por fechar, em ordem (BAU, BYTES_POR_BAU). */
  readonly filaDeBaus: Uint8Array;
  /** 2º bloco do mundo, pelos índices de MUNDO2. */
  readonly mundo2: Uint32Array;
  readonly poolDePickups: Pool;
  readonly pickups: CamposDosPickups;
  readonly poolDeEfeitos: Pool;
  readonly efeitos: CamposDosEfeitos;
  /** Anel de eventos: fora de `bytes`, do hash e do save; só a simulação escreve (decisoes-F-004 §4). */
  readonly eventos: AnelDeEventos;
  /** Dano vivo: fora de `bytes`; recalculado nos eventos raros (decisoes-F-005 P4). */
  readonly derivados: Derivados;
}

export function criarEstado(seed: number, dados: DadosDaVigilia, params: Partial<ParametrosDaVigilia> = {}): Estado {
  const buffer = new ArrayBuffer(BYTES_ESTADO);
  const f32 = (i: number): Float32Array =>
    new Float32Array(buffer, INICIO_INIMIGOS_F32 + i * FLOATS_POR_CAMPO * 4, FLOATS_POR_CAMPO);
  const u8 = (nome: (typeof CAMPOS_U8)[number]): Uint8Array =>
    new Uint8Array(buffer, INICIO_INIMIGOS_U8 + CAMPOS_U8.indexOf(nome) * CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_INIMIGOS);
  const pf32 = (nome: (typeof CAMPOS_PROJETIL_F32)[number]): Float32Array =>
    new Float32Array(buffer, INICIO_PROJETEIS_F32 + CAMPOS_PROJETIL_F32.indexOf(nome) * P * 4, P);
  const pu8 = (nome: (typeof CAMPOS_PROJETIL_U8)[number]): Uint8Array =>
    new Uint8Array(buffer, INICIO_PROJETEIS_U8 + CAMPOS_PROJETIL_U8.indexOf(nome) * P, P);
  const u83 = (nome: (typeof CAMPOS_INIMIGO3_U8)[number]): Uint8Array =>
    new Uint8Array(buffer, INICIO_INIMIGOS3_U8 + CAMPOS_INIMIGO3_U8.indexOf(nome) * CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_INIMIGOS);
  const V = VAGAS_DE_ARMA;
  const estado: Estado = {
    buffer,
    bytes: new Uint8Array(buffer),
    cab: new Uint32Array(buffer, 0, PALAVRAS_CAB),
    rng: new Uint32Array(buffer, BYTES_CAB, PALAVRAS_RNG),
    jogador: new Float32Array(buffer, INICIO_JOGADOR, FLOATS_JOGADOR),
    jogadorU8: new Uint8Array(buffer, INICIO_JOGADOR_U8, BYTES_JOGADOR_U8),
    jogador3: new Float32Array(buffer, INICIO_JOGADOR3, FLOATS_JOGADOR3),
    jogador3U8: new Uint8Array(buffer, INICIO_JOGADOR3_U8, BYTES_JOGADOR3_U8),
    jogador3U16: new Uint16Array(buffer, INICIO_JOGADOR3_U16, BYTES_JOGADOR3_U16 / 2),
    jogador4: new Float32Array(buffer, INICIO_JOGADOR4, FLOATS_JOGADOR4),
    jogador4U32: new Uint32Array(buffer, INICIO_JOGADOR4_U32, PALAVRAS_JOGADOR4_U32),
    jogador4U8: new Uint8Array(buffer, INICIO_JOGADOR4_U8, BYTES_JOGADOR4_U8),
    fogueiraF32: new Float32Array(buffer, INICIO_FOGUEIRA, FLOATS_FOGUEIRA),
    fogueiraU32: new Uint32Array(buffer, INICIO_FOGUEIRA_U32, PALAVRAS_FOGUEIRA_U32),
    fogueiraU8: new Uint8Array(buffer, INICIO_FOGUEIRA_U8, BYTES_FOGUEIRA_U8),
    obstaculoAtivo: new Uint8Array(buffer, INICIO_OBSTACULO_ATIVO, OBSTACULOS_MAXIMOS),
    build: {
      recarga: new Uint16Array(buffer, INICIO_BUILD, V),
      esperaPulso: new Uint16Array(buffer, INICIO_BUILD + 2 * V, V),
      codigo: new Uint8Array(buffer, INICIO_BUILD + 4 * V, V),
      nivel: new Uint8Array(buffer, INICIO_BUILD + 5 * V, V),
      golpe: new Uint8Array(buffer, INICIO_BUILD + 6 * V, V),
      esperaGolpe: new Uint8Array(buffer, INICIO_BUILD + 7 * V, V),
      caSeq: new Uint8Array(buffer, INICIO_VAGAS3, V),
      caEspera: new Uint8Array(buffer, INICIO_VAGAS3 + V, V),
    },
    mundo: new Uint32Array(buffer, INICIO_MUNDO, PALAVRAS_MUNDO),
    pool: viewsDoPool(buffer, INICIO_POOL, CAPACIDADE_DE_INIMIGOS),
    inimigos: {
      x: f32(CAMPOS_F32.indexOf('x')),
      y: f32(CAMPOS_F32.indexOf('y')),
      xAnt: f32(CAMPOS_F32.indexOf('xAnt')),
      yAnt: f32(CAMPOS_F32.indexOf('yAnt')),
      hp: f32(CAMPOS_F32.indexOf('hp')),
      dano: f32(CAMPOS_F32.indexOf('dano')),
      tipo: u8('tipo'),
      convertido: u8('convertido'),
      salPct: u8('salPct'),
      salPassos: u8('salPassos'),
      kbPassos: u8('kbPassos'),
      miraX: new Float32Array(buffer, INICIO_INIMIGOS3_F32, FLOATS_POR_CAMPO),
      miraY: new Float32Array(buffer, INICIO_INIMIGOS3_F32 + FLOATS_POR_CAMPO * 4, FLOATS_POR_CAMPO),
      quebradaPassos: u83('quebradaPassos'),
      ataqueFase: u83('ataqueFase'),
      ataqueTimer: u83('ataqueTimer'),
      ataqueId: new Uint8Array(buffer, INICIO_INIMIGOS8_U8, CAPACIDADE_DE_INIMIGOS),
      ataqueSeq: new Uint8Array(buffer, INICIO_INIMIGOS8_U8 + CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_INIMIGOS),
      convocaEspera: new Uint16Array(buffer, INICIO_INIMIGOS8_U16, CAPACIDADE_DE_INIMIGOS),
    },
    poolDeProjeteis: viewsDoPool(buffer, INICIO_POOL_PROJETEIS, P),
    projeteis: {
      x: pf32('x'),
      y: pf32('y'),
      xAnt: pf32('xAnt'),
      yAnt: pf32('yAnt'),
      vx: pf32('vx'),
      vy: pf32('vy'),
      dano: pf32('dano'),
      ultimoAlvo: new Uint32Array(buffer, INICIO_PROJETEIS_U32, P),
      vida: new Uint16Array(buffer, INICIO_PROJETEIS_U16, P),
      tipo: pu8('tipo'),
      arma: pu8('arma'),
      perfuracoes: pu8('perfuracoes'),
      salPct: pu8('salPct'),
      salPassos: pu8('salPassos'),
      donoSlot: new Uint16Array(buffer, INICIO_PROJETEIS3_U16, P),
      donoGeracao: new Uint16Array(buffer, INICIO_PROJETEIS3_U16 + P * 2, P),
    },
    progresso: new Uint32Array(buffer, INICIO_PROGRESSAO, PALAVRAS_PROGRESSAO),
    jogador2: new Float32Array(buffer, INICIO_JOGADOR2, FLOATS_JOGADOR2),
    atributos: new Uint8Array(buffer, INICIO_ATRIBUTOS, NUMERO_DE_ATRIBUTOS),
    passivas: {
      codigo: new Uint8Array(buffer, INICIO_PASSIVAS, VAGAS_DE_PASSIVA),
      nivel: new Uint8Array(buffer, INICIO_PASSIVAS + VAGAS_DE_PASSIVA, VAGAS_DE_PASSIVA),
    },
    oferta: {
      tipo: new Uint8Array(buffer, INICIO_OFERTA, CARTAS),
      item: new Uint8Array(buffer, INICIO_OFERTA + CARTAS, CARTAS),
    },
    filaDeBaus: new Uint8Array(buffer, INICIO_FILA_DE_BAUS, FILA_DE_BAUS * BYTES_POR_BAU),
    mundo2: new Uint32Array(buffer, INICIO_MUNDO2, PALAVRAS_MUNDO2),
    poolDePickups: viewsDoPool(buffer, INICIO_POOL_PICKUPS, K),
    pickups: {
      x: new Float32Array(buffer, INICIO_PICKUPS_F32, K),
      y: new Float32Array(buffer, INICIO_PICKUPS_F32 + K * 4, K),
      xAnt: new Float32Array(buffer, INICIO_PICKUPS_F32 + 2 * K * 4, K),
      yAnt: new Float32Array(buffer, INICIO_PICKUPS_F32 + 3 * K * 4, K),
      valor: new Uint32Array(buffer, INICIO_PICKUPS_U32, K),
      tipo: new Uint8Array(buffer, INICIO_PICKUPS_U8, K),
    },
    poolDeEfeitos: viewsDoPool(buffer, INICIO_POOL_EFEITOS, F),
    efeitos: {
      x: new Float32Array(buffer, INICIO_EFEITOS_F32, F),
      y: new Float32Array(buffer, INICIO_EFEITOS_F32 + F * 4, F),
      dirX: new Float32Array(buffer, INICIO_EFEITOS_F32 + 2 * F * 4, F),
      dirY: new Float32Array(buffer, INICIO_EFEITOS_F32 + 3 * F * 4, F),
      dano: new Float32Array(buffer, INICIO_EFEITOS_F32 + 4 * F * 4, F),
      bits: new Uint32Array(buffer, INICIO_EFEITOS_BITS, F * PALAVRAS_DO_BITSET),
      idade: new Uint8Array(buffer, INICIO_EFEITOS_U8, F),
      arma: new Uint8Array(buffer, INICIO_EFEITOS_U8 + F, F),
    },
    eventos: criarAnel(),
    derivados: {
      danoVivo: new Float64Array(POR_NIVEL),
      danoOnda: new Float64Array(CODIGOS_DE_ARMA),
      danoVivoPoder: new Float64Array(POR_NIVEL),
      danoOndaPoder: new Float64Array(CODIGOS_DE_ARMA),
    },
  };
  reiniciarEstado(estado, seed, dados, params);
  return estado;
}

/**
 * Zera o estado e o anel, grava os parâmetros, semeia todos os fluxos, esvazia
 * os pools, põe o jogador no início, apontando para cima, com o HP inicial, e
 * equipa a build inicial. A seed é um inteiro de 32 bits sem sinal; o TETO, 300
 * ou 500. Só a build pedida por parâmetro aloca (a validação).
 */
export function reiniciarEstado(e: Estado, seed: number, dados: DadosDaVigilia, params: Partial<ParametrosDaVigilia> = {}): void {
  const p = { ...PARAMETROS_PADRAO, ...params };
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seed fora de u32: ${seed}`);
  if (p.teto !== 300 && p.teto !== 500) throw new Error(`TETO inválido: ${p.teto}`);
  if (p.linhaFixa !== LINHA_LIVRE && !(Number.isInteger(p.linhaFixa) && p.linhaFixa >= 0 && p.linhaFixa < dados.timeline.linhas)) {
    throw new Error(`linha fixa fora da timeline: ${p.linhaFixa}`);
  }
  if (!Number.isInteger(p.xpInicial) || p.xpInicial < 0) throw new Error(`XP inicial inválida: ${p.xpInicial}`);
  if (!Number.isInteger(p.relogioInicial) || p.relogioInicial < 0) throw new Error(`relógio inicial inválido: ${p.relogioInicial}`);
  if (p.relogioInicial > 0 && p.linhaFixa === LINHA_LIVRE && !p.inicioLivre) throw new Error('relógio inicial > 0 exige linha fixa (decisoes-F-005 §7)');
  if (dados.progressao.poolDePickups !== CAPACIDADE_DE_PICKUPS) throw new Error('progressao.json: pool_pickups difere do layout');
  if (p.baus.length > CAPACIDADE_DE_PICKUPS) throw new Error('baús demais no início');
  const staminaMax = dados.combate.staminaMax;
  const stamina = p.staminaInicial ?? staminaMax;
  if (!(stamina >= 0 && stamina <= staminaMax)) throw new Error(`stamina inicial fora de 0 a ${staminaMax}: ${stamina}`);
  if (!Number.isInteger(p.almasIniciais) || p.almasIniciais < 0 || p.almasIniciais >= LIMITE_DE_ALMAS) throw new Error(`Almas iniciais inválidas: ${p.almasIniciais}`);
  if (p.mancha !== null) {
    const m = p.mancha;
    if (!Number.isInteger(m.almas) || m.almas < 1 || m.almas >= LIMITE_DE_ALMAS) throw new Error(`mancha: Almas inválidas: ${m.almas}`);
    if (!(m.x >= 0 && m.x < LARGURA_DO_MAPA && m.y >= 0 && m.y < ALTURA_DO_MAPA)) throw new Error('mancha fora do mapa');
  }
  if (p.inimigos.length > CAPACIDADE_DE_INIMIGOS) throw new Error('inimigos demais no início');
  for (const i of p.inimigos) if (!(Math.abs(i.dx) <= 500 && Math.abs(i.dy) <= 500)) throw new Error('inimigo inicial fora do alcance');
  for (const b of p.baus) if (!(Math.abs(b.dx) <= 500 && Math.abs(b.dy) <= 500)) throw new Error('baú inicial fora do alcance');
  e.bytes.fill(0);
  e.cab[CAB.versao] = VERSAO_LAYOUT;
  e.cab[CAB.seed] = seed >>> 0;
  e.cab[CAB.tutoriaisVistos] = p.tutoriaisVistos >>> 0;
  e.cab[CAB.disposicao] = dados.impressao >>> 0;
  e.cab[CAB.teto] = p.teto;
  e.cab[CAB.cenario] = p.cenario >>> 0;
  e.cab[CAB.linhaFixa] = p.linhaFixa >>> 0;
  e.cab[CAB.rotacao] = p.rotacao >>> 0;
  e.cab[CAB.relogio] = p.relogioInicial >>> 0;
  for (const fluxo of FLUXOS) semear(e.rng, baseDoFluxo(fluxo), seed, fluxo);
  const j = e.jogador;
  j[JOGADOR.x] = j[JOGADOR.xAnt] = dados.inicioX;
  j[JOGADOR.y] = j[JOGADOR.yAnt] = dados.inicioY;
  j[JOGADOR.dirX] = 0;
  j[JOGADOR.dirY] = -1;
  j[JOGADOR.hp] = dados.hpInicial;
  e.jogadorU8[JOGADOR_U8.promptMover] = p.tutoriaisVistos & TUTORIAL.mover ? PROMPT.cumprido : PROMPT.aguardando;
  // F-006: stamina cheia (ou a do cenário) e um prompt por bit de tutorial já visto.
  e.jogador3[JOGADOR3.stamina] = stamina;
  e.jogador3U8[JOGADOR3_U8.promptEsquiva] = p.tutoriaisVistos & TUTORIAL.esquiva ? PROMPT.cumprido : PROMPT.aguardando;
  e.jogador3U8[JOGADOR3_U8.promptAparo] = p.tutoriaisVistos & TUTORIAL.aparo ? PROMPT.cumprido : PROMPT.aguardando;
  // F-007: Vigília viva, cargas do Frasco e a mancha do meta (nasce no passo 0, sem RNG; MC6).
  e.jogador4U8[JOGADOR4_U8.fase] = FASE.viva;
  e.jogador4U8[JOGADOR4_U8.frascoCargas] = dados.combate.frascoCargas;
  if (p.mancha !== null) {
    e.jogador4U8[JOGADOR4_U8.manchaAtiva] = 1;
    e.jogador4[JOGADOR4.manchaX] = p.mancha.x;
    e.jogador4[JOGADOR4.manchaY] = p.mancha.y;
    e.jogador4U32[JOGADOR4_U32.manchaAlmas] = p.mancha.almas;
  }
  e.mundo[MUNDO.intensidade10] = 10;
  // F-008: obstáculos ativos e a etapa de partida (decisoes-F-008 AR1, ADR-0010 §1): os marcos que o relógio
  // inicial já passou contam como iniciados (um ?inicio=19:00 não abre os marcos de 5, 10 e 15), e de 20:00 em diante é CHEFE.
  if (dados.obstaculos.n > OBSTACULOS_MAXIMOS) throw new Error(`obstáculos demais: ${dados.obstaculos.n} > ${OBSTACULOS_MAXIMOS}`);
  e.obstaculoAtivo.fill(1, 0, dados.obstaculos.n);
  const marcos = dados.marcos;
  let passados = 0;
  while (passados < marcos.n && marcos.limiar[passados]! <= p.relogioInicial) passados++;
  e.fogueiraU8[FOGUEIRA_U8.marcosIniciados] = passados;
  e.fogueiraU8[FOGUEIRA_U8.etapa] = p.relogioInicial >= marcos.chefeEm ? ETAPA.chefe : ETAPA.hora;
  esvaziarPool(e.pool);
  esvaziarPool(e.poolDeProjeteis);
  esvaziarAnel(e.eventos);
  if (p.armas === null) {
    equiparNaVaga(e, 0, dados.armas.inicial, 1);
  } else {
    validarBuild(p.armas, dados);
    for (let v = 0; v < p.armas.length; v++) equiparNaVaga(e, v, p.armas[v]!.codigo, p.armas[v]!.nivel);
  }
  // F-005: progressão no nível 1, perfil do Vigilante, hpMax, passivas, baús e o dano vivo.
  const pr = dados.progressao;
  e.progresso[PROGRESSAO.nivel] = 1;
  e.progresso[PROGRESSAO.xp] = p.xpInicial;
  e.progresso[PROGRESSAO.xpTotal] = p.xpInicial;
  e.progresso[PROGRESSAO.almas] = p.almasIniciais;
  e.atributos.set(pr.atributosIniciais);
  e.jogador2[JOGADOR2.hpMax] = dados.hpInicial;
  esvaziarPool(e.poolDePickups);
  esvaziarPool(e.poolDeEfeitos);
  validarPassivas(p.passivas, dados);
  for (let v = 0; v < p.passivas.length; v++) {
    e.passivas.codigo[v] = p.passivas[v]!.codigo;
    e.passivas.nivel[v] = p.passivas[v]!.nivel;
  }
  // Baús iniciais (cenário bau_uniao): o pool está vazio, e o índice de queda é a ordem da lista.
  for (const b of p.baus) {
    const s = alocar(e.poolDePickups);
    const indice = e.mundo2[MUNDO2.bausSoltos]! + 1;
    e.mundo2[MUNDO2.bausSoltos] = indice;
    e.pickups.x[s] = e.pickups.xAnt[s] = normalizarNoToro(dados.inicioX + b.dx, LARGURA_DO_MAPA);
    e.pickups.y[s] = e.pickups.yAnt[s] = normalizarNoToro(dados.inicioY + b.dy, ALTURA_DO_MAPA);
    e.pickups.valor[s] = indice;
    e.pickups.tipo[s] = b.dourado ? TIPO_DE_PICKUP.bauDourado : TIPO_DE_PICKUP.bauComum;
  }
  // Inimigos postos à mão (receitas oco_grande_sozinho e novica_sozinha; testes): depois do relógio e da linha fixa, que escalam o HP.
  for (const i of p.inimigos) postarInimigoInicial(e, dados, i);
  recalcularDano(e, dados);
}

/**
 * Nasce um inimigo inicial: a mesma gravação de `nascerInimigo` (inimigos.ts), que
 * não se importa aqui para não criar um ciclo de valores com o estado. Um teste
 * confere que as duas dão os mesmos bytes.
 */
function postarInimigoInicial(e: Estado, dados: DadosDaVigilia, i: InimigoInicial): void {
  const codigo = i.codigo;
  if (dados.tipos.existe[codigo] !== 1) throw new Error(`inimigo inicial: o tipo ${codigo} não nasce nesta Vigília`);
  const slot = alocar(e.pool);
  if (slot < 0) throw new Error('inimigos iniciais: sem slot livre');
  const fixa = e.cab[CAB.linhaFixa]!;
  const minuto = fixa !== LINHA_LIVRE ? fixa : Math.min(Math.floor(e.cab[CAB.relogio]! / PASSOS_POR_MINUTO), dados.timeline.linhas - 1);
  const ini = e.inimigos;
  ini.x[slot] = ini.xAnt[slot] = normalizarNoToro(dados.inicioX + i.dx, LARGURA_DO_MAPA);
  ini.y[slot] = ini.yAnt[slot] = normalizarNoToro(dados.inicioY + i.dy, ALTURA_DO_MAPA);
  ini.tipo[slot] = codigo;
  gravarHpNoSpawn(ini.hp, slot, dados.tipos.hpBase[codigo]!, minuto, e.mundo[MUNDO.intensidade10]!);
  gravarDanoNoSpawn(ini.dano, slot, dados.tipos.danoBase[codigo]!, minuto);
  ini.convocaEspera[slot] = dados.combate.convocaPassos[codigo]!;
  if (codigo === TIPO.oco_grande_coroado) e.fogueiraU8[FOGUEIRA_U8.coroadosVivos] = e.fogueiraU8[FOGUEIRA_U8.coroadosVivos]! + 1;
}

/** Recusa passivas impossíveis na montagem (como validarBuild). */
function validarPassivas(passivas: readonly PassivaInicial[], dados: DadosDaVigilia): void {
  if (passivas.length > VAGAS_DE_PASSIVA) throw new Error(`passivas: ${passivas.length}; o máximo é ${VAGAS_DE_PASSIVA}`);
  const vistas = new Set<number>();
  const max = dados.progressao.passivaNivelMax;
  for (const p of passivas) {
    if (!Number.isInteger(p.codigo) || p.codigo <= 0 || p.codigo >= max.length || max[p.codigo] === 0) throw new Error(`passiva desconhecida: ${p.codigo}`);
    if (!Number.isInteger(p.nivel) || p.nivel < 1 || p.nivel > max[p.codigo]!) throw new Error(`passiva ${p.codigo}: nível ${p.nivel}`);
    if (vistas.has(p.codigo)) throw new Error(`passiva repetida: ${p.codigo}`);
    vistas.add(p.codigo);
  }
}

/** Cópia de bytes de outro estado: refaz os derivados, que ficam fora do buffer (decisoes-F-005 P4). */
export function sincronizarDerivados(e: Estado, dados: DadosDaVigilia): void {
  recalcularDano(e, dados);
}

/** Recusa uma build impossível na montagem (design/decisoes-F-004.md §5). */
function validarBuild(armas: readonly ArmaInicial[], dados: DadosDaVigilia): void {
  if (armas.length > VAGAS_DE_ARMA) throw new Error(`build com ${armas.length} armas; o máximo é ${VAGAS_DE_ARMA}`);
  const vistas = new Set<number>();
  for (const a of armas) {
    const t = dados.armas;
    if (!Number.isInteger(a.codigo) || a.codigo <= 0 || a.codigo >= t.nivelMax.length || t.nivelMax[a.codigo] === 0) {
      throw new Error(`build: arma desconhecida ou fora desta Vigília: ${a.codigo}`);
    }
    if (!Number.isInteger(a.nivel) || a.nivel < 1 || a.nivel > t.nivelMax[a.codigo]!) {
      throw new Error(`build: nível ${a.nivel} fora de 1 a ${t.nivelMax[a.codigo]} na arma ${a.codigo}`);
    }
    if (vistas.has(a.codigo)) throw new Error(`build: arma repetida: ${a.codigo}`);
    vistas.add(a.codigo);
  }
}

/** Ocupa a vaga com a arma no nível dado e os timers em 0: ela age no próximo passo (W16). */
function equiparNaVaga(e: Estado, vaga: number, codigo: number, nivel: number): void {
  const b = e.build;
  b.codigo[vaga] = codigo;
  b.nivel[vaga] = nivel;
  b.recarga[vaga] = 0;
  b.esperaPulso[vaga] = 0;
  b.golpe[vaga] = 0;
  b.esperaGolpe[vaga] = 0;
  b.caSeq[vaga] = 0;
  b.caEspera[vaga] = 0;
}

/**
 * Equipa a arma na 1ª vaga livre, com os timers em 0 (testes, receitas e, na
 * F-005, o level up). Devolve a vaga; lança erro sem vaga livre ou com a arma
 * repetida.
 */
export function equiparArma(e: Estado, dados: DadosDaVigilia, codigo: number, nivel: number): number {
  const b = e.build;
  const atuais: ArmaInicial[] = [];
  let livre = -1;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) {
    if (b.codigo[v] === 0) {
      if (livre < 0) livre = v;
    } else atuais.push({ codigo: b.codigo[v]!, nivel: b.nivel[v]! });
  }
  if (livre < 0) throw new Error('equiparArma: nenhuma vaga livre');
  validarBuild([...atuais, { codigo, nivel }], dados);
  equiparNaVaga(e, livre, codigo, nivel);
  return livre;
}

/** Esvazia a build (testes que medem uma arma por vez). */
export function esvaziarBuild(e: Estado): void {
  const b = e.build;
  b.codigo.fill(0);
  b.nivel.fill(0);
  b.recarga.fill(0);
  b.esperaPulso.fill(0);
  b.golpe.fill(0);
  b.esperaGolpe.fill(0);
  b.caSeq.fill(0);
  b.caEspera.fill(0);
}

/** Deslocamento do fluxo dentro de `estado.rng`. */
export function baseDoFluxo(fluxo: Fluxo): number {
  return indiceDoFluxo(fluxo) * PALAVRAS_POR_FLUXO;
}

/**
 * FNV-1a de 32 bits sobre o buffer inteiro (ADR-0003 §3), com os slots mortos zerados. A palavra `idVigilia` entra como zero
 * (ADR-0010 §9, divergência da correção Node × Chromium): ela é a identidade do save, reservada no meta da produção, e não
 * faz parte da simulação; contá-la fazia a Vigília do navegador (id 1) divergir da do Node (id 0) em qualquer seed.
 */
export function hashEstado(e: Estado): number {
  const b = e.bytes;
  const ini = INICIO_FOGUEIRA_U32 + FOGUEIRA_U32.idVigilia * 4;
  let h = fnv1aBytes(FNV_BASE, b.subarray(0, ini));
  for (let k = 0; k < 4; k++) h = fnv1aByte(h, 0);
  return fnv1aBytes(h, b.subarray(ini + 4));
}

/**
 * Hash por seção (ADR-0002 §5), para achar a 1ª seção divergente quando dois
 * hashes não batem (testes e build de debug; aloca as views).
 */
export function hashPorSecao(
  e: Estado,
): Record<'cabecalho' | 'rng' | 'jogador' | 'mundo' | 'inimigos' | 'projeteis' | 'progressao' | 'pickups' | 'efeitos' | 'combate' | 'vigilia' | 'fogueira', number> {
  const secao = (inicio: number, fim: number): number => fnv1aBytes(FNV_BASE, new Uint8Array(e.buffer, inicio, fim - inicio));
  return {
    cabecalho: secao(0, BYTES_CAB),
    rng: secao(BYTES_CAB, INICIO_JOGADOR),
    jogador: secao(INICIO_JOGADOR, INICIO_MUNDO),
    mundo: secao(INICIO_MUNDO, INICIO_POOL),
    inimigos: secao(INICIO_POOL, INICIO_POOL_PROJETEIS),
    projeteis: secao(INICIO_POOL_PROJETEIS, BYTES_DO_LAYOUT_4),
    progressao: secao(INICIO_PROGRESSAO, INICIO_POOL_PICKUPS),
    pickups: secao(INICIO_POOL_PICKUPS, INICIO_POOL_EFEITOS),
    efeitos: secao(INICIO_POOL_EFEITOS, BYTES_DO_LAYOUT_5),
    combate: secao(BYTES_DO_LAYOUT_5, BYTES_DO_LAYOUT_6),
    vigilia: secao(BYTES_DO_LAYOUT_6, BYTES_DO_LAYOUT_7),
    fogueira: secao(BYTES_DO_LAYOUT_7, BYTES_ESTADO),
  };
}
