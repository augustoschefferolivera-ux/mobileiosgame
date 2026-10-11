// Painel do ?debug=1 (só no build de debug; ADR-0002 §14; design/decisoes-F-003.md §8, V4):
// um <pre> fora do canvas, sem receber toques, atualizado a cada 500 ms, fora
// do caminho quente. As linhas são "chave valor" de um instantâneo cujas chaves
// são identificadores do __GAME_DEBUG__: nenhum rótulo literal nem texto novo
// no pt-BR.json (é o único texto visível fora de t(), e só no build de debug).

/** Intervalo de atualização do painel. */
const INTERVALO_MS = 500;
const ESPACO = ' ';
const QUEBRA = '\n';

export type Instantaneo = Readonly<Record<string, string | number | boolean | null>>;

/** Uma linha por chave, "chave valor". */
export function serializarInstantaneo(o: Instantaneo): string {
  return Object.entries(o)
    .map(([chave, valor]) => chave + ESPACO + String(valor))
    .join(QUEBRA);
}

export function instalarPainelDeDebug(doc: Document, instantaneo: () => Instantaneo): HTMLElement {
  const pre = doc.createElement('pre');
  pre.className = 'painel-debug';
  doc.body.appendChild(pre);
  const atualizar = (): void => {
    pre.textContent = serializarInstantaneo(instantaneo());
  };
  atualizar();
  setInterval(atualizar, INTERVALO_MS);
  return pre;
}
