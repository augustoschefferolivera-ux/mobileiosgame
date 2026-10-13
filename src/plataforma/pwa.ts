// PWA (design/decisoes-F-010.md ST2, PW3): reconhece o modo instalado, decide se o convite "Adicionar à Tela de Início"
// aparece e pede o armazenamento persistente. Tudo injetável (navegador e janela como argumento) para o Vitest.
import type { Meta } from '../logica/save/meta';

/** Depois de "Agora não", o convite volta com mais 5 Vigílias concluídas (PW3). */
export const VIGILIAS_ATE_O_CONVITE_VOLTAR = 5;

export interface NavegadorPwa {
  readonly standalone?: boolean;
  readonly storage?: { persist?: () => Promise<boolean> };
}
export interface JanelaPwa {
  matchMedia?: (consulta: string) => { matches: boolean };
}

/** Aberto pelo ícone da Tela de Início: `navigator.standalone` (iOS) ou `display-mode: standalone`. */
export function ehStandalone(nav: NavegadorPwa, janela: JanelaPwa): boolean {
  if (nav.standalone === true) return true;
  try {
    return janela.matchMedia?.('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

/**
 * O convite aparece fora do modo instalado, com pelo menos uma Vigília concluída e sem recusa anterior, ou com a recusa
 * a 5 Vigílias ou mais de distância.
 */
export function convitePendente(meta: Meta, standalone: boolean): boolean {
  if (standalone || meta.vigiliasConcluidas < 1) return false;
  return meta.conviteRecusadoEm === null || meta.vigiliasConcluidas - meta.conviteRecusadoEm >= VIGILIAS_ATE_O_CONVITE_VOLTAR;
}

/**
 * `navigator.storage.persist()` só no modo instalado (ST2): true ou false conforme o navegador respondeu, null sem a API,
 * fora do modo instalado ou se a chamada falhar. Nunca lança e nunca bloqueia nada.
 */
export async function pedirPersistencia(nav: NavegadorPwa, janela: JanelaPwa): Promise<boolean | null> {
  if (!ehStandalone(nav, janela)) return null;
  const persist = nav.storage?.persist;
  if (typeof persist !== 'function') return null;
  try {
    return await persist.call(nav.storage);
  } catch {
    return null;
  }
}

export interface NavegadorComServiceWorker {
  readonly serviceWorker?: { register(url: string, opcoes: { scope: string }): Promise<unknown> };
}
export interface JanelaComCarga {
  readonly document: { readonly readyState: string };
  addEventListener(tipo: 'load', fn: () => void): void;
}

/**
 * Registra o service worker `./sw.js` (escopo `./`) depois do `load` (PW2), nos builds de produção e de debug; no `vite dev`
 * (`emDev`) não. Sem a API ou com falha, o jogo segue sem cache: nunca lança.
 */
export function registrarServiceWorker(nav: NavegadorComServiceWorker, janela: JanelaComCarga, emDev: boolean): void {
  const sw = nav.serviceWorker;
  if (emDev || sw === undefined) return;
  const registrar = (): void => {
    sw.register('./sw.js', { scope: './' }).catch(() => undefined);
  };
  if (janela.document.readyState === 'complete') registrar();
  else janela.addEventListener('load', registrar);
}
