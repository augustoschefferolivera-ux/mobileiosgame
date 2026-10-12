// Catálogo de todas as molduras da arte (style card §4 e §10): o nome, a grade
// (arte = 2 pt por px, fina = 1 pt por px), a origem e quem desenha. Os nomes
// são fixos e baratos; as imagens só são desenhadas quando o Boot monta o atlas
// (ou quando os testes e as folhas pedem). O empacotamento é determinístico.
import { ANGULOS_DESENHADOS, arco, estocada, onda, setorGirado, girado, type ImagemComOrigem } from './efeitos';
import { compor, novaImagem, rasterizar, type Grade, type Imagem } from './imagem';
import { COR_DA_CHAVE } from './paleta';
import { anel, brilho, chao, clarear, contornar, cristal, disco, faca, rocha, silhueta, virarCinza } from './procedural';
import * as aldric from './sprites/aldric';
import { ALMA, BAU_COMUM, BAU_DOURADO, MIOLO_DO_ATORDOADO, MIOLO_DO_SAL, MIOLO_DOS_ICONES } from './sprites/itens';
import * as ocos from './sprites/ocos';
import * as sep from './sprites/sepultadoras';

/** pt por px de cada grade (E1, E2). */
export const ESCALA_DA_GRADE = { arte: 2, fina: 1 } as const;
export type GradeDaMoldura = keyof typeof ESCALA_DA_GRADE;

export interface EntradaDoCatalogo {
  readonly nome: string;
  readonly grade: GradeDaMoldura;
  /** Origem padrão (fração); o vértice, nos efeitos girados. */
  readonly origemX: number;
  readonly origemY: number;
  readonly criar: () => Imagem;
}

/** Raio-base dos efeitos na grade fina: o golpe (2 corpos) e o telegrafo do braço (2 corpos). */
export const RAIO_DO_ARCO = 64;
export const RAIO_DO_SETOR = 64;
/** Estocada desenhada em 96 × 32 pt (3 corpos por 1, nv7 da Espada) e onda de meia largura 16. */
export const ESTOCADA = { comprimento: 96, meia: 16 } as const;
export const MEIA_DA_ONDA = 16;
/** Raios das rochas em px de arte: os obstáculos de 64, 80 e 96 pt da Charneca. */
export const RAIOS_DAS_ROCHAS = [16, 20, 24] as const;
/** Sementes das rochas: a 1ª tem musgo (semente múltipla de 3). */
export const SEMENTES_DAS_ROCHAS = [3, 4] as const;
/** Raio do brilho da brasa em px de arte: 80 = 160 pt, 5 corpos (doc 13 §1.4). */
export const RAIO_DO_BRILHO = 80;

export const TIPOS_DE_INIMIGO = {
  oco_das_lanternas: { andar: [ocos.OCO_DAS_LANTERNAS, ocos.OCO_DAS_LANTERNAS_2], telegrafo: null, ataque: null },
  oco_grande: { andar: [ocos.OCO_GRANDE, ocos.OCO_GRANDE_2], telegrafo: ocos.OCO_GRANDE_TELEGRAFO, ataque: ocos.OCO_GRANDE_ATAQUE },
  novica_de_sal: { andar: [sep.NOVICA_DE_SAL, sep.NOVICA_DE_SAL_2], telegrafo: sep.NOVICA_DE_SAL_TELEGRAFO, ataque: sep.NOVICA_DE_SAL_ATAQUE },
  oco_grande_coroado: {
    andar: [ocos.OCO_GRANDE_COROADO, ocos.OCO_GRANDE_COROADO_2],
    telegrafo: ocos.OCO_GRANDE_COROADO_TELEGRAFO,
    ataque: ocos.OCO_GRANDE_COROADO_ATAQUE,
  },
} as const;

/** Cor do bloco 2 × 2 do centro do 1º quadro de andar: a cor de identidade de um tipo sem cor própria em COR_DO_INIMIGO. */
export function corDoCentro(id: keyof typeof TIPOS_DE_INIMIGO): number {
  const g = TIPOS_DE_INIMIGO[id].andar[0];
  return COR_DA_CHAVE[g[g.length / 2]![g[0]!.length / 2]!]!;
}

export const nomeDoArco = (forte: boolean, volta: boolean, angulo: number, quadro: number): string =>
  `arco_${forte ? 'forte' : 'espada'}_${volta ? 'volta' : 'ida'}_${angulo}_${quadro}`;
export const nomeDaRocha = (raio: number, semente: number): string => `rocha_${raio}_${semente}`;

const entradas: EntradaDoCatalogo[] = [];

function sprite(nome: string, grade: GradeDaMoldura, criar: () => Imagem, origemX = 0.5, origemY = 0.5): void {
  entradas.push({ nome, grade, origemX, origemY, criar });
}

/** Efeito girado: a imagem e a origem vêm juntas; a origem é conhecida só depois de desenhar. */
function efeito(nome: string, criar: () => ImagemComOrigem): void {
  let cache: ImagemComOrigem | null = null;
  const pegar = (): ImagemComOrigem => (cache ??= criar());
  entradas.push({
    nome,
    grade: 'fina',
    get origemX() {
      return pegar().origemX;
    },
    get origemY() {
      return pegar().origemY;
    },
    criar: () => pegar().img,
  });
}

const ras = (g: Grade) => (): Imagem => rasterizar(g);
const comContorno = (g: Grade) => (): Imagem => contornar(rasterizar(g));

// Aldric (style card §4): os quadros únicos; as animações repetem nomes.
const QUADROS_DO_ALDRIC: [string, Grade][] = [
  ['aldric_parado', aldric.ALDRIC_PARADO],
  ['aldric_parado_2', aldric.ALDRIC_PARADO_2],
  ['aldric_andar_1', aldric.ALDRIC_ANDAR_1],
  ['aldric_andar_3', aldric.ALDRIC_ANDAR_3],
  ['aldric_agachado', aldric.ALDRIC_AGACHADO],
  ['aldric_rolando', aldric.ALDRIC_ROLANDO],
  ['aldric_aparo', aldric.ALDRIC_APARO],
  ['aldric_aparo_2', aldric.ALDRIC_APARO_2],
  ['aldric_frasco', aldric.ALDRIC_FRASCO],
  ['aldric_frasco_2', aldric.ALDRIC_FRASCO_2],
  ['aldric_ajoelhado', aldric.ALDRIC_AJOELHADO],
];
for (const [nome, g] of QUADROS_DO_ALDRIC) sprite(nome, 'arte', ras(g));
for (let q = 0; q < 3; q++) sprite(`aldric_cinza_${q}`, 'arte', () => virarCinza(rasterizar(aldric.ALDRIC_AJOELHADO), q));

// Inimigos: andar 2, telegrafo e ataque (médios), acerto e a morte em cinza (doc 13 §1.5).
for (const [id, t] of Object.entries(TIPOS_DE_INIMIGO)) {
  sprite(id, 'arte', ras(t.andar[0]));
  sprite(`${id}_2`, 'arte', ras(t.andar[1]));
  if (t.telegrafo) {
    const tel = t.telegrafo;
    sprite(`${id}_telegrafo`, 'arte', ras(tel));
    sprite(`${id}_telegrafo_branco`, 'arte', () => silhueta(rasterizar(tel), 'W'));
  }
  if (t.ataque) sprite(`${id}_ataque`, 'arte', ras(t.ataque));
  sprite(`${id}_acerto`, 'arte', () => clarear(rasterizar(t.andar[0])));
  for (let q = 0; q < 3; q++) sprite(`${id}_cinza_${q}`, 'arte', () => virarCinza(rasterizar(t.andar[0]), q));
}

// Pickups: as Cinzas em 3 tamanhos (e o brilho), a Alma em 2 quadros, os baús.
const CINZAS = [
  ['cinza_azul', 2, 3, 'b'],
  ['cinza_verde', 3, 4, 'g'],
  ['cinza_vermelha', 4, 5, 'r'],
] as const;
for (const [nome, a, b, ch] of CINZAS) {
  sprite(nome, 'arte', () => cristal(a, b, ch));
  sprite(`${nome}_brilho`, 'arte', () => cristal(a, b, ch, true));
}
sprite('alma', 'arte', ras(ALMA));
sprite('alma_2', 'arte', ras(ALMA.map((l, y) => (y === 3 || y === 5 ? l.replace(/H/g, 'V') : l.replace(/V(?=H)/, 'H')))));
sprite('bau_comum', 'arte', ras(BAU_COMUM));
sprite('bau_dourado', 'arte', ras(BAU_DOURADO));

// Obstáculos: rochas pelo raio da região, 2 sementes cada.
for (const r of RAIOS_DAS_ROCHAS) for (const s of SEMENTES_DAS_ROCHAS) sprite(nomeDaRocha(r, s), 'arte', () => rocha(r, s));

// Armas: as Facas de Sal em 4 ângulos; o golpe (ida e volta, Espada e Lâmina) em 4 ângulos e 2 quadros; a estocada e a onda.
ANGULOS_DESENHADOS.forEach((g, i) => {
  sprite(`faca_${i}`, 'arte', () => faca(g));
  for (const forte of [false, true]) {
    for (const volta of [false, true]) for (const q of [0, 1] as const) efeito(nomeDoArco(forte, volta, i, q), () => arco(RAIO_DO_ARCO, g, q, volta, forte));
  }
  efeito(`estocada_${i}`, () => estocada(ESTOCADA.comprimento, ESTOCADA.meia, g));
  efeito(`onda_${i}`, () => onda(MEIA_DA_ONDA, g));
  efeito(`setor_${i}`, () => setorGirado(RAIO_DO_SETOR, 120, g));
  efeito(`marcador_${i}`, () =>
    girado(5, g, (u, v) => {
      if (v < -1 || v > 2.6) return null;
      const dist = Math.abs(Math.abs(u) - (2.4 - v));
      return dist <= 0.6 ? (Math.abs(u) < 0.6 ? 'Y' : 'A') : null;
    }),
  );
});

// Círculo de Sal: os grãos do anel e do pulso (cristais com contorno, como as Cinzas); partículas brancas (tingidas pela paleta no render).
sprite('grao_sal_0', 'arte', comContorno(['.....', '..S..', '.SHs.', '..s..', '.....']));
sprite('grao_sal_1', 'arte', comContorno(['....', '.HS.', '.Ss.', '....']));
sprite('ponto', 'fina', ras(['W']));
sprite('ponto_2', 'fina', ras(['WW', 'WW']));

// Projétil da Noviça (RE6): disco de 16 pt e anel de 24 pt, brancos puros, sem contorno.
sprite('projetil_anel', 'fina', () => anel(12, 2, 'W'));
sprite('projetil_disco', 'fina', () => disco(8, 'W'));

// Status no inimigo (RE9, V4) e a mancha das Cinzas Perdidas (MC9): o anel de brasa em 3 raios do pulso.
sprite('status_atordoado', 'arte', comContorno(MIOLO_DO_ATORDOADO));
sprite('status_sal', 'arte', comContorno(MIOLO_DO_SAL));
for (let k = 0; k < 3; k++) {
  sprite(`mancha_${k}`, 'fina', () => {
    const r = 22 + 2 * k;
    const img = anel(r, 3, 'A');
    compor(img, anel(r - 2, 1, 'B'), 2, 2);
    return img;
  });
}

// A luz da brasa (aditiva) e os ícones do HUD.
sprite('brilho', 'arte', () => brilho(RAIO_DO_BRILHO));
for (const [nome, g] of Object.entries(MIOLO_DOS_ICONES)) sprite(`icone_${nome}`, 'arte', comContorno(g));

export const CATALOGO: readonly EntradaDoCatalogo[] = entradas;
export const NOMES_DA_ARTE: readonly string[] = entradas.map((e) => e.nome);

/** Ladrilho do chão para a textura própria: 4 × 4 ladrilhos de 16 px, sementes variadas (64 × 64 px). */
export function ladrilhoDoChao(): Imagem {
  const img = novaImagem(64, 64);
  for (let k = 0; k < 16; k++) compor(img, chao((k * 7) % 11), (k % 4) * 16, Math.floor(k / 4) * 16);
  return img;
}

/** Lado do atlas e as regiões livres para a arte: as formas de 2× ocupam o quadrante de cima à esquerda (512 × 512). */
export const LADO_DO_ATLAS = 1024;
export const REGIOES_DA_ARTE: readonly Posicao[] = [
  { x: 516, y: 0, largura: 508, altura: 1024 },
  { x: 0, y: 516, largura: 512, altura: 508 },
];

export interface Posicao {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

/**
 * Empacota as imagens em prateleiras dentro das regiões livres do atlas, da
 * mais alta para a mais baixa (empate pelo nome), com `folga` px entre elas.
 * Erro alto se não couber.
 */
export function empacotar(imagens: ReadonlyMap<string, Imagem>, regioes: readonly Posicao[], folga = 2): Map<string, Posicao> {
  const ordem = [...imagens.entries()].sort((a, b) => b[1].altura - a[1].altura || (a[0] < b[0] ? -1 : 1));
  const saida = new Map<string, Posicao>();
  let r = 0;
  let x = regioes[0]!.x;
  let y = regioes[0]!.y;
  let alturaDaPrateleira = 0;
  for (const [nome, img] of ordem) {
    for (;;) {
      const reg = regioes[r];
      if (!reg) throw new Error(`atlas: ${nome} não cabe (${img.largura} × ${img.altura})`);
      if (x + img.largura > reg.x + reg.largura) {
        x = reg.x;
        y += alturaDaPrateleira + folga;
        alturaDaPrateleira = 0;
      }
      if (y + img.altura <= reg.y + reg.altura && img.largura <= reg.largura) break;
      r++;
      const prox = regioes[r];
      if (prox) {
        x = prox.x;
        y = prox.y;
        alturaDaPrateleira = 0;
      }
    }
    saida.set(nome, { x, y, largura: img.largura, altura: img.altura });
    x += img.largura + folga;
    if (img.altura > alturaDaPrateleira) alturaDaPrateleira = img.altura;
  }
  return saida;
}
