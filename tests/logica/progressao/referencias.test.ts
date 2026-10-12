// Referências da F-005 (design/decisoes-F-005.md §8), Node × Chromium. Com
// VDC_EVIDENCIAS=1 (scripts/verify.sh), grava para a Playwright:
//  - .verify/referencia-f005.json: o nivel_tres no passo 1 (nível 3, 2 ofertas),
//    o hash e as cartas da 1ª oferta, as da 2ª depois da carta 0, e o hash e a
//    build depois das duas cartas 0 (F-005.4);
//  - .verify/referencia-uniao.json: o roteiro do bau_uniao (para cima até o
//    baú abrir, depois parado), o passo do baú, o passo e o hash do 1º golpe da
//    Lâmina e o passo da captura (o 1º ≥ baú + 60, até + 600, com uma onda de
//    idade 5 a 8 e ≥ 2 acertos de onda nos últimos 8 passos) com o hash (F-005.7).
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARMA, IDS_DE_ARMA } from '../../../src/logica/armas/tabela';
import { hex8 } from '../../../src/logica/nucleo/hash';
import { CAB, CAPACIDADE_DE_EFEITOS, CARTAS, PROGRESSAO, TIPO_DE_CARTA, criarEstado, hashEstado, type Estado } from '../../../src/logica/nucleo/estado';
import { EVENTO, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { fonteDoRoteiro, type Roteiro } from '../../../src/logica/nucleo/comandos';
import { SEED_PADRAO } from '../../../src/logica/nucleo/referencia';
import { confirmarModal, modalAberto } from '../../../src/logica/progressao/modal';
import { IDS_DE_PASSIVA } from '../../../src/logica/progressao/tabela';
import { parametrosDoCenario } from '../../../src/plataforma/cenarios';
import { DADOS_DA_CHARNECA as D, PARADO } from '../apoio';
import { eventos } from '../armas/apoio';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SEED = Number(process.env['VDC_SEED'] ?? SEED_PADRAO);
/** O TETO explícito da URL dos specs (?teto=300). */
const TETO = 300;

const NOMES_DAS_CARTAS = ['', 'melhoriaDeArma', 'armaNova', 'melhoriaDePassiva', 'passivaNova', 'bolsa'];

/** As cartas da oferta aberta, como o __GAME_DEBUG__.levelUp as mostra (tipo e item). */
function cartas(e: Estado): { tipo: string; item: string | null }[] {
  const lista = [];
  for (let k = 0; k < CARTAS; k++) {
    const tipo = e.oferta.tipo[k]!;
    const item = e.oferta.item[k]!;
    const passiva = tipo === TIPO_DE_CARTA.melhoriaDePassiva || tipo === TIPO_DE_CARTA.passivaNova;
    lista.push({ tipo: NOMES_DAS_CARTAS[tipo]!, item: item === 0 ? null : passiva ? IDS_DE_PASSIVA[item]! : IDS_DE_ARMA[item]! });
  }
  return lista;
}

function build(e: Estado): { armas: { id: string; nivel: number }[]; passivas: { id: string; nivel: number }[] } {
  const armas = [];
  const passivas = [];
  for (let v = 0; v < e.build.codigo.length; v++) if (e.build.codigo[v]) armas.push({ id: IDS_DE_ARMA[e.build.codigo[v]!]!, nivel: e.build.nivel[v]! });
  for (let v = 0; v < e.passivas.codigo.length; v++) if (e.passivas.codigo[v]) passivas.push({ id: IDS_DE_PASSIVA[e.passivas.codigo[v]!]!, nivel: e.passivas.nivel[v]! });
  return { armas, passivas };
}

/** F-005.4: o nivel_tres no passo 1 e depois das cartas 0 das duas ofertas. */
function referenciaDoNivelTres(seed: number) {
  const e = criarEstado(seed, D, { ...parametrosDoCenario('nivel_tres'), teto: TETO });
  const rodados = avancar(e, D, PARADO, 10);
  const abertura = { passo: e.cab[CAB.passo]!, rodados, nivel: e.progresso[PROGRESSAO.nivel]!, pendentes: e.progresso[PROGRESSAO.niveisPendentes]!, hash: hex8(hashEstado(e)), cartas: cartas(e) };
  confirmarModal(e, D, 0);
  const segunda = { pendentes: e.progresso[PROGRESSAO.niveisPendentes]!, cartas: cartas(e) };
  confirmarModal(e, D, 0);
  const fim = { aberto: modalAberto(e), passo: e.cab[CAB.passo]!, nivel: e.progresso[PROGRESSAO.nivel]!, hash: hex8(hashEstado(e)), build: build(e) };
  return { seed, abertura, segunda, fim };
}

/** O passo em que o baú do bau_uniao abre, andando para cima desde o passo 0 (teto de 600 passos). */
function passoDoBau(seed: number): number {
  const e = criarEstado(seed, D, { ...parametrosDoCenario('bau_uniao'), teto: TETO });
  const rodados = avancar(e, D, fonteDoRoteiro([{ passo: 0, mx: 0, my: -1 }]), 600);
  return modalAberto(e) ? rodados : -1;
}

/** F-005.7 e a evidência da União: o roteiro, o 1º golpe da Lâmina e o passo da captura. */
function referenciaDaUniao(seed: number) {
  const bau = passoDoBau(seed);
  const roteiro: Roteiro = [
    { passo: 0, mx: 0, my: -1 },
    { passo: bau, mx: 0, my: 0 },
  ];
  const fonte = fonteDoRoteiro(roteiro);
  const e = criarEstado(seed, D, { ...parametrosDoCenario('bau_uniao'), teto: TETO });
  expect(avancar(e, D, fonte, 600)).toBe(bau);
  const eventosDoBau = eventos(e).filter((v) => v.tipo === EVENTO.bau || v.tipo === EVENTO.uniao).map((v) => (v.tipo === EVENTO.bau ? 'bau' : 'uniao'));
  confirmarModal(e, D, 0);
  const buildDepois = build(e);
  let golpe = { passo: -1, hash: '' };
  let captura = { passo: -1, hash: '' };
  for (let k = 0; k < 600 && captura.passo < 0; k++) {
    expect(avancar(e, D, fonte, 1)).toBe(1);
    const passo = e.cab[CAB.passo]!;
    const evs = eventos(e);
    if (golpe.passo < 0 && evs.some((v) => v.tipo === EVENTO.golpe && v.arma === ARMA.lamina_do_juramento_eterno && v.passo === passo)) {
      golpe = { passo, hash: hex8(hashEstado(e)) };
    }
    if (passo < bau + 60) continue;
    let onda = false;
    for (let o = 0; o < CAPACIDADE_DE_EFEITOS; o++) {
      if (e.poolDeEfeitos.posicao[o]! >= 0 && e.efeitos.idade[o]! >= 5 && e.efeitos.idade[o]! <= 8) onda = true;
    }
    const acertos = evs.filter((v) => v.tipo === EVENTO.acerto && v.forma === FORMA.onda && passo - v.passo < 8).length;
    if (onda && acertos >= 2) captura = { passo, hash: hex8(hashEstado(e)) };
  }
  return { seed, roteiro, bau, eventosDoBau, build: buildDepois, golpe, captura };
}

describe('referências da F-005 (Node × Chromium)', () => {
  it(`seed ${SEED}: o nivel_tres abre no passo 1 com nível 3 e 2 ofertas; as cartas 0 das duas fecham a fila no passo 1`, () => {
    const r = referenciaDoNivelTres(SEED);
    expect([r.abertura.passo, r.abertura.rodados, r.abertura.nivel, r.abertura.pendentes]).toEqual([1, 1, 3, 2]);
    expect(r.segunda.pendentes).toBe(1);
    expect([r.fim.aberto, r.fim.passo, r.fim.nivel]).toEqual([false, 1, 3]);
    expect(referenciaDoNivelTres(SEED)).toEqual(r);
  });

  it('seed 1 (literal, A5): o nivel_tres abre com hash 796b75a1 e Espada melhoria / Luvas nova / Círculo nova; a 2ª oferta traz Facas no lugar do Círculo; depois das cartas 0, hash 96b14125', () => {
    const r = referenciaDoNivelTres(1);
    expect(r.abertura.hash).toBe('796b75a1');
    expect(r.abertura.cartas).toEqual([
      { tipo: 'melhoriaDeArma', item: 'espada_longa_do_juramento' },
      { tipo: 'passivaNova', item: 'luvas_de_fole' },
      { tipo: 'armaNova', item: 'circulo_de_sal' },
    ]);
    expect(r.segunda.cartas[2]).toEqual({ tipo: 'armaNova', item: 'facas_de_sal' });
    expect(r.fim.hash).toBe('96b14125');
    expect(r.fim.build.armas).toEqual([{ id: 'espada_longa_do_juramento', nivel: 3 }]);
  });

  it(`seed ${SEED}: no bau_uniao, o baú abre andando para cima, com bau e uniao; a Lâmina golpeia e há captura até o baú + 600`, () => {
    const r = referenciaDaUniao(SEED);
    expect(r.bau).toBeGreaterThan(0);
    expect(r.eventosDoBau).toEqual(expect.arrayContaining(['bau', 'uniao']));
    expect(r.build.armas[0]!.id).toBe('lamina_do_juramento_eterno');
    expect(r.build.passivas.map((p) => p.id)).toContain('elmo_sem_rosto');
    expect(r.golpe.passo).toBeGreaterThan(r.bau);
    expect(r.captura.passo).toBeGreaterThanOrEqual(r.bau + 60);
    expect(r.captura.passo).toBeLessThanOrEqual(r.bau + 600);
    expect(referenciaDaUniao(SEED)).toEqual(r);
  });
});

afterAll(() => {
  if (process.env['VDC_EVIDENCIAS'] !== '1') return;
  mkdirSync(join(RAIZ, '.verify'), { recursive: true });
  writeFileSync(join(RAIZ, '.verify', 'referencia-f005.json'), JSON.stringify(referenciaDoNivelTres(SEED), null, 2) + '\n');
  writeFileSync(join(RAIZ, '.verify', 'referencia-uniao.json'), JSON.stringify(referenciaDaUniao(SEED), null, 2) + '\n');
});
