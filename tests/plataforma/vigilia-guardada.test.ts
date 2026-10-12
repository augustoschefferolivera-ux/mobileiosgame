// A Vigília guardada (design/decisoes-F-008.md SV2 a SV5; critério F-008.5): ordem das gravações, `andamento` de 60 s,
// FIM atômico com falha injetada, leitura do boot e cota estourada. O armazenamento é simulado e registra cada chamada.
import { describe, expect, it } from 'vitest';
import { ACAO, fonteDoRoteiro } from '../../src/logica/nucleo/comandos';
import { CAB, CAUSA_DO_FIM, CENARIO, ETAPA, FOGUEIRA_F32, FOGUEIRA_U32, FOGUEIRA_U8, PROGRESSAO, criarEstado, type Estado } from '../../src/logica/nucleo/estado';
import { avancar } from '../../src/logica/nucleo/passo';
import { encerrarVigilia, resultadoDaVigilia } from '../../src/logica/mundo/vigilia';
import { sombraDaFogueira } from '../../src/logica/mundo/fogueira';
import { lerMeta, metaPadrao, reservarIdDaVigilia, type Meta } from '../../src/logica/save/meta';
import { hashDosBytes, lerAndamento, lerVigilia } from '../../src/logica/save/vigilia';
import { ArmazenamentoDoMeta, CHAVE_DO_META } from '../../src/plataforma/armazenamento';
import { ArmazenamentoDaVigilia, CHAVE_DA_VIGILIA, CHAVE_DO_ANDAMENTO, GravadorDaVigilia, creditarFim, lerRetomada, type ArmazenamentoRemovivel } from '../../src/plataforma/vigiliaGuardada';
import { DADOS_DA_CHARNECA as D, PARADO } from '../logica/apoio';
import { ELMO, ESPADA, estadoDe } from '../logica/progressao/apoio';
import { J } from '../logica/armas/apoio';

/** localStorage simulado: guarda o texto, registra as chamadas e falha onde mandarem. */
class Falso implements ArmazenamentoRemovivel {
  readonly dados = new Map<string, string>();
  readonly chamadas: string[] = [];
  falhaAoGravar: (chave: string) => boolean = () => false;
  falhaAoRemover = false;
  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null;
  }
  setItem(chave: string, valor: string): void {
    this.chamadas.push(`set ${chave}`);
    if (this.falhaAoGravar(chave)) throw new Error('cota');
    this.dados.set(chave, valor);
  }
  removeItem(chave: string): void {
    this.chamadas.push(`remove ${chave}`);
    if (this.falhaAoRemover) throw new Error('bloqueado');
    this.dados.delete(chave);
  }
}

function novo(): { f: Falso; meta: ArmazenamentoDoMeta; vig: ArmazenamentoDaVigilia } {
  const f = new Falso();
  return { f, meta: new ArmazenamentoDoMeta(f), vig: new ArmazenamentoDaVigilia(f) };
}

/** Uma Vigília na Charneca, jogador invulnerável, com id reservado. */
function vigilia(id: number): Estado {
  const e = criarEstado(1, D, { cenario: CENARIO.diretorDesligado | CENARIO.jogadorInvulneravel });
  e.fogueiraU32[FOGUEIRA_U32.idVigilia] = id;
  return e;
}

describe('acender e o andamento (SV3, SV4)', () => {
  it('reserva o id no meta e grava o meta antes do vigilia do passo 0', () => {
    const { f, meta, vig } = novo();
    const { meta: depois, id } = reservarIdDaVigilia(metaPadrao());
    expect(id).toBe(1);
    expect(depois.proximaIdVigilia).toBe(2);
    meta.gravar(depois);
    const e = vigilia(id);
    const g = new GravadorDaVigilia(vig, e, D.combate.autosavePassos);
    expect(g.gravarInicio(e)).toBe(true);
    expect(f.chamadas).toEqual([`set ${CHAVE_DO_META}`, `set ${CHAVE_DA_VIGILIA}`]);
    const lido = lerVigilia(f.getItem(CHAVE_DA_VIGILIA));
    expect(lido.ok && lido.envelope).toMatchObject({ idVigilia: 1, seq: 1, hora: 0 });
    expect(g.ultimo).toEqual({ seq: 1, hash: hashDosBytes(e.bytes) });
    expect(lerMeta(f.getItem(CHAVE_DO_META)).proximaIdVigilia).toBe(2);
  });

  it('o passo 3.600 grava o andamento, e só ele (sem o buffer)', () => {
    const { f, vig } = novo();
    const e = vigilia(1);
    const g = new GravadorDaVigilia(vig, e, D.combate.autosavePassos);
    g.gravarInicio(e);
    avancar(e, D, PARADO, 3599);
    g.depoisDoFrame(e);
    expect(f.getItem(CHAVE_DO_ANDAMENTO)).toBeNull();
    avancar(e, D, PARADO, 1);
    g.depoisDoFrame(e);
    const a = lerAndamento(f.getItem(CHAVE_DO_ANDAMENTO))!;
    expect(a).toMatchObject({ idVigilia: 1, seqDoVigilia: 1, passo: 3600, relogio: 3600 });
    expect(f.chamadas.filter((c) => c === `set ${CHAVE_DA_VIGILIA}`)).toHaveLength(1);
    avancar(e, D, PARADO, 3600);
    g.depoisDoFrame(e);
    expect(lerAndamento(f.getItem(CHAVE_DO_ANDAMENTO))!.passo).toBe(7200);
  });
});

describe('a Fogueira grava o vigilia (SV3, FG9)', () => {
  const fonte = (acoes: { passo: number; acoes: number }[]) => fonteDoRoteiro([{ passo: 0, mx: 0, my: 0 }], undefined, acoes);

  it('abrir, Descansar e Forjar gravam o estado; Partir grava a sombra (hash do último passo dentro do raio)', () => {
    const { f, vig } = novo();
    const e = estadoDe([[ESPADA, 8]], [[ELMO, 1]], { relogioInicial: 18000, inicioLivre: true, almasIniciais: 400 });
    e.fogueiraU32[FOGUEIRA_U32.idVigilia] = 3;
    e.fogueiraU8[FOGUEIRA_U8.fogueiraAcesa] = 1;
    e.fogueiraU8[FOGUEIRA_U8.fogueiraHora] = 1;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraX] = J.x + 30;
    e.fogueiraF32[FOGUEIRA_F32.fogueiraY] = J.y;
    const g = new GravadorDaVigilia(vig, e, D.combate.autosavePassos);
    const passo = (n: number, acoes: { passo: number; acoes: number }[] = []): void => {
      avancar(e, D, fonte(acoes), n);
      g.depoisDoFrame(e);
    };
    passo(1);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.fogueira);
    expect(g.seq).toBe(1);
    passo(1, [{ passo: e.cab[CAB.passo]!, acoes: ACAO.descansar }]);
    expect(g.seq).toBe(2);
    passo(1, [{ passo: e.cab[CAB.passo]!, acoes: ACAO.forjar }]);
    expect(g.seq).toBe(3);
    const lido = lerVigilia(f.getItem(CHAVE_DA_VIGILIA));
    expect(lido.ok && lido.envelope).toMatchObject({ idVigilia: 3, seq: 3, hora: 1 });
    passo(4);
    expect(g.seq).toBe(3);
    const sombra = new Uint8Array(sombraDaFogueira(e)!);
    passo(1, [{ passo: e.cab[CAB.passo]!, acoes: ACAO.partir }]);
    expect(e.fogueiraU8[FOGUEIRA_U8.etapa]).toBe(ETAPA.hora);
    expect(g.seq).toBe(4);
    expect(g.ultimo).toEqual({ seq: 4, hash: hashDosBytes(sombra) });
    const final = lerVigilia(f.getItem(CHAVE_DA_VIGILIA));
    expect(final.ok && final.envelope.hora).toBe(1);
  });
});

describe('FIM atômico e leitura do boot (SV4, SV5)', () => {
  function encerrada(id: number): { e: Estado; r: ReturnType<typeof resultadoDaVigilia> } {
    const e = vigilia(id);
    e.progresso[PROGRESSAO.almas] = 200;
    encerrarVigilia(e, D, CAUSA_DO_FIM.abandonar);
    return { e, r: resultadoDaVigilia(e, D) };
  }

  it('grava o meta (com ultimaEncerrada) antes de remover o vigilia e o andamento', () => {
    const { f, meta, vig } = novo();
    const e0 = vigilia(1);
    const g = new GravadorDaVigilia(vig, e0, 3600);
    g.gravarInicio(e0);
    g.salvarAndamento(e0);
    f.chamadas.length = 0;
    const { r } = encerrada(1);
    const depois = creditarFim(meta, vig, { ...metaPadrao(), proximaIdVigilia: 2 }, r, 1);
    expect(f.chamadas).toEqual([`set ${CHAVE_DO_META}`, `remove ${CHAVE_DA_VIGILIA}`, `remove ${CHAVE_DO_ANDAMENTO}`]);
    expect([depois.almas, depois.ultimaEncerrada]).toEqual([100, 1]);
    expect(lerMeta(f.getItem(CHAVE_DO_META)).almas).toBe(100);
    expect(f.getItem(CHAVE_DA_VIGILIA)).toBeNull();
  });

  it('falha entre o meta e as remoções: a leitura descarta o vigilia, sem oferta, e as Almas contam uma vez; FIM repetido é no-op', () => {
    const { f, meta, vig } = novo();
    const e0 = vigilia(1);
    new GravadorDaVigilia(vig, e0, 3600).gravarInicio(e0);
    f.falhaAoRemover = true;
    const { r } = encerrada(1);
    const inicial: Meta = { ...metaPadrao(), proximaIdVigilia: 2 };
    const depois = creditarFim(meta, vig, inicial, r, 1);
    expect(f.getItem(CHAVE_DA_VIGILIA)).not.toBeNull();
    // Reabre o app: o meta lido tem ultimaEncerrada = 1.
    const lido = new ArmazenamentoDoMeta(f).ler();
    expect(lido.ultimaEncerrada).toBe(1);
    f.falhaAoRemover = false;
    expect(lerRetomada(new ArmazenamentoDaVigilia(f), lido)).toBeNull();
    expect(f.getItem(CHAVE_DA_VIGILIA)).toBeNull();
    // O mesmo FIM de novo não credita outra vez.
    const repetido = creditarFim(meta, vig, depois, r, 1);
    expect(repetido.almas).toBe(100);
    expect(repetido).toBe(depois);
  });

  it('com um vigilia de id aberto: oferece, com o andamento do mesmo id; o de outro id é removido', () => {
    const { f, vig } = novo();
    const e = vigilia(4);
    const g = new GravadorDaVigilia(vig, e, 3600);
    g.gravarInicio(e);
    avancar(e, D, PARADO, 3600);
    g.depoisDoFrame(e);
    const meta: Meta = { ...metaPadrao(), proximaIdVigilia: 5, ultimaEncerrada: 3 };
    const ofe = lerRetomada(vig, meta)!;
    expect(ofe.envelope.idVigilia).toBe(4);
    expect(ofe.andamento?.passo).toBe(3600);
    f.dados.set(CHAVE_DO_ANDAMENTO, f.dados.get(CHAVE_DO_ANDAMENTO)!.replace('"idVigilia":4', '"idVigilia":9'));
    expect(lerRetomada(vig, meta)?.andamento).toBeNull();
  });

  it('save quebrado é removido, sem oferta', () => {
    const { f, vig } = novo();
    f.dados.set(CHAVE_DA_VIGILIA, '{ruim');
    expect(lerRetomada(vig, metaPadrao())).toBeNull();
    expect(f.getItem(CHAVE_DA_VIGILIA)).toBeNull();
  });

  it('cota estourada: o gravador não lança, "guardou" fica falso e a leitura vem da memória', () => {
    const { f, vig } = novo();
    f.falhaAoGravar = () => true;
    const e = vigilia(1);
    const g = new GravadorDaVigilia(vig, e, 3600);
    expect(() => g.gravarInicio(e)).not.toThrow();
    expect(g.guardou).toBe(false);
    expect(f.getItem(CHAVE_DA_VIGILIA)).toBeNull();
    expect(vig.lerVigilia().ok).toBe(true);
    const sem = new ArmazenamentoDaVigilia(null);
    expect(sem.gravar(CHAVE_DA_VIGILIA, 'x')).toBe(false);
    expect(sem.ler(CHAVE_DA_VIGILIA)).toBe('x');
  });
});

