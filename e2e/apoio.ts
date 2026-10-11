// Auxiliares dos testes da Playwright (projeto taps-game): o contrato do
// __GAME_DEBUG__, a abertura com a seed de VDC_SEED (o --seed do
// scripts/verify.sh), a conversão de pt para a página e o toque em Acender.
import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alvosDoAcender } from '../src/entrada/alvos';
import type { EntradaDebug, GameDebug } from '../src/cenas/debug';
import { SEED_PADRAO } from '../src/logica/nucleo/referencia';
import { insetsZerados, type Insets } from '../src/plataforma/safeArea';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
export const EVIDENCIAS = process.env['VDC_EVIDENCIAS'] === '1';
/** Vigília sem diretor (design/decisoes-F-003.md §5, T3): os testes de movimento das F-001 e F-002. */
export const SEM_HORDA = '&cenario=sem_horda';
/**
 * A Vigília normal sem Cinzas (design/decisoes-F-005.md §5, E6): parada, a normal abre o 1º level up no
 * passo 723 (seed 1); os specs antigos que passam de 600 passos sem tratar o modal usam esta receita.
 */
export const SEM_CINZAS = '&cenario=vigilia_sem_cinzas';

/** O contrato do __GAME_DEBUG__ (src/cenas/debug.ts), com os ganchos do build de debug, que é o que a Playwright serve. */
export type Debug = Omit<GameDebug, 'entrada'> &
  Required<Pick<GameDebug, 'pausar' | 'retomar' | 'avancar' | 'quadros' | 'inimigos' | 'projeteis' | 'hashPorSecao' | 'removerInimigo' | 'pickups' | 'efeitosDeChao'>> & {
    entrada: Required<EntradaDebug>;
  };
declare global {
  interface Window {
    __GAME_DEBUG__: Debug;
  }
}

/**
 * Abre o build de debug com a seed do verify e espera a Tela de Acender. `extra` vai na URL (ex.: '&tutorial=0').
 * A sonda do TETO fica desligada (`&sonda=0`): o TETO não depende da máquina e nenhum spec grava `vdc.teto`
 * (design/decisoes-F-004.md §5); só o spec da sonda a liga, com `sonda = true`.
 */
export async function abrir(page: Page, extra = '', sonda = false): Promise<void> {
  await page.goto(`/?seed=${SEED}${sonda ? '' : '&sonda=0'}${extra}`);
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

/** Pixels diferentes entre dois PNG do mesmo tamanho, e a maior diferença num canal. */
export async function diferenca(page: Page, a: Buffer, b: Buffer): Promise<{ diferentes: number; total: number; maior: number }> {
  return page.evaluate(
    async ([x, y]) => {
      const ler = async (b64: string): Promise<Uint8ClampedArray> => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        [c.width, c.height] = [img.width, img.height];
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height).data;
      };
      const [pa, pb] = [await ler(x), await ler(y)];
      let diferentes = 0;
      let maior = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const d = Math.max(Math.abs(pa[i]! - pb[i]!), Math.abs(pa[i + 1]! - pb[i + 1]!), Math.abs(pa[i + 2]! - pb[i + 2]!));
        if (d > 0) diferentes++;
        maior = Math.max(maior, d);
      }
      return { diferentes, total: pa.length / 4, maior };
    },
    [a.toString('base64'), b.toString('base64')] as const,
  );
}

/**
 * Iguais byte a byte com WebGL por software; com GPU de hardware, ≤ 1 por canal em ≤ 0,1% dos pixels
 * (design/decisoes-F-003.md §7). Com membros translúcidos (`translucidos`: as camadas das armas), a mistura de
 * alpha arredonda diferente no SpriteGPULayer e no Image, também por software: ≤ 1 por canal em ≤ 1% dos pixels
 * (medido: 0,5% no tres_armas, só nos dígitos, na estocada e nas facas; ADR-0006).
 */
export async function esperarIguais(page: Page, a: Buffer, b: Buffer, rotulo: string, translucidos = false): Promise<void> {
  if (a.equals(b)) return;
  const software = await page.evaluate(() => window.__GAME_DEBUG__.webgl.software);
  const d = await diferenca(page, a, b);
  const resumo = `${rotulo}: ${d.diferentes} pixels diferentes (maior ${d.maior}) com WebGL ${software ? 'por software' : 'de hardware'}`;
  if (!translucidos) expect(software, resumo).toBe(false);
  expect(d.maior, resumo).toBeLessThanOrEqual(1);
  expect(d.diferentes / d.total, resumo).toBeLessThanOrEqual(translucidos ? 0.01 : 0.001);
}
