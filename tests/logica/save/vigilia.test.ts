// Save `vigilia` e `andamento` (design/decisoes-F-008.md SV1, SV3, SV5 a SV8; critérios F-008.1, F-008.2, F-008.6): o
// buffer inteiro vai e volta bit a bit, o modal aberto continua aberto, o envelope é versionado e migrável, a leitura
// nunca lança e a Vigília restaurada segue o mesmo caminho da que nunca foi salva.
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro } from '../../../src/logica/nucleo/comandos';
import {
  CAB,
  CAUSA_DO_FIM,
  CENARIO,
  ETAPA,
  FASE,
  FOGUEIRA_F32,
  FOGUEIRA_U32,
  FOGUEIRA_U8,
  JOGADOR,
  JOGADOR2,
  JOGADOR4_U8,
  MUNDO,
  PROGRESSAO,
  VAGAS_DE_ARMA,
  criarEstado,
  hashEstado,
  type Estado,
} from '../../../src/logica/nucleo/estado';
import { eventosEscritos } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { sombraDaFogueira } from '../../../src/logica/mundo/fogueira';
import { recalcularDano } from '../../../src/logica/progressao/dano';
import { modalAberto } from '../../../src/logica/progressao/modal';
import { metaPadrao, somaDoTexto } from '../../../src/logica/save/meta';
import {
  VERSAO_DO_ENVELOPE,
  base64ParaBytes,
  bytesParaBase64,
  hashDosBytes,
  lerAndamento,
  lerVigilia,
  recusarComEstado,
  recusarSemEstado,
  restaurar,
  serializarAndamento,
  serializarVigilia,
} from '../../../src/logica/save/vigilia';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, DADOS_SEM_OBSTACULOS, PARADO } from '../apoio';

/** O objeto sem o campo `soma`. */
function semSoma(o: Record<string, unknown>): Record<string, unknown> {
  const r = { ...o };
  delete r['soma'];
  return r;
}

const DIR_SCHEMAS = join(__dirname, '../../../src/dados/schemas');
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(JSON.parse(readFileSync(join(DIR_SCHEMAS, 'save-vigilia.schema.json'), 'utf-8')) as object);

/** A `horda_com_ataques` com a build do `tres_armas` (3 armas nv ≥ 3), como o E7a. */
function hordaComTresArmas(seed = 1): Estado {
  const base = { ...parametrosDoCenario('horda_com_ataques'), armas: parametrosDoCenario('tres_armas').armas };
  return criarEstado(seed, D, base);
}

/** Roteiro com o Frasco no passo 450, para haver uma cura em curso aos 500. */
const FONTE = (): ReturnType<typeof fonteDoRoteiro> => fonteDoRoteiro([{ passo: 0, mx: 0.6, my: 0.8 }], undefined, [{ passo: 450, acoes: ACAO.frasco }]);

function ate500(): Estado {
  const e = hordaComTresArmas();
  e.mundo[MUNDO.intensidade10] = 11;
  e.jogador[JOGADOR.hp] = 40;
  avancar(e, D, FONTE(), 500);
  return e;
}

function recarregar(e: Estado, seq = 1): Estado {
  const lido = lerVigilia(serializarVigilia(e, seq));
  expect(lido.ok).toBe(true);
  if (!lido.ok) throw new Error('leitura');
  const novo = criarEstado(777, D, {});
  expect(restaurar(novo, D, lido.envelope)).toBe('ok');
  return novo;
}

describe('base64 próprio (SV9)', () => {
  it('vai e volta com todos os restos de tamanho e confere com o Buffer', () => {
    for (let n = 0; n < 12; n++) {
      const b = new Uint8Array(n).map((_, i) => (i * 37 + 11) & 255);
      const t = bytesParaBase64(b);
      expect(t).toBe(Buffer.from(b).toString('base64'));
      expect([...base64ParaBytes(t)!]).toEqual([...b]);
    }
  });
  it('recusa tamanho que não fecha, caractere de fora e "=" no meio', () => {
    expect(base64ParaBytes('abc')).toBeNull();
    expect(base64ParaBytes('ab!d')).toBeNull();
    expect(base64ParaBytes('a=bc')).toBeNull();
  });
});

describe('salvar e restaurar (F-008.1)', () => {
  it('no passo 500 de horda_com_ataques: hash e buffer iguais; as 5 vagas, nível, XP, Almas, Frascos, I, HP e o dano vivo conferem', () => {
    const e = ate500();
    expect(e.jogador4U8[JOGADOR4_U8.frascoPasso]).toBeGreaterThan(0);
    expect(e.build.nivel[0]).toBeGreaterThanOrEqual(3);
    const texto = serializarVigilia(e, 4);
    const lido = lerVigilia(texto);
    if (!lido.ok) throw new Error(lido.motivo);
    expect(lido.envelope).toMatchObject({ versao: 1, layout: 10, seq: 4, hora: 0, nivel: e.progresso[PROGRESSAO.nivel], almas: e.progresso[PROGRESSAO.almas] });
    const n = recarregar(e, 4);
    expect(hashEstado(n)).toBe(hashEstado(e));
    expect([...n.bytes]).toEqual([...e.bytes]);
    for (let v = 0; v < VAGAS_DE_ARMA; v++) {
      expect([n.build.codigo[v], n.build.nivel[v], n.build.recarga[v], n.build.golpe[v], n.build.esperaGolpe[v], n.build.esperaPulso[v]]).toEqual([
        e.build.codigo[v],
        e.build.nivel[v],
        e.build.recarga[v],
        e.build.golpe[v],
        e.build.esperaGolpe[v],
        e.build.esperaPulso[v],
      ]);
    }
    expect([n.progresso[PROGRESSAO.nivel], n.progresso[PROGRESSAO.xp], n.progresso[PROGRESSAO.almas]]).toEqual([
      e.progresso[PROGRESSAO.nivel],
      e.progresso[PROGRESSAO.xp],
      e.progresso[PROGRESSAO.almas],
    ]);
    expect(n.jogador4U8[JOGADOR4_U8.frascoCargas]).toBe(e.jogador4U8[JOGADOR4_U8.frascoCargas]);
    expect(n.mundo[MUNDO.intensidade10]).toBe(11);
    expect([n.jogador[JOGADOR.hp], n.jogador2[JOGADOR2.hpMax]]).toEqual([e.jogador[JOGADOR.hp], e.jogador2[JOGADOR2.hpMax]]);
    expect([...n.derivados.danoOnda]).toEqual([...e.derivados.danoOnda]);
    expect(hashDosBytes(n.bytes)).toBe(hashDosBytes(e.bytes));
  });

  it('com atributos gastos: restaurar refaz as quatro tabelas de dano vivo (derivados fora do buffer)', () => {
    const e = ate500();
    const padrao = criarEstado(777, D, {});
    for (let k = 0; k < e.atributos.length; k++) e.atributos[k] = e.atributos[k]! + 3 + k;
    recalcularDano(e, D);
    expect([...e.derivados.danoVivo]).not.toEqual([...padrao.derivados.danoVivo]);
    const n = recarregar(e);
    expect([...n.atributos]).toEqual([...e.atributos]);
    expect([...n.derivados.danoVivo]).toEqual([...e.derivados.danoVivo]);
    expect([...n.derivados.danoVivoPoder]).toEqual([...e.derivados.danoVivoPoder]);
    expect([...n.derivados.danoOnda]).toEqual([...e.derivados.danoOnda]);
    expect([...n.derivados.danoOndaPoder]).toEqual([...e.derivados.danoOndaPoder]);
  });

  it('com o modal aberto: continua aberto e avancar devolve 0', () => {
    const e = hordaComTresArmas();
    avancar(e, D, PARADO, 20);
    e.progresso[PROGRESSAO.niveisPendentes] = 1;
    expect(modalAberto(e)).toBe(true);
    const n = recarregar(e);
    expect(modalAberto(n)).toBe(true);
    expect(avancar(n, D, PARADO, 10)).toBe(0);
  });

  it('o save restaurado em outro estado não toca o original (cópia)', () => {
    const e = ate500();
    const n = recarregar(e);
    n.jogador[JOGADOR.hp] = 1;
    expect(e.jogador[JOGADOR.hp]).not.toBe(1);
  });
});

describe('salvar no meio não muda o caminho (F-008.6)', () => {
  it('horda_com_ataques: salvar no 500, restaurar e ir a 1.000 dá o hash de quem não salvou', () => {
    const seguido = hordaComTresArmas();
    seguido.mundo[MUNDO.intensidade10] = 11;
    seguido.jogador[JOGADOR.hp] = 40;
    avancar(seguido, D, FONTE(), 1000);
    const e = ate500();
    const n = recarregar(e);
    avancar(n, D, FONTE(), 500);
    expect(n.cab[CAB.passo]).toBe(1000);
    expect(hashEstado(n)).toBe(hashEstado(seguido));
  });

  it('marco_coroado (relógio 17.970): salvar no passo 100, já na arena, e continuar 500 passos', () => {
    const novo = (): Estado => criarEstado(1, D, { cenario: CENARIO.ataques | CENARIO.jogadorInvulneravel, relogioInicial: 17970, inicioLivre: true });
    const seguido = novo();
    avancar(seguido, D, PARADO, 600);
    const e = novo();
    avancar(e, D, PARADO, 100);
    expect(e.fogueiraU8[FOGUEIRA_U8.arenaAtiva]).toBe(1);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.marco);
    const n = recarregar(e);
    avancar(n, D, PARADO, 500);
    expect(hashEstado(n)).toBe(hashEstado(seguido));
  });
});

describe('restaurar: anel de eventos e sombra da Fogueira', () => {
  it('o anel de eventos do estado que recebe o save é esvaziado na carga (nenhum evento velho é reemitido)', () => {
    const e = ate500();
    const lido = lerVigilia(serializarVigilia(e, 1));
    if (!lido.ok) throw new Error(lido.motivo);
    const alvo = hordaComTresArmas(9);
    avancar(alvo, D, FONTE(), 300);
    expect(eventosEscritos(alvo.eventos)).toBeGreaterThan(0);
    expect(restaurar(alvo, D, lido.envelope)).toBe('ok');
    expect(eventosEscritos(alvo.eventos)).toBe(0);
  });

  it('um save com a etapa FOGUEIRA restaurado já tem a sombra (o hash do próprio save), para Partir no 1º passo', () => {
    const e = criarEstado(1, D, { cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel, relogioInicial: 18000, inicioLivre: true });
    e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
    e.fogueiraU8[FOGUEIRA_U8.fogueiraHora] = 1;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraX] = e.jogador[JOGADOR.x]! + 20;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraY] = e.jogador[JOGADOR.y]!;
    avancar(e, D, PARADO, 3);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.fogueira);
    const n = recarregar(e);
    expect(n.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.fogueira);
    const s = sombraDaFogueira(n);
    expect(s).toBeDefined();
    expect(hashDosBytes(s!)).toBe(hashDosBytes(e.bytes));
  });

  it('com a etapa HORA a carga não inventa sombra', () => {
    expect(sombraDaFogueira(recarregar(ate500()))).toBeUndefined();
  });
});

describe('leitura que nunca lança (SV6, SV7)', () => {
  const e = ate500();
  const bom = serializarVigilia(e, 2);

  it('ausente, quebrado, soma errada, campo fora do tipo e versão maior', () => {
    expect(lerVigilia(null)).toEqual({ ok: false, motivo: 'ausente' });
    expect(lerVigilia('{nao e json')).toEqual({ ok: false, motivo: 'quebrado' });
    expect(lerVigilia('[1,2]')).toEqual({ ok: false, motivo: 'quebrado' });
    const adulterado = bom.replace('"almas":', '"almas":1');
    expect(lerVigilia(adulterado)).toEqual({ ok: false, motivo: 'soma' });
    const o = JSON.parse(bom) as Record<string, unknown>;
    const comSoma = (x: Record<string, unknown>): string => {
      const resto = semSoma(x);
      return JSON.stringify({ ...resto, soma: somaDoTexto(JSON.stringify(resto)) });
    };
    expect(lerVigilia(comSoma({ ...o, nivel: 'x' }))).toEqual({ ok: false, motivo: 'campo' });
    expect(lerVigilia(comSoma({ ...o, versao: VERSAO_DO_ENVELOPE + 1 }))).toEqual({ ok: false, motivo: 'futuro' });
  });

  it('layout maior que o do build, tamanho errado e base64 quebrado não restauram', () => {
    const o = JSON.parse(bom) as { bytes: string } & Record<string, unknown>;
    const ler = (x: Record<string, unknown>) => {
      const resto = semSoma(x);
      const r = lerVigilia(JSON.stringify({ ...resto, soma: somaDoTexto(JSON.stringify(resto)) }));
      if (!r.ok) throw new Error(r.motivo);
      return r.envelope;
    };
    const alvo = (): Estado => criarEstado(5, D, {});
    expect(restaurar(alvo(), D, ler({ ...o, layout: 11 }))).toBe('layout');
    expect(restaurar(alvo(), D, ler({ ...o, layout: 7 }))).toBe('layout');
    expect(restaurar(alvo(), D, ler({ ...o, bytes: o.bytes.slice(0, -8) }))).toBe('tamanho');
    expect(restaurar(alvo(), D, ler({ ...o, bytes: '!' + o.bytes.slice(1) }))).toBe('base64');
    // Buffer maior que o do build também é recusado (sem RangeError em `bytes.set`).
    const maior = new Uint8Array(base64ParaBytes(o.bytes)!.length + 8);
    maior.set(base64ParaBytes(o.bytes)!);
    expect(restaurar(alvo(), D, ler({ ...o, bytes: bytesParaBase64(maior) }))).toBe('tamanho');
  });

  it('NaN no buffer: recusa (SV6)', () => {
    const copia = new Uint8Array(e.bytes);
    const ev = criarEstado(1, D, {});
    ev.bytes.set(copia);
    ev.jogador[JOGADOR.x] = NaN;
    const lido = lerVigilia(serializarVigilia(ev, 1));
    if (!lido.ok) throw new Error(lido.motivo);
    expect(restaurar(criarEstado(1, D, {}), D, lido.envelope)).toBe('nan');
  });

  it('fase diferente de VIVA (APAGANDO, FIM, A Fome, Amanhecer): save corrompido, recusado (F-009, D9 §4)', () => {
    for (const fase of [FASE.apagando, FASE.fim, FASE.aFome, FASE.amanhecer]) {
      const ev = criarEstado(1, D, {});
      ev.bytes.set(new Uint8Array(e.bytes));
      ev.jogador4U8[JOGADOR4_U8.fase] = fase;
      const lido = lerVigilia(serializarVigilia(ev, 1));
      if (!lido.ok) throw new Error(lido.motivo);
      expect(restaurar(criarEstado(1, D, {}), D, lido.envelope), `fase ${fase}`).toBe('fase');
    }
  });

  it('disposição de obstáculos diferente: recusada, e a Recusar sem estado dá ⌊N/2⌋ ao Santuário', () => {
    const lido = lerVigilia(bom);
    if (!lido.ok) throw new Error(lido.motivo);
    const outra = criarEstado(1, DADOS_SEM_OBSTACULOS, {});
    expect(restaurar(outra, DADOS_SEM_OBSTACULOS, lido.envelope)).toBe('disposicao');
    const meta = { ...metaPadrao(), almas: 10, proximaIdVigilia: 4 };
    const depois = recusarSemEstado(meta, 3, 101, null);
    expect([depois.almas, depois.ultimaEncerrada, depois.vigiliasConcluidas, depois.mancha]).toEqual([10 + 50, 3, 1, null]);
  });
});

describe('Recusar sem estado: o maior entre o envelope e o andamento do mesmo id (SV5)', () => {
  it('andamento maior vale; menor ou de outro id não', () => {
    const meta = { ...metaPadrao(), almas: 10, proximaIdVigilia: 4 };
    const and = (idVigilia: number, almas: number) => ({ idVigilia, seqDoVigilia: 1, hora: 0, almas, x: 1, y: 1, relogio: 9, passo: 9 });
    expect(recusarSemEstado(meta, 3, 101, and(3, 400)).almas).toBe(10 + 200);
    expect(recusarSemEstado(meta, 3, 101, and(3, 60)).almas).toBe(10 + 50);
    expect(recusarSemEstado(meta, 3, 101, and(2, 900)).almas).toBe(10 + 50);
  });
});

describe('migração do envelope (F-008.2)', () => {
  it('um v1 sintético com "frascos" migra para o v2 com "cargas", campo a campo, e valida no schema v2', () => {
    const e = ate500();
    const v1 = serializarVigilia(e, 9);
    const v2Migracao = [
      (o: Record<string, unknown>): Record<string, unknown> => {
        const { frascos, ...resto } = o;
        return { ...resto, cargas: frascos };
      },
    ];
    const lido = lerVigilia(v1, v2Migracao, 2);
    // O leitor de produção devolve só o envelope atual; para o v2 do teste, valida-se o objeto migrado.
    expect(lido.ok).toBe(false);
    const migrado = (() => {
      const o = JSON.parse(v1) as Record<string, unknown>;
      const corpo = semSoma(o);
      return { ...v2Migracao[0]!(corpo), versao: 2 };
    })();
    expect(migrado).toMatchObject({ versao: 2, cargas: e.jogador4U8[JOGADOR4_U8.frascoCargas], idVigilia: 0, seq: 9, nivel: e.progresso[PROGRESSAO.nivel] });
    expect('frascos' in migrado).toBe(false);
    const esquemaV2 = JSON.parse(readFileSync(join(DIR_SCHEMAS, 'save-vigilia.schema.json'), 'utf-8')) as {
      $defs: { envelope: { required: string[]; properties: Record<string, unknown> } };
    };
    const env = esquemaV2.$defs.envelope;
    env.required = env.required.map((c) => (c === 'frascos' ? 'cargas' : c));
    env.properties['cargas'] = env.properties['frascos'];
    delete env.properties['frascos'];
    const ajv2 = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
    ajv2.addSchema({ ...esquemaV2, $id: 'save-vigilia-v2.schema.json' } as object);
    const validar = ajv2.getSchema('save-vigilia-v2.schema.json#/$defs/envelope')!;
    const corpoV2 = { ...migrado, soma: '00000000' };
    expect(validar(corpoV2), JSON.stringify(validar.errors)).toBe(true);
    expect(validar({ ...corpoV2, frascos: 1 })).toBe(false);
  });

  it('o envelope de produção valida no schema v1 e o andamento também', () => {
    const e = ate500();
    const v = ajv.getSchema('save-vigilia.schema.json#/$defs/envelope')!;
    const o = JSON.parse(serializarVigilia(e, 1)) as object;
    expect(v(o), JSON.stringify(v.errors)).toBe(true);
    const a = ajv.getSchema('save-vigilia.schema.json#/$defs/andamento')!;
    const oa = JSON.parse(serializarAndamento(e, 1)) as object;
    expect(a(oa), JSON.stringify(a.errors)).toBe(true);
  });

  it('a cadeia sem elo ou de versão maior é recusada', () => {
    const v1 = serializarVigilia(ate500(), 1);
    expect(lerVigilia(v1, [], 2)).toEqual({ ok: false, motivo: 'futuro' });
  });
});

describe('andamento (SV3)', () => {
  it('serializa e lê; soma errada ou campo fora do tipo dão null', () => {
    const e = ate500();
    e.fogueiraU32[FOGUEIRA_U32.idVigilia] = 7;
    const t = serializarAndamento(e, 3);
    const a = lerAndamento(t)!;
    expect(a).toMatchObject({ idVigilia: 7, seqDoVigilia: 3, hora: 0, almas: e.progresso[PROGRESSAO.almas], relogio: 500, passo: 500 });
    expect([a.x, a.y]).toEqual([e.jogador[JOGADOR.x], e.jogador[JOGADOR.y]]);
    // A hora do save é a da última Fogueira acesa, não a quantidade de marcos já iniciados.
    e.fogueiraU8[FOGUEIRA_U8.fogueiraHora] = 1;
    e.fogueiraU8[FOGUEIRA_U8.marcosIniciados] = 2;
    expect(lerAndamento(serializarAndamento(e, 3))!.hora).toBe(1);
    const lidoV = lerVigilia(serializarVigilia(e, 3));
    if (!lidoV.ok) throw new Error(lidoV.motivo);
    expect(lidoV.envelope.hora).toBe(1);
    expect(lerAndamento(t.replace('"relogio":500', '"relogio":501'))).toBeNull();
    expect(lerAndamento(null)).toBeNull();
    expect(lerAndamento('{}')).toBeNull();
  });
});

describe('Recusar com estado (SV5, Q-03)', () => {
  it('usa o maior entre as Almas do vigilia e as do andamento do mesmo idVigilia, leva ⌊N/2⌋ e fecha o id', () => {
    const e = ate500();
    e.fogueiraU32[FOGUEIRA_U32.idVigilia] = 5;
    e.progresso[PROGRESSAO.almas] = 100;
    const n = recarregar(e);
    const andamento = { idVigilia: 5, seqDoVigilia: 1, hora: 0, almas: 301, x: 1, y: 1, relogio: 9, passo: 9 };
    const meta = { ...metaPadrao(), almas: 7, proximaIdVigilia: 6 };
    const depois = recusarComEstado(n, D, meta, andamento);
    expect(depois.almas).toBe(7 + 150);
    expect(depois.ultimaEncerrada).toBe(5);
    expect(depois.mancha).toBeNull();
    expect(n.jogador4U8[JOGADOR4_U8.fase]).toBe(FASE.fim);
    expect(n.jogador4U8[JOGADOR4_U8.causaDoFim]).toBe(CAUSA_DO_FIM.abandonar);
    // Andamento de outra Vigília não vale.
    const m2 = recusarComEstado(recarregar(e), D, meta, { ...andamento, idVigilia: 4 });
    expect(m2.almas).toBe(7 + 50);
  });
});
