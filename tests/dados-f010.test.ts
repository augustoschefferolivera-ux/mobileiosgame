// F-010.13 e F-010.14 (design/decisoes-F-010.md "Critérios"): dados de stamina e de Brasa Firme, cargas do Frasco e a janela do
// aparo lida de uma só constante.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import combate from '../src/dados/combate.json';
import inimigos from '../src/dados/inimigos.json';
import vigilantes from '../src/dados/vigilantes.json';
import { criarTabelaDeCombate } from '../src/logica/mundo/dados';

const RAIZ = join(import.meta.dirname, '..');

/** Todos os .ts de src/ (leitura simples, sem dependência). */
function arquivosTs(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosTs(caminho, saida);
    else if (nome.endsWith('.ts')) saida.push(caminho);
  }
  return saida;
}

describe('F-010.13: dados de stamina, Brasa Firme e Frasco', () => {
  it('os custos e a regeneração de stamina são múltiplos de 0,5 (exatos em Float32, sem acumular erro)', () => {
    const s = combate.stamina;
    for (const v of [s.custo_esquiva, s.custo_aparo, s.regeneracao_por_passo, s.devolucao_do_aparo]) expect((v * 2) % 1, `${v}`).toBe(0);
  });

  it('Brasa Firme lê o limiar de 50% da stamina máxima: 50 com 100 e 60 com staminaMax 120', () => {
    const aldric = vigilantes.vigilantes[0]!;
    expect(criarTabelaDeCombate(combate, aldric, inimigos.inimigos).brasaFirmeLimiar).toBe(50);
    const com120 = criarTabelaDeCombate(combate, { ...aldric, stamina: 120 }, inimigos.inimigos);
    expect([com120.staminaMax, com120.brasaFirmeLimiar]).toEqual([120, 60]);
  });

  it('as cargas do Frasco de cada Vigilante são no máximo 6', () => {
    for (const v of vigilantes.vigilantes) expect(v.frascos.cargas, v.id).toBeLessThanOrEqual(6);
  });
});

describe('F-010.14: a janela do aparo vem de uma só constante', () => {
  it('`aparo.janela_passos` só é lido em logica/mundo/dados.ts; o resto do código lê o campo da tabela', () => {
    const leitores = arquivosTs(join(RAIZ, 'src'))
      .filter((f) => /\bjanela_passos\b/.test(readFileSync(f, 'utf-8')))
      .map((f) => f.slice(RAIZ.length + 1));
    expect(leitores).toEqual(['src/logica/mundo/dados.ts']);
  });

  it('a janela estendida do tutorial é a mesma constante mais o extra, e a tabela guarda os dois valores', () => {
    const t = criarTabelaDeCombate(combate, vigilantes.vigilantes[0]!, inimigos.inimigos);
    expect([t.aparoLimite, t.aparoLimiteEstendido]).toEqual([combate.aparo.janela_passos, combate.aparo.janela_passos + combate.aparo.janela_tutorial_extra_passos]);
  });
});
