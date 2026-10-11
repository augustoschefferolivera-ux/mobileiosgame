// Auxiliares dos testes da Playwright (projeto taps-game): o contrato do
// __GAME_DEBUG__, a abertura com a seed de VDC_SEED (o --seed do
// scripts/verify.sh), a conversão de pt para a página e o toque em Acender.
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alvosDoAcender } from '../src/entrada/alvos';
import { SEED_PADRAO } from '../src/logica/nucleo/referencia';
import { insetsZerados, type Insets } from '../src/plataforma/safeArea';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
export const EVIDENCIAS = process.env['VDC_EVIDENCIAS'] === '1';

export interface Debug {
  fps: number;
  passo: number;
  relogio: number;
  estado: string;
  vivos: Record<string, number>;
  passos_perdidos: number;
  recusados: Record<string, number>;
  memoriaEstimadaMB: number;
  safeArea: { topo: number; direita: number; baixo: number; esquerda: number };
  seed: number;
  textoAtivo: string[];
  eventos: { evento: string; passo: number; campos: Record<string, unknown> }[];
  desbloqueioDoAudio: string | null;
  somTravado: boolean;
  jogador: { x: number; y: number; dirX: number; dirY: number } | null;
  camera: { x: number; y: number } | null;
  entrada: {
    maxToques: number;
    joystick: { ativo: boolean; origemX: number; origemY: number; vx: number; vy: number };
    injetar(tipo: 'inicio' | 'move' | 'fim' | 'cancela', id: number, x: number, y: number, t: number): void;
    roteiro(lista: unknown): void;
  };
  toquesPerdidos: number;
  hash(): string | null;
  audio(): string;
  pausar(): void;
  retomar(): void;
  avancar(n: number): void;
}
declare global {
  interface Window {
    __GAME_DEBUG__: Debug;
  }
}

/** Abre o build de debug com a seed do verify e espera a Tela de Acender. `extra` vai na URL (ex.: '&tutorial=0'). */
export async function abrir(page: Page, extra = ''): Promise<void> {
  await page.goto(`/?seed=${SEED}${extra}`);
  await page.waitForFunction(() => window.__GAME_DEBUG__?.estado === 'ACENDER');
}

/** Ponto lógico (pt) → coordenada da página, pela caixa do canvas. */
export async function paraPagina(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const caixa = await page.locator('#jogo canvas').boundingBox();
  if (!caixa) throw new Error('canvas sem caixa');
  return { x: caixa.x + (x * caixa.width) / 390, y: caixa.y + (y * caixa.height) / 844 };
}

export async function tocarAcender(page: Page, insets: Insets = insetsZerados()): Promise<void> {
  const b = alvosDoAcender(insets, [])[0]!;
  const p = await paraPagina(page, b.x + b.largura / 2, b.y + b.altura / 2);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForFunction(() => window.__GAME_DEBUG__.estado === 'VIGILIA');
}

export const proximoFrame = (page: Page): Promise<void> =>
  page.evaluate(() => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));

/** Texto de um id do pt-BR.json, lido do disco (o ESM do Node exige atributo de importação para JSON). */
export function textoDe(id: string): string {
  const tabela = JSON.parse(readFileSync(join(RAIZ, 'src', 'dados', 'textos', 'pt-BR.json'), 'utf-8')) as {
    textos: { id: string; texto: string }[];
  };
  const achado = tabela.textos.find((x) => x.id === id);
  if (!achado) throw new Error(`textoDe: ${id} não está no pt-BR.json`);
  return achado.texto;
}
