// Fundação na simulação (design/decisoes-F-010.md FD4 a FD6, FD12, LY1; F-010.11): Pele, Fôlego, Casco e Bigorna lidos do
// estado desde o passo 0; rank 0 não muda nada; as 3 chamadas de `passo` com e sem Fundação ficam em ≤ 16 B por passo.
import { Session } from 'node:inspector/promises';
import { describe, expect, it } from 'vitest';
import { BRUTO, LIQUIDO, ORIGEM_DO_DANO, aplicarContato, danoAoJogador } from '../../../src/logica/mundo/contato';
import { nascerInimigo } from '../../../src/logica/mundo/inimigos';
import { TIPO } from '../../../src/logica/mundo/tipos';
import { CENARIO, JOGADOR, JOGADOR2, JOGADOR3, JOGADOR_U8, PROGRESSAO, TODOS_OS_TUTORIAIS, criarEstado, hashEstado, hashPorSecao, reiniciarEstado, type Estado, type RanksDaFundacao } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { cruzarNiveis } from '../../../src/logica/progressao/atributos';
import { hpMaximo } from '../../../src/logica/progressao/tabela';
import { armadura } from '../../../src/logica/progressao/dano';
import { MULTIPLICADOR_DA_BIGORNA } from '../../../src/logica/progressao/efeitosDaFundacao';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, DADOS_BRUTOS as DB, PARADO } from '../apoio';

const MAXIMOS: RanksDaFundacao = { pele: 5, folego: 5, casco: 3, bigorna: 3 };
const ZERO: RanksDaFundacao = { pele: 0, folego: 0, casco: 0, bigorna: 0 };
const JX = 585;
const JY = 1266;

function comFundacao(fundacao: RanksDaFundacao): Estado {
  return criarEstado(1, DB, { cenario: CENARIO.diretorDesligado, armas: [], fundacao });
}

/** Dano líquido de um bruto 100 sem Brasa Firme (stamina 0), pelo ponto único. */
function liquido(e: Estado, origem: number): number {
  e.jogador3[JOGADOR3.stamina] = 0;
  BRUTO[0] = 100;
  danoAoJogador(e, DB, origem);
  return LIQUIDO[0]!;
}

describe('efeitos dos ranks (FD4 a FD6)', () => {
  it('Pele 5: Armadura 10; Fôlego 5: HP máximo e HP inicial 182 (Σ% 15 + 25 sobre a base 130; a D10 dizia 188, ver ADR-0012 §9); os ranks ficam no estado', () => {
    const e = comFundacao(MAXIMOS);
    expect(armadura(e, DB)).toBe(10);
    expect(e.jogador2[JOGADOR2.hpMax]).toBe(182);
    expect(e.jogador[JOGADOR.hp]).toBe(182);
    expect([...e.fundacaoU8]).toEqual([5, 5, 3, 3]);
    expect(armadura(comFundacao(ZERO), DB)).toBe(0);
    expect(comFundacao(ZERO).jogador2[JOGADOR2.hpMax]).toBe(DB.hpInicial);
  });

  it('Fôlego no level-up (crítico M5): o nível 2 recalcula o HP máximo com o Σ% da passiva mais o Fôlego, e não o de Pele', () => {
    const t = DB.progressao;
    const subir = (fundacao: RanksDaFundacao): Estado => {
      const e = comFundacao(fundacao);
      e.progresso[PROGRESSAO.xp] = t.custo[1]!;
      expect(cruzarNiveis(e, DB)).toBe(1);
      return e;
    };
    const base = t.hpBase + t.hpPorNivel;
    const folego = subir({ ...ZERO, folego: 5 });
    expect(folego.jogador2[JOGADOR2.hpMax]).toBe(hpMaximo(base, t.hpPct + 25));
    expect(folego.jogador2[JOGADOR2.hpMax]).toBeGreaterThan(subir(ZERO).jogador2[JOGADOR2.hpMax]!);
    expect(folego.jogador[JOGADOR.hp]).toBe(folego.jogador2[JOGADOR2.hpMax]);
    expect(subir({ ...ZERO, pele: 5 }).jogador2[JOGADOR2.hpMax]).toBe(hpMaximo(base, t.hpPct));
  });

  it('Casco 3: o contato abre 18 + 9 = 27 passos de invulnerabilidade; o fator 0,3 do acerto não muda', () => {
    for (const [casco, esperado] of [[0, 18], [1, 21], [3, 27]] as const) {
      const e = comFundacao({ ...ZERO, casco });
      e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = JX;
      e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = JY;
      nascerInimigo(e, DB, TIPO.oco_das_lanternas, JX + 32, JY, false);
      expect(aplicarContato(e, DB)).toBe(0);
      expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(esperado);
      expect(e.jogador[JOGADOR.hp]).toBe(DB.hpInicial - 1.5);
    }
  });

  it('Bigorna 3 e Pele 5: contato 100 × 0,6667 × 0,91 = 60,67; o mesmo golpe como projétil dá 66,67; Bigorna 0 dá o dano da D7', () => {
    const e = comFundacao({ ...ZERO, pele: 5, bigorna: 3 });
    expect(liquido(e, ORIGEM_DO_DANO.contato)).toBeCloseTo(60.67, 2);
    expect(liquido(e, ORIGEM_DO_DANO.projetil)).toBeCloseTo(66.67, 2);
    expect(liquido(e, ORIGEM_DO_DANO.golpe)).toBeCloseTo(66.67, 2);
    expect(liquido(e, ORIGEM_DO_DANO.fome)).toBeCloseTo(66.67, 2);
    const sem = comFundacao({ ...ZERO, pele: 5 });
    expect(liquido(sem, ORIGEM_DO_DANO.contato)).toBe(Math.fround(100 * (20 / 30)));
    expect([...MULTIPLICADOR_DA_BIGORNA]).toEqual([1, 0.97, 0.94, 0.91].map(Math.fround));
  });

  it('a Bigorna multiplica antes da Brasa Firme (stamina acima do limiar)', () => {
    const e = comFundacao({ ...ZERO, bigorna: 3 });
    e.jogador3[JOGADOR3.stamina] = 100;
    BRUTO[0] = 100;
    danoAoJogador(e, DB, ORIGEM_DO_DANO.contato);
    const f = Math.fround;
    expect(LIQUIDO[0]).toBe(f(f(f(100) * f(0.91)) * DB.combate.brasaFirmeFator));
  });
});

describe('rank 0, validação e reinício', () => {
  it('rank 0 em tudo dá o mesmo hash que os parâmetros sem Fundação, e os ranks valem desde o passo 0 (o hash difere)', () => {
    const p = { ...parametrosDoCenario('horda_com_ataques'), tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300 };
    const a = criarEstado(3, D, p);
    const b = criarEstado(3, D, { ...p, fundacao: ZERO });
    avancar(a, D, PARADO, 300);
    avancar(b, D, PARADO, 300);
    expect(hashEstado(a)).toBe(hashEstado(b));
    const c = criarEstado(3, D, { ...p, fundacao: { ...ZERO, casco: 1 } });
    expect(hashEstado(c)).not.toBe(hashEstado(criarEstado(3, D, p)));
  });

  it('a seção `fundacao` do hash cobre os 4 bytes (crítico M46)', () => {
    const base = hashPorSecao(comFundacao(ZERO)).fundacao;
    for (const campo of ['pele', 'folego', 'casco', 'bigorna'] as const) {
      expect(hashPorSecao(comFundacao({ ...ZERO, [campo]: 1 })).fundacao).not.toBe(base);
    }
  });

  it('rank fora da faixa ou não inteiro é erro; reiniciar zera os ranks do estado anterior', () => {
    for (const f of [{ ...ZERO, pele: 6 }, { ...ZERO, casco: 4 }, { ...ZERO, bigorna: -1 }, { ...ZERO, bigorna: 4 }, { ...ZERO, folego: 6 }, { ...ZERO, folego: 1.5 }]) {
      expect(() => criarEstado(1, DB, { fundacao: f })).toThrow(/Fundação/);
    }
    const e = comFundacao(MAXIMOS);
    reiniciarEstado(e, 2, DB, {});
    expect([...e.fundacaoU8]).toEqual([0, 0, 0, 0]);
    expect(e.jogador2[JOGADOR2.hpMax]).toBe(DB.hpInicial);
  });
});

const LIMITE = 16;
const MEDIDOS = 6000;

async function bytesPorPasso(e: Estado): Promise<number> {
  avancar(e, D, PARADO, 30_000);
  const sessao = new Session();
  sessao.connect();
  await sessao.post('HeapProfiler.startSampling', { samplingInterval: 64, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true } as never);
  for (let k = 0; k < MEDIDOS; k++) avancar(e, D, PARADO, 1);
  const { profile } = (await sessao.post('HeapProfiler.stopSampling')) as unknown as { profile: { head: No } };
  sessao.disconnect();
  let nossos = 0;
  const visitar = (n: No): void => {
    if (n.selfSize > 0 && n.callFrame.url.includes('/src/')) nossos += n.selfSize;
    n.children.forEach(visitar);
  };
  visitar(profile.head);
  return nossos / MEDIDOS;
}
interface No {
  callFrame: { url: string };
  selfSize: number;
  children: No[];
}

describe('alocação com a Fundação (E7)', () => {
  it(`horda parada e levando contato, ${MEDIDOS} passos: ≤ ${LIMITE} B por passo com e sem Fundação`, async () => {
    const p = { ...parametrosDoCenario('horda_com_ataques'), tutoriaisVistos: TODOS_OS_TUTORIAIS, teto: 300, cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel | CENARIO.ataques };
    for (const fundacao of [ZERO, MAXIMOS]) {
      const e = criarEstado(5, D, { ...p, fundacao });
      expect(await bytesPorPasso(e)).toBeLessThanOrEqual(LIMITE);
    }
  }, 300_000);
});
