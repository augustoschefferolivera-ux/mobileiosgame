// Sonda do TETO (ADR-0002 §13; design/decisoes-F-004.md §5): o estado da sonda,
// a decisão pela mediana com o relógio injetado e o cache vdc.teto.
import { describe, expect, it } from 'vitest';
import { CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS, JOGADOR, MUNDO } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../src/logica/nucleo/pool';
import { montarEstadoDaSonda } from '../../src/logica/nucleo/sonda';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../src/logica/mundo/toro';
import {
  CHAVE_DO_CACHE,
  SONDA,
  SondaDoTeto,
  classeDaTela,
  gravarCacheDoTeto,
  lerCacheDoTeto,
  medirSonda,
  versaoDoSafari,
  type Armazenamento,
} from '../../src/plataforma/sonda';
import { decidirTeto } from '../../src/plataforma/teto';
import { DADOS_DA_CHARNECA as D, PARADO } from '../logica/apoio';

/** Relógio falso: cada passo da simulação "custa" `msPorPasso`. */
function relogio(e: ReturnType<typeof montarEstadoDaSonda>, msPorPasso: number): () => number {
  return () => e.cab[2]! * msPorPasso;
}

describe('estado da sonda', () => {
  it('500 Ocos a ≥ 34 px do jogador e 400 projéteis, no início e depois dos 360 passos', () => {
    const e = montarEstadoDaSonda(D);
    expect([quantosAtivos(e.pool), quantosAtivos(e.poolDeProjeteis)]).toEqual([CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS]);
    const jx = e.jogador[JOGADOR.x]!;
    const jy = e.jogador[JOGADOR.y]!;
    for (let s = 0; s < CAPACIDADE_DE_INIMIGOS; s++) {
      expect(Math.hypot(deltaNoToro(jx, e.inimigos.x[s]!, W), deltaNoToro(jy, e.inimigos.y[s]!, H))).toBeGreaterThanOrEqual(34);
    }
    avancar(e, D, PARADO, SONDA.aquecimento + SONDA.lotes * SONDA.passosPorLote);
    expect([quantosAtivos(e.pool), quantosAtivos(e.poolDeProjeteis)]).toEqual([CAPACIDADE_DE_INIMIGOS, CAPACIDADE_DE_PROJETEIS]);
    expect(e.mundo[MUNDO.mortes]).toBe(0);
  });

  it('a perfuração que não se gasta (255) só sai de montarEstadoDaSonda: nenhuma arma a tem', () => {
    expect([...D.armas.perfuracoes].every((p) => p < 255)).toBe(true);
  });
});

describe('decisão pela mediana (relógio injetado)', () => {
  it('1,5 ms por passo → 500, origem sonda; 2,5 → 300; soma acima de 800 ms → 300', () => {
    const a = montarEstadoDaSonda(D);
    const r1 = medirSonda(a, D, relogio(a, 1.5));
    expect(r1).toEqual({ valor: 500, ms: 1.5 });
    expect(decidirTeto({ override: null, cache: null, tela: null, sonda: r1 })).toEqual({ valor: 500, origem: 'sonda', sondaMs: 1.5 });
    const b = montarEstadoDaSonda(D);
    expect(medirSonda(b, D, relogio(b, 2.5)).valor).toBe(300);
    // 3 ms por passo: 120 × 3 = 360 ms de aquecimento; o 15º lote passa de 800 ms antes do 8º.
    const c = montarEstadoDaSonda(D);
    const sonda = new SondaDoTeto(c, D, relogio(c, 3));
    let etapas = 0;
    let r = null;
    while (r === null) {
      r = sonda.etapa();
      etapas++;
    }
    expect(r.valor).toBe(300);
    expect(etapas).toBeLessThan(1 + SONDA.lotes);
  });

  it('uma etapa por chamada: o aquecimento e depois 8 lotes de 30 passos', () => {
    const e = montarEstadoDaSonda(D);
    const sonda = new SondaDoTeto(e, D, relogio(e, 1));
    expect(sonda.etapa()).toBeNull();
    expect(e.cab[2]).toBe(120);
    for (let k = 0; k < 7; k++) expect(sonda.etapa()).toBeNull();
    expect(sonda.etapa()).toEqual({ valor: 500, ms: 1 });
    expect(e.cab[2]).toBe(360);
  });
});

describe('cache vdc.teto', () => {
  const id = { build: '0.0.0+abc', versaoDoSafari: '26.0', tela: classeDaTela({ dpr: 3, largura: 390, altura: 844 }) };
  const memoria = (): Armazenamento & { dados: Map<string, string> } => {
    const dados = new Map<string, string>();
    return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v) };
  };

  it('grava e lê pela identidade; outro build, outra versão do Safari ou outra tela invalidam', () => {
    const a = memoria();
    gravarCacheDoTeto(a, id, 500);
    expect(a.dados.has(CHAVE_DO_CACHE)).toBe(true);
    expect(lerCacheDoTeto(a, id)).toBe(500);
    expect(lerCacheDoTeto(a, { ...id, build: '0.0.0+def' })).toBeNull();
    expect(lerCacheDoTeto(a, { ...id, versaoDoSafari: '26.1' })).toBeNull();
    expect(lerCacheDoTeto(a, { ...id, tela: '2x375x667' })).toBeNull();
  });

  it('armazenamento que lança erro, ausente ou com lixo vale null, sem quebrar', () => {
    const quebrado: Armazenamento = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(lerCacheDoTeto(quebrado, id)).toBeNull();
    expect(() => gravarCacheDoTeto(quebrado, id, 300)).not.toThrow();
    expect(lerCacheDoTeto(null, id)).toBeNull();
    const lixo = memoria();
    lixo.setItem(CHAVE_DO_CACHE, '{"valor": 400');
    expect(lerCacheDoTeto(lixo, id)).toBeNull();
  });

  it('versão do Safari pelo token Version/ e classe de tela em retrato', () => {
    expect(versaoDoSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1')).toBe('26.0');
    expect(versaoDoSafari('Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0')).toBeNull();
    expect(classeDaTela({ dpr: 3, largura: 844, altura: 390 })).toBe('3x390x844');
  });
});
