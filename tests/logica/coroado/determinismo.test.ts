// Determinismo do marco (design/decisoes-F-008.md LY4, §1; critério F-008.6 no nível do estado): a Vigília que cruza os 5
// minutos com o Coroado, a Patada e o Grito, a convocação, a arena e a Fogueira repete bit a bit; e o buffer inteiro
// basta para continuar (copiar os bytes para outro estado no meio, dentro da arena, e seguir dá o mesmo hash).
import { describe, expect, it } from 'vitest';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { CENARIO, FOGUEIRA_U8, TODOS_OS_TUTORIAIS, criarEstado, hashEstado, sincronizarDerivados, type Estado } from '../../../src/logica/nucleo/estado';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ROTEIRO_REFERENCIA } from '../../../src/logica/nucleo/referencia';
import { hex8 } from '../../../src/logica/nucleo/hash';
import { DADOS_DA_CHARNECA as D } from '../apoio';

function marco(seed: number): Estado {
  const base = parametrosDoCenario('tres_armas');
  return criarEstado(seed, D, {
    armas: base.armas,
    cenario: CENARIO.ataques,
    tutoriaisVistos: TODOS_OS_TUTORIAIS,
    relogioInicial: D.marcos.limiar[0]! - 300,
    inicioLivre: true,
  });
}

describe('o marco repete bit a bit', () => {
  for (const seed of [1, 424242]) {
    it(`seed ${seed}: duas execuções de 3.000 passos (arena, Patada, Grito e uma convocação) dão o mesmo hash`, () => {
      const a = marco(seed);
      const b = marco(seed);
      const fonte = fonteDoRoteiro(ROTEIRO_REFERENCIA);
      avancar(a, D, fonte, 3000);
      avancar(b, D, fonteDoRoteiro(ROTEIRO_REFERENCIA), 3000);
      expect(hex8(hashEstado(a))).toBe(hex8(hashEstado(b)));
      // O trecho foi mesmo exercitado: marco iniciado, arena ou fim dele, convocações feitas.
      expect(a.fogueiraU8[FOGUEIRA_U8.marcosIniciados]).toBe(1);
    });
  }

  it('salvar no passo 400 (dentro da arena), restaurar e continuar 2.000 passos dá o mesmo hash que sem salvar', () => {
    const fonte = (): ReturnType<typeof fonteDoRoteiro> => fonteDoRoteiro(ROTEIRO_REFERENCIA);
    const a = marco(1);
    const f = fonte();
    avancar(a, D, f, 400);
    expect(a.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(1);
    const b = marco(7);
    b.bytes.set(a.bytes);
    sincronizarDerivados(b, D);
    expect(hashEstado(b)).toBe(hashEstado(a));
    avancar(a, D, f, 2000);
    avancar(b, D, f, 2000);
    expect(hex8(hashEstado(b))).toBe(hex8(hashEstado(a)));
  });
});
