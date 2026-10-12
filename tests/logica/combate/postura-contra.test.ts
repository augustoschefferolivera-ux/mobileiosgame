// Postura Quebrada e Contra-ataque (design/decisoes-F-006.md §4.2 e §4.3, §5 OG10; critérios F-006.4 e
// F-006.10): a área de 64 px + r centrada no jogador e o atacante sempre, os 121 gravados e o único
// decremento da fase 8, o que o atordoado deixa de fazer, o fator por alvo lido no acerto, o ×6 do
// produto, e a salva extra por vaga (Espada e Lâmina em sequência mirada no aparado, Facas todas nele,
// Círculo com um tick). Os testes de fronteira chamam `rodarAtaques` direto, com o aparo posto à mão.
import { describe, expect, it } from 'vitest';
import armasJson from '../../../src/dados/armas.json';
import charneca from '../../../src/dados/regioes/charneca_das_lanternas.json';
import inimigosJson from '../../../src/dados/inimigos.json';
import vigilantes from '../../../src/dados/vigilantes.json';
import { ACERTO, acertar } from '../../../src/logica/armas/acerto';
import { ARMA, indiceDoNivel } from '../../../src/logica/armas/tabela';
import { criarDadosDaVigilia } from '../../../src/logica/mundo/dados';
import { rodarAtaques } from '../../../src/logica/mundo/ataques';
import { LARGURA_DO_MAPA } from '../../../src/logica/mundo/toro';
import { CAB, CENARIO, JOGADOR, JOGADOR3_U16, JOGADOR3_U8, TIPO_DE_PROJETIL, VAGAS_DE_ARMA, type Estado, type ParametrosDaVigilia } from '../../../src/logica/nucleo/estado';
import { EVENTO, FLAG, FORMA } from '../../../src/logica/nucleo/eventos';
import { avancar } from '../../../src/logica/nucleo/passo';
import { aplicarUniao } from '../../../src/logica/progressao/bau';
import { FONTES_DA_PROGRESSAO, PARADO } from '../apoio';
import { D_LIVRE as D, LONGE, TIPO, aparoEm, criar, eventosDe, fonteDeAcoes, junto, posicionar, posJogador, slotsVivos } from './apoio';

const ATQ = CENARIO.diretorDesligado | CENARIO.ataques;
const SEM_DANO = ATQ | CENARIO.jogadorInvulneravel;
const u8 = (e: Estado, campo: keyof typeof JOGADOR3_U8): number => e.jogador3U8[JOGADOR3_U8[campo]]!;
const passo = (e: Estado): number => e.cab[CAB.passo]!;
const q = (e: Estado, s: number): number => e.inimigos.quebradaPassos[s]!;
const GRANDE = { codigo: TIPO.oco_grande, dx: 0, dy: -40 };
const GRANDE_LONGE = { codigo: TIPO.oco_grande, dx: 300, dy: 300 };
const ALTO = 1e6;

/** Aparo bem-sucedido posto à mão: o Oco Grande `s` encostado ao norte do jogador, no último passo do telegrafo, janela ativa. */
function aparoDireto(e: Estado, s: number, ox = 0, oy = -40): void {
  const [jx, jy] = posJogador(e);
  posicionar(e, s, jx + ox, jy + oy);
  e.inimigos.ataqueFase[s] = 1;
  e.inimigos.ataqueTimer[s] = 1;
  const d = Math.hypot(ox, oy);
  e.inimigos.miraX[s] = -ox / d;
  e.inimigos.miraY[s] = -oy / d;
  e.jogador3U8[JOGADOR3_U8.aparoJanela] = 5;
  e.jogador3U8[JOGADOR3_U8.aparoLimite] = 11;
  rodarAtaques(e, D);
}

function rodar(e: Estado, n: number): void {
  for (let i = 0; i < n; i++) avancar(e, D, PARADO, 1);
}

/** Vigília de um aparo posto à mão: o Oco Grande `GRANDE` encostado, o resto como dado, `armas` na build. */
function com(armas: ParametrosDaVigilia['armas'], inimigos: readonly { codigo: number; dx: number; dy: number }[], cenario = SEM_DANO): Estado {
  return criar({ cenario, armas, inimigos });
}

/** Sem recarga natural: a vaga só age pelo Contra-ataque. */
function sossegar(e: Estado): void {
  for (let v = 0; v < VAGAS_DE_ARMA; v++) if (e.build.codigo[v] !== 0) e.build.recarga[v] = 1000;
}

describe('PQ1: a área é 64 + r em volta do jogador, e o atacante sempre', () => {
  const raio = (tipo: number): number => D.tipos.raio[tipo]!;

  it.each([
    ['Oco das Lanternas', TIPO.oco_das_lanternas],
    ['Noviça', TIPO.novica_de_sal],
    ['Oco Grande', TIPO.oco_grande],
  ])('%s: a 64 + r recebe, a 64 + r + 1/16 não (coordenadas Float32 exatas)', (_nome, tipo) => {
    const lim = 64 + raio(tipo);
    const e = com([], [GRANDE, { codigo: tipo, dx: 300, dy: 300 }, { codigo: tipo, dx: 300, dy: 300 }, { codigo: tipo, dx: 300, dy: 300 }]);
    const [atacante, dentro, fora, longe] = slotsVivos(e) as [number, number, number, number];
    const [jx, jy] = posJogador(e);
    posicionar(e, dentro, jx + lim, jy);
    posicionar(e, fora, jx, jy + lim + 1 / 16);
    // `longe` fica onde nasceu (a ~420 px).
    aparoDireto(e, atacante);
    expect(q(e, atacante)).toBe(121);
    expect(q(e, dentro)).toBe(121);
    expect(q(e, fora)).toBe(0);
    expect(q(e, longe)).toBe(0);
  });

  it('vale pelo toro: jogador em x = 5, alvo em x = largura − 75 (delta −80)', () => {
    const e = com([], [GRANDE, LONGE, LONGE]);
    const [atacante, dentro, fora] = slotsVivos(e) as [number, number, number];
    e.jogador[JOGADOR.x] = 5;
    const jy = e.jogador[JOGADOR.y]!;
    posicionar(e, dentro, LARGURA_DO_MAPA - 75, jy);
    posicionar(e, fora, LARGURA_DO_MAPA - 75 - 1 / 16, jy);
    aparoDireto(e, atacante);
    expect([q(e, dentro), q(e, fora)]).toEqual([121, 0]);
  });

  it('o centro é o jogador: um Oco a 80 px do jogador e a 120 px do atacante recebe', () => {
    const e = com([], [GRANDE, LONGE]);
    const [atacante, sul] = slotsVivos(e) as [number, number];
    junto(e, sul, 0, 80);
    aparoDireto(e, atacante);
    expect(q(e, sul)).toBe(121);
  });

  it('o atacante recebe mesmo fora do raio (projétil da Noviça a 190 px)', () => {
    const e = com([], [{ codigo: TIPO.novica_de_sal, dx: 0, dy: -190 }, LONGE]);
    const [novica, outro] = slotsVivos(e) as [number, number];
    rodar(e, 32);
    const p = [...Array(e.projeteis.x.length).keys()].find((k) => e.poolDeProjeteis.posicao[k]! >= 0 && e.projeteis.tipo[k] === TIPO_DE_PROJETIL.sal)!;
    // O projétil encosta no jogador no próximo passo, com a janela ativa.
    const [jx, jy] = posJogador(e);
    e.projeteis.x[p] = jx;
    e.projeteis.y[p] = jy - 5;
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 5;
    e.jogador3U8[JOGADOR3_U8.aparoLimite] = 11;
    rodarAtaques(e, D);
    expect(q(e, novica)).toBe(121);
    expect(q(e, outro)).toBe(0);
    expect(eventosDe(e, EVENTO.golpeInimigo)[0]).toMatchObject({ b: 3, forma: FORMA.projetilSal });
  });
});

describe('PQ5: tipos imunes por dado', () => {
  it('postura_quebrada: false no tipo ignora a área e o atacante', () => {
    const lista = JSON.parse(JSON.stringify(inimigosJson.inimigos)) as typeof inimigosJson.inimigos;
    for (const i of lista) if (i.id === 'oco_grande' || i.id === 'oco_das_lanternas') (i as { postura_quebrada: boolean }).postura_quebrada = false;
    const dv = criarDadosDaVigilia({ ...charneca, obstaculos: [] }, vigilantes.vigilantes[0]!, lista, armasJson.armas, FONTES_DA_PROGRESSAO);
    const e = criar({ cenario: SEM_DANO, inimigos: [GRANDE, LONGE, { codigo: TIPO.novica_de_sal, dx: 300, dy: 300 }] }, dv);
    const [grande, lanternas, novica] = slotsVivos(e) as [number, number, number];
    junto(e, lanternas, 0, 50);
    junto(e, novica, 50, 0);
    const [jx, jy] = posJogador(e);
    posicionar(e, grande, jx, jy - 40);
    e.inimigos.ataqueFase[grande] = 1;
    e.inimigos.ataqueTimer[grande] = 1;
    e.inimigos.miraX[grande] = 0;
    e.inimigos.miraY[grande] = 1;
    e.jogador3U8[JOGADOR3_U8.aparoJanela] = 5;
    e.jogador3U8[JOGADOR3_U8.aparoLimite] = 11;
    rodarAtaques(e, dv);
    expect(eventosDe(e, EVENTO.aparo)).toHaveLength(1);
    expect([q(e, grande), q(e, lanternas), q(e, novica)]).toEqual([0, 0, 121]);
    expect(eventosDe(e, EVENTO.posturaQuebrada)).toHaveLength(1);
  });
});

describe('PQ2: 121 gravados, um único decremento na fase 8', () => {
  it('fluxo real: 120 no passo do sucesso, parada de h + 1 a h + 120, 0 em h + 121 (e o passo congelado não decrementa)', () => {
    const e = criar({ cenario: SEM_DANO, inimigos: [{ codigo: TIPO.oco_grande, dx: 0, dy: -70 }] });
    const s = slotsVivos(e)[0]!;
    const fonte = fonteDeAcoes([aparoEm(29)]);
    const valores = new Map<number, number>();
    let congelado = 0;
    let guarda = 0;
    while (passo(e) < 37 + 125) {
      const antes = passo(e);
      const v0 = q(e, s);
      avancar(e, D, fonte, 1);
      if (passo(e) === antes) {
        congelado++;
        expect(q(e, s)).toBe(v0);
      } else valores.set(passo(e), q(e, s));
      if (++guarda > 1000) throw new Error('guarda');
    }
    expect(congelado).toBe(5);
    const h = 37;
    expect(valores.get(h)).toBe(120);
    for (let k = 0; k <= 120; k++) expect(valores.get(h + k), `h+${k}`).toBe(120 - k);
    // Livre em h + 121: o Oco Grande volta a "livre" e telegrafa no mesmo passo (o jogador segue no gatilho).
    expect(eventosDe(e, EVENTO.telegrafo).map((x) => x.passo)).toEqual([1, h + 121]);
    expect(eventosDe(e, EVENTO.posturaQuebrada)).toHaveLength(1);
    expect(eventosDe(e, EVENTO.posturaQuebrada)[0]).toMatchObject({ passo: h, slot: s, a: 120 });
  });

  it('renova, não acumula: dois aparos 60 passos distantes voltam a 121, não a 181', () => {
    const e = com([], [GRANDE, GRANDE_LONGE]);
    const [a, b] = slotsVivos(e) as [number, number];
    aparoDireto(e, a);
    expect(q(e, a)).toBe(121);
    rodar(e, 5 + 60);
    expect(q(e, a)).toBe(121 - 60);
    // O 2º atacante chega agora; o 1º, ainda atordoado, está na área e renova.
    aparoDireto(e, b, 40, 0);
    expect(q(e, a)).toBe(121);
    expect(q(e, b)).toBe(121);
  });

  it('o ×2 cobre 120 fases de armas: a Espada acerta em dobro de h + 1 a h + 120 e em simples em h + 121', () => {
    const e = criar({ cenario: SEM_DANO, armas: [{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }], inimigos: [{ codigo: TIPO.oco_grande, dx: 0, dy: -70 }] });
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    const fonte = fonteDeAcoes([aparoEm(29)]);
    const dano = new Map<number, number>();
    let guarda = 0;
    while (passo(e) < 37 + 125) {
      // Um golpe natural por passo vivo: a recarga vence em todo passo.
      e.build.recarga[0] = 1;
      avancar(e, D, fonte, 1);
      for (const ev of eventosDe(e, EVENTO.acerto)) if (ev.slot === s && !(ev.flags & FLAG.contra)) dano.set(ev.passo, ev.a);
      if (++guarda > 2000) throw new Error('guarda');
    }
    const h = 37;
    expect(eventosDe(e, EVENTO.aparo)[0]!.passo).toBe(h);
    const base = e.derivados.danoVivo[indiceDoNivel(ARMA.espada_longa_do_juramento, 1)]!;
    expect(dano.get(h)).toBeCloseTo(base, 4);
    for (let k = 1; k <= 120; k++) expect(dano.get(h + k), `h+${k}`).toBeCloseTo(base * 2, 4);
    expect(dano.get(h + 121)).toBeCloseTo(base, 4);
  });
});

describe('PQ3 e OG10: o que o atordoado deixa de fazer', () => {
  it('o Oco das Lanternas que perseguia fica parado de h + 1 a h + 120 e volta em h + 121', () => {
    const e = criar({ cenario: SEM_DANO, inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: -200 }] });
    const s = slotsVivos(e)[0]!;
    e.inimigos.quebradaPassos[s] = 120;
    const y0 = e.inimigos.y[s]!;
    for (let k = 1; k <= 120; k++) {
      avancar(e, D, PARADO, 1);
      expect(e.inimigos.y[s], `passo ${k}`).toBe(y0);
    }
    avancar(e, D, PARADO, 1);
    expect(e.inimigos.y[s]).toBeGreaterThan(y0);
  });

  it('é separado de outro que o empurra e empurrado pelo pulso (kbPassos)', () => {
    const e = criar({ cenario: SEM_DANO, inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: -200 }, { codigo: TIPO.oco_das_lanternas, dx: 0, dy: -190 }] });
    const [a, b] = slotsVivos(e) as [number, number];
    e.inimigos.quebradaPassos[a] = 120;
    const ya = e.inimigos.y[a]!;
    rodar(e, 3);
    // O vizinho livre anda para o jogador e sobrepõe o atordoado: a separação o desloca (para longe do jogador).
    expect(e.inimigos.y[a]).not.toBe(ya);
    expect(e.inimigos.y[b]).toBeGreaterThan(e.inimigos.y[a]!);
    const f = criar({ cenario: SEM_DANO, inimigos: [{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: -200 }] });
    const s = slotsVivos(f)[0]!;
    f.inimigos.quebradaPassos[s] = 120;
    f.inimigos.kbPassos[s] = 4;
    const y0 = f.inimigos.y[s]!;
    rodar(f, 1);
    expect(f.inimigos.y[s]).toBeLessThan(y0);
  });

  it('Oco Grande com 20 passos de telegrafo restantes não golpeia; volta ao repouso e telegrafa só depois do fim', () => {
    const e = criar({ cenario: SEM_DANO, inimigos: [{ codigo: TIPO.oco_grande, dx: 0, dy: -70 }] });
    const s = slotsVivos(e)[0]!;
    rodar(e, 20);
    expect(e.inimigos.ataqueTimer[s]).toBe(36 - 19);
    e.inimigos.quebradaPassos[s] = 120;
    rodar(e, 130);
    expect(eventosDe(e, EVENTO.golpeInimigo)).toHaveLength(0);
    // Atordoado de 21 a 140 (lido nas fases 6 desses passos); livre no 141, que telegrafa.
    expect(eventosDe(e, EVENTO.telegrafo).map((x) => x.passo)).toEqual([1, 141]);
    expect(e.inimigos.ataqueFase[s]).toBe(1);
  });

  it('Noviça atingida em T + 10 não lança em T + 30; o 1º telegrafo seguinte vem 180 passos depois do último passo atordoado', () => {
    const e = criar({ cenario: SEM_DANO, inimigos: [{ codigo: TIPO.novica_de_sal, dx: 0, dy: -150 }] });
    const s = slotsVivos(e)[0]!;
    rodar(e, 10);
    e.inimigos.quebradaPassos[s] = 120;
    rodar(e, 20);
    expect(eventosDe(e, EVENTO.projetilLancado)).toHaveLength(0);
    rodar(e, 100);
    // O valor 120 foi posto antes do passo 11: lido (> 0) nos passos 11 a 130; livre no 131.
    expect(eventosDe(e, EVENTO.telegrafo).map((x) => x.passo)).toEqual([1]);
    rodar(e, 60);
    expect(eventosDe(e, EVENTO.telegrafo).map((x) => x.passo)).toEqual([1]);
    rodar(e, 130 + 180 - 10 - 20 - 100 - 60);
    expect(eventosDe(e, EVENTO.telegrafo).map((x) => x.passo)).toEqual([1, 130 + 180]);
  });

  it('o projétil já lançado segue e acerta mesmo com a dona atordoada', () => {
    const e = criar({ cenario: ATQ, inimigos: [{ codigo: TIPO.novica_de_sal, dx: 0, dy: -190 }] });
    const s = slotsVivos(e)[0]!;
    rodar(e, 35);
    expect(eventosDe(e, EVENTO.projetilLancado)).toHaveLength(1);
    e.inimigos.quebradaPassos[s] = 120;
    rodar(e, 120);
    const g = eventosDe(e, EVENTO.golpeInimigo);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ b: 1, forma: FORMA.projetilSal });
  });
});

describe('PQ4: o atordoado não fere por contato', () => {
  it('o Oco encostado não tira HP de h + 1 a h + 120; o contato volta em h + 121', () => {
    const e = criar({ cenario: ATQ, inimigos: [LONGE] });
    const s = slotsVivos(e)[0]!;
    junto(e, s, 20, 0);
    e.inimigos.quebradaPassos[s] = 120;
    const hp0 = e.jogador[JOGADOR.hp]!;
    rodar(e, 120);
    expect(e.jogador[JOGADOR.hp]).toBe(hp0);
    rodar(e, 1);
    expect(e.jogador[JOGADOR.hp]).toBeLessThan(hp0);
  });
});

describe('PQ6 e PQ7: o fator por alvo é lido no acerto', () => {
  it('acertar: com quebradaPassos = 1 o dano dobra e o evento leva a flag crítico; com 0 não', () => {
    const e = criar({ cenario: SEM_DANO, inimigos: [LONGE, LONGE] });
    const [a, b] = slotsVivos(e) as [number, number];
    e.inimigos.hp[a] = 100;
    e.inimigos.hp[b] = 100;
    e.inimigos.quebradaPassos[a] = 1;
    for (const s of [a, b]) {
      ACERTO[0] = 10;
      ACERTO[1] = 200;
      acertar(e, s, ARMA.espada_longa_do_juramento, FORMA.ida, 0, 0);
    }
    expect([e.inimigos.hp[a], e.inimigos.hp[b]]).toEqual([80, 90]);
    const ev = eventosDe(e, EVENTO.acerto);
    expect(ev.map((x) => x.flags & FLAG.critico)).toEqual([FLAG.critico, 0]);
    // O bit `contra` entra pelo flagsExtra, sem crítico (PQ8).
    ACERTO[0] = 10;
    acertar(e, b, ARMA.espada_longa_do_juramento, FORMA.ida, 0, 0, FLAG.contra);
    expect(eventosDe(e, EVENTO.acerto)[2]!.flags).toBe(FLAG.contra);
  });

  it('o fator vem da coluna pqFator: Espada 200 do nv1 ao 3 e 300 do nv4 ao 8; Facas e Círculo 200; a Lâmina herda 300', () => {
    const t = D.armas;
    for (let n = 1; n <= 3; n++) expect(t.pqFator[indiceDoNivel(ARMA.espada_longa_do_juramento, n)]).toBe(200);
    for (let n = 4; n <= 8; n++) expect(t.pqFator[indiceDoNivel(ARMA.espada_longa_do_juramento, n)]).toBe(300);
    for (let n = 1; n <= 8; n++) {
      expect(t.pqFator[indiceDoNivel(ARMA.facas_de_sal, n)]).toBe(200);
      expect(t.pqFator[indiceDoNivel(ARMA.circulo_de_sal, n)]).toBe(200);
    }
    expect(t.pqFator[indiceDoNivel(ARMA.lamina_do_juramento_eterno, 1)]).toBe(300);
  });

  it.each([
    ['Espada nv1', ARMA.espada_longa_do_juramento, 1, 6.75, 2],
    ['Espada nv4', ARMA.espada_longa_do_juramento, 4, 8.1, 3],
    ['Lâmina', ARMA.lamina_do_juramento_eterno, 1, 17.325, 3],
  ])('golpe natural contra o atordoado: %s leva o fator e o crítico; sem Postura, o dano simples', (_nome, arma, nivel, base, fator) => {
    for (const atordoado of [true, false]) {
      const e = com([{ codigo: arma, nivel }], [GRANDE]);
      const s = slotsVivos(e)[0]!;
      e.inimigos.hp[s] = ALTO;
      e.inimigos.ataqueFase[s] = 0;
      if (atordoado) e.inimigos.quebradaPassos[s] = 5;
      avancar(e, D, PARADO, 1);
      const acerto = eventosDe(e, EVENTO.acerto).find((x) => x.slot === s)!;
      expect(acerto.a).toBeCloseTo(atordoado ? base * fator : base, 3);
      expect(acerto.flags & FLAG.critico).toBe(atordoado ? FLAG.critico : 0);
    }
  });

  it('a faca que atordoa o alvo depois do disparo leva o fator no acerto (lido no acerto, não no disparo)', () => {
    const e = com([{ codigo: ARMA.facas_de_sal, nivel: 8 }], [{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: -150 }]);
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    const dano0 = e.derivados.danoVivo[indiceDoNivel(ARMA.facas_de_sal, 8)]!;
    avancar(e, D, PARADO, 1);
    expect(eventosDe(e, EVENTO.acerto)).toHaveLength(0);
    e.inimigos.quebradaPassos[s] = 120;
    rodar(e, 30);
    const acertos = eventosDe(e, EVENTO.acerto).filter((x) => x.slot === s);
    expect(acertos.length).toBeGreaterThan(0);
    for (const a of acertos) {
      expect(a.a).toBeCloseTo(dano0 * 2, 3);
      expect(a.flags & FLAG.critico).toBe(FLAG.critico);
    }
  });
});

describe('F-006.4: Contra-ataque da Espada e da Lâmina (CA1, CA2)', () => {
  const ESPADA8 = [{ codigo: ARMA.espada_longa_do_juramento, nivel: 8 }];

  function espadaComAparado(extra: { codigo: number; dx: number; dy: number }[] = []): { e: Estado; s: number } {
    const e = com(ESPADA8, [GRANDE, ...extra]);
    const s = slotsVivos(e)[0]!;
    for (const x of slotsVivos(e)) e.inimigos.hp[x] = ALTO;
    e.jogador[JOGADOR.dirX] = 1;
    e.jogador[JOGADOR.dirY] = 0;
    sossegar(e);
    return { e, s };
  }

  it('4 golpes extras (ida, volta, estocada, ida) em t0 + 1, + 13, + 25 e + 37, com a flag contra e a mira no aparado', () => {
    const { e, s } = espadaComAparado();
    aparoDireto(e, s);
    const t0 = passo(e);
    rodar(e, 80);
    const g = eventosDe(e, EVENTO.golpe).filter((x) => x.flags & FLAG.contra);
    expect(g.map((x) => x.passo)).toEqual([t0 + 1, t0 + 13, t0 + 25, t0 + 37]);
    expect(g.map((x) => x.forma)).toEqual([FORMA.ida, FORMA.volta, FORMA.estocada, FORMA.ida]);
    // Mira = vetor unitário do jogador ao aparado (norte), e não a direção do movimento (leste), que não é sobrescrita.
    for (const x of g) expect([x.x, x.y]).toEqual([0, -1]);
    expect([e.jogador[JOGADOR.dirX], e.jogador[JOGADOR.dirY]]).toEqual([1, 0]);
    expect(e.build.caSeq[0]).toBe(0);
    // Em ≤ 90 passos do aparo.
    expect(g[3]!.passo - t0).toBeLessThanOrEqual(90);
  });

  it('cada golpe acerta o aparado em 9,45 × 2 × 3 (produto: ×6) e não o outro Oco, do lado oposto', () => {
    const { e, s } = espadaComAparado([{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: 40 }]);
    const outro = slotsVivos(e)[1]!;
    aparoDireto(e, s);
    rodar(e, 80);
    const contra = eventosDe(e, EVENTO.acerto).filter((x) => x.flags & FLAG.contra);
    expect(contra.map((x) => x.slot)).toEqual([s, s, s, s]);
    for (const x of contra) {
      expect(x.a).toBeCloseTo(9.45 * 2 * 3, 3);
      expect(x.flags & FLAG.critico).toBe(FLAG.critico);
    }
    expect(eventosDe(e, EVENTO.acerto).filter((x) => x.slot === outro)).toHaveLength(0);
  });

  it('a mira vai para o aparado mesmo a 128 px, que só a estocada alcança', () => {
    const { e, s } = espadaComAparado();
    const [jx, jy] = posJogador(e);
    // Aparado fora do alcance do arco (76,8 + r): vai só a estocada (115,2 + r).
    e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = s;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = e.pool.geracao[s]!;
    posicionar(e, s, jx + 128, jy);
    e.build.caSeq[0] = 1;
    rodar(e, 40);
    const acertos = eventosDe(e, EVENTO.acerto).filter((x) => x.slot === s);
    // Os dois primeiros golpes (arcos) erram; o 1º acerto é o da estocada (o Oco, livre, só chega ao arco depois).
    expect(acertos[0]!.forma).toBe(FORMA.estocada);
    expect(acertos[0]!.passo).toBe(25 + 0);
  });

  it('recarga, golpe, esperaGolpe e esperaPulso ficam bit a bit iguais a uma execução sem Contra-ataque', () => {
    const rodarComSemContra = (contra: boolean): number[] => {
      const { e, s } = espadaComAparado();
      e.build.recarga[0] = 100;
      aparoDireto(e, s);
      if (!contra) e.build.caSeq.fill(0);
      rodar(e, 70);
      return [e.build.recarga[0]!, e.build.golpe[0]!, e.build.esperaGolpe[0]!, e.build.esperaPulso[0]!];
    };
    expect(rodarComSemContra(true)).toEqual(rodarComSemContra(false));
  });

  it('dois aparos com 20 passos de diferença reiniciam a sequência: 4 golpes a partir do 2º; os já dados ficam', () => {
    const e = com(ESPADA8, [GRANDE, GRANDE_LONGE]);
    const [a, b] = slotsVivos(e) as [number, number];
    for (const x of [a, b]) e.inimigos.hp[x] = ALTO;
    sossegar(e);
    aparoDireto(e, a);
    const t0 = passo(e);
    rodar(e, 5 + 20);
    expect(passo(e)).toBe(t0 + 20);
    aparoDireto(e, b, 40, 0);
    const t1 = passo(e);
    rodar(e, 100);
    const g = eventosDe(e, EVENTO.golpe)
      .filter((x) => x.flags & FLAG.contra)
      .map((x) => x.passo);
    expect(g).toEqual([t0 + 1, t0 + 13, t1 + 1, t1 + 13, t1 + 25, t1 + 37]);
  });

  it('Lâmina: 4 golpes e 4 ondas, na mira do aparado, com danoOnda × 2 = 13,2 fixado na criação', () => {
    const e = com([{ codigo: ARMA.lamina_do_juramento_eterno, nivel: 1 }], [GRANDE]);
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    e.jogador[JOGADOR.dirX] = 1;
    e.jogador[JOGADOR.dirY] = 0;
    sossegar(e);
    aparoDireto(e, s);
    const danos = new Set<number>();
    for (let i = 0; i < 80; i++) {
      avancar(e, D, PARADO, 1);
      for (let o = 0; o < e.efeitos.dano.length; o++) if (e.poolDeEfeitos.posicao[o]! >= 0) danos.add(e.efeitos.dano[o]!);
    }
    const ondas = eventosDe(e, EVENTO.onda);
    expect(ondas).toHaveLength(4);
    for (const o of ondas) expect([o.a, o.b]).toEqual([0, -1].map((v) => v));
    expect([...danos].map((d) => Math.round(d * 100) / 100)).toEqual([13.2]);
    expect(eventosDe(e, EVENTO.golpe).filter((x) => x.flags & FLAG.contra)).toHaveLength(4);
  });
});

describe('F-006.4: Contra-ataque das Facas e do Círculo (CA3, CA4)', () => {
  /** Arma o Contra-ataque à mão com o aparado `s` (o "caSeq posto à mão" do AP15). */
  function armar(e: Estado, s: number): void {
    e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = s;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = e.pool.geracao[s]!;
    for (let v = 0; v < VAGAS_DE_ARMA; v++) if (e.build.codigo[v] !== 0) e.build.caSeq[v] = 1;
  }

  const projeteisVivos = (e: Estado): number[] => [...Array(e.projeteis.x.length).keys()].filter((p) => e.poolDeProjeteis.posicao[p]! >= 0 && e.projeteis.tipo[p] === TIPO_DE_PROJETIL.faca);

  it('as nf facas saem no mesmo passo, todas na direção do aparado a 300 px (além do alcance de 192), com dano × 2', () => {
    const t = D.armas;
    for (const nivel of [1, 8]) {
      const e = com([{ codigo: ARMA.facas_de_sal, nivel }], [{ codigo: TIPO.oco_das_lanternas, dx: 300, dy: 0 }]);
      const s = slotsVivos(e)[0]!;
      sossegar(e);
      armar(e, s);
      avancar(e, D, PARADO, 1);
      const ps = projeteisVivos(e);
      const nf = t.projeteis[indiceDoNivel(ARMA.facas_de_sal, nivel)]!;
      expect(ps).toHaveLength(nf);
      const base = Math.fround(e.derivados.danoVivo[indiceDoNivel(ARMA.facas_de_sal, nivel)]!);
      for (const p of ps) {
        expect(e.projeteis.vy[p]).toBeCloseTo(0, 6);
        expect(e.projeteis.vx[p]).toBeGreaterThan(0);
        expect(e.projeteis.dano[p]).toBeCloseTo(base * 2, 4);
      }
      expect(e.build.caSeq[0]).toBe(0);
      // A recarga natural segue no seu relógio (1000 − 1), sem ser zerada.
      expect(e.build.recarga[0]).toBe(999);
    }
  });

  it('com outro inimigo mais perto e o aparado longe, as facas vão no aparado; sem aparado válido vão no mais próximo, ainda × 2', () => {
    const e = com([{ codigo: ARMA.facas_de_sal, nivel: 8 }], [{ codigo: TIPO.oco_das_lanternas, dx: 300, dy: 0 }, { codigo: TIPO.oco_das_lanternas, dx: 0, dy: -100 }]);
    const [longe, perto] = slotsVivos(e) as [number, number];
    sossegar(e);
    armar(e, longe);
    avancar(e, D, PARADO, 1);
    for (const p of projeteisVivos(e)) expect(e.projeteis.vx[p]).toBeGreaterThan(0);
    // Handle reaproveitado: a geração do aparado não confere, então vale o alvo normal (o mais próximo).
    const f = com([{ codigo: ARMA.facas_de_sal, nivel: 8 }], [{ codigo: TIPO.oco_das_lanternas, dx: 300, dy: 0 }, { codigo: TIPO.oco_das_lanternas, dx: 0, dy: -100 }]);
    const [longe2] = slotsVivos(f) as [number, number];
    sossegar(f);
    armar(f, longe2);
    f.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = (f.pool.geracao[longe2]! + 1) & 0xffff;
    avancar(f, D, PARADO, 1);
    const base = Math.fround(f.derivados.danoVivo[indiceDoNivel(ARMA.facas_de_sal, 8)]!);
    for (const p of projeteisVivos(f)) {
      expect(f.projeteis.vy[p]).toBeLessThan(0);
      expect(f.projeteis.dano[p]).toBeCloseTo(base * 2, 4);
    }
    expect(projeteisVivos(f).length).toBeGreaterThan(0);
    expect(perto).toBeGreaterThanOrEqual(0);
  });

  it('a faca extra da esquiva perfeita é consumida pela salva do Contra-ataque', () => {
    const e = com([{ codigo: ARMA.facas_de_sal, nivel: 1 }], [{ codigo: TIPO.oco_das_lanternas, dx: 100, dy: 0 }]);
    const s = slotsVivos(e)[0]!;
    sossegar(e);
    armar(e, s);
    e.jogador3U8[JOGADOR3_U8.facaExtra] = 1;
    avancar(e, D, PARADO, 1);
    expect(projeteisVivos(e)).toHaveLength(D.armas.projeteis[indiceDoNivel(ARMA.facas_de_sal, 1)]! + 1);
    expect(u8(e, 'facaExtra')).toBe(0);
  });

  it('Círculo: 1 tick extra no 1º passo, dano × 2 com Sal, recarga e esperaPulso intactos, sem evento de pulso', () => {
    const e = com([{ codigo: ARMA.circulo_de_sal, nivel: 8 }], [{ codigo: TIPO.oco_das_lanternas, dx: 40, dy: 0 }]);
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    sossegar(e);
    e.build.esperaPulso[0] = 777;
    armar(e, s);
    const dano = e.derivados.danoVivo[indiceDoNivel(ARMA.circulo_de_sal, 8)]!;
    avancar(e, D, PARADO, 1);
    const ev = eventosDe(e, EVENTO.acerto);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.a).toBeCloseTo(dano * 2, 4);
    expect(ev[0]!.flags & FLAG.contra).toBe(FLAG.contra);
    expect(e.inimigos.salPassos[s]).toBeGreaterThan(0);
    expect([e.build.recarga[0], e.build.esperaPulso[0], e.build.caSeq[0]]).toEqual([999, 776, 0]);
    expect(eventosDe(e, EVENTO.pulso)).toHaveLength(0);
  });
});

describe('PQ6: a tabela de valores do produto, medida nos acertos do Contra-ataque contra o aparado atordoado', () => {
  it.each([
    ['Espada nv4', { codigo: ARMA.espada_longa_do_juramento, nivel: 4 }, 8.1, 48.6],
    ['Espada nv8', { codigo: ARMA.espada_longa_do_juramento, nivel: 8 }, 9.45, 56.7],
    ['Lâmina', { codigo: ARMA.lamina_do_juramento_eterno, nivel: 1 }, 17.325, 103.95],
  ])('%s: %f → ×6 = %f por acerto', (_nome, arma, base, esperado) => {
    const e = com([arma], [GRANDE]);
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    sossegar(e);
    aparoDireto(e, s);
    expect(e.derivados.danoVivo[indiceDoNivel(arma.codigo, arma.nivel)]).toBeCloseTo(base, 6);
    rodar(e, 50);
    const contra = eventosDe(e, EVENTO.acerto).filter((x) => x.flags & FLAG.contra);
    expect(contra.length).toBeGreaterThan(0);
    for (const x of contra) expect(x.a).toBeCloseTo(esperado, 3);
  });

  it('Facas nv8: 2,16 → 8,64 (×4); Círculo nv8: 1,05 → 4,2 (×4)', () => {
    const f = com([{ codigo: ARMA.facas_de_sal, nivel: 8 }], [{ codigo: TIPO.oco_das_lanternas, dx: 0, dy: -60 }]);
    const s = slotsVivos(f)[0]!;
    f.inimigos.hp[s] = ALTO;
    f.inimigos.quebradaPassos[s] = 120;
    sossegar(f);
    f.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = s;
    f.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = f.pool.geracao[s]!;
    f.build.caSeq[0] = 1;
    expect(f.derivados.danoVivo[indiceDoNivel(ARMA.facas_de_sal, 8)]).toBeCloseTo(2.16, 6);
    rodar(f, 40);
    const hits = eventosDe(f, EVENTO.acerto).filter((x) => x.slot === s);
    expect(hits.length).toBeGreaterThan(0);
    for (const x of hits) expect(x.a).toBeCloseTo(8.64, 3);

    const c = com([{ codigo: ARMA.circulo_de_sal, nivel: 8 }], [{ codigo: TIPO.oco_das_lanternas, dx: 40, dy: 0 }]);
    const sc = slotsVivos(c)[0]!;
    c.inimigos.hp[sc] = ALTO;
    c.inimigos.quebradaPassos[sc] = 120;
    sossegar(c);
    c.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = sc;
    c.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = c.pool.geracao[sc]!;
    c.build.caSeq[0] = 1;
    expect(c.derivados.danoVivo[indiceDoNivel(ARMA.circulo_de_sal, 8)]).toBeCloseTo(1.05, 6);
    avancar(c, D, PARADO, 1);
    expect(eventosDe(c, EVENTO.acerto)[0]!.a).toBeCloseTo(4.2, 4);
  });

  it('o Contra-ataque contra um não atordoado é ×2 sem a flag crítico (PQ8)', () => {
    const e = com([{ codigo: ARMA.circulo_de_sal, nivel: 1 }], [{ codigo: TIPO.oco_das_lanternas, dx: 40, dy: 0 }]);
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    sossegar(e);
    e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = s;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = e.pool.geracao[s]!;
    e.build.caSeq[0] = 1;
    avancar(e, D, PARADO, 1);
    const x = eventosDe(e, EVENTO.acerto)[0]!;
    expect(x.flags).toBe(FLAG.contra);
    expect(x.a).toBeCloseTo(e.derivados.danoVivo[indiceDoNivel(ARMA.circulo_de_sal, 1)]! * 2, 4);
  });
});

describe('CA5: casos de borda do Contra-ataque', () => {
  it('o aparado morto pela Espada (vaga 0) antes das Facas (vaga 1): as Facas saem para o alvo normal, × 2', () => {
    const e = com(
      [
        { codigo: ARMA.espada_longa_do_juramento, nivel: 1 },
        { codigo: ARMA.facas_de_sal, nivel: 1 },
      ],
      [GRANDE, { codigo: TIPO.oco_das_lanternas, dx: 100, dy: 0 }],
    );
    const [aparado, normal] = slotsVivos(e) as [number, number];
    sossegar(e);
    e.inimigos.hp[aparado] = 1;
    e.inimigos.hp[normal] = ALTO;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = aparado;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = e.pool.geracao[aparado]!;
    e.build.caSeq[0] = 1;
    e.build.caSeq[1] = 1;
    avancar(e, D, PARADO, 1);
    expect(e.inimigos.hp[aparado]).toBeLessThanOrEqual(0);
    const ps = [...Array(e.projeteis.x.length).keys()].filter((p) => e.poolDeProjeteis.posicao[p]! >= 0);
    expect(ps.length).toBeGreaterThan(0);
    const base = Math.fround(e.derivados.danoVivo[indiceDoNivel(ARMA.facas_de_sal, 1)]!);
    for (const p of ps) {
      expect(e.projeteis.vx[p]).toBeGreaterThan(0);
      expect(e.projeteis.dano[p]).toBeCloseTo(base * 2, 4);
    }
  });

  it('sem alvo normal as Facas não saem e a salva é gasta (caSeq zera)', () => {
    const e = com(
      [
        { codigo: ARMA.espada_longa_do_juramento, nivel: 1 },
        { codigo: ARMA.facas_de_sal, nivel: 1 },
      ],
      [GRANDE],
    );
    const aparado = slotsVivos(e)[0]!;
    sossegar(e);
    e.inimigos.hp[aparado] = 1;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoSlot] = aparado;
    e.jogador3U16[JOGADOR3_U16.alvoAparadoGeracao] = e.pool.geracao[aparado]!;
    e.build.caSeq[0] = 1;
    e.build.caSeq[1] = 1;
    avancar(e, D, PARADO, 1);
    expect([...Array(e.projeteis.x.length).keys()].filter((p) => e.poolDeProjeteis.posicao[p]! >= 0)).toHaveLength(0);
    expect(e.build.caSeq[1]).toBe(0);
  });

  it('a União zera caSeq e caEspera da vaga durante a sequência', () => {
    const e = com([{ codigo: ARMA.espada_longa_do_juramento, nivel: 8 }], [GRANDE]);
    const s = slotsVivos(e)[0]!;
    e.inimigos.hp[s] = ALTO;
    sossegar(e);
    aparoDireto(e, s);
    rodar(e, 8);
    expect(e.build.caSeq[0]).toBe(2);
    expect(e.build.caEspera[0]).toBeGreaterThan(0);
    aplicarUniao(e, D, 0);
    expect([e.build.caSeq[0], e.build.caEspera[0]]).toEqual([0, 0]);
  });

  it('o evento contraAtaque leva o slot do alvo e as vagas armadas; o aparo sem vagas arma 0', () => {
    const e = com([{ codigo: ARMA.espada_longa_do_juramento, nivel: 1 }, { codigo: ARMA.circulo_de_sal, nivel: 1 }], [GRANDE]);
    const s = slotsVivos(e)[0]!;
    aparoDireto(e, s);
    const ev = eventosDe(e, EVENTO.contraAtaque);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ slot: s, a: s, b: 2 });
    const vazio = com([], [GRANDE]);
    aparoDireto(vazio, slotsVivos(vazio)[0]!);
    expect(eventosDe(vazio, EVENTO.contraAtaque)[0]).toMatchObject({ b: 0 });
  });
});
