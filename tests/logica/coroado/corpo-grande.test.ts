// Corpos grandes (design/decisoes-F-008.md CR10): o Coroado (raio 32) fica fora da grade da massa, numa lista própria de
// até 4; a separação o trata dos dois lados; as armas o alcançam com o raio da forma (R_MAX continua 24, com a folga fixa
// de 8 px só para os grandes); o pulso do Círculo o ignora (CR8).
import { describe, expect, it } from 'vitest';
import { rodarArmas } from '../../../src/logica/armas/armas';
import { ARMA, indiceDoNivel } from '../../../src/logica/armas/tabela';
import { CELULAS, FOLGA_DOS_GRANDES, GRANDES, MAX_GRANDES, consultarGradeComGrandes, consultarGradeDoRascunho, CONSULTA } from '../../../src/logica/mundo/grade';
import { grade, listarVivos, montarGradeDaMassa, separarHorda, vivos } from '../../../src/logica/mundo/horda';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { CAPACIDADE_DE_INIMIGOS, CENARIO, FOGUEIRA_U8, JOGADOR, criarEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { DADOS_SEM_OBSTACULOS as VAZIO, PARADO, SEM_HORDA } from '../apoio';
import { TIPO, eventosDe, posJogador } from '../combate/apoio';

const COROADO = TIPO.oco_grande_coroado;
const N = CAPACIDADE_DE_INIMIGOS;

function estado(extra: Parameters<typeof criarEstado>[2] = {}): Estado {
  const e = criarEstado(1, VAZIO, { ...SEM_HORDA, ...extra });
  e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 1000;
  e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 1000;
  return e;
}

function vivosDe(e: Estado): Int32Array {
  const ids: number[] = [];
  for (let s = 0; s < N; s++) if (e.pool.posicao[s]! >= 0) ids.push(s);
  return Int32Array.from(ids);
}

describe('a lista dos grandes e a grade da massa', () => {
  it('o Coroado fica fora da grade e na lista; o Oco Grande (24 px) segue na grade', () => {
    const e = estado();
    const c = nascerInimigo(e, VAZIO, COROADO, 500, 500, false);
    const g = nascerInimigo(e, VAZIO, TIPO.oco_grande, 700, 500, false);
    const o = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 900, 500, false);
    montarGradeDaMassa(e, VAZIO, vivos, listarVivos(e));
    expect(GRANDES[MAX_GRANDES]).toBe(1);
    expect(GRANDES[0]).toBe(c);
    expect(grade.inicio[CELULAS]).toBe(2);
    const naGrade = new Set(Array.from(grade.indices.subarray(0, 2)));
    expect(naGrade).toEqual(new Set([g, o]));
  });

  it('o R_MAX continua 24 e o raio dos obstáculos é 32; o Coroado e o Lanterneiro (F-009) contam como grandes, os outros não', () => {
    expect([VAZIO.tipos.raioMaximo, VAZIO.tipos.raioDeObstaculo, FOLGA_DOS_GRANDES]).toEqual([24, 32, 8]);
    expect(VAZIO.tipos.raioDeObstaculo - VAZIO.tipos.raioMaximo).toBeLessThanOrEqual(FOLGA_DOS_GRANDES);
    expect([...VAZIO.tipos.grande]).toEqual([0, 0, 0, 0, 1, 1]);
  });

  it('o 5º Coroado não nasce (a lista tem 4 lugares); a morte de um libera o lugar', () => {
    const e = estado();
    const slots = [0, 1, 2, 3].map((k) => nascerInimigo(e, VAZIO, COROADO, 200 + 120 * k, 300, false));
    expect(slots.every((s) => s >= 0)).toBe(true);
    expect(e.fogueiraU8[FOGUEIRA_U8.coroadosVivos]).toBe(4);
    expect(nascerInimigo(e, VAZIO, COROADO, 900, 300, false)).toBe(-1);
    expect(e.fogueiraU8[FOGUEIRA_U8.coroadosVivos]).toBe(4);
  });

  it('a consulta com R_MAX acha o grande até R + 32 (centro), e a sem folga só até R', () => {
    const e = estado();
    const c = nascerInimigo(e, VAZIO, COROADO, 1100, 1000, false);
    montarGradeDaMassa(e, VAZIO, vivos, listarVivos(e));
    const out = new Int32Array(N);
    const R = 64;
    // Consulta com R + 24: o centro do grande a R + 32 só entra com a folga de 8 px.
    CONSULTA[0] = 1100 - (R + 32);
    CONSULTA[1] = 1000;
    CONSULTA[2] = R + 24;
    expect(consultarGradeComGrandes(grade, e.inimigos.x, e.inimigos.y, out)).toBe(1);
    expect(out[0]).toBe(c);
    CONSULTA[0] = 1100 - (R + 32.5);
    CONSULTA[1] = 1000;
    CONSULTA[2] = R + 24;
    expect(consultarGradeComGrandes(grade, e.inimigos.x, e.inimigos.y, out)).toBe(0);
    // Sem a folga (a busca das Facas, centro a centro): exatamente o raio.
    CONSULTA[0] = 1100 - 90;
    CONSULTA[1] = 1000;
    CONSULTA[2] = 90;
    expect(consultarGradeDoRascunho(grade, e.inimigos.x, e.inimigos.y, out)).toBe(1);
    CONSULTA[2] = 89.9;
    expect(consultarGradeDoRascunho(grade, e.inimigos.x, e.inimigos.y, out)).toBe(0);
  });
});

describe('separação com o corpo grande (partilha igual, dos dois lados)', () => {
  const sx = new Float64Array(N);
  const sy = new Float64Array(N);

  it('um Oco das Lanternas a 40 px do Coroado (soma 48, penetração 8): cada um recebe 4 px, em sentidos opostos', () => {
    for (const ladoDoOco of [1, -1]) {
      const e = estado();
      const primeiro = ladoDoOco === 1 ? COROADO : TIPO.oco_das_lanternas;
      const a = nascerInimigo(e, VAZIO, primeiro, 500, 500, false);
      const b = nascerInimigo(e, VAZIO, primeiro === COROADO ? TIPO.oco_das_lanternas : COROADO, 540, 500, false);
      const ids = vivosDe(e);
      separarHorda(e, VAZIO, ids, ids.length, sx, sy);
      // O Coroado e a velocidade limite: 4 px é maior que o 1,56 do Coroado e que o 1,32 do Oco; o limite por tipo corta.
      const vCoroado = VAZIO.tipos.velocidade[COROADO]!;
      const vOco = VAZIO.tipos.velocidade[TIPO.oco_das_lanternas]!;
      const [esq, dir] = [a, b];
      const vEsq = ladoDoOco === 1 ? vCoroado : vOco;
      const vDir = ladoDoOco === 1 ? vOco : vCoroado;
      expect(sx[esq]).toBeCloseTo(-vEsq, 10);
      expect(sx[dir]).toBeCloseTo(vDir, 10);
      expect([sy[esq], sy[dir]]).toEqual([0, 0]);
    }
  });

  it('com 1 px de penetração o par divide 0,5 para cada lado, sem corte pela velocidade', () => {
    const e = estado();
    const c = nascerInimigo(e, VAZIO, COROADO, 500, 500, false);
    const o = nascerInimigo(e, VAZIO, TIPO.oco_das_lanternas, 547, 500, false);
    const ids = vivosDe(e);
    separarHorda(e, VAZIO, ids, ids.length, sx, sy);
    expect([sx[c], sx[o]]).toEqual([-0.5, 0.5]);
  });

  it('dois Coroados sobrepostos se afastam, um da outra, com a mesma partilha; contados uma vez', () => {
    const e = estado();
    const a = nascerInimigo(e, VAZIO, COROADO, 500, 500, false);
    const b = nascerInimigo(e, VAZIO, COROADO, 563, 500, false);
    const ids = vivosDe(e);
    separarHorda(e, VAZIO, ids, ids.length, sx, sy);
    expect([sx[a], sx[b]]).toEqual([-0.5, 0.5]);
  });
});

describe('armas contra o corpo grande (CR10, CR8)', () => {
  const ESPADA = { codigo: ARMA.espada_longa_do_juramento, nivel: 1 };

  /** O Coroado a `d` px à direita do jogador, a mira para a direita; roda um passo de armas; devolve os acertos nele. */
  function acertos(armas: readonly { codigo: number; nivel: number }[], d: number): number {
    const e = criarEstado(1, VAZIO, { cenario: CENARIO.diretorDesligado, armas });
    const [jx, jy] = posJogador(e);
    const s = nascerInimigo(e, VAZIO, COROADO, jx + d, jy, false);
    e.jogador[JOGADOR.dirX] = 1;
    e.jogador[JOGADOR.dirY] = 0;
    e.inimigos.hp[s] = 100_000;
    rodarArmas(e, VAZIO);
    return eventosDe(e, EVENTO.acerto).filter((ev) => ev.slot === s).length;
  }

  it('a Espada acerta o Coroado com o centro a R + 32 e não a R + 32,1 (o raio da forma, não o R_MAX de 24)', () => {
    const R = VAZIO.armas.alcance[indiceDoNivel(ARMA.espada_longa_do_juramento, 1)]!;
    expect(acertos([ESPADA], R + 32)).toBe(1);
    expect(acertos([ESPADA], R + 32.1)).toBe(0);
    // O Oco Grande (24) segue como antes: R + 24 acerta, R + 24,1 não.
    for (const [d, esperado] of [[R + 24, 1], [R + 24.1, 0]] as const) {
      const e = criarEstado(1, VAZIO, { cenario: CENARIO.diretorDesligado, armas: [ESPADA] });
      const [jx, jy] = posJogador(e);
      const s = nascerInimigo(e, VAZIO, TIPO.oco_grande, jx + d, jy, false);
      e.jogador[JOGADOR.dirX] = 1;
      e.jogador[JOGADOR.dirY] = 0;
      rodarArmas(e, VAZIO);
      expect(eventosDe(e, EVENTO.acerto).filter((ev) => ev.slot === s).length, String(d)).toBe(esperado);
    }
  });

  it('o Círculo causa o tick no Coroado a R + 32 mas não o empurra (o pulso o ignora); o Oco Grande é empurrado', () => {
    const circulo = { codigo: ARMA.circulo_de_sal, nivel: 7 };
    const i = indiceDoNivel(ARMA.circulo_de_sal, 7);
    expect(VAZIO.armas.pulso[i]).toBe(1);
    const R = VAZIO.armas.alcance[i]!;
    const e = criarEstado(1, VAZIO, { cenario: CENARIO.diretorDesligado, armas: [circulo] });
    const [jx, jy] = posJogador(e);
    const c = nascerInimigo(e, VAZIO, COROADO, jx + R + 30, jy, false);
    const g = nascerInimigo(e, VAZIO, TIPO.oco_grande, jx - R - 20, jy, false);
    e.inimigos.hp[c] = 100_000;
    e.inimigos.hp[g] = 100_000;
    // Um passo inteiro: a aura grava o afastamento nos dois e `rodarEtapa` desfaz o do Coroado antes de a horda andar.
    avancar(e, VAZIO, PARADO, 1);
    expect(e.inimigos.hp[c]).toBeLessThan(100_000);
    expect(e.inimigos.kbPassos[c]).toBe(0);
    expect(e.inimigos.kbPassos[g]).toBeGreaterThan(0);
  });
});
