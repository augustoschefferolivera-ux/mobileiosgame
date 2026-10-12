// Tabela da progressão (design/decisoes-F-005.md §2 a §4 e §7): o custo de
// cada nível, as faixas e o movimento das Cinzas, os números do level up e do
// baú, as passivas e as Uniões, montados uma vez a partir de progressao.json,
// passivas.json, unioes.json e do Vigilante. A simulação lê só arrays e
// inteiros; um número que falta é erro aqui, no boot.
import { ATRIBUTOS, NUMERO_DE_ATRIBUTOS, codigoDaArma, type TabelaDeArmas } from '../armas/tabela';
import { PASSOS_POR_MINUTO } from '../diretor/timeline';
import { CORPO_PX } from '../mundo/tipos';

/** Códigos de passiva; 0 = vaga vazia. Só crescem no fim (o estado guarda o código). */
export const PASSIVA = { vazia: 0, elmo_sem_rosto: 1, luvas_de_fole: 2 } as const;
/** Ids por código (o índice é o código). */
export const IDS_DE_PASSIVA = ['', 'elmo_sem_rosto', 'luvas_de_fole'] as const;
export const CODIGOS_DE_PASSIVA = IDS_DE_PASSIVA.length;
/** Efeito por nível de uma passiva. */
export const EFEITO_DE_PASSIVA = { nenhum: 0, poderPct: 1, armadura: 2 } as const;
const EFEITOS: Record<string, number> = { poder_pct: EFEITO_DE_PASSIVA.poderPct, armadura: EFEITO_DE_PASSIVA.armadura };

/** Cores das Cinzas por faixa de valor (Q-27). */
export const COR_DA_CINZA = { azul: 1, verde: 2, vermelha: 3 } as const;

/** O que se lê de progressao.json (progressao.schema.json). */
export interface ProgressaoDoJson {
  readonly curva_xp: { readonly base: number; readonly linear: number; readonly quadratico_decimos: number };
  readonly nivel_maximo_tecnico: number;
  readonly cinzas: {
    readonly faixas: readonly { readonly a_partir_de: number; readonly cor: string }[];
    readonly ima_corpos: number;
    readonly velocidade_corpos_s: number;
    readonly coleta_corpos: number;
  };
  readonly pool_pickups: number;
  readonly level_up: {
    readonly melhoria_pct: number;
    readonly passiva_uniao_pct: number;
    readonly passiva_uniao_a_partir_do_min: number;
    readonly bolsa_almas: number;
  };
  readonly baus: {
    readonly itens: readonly { readonly quantidade: number; readonly pct: number }[];
    readonly uniao_a_partir_do_min: number;
    readonly abertura_corpos: number;
    readonly fila: number;
  };
}

/** O que se lê de passivas.json e unioes.json. */
export interface PassivaDoJson {
  readonly id: string;
  readonly nivel_max: number;
  readonly efeito_por_nivel: { readonly tipo: string; readonly valor: number };
}
export interface UniaoDoJson {
  readonly arma: string;
  readonly arma_nivel: number;
  readonly passiva: string;
  readonly resultado: string;
}

/** O que a progressão lê do Vigilante (vigilante.schema.json). */
export interface VigilanteDaProgressao {
  readonly hp: number;
  readonly passiva: { readonly hp_max_pct: number };
  readonly atributos: Readonly<Record<string, number>>;
  readonly hp_por_nivel: number | null;
  readonly ponto_por_nivel: { readonly quantidade: number; readonly atributo: string; readonly teto: number | null };
}

export interface FontesDaProgressao {
  readonly progressao: ProgressaoDoJson;
  readonly passivas: readonly PassivaDoJson[];
  readonly unioes: readonly UniaoDoJson[];
  /** `forja_custo_almas_por_hora` de unioes.json (FG5): custo em Almas por hora da Fogueira ("1" a "3"). */
  readonly forjaCustoPorHora: Readonly<Record<string, number>>;
}

/** 2³² (os limiares e a escolha uniforme sobre um u32). */
export const DOIS_A_32 = 4294967296;

export interface TabelaDeProgressao {
  /** Custo ⌈XP(n)⌉ de ir do nível n ao n + 1, por n (0 sem uso); o nível para no máximo técnico. */
  readonly custo: Uint16Array;
  readonly nivelMaximo: number;
  /** Faixas das Cinzas: a partir de qual valor cada cor (em ordem crescente). */
  readonly faixaValor: Uint32Array;
  readonly faixaCor: Uint8Array;
  /** Ímã, coleta e abertura do baú ao quadrado, em px²; voo da Cinza em px por passo. */
  readonly ima2: number;
  readonly coleta2: number;
  readonly abertura2: number;
  readonly vooPorPasso: number;
  readonly poolDePickups: number;
  /** ⌈pct × 2³² / 100⌉: abaixo, a carta é melhoria; abaixo do segundo, o Elmo é forçado (L2, L3). */
  readonly limiarMelhoria: number;
  readonly limiarUniao: number;
  /** Relógio, em passos, a partir do qual valem a ajuda dos 35% e a União no baú. */
  readonly relogioDaAjuda: number;
  readonly relogioDaUniaoNoBau: number;
  readonly bolsaAlmas: number;
  /** Quantidades do baú e o limite acumulado (de 0 a 100) de cada uma. */
  readonly bauQuantidade: Uint8Array;
  readonly bauAte: Uint8Array;
  readonly filaDeBaus: number;
  /** Passivas por código. */
  readonly passivaNivelMax: Uint8Array;
  readonly passivaEfeito: Uint8Array;
  readonly passivaValor: Uint16Array;
  /** Uniões: arma de origem, nível dela, passiva e resultado (códigos). */
  readonly uniaoArma: Uint8Array;
  readonly uniaoArmaNivel: Uint8Array;
  readonly uniaoPassiva: Uint8Array;
  readonly uniaoResultado: Uint8Array;
  /** Custo da Forja em Almas por hora da Fogueira (índice 1 a 3; o 0 não se usa; FG5). */
  readonly forjaCusto: Uint16Array;
  /** Perfil inicial do Vigilante, na ordem de ATRIBUTOS. */
  readonly atributosIniciais: Uint8Array;
  /** Índice do atributo que recebe o ponto de cada nível, quanto e o teto. */
  readonly atributoDoNivel: number;
  readonly pontoPorNivel: number;
  readonly tetoDoAtributo: number;
  readonly hpBase: number;
  readonly hpPorNivel: number;
  /** Σ% do HP máximo (a Brasa Firme; a árvore na F-010). */
  readonly hpPct: number;
}

/** ⌈XP(n)⌉ em inteiros: ⌊(10·base + 10·linear·k + quad·k² + 9) / 10⌋, com k = n − 1 (decisoes-F-005 X1). */
export function custoDoNivel(c: ProgressaoDoJson['curva_xp'], n: number): number {
  const k = n - 1;
  return Math.floor((10 * c.base + 10 * c.linear * k + c.quadratico_decimos * k * k + 9) / 10);
}

/** hpMax = ⌊(base × (100 + Σ%) + 50) / 100⌋ (decisoes-F-005 P3): o meio para cima, em inteiros. */
export function hpMaximo(hpBaseDoNivel: number, somaPct: number): number {
  return Math.floor((hpBaseDoNivel * (100 + somaPct) + 50) / 100);
}

export function codigoDaPassiva(id: string): number {
  const c = IDS_DE_PASSIVA.indexOf(id as (typeof IDS_DE_PASSIVA)[number]);
  if (c <= 0) throw new Error(`passiva desconhecida: ${id}`);
  return c;
}

function limiar(pct: number): number {
  return Math.ceil((pct * DOIS_A_32) / 100);
}

export function criarTabelaDeProgressao(f: FontesDaProgressao, v: VigilanteDaProgressao, armas: TabelaDeArmas): TabelaDeProgressao {
  const p = f.progressao;
  const nivelMaximo = p.nivel_maximo_tecnico;
  const custo = new Uint16Array(nivelMaximo + 1);
  for (let n = 1; n <= nivelMaximo; n++) {
    const c = custoDoNivel(p.curva_xp, n);
    if (c < 1 || c > 0xffff) throw new Error(`progressao.json: custo do nível ${n} fora de Uint16: ${c}`);
    custo[n] = c;
  }
  const cores: Record<string, number> = COR_DA_CINZA;
  const faixaValor = new Uint32Array(p.cinzas.faixas.map((x) => x.a_partir_de));
  const faixaCor = new Uint8Array(p.cinzas.faixas.map((x) => cores[x.cor] ?? 0));
  if (faixaValor[0] !== 1 || faixaCor.includes(0)) throw new Error('progressao.json: faixas das Cinzas');
  const ima = CORPO_PX * p.cinzas.ima_corpos;
  const coleta = CORPO_PX * p.cinzas.coleta_corpos;
  const abertura = CORPO_PX * p.baus.abertura_corpos;
  const bauQuantidade = new Uint8Array(p.baus.itens.length);
  const bauAte = new Uint8Array(p.baus.itens.length);
  let acumulado = 0;
  p.baus.itens.forEach((x, i) => {
    acumulado += x.pct;
    bauQuantidade[i] = x.quantidade;
    bauAte[i] = acumulado;
  });
  if (acumulado !== 100) throw new Error('progressao.json: as chances do baú não somam 100');

  const passivaNivelMax = new Uint8Array(CODIGOS_DE_PASSIVA);
  const passivaEfeito = new Uint8Array(CODIGOS_DE_PASSIVA);
  const passivaValor = new Uint16Array(CODIGOS_DE_PASSIVA);
  for (const x of f.passivas) {
    const c = codigoDaPassiva(x.id);
    const efeito = EFEITOS[x.efeito_por_nivel.tipo];
    if (efeito === undefined) throw new Error(`passivas.json: ${x.id}: efeito ${x.efeito_por_nivel.tipo} sem implementação`);
    passivaNivelMax[c] = x.nivel_max;
    passivaEfeito[c] = efeito;
    passivaValor[c] = x.efeito_por_nivel.valor;
  }
  const n = f.unioes.length;
  const uniaoArma = new Uint8Array(n);
  const uniaoArmaNivel = new Uint8Array(n);
  const uniaoPassiva = new Uint8Array(n);
  const uniaoResultado = new Uint8Array(n);
  f.unioes.forEach((u, i) => {
    uniaoArma[i] = codigoDaArma(u.arma);
    uniaoArmaNivel[i] = u.arma_nivel;
    uniaoPassiva[i] = codigoDaPassiva(u.passiva);
    uniaoResultado[i] = codigoDaArma(u.resultado);
    if (armas.uniao[uniaoResultado[i]!] !== 1 || armas.nivelMax[uniaoArma[i]!]! < u.arma_nivel) throw new Error(`unioes.json: ${u.resultado}`);
  });

  const forjaCusto = new Uint16Array(4);
  for (let h = 1; h <= 3; h++) {
    const custo = f.forjaCustoPorHora[String(h)];
    if (custo === undefined) throw new Error(`unioes.json: sem custo da Forja para a hora ${h}`);
    forjaCusto[h] = custo;
  }

  const atributosIniciais = new Uint8Array(NUMERO_DE_ATRIBUTOS);
  ATRIBUTOS.forEach((a, k) => {
    const x = v.atributos[a];
    if (x === undefined) throw new Error(`vigilante sem o atributo ${a}`);
    atributosIniciais[k] = x;
  });
  const atributoDoNivel = ATRIBUTOS.indexOf(v.ponto_por_nivel.atributo as (typeof ATRIBUTOS)[number]);
  if (atributoDoNivel < 0) throw new Error(`vigilante: ponto por nível em ${v.ponto_por_nivel.atributo}`);
  if (v.hp_por_nivel === null || v.ponto_por_nivel.teto === null) throw new Error('vigilante: HP por nível ou teto pendentes (F-005)');

  return {
    custo,
    nivelMaximo,
    faixaValor,
    faixaCor,
    ima2: ima * ima,
    coleta2: coleta * coleta,
    abertura2: abertura * abertura,
    vooPorPasso: (CORPO_PX * p.cinzas.velocidade_corpos_s) / 60,
    poolDePickups: p.pool_pickups,
    limiarMelhoria: limiar(p.level_up.melhoria_pct),
    limiarUniao: limiar(p.level_up.passiva_uniao_pct),
    relogioDaAjuda: p.level_up.passiva_uniao_a_partir_do_min * PASSOS_POR_MINUTO,
    relogioDaUniaoNoBau: p.baus.uniao_a_partir_do_min * PASSOS_POR_MINUTO,
    bolsaAlmas: p.level_up.bolsa_almas,
    bauQuantidade,
    bauAte,
    filaDeBaus: p.baus.fila,
    passivaNivelMax,
    passivaEfeito,
    passivaValor,
    uniaoArma,
    uniaoArmaNivel,
    uniaoPassiva,
    uniaoResultado,
    forjaCusto,
    atributosIniciais,
    atributoDoNivel,
    pontoPorNivel: v.ponto_por_nivel.quantidade,
    tetoDoAtributo: v.ponto_por_nivel.teto,
    hpBase: v.hp,
    hpPorNivel: v.hp_por_nivel,
    hpPct: v.passiva.hp_max_pct,
  };
}
