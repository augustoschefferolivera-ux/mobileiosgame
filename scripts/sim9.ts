// U9 da F-009 (design/decisoes-F-009.md §6): a luta com o Lanterneiro, de 20:00 a 23:00 e o que vem depois, medida e reprodutível, sem gate.
// Parte do estado do cenário `lanterneiro` (nível 29; Espada, Facas e Círculo nv8; Elmo e Luvas nv5; 3 Frascos; a arena forma no passo 30) e
// roda o bot da luta até o FIM: apara os brancos a 6 passos do golpe, esquiva dos vermelhos a 8 e bebe o Frasco abaixo de 60 de HP; o
// "corpo a corpo" anda até 90 px do chefe, o "parado" fica onde está. As Almas com que o jogador chega aos 20:00 vêm do Q-21 (≈ 400 /
// 1.100 / 1.600) como `almasIniciais`; o que a luta soma (as 200 do chefe, o ×1,5 do Amanhecer) vai para o Santuário.
import { criarDadosDaCharneca } from '../src/plataforma/dadosDaVigilia';
import { parametrosDoCenario, prepararNivelDoCenario } from '../src/plataforma/cenarios';
import { ACAO, type FonteDeComandos } from '../src/logica/nucleo/comandos';
import { CAB, CAUSA_DO_FIM, CHEFE_U16, CHEFE_U8, FASE, JOGADOR, JOGADOR3_U16, JOGADOR4_U8, SEM_CHEFE, criarEstado, type Estado } from '../src/logica/nucleo/estado';
import { avancar } from '../src/logica/nucleo/passo';
import { resultadoDaVigilia } from '../src/logica/mundo/vigilia';
import { deltaNoToro, ALTURA_DO_MAPA, LARGURA_DO_MAPA } from '../src/logica/mundo/toro';

export type Comportamento = 'corpo_a_corpo' | 'parado';
export const COMPORTAMENTOS: readonly Comportamento[] = ['corpo_a_corpo', 'parado'];
/** As Almas na mão aos 20:00 do Q-21 (Vigília fraca, mediana e forte). */
export const ALMAS_DO_Q21: readonly number[] = [400, 1100, 1600];

export interface ResultadoDaLuta {
  readonly seed: number;
  readonly comportamento: Comportamento;
  /** Como a Vigília acabou: 'amanhecer' (o chefe caiu e os 10 s de céu passaram), 'a_fome' ou 'apagar'. */
  readonly fim: 'amanhecer' | 'a_fome' | 'apagar' | 'sem_fim';
  /** Passos da luta até a morte do chefe (a contar de 72.000); null se ele não morreu. */
  readonly passosAteAMorte: number | null;
  readonly quebras: number;
  readonly faseMax: number;
  readonly hpDoJogadorNoFim: number;
  /** Almas ao Santuário para cada valor de `ALMAS_DO_Q21`. */
  readonly almasAoSantuario: readonly number[];
}

/** O bot da luta (o mesmo da Playwright, e2e/f009.spec.ts): lê o estado a cada passo e não aloca. */
function criarFonte(comportamento: Comportamento, e: Estado): FonteDeComandos {
  return {
    comandosDoPasso(_passo, out) {
      out.movimento[0] = 0;
      out.movimento[1] = 0;
      out.acoes[0] = 0;
      const s = e.chefeU16[CHEFE_U16.slot]!;
      if (s === SEM_CHEFE) return;
      const ini = e.inimigos;
      if (comportamento === 'corpo_a_corpo') {
        const dx = deltaNoToro(e.jogador[JOGADOR.x]!, ini.x[s]!, LARGURA_DO_MAPA);
        const dy = deltaNoToro(e.jogador[JOGADOR.y]!, ini.y[s]!, ALTURA_DO_MAPA);
        const d = Math.hypot(dx, dy);
        if (d > 90) {
          out.movimento[0] = dx / d;
          out.movimento[1] = dy / d;
        }
      }
      let acao = 0;
      if (ini.ataqueFase[s] === 1) {
        const t = ini.ataqueTimer[s]!;
        const id = ini.ataqueId[s]!;
        if (id >= 1 && id <= 2 && e.jogador3U16[JOGADOR3_U16.ameacasAparaveis]! > 0 && t === 6) acao = ACAO.aparo;
        else if (id === 6 && t === 6) acao = ACAO.aparo;
        else if ((id === 3 || id === 5) && t === 8) acao = ACAO.esquiva;
      }
      if (acao === 0 && e.jogador[JOGADOR.hp]! < 60 && e.jogador4U8[JOGADOR4_U8.frascoCargas]! > 0 && e.jogador4U8[JOGADOR4_U8.frascoPasso] === 0) acao = ACAO.frasco;
      out.acoes[0] = acao;
    },
    escolhaDoModal: () => 0,
  };
}

/** Uma luta, de uma seed e de um comportamento, com as Almas aos 20:00 de `almas` (só o Santuário muda com elas). */
export function lutar(seed: number, comportamento: Comportamento, almas: number, passosMax = 15000): { r: ResultadoDaLuta; santuario: number } {
  const dados = criarDadosDaCharneca();
  const e = criarEstado(seed, dados, { ...parametrosDoCenario('lanterneiro'), almasIniciais: almas });
  prepararNivelDoCenario(e, dados, 'lanterneiro');
  const fonte = criarFonte(comportamento, e);
  let morteEm: number | null = null;
  for (let t = 0; t < passosMax; t++) {
    if (avancar(e, dados, fonte, 1) === 0) break;
    if (morteEm === null && e.chefeU8[CHEFE_U8.morto] === 1) morteEm = e.cab[CAB.relogio]! - dados.marcos.chefeEm;
    if (e.jogador4U8[JOGADOR4_U8.fase] === FASE.fim) break;
  }
  const fase = e.jogador4U8[JOGADOR4_U8.fase]!;
  const causa = e.jogador4U8[JOGADOR4_U8.causaDoFim]!;
  const res = fase === FASE.fim ? resultadoDaVigilia(e, dados) : null;
  const fim = fase !== FASE.fim ? 'sem_fim' : causa === CAUSA_DO_FIM.amanhecer ? 'amanhecer' : causa === CAUSA_DO_FIM.aFome ? 'a_fome' : 'apagar';
  return {
    santuario: res?.almasAoSantuario ?? 0,
    r: {
      seed,
      comportamento,
      fim,
      passosAteAMorte: morteEm,
      quebras: e.chefeU8[CHEFE_U8.quebras]!,
      faseMax: e.chefeU8[CHEFE_U8.faseMax]!,
      hpDoJogadorNoFim: Math.round(e.jogador[JOGADOR.hp]!),
      almasAoSantuario: [res?.almasAoSantuario ?? 0],
    },
  };
}

/** A medida de uma seed e de um comportamento: uma luta por valor de Almas do Q-21 (a luta é a mesma; o Santuário muda). */
export function medir(seed: number, comportamento: Comportamento): ResultadoDaLuta {
  const lutas = ALMAS_DO_Q21.map((a) => lutar(seed, comportamento, a));
  return { ...lutas[0]!.r, almasAoSantuario: lutas.map((l) => l.santuario) };
}

