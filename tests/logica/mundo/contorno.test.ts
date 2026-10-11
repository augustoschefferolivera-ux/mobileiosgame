// Teste de contorno (design/decisoes-F-003.md §2, S8): com obstáculos sintéticos
// de 96 px e o jogador parado, a horda que nasce atrás de um obstáculo chega ao
// jogador em T = 1.800 passos (30 s) só com a perseguição reta, a separação e o
// desempate da colisão (D §3). Cada caso roda com o grupo deslocado em
// {0; 0,001; 7; 23} px na perpendicular. Se algum caso falhar, a F-003 precisa
// da reserva (campo de fluxo por BFS) antes de fechar.
import { describe, expect, it } from 'vitest';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import armas from '../../../src/dados/armas.json';
import inimigos from '../../../src/dados/inimigos.json';
import vigilantes from '../../../src/dados/vigilantes.json';
import { JOGADOR, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { criarDadosDaVigilia, type DadosDaVigilia } from '../../../src/logica/mundo/dados';
import { FOLGA_DO_CONTATO } from '../../../src/logica/mundo/contato';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { RAIO_DO_JOGADOR } from '../../../src/logica/mundo/jogador';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import { PARADO, SEM_HORDA } from '../apoio';

const T = 1800;
const DESLOCAMENTOS = [0, 0.001, 7, 23];
const JX = 585;
const JY = 1600;
const R_OBSTACULO = 48;

type Obstaculo = { x: number; y: number };
const regiao = (obstaculos: Obstaculo[]) => ({ ...charneca, obstaculos: obstaculos.map((o) => ({ ...o, tamanho_px: 2 * R_OBSTACULO })) });
const aldric = vigilantes.vigilantes[0]!;
/** Corpo sintético: o Oco Grande (raio 24) com a perseguição reta do Oco das Lanternas. */
const SINTETICO = inimigos.inimigos.map((i) => (i.id === 'oco_grande' ? { ...i, comportamento: { tipo: 'perseguir_reto' } } : i));

const dist = (e: Estado, s: number): number =>
  Math.hypot(deltaNoToro(JX, e.inimigos.x[s]!, W), deltaNoToro(JY, e.inimigos.y[s]!, H));

/** O segmento do corpo ao jogador cruza o disco do obstáculo (o corpo está "atrás"). */
function segmentoCruza(x: number, y: number, o: Obstaculo, raioDoCorpo: number): boolean {
  const vx = JX - x;
  const vy = JY - y;
  const t = Math.max(0, Math.min(1, ((o.x - x) * vx + (o.y - y) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x + t * vx - o.x, y + t * vy - o.y) < R_OBSTACULO + raioDoCorpo;
}

function rodar(dados: DadosDaVigilia, corpos: { tipo: number; x: number; y: number }[], obstaculos: Obstaculo[]): { e: Estado; slots: number[] } {
  const e = criarEstado(1, dados, SEM_HORDA);
  e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = JX;
  e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = JY;
  const slots = corpos.map((c) => nascerInimigo(e, dados, c.tipo, c.x, c.y, false));
  expect(Math.min(...slots)).toBeGreaterThanOrEqual(0);
  // O grupo começa atrás: algum corpo tem o caminho reto bloqueado.
  expect(corpos.some((c) => obstaculos.some((o) => segmentoCruza(c.x, c.y, o, dados.tipos.raio[c.tipo]!)))).toBe(true);
  avancar(e, dados, PARADO, T);
  expect([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]).toEqual([JX, JY]);
  return { e, slots };
}

/** Raio do disco que comporta os N corpos empacotados em volta do jogador (S8). */
function raioEmpacotado(dados: DadosDaVigilia, tipos: number[]): number {
  const soma = tipos.reduce((s, t) => s + (2 * Math.sqrt(3) * dados.tipos.raio[t]! ** 2) / Math.PI, 0);
  return Math.sqrt(soma + RAIO_DO_JOGADOR ** 2);
}

function bloco(tipo: number, colunas: number, linhas: number, espaco: number, cx: number, frente: number) {
  const corpos: { tipo: number; x: number; y: number }[] = [];
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) corpos.push({ tipo, x: cx + (c - (colunas - 1) / 2) * espaco, y: frente - l * espaco });
  }
  return corpos;
}

describe('C1: um corpo atrás de um obstáculo de 96 px', () => {
  const casos = [
    ['a 200 px do jogador', JY - 200],
    ['encostado no jogador', JY - (R_OBSTACULO + RAIO_DO_JOGADOR)],
  ] as const;
  const corpos = [
    ['Oco das Lanternas: em contato', TIPO.oco_das_lanternas, false, (d: number) => d <= 32 + FOLGA_DO_CONTATO],
    ['Oco Grande: a 48 px', TIPO.oco_grande, false, (d: number) => d <= 48 + 1e-3],
    ['Noviça: a 128 px', TIPO.novica_de_sal, false, (d: number) => Math.abs(d - 128) <= 1e-3],
    ['corpo sintético de raio 24: encostado', TIPO.oco_grande, true, (d: number) => d <= 40 + FOLGA_DO_CONTATO],
  ] as const;
  for (const [nomeDoCaso, oy] of casos) {
    for (const [nome, tipo, sintetico, chegou] of corpos) {
      it.each(DESLOCAMENTOS)(`obstáculo ${nomeDoCaso}; ${nome}; deslocamento %s px`, (desloc) => {
        const obstaculos = [{ x: JX, y: oy }];
        const dados = criarDadosDaVigilia(regiao(obstaculos), aldric, sintetico ? SINTETICO : inimigos.inimigos, armas.armas);
        const { e, slots } = rodar(dados, [{ tipo, x: JX + desloc, y: JY - 400 }], obstaculos);
        expect(chegou(dist(e, slots[0]!)), `d = ${dist(e, slots[0]!)}`).toBe(true);
      });
    }
  }
});

describe('C2 e C3: grupos atrás de um obstáculo e por uma fenda de 64 px', () => {
  const um = [{ x: JX, y: JY - 200 }];
  // Fenda de 64 px entre as bordas: centros a 2 × 48 + 64 = 160 px.
  const fenda = [
    { x: JX - 80, y: JY - 200 },
    { x: JX + 80, y: JY - 200 },
  ];
  const frente = JY - 200 - R_OBSTACULO - 26;
  const grupos = [
    ['C2: 20 Ocos das Lanternas (4 × 5, 34 px)', um, bloco(TIPO.oco_das_lanternas, 4, 5, 34, JX, frente)],
    ['C2: 12 Ocos Grandes (3 × 4, 50 px)', um, bloco(TIPO.oco_grande, 3, 4, 50, JX, frente)],
    ['C3: 30 Ocos das Lanternas pela fenda', fenda, bloco(TIPO.oco_das_lanternas, 5, 6, 34, JX, frente)],
    ['C3: 60 Ocos das Lanternas pela fenda', fenda, bloco(TIPO.oco_das_lanternas, 6, 10, 34, JX, frente)],
    ['C3: 12 Ocos Grandes pela fenda', fenda, bloco(TIPO.oco_grande, 3, 4, 50, JX, frente)],
  ] as const;
  for (const [nome, obstaculos, corpos] of grupos) {
    it.each(DESLOCAMENTOS)(`${nome}; deslocamento %s px: todos a d ≤ R_emp + 64`, (desloc) => {
      const dados = criarDadosDaVigilia(regiao([...obstaculos]), aldric, inimigos.inimigos, armas.armas);
      const { e, slots } = rodar(dados, corpos.map((c) => ({ ...c, x: c.x + desloc })), [...obstaculos]);
      const limite = raioEmpacotado(dados, corpos.map((c) => c.tipo)) + 64;
      const pior = Math.max(...slots.map((s) => dist(e, s)));
      expect(pior, `limite ${limite.toFixed(1)}`).toBeLessThanOrEqual(limite);
    }, 30_000);
  }
});
