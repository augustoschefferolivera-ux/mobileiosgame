// Render dos telegrafos da F-008 (design/decisoes-F-008.md CR3, CR11): o círculo vermelho do Grito do Coroado, o brilho do corpo
// pelos 60 passos dele e as setas na borda para os atacantes com telegrafo fora da vista. Sem Phaser.
import { describe, expect, it } from 'vitest';
import inimigos from '../../src/dados/inimigos.json';
import { COR } from '../../src/cenas/paleta';
import { MOLDURA } from '../../src/cenas/render/atlas';
import { prepararMedios, prepararTelegrafos, MEMBROS_DOS_MEDIOS, MEMBROS_DOS_TELEGRAFOS } from '../../src/cenas/render/ataques';
import { criarSaidaDeSprites, indiceDaMoldura } from '../../src/cenas/render/camadas';
import { criarSaidaDaHorda, criarTabelaDeDesenho, prepararHorda, prepararQuadrosDaHorda } from '../../src/cenas/render/horda';
import { MARGEM_DA_SETA, MAX_DE_SETAS_DE_TELEGRAFO, criarSetasDeTelegrafo, setasDosTelegrafos } from '../../src/cenas/render/mancha';
import { FASE_DO_ATAQUE, TIPO } from '../../src/logica/mundo/tipos';
import { J, estadoCom, por } from '../logica/armas/apoio';
import { DADOS_SEM_OBSTACULOS as D } from '../logica/apoio';

describe('Grito do Coroado no telegrafo (CR3, CR11)', () => {
  const TABELA = criarTabelaDeDesenho(inimigos.inimigos, D.tipos.existe);
  const SEM_ACERTOS = new Float64Array(500).fill(-1e9);
  function coroadoTelegrafando(grito: boolean, timer: number) {
    const e = estadoCom([]);
    const s = por(e, TIPO.oco_grande_coroado, 0, -150);
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = timer;
    e.inimigos.ataqueId[s] = grito ? 1 : 0;
    e.inimigos.miraX[s] = 0;
    e.inimigos.miraY[s] = 1;
    const h = criarSaidaDaHorda();
    prepararHorda(e, 1, J.x, J.y, h);
    prepararQuadrosDaHorda(e, TABELA, SEM_ACERTOS, h);
    return { e, s, h };
  }

  it('o Grito é um disco e um anel vermelhos de 96 pt de raio no centro do Coroado; a Patada segue sendo a cunha branca', () => {
    const { e, s, h } = coroadoTelegrafando(true, 30);
    const out = criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS);
    expect(prepararTelegrafos(e, D, h, 1, out)).toBe(0);
    expect([out.visivel[0], out.visivel[1], out.visivel[2]]).toEqual([1, 1, 0]);
    expect([out.x[0], out.y[0]]).toEqual([h.x[s], h.y[s]]);
    expect([out.moldura[0], out.moldura[1]]).toEqual([indiceDaMoldura('disco'), indiceDaMoldura('anel')]);
    expect([out.cor[0], out.cor[1]]).toEqual([COR.cinzaVermelha, COR.cinzaVermelha]);
    expect(MOLDURA.disco.largura * out.escalaX[0]!).toBeCloseTo(2 * D.combate.gritoRaio[TIPO.oco_grande_coroado]!, 6);
    const patada = coroadoTelegrafando(false, 20);
    const o2 = criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS);
    prepararTelegrafos(patada.e, D, patada.h, 1, o2);
    expect([o2.visivel[0], o2.visivel[1], o2.cor[0]]).toEqual([1, 0, COR.branco]);
  });

  it('o alfa do Grito cresce de 0,10 (no passo T) a 0,40 (no último passo) em 60 passos', () => {
    const tel = D.combate.gritoTelegrafoPassos[TIPO.oco_grande_coroado]!;
    expect(tel).toBe(60);
    const primeiro = coroadoTelegrafando(true, tel);
    const ultimo = coroadoTelegrafando(true, 1);
    const a = criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS);
    const b = criarSaidaDeSprites(MEMBROS_DOS_TELEGRAFOS);
    prepararTelegrafos(primeiro.e, D, primeiro.h, 0, a);
    prepararTelegrafos(ultimo.e, D, ultimo.h, 1, b);
    expect(a.alpha[0]).toBeCloseTo(0.1, 6);
    expect(b.alpha[0]).toBeCloseTo(0.4, 6);
  });

  it('o brilho branco do corpo corre pelos 60 passos do Grito (e não pelos 36 da Patada)', () => {
    const meio = coroadoTelegrafando(true, 30);
    const out = criarSaidaDeSprites(MEMBROS_DOS_MEDIOS);
    prepararMedios(meio.e, meio.h, TABELA, D, 1, out);
    expect(out.blend[0]).toBeCloseTo(1 - 30 / 59, 6);
  });
});

describe('setas dos telegrafos fora da vista (CR11)', () => {
  const telegrafar = (e: ReturnType<typeof estadoCom>, s: number, grito = false): void => {
    e.inimigos.ataqueFase[s] = FASE_DO_ATAQUE.telegrafo;
    e.inimigos.ataqueTimer[s] = 20;
    e.inimigos.ataqueId[s] = grito ? 1 : 0;
  };

  it('o Coroado e a Noviça com telegrafo fora da vista ganham seta; dentro da vista, o Oco Grande e quem não telegrafa, não', () => {
    const e = estadoCom([]);
    const coroado = por(e, TIPO.oco_grande_coroado, 0, -600);
    const novica = por(e, TIPO.novica_de_sal, 500, 0);
    const dentro = por(e, TIPO.novica_de_sal, 50, 50);
    const grande = por(e, TIPO.oco_grande, -500, 0);
    const calado = por(e, TIPO.oco_grande_coroado, 0, 700);
    for (const s of [coroado, novica, dentro, grande]) telegrafar(e, s, s === coroado);
    const out = criarSetasDeTelegrafo();
    expect(setasDosTelegrafos(e, J.x, J.y, out)).toBe(2);
    expect(calado).toBeGreaterThanOrEqual(0);
    const [a, b] = [out[0]!, out[1]!];
    expect([a.vermelha, b.vermelha]).toEqual([true, false]);
    // O ângulo aponta do centro da câmera para o atacante (0 = direita, π/2 = baixo): o Coroado está acima, a Noviça à direita.
    expect(a.angulo).toBeCloseTo(-Math.PI / 2, 6);
    expect(b.angulo).toBeCloseTo(0, 6);
    // O ponto fica no limite da vista menos a margem.
    expect(a.y).toBeCloseTo(J.y - (422 - MARGEM_DA_SETA), 6);
    expect(b.x).toBeCloseTo(J.x + (195 - MARGEM_DA_SETA), 6);
  });

  it('para em MAX_DE_SETAS_DE_TELEGRAFO', () => {
    const e = estadoCom([]);
    for (let k = 0; k < 6; k++) telegrafar(e, por(e, TIPO.novica_de_sal, 400 + 10 * k, 0));
    expect(setasDosTelegrafos(e, J.x, J.y, criarSetasDeTelegrafo())).toBe(MAX_DE_SETAS_DE_TELEGRAFO);
  });
});
