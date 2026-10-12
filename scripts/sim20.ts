// Simulação de 20 min (design/decisoes-F-005.md P6): medida reprodutível, sem gate.
// Roda `npx tsx scripts/sim20.ts` e grava `.verify/sim20.json`. Seeds 1 a 3,
// jogador invulnerável, 72.000 passos (20 min a 60 Hz), sempre a 1ª carta de cada
// oferta (baú fecha sem escolha), três comportamentos: parado, em círculo
// (360° a cada 1.200 passos, |v| = 1) e caçando (a cada 30 passos, rumo ao
// inimigo vivo mais próximo pelo delta toroidal).
// DPS de cada marco: dano por segundo da JANELA DO MINUTO ANTERIOR (soma do `valor`
// dos eventos `acerto` com passo em (marco − 3.600, marco], dividida por 60),
// com overkill, como o protótipo. Avança 1 passo por vez, para ler o anel de
// eventos (1.024 entradas) sem perder nenhum. Sem Math.random: tudo determinístico.
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { criarDadosDaCharneca } from '../src/plataforma/dadosDaVigilia';
import { PASSIVA } from '../src/logica/progressao/tabela';
import { ARMA } from '../src/logica/armas/tabela';
import { criarComandos, type ComandosDoPasso, type FonteDeComandos } from '../src/logica/nucleo/comandos';
import { CAB, CATEGORIA_DE_ITEM, CENARIO, JOGADOR, MUNDO2, PROGRESSAO, TIPO_DE_CARTA, TIPO_DE_PICKUP, TODOS_OS_TUTORIAIS, VAGAS_DE_ARMA, VAGAS_DE_PASSIVA, criarEstado, type Estado, type ParametrosDaVigilia } from '../src/logica/nucleo/estado';
import { EV, EVENTO, eventosEscritos, inicioDoEvento } from '../src/logica/nucleo/eventos';
import { avancar } from '../src/logica/nucleo/passo';
import { ALTURA_DO_MAPA, LARGURA_DO_MAPA, deltaNoToro } from '../src/logica/mundo/toro';

export type Comportamento = 'parado' | 'circulo' | 'cacando';
export const COMPORTAMENTOS: readonly Comportamento[] = ['parado', 'circulo', 'cacando'];

export interface OpcoesDaSimulacao {
  readonly seeds: readonly number[];
  readonly passos: number;
  readonly comportamentos: readonly Comportamento[];
}

export interface Marco {
  readonly minuto: number;
  readonly nivel: number;
  /** Dano por segundo na janela do minuto anterior ao marco. */
  readonly dps: number;
}

export interface Resultado {
  readonly marcos: readonly Marco[];
  readonly final: { readonly passo: number; readonly nivel: number; readonly dps: number; readonly almas: number };
  readonly picoDeCinzas: number;
  readonly juncoes: number;
  readonly bolsas: number;
  /** Minuto (relógio) em que a build tem Espada nv8 + Elmo; null se não chegou. */
  readonly minutoEspada8Elmo: number | null;
}

export interface RelatorioDaSim20 {
  readonly passos: number;
  readonly marcosEmMinutos: readonly number[];
  readonly resultados: Readonly<Record<string, Readonly<Record<string, Resultado>>>>;
}

const PASSOS_POR_MINUTO = 3600;
const MARCOS_EM_MINUTOS: readonly number[] = [5, 10, 15, 20];
const PASSOS_DA_VOLTA = 1200;
const PASSOS_ENTRE_MIRAS = 30;

/** Vigília normal: diretor ligado, tutoriais vistos, jogador invulnerável, Cinzas ligadas. */
const PARAMETROS: Partial<ParametrosDaVigilia> = { tutoriaisVistos: TODOS_OS_TUTORIAIS, cenario: CENARIO.jogadorInvulneravel | CENARIO.ataques };

/** Rumo unitário ao inimigo vivo mais próximo pelo delta toroidal; (0, 0) sem inimigo. */
function mirarNoMaisProximo(e: Estado, out: ComandosDoPasso): void {
  const px = e.jogador[JOGADOR.x]!;
  const py = e.jogador[JOGADOR.y]!;
  const { ativos, contagens } = e.pool;
  const { x, y, hp } = e.inimigos;
  let melhor = Infinity;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < contagens[1]!; i++) {
    const s = ativos[i]!;
    if (!(hp[s]! > 0)) continue;
    const dx = deltaNoToro(px, x[s]!, LARGURA_DO_MAPA);
    const dy = deltaNoToro(py, y[s]!, ALTURA_DO_MAPA);
    const d2 = dx * dx + dy * dy;
    if (d2 < melhor) {
      melhor = d2;
      mx = dx;
      my = dy;
    }
  }
  const n = Math.hypot(mx, my);
  out.movimento[0] = n > 0 ? mx / n : 0;
  out.movimento[1] = n > 0 ? my / n : 0;
}

/** Fonte do comportamento; escolhaDoModal devolve sempre 0 (1ª carta; baú fecha). */
function criarFonte(comportamento: Comportamento, e: Estado): FonteDeComandos {
  const mira = criarComandos();
  return {
    comandosDoPasso(passo, out) {
      if (comportamento === 'parado') {
        out.movimento[0] = 0;
        out.movimento[1] = 0;
      } else if (comportamento === 'circulo') {
        const ang = (2 * Math.PI * (passo % PASSOS_DA_VOLTA)) / PASSOS_DA_VOLTA;
        out.movimento[0] = Math.cos(ang);
        out.movimento[1] = Math.sin(ang);
      } else {
        // Nova mira a cada 30 passos; entre elas, repete a última.
        if (passo % PASSOS_ENTRE_MIRAS === 0) mirarNoMaisProximo(e, mira);
        out.movimento[0] = mira.movimento[0]!;
        out.movimento[1] = mira.movimento[1]!;
      }
    },
    escolhaDoModal: () => 0,
  };
}

function simularUma(seed: number, comportamento: Comportamento, passos: number): Resultado {
  const dados = criarDadosDaCharneca();
  const e = criarEstado(seed, dados, PARAMETROS);
  const fonte = criarFonte(comportamento, e);
  const minutosCobertos = Math.ceil(passos / PASSOS_POR_MINUTO);
  const danoPorMinuto = new Float64Array(minutosCobertos + 1);
  const marcos: Marco[] = [];
  let lidos = eventosEscritos(e.eventos);
  let picoDeCinzas = 0;
  let bolsas = 0;
  let minutoEspada8Elmo: number | null = null;
  const dpsDaJanela = (minuto: number): number => Math.round(((danoPorMinuto[minuto - 1] ?? 0) / 60) * 10) / 10;
  const nivelAtual = (): number => e.progresso[PROGRESSAO.nivel]!;

  for (let t = 0; t < passos; ) {
    // 1 passo por vez (os modais se confirmam dentro do avancar): o anel nunca passa de 1.024 sem leitura.
    if (avancar(e, dados, fonte, 1) === 0) break;
    t++;
    const escritos = eventosEscritos(e.eventos);
    for (let n = lidos; n < escritos; n++) {
      const i = inicioDoEvento(n);
      const tipoArmaForma = e.eventos.u32[i + EV.tipoArmaForma]!;
      const tipo = tipoArmaForma & 0xff;
      const forma = tipoArmaForma >>> 16;
      if (tipo === EVENTO.acerto) {
        const passoDoEvento = e.eventos.u32[i + EV.passo]!;
        danoPorMinuto[Math.min(Math.ceil(passoDoEvento / PASSOS_POR_MINUTO) - 1, minutosCobertos)]! += e.eventos.f32[i + EV.floats + 2]!;
      } else if (tipo === EVENTO.carta && forma === TIPO_DE_CARTA.bolsa) bolsas++;
      else if (tipo === EVENTO.item && forma === CATEGORIA_DE_ITEM.bolsa) bolsas++;
    }
    lidos = escritos;

    // Cinzas vivas (pickups do tipo cinza).
    let cinzas = 0;
    const { ativos, contagens } = e.poolDePickups;
    for (let k = 0; k < contagens[1]!; k++) if (e.pickups.tipo[ativos[k]!] === TIPO_DE_PICKUP.cinza) cinzas++;
    if (cinzas > picoDeCinzas) picoDeCinzas = cinzas;

    if (minutoEspada8Elmo === null && temEspada8EElmo(e)) minutoEspada8Elmo = Math.round((e.cab[CAB.passo]! / PASSOS_POR_MINUTO) * 100) / 100;
    if (t % PASSOS_POR_MINUTO === 0 && MARCOS_EM_MINUTOS.includes(t / PASSOS_POR_MINUTO)) {
      const minuto = t / PASSOS_POR_MINUTO;
      marcos.push({ minuto, nivel: nivelAtual(), dps: dpsDaJanela(minuto) });
    }
  }

  const passoFinal = e.cab[CAB.passo]!;
  const minutoFinal = Math.max(1, Math.ceil(passoFinal / PASSOS_POR_MINUTO));
  return {
    marcos,
    final: { passo: passoFinal, nivel: nivelAtual(), dps: dpsDaJanela(minutoFinal), almas: e.progresso[PROGRESSAO.almas]! },
    picoDeCinzas,
    juncoes: e.mundo2[MUNDO2.juncoes]!,
    bolsas,
    minutoEspada8Elmo,
  };
}

/** Espada nv8 em alguma vaga de arma e Elmo (qualquer nível) numa vaga de passiva. */
function temEspada8EElmo(e: Estado): boolean {
  let espada = false;
  for (let v = 0; v < VAGAS_DE_ARMA; v++) if (e.build.codigo[v] === ARMA.espada_longa_do_juramento && e.build.nivel[v]! >= 8) espada = true;
  if (!espada) return false;
  for (let v = 0; v < VAGAS_DE_PASSIVA; v++) if (e.passivas.codigo[v] === PASSIVA.elmo_sem_rosto) return true;
  return false;
}

/** Roda todas as combinações; função pura (o objeto devolvido é o JSON de `.verify/sim20.json`). */
export function simular(opcoes: OpcoesDaSimulacao): RelatorioDaSim20 {
  const resultados: Record<string, Record<string, Resultado>> = {};
  for (const seed of opcoes.seeds) {
    const porComportamento: Record<string, Resultado> = {};
    for (const c of opcoes.comportamentos) porComportamento[c] = simularUma(seed, c, opcoes.passos);
    resultados[String(seed)] = porComportamento;
  }
  return { passos: opcoes.passos, marcosEmMinutos: MARCOS_EM_MINUTOS, resultados };
}

// Só como script: grava o JSON e imprime a tabela de níveis.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inicio = performance.now();
  const rel = simular({ seeds: [1, 2, 3], passos: 20 * PASSOS_POR_MINUTO, comportamentos: COMPORTAMENTOS });
  mkdirSync('.verify', { recursive: true });
  writeFileSync('.verify/sim20.json', JSON.stringify(rel, null, 2) + '\n');
  for (const [seed, porC] of Object.entries(rel.resultados)) {
    for (const [c, r] of Object.entries(porC)) {
      const niveis = r.marcos.map((m) => m.nivel).join('/');
      const dps = r.marcos.map((m) => m.dps).join('/');
      console.log(`seed ${seed} ${c.padEnd(8)} nível ${niveis}  dps ${dps}  cinzas ${r.picoDeCinzas}  junções ${r.juncoes}  bolsas ${r.bolsas}  espada8+elmo ${r.minutoEspada8Elmo ?? 'null'}`);
    }
  }
  console.log(`tempo: ${((performance.now() - inicio) / 1000).toFixed(1)} s`);
}
