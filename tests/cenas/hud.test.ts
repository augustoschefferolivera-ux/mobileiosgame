// HUD e pausa da F-005 sem Phaser (design/decisoes-F-005.md R4, R5, R6 e "Pausa"):
// a geometria da barra de XP e das 12 vagas, a proporção do preenchimento, os
// ids de texto da pausa e os ícones.
import { readFileSync } from 'node:fs';
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  BARRA_DE_STAMINA,
  BOTAO_DO_FRASCO_DESENHO,
  ESTADO_DO_APARO,
  ESTADO_DO_FRASCO,
  estadoDoFrasco,
  LARGURA_DA_LINHA_DE_VAGAS,
  STAMINA_DA_ESQUIVA,
  TOTAL_DE_VAGAS_DO_HUD,
  caixaDaBarraDeStamina,
  caixaDaBarraDeXp,
  formatarAlmas,
  posicaoDoHudDeAlmas,
  estadoDoAparo,
  larguraDaStamina,
  larguraDoPreenchimento,
  xDaMarcaDeStamina,
  vagasDoHud,
  type CaixaDaBarra,
  type VagaDoHud,
} from '../../src/cenas/layoutDoHud';
import { PARES_DA_PAUSA, linhasDaPausa, type LinhaDaPausa } from '../../src/cenas/linhasDaPausa';
import { desenharIcone, iconeDaArma, iconeDaPassiva, type Icone } from '../../src/cenas/render/icones';
import { t } from '../../src/cenas/textos';
import { ARMA } from '../../src/logica/armas/tabela';
import { criarEstado } from '../../src/logica/nucleo/estado';
import { PASSIVA } from '../../src/logica/progressao/tabela';
import { insetsZerados, type Insets } from '../../src/plataforma/safeArea';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

const IPHONE: Insets = { topo: 59, direita: 0, baixo: 34, esquerda: 0 };
const LATERAIS: Insets = { topo: 47, direita: 10, baixo: 34, esquerda: 20 };
const barra = (i: Insets): CaixaDaBarra => caixaDaBarraDeXp(i, { x: 0, y: 0, largura: 0, altura: 0 });
const vagas = (i: Insets): VagaDoHud[] => vagasDoHud(i, []);

describe('barra de XP (R4)', () => {
  it('8 pt em topo + 40, de esquerda + 80 até 390 − direita − 64', () => {
    expect(barra(insetsZerados())).toEqual({ x: 80, y: 40, largura: 246, altura: 8 });
    expect(barra(IPHONE)).toEqual({ x: 80, y: 99, largura: 246, altura: 8 });
    expect(barra(LATERAIS)).toEqual({ x: 100, y: 87, largura: 216, altura: 8 });
  });

  it('o preenchimento é xp / custo da largura, limitado a [0, largura]', () => {
    expect(larguraDoPreenchimento(246, 0, 10)).toBe(0);
    expect(larguraDoPreenchimento(246, 5, 10)).toBe(123);
    expect(larguraDoPreenchimento(200, 1, 4)).toBe(50);
    expect(larguraDoPreenchimento(246, 10, 10)).toBe(246);
    expect(larguraDoPreenchimento(246, 12, 10)).toBe(246);
    expect(larguraDoPreenchimento(246, 3, 0)).toBe(0);
  });
});

describe('barra de stamina (decisoes-F-006 RE1)', () => {
  const stamina = (i: Insets): CaixaDaBarra => caixaDaBarraDeStamina(i, { x: 0, y: 0, largura: 0, altura: 0 });

  it('10 pt em topo + 56, na metade direita da faixa da barra de XP: x = esquerda + 207, largura 119', () => {
    expect(stamina(insetsZerados())).toEqual({ x: 207, y: 56, largura: 119, altura: 10 });
    expect(stamina(IPHONE)).toEqual({ x: 207, y: 115, largura: 119, altura: 10 });
    expect(stamina({ topo: 47, direita: 0, baixo: 34, esquerda: 0 })).toEqual({ x: 207, y: 103, largura: 119, altura: 10 });
    // Com insets laterais a metade direita acompanha a barra de XP (100 a 316: 216 pt).
    expect(stamina(LATERAIS)).toEqual({ x: 20 + 80 + 104 + 8, y: 103, largura: 104, altura: 10 });
  });

  it('fica dentro da banda de 72 pt do botão de pausa e acima das vagas (topo + 80)', () => {
    const c = stamina(IPHONE);
    expect(c.y + c.altura).toBeLessThanOrEqual(IPHONE.topo + 72);
    expect(c.y + c.altura).toBeLessThan(vagas(IPHONE)[0]!.y);
    expect(c.x).toBeGreaterThan(barra(IPHONE).x + (barra(IPHONE).largura - 8) / 2);
  });

  it('largura do preenchimento para stamina 0, 24,5, 25 e 100 (1,19 pt por ponto)', () => {
    expect([0, 24.5, 25, 100].map((s) => larguraDaStamina(119, s, 100))).toEqual([0, 29.155, 29.75, 119].map((v) => expect.closeTo(v, 9)));
    expect(larguraDaStamina(119, 130, 100)).toBe(119);
    expect(larguraDaStamina(119, -3, 100)).toBe(0);
  });

  it('três marcas de 1 pt a 25, 50 e 75 (29,75, 59,5 e 89,25 pt)', () => {
    expect(BARRA_DE_STAMINA.marcas).toEqual([25, 50, 75]);
    expect(BARRA_DE_STAMINA.larguraDaMarca).toBe(1);
    expect(BARRA_DE_STAMINA.marcas.map((m) => xDaMarcaDeStamina(119, m, 100))).toEqual([29.75, 59.5, 89.25]);
  });

  it('o limite de uma esquiva é 25: laranja só abaixo dele', () => {
    expect(STAMINA_DA_ESQUIVA).toBe(25);
  });
});

describe('estado do botão Aparo (decisoes-F-006 AP1 e RE2)', () => {
  it('normal; pressionado tem a vez; indisponível com stamina < 15, em esquiva, em janela ou em aparo falho', () => {
    const E = ESTADO_DO_APARO;
    expect(estadoDoAparo(0, 100, 15, 0, 0, 0)).toBe(E.normal);
    expect(estadoDoAparo(0, 15, 15, 0, 0, 0)).toBe(E.normal);
    expect(estadoDoAparo(0, 14.5, 15, 0, 0, 0)).toBe(E.indisponivel);
    expect(estadoDoAparo(0, 100, 15, 7, 0, 0)).toBe(E.indisponivel);
    expect(estadoDoAparo(0, 100, 15, 0, 5, 0)).toBe(E.indisponivel);
    expect(estadoDoAparo(0, 100, 15, 0, 0, 3)).toBe(E.indisponivel);
    expect(estadoDoAparo(3, 100, 15, 0, 5, 3)).toBe(E.pressionado);
  });
});

describe('12 vagas do HUD (R5)', () => {
  it('28 pt em topo + 80, centradas: 2 pt no grupo, 6 pt entre grupos (366 pt no total)', () => {
    expect(LARGURA_DA_LINHA_DE_VAGAS).toBe(366);
    const v = vagas(insetsZerados());
    expect(v).toHaveLength(TOTAL_DE_VAGAS_DO_HUD);
    expect(v.map((x) => x.x)).toEqual([12, 42, 72, 102, 132, 166, 200, 230, 260, 290, 320, 350]);
    expect(v.every((x) => x.y === 80)).toBe(true);
    expect(v[11]!.x + 28).toBe(378);
  });

  it('com os insets do iPhone a linha desce com o topo; com insets laterais, centra na área segura', () => {
    expect(vagas(IPHONE).map((x) => [x.x, x.y])).toEqual(vagas(insetsZerados()).map((x) => [x.x, 139]));
    const l = vagas(LATERAIS);
    expect(l[0]!.x).toBe(20 + (360 - 366) / 2);
    expect(l[0]!.y).toBe(127);
  });

  it('reaproveita o vetor de saída', () => {
    const out: VagaDoHud[] = [];
    vagasDoHud(insetsZerados(), out);
    const primeiro = out[0];
    vagasDoHud(IPHONE, out);
    expect(out[0]).toBe(primeiro);
    expect(out).toHaveLength(12);
  });
});

describe('linhas da pausa (pendência 9)', () => {
  const nomesNoDados = (): { uniao: ArrayLike<number>; nivelMax: ArrayLike<number> } => ({ uniao: D.armas.uniao, nivelMax: D.armas.nivelMax });

  it('União + Facas + Elmo + Luvas: ids por bloco da flag, o nível da União escondido', () => {
    const e = criarEstado(1, D, {
      armas: [
        { codigo: ARMA.lamina_do_juramento_eterno, nivel: 1 },
        { codigo: ARMA.facas_de_sal, nivel: 3 },
      ],
      passivas: [
        { codigo: PASSIVA.elmo_sem_rosto, nivel: 2 },
        { codigo: PASSIVA.luvas_de_fole, nivel: 1 },
      ],
    });
    const linhas = linhasDaPausa({ armas: e.build, passivas: e.passivas, ...nomesNoDados() }, []);
    expect(linhas).toEqual<LinhaDaPausa[]>([
      { idDoNome: 'F2.LAMINA_DO_JURAMENTO_ETERNO.NOME', nivel: null },
      { idDoNome: 'F1.FACAS_DE_SAL.NOME', nivel: 3 },
      { idDoNome: 'F3.ELMO_SEM_ROSTO.NOME', nivel: 2 },
      { idDoNome: 'F3.LUVAS_DE_FOLE.NOME', nivel: 1 },
    ]);
    for (const l of linhas) expect(() => t(l.idDoNome), l.idDoNome).not.toThrow();
    expect(t('A6.PAUSA.NIVEL', { nivel: 3 })).toBe('Nível 3');
  });

  it('a Espada comum usa o bloco F1 e mostra o nível; vagas vazias não geram linha', () => {
    const e = criarEstado(1, D);
    const linhas = linhasDaPausa({ armas: e.build, passivas: e.passivas, ...nomesNoDados() }, []);
    expect(linhas).toEqual([{ idDoNome: 'F1.ESPADA_LONGA_DO_JURAMENTO.NOME', nivel: 1 }]);
    expect(PARES_DA_PAUSA).toBe(11);
  });
});

/** Graphics falso: registra as chamadas e devolve a si mesmo. */
function graficoFalso(): { g: Phaser.GameObjects.Graphics; chamadas: string[] } {
  const chamadas: string[] = [];
  const g: unknown = new Proxy(
    {},
    {
      get: (_, nome: string) => {
        return (): unknown => {
          chamadas.push(nome);
          return g;
        };
      },
    },
  );
  return { g: g as Phaser.GameObjects.Graphics, chamadas };
}

describe('ícones (R6)', () => {
  const TODOS: Icone[] = ['espada', 'facas', 'circulo', 'lamina', 'elmo', 'luvas', 'bolsa'];

  it.each(TODOS)('%s desenha algo (preenche ou traça)', (icone) => {
    const { g, chamadas } = graficoFalso();
    desenharIcone(g, icone, 14, 14, 28);
    expect(chamadas.some((c) => /^(fill|stroke)/.test(c) && c !== 'fillStyle'), chamadas.join()).toBe(true);
  });

  it('o ícone por código, sem id de texto: armas e passivas; vazia = null', () => {
    expect([ARMA.vazia, ARMA.espada_longa_do_juramento, ARMA.facas_de_sal, ARMA.circulo_de_sal, ARMA.lamina_do_juramento_eterno].map(iconeDaArma)).toEqual([
      null,
      'espada',
      'facas',
      'circulo',
      'lamina',
    ]);
    expect([PASSIVA.vazia, PASSIVA.elmo_sem_rosto, PASSIVA.luvas_de_fole].map(iconeDaPassiva)).toEqual([null, 'elmo', 'luvas']);
    expect(iconeDaArma(99)).toBeNull();
  });
});

describe('textos da pausa e do Hud da F-006 (RE13)', () => {
  it('Som e Flashes vêm de t(id) e do pt-BR.json; o botão Aparo e a barra de stamina não têm texto', () => {
    expect([t('A6.PAUSA.SOM'), t('A6.PAUSA.FLASHES')]).toEqual(['Som', 'Flashes']);
    const pausa = readFileSync('src/cenas/Pausa.ts', 'utf8');
    expect(pausa).toContain("'A6.PAUSA.SOM'");
    expect(pausa).toContain("'A6.PAUSA.FLASHES'");
    expect(pausa).not.toMatch(/'(Som|Flashes)'/);
    // O Hud só cria texto para o nível, o número do HP (F-007 HB1), as Almas (AM5), o rótulo do botão do Frasco (FR8, criado uma vez) e o prompt (ids); nada para a barra de stamina nem para o Aparo.
    const hud = readFileSync('src/cenas/Hud.ts', 'utf8');
    expect([...hud.matchAll(/texto\(this, [^,]+, [^,]+, '([^']+)'/g)].map((m) => m[1])).toEqual(['A5.HUD.NIVEL', 'A5.HUD.HP', 'A5.HUD.ALMAS', 'A5.HUD.FRASCO']);
    expect(hud).toContain("texto(this, 0, 0, 'A5.HUD.HP'");
    // Os três prompts (um Text por id, TU11) vêm da lista de prompts.ts.
    expect(hud).toContain('for (const id of IDS_DOS_PROMPTS)');
    expect(hud).not.toMatch(/add\.text\(/);
  });
});

describe('botão do Frasco (design/decisoes-F-007.md FR8)', () => {
  it('estado: pressionado tem a vez; curando acende; sem cargas ou com HP cheio esmaece; senão normal', () => {
    expect(estadoDoFrasco(2, 0, 150, 150, 0)).toBe(ESTADO_DO_FRASCO.pressionado);
    expect(estadoDoFrasco(0, 2, 80, 150, 30)).toBe(ESTADO_DO_FRASCO.curando);
    expect(estadoDoFrasco(0, 0, 80, 150, 0)).toBe(ESTADO_DO_FRASCO.esmaecido);
    expect(estadoDoFrasco(0, 3, 150, 150, 0)).toBe(ESTADO_DO_FRASCO.esmaecido);
    expect(estadoDoFrasco(0, 3, 149.5, 150, 0)).toBe(ESTADO_DO_FRASCO.normal);
  });

  it('o rótulo e as marcas de carga saem por t(id) e por Graphics, sem Text por quadro: o texto do botão é um id só', () => {
    expect(t('A5.HUD.FRASCO')).toBe('Frasco');
    expect(BOTAO_DO_FRASCO_DESENHO.raioDoAnel * 2).toBeLessThanOrEqual(72);
    expect(BOTAO_DO_FRASCO_DESENHO.alfaEsmaecido).toBeLessThan(1);
  });
});

describe('HUD de Almas (design/decisoes-F-007.md AM5)', () => {
  it('"." de milhar: 0, 9, 999, 1.000, 1.240, 12.345', () => {
    expect([0, 9, 999, 1000, 1240, 12345, 1_073_741_823].map(formatarAlmas)).toEqual(['0', '9', '999', '1.000', '1.240', '12.345', '1.073.741.823']);
    expect(formatarAlmas(-5)).toBe('0');
    expect(formatarAlmas(NaN)).toBe('0');
  });

  it('fica à esquerda, 116 pt abaixo do topo, e o texto vem do pt-BR.json', () => {
    const o = { x: 0, y: 0 };
    expect(posicaoDoHudDeAlmas(insetsZerados(), o)).toEqual({ x: 12, y: 116 });
    expect(posicaoDoHudDeAlmas(IPHONE, o)).toEqual({ x: 12, y: 175 });
    expect(posicaoDoHudDeAlmas(LATERAIS, o)).toBe(o);
    expect(o).toEqual({ x: 32, y: 163 });
    expect(t('A5.HUD.ALMAS', { almas: formatarAlmas(1240) })).toBe('1.240 Almas');
  });
});
