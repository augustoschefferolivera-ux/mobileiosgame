// Stamina e esquiva (design/decisoes-F-006.md ST1 a ST3, ES1 a ES7; critérios F-006.1 e F-006.9):
// a numeração dos 21 passos, a distância, a direção, a solidez e a conta da stamina passo a passo.
import { describe, expect, it } from 'vitest';
import combate from '../../../src/dados/combate.json';
import { CAB, JOGADOR, JOGADOR3, JOGADOR3_U8, JOGADOR_U8, hashEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { ALTURA_DO_MAPA as H, LARGURA_DO_MAPA as W, deltaNoToro } from '../../../src/logica/mundo/toro';
import { criarAcumulador } from '../../../src/logica/nucleo/acumulador';
import { criarComandos, fonteConstante, fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import { rodarFrame } from '../../../src/logica/nucleo/driver';
import { PASSO_MS } from '../../../src/logica/nucleo/passos';
import { ACAO, D, D_LIVRE, LONGE, criar, esquivaEm, eventosDe, fonteDeAcoes, junto, posJogador, slotsVivos } from './apoio';

const DURACAO = combate.esquiva.duracao_passos;
const POR_PASSO = combate.esquiva.distancia_px / DURACAO;
const stamina = (e: Estado): number => e.jogador3[JOGADOR3.stamina]!;
const u8 = (e: Estado, campo: keyof typeof JOGADOR3_U8): number => e.jogador3U8[JOGADOR3_U8[campo]]!;
const hp = (e: Estado): number => e.jogador[JOGADOR.hp]!;

/** Roda um passo e devolve a distância percorrida pelo jogador nele. */
function umPasso(e: Estado, fonte: ReturnType<typeof fonteDeAcoes>): number {
  const [x0, y0] = posJogador(e);
  avancar(e, D_LIVRE, fonte, 1);
  const [x, y] = posJogador(e);
  return Math.hypot(deltaNoToro(x0, x, W), deltaNoToro(y0, y, H));
}

describe('F-006.1: numeração da esquiva (ES1)', () => {
  it('tabela de 24 linhas: esquivaPasso sobe de 1 a 21 e volta a 0 em T+21', () => {
    const e = criar();
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const vistos: number[] = [];
    for (let i = 0; i < 24; i++) {
      avancar(e, D_LIVRE, fonte, 1);
      vistos.push(u8(e, 'esquivaPasso'));
    }
    expect(vistos).toEqual([...Array.from({ length: 21 }, (_, i) => i + 1), 0, 0, 0]);
  });

  it('uma nova esquiva só é aceita de T+21 em diante (sem buffer; o comando ignorado não custa)', () => {
    for (let p = 1; p <= 23; p++) {
      const e = criar();
      avancar(e, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1]), esquivaEm(p, [0, -1])]), p + 1);
      const aceita = eventosDe(e, EVENTO.esquiva).length === 2;
      expect(aceita, `comando no passo ${p}`).toBe(p >= DURACAO);
      expect(eventosDe(e, EVENTO.acaoNegada), `comando no passo ${p}`).toHaveLength(0);
    }
  });

  // Um Oco é posto para encostar exatamente no passo K da esquiva (posição gravada em K−1, jogador parado).
  const tabela = Array.from({ length: 22 }, (_, i) => i + 1);
  for (const K of tabela) {
    const iframe = K >= combate.esquiva.iframes_primeiro_passo && K <= combate.esquiva.iframes_ultimo_passo;
    it(`contato no passo ${K}: ${iframe ? 'esquivado (perfeita)' : 'dano de contato'}`, () => {
      const e = criar({ inimigos: [LONGE] });
      const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
      const [s] = slotsVivos(e);
      if (K > 1) avancar(e, D_LIVRE, fonte, K - 1);
      junto(e, s!, 0, 20);
      const antes = hp(e);
      const dano = e.inimigos.dano[s!]! * 0.3;
      avancar(e, D_LIVRE, fonte, 1);
      expect(u8(e, 'esquivaPasso')).toBe(K <= DURACAO ? K : 0);
      if (iframe) {
        expect(hp(e)).toBe(antes);
        expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(0);
        expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(1);
      } else {
        expect(hp(e)).toBeCloseTo(antes - dano, 5);
        expect(e.jogadorU8[JOGADOR_U8.invulContato]).toBe(18);
        expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(0);
      }
    });
  }
});

describe('F-006.9: custo, regeneração e teto da stamina (ST1 a ST3)', () => {
  it('a esquiva custa 25 exatos, também com a regeneração ativa (50 → 25)', () => {
    const e = criar();
    avancar(e, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1])]), 1);
    expect(stamina(e)).toBe(75);
    const f = criar({ staminaInicial: 50 });
    avancar(f, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1])]), 1);
    expect(stamina(f)).toBe(25);
  });

  it('o passo do gasto G não regenera; G+1 a G+30 mantêm; a 1ª regeneração é em G+31', () => {
    const e = criar();
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const lidas: number[] = [];
    for (let k = 0; k <= 33; k++) {
      avancar(e, D_LIVRE, fonte, 1);
      lidas.push(stamina(e));
    }
    expect(lidas.slice(0, 31).every((s) => s === 75)).toBe(true);
    expect(lidas[31]).toBe(75.5);
    expect(lidas[32]).toBe(76);
  });

  it('o atraso é um máximo: um atraso maior que 30 não encurta', () => {
    const e = criar();
    e.jogador3U8[JOGADOR3_U8.esperaRegen] = 100;
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    for (let k = 0; k <= 100; k++) {
      avancar(e, D_LIVRE, fonte, 1);
      expect(stamina(e), `G+${k}`).toBe(75);
    }
    avancar(e, D_LIVRE, fonte, 1);
    expect(stamina(e)).toBe(75.5);
  });

  it('de 0 a 100 em 200 passos, sempre em múltiplos de 0,5, e o teto é 100', () => {
    const e = criar({ staminaInicial: 0 });
    const fonte = fonteDeAcoes([]);
    for (let k = 1; k <= 200; k++) {
      avancar(e, D_LIVRE, fonte, 1);
      expect(stamina(e)).toBe(k / 2);
      expect(Number.isInteger(stamina(e) * 2)).toBe(true);
    }
    avancar(e, D_LIVRE, fonte, 5);
    expect(stamina(e)).toBe(100);
    e.jogador3[JOGADOR3.stamina] = 99.5;
    avancar(e, D_LIVRE, fonte, 1);
    expect(stamina(e)).toBe(100);
  });

  it('o teto vem dos dados (vigilantes.json), não de um literal', () => {
    expect(D_LIVRE.combate.staminaMax).toBe(100);
    expect(criar().jogador3[JOGADOR3.stamina]).toBe(D_LIVRE.combate.staminaMax);
  });

  it('o dano tomado não mexe no relógio da regeneração', () => {
    const e = criar({ inimigos: [LONGE] });
    const [s] = slotsVivos(e);
    e.jogador3[JOGADOR3.stamina] = 50;
    e.jogador3U8[JOGADOR3_U8.esperaRegen] = 7;
    junto(e, s!, 0, 20);
    avancar(e, D_LIVRE, fonteDeAcoes([]), 1);
    expect(hp(e)).toBeLessThan(D_LIVRE.hpInicial);
    expect(u8(e, 'esperaRegen')).toBe(6);
  });

  it('25 paga e deixa 0; 24,5 é negada: nada muda além do que o passo sem comando mudaria, e sai 1 evento', () => {
    const e = criar({ staminaInicial: 25 });
    avancar(e, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1])]), 1);
    expect(stamina(e)).toBe(0);
    expect(u8(e, 'esquivaPasso')).toBe(1);

    const negada = criar({ staminaInicial: 24.5 });
    const controle = criar({ staminaInicial: 24.5 });
    negada.jogador3U8[JOGADOR3_U8.esperaRegen] = 7;
    controle.jogador3U8[JOGADOR3_U8.esperaRegen] = 7;
    avancar(negada, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1])]), 1);
    avancar(controle, D_LIVRE, fonteDeAcoes([]), 1);
    expect(stamina(negada)).toBe(24.5);
    expect(u8(negada, 'esperaRegen')).toBe(6);
    expect(u8(negada, 'esquivaPasso')).toBe(0);
    expect(hp(negada)).toBe(hp(controle));
    expect(posJogador(negada)).toEqual(posJogador(controle));
    const [ev] = eventosDe(negada, EVENTO.acaoNegada);
    expect(eventosDe(negada, EVENTO.acaoNegada)).toHaveLength(1);
    expect(ev).toMatchObject({ forma: ACAO.esquiva, a: 24.5, b: 25 });
    expect(eventosDe(controle, EVENTO.acaoNegada)).toHaveLength(0);
  });

  it('4 esquivas seguidas deixam 0; a 5ª só é paga quando a stamina chega a 25 (G+81)', () => {
    const e = criar();
    const acoes = [0, 21, 42, 63, 84].map((p) => esquivaEm(p, [0, -1]));
    const fonte = fonteDeAcoes(acoes);
    avancar(e, D_LIVRE, fonte, 64);
    expect(stamina(e)).toBe(0);
    // A 5ª esquiva, pedida cedo (passo 64), é negada; no passo 63 + 81 = 144, aceita.
    const g = criar();
    const tarde = fonteDeAcoes([0, 21, 42, 63, 143, 144].map((p) => esquivaEm(p, [0, -1])));
    avancar(g, D_LIVRE, tarde, 145);
    expect(eventosDe(g, EVENTO.esquiva).map((x) => x.passo)).toEqual([1, 22, 43, 64, 145]);
    expect(eventosDe(g, EVENTO.acaoNegada).map((x) => x.passo)).toEqual([144]);
    expect(eventosDe(e, EVENTO.esquiva)).toHaveLength(4);
  });
});

describe('F-006.9: distância e perfil (ES2, ES3)', () => {
  const angulos = [0, 45, 90, 135, 180, 225, 270, 315, 17, 123, 250];
  for (const graus of angulos) {
    it(`campo livre a ${graus}°: 80 ± 0,005 px em 21 passos, maior passo ≤ 4 px`, () => {
      const e = criar();
      const rad = (graus * Math.PI) / 180;
      const fonte = fonteDeAcoes([esquivaEm(0, [Math.cos(rad), Math.sin(rad)])]);
      const [x0, y0] = posJogador(e);
      let maior = 0;
      for (let i = 0; i < DURACAO; i++) maior = Math.max(maior, umPasso(e, fonte));
      const [x, y] = posJogador(e);
      expect(Math.abs(Math.hypot(deltaNoToro(x0, x, W), deltaNoToro(y0, y, H)) - 80)).toBeLessThanOrEqual(0.005);
      expect(maior).toBeLessThanOrEqual(4);
      expect(maior).toBeGreaterThan(3.7);
      // Depois dos 21 passos o jogador para (sem intenção).
      expect(umPasso(e, fonte)).toBe(0);
    });
  }

  it('a costura do toro em x e em y não corta a esquiva', () => {
    for (const [px, py, mira] of [[W - 30, 800, [1, 0]], [30, 800, [-1, 0]], [500, H - 30, [0, 1]], [500, 30, [0, -1]]] as const) {
      const e = criar();
      e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = px;
      e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = py;
      const fonte = fonteDeAcoes([esquivaEm(0, mira)]);
      let maior = 0;
      for (let i = 0; i < DURACAO; i++) maior = Math.max(maior, umPasso(e, fonte));
      const [x, y] = posJogador(e);
      expect(Math.abs(Math.hypot(deltaNoToro(px, x, W), deltaNoToro(py, y, H)) - 80)).toBeLessThanOrEqual(0.005);
      expect(maior).toBeLessThanOrEqual(4);
    }
  });

  it('contra obstáculos: nunca passa de 32 px por passo, nunca vai além de 80 px, não tira HP; alguma direção é cortada', () => {
    let cortadas = 0;
    for (let graus = 0; graus < 360; graus += 5) {
      const e = criar({}, D);
      // A 100 px do centro do círculo de raio 32 em (163, 514) (charneca_das_lanternas.json): a esquiva para a esquerda o encontra.
      e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 263;
      e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 514;
      const rad = (graus * Math.PI) / 180;
      const fonte = fonteDeAcoes([esquivaEm(0, [Math.cos(rad), Math.sin(rad)])]);
      const [x0, y0] = posJogador(e);
      let maior = 0;
      for (let i = 0; i < DURACAO; i++) {
        const [x1, y1] = posJogador(e);
        avancar(e, D, fonte, 1);
        const [x2, y2] = posJogador(e);
        maior = Math.max(maior, Math.hypot(deltaNoToro(x1, x2, W), deltaNoToro(y1, y2, H)));
      }
      const [x, y] = posJogador(e);
      const total = Math.hypot(deltaNoToro(x0, x, W), deltaNoToro(y0, y, H));
      expect(maior).toBeLessThanOrEqual(32);
      expect(total).toBeLessThanOrEqual(80.005);
      expect(hp(e)).toBe(D.hpInicial);
      if (total < 79) cortadas++;
    }
    expect(cortadas).toBeGreaterThan(0);
  });
});

describe('F-006.9: direção da esquiva (ES4) e joystick durante ela (ES5)', () => {
  it('mira (3, 4): deslocamento por passo (0,6; 0,8) × 3,8095', () => {
    const e = criar();
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 300;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 300;
    // A fonte do roteiro recusa |mira| > 1: o comando é montado à mão.
    const cmd = criarComandos();
    cmd.acoes[0] = ACAO.esquiva;
    cmd.mira[0] = 3;
    cmd.mira[1] = 4;
    avancar(e, D_LIVRE, fonteConstante(cmd), 1);
    const [x, y] = posJogador(e);
    expect(x - 300).toBeCloseTo(0.6 * POR_PASSO, 3);
    expect(y - 300).toBeCloseTo(0.8 * POR_PASSO, 3);
  });

  it('mira nula, NaN e Infinity usam a última direção; no início da Vigília é para cima', () => {
    for (const valor of [[0, 0], [Number.NaN, 1], [Infinity, 0], [0, -Infinity]] as const) {
      const e = criar();
      e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 300;
      e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 300;
      const cmd = criarComandos();
      cmd.acoes[0] = ACAO.esquiva;
      cmd.mira[0] = valor[0];
      cmd.mira[1] = valor[1];
      avancar(e, D_LIVRE, fonteConstante(cmd), 1);
      const [x, y] = posJogador(e);
      expect(x).toBe(300);
      expect(300 - y).toBeCloseTo(POR_PASSO, 3);
    }
  });

  it('mira nula depois de andar para a direita esquiva para a direita (última direção não nula)', () => {
    const e = criar();
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 300;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 300;
    const fonte = fonteDoRoteiro([{ passo: 0, mx: 1, my: 0 }, { passo: 3, mx: 0, my: 0 }], undefined, [{ passo: 3, acoes: ACAO.esquiva }]);
    avancar(e, D_LIVRE, fonte, 3);
    const [x0, y0] = posJogador(e);
    avancar(e, D_LIVRE, fonte, 1);
    expect(posJogador(e)[0] - x0).toBeCloseTo(POR_PASSO, 3);
    expect(posJogador(e)[1]).toBe(y0);
  });

  it('360 ângulos de 1°: o módulo do passo é 3,8095 ± 1e-3', () => {
    for (let graus = 0; graus < 360; graus++) {
      const e = criar();
      e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 300;
      e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 300;
      const rad = (graus * Math.PI) / 180;
      const passo = umPasso(e, fonteDeAcoes([esquivaEm(0, [Math.cos(rad), Math.sin(rad)])]));
      expect(Math.abs(passo - POR_PASSO)).toBeLessThan(1e-3);
    }
  });

  it('o joystick não desloca durante a esquiva, mas acompanha dirX/dirY; depois anda na intenção', () => {
    const e = criar();
    e.jogador[JOGADOR.x] = e.jogador[JOGADOR.xAnt] = 300;
    e.jogador[JOGADOR.y] = e.jogador[JOGADOR.yAnt] = 300;
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])], { mx: 1, my: 0 });
    avancar(e, D_LIVRE, fonte, DURACAO);
    const [x, y] = posJogador(e);
    expect(x).toBe(300);
    expect(300 - y).toBeCloseTo(80, 2);
    expect([e.jogador[JOGADOR.dirX], e.jogador[JOGADOR.dirY]]).toEqual([1, 0]);
    avancar(e, D_LIVRE, fonte, 1);
    expect(posJogador(e)[0] - 300).toBeCloseTo(D_LIVRE.velocidadePorPasso, 4);
  });
});

describe('F-006.9: travas e precedência (ES6)', () => {
  it('2 comandos de esquiva no mesmo quadro de 3 passos dão 1 esquiva', () => {
    const e = criar();
    avancar(e, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1]), esquivaEm(1, [0, -1]), esquivaEm(2, [0, -1])]), 3);
    expect(eventosDe(e, EVENTO.esquiva)).toHaveLength(1);
    expect(stamina(e)).toBe(75);
  });

  it('com os bits de aparo e esquiva no mesmo passo, a esquiva é ignorada e consumida, sem custo', () => {
    const e = criar();
    avancar(e, D_LIVRE, fonteDeAcoes([{ passo: 0, acoes: ACAO.esquiva | ACAO.aparo, mira: [0, -1] }]), 1);
    expect(eventosDe(e, EVENTO.esquiva)).toHaveLength(0);
    expect(eventosDe(e, EVENTO.acaoNegada)).toHaveLength(0);
    expect(u8(e, 'esquivaPasso')).toBe(0);
    expect(stamina(e)).toBe(100);
  });

  it('esquiva e janela do aparo nunca coexistem: comando com aparoJanela > 0 não faz nada e não custa', () => {
    const e = criar();
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 6;
    avancar(e, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1])]), 1);
    expect(u8(e, 'esquivaPasso')).toBe(0);
    expect(stamina(e)).toBe(100);
    const f = criar();
    f.jogador3U8[JOGADOR3_U8.aparoFalho] = 6;
    avancar(f, D_LIVRE, fonteDeAcoes([esquivaEm(0, [0, -1])]), 1);
    expect(u8(f, 'esquivaPasso')).toBe(0);
    expect(stamina(f)).toBe(100);
  });

  it('o invariante esquivaPasso > 0 e aparoJanela > 0 nunca juntos, em 10.000 passos de comandos aleatórios', () => {
    const e = criar({ staminaInicial: 100 });
    let semente = 12345;
    const acoes = [];
    for (let p = 0; p < 10_000; p++) {
      semente = (Math.imul(semente, 1103515245) + 12345) >>> 0;
      const r = (semente >>> 16) % 12;
      if (r === 0) acoes.push({ passo: p, acoes: ACAO.esquiva, mira: [0, -1] as [number, number] });
      else if (r === 1) acoes.push({ passo: p, acoes: ACAO.aparo });
    }
    const fonte = fonteDeAcoes(acoes);
    for (let p = 0; p < 10_000; p++) {
      avancar(e, D_LIVRE, fonte, 1);
      expect(u8(e, 'esquivaPasso') > 0 && u8(e, 'aparoJanela') > 0).toBe(false);
    }
  });
});

describe('F-006.1: solidez com os inimigos (ES7)', () => {
  it('nos i-frames (2 a 13) a sobreposição pode crescer; o passo 14 volta à regra (nunca cresce)', () => {
    const e = criar({ inimigos: [LONGE] });
    const [s] = slotsVivos(e);
    const fonte = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    const dist = (): number => {
      const [x, y] = posJogador(e);
      return Math.hypot(deltaNoToro(e.inimigos.x[s!]!, x, W), deltaNoToro(e.inimigos.y[s!]!, y, H));
    };
    const [jx, jy] = posJogador(e);
    // O Oco 43 px à frente: o passo 1 (vulnerável) e o 2 o aproximam até ≈ 33 px; no passo 3 (i-frame) o jogador atravessa a borda de 32.
    e.inimigos.x[s!] = e.inimigos.xAnt[s!] = jx;
    e.inimigos.y[s!] = e.inimigos.yAnt[s!] = jy - 43;
    avancar(e, D_LIVRE, fonte, 3);
    // O jogador atravessou a borda sem ser segurado (só a horda afasta o Oco, depois); o passo 3 é o do contato esquivado.
    expect(jy - posJogador(e)[1]).toBeCloseTo(3 * POR_PASSO, 3);
    expect(dist()).toBeLessThanOrEqual(32);
    expect(hp(e)).toBe(D_LIVRE.hpInicial);
    expect(eventosDe(e, EVENTO.esquivaPerfeita)).toHaveLength(1);

    // Passo 14: com a sobreposição já existente, o jogador não a aumenta.
    const f = criar({ inimigos: [LONGE] });
    const [t] = slotsVivos(f);
    const fonteF = fonteDeAcoes([esquivaEm(0, [0, -1])]);
    avancar(f, D_LIVRE, fonteF, 13);
    const [fx, fy] = posJogador(f);
    posicionarAdiante(f, t!, fx, fy - 30);
    const antes = Math.hypot(deltaNoToro(f.inimigos.x[t!]!, fx, W), deltaNoToro(f.inimigos.y[t!]!, fy, H));
    avancar(f, D_LIVRE, fonteF, 1);
    expect(u8(f, 'esquivaPasso')).toBe(14);
    const [gx, gy] = posJogador(f);
    const depois = Math.hypot(deltaNoToro(f.inimigos.x[t!]!, gx, W), deltaNoToro(f.inimigos.y[t!]!, gy, H));
    expect(depois).toBeGreaterThanOrEqual(antes - 1e-3);
  });
});

function posicionarAdiante(e: Estado, s: number, x: number, y: number): void {
  e.inimigos.x[s] = e.inimigos.xAnt[s] = x;
  e.inimigos.y[s] = e.inimigos.yAnt[s] = y;
}

describe('esquiva no roteiro e no driver (ET5, ET7)', () => {
  it('uma ação em p = 100 num trecho até 400 produz exatamente 1 esquiva; trecho único e trechos repetidos dão o mesmo hash', () => {
    const acoes = [esquivaEm(100, [0, -1])];
    const rodar = (trechos: { passo: number; mx: number; my: number }[]): { n: number; hash: number } => {
      const e = criar({ inimigos: [LONGE] });
      avancar(e, D_LIVRE, fonteDoRoteiro(trechos, undefined, acoes), 400);
      return { n: eventosDe(e, EVENTO.esquiva).length, hash: hashEstado(e) };
    };
    const unico = rodar([{ passo: 0, mx: 0, my: 0 }]);
    const repetidos = rodar([0, 50, 100, 150, 200, 300].map((passo) => ({ passo, mx: 0, my: 0 })));
    expect(unico.n).toBe(1);
    expect(repetidos).toEqual(unico);
  });

  it('1 passo por quadro e 5 por quadro dão o mesmo hash (com a perfeita e o congelamento no meio)', () => {
    const rodarQuadros = (passosPorQuadro: number): { hash: number; perfeitas: number; passo: number } => {
      // Um Oco 70 px à frente: a esquiva para cima o encontra nos i-frames, e o contato vira perfeita.
      const e = criar({ inimigos: [{ ...LONGE, dx: 0, dy: -70 }] });
      const acc = criarAcumulador();
      const fonte = fonteDeAcoes([esquivaEm(0, [0, -1]), esquivaEm(60, [1, 0])]);
      for (let q = 0; q < 400 / passosPorQuadro; q++) rodarFrame(e, D_LIVRE, acc, passosPorQuadro * PASSO_MS, fonte);
      return { hash: hashEstado(e), perfeitas: eventosDe(e, EVENTO.esquivaPerfeita).length, passo: e.cab[CAB.passo]! };
    };
    const um = rodarQuadros(1);
    expect(um.perfeitas).toBe(1);
    expect(um.passo).toBe(400 - combate.congelamento_passos);
    expect(rodarQuadros(5)).toEqual(um);
  });
});
