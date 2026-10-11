// Tabela das armas (ADR-0002 §7; design/decisoes-F-004.md §2 e §4): códigos
// fixos, que só crescem no fim (o estado guarda o código), e os números de
// cada (arma, nível) montados uma vez a partir de armas.json em arrays
// tipados. A simulação nunca lê string nem deduz a forma pelo id da arma: o
// arquétipo escolhe a função, e os dados dizem as formas, os golpes e os
// alcances. Um número pendente numa arma que pode entrar na Vigília é erro
// aqui, no boot, nunca no meio de um passo. A União (F-005) compila depois das
// outras: a base sai do nível de origem (`dano_de`) em inteiros, e os golpes e
// as formas são copiados de `golpes_de` (design/decisoes-F-005.md §4, U1).
import { PASSOS_POR_SEGUNDO, segundosEmPassos } from '../nucleo/passos';
import { FORMA } from '../nucleo/eventos';
import { MULT_NEUTRO_PCT, PODER_PCT, danoPorAcerto } from './dano';
import { CORPO_PX } from '../mundo/tipos';

/** Códigos de arma; 0 = vaga vazia. */
export const ARMA = {
  vazia: 0,
  espada_longa_do_juramento: 1,
  facas_de_sal: 2,
  circulo_de_sal: 3,
  lamina_do_juramento_eterno: 4,
} as const;
/** Ids por código (o índice é o código). */
export const IDS_DE_ARMA = ['', 'espada_longa_do_juramento', 'facas_de_sal', 'circulo_de_sal', 'lamina_do_juramento_eterno'] as const;
export const CODIGOS_DE_ARMA = IDS_DE_ARMA.length;
const CODIGOS = CODIGOS_DE_ARMA;

/** Atributos na ordem do registro do jogador (Uint8 × 5; chaves de vigilantes.json, sem acento). */
export const ATRIBUTOS = ['FOR', 'DES', 'INT', 'FE', 'VIG'] as const;
export const NUMERO_DE_ATRIBUTOS = ATRIBUTOS.length;

/** Arquétipos de alvo implementados (doc 04 §1); os outros entram como funções novas. */
export const ARQUETIPO = { nenhum: 0, direcaoMovimento: 1, maisProximo: 2, aura: 3 } as const;
const ARQUETIPOS: Record<string, number> = {
  direcao_movimento: ARQUETIPO.direcaoMovimento,
  mais_proximo: ARQUETIPO.maisProximo,
  aura: ARQUETIPO.aura,
};

/** Graus de escala em centésimos (doc 10 §2.2; B §3.8). */
export const GRAU_CENTESIMOS: Readonly<Record<string, number>> = { E: 25, D: 50, C: 75, B: 100, A: 125, S: 150 };

export const NIVEL_MAXIMO = 8;
/** Golpes por sequência no máximo (nv8 da Espada: 4). */
export const GOLPES_MAXIMOS = 4;
/** Índice de (arma, nível) nas tabelas por nível. */
export function indiceDoNivel(codigo: number, nivel: number): number {
  return codigo * (NIVEL_MAXIMO + 1) + nivel;
}
/** Posições das tabelas por (arma, nível). */
export const POR_NIVEL = CODIGOS * (NIVEL_MAXIMO + 1);

/** O que se lê de armas.json (arma.schema.json). */
export interface ArmaDoJson {
  readonly id: string;
  readonly arquetipo: string;
  readonly escala: readonly { readonly atributo: string; readonly grau: string }[];
  readonly uniao: boolean;
  readonly nivel_max: number;
  readonly base: Readonly<Record<string, unknown>>;
  readonly niveis: readonly { readonly nivel: number; readonly efeitos: readonly Readonly<Record<string, unknown>>[] }[];
}

/** Atributos do Vigilante (vigilante.schema.json). */
export type Atributos = Readonly<Record<string, number>>;

export interface TabelaDeArmas {
  /** Código da arma inicial do Vigilante. */
  readonly inicial: number;
  /** Nível máximo por código; 0 = a arma não existe nesta Vigília. */
  readonly nivelMax: Uint8Array;
  /** 1 se a arma é União: nunca é carta nem melhoria (design/decisoes-F-005.md L1). */
  readonly uniao: Uint8Array;
  /** Grau em centésimos por (arma, atributo), em [código × 5 + índice de ATRIBUTOS] (decisoes-F-005 P4). */
  readonly grauPorAtributo: Uint8Array;
  /** Onda de chão por golpe (União, U3): dano base, meia-largura em px, px por 60 passos e vida; 0 = sem onda. */
  readonly ondaDanoBase: Float64Array;
  readonly ondaMeia: Float64Array;
  readonly ondaPxPor60: Uint16Array;
  readonly ondaVida: Uint8Array;
  readonly arquetipo: Uint8Array;
  /** Passos entre disparos: recarga da salva ou intervalo do tick da aura. */
  readonly periodo: Uint16Array;
  /** Dano base do nv1 (por golpe, por faca ou por segundo na aura). */
  readonly danoBase: Float64Array;
  /** Fração do dano base por disparo, num/den: 30/60 no tick da aura, 1/1 nas outras. */
  readonly numDano: Uint16Array;
  readonly denDano: Uint16Array;
  /** Σ grau em centésimos × atributo do perfil inicial (Espada de Aldric: 75 × 6 + 75 × 3 = 675); o recálculo da F-005 o reproduz. */
  readonly escalaMil: Uint32Array;
  /** Passos entre os golpes de uma sequência. */
  readonly intervaloGolpes: Uint8Array;
  /** Alcance da busca de alvo, em px (Facas: 192). */
  readonly alcanceBusca: Float64Array;
  /** Raio da hitbox do projétil, em px. */
  readonly raioProjetil: Float64Array;
  /** Espaçamento lateral entre projéteis no mesmo alvo, em px. */
  readonly espacamento: Float64Array;
  /** Passos entre pulsos (0 = sem pulso em nenhum nível). */
  readonly periodoPulso: Uint16Array;
  /** Por (arma, nível), em indiceDoNivel. */
  readonly somaDanoPct: Int16Array;
  /**
   * Dano de um acerto (golpe, faca ou tick) pela fórmula de dano.ts, com o
   * Poder e os multiplicadores neutros e os atributos do Vigilante, que não
   * mudam durante a Vigília até a F-005 (que recalcula no level up).
   */
  readonly danoDoNivel: Float64Array;
  readonly golpes: Uint8Array;
  /** Forma de cada golpe da sequência: [indiceDoNivel × GOLPES_MAXIMOS + k]. */
  readonly formaDoGolpe: Uint8Array;
  /** Raio do arco ou da aura, em px. */
  readonly alcance: Float64Array;
  /** Comprimento e meia-largura da estocada, em px. */
  readonly estocadaL: Float64Array;
  readonly estocadaW: Float64Array;
  readonly projeteis: Uint8Array;
  /** Velocidade do projétil em px por passo. */
  readonly velocidade: Float64Array;
  /** Passos de voo: round(alcance da busca ÷ velocidade). */
  readonly vida: Uint16Array;
  readonly perfuracoes: Uint8Array;
  /** Sal aplicado por acerto: redução em % (0 = nenhum) e passos. */
  readonly salPct: Uint8Array;
  readonly salPassos: Uint16Array;
  /** 1 se o nível tem o pulso de afastamento. */
  readonly pulso: Uint8Array;
  /** Afastamento do pulso: px por passo e passos no máximo (iguais para toda arma com pulso). */
  readonly empurraoPorPasso: number;
  readonly empurraoMaxPassos: number;
}

export function codigoDaArma(id: string): number {
  const c = IDS_DE_ARMA.indexOf(id as (typeof IDS_DE_ARMA)[number]);
  if (c <= 0) throw new Error(`arma desconhecida: ${id}`);
  return c;
}

function numero(o: Readonly<Record<string, unknown>>, campo: string, id: string): number {
  const v = o[campo];
  if (typeof v !== 'number') throw new Error(`armas.json: ${id}.${campo} pendente ou ausente`);
  return v;
}

/** Inteiro exato (como os tempos e os percentuais): erro se a conversão não fecha. */
function inteiro(v: number, o_que: string): number {
  const r = Math.round(v);
  if (Math.abs(r - v) > 1e-9) throw new Error(`armas.json: ${o_que} = ${v} não dá inteiro`);
  return r;
}

const FORMAS: Record<string, number> = { ida: FORMA.ida, volta: FORMA.volta, estocada: FORMA.estocada };

export function criarTabelaDeArmas(armas: readonly ArmaDoJson[], atributos: Atributos, armaInicial: string): TabelaDeArmas {
  const t = {
    nivelMax: new Uint8Array(CODIGOS),
    uniao: new Uint8Array(CODIGOS),
    grauPorAtributo: new Uint8Array(CODIGOS * NUMERO_DE_ATRIBUTOS),
    ondaDanoBase: new Float64Array(CODIGOS),
    ondaMeia: new Float64Array(CODIGOS),
    ondaPxPor60: new Uint16Array(CODIGOS),
    ondaVida: new Uint8Array(CODIGOS),
    arquetipo: new Uint8Array(CODIGOS),
    periodo: new Uint16Array(CODIGOS),
    danoBase: new Float64Array(CODIGOS),
    numDano: new Uint16Array(CODIGOS),
    denDano: new Uint16Array(CODIGOS),
    escalaMil: new Uint32Array(CODIGOS),
    intervaloGolpes: new Uint8Array(CODIGOS),
    alcanceBusca: new Float64Array(CODIGOS),
    raioProjetil: new Float64Array(CODIGOS),
    espacamento: new Float64Array(CODIGOS),
    periodoPulso: new Uint16Array(CODIGOS),
    somaDanoPct: new Int16Array(POR_NIVEL),
    danoDoNivel: new Float64Array(POR_NIVEL),
    golpes: new Uint8Array(POR_NIVEL),
    formaDoGolpe: new Uint8Array(POR_NIVEL * GOLPES_MAXIMOS),
    alcance: new Float64Array(POR_NIVEL),
    estocadaL: new Float64Array(POR_NIVEL),
    estocadaW: new Float64Array(POR_NIVEL),
    projeteis: new Uint8Array(POR_NIVEL),
    velocidade: new Float64Array(POR_NIVEL),
    vida: new Uint16Array(POR_NIVEL),
    perfuracoes: new Uint8Array(POR_NIVEL),
    salPct: new Uint8Array(POR_NIVEL),
    salPassos: new Uint16Array(POR_NIVEL),
    pulso: new Uint8Array(POR_NIVEL),
  };
  let empurraoPorPasso = 0;
  let empurraoMaxPassos = 0;
  // As Uniões depois das outras: copiam o nível de origem já compilado.
  const ordem = [...armas.filter((a) => !a.uniao), ...armas.filter((a) => a.uniao)];
  for (const a of ordem) {
    const c = codigoDaArma(a.id);
    if (a.uniao) {
      compilarUniao(t, a, c, atributos);
      continue;
    }
    const arquetipo = ARQUETIPOS[a.arquetipo];
    if (arquetipo === undefined) throw new Error(`armas.json: ${a.id}: arquétipo ${a.arquetipo} sem implementação`);
    t.arquetipo[c] = arquetipo;
    t.nivelMax[c] = a.nivel_max;
    const escala = compilarEscala(t, a, c, atributos);
    const b = a.base;
    compilarOnda(t, a, c);
    const aura = arquetipo === ARQUETIPO.aura;
    t.danoBase[c] = inteiro(numero(b, aura ? 'dano_por_s' : 'dano', a.id), `${a.id} dano base`);
    t.periodo[c] = segundosEmPassos(numero(b, aura ? 'intervalo_tick_s' : 'cooldown_s', a.id));
    t.numDano[c] = aura ? t.periodo[c] : 1;
    t.denDano[c] = aura ? PASSOS_POR_SEGUNDO : 1;
    if (arquetipo === ARQUETIPO.direcaoMovimento) t.intervaloGolpes[c] = segundosEmPassos(numero(b, 'intervalo_golpes_s', a.id));
    if (arquetipo === ARQUETIPO.maisProximo) {
      t.alcanceBusca[c] = CORPO_PX * numero(b, 'alcance_corpos', a.id);
      t.raioProjetil[c] = CORPO_PX * numero(b, 'raio_projetil_corpos', a.id);
      t.espacamento[c] = CORPO_PX * numero(b, 'espacamento_lateral_corpos', a.id);
    }
    const estocada = b['estocada'] as { comprimento_corpos: number; meia_largura_corpos: number } | undefined;
    const aplicaBase = b['aplica'] as { status: string; fator_pct: number; duracao_s: number } | undefined;
    // Acumulados nível a nível (os níveis somam: doc 04 §1.1; D2 da decisão).
    let somaDano = 0;
    let somaArea = 0;
    let somaRaio = 0;
    let somaVel = 0;
    let golpes = arquetipo === ARQUETIPO.direcaoMovimento ? numero(b, 'golpes', a.id) : 0;
    const formas: number[] = [];
    for (let k = 0; k < golpes; k++) formas.push(FORMA.ida);
    let projeteis = arquetipo === ARQUETIPO.maisProximo ? numero(b, 'projeteis', a.id) : 0;
    let perfuracoes = 0;
    let salPct = aplicaBase && aplicaBase.status === 'sal' ? aplicaBase.fator_pct : 0;
    let salPassos = aplicaBase && aplicaBase.status === 'sal' ? segundosEmPassos(aplicaBase.duracao_s) : 0;
    let pulso = 0;
    for (let nivel = 1; nivel <= a.nivel_max; nivel++) {
      const n = a.niveis.find((x) => x.nivel === nivel);
      if (!n) throw new Error(`armas.json: ${a.id} sem o nível ${nivel}`);
      for (const ef of n.efeitos) {
        const tipo = ef['tipo'] as string;
        const valor = ef['valor'] as number | undefined;
        switch (tipo) {
          case 'dano_pct':
            somaDano += valor!;
            break;
          case 'area_pct':
            somaArea += valor!;
            break;
          case 'raio_pct':
            somaRaio += valor!;
            break;
          case 'velocidade_projetil_pct':
            somaVel += valor!;
            break;
          case 'golpes_extra': {
            const forma = FORMAS[ef['forma'] as string];
            if (forma === undefined) throw new Error(`armas.json: ${a.id} nv${nivel}: golpe extra sem forma`);
            for (let k = 0; k < valor!; k++) formas.push(forma);
            golpes += valor!;
            break;
          }
          case 'projeteis_extra':
            projeteis += valor!;
            break;
          case 'perfura':
            perfuracoes += valor!;
            break;
          case 'aplica_sal': {
            const ap = ef['aplica'] as { status: string; fator_pct: number; duracao_s: number } | undefined;
            if (!ap) throw new Error(`armas.json: ${a.id} nv${nivel}: aplica_sal sem o bloco aplica`);
            salPct = ap.fator_pct;
            salPassos = segundosEmPassos(ap.duracao_s);
            break;
          }
          case 'sal_reducao_pct':
            salPct = valor!;
            break;
          case 'pulso_knockback': {
            pulso = 1;
            t.periodoPulso[c] = segundosEmPassos(numero(ef, 'intervalo_s', a.id));
            const porPasso = (numero(ef, 'velocidade_corpos_s', a.id) * CORPO_PX) / PASSOS_POR_SEGUNDO;
            const maxPassos = segundosEmPassos(numero(ef, 'duracao_max_s', a.id));
            if ((empurraoPorPasso !== 0 && empurraoPorPasso !== porPasso) || (empurraoMaxPassos !== 0 && empurraoMaxPassos !== maxPassos)) {
              throw new Error('armas.json: dois pulsos com afastamentos diferentes');
            }
            empurraoPorPasso = porPasso;
            empurraoMaxPassos = maxPassos;
            break;
          }
          case 'dano_pct_vs_postura_quebrada':
            // Condicional: entra no multStatus da F-006 (decisoes-F-004 D2 e D3).
            break;
          default:
            throw new Error(`armas.json: ${a.id} nv${nivel}: efeito ${tipo} sem implementação`);
        }
      }
      if (golpes > GOLPES_MAXIMOS) throw new Error(`armas.json: ${a.id} nv${nivel}: ${golpes} golpes`);
      const i = indiceDoNivel(c, nivel);
      t.somaDanoPct[i] = somaDano;
      t.danoDoNivel[i] = danoPorAcerto(t.danoBase[c]!, t.numDano[c]!, t.denDano[c]!, somaDano, PODER_PCT, escala, MULT_NEUTRO_PCT, MULT_NEUTRO_PCT);
      t.golpes[i] = golpes;
      for (let k = 0; k < golpes; k++) t.formaDoGolpe[i * GOLPES_MAXIMOS + k] = formas[k]!;
      // Tamanhos em inteiros e uma divisão: somar 0,15 + 0,15 + 0,2 em double daria 95,99999999999999 (W15).
      if (arquetipo === ARQUETIPO.direcaoMovimento) {
        t.alcance[i] = (CORPO_PX * numero(b, 'alcance_corpos', a.id) * (100 + somaArea)) / 100;
        if (estocada) {
          t.estocadaL[i] = (CORPO_PX * estocada.comprimento_corpos * (100 + somaArea)) / 100;
          t.estocadaW[i] = (CORPO_PX * estocada.meia_largura_corpos * (100 + somaArea)) / 100;
        }
      }
      if (aura) t.alcance[i] = (CORPO_PX * numero(b, 'raio_corpos', a.id) * (100 + somaRaio)) / 100;
      if (arquetipo === ARQUETIPO.maisProximo) {
        // Numerador inteiro e uma divisão: 6,4 × 1,2 em double daria 7,679999999999999 (W9).
        const v = (CORPO_PX * numero(b, 'velocidade_projetil_corpos_s', a.id) * (100 + somaVel)) / (100 * PASSOS_POR_SEGUNDO);
        t.velocidade[i] = v;
        t.vida[i] = Math.round(t.alcanceBusca[c]! / v);
        t.projeteis[i] = projeteis;
        t.perfuracoes[i] = perfuracoes;
      }
      t.salPct[i] = inteiro(salPct, `${a.id} nv${nivel} sal`);
      t.salPassos[i] = salPassos;
      t.pulso[i] = pulso;
    }
  }
  const inicial = codigoDaArma(armaInicial);
  if (t.nivelMax[inicial] === 0 || t.uniao[inicial] === 1) throw new Error(`arma inicial fora desta Vigília: ${armaInicial}`);
  return { ...t, inicial, empurraoPorPasso, empurraoMaxPassos };
}

type TabelaEmMontagem = Omit<TabelaDeArmas, 'inicial' | 'empurraoPorPasso' | 'empurraoMaxPassos'>;

/** Graus por atributo e Σ grau × atributo do perfil inicial. */
function compilarEscala(t: TabelaEmMontagem, a: ArmaDoJson, c: number, atributos: Atributos): number {
  let escala = 0;
  for (const e of a.escala) {
    const grau = GRAU_CENTESIMOS[e.grau];
    const k = ATRIBUTOS.indexOf(e.atributo as (typeof ATRIBUTOS)[number]);
    const attr = atributos[e.atributo];
    if (grau === undefined || k < 0 || attr === undefined) throw new Error(`armas.json: ${a.id}: escala ${e.atributo} ${e.grau}`);
    t.grauPorAtributo[c * NUMERO_DE_ATRIBUTOS + k] = grau;
    escala += grau * attr;
  }
  t.escalaMil[c] = escala;
  return escala;
}

/**
 * União (design/decisoes-F-005.md U1 e U3; W18 da D4): base = base da origem ×
 * (100 + Σ dano da origem) × mult / 10.000, que tem de dar inteiro (21 na Lâmina);
 * golpes, formas, alcance e estocada copiados de `golpes_de`; um só nível; a
 * onda, se houver, com a vida = comprimento ÷ velocidade em passos.
 */
function compilarUniao(t: TabelaEmMontagem, a: ArmaDoJson, c: number, atributos: Atributos): void {
  const b = a.base;
  const danoDe = b['dano_de'] as { arma: string; nivel: number; mult: number } | undefined;
  const golpesDe = b['golpes_de'] as { arma: string; nivel: number } | undefined;
  if (!danoDe || !golpesDe) throw new Error(`armas.json: ${a.id}: União sem dano_de ou golpes_de`);
  const origem = codigoDaArma(danoDe.arma);
  const deGolpes = codigoDaArma(golpesDe.arma);
  if (t.nivelMax[origem]! < danoDe.nivel || t.nivelMax[deGolpes]! < golpesDe.nivel) throw new Error(`armas.json: ${a.id}: nível de origem inexistente`);
  const arquetipo = ARQUETIPOS[a.arquetipo];
  if (arquetipo !== ARQUETIPO.direcaoMovimento || a.nivel_max !== 1) throw new Error(`armas.json: ${a.id}: União só de direção do movimento, com 1 nível`);
  const multPct = inteiro(danoDe.mult * 100, `${a.id} mult`);
  const io = indiceDoNivel(origem, danoDe.nivel);
  const base = inteiro((t.danoBase[origem]! * (100 + t.somaDanoPct[io]!) * multPct) / 10000, `${a.id} base da União`);
  t.uniao[c] = 1;
  t.arquetipo[c] = arquetipo;
  t.nivelMax[c] = 1;
  t.danoBase[c] = base;
  t.numDano[c] = 1;
  t.denDano[c] = 1;
  t.periodo[c] = segundosEmPassos(numero(b, 'cooldown_s', a.id));
  t.intervaloGolpes[c] = segundosEmPassos(numero(b, 'intervalo_golpes_s', a.id));
  const escala = compilarEscala(t, a, c, atributos);
  const i = indiceDoNivel(c, 1);
  const ig = indiceDoNivel(deGolpes, golpesDe.nivel);
  t.somaDanoPct[i] = 0;
  t.danoDoNivel[i] = danoPorAcerto(base, 1, 1, 0, PODER_PCT, escala, MULT_NEUTRO_PCT, MULT_NEUTRO_PCT);
  t.golpes[i] = t.golpes[ig]!;
  for (let k = 0; k < GOLPES_MAXIMOS; k++) t.formaDoGolpe[i * GOLPES_MAXIMOS + k] = t.formaDoGolpe[ig * GOLPES_MAXIMOS + k]!;
  t.alcance[i] = t.alcance[ig]!;
  t.estocadaL[i] = t.estocadaL[ig]!;
  t.estocadaW[i] = t.estocadaW[ig]!;
  compilarOnda(t, a, c);
}

/** A onda de chão (U3), se a arma tem `base.onda`: o código não depende do id. */
function compilarOnda(t: TabelaEmMontagem, a: ArmaDoJson, c: number): void {
  const onda = a.base['onda'] as { comprimento_corpos: number; dano: number; largura_corpos: number; velocidade_corpos_s: number } | undefined;
  if (!onda) return;
  if (t.arquetipo[c] !== ARQUETIPO.direcaoMovimento) throw new Error(`armas.json: ${a.id}: onda só em arma de direção do movimento`);
  t.ondaDanoBase[c] = inteiro(onda.dano, `${a.id} dano da onda`);
  t.ondaMeia[c] = (CORPO_PX * onda.largura_corpos) / 2;
  t.ondaPxPor60[c] = inteiro(CORPO_PX * onda.velocidade_corpos_s, `${a.id} velocidade da onda`);
  t.ondaVida[c] = inteiro((onda.comprimento_corpos * PASSOS_POR_SEGUNDO) / onda.velocidade_corpos_s, `${a.id} vida da onda`);
}
