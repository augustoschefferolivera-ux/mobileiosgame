// O que o modal mostra (design/decisoes-F-005.md R6, L8 e B4), sem Phaser: os
// ids de texto, os parâmetros e o ícone de cada carta da oferta e de cada
// linha do baú, lidos do estado. A cena Modal só desenha o que sai daqui.
import { IDS_DE_ARMA } from '../logica/armas/tabela';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import { BAU, CATEGORIA_DE_ITEM, TIPO_DE_CARTA, type Estado } from '../logica/nucleo/estado';
import { completaUniao } from '../logica/progressao/oferta';
import { vagaDaArma, vagaDaPassiva } from '../logica/progressao/atributos';
import { IDS_DE_PASSIVA } from '../logica/progressao/tabela';
import type { Parametros } from './textos';

/** Ícones provisórios (src/cenas/render/icones.ts). */
export type IconeDoModal = 'espada' | 'facas' | 'circulo' | 'lamina' | 'elmo' | 'luvas' | 'bolsa';

export interface TextoDoModal {
  readonly id: string;
  readonly params?: Parametros;
  /** Parâmetros que são outro texto: o nome do parâmetro e o id (o nome da União em "Completa: {uniao}"). */
  readonly textosNosParams?: Readonly<Record<string, string>>;
}

export interface ConteudoDaCarta {
  readonly icone: IconeDoModal;
  readonly nome: TextoDoModal;
  /** "Nível N" ou "Novo"; null na Bolsa. */
  readonly etiqueta: TextoDoModal | null;
  readonly funcional: TextoDoModal;
  /** A lore, ou "Completa: …" (L8); null na Bolsa. */
  readonly rodape: TextoDoModal | null;
  readonly completaUniao: boolean;
}

const ICONE_DA_ARMA: readonly IconeDoModal[] = ['espada', 'espada', 'facas', 'circulo', 'lamina'];
const ICONE_DA_PASSIVA: readonly IconeDoModal[] = ['elmo', 'elmo', 'luvas'];

export function iconeDaArma(codigo: number): IconeDoModal {
  return ICONE_DA_ARMA[codigo] ?? 'espada';
}

export function iconeDaPassiva(codigo: number): IconeDoModal {
  return ICONE_DA_PASSIVA[codigo] ?? 'elmo';
}

/** Id do bloco de texto de uma arma: F2 para a União, F1 para as outras (pela flag da tabela, não pelo id). */
export function blocoDaArma(dados: DadosDaVigilia, codigo: number): string {
  return `${dados.armas.uniao[codigo] === 1 ? 'F2' : 'F1'}.${IDS_DE_ARMA[codigo]!.toUpperCase()}`;
}

export function blocoDaPassiva(codigo: number): string {
  return `F3.${IDS_DE_PASSIVA[codigo]!.toUpperCase()}`;
}

/** Conteúdo da carta k da oferta aberta. */
export function conteudoDaCarta(e: Estado, dados: DadosDaVigilia, k: number): ConteudoDaCarta {
  const tipo = e.oferta.tipo[k]!;
  const item = e.oferta.item[k]!;
  if (tipo === TIPO_DE_CARTA.bolsa) {
    return {
      icone: 'bolsa',
      nome: { id: 'A10.LEVELUP.BOLSA_DE_ALMAS_NOME' },
      etiqueta: null,
      funcional: { id: 'A10.LEVELUP.BOLSA_DE_ALMAS_EFEITO' },
      rodape: null,
      completaUniao: false,
    };
  }
  const arma = tipo === TIPO_DE_CARTA.melhoriaDeArma || tipo === TIPO_DE_CARTA.armaNova;
  const nova = tipo === TIPO_DE_CARTA.armaNova || tipo === TIPO_DE_CARTA.passivaNova;
  const atual = nova ? 0 : arma ? e.build.nivel[vagaDaArma(e, item)]! : e.passivas.nivel[vagaDaPassiva(e, item)]!;
  const alvo = atual + 1;
  const bloco = arma ? blocoDaArma(dados, item) : blocoDaPassiva(item);
  const uniao = completaUniao(e, dados, tipo, item);
  return {
    icone: arma ? iconeDaArma(item) : iconeDaPassiva(item),
    nome: { id: `${bloco}.NOME` },
    etiqueta: nova ? { id: 'A10.LEVELUP.NOVO' } : { id: 'A10.LEVELUP.NIVEL', params: { nivel: alvo } },
    funcional: { id: arma ? `${bloco}.NV${alvo}` : `${bloco}.EFEITO` },
    rodape:
      uniao !== 0
        ? { id: 'A10.LEVELUP.COMPLETA_UNIAO', textosNosParams: { uniao: `${blocoDaArma(dados, uniao)}.NOME` } }
        : { id: `${bloco}.LORE` },
    completaUniao: uniao !== 0,
  };
}

export interface LinhaDoBau {
  readonly icone: IconeDoModal;
  readonly nome: TextoDoModal;
  /** "Nível N"; null na Bolsa e na União. */
  readonly nivel: TextoDoModal | null;
}

/** As linhas do baú da frente da fila: a União (uma linha) ou os itens, em ordem. */
export function linhasDoBau(e: Estado, dados: DadosDaVigilia): LinhaDoBau[] {
  const f = e.filaDeBaus;
  const u = f[BAU.uniao]!;
  if (u > 0) {
    const resultado = dados.progressao.uniaoResultado[u - 1]!;
    return [{ icone: iconeDaArma(resultado), nome: { id: 'A10.BAU.UNIAO', textosNosParams: { uniao: `${blocoDaArma(dados, resultado)}.NOME` } }, nivel: null }];
  }
  const linhas: LinhaDoBau[] = [];
  for (let k = 0; k < f[BAU.itens]!; k++) {
    const cat = f[BAU.categoria + k]!;
    const cod = f[BAU.codigo + k]!;
    const niv = f[BAU.nivel + k]!;
    if (cat === CATEGORIA_DE_ITEM.bolsa) linhas.push({ icone: 'bolsa', nome: { id: 'A10.LEVELUP.BOLSA_DE_ALMAS_NOME' }, nivel: null });
    else if (cat === CATEGORIA_DE_ITEM.arma) linhas.push({ icone: iconeDaArma(cod), nome: { id: `${blocoDaArma(dados, cod)}.NOME` }, nivel: { id: 'A10.LEVELUP.NIVEL', params: { nivel: niv } } });
    else linhas.push({ icone: iconeDaPassiva(cod), nome: { id: `${blocoDaPassiva(cod)}.NOME` }, nivel: { id: 'A10.LEVELUP.NIVEL', params: { nivel: niv } } });
  }
  return linhas;
}

/** Resolve os parâmetros que são texto (t é passado de fora para este módulo não depender do JSON). */
export function parametrosDe(x: TextoDoModal, t: (id: string) => string): Parametros | undefined {
  if (!x.textosNosParams) return x.params;
  const p: Record<string, string | number> = { ...x.params };
  for (const [k, id] of Object.entries(x.textosNosParams)) p[k] = t(id);
  return p;
}
