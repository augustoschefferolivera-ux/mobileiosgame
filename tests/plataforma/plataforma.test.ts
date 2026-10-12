// F-001.7 (conversão de insets), F-001.14 (desbloqueio do áudio e campo unlocked)
// e F-001.15 (telemetria local: campos do doc 10 §6).
import { describe, expect, it } from 'vitest';
import { insetsEmPontos, insetsZerados, type Caixa, type Insets } from '../../src/plataforma/safeArea';
import { desbloquearAudio, wavSilencioso, type SomDesbloqueavel } from '../../src/plataforma/audio';
import { CAMPOS_DOS_EVENTOS, CAPACIDADE_DA_TELEMETRIA, RegistroDeTelemetria } from '../../src/plataforma/telemetria';
import { lerParametros } from '../../src/plataforma/parametros';
import { bytesDoBackbuffer } from '../../src/plataforma/memoria';

const insets = (topo: number, direita: number, baixo: number, esquerda: number): Insets => ({ topo, direita, baixo, esquerda });

/** Caixa do canvas que o Phaser.Scale.FIT + CENTER_BOTH produz num viewport. */
function fit(lv: number, av: number): Caixa {
  const escala = Math.min(lv / 390, av / 844);
  const width = 390 * escala;
  const height = 844 * escala;
  return { left: (lv - width) / 2, top: (av - height) / 2, width, height };
}

describe('safe-area em pt lógicos (F-001.7)', () => {
  it('sem letterbox (PWA 390 × 844): px CSS = pt', () => {
    const r = insetsEmPontos(insets(47, 0, 34, 0), fit(390, 844), 390, 844, insetsZerados());
    expect(r).toEqual(insets(47, 0, 34, 0));
  });

  it('com letterbox vertical mínimo (430 × 932): desconta a faixa e aplica o fator do FIT', () => {
    const c = fit(430, 932);
    const r = insetsEmPontos(insets(59, 0, 34, 0), c, 430, 932, insetsZerados());
    const faixa = (932 - c.height) / 2;
    expect(r.topo).toBeCloseTo((59 - faixa) * (844 / c.height), 9);
    expect(r.baixo).toBeCloseTo((34 - faixa) * (844 / c.height), 9);
    expect(r.esquerda).toBeCloseTo(0, 9);
    expect(r.direita).toBeCloseTo(0, 9);
  });

  it('com letterbox lateral (aba do Safari): a faixa absorve o inset lateral', () => {
    const c = fit(390, 664);
    expect(c.left).toBeGreaterThan(40);
    const r = insetsEmPontos(insets(0, 30, 0, 30), c, 390, 664, insetsZerados());
    expect(r).toEqual(insets(0, 0, 0, 0));
  });

  it('inset maior que a faixa lateral: só o excesso conta', () => {
    const c = fit(844, 844);
    const faixa = c.left;
    const r = insetsEmPontos(insets(0, faixa + 10, 0, faixa + 20), c, 844, 844, insetsZerados());
    expect(r.direita).toBeCloseTo(10 * (390 / c.width), 9);
    expect(r.esquerda).toBeCloseTo(20 * (390 / c.width), 9);
  });

  it('canvas sem tamanho dá insets zerados', () => {
    const r = insetsEmPontos(insets(47, 1, 34, 1), { left: 0, top: 0, width: 0, height: 0 }, 390, 844, insets(9, 9, 9, 9));
    expect(r).toEqual(insetsZerados());
  });
});

function somFalso(estadoDepois: string, locked = true): SomDesbloqueavel & { chamadas: number } {
  const contexto = {
    state: 'suspended',
    resume(): Promise<void> {
      som.chamadas++;
      contexto.state = estadoDepois;
      return Promise.resolve();
    },
  };
  const som = { context: contexto, locked, unlocked: false, chamadas: 0 };
  return som;
}

describe('desbloqueio do áudio (F-001.14)', () => {
  it('chama resume() de forma síncrona, ainda dentro do gesto', () => {
    const som = somFalso('running');
    void desbloquearAudio(som, { tocarSilencio: () => undefined });
    expect(som.chamadas).toBe(1);
  });

  it('marca o campo privado unlocked quando o Phaser continua locked e o contexto roda', async () => {
    const som = somFalso('running');
    expect(await desbloquearAudio(som, { tocarSilencio: () => undefined })).toBe('running');
    expect(som.unlocked).toBe(true);
  });

  it('não marca unlocked se o contexto não chegou a running', async () => {
    const som = somFalso('suspended');
    expect(await desbloquearAudio(som, { tocarSilencio: () => undefined })).toBe('suspended');
    expect(som.unlocked).toBe(false);
  });

  it('não mexe em unlocked se o Phaser já destravou', async () => {
    const som = somFalso('running', false);
    await desbloquearAudio(som, { tocarSilencio: () => undefined });
    expect(som.unlocked).toBe(false);
  });

  it('usa navigator.audioSession quando existe; senão toca o <audio> silencioso', async () => {
    let silencio = 0;
    const sessao = { type: 'auto' };
    await desbloquearAudio(somFalso('running'), { audioSession: sessao, tocarSilencio: () => silencio++ });
    expect(sessao.type).toBe('playback');
    expect(silencio).toBe(0);
    await desbloquearAudio(somFalso('running'), { tocarSilencio: () => silencio++ });
    expect(silencio).toBe(1);
  });

  it('se o setter de audioSession lança, cai no <audio> silencioso', async () => {
    let silencio = 0;
    const sessao = {
      set type(_v: string) {
        throw new Error('sem permissão');
      },
      get type(): string {
        return 'auto';
      },
    };
    await desbloquearAudio(somFalso('running'), { audioSession: sessao, tocarSilencio: () => silencio++ });
    expect(silencio).toBe(1);
  });

  it('o WAV silencioso tem cabeçalho PCM válido e só amostras 128', () => {
    const w = wavSilencioso(100, 8000);
    const v = new DataView(w.buffer);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE');
    expect(String.fromCharCode(...w.slice(12, 16))).toBe('fmt ');
    expect(String.fromCharCode(...w.slice(36, 40))).toBe('data');
    expect(v.getUint32(4, true)).toBe(w.length - 8);
    expect(v.getUint32(16, true)).toBe(16);
    expect(v.getUint16(20, true)).toBe(1); // PCM
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(8000);
    expect(v.getUint32(28, true)).toBe(8000); // bytes por segundo
    expect(v.getUint16(32, true)).toBe(1); // bytes por quadro
    expect(v.getUint16(34, true)).toBe(8); // bits por amostra
    expect(v.getUint32(40, true)).toBe(100);
    expect(w.slice(44).every((b) => b === 128)).toBe(true);
  });
});

describe('telemetria local (F-001.15; Q-30)', () => {
  it('cobre os eventos do doc 10 §6, sem anuncio e sem compra', () => {
    expect(Object.keys(CAMPOS_DOS_EVENTOS).sort()).toEqual(
      [
        'vigilia_inicio', 'level_up', 'arma_uniao', 'esquiva', 'aparo', 'frasco', 'fogueira', 'dano_recebido',
        'chefe', 'apagar', 'amanhecer', 'cinzas_perdidas', 'pesquisa_compra', 'sessao', 'erro_recuperacao',
      ].sort(),
    );
  });

  it('registra com o passo e recusa campos que não batem com o doc 10 §6', () => {
    const r = new RegistroDeTelemetria();
    r.registrar('vigilia_inicio', 0, {
      personagem: 'aldric', mapa: 'charneca_das_lanternas', ciclo: 1, maldicao: 0, reliquias: [], arvore_pct: 0,
    });
    expect(r.eventos()).toEqual([
      {
        evento: 'vigilia_inicio',
        passo: 0,
        campos: { personagem: 'aldric', mapa: 'charneca_das_lanternas', ciclo: 1, maldicao: 0, reliquias: [], arvore_pct: 0 },
      },
    ]);
    // @ts-expect-error campo a menos
    expect(() => r.registrar('frasco', 1, { minuto: 1 })).toThrow();
    // @ts-expect-error campo a mais
    expect(() => r.registrar('frasco', 1, { minuto: 1, hp_antes: 50, extra: 1 })).toThrow();
    // @ts-expect-error mesmo número de campos, nome fora da Q-33
    expect(() => r.registrar('frasco', 1, { minuto: 1, hpAntes: 50 })).toThrow();
  });

  it('guarda no máximo a capacidade, descartando os mais antigos', () => {
    const r = new RegistroDeTelemetria();
    for (let i = 0; i < CAPACIDADE_DA_TELEMETRIA + 5; i++) r.registrar('frasco', i, { minuto: 0, hp_antes: 1 });
    const e = r.eventos();
    expect(e.length).toBe(CAPACIDADE_DA_TELEMETRIA);
    expect(e[0]?.passo).toBe(5);
  });

  it('a cópia devolvida não altera o registro', () => {
    const r = new RegistroDeTelemetria();
    r.registrar('frasco', 3, { minuto: 0, hp_antes: 10 });
    const copia = r.eventos();
    copia[0]!.campos['hp_antes'] = 999;
    expect(r.eventos()[0]?.campos['hp_antes']).toBe(10);
  });
});

describe('parâmetros de URL (ADR-0002 §14)', () => {
  it('o build de produção ignora ?seed, ?tutorial e os parâmetros das F-003 e F-004 (a sonda do TETO fica ligada)', () => {
    expect(lerParametros('?seed=5&tutorial=0&teto=500&render=image&buffer=dinamico&cenario=horda&debug=1&sonda=0', false)).toEqual({
      seed: null,
      pularTutoriais: false,
      teto: null,
      render: 'gpu',
      bufferDinamico: false,
      cenario: null,
      debug: false,
      sonda: true,
      flashSegurar: false,
      inicio: null,
      vistos: null,
    });
  });

  it('?flash=segurar só vale no build de debug (decisoes-F-006 RE3)', () => {
    expect(lerParametros('?flash=segurar', true).flashSegurar).toBe(true);
    expect(lerParametros('?flash=1', true).flashSegurar).toBe(false);
    expect(lerParametros('', true).flashSegurar).toBe(false);
    expect(lerParametros('?flash=segurar', false).flashSegurar).toBe(false);
  });

  it('?visto marca só os bits listados; ?xyz dá 0; sem o parâmetro e na produção, null (TU6)', () => {
    expect(lerParametros('?visto=mover,esquiva', true).vistos).toBe(3);
    expect(lerParametros('?visto=aparo', true).vistos).toBe(4);
    expect(lerParametros('?visto=xyz', true).vistos).toBe(0);
    expect(lerParametros('?visto=mover,toString', true).vistos).toBe(1);
    expect(lerParametros('', true).vistos).toBeNull();
    expect(lerParametros('?visto=mover,esquiva', false).vistos).toBeNull();
    // ?tutorial=0 vence ?visto: os dois ficam lidos, e a Vigília aplica a precedência.
    expect(lerParametros('?tutorial=0&visto=mover', true)).toMatchObject({ pularTutoriais: true, vistos: 1 });
  });

  it.each([
    ['?inicio=01:00', 3600],
    ['?inicio=03:00', 10800],
    ['?inicio=00:00', 0],
    ['?inicio=22:59', (22 * 60 + 59) * 60],
    ['?inicio=23:00', null],
    ['?inicio=01:60', null],
    ['?inicio=1:00', null],
    ['?inicio=abc', null],
    ['', null],
  ])('?inicio: %s → %s (TU7)', (busca, passos) => {
    expect(lerParametros(busca, true).inicio).toBe(passos);
    expect(lerParametros(busca, false).inicio).toBeNull();
  });

  it('build de debug: ?sonda=0 desliga a sonda do TETO; qualquer outro valor a deixa ligada (decisoes-F-004 §5)', () => {
    expect(lerParametros('?sonda=0', true).sonda).toBe(false);
    expect(lerParametros('?sonda=1', true).sonda).toBe(true);
    expect(lerParametros('', true).sonda).toBe(true);
  });

  it.each([
    ['?tutorial=0', true],
    ['?seed=3&tutorial=0', true],
    ['?tutorial=1', false],
    ['?tutorial=', false],
    ['', false],
  ])('build de debug: %s → pularTutoriais = %s', (busca, pular) => {
    expect(lerParametros(busca, true).pularTutoriais).toBe(pular);
  });

  it.each([
    ['?seed=0', 0],
    ['?seed=4294967295', 4294967295],
    ['?seed=42&outro=1', 42],
    ['?seed=4294967296', null],
    ['?seed=-1', null],
    ['?seed=1.5', null],
    ['?seed=', null],
    ['?seed=abc', null],
    ['', null],
  ])('build de debug: %s → %s', (busca, seed) => {
    expect(lerParametros(busca, true).seed).toBe(seed);
  });
});

describe('memória estimada do backbuffer', () => {
  const W = 780;
  const H = 1688;
  const px = W * H;
  it('sem MSAA: cor em dobro + depth/stencil', () => {
    expect(bytesDoBackbuffer(W, H, { antialias: false, depth: true, stencil: true, amostras: 0 })).toBe(px * 4 * 3);
  });
  it('com MSAA 4×: soma cor e depth/stencil multiamostrados', () => {
    expect(bytesDoBackbuffer(W, H, { antialias: true, depth: true, stencil: true, amostras: 4 })).toBe(px * 4 * (2 + 4 + 4));
  });
  it('sem depth nem stencil: só a cor', () => {
    expect(bytesDoBackbuffer(W, H, { antialias: false, depth: false, stencil: false, amostras: 0 })).toBe(px * 4 * 2);
  });
});
