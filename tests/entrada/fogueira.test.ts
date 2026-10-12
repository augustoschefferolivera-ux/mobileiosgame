// Menu da Fogueira no tradutor e na cena (design/decisoes-F-008.md FG8): os três botões ligam os bits 32, 64 e 128 no
// touchstart, só com o menu aberto, sem criar joystick; os estados dos botões.
import { beforeEach, describe, expect, it } from 'vitest';
import { alvoDoAparo, alvoDoFrasco, alvoInvadeInsets, alvosDaFogueira, ALVO_MINIMO_PT, type Alvo } from '../../src/entrada/alvos';
import { FilaDeToques, TIPO_DE_TOQUE as T } from '../../src/entrada/filaDeToques';
import { TradutorDeGestos } from '../../src/entrada/tradutorDeGestos';
import { ACAO, criarComandos } from '../../src/logica/nucleo/comandos';
import { botoesDaFogueira } from '../../src/cenas/botoesDaFogueira';
import { insetsZerados } from '../../src/plataforma/safeArea';

let fila: FilaDeToques;
let trad: TradutorDeGestos;
const cmd = criarComandos();
let naTela: number[];
const alvos = alvosDaFogueira(insetsZerados(), []);
const centro = (i: number) => ({ x: alvos[i]!.x + alvos[i]!.largura / 2, y: alvos[i]!.y + alvos[i]!.altura / 2 });

function toque(tipo: (typeof T)[keyof typeof T], id: number, x: number, y: number, t: number): void {
  if (tipo === T.inicio) naTela.push(id);
  else if (tipo !== T.move) naTela = naTela.filter((i) => i !== id);
  fila.empurrar(tipo, id, x, y, t);
  fila.gravarRetrato(naTela.map((identifier) => ({ identifier })));
}
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

describe('alvos do menu da Fogueira', () => {
  it.each([insetsZerados(), { topo: 47, baixo: 34, esquerda: 0, direita: 0 }])('3 botões de 72 pt, dentro da área segura e fora do Aparo e do Frasco (%o)', (ins) => {
    const a = alvosDaFogueira(ins, []);
    expect(a.map((x) => x.id)).toEqual(['descansar', 'forjar', 'partir']);
    const aparo = alvoDoAparo(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
    const frasco = alvoDoFrasco(ins, { id: '', x: 0, y: 0, largura: 0, altura: 0 });
    const cruza = (p: Alvo, q: Alvo): boolean => p.x < q.x + q.largura && q.x < p.x + p.largura && p.y < q.y + q.altura && q.y < p.y + p.altura;
    for (const x of a) {
      expect(x.altura).toBeGreaterThanOrEqual(ALVO_MINIMO_PT);
      expect(alvoInvadeInsets(x, ins)).toBe(false);
      expect(cruza(x, aparo) || cruza(x, frasco)).toBe(false);
    }
    expect(a[0]!.y + a[0]!.altura).toBeLessThan(a[1]!.y);
    expect(a[1]!.y + a[1]!.altura).toBeLessThan(a[2]!.y);
  });
});

describe('toques no menu aberto', () => {
  it.each([
    [0, ACAO.descansar],
    [1, ACAO.forjar],
    [2, ACAO.partir],
  ])('o botão %i liga o bit no touchstart, uma vez, sem joystick', (i, bit) => {
    trad.fogueiraAberta = true;
    const c = centro(i);
    toque(T.inicio, 1, c.x, c.y, 0);
    expect(quadro(1)).toBe(bit);
    expect(quadro(2)).toBe(0);
    expect(trad.joystick.ativo).toBe(false);
  });

  it('com o menu fechado, o mesmo ponto (área do joystick) cria o joystick e não liga bit', () => {
    const c = centro(0);
    toque(T.inicio, 1, c.x, c.y, 0);
    expect(quadro(1)).toBe(0);
    expect(trad.joystick.ativo).toBe(true);
  });

  it('com o menu aberto, um toque fora dos botões ainda cria o joystick (sair do raio é Partir)', () => {
    trad.fogueiraAberta = true;
    toque(T.inicio, 1, 120, 470, 0);
    quadro(1);
    expect(trad.joystick.ativo).toBe(true);
  });
});

describe('estados dos botões (FG4, FG5, FG8)', () => {
  it('Descansar vale uma vez; Partir sempre', () => {
    expect(botoesDaFogueira(0, true, 400, 150)[0]).toEqual({ efeito: 'I1.FOGUEIRA.DESCANSAR_EFEITO', habilitado: true });
    expect(botoesDaFogueira(1, true, 400, 150)[0]).toEqual({ efeito: 'I1.FOGUEIRA.USADA', habilitado: false });
    expect(botoesDaFogueira(3, false, 0, 150)[2]!.habilitado).toBe(true);
  });

  it('Forjar: usada, sem União, sem Almas ou possível, nessa ordem', () => {
    expect(botoesDaFogueira(2, true, 400, 150)[1]).toEqual({ efeito: 'I1.FOGUEIRA.USADA', habilitado: false });
    expect(botoesDaFogueira(0, false, 400, 150)[1]).toEqual({ efeito: 'I1.FOGUEIRA.SEM_UNIAO', habilitado: false });
    expect(botoesDaFogueira(0, true, 149, 150)[1]).toEqual({ efeito: 'I1.FOGUEIRA.SEM_ALMAS', custo: 150, habilitado: false });
    expect(botoesDaFogueira(0, true, 150, 150)[1]).toEqual({ efeito: 'I1.FOGUEIRA.FORJAR_EFEITO', custo: 150, habilitado: true });
  });
});
