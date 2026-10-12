// Função única de texto visível (ADR-0002 §11): todo texto da tela sai de
// t(id, params?), que lê src/dados/textos/pt-BR.json. Um id ausente é erro.
import tabela from '../dados/textos/pt-BR.json';

const TEXTOS = new Map<string, string>(tabela.textos.map((x) => [x.id, x.texto]));

export type Parametros = Readonly<Record<string, string | number>>;

/** Texto do id, com `{nome}` trocado por `params.nome`. */
export function t(id: string, params?: Parametros): string {
  const texto = TEXTOS.get(id);
  if (texto === undefined) throw new Error(`t(): id ausente em pt-BR.json: ${id}`);
  return texto.replace(/\{([a-z_]+)\}/g, (_, nome: string) => {
    const v = params?.[nome];
    if (v === undefined) throw new Error(`t(): parâmetro {${nome}} ausente para ${id}`);
    return String(v);
  });
}
