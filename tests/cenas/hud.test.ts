// HUD e pausa da F-005 sem Phaser (design/decisoes-F-005.md R4, R5, R6 e "Pausa"):
// a geometria da barra de XP e das 12 vagas, a proporção do preenchimento, os
// ids de texto da pausa e os ícones.
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  LARGURA_DA_LINHA_DE_VAGAS,
  TOTAL_DE_VAGAS_DO_HUD,
  caixaDaBarraDeXp,
  larguraDoPreenchimento,
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
