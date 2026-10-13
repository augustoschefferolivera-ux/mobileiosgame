// Overlay de paisagem (design/decisoes-F-010.md PS3): o `#gire` do index.html, vazio no HTML, ganha o texto de `t(id)` pelo
// código no boot e aparece por cima de tudo (opaco, no CSS, por `(orientation: landscape)`). Este módulo só preenche o texto
// e avisa as cenas quando o aparelho vira, para a Vigília pausar (PS1). Navegador injetável para o Vitest.

export interface ConsultaDeMidia {
  readonly matches: boolean;
  addEventListener(tipo: 'change', fn: () => void): void;
  removeEventListener(tipo: 'change', fn: () => void): void;
}

export interface JanelaDeOrientacao {
  matchMedia(consulta: string): ConsultaDeMidia;
}

export interface ObservadorDeOrientacao {
  /** O aparelho está em paisagem agora (largura maior que a altura). */
  paisagem(): boolean;
  /** Chama `fn(paisagem)` a cada virada; devolve a função que cancela. */
  aoMudar(fn: (paisagem: boolean) => void): () => void;
}

export const CONSULTA_DE_PAISAGEM = '(orientation: landscape)';

/** Preenche o `#gire` com o texto e devolve o observador. */
export function instalarOverlayDeGiro(elemento: { textContent: string | null }, textoGire: string, janela: JanelaDeOrientacao): ObservadorDeOrientacao {
  elemento.textContent = textoGire;
  const consulta = janela.matchMedia(CONSULTA_DE_PAISAGEM);
  return {
    paisagem: () => consulta.matches,
    aoMudar(fn) {
      const ouvinte = (): void => fn(consulta.matches);
      consulta.addEventListener('change', ouvinte);
      return () => consulta.removeEventListener('change', ouvinte);
    },
  };
}
