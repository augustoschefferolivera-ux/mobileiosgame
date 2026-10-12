// Botão do Frasco e "segurar" no tradutor (design/decisoes-F-007.md FR6, FR8): o toque novo inicia a cura (bit 4); com a
// cura em curso, só um toque NOVO mantido por 18 passos (300 ms) cancela (bit 8); o dedo que iniciou nunca cancela.
import { beforeEach, describe, expect, it } from 'vitest';
import { alvoDoAparo, alvoDoFrasco, alvosDaVigilia, ALVO_MINIMO_PT, alvoInvadeInsets, type Alvo } from '../../src/entrada/alvos';
import { FilaDeToques, TIPO_DE_TOQUE as T } from '../../src/entrada/filaDeToques';
import { TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import { ACAO, criarComandos } from '../../src/logica/nucleo/comandos';
import { insetsZerados } from '../../src/plataforma/safeArea';

let fila: FilaDeToques;
let trad: TradutorDeGestos;
const cmd = criarComandos();
let naTela: number[];
const BOTAO = { x: 326, y: 688 };
const MS_POR_PASSO = 1000 / 60;

function toque(tipo: (typeof T)[keyof typeof T], id: number, x: number, y: number, t: number): void {
  if (tipo === T.inicio) naTela.push(id);
  else if (tipo !== T.move) naTela = naTela.filter((i) => i !== id);
  fila.empurrar(tipo, id, x, y, t);
  fila.gravarRetrato(naTela.map((identifier) => ({ identifier })));
}
/** Um quadro em `agora`: devolve os bits de ação e zera, como a fonte ao vivo consome a borda. */
function quadro(agora: number): number {
  trad.traduzir(fila, cmd, agora);
  const a = cmd.acoes[0]!;
  cmd.acoes[0] = 0;
  return a;
}

beforeEach(() => {
  fila = new FilaDeToques();
  fila.reiniciar();
  trad = new TradutorDeGestos();
  trad.reiniciar();
  trad.definirArea(insetsZerados());
  naTela = [];
  cmd.acoes[0] = 0;
});

describe('botão do Frasco (FR8)', () => {
  it('72 × 72 pt, 16 pt acima do Aparo, alinhado ao centro dele, dentro da área segura', () => {
    const ins = { topo: 47, baixo: 34, esquerda: 0, direita: 0 };
    const f = alvoDoFrasco(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
    const a = alvoDoAparo(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
    expect([f.largura, f.altura, a.y - (f.y + f.altura), f.x + f.largura / 2]).toEqual([ALVO_MINIMO_PT, ALVO_MINIMO_PT, 16, a.x + a.largura / 2]);
    expect(alvoInvadeInsets(f, ins)).toBe(false);
    const todos: Alvo[] = alvosDaVigilia(ins, []);
    expect(todos.map((x) => x.id)).toContain('frasco');
  });

  it('o toque novo no botão liga o bit 4 no touchstart, uma vez; não cria joystick nem move', () => {
    toque(T.inicio, 1, BOTAO.x, BOTAO.y, 0);
    expect(quadro(1)).toBe(ACAO.frasco);
    expect(quadro(2)).toBe(0);
    expect(trad.joystick.ativo).toBe(false);
    expect(trad.frascoApertos).toBe(1);
  });
});

describe('segurar cancela a cura (FR6)', () => {
  /** O dedo 1 inicia a cura e solta; o dedo 2 toca de novo, com a cura em curso, em t = 100 ms. */
  function comCuraEEUmDedoNovo(): void {
    toque(T.inicio, 1, BOTAO.x, BOTAO.y, 0);
    quadro(1);
    toque(T.fim, 1, BOTAO.x, BOTAO.y, 50);
    quadro(51);
    trad.frascoEmCura = true;
    toque(T.inicio, 2, BOTAO.x, BOTAO.y, 100);
  }

  it('12 passos (200 ms) não cancelam; 18 passos (300 ms) cancelam, uma vez só por toque', () => {
    comCuraEEUmDedoNovo();
    expect(quadro(100)).toBe(0);
    expect(quadro(100 + 12 * MS_POR_PASSO)).toBe(0);
    expect(quadro(100 + 18 * MS_POR_PASSO - 1)).toBe(0);
    expect(quadro(100 + 18 * MS_POR_PASSO)).toBe(ACAO.frascoCancelar);
    expect(quadro(100 + 40 * MS_POR_PASSO)).toBe(0);
  });

  it('toque curto na cura é ignorado (não liga o 4 nem o 8)', () => {
    comCuraEEUmDedoNovo();
    expect(quadro(101)).toBe(0);
    toque(T.fim, 2, BOTAO.x, BOTAO.y, 150);
    expect(quadro(160)).toBe(0);
    expect(quadro(1000)).toBe(0);
  });

  it('o dedo que iniciou a cura nunca cancela, por mais que segure', () => {
    toque(T.inicio, 1, BOTAO.x, BOTAO.y, 0);
    expect(quadro(1)).toBe(ACAO.frasco);
    trad.frascoEmCura = true;
    for (let t = 100; t <= 3000; t += 100) expect(quadro(t)).toBe(0);
  });

  it('sem cura em curso, segurar não liga o 8; um novo toque inicia (bit 4) e depois segurar não o cancela', () => {
    toque(T.inicio, 1, BOTAO.x, BOTAO.y, 0);
    quadro(1);
    for (let t = 100; t <= 600; t += 100) expect(quadro(t) & ACAO.frascoCancelar).toBe(0);
  });

  it('segurar fora do modo vigília (pausa) não cancela', () => {
    comCuraEEUmDedoNovo();
    trad.mudarModo('pausa');
    expect(quadro(100 + 20 * MS_POR_PASSO)).toBe(0);
  });
});
