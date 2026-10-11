// Bloqueio de pull-to-refresh, zoom e callout (B §3.5 e §3.14; ADR-0002 §12).
// O CSS (touch-action: none, overscroll-behavior: none) está em index.html;
// aqui ficam os listeners não passivos com preventDefault.

const NAO_PASSIVO: AddEventListenerOptions = { passive: false };

function impedir(e: Event): void {
  if (e.cancelable) e.preventDefault();
}

/** Registra os bloqueios no document. Devolve a função que os remove. */
export function bloquearGestos(doc: Document): () => void {
  const tipos = ['touchmove', 'gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dblclick'];
  for (const tipo of tipos) doc.addEventListener(tipo, impedir, NAO_PASSIVO);
  return () => {
    for (const tipo of tipos) doc.removeEventListener(tipo, impedir, NAO_PASSIVO);
  };
}
