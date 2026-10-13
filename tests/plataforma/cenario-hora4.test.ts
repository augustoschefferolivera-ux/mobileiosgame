// Cenário hora4_armas (design/decisoes-F-010.md CN1): a receita de tres_armas na linha 19, relógio 16:00, jogador invulnerável,
// para a carga real de armas e projéteis na Hora IV do roteiro do iPhone e para o teste de 30 s no Chromium.
import { describe, expect, it } from 'vitest';
import { CAB, CENARIO, JOGADOR, TODOS_OS_TUTORIAIS, criarEstado, hashEstado } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { quantosAtivos } from '../../src/logica/nucleo/pool';
import { parametrosDoCenario } from '../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA, PARADO } from '../logica/apoio';

describe('hora4_armas (CN1)', () => {
  it('os parâmetros: tres_armas com a linha 19 fixa e o relógio em 16:00 (57.600 passos)', () => {
    expect(parametrosDoCenario('hora4_armas')).toEqual({
      ...parametrosDoCenario('tres_armas'),
      tutoriaisVistos: TODOS_OS_TUTORIAIS,
      cenario: CENARIO.jogadorInvulneravel | CENARIO.semCinzas,
      linhaFixa: 19,
      relogioInicial: 57_600,
    });
  });

  it('30 s de Vigília com TETO 500: a horda enche até o TETO, o jogador segue vivo e o hash se repete', () => {
    const rodar = (): { hash: number; vivos: number; relogio: number; hp: number } => {
      const e = criarEstado(1, DADOS_DA_CHARNECA, { ...parametrosDoCenario('hora4_armas'), teto: 500 });
      avancar(e, DADOS_DA_CHARNECA, PARADO, 1800);
      return { hash: hashEstado(e), vivos: quantosAtivos(e.pool), relogio: e.cab[CAB.relogio]!, hp: e.jogador[JOGADOR.hp]! };
    };
    const a = rodar();
    expect(a.relogio).toBe(57_600 + 1800);
    expect(a.hp).toBeGreaterThan(0);
    expect(a.vivos).toBeGreaterThan(100);
    expect(a.vivos).toBeLessThanOrEqual(500);
    expect(rodar()).toEqual(a);
  });
});
