// Degradação graciosa (design/decisoes-F-010.md DG1 a DG3): função pura, com o relógio injetado, que decide o nível 0 a 3 a
// partir da CPU média do frame (`performance.now()` de PRE_STEP a POST_RENDER). Média em janela de 2 s: acima de 16 ms sobe um
// nível; abaixo de 10 ms por 10 s seguidos desce um; um nível por vez. Os níveis 1 e 2 só mexem no render; o 3 chega à
// simulação como `ComandosDoPasso.degradacao` (e o replay o grava). Sem Phaser, sem DOM.

export const JANELA_DA_DEGRADACAO_MS = 2000;
export const LIMITE_PARA_SUBIR_MS = 16;
export const LIMITE_PARA_DESCER_MS = 10;
export const TEMPO_PARA_DESCER_MS = 10_000;
export const NIVEL_MAXIMO_DE_DEGRADACAO = 3;

export interface EstadoDaDegradacao {
  nivel: number;
  /** Início da janela corrente (ms do relógio injetado). */
  inicioDaJanela: number;
  somaDaJanela: number;
  quadrosDaJanela: number;
  /** Início da sequência de janelas abaixo de 10 ms; −1 se a sequência não corre. */
  baixoDesde: number;
}

export function criarDegradacao(agoraMs: number): EstadoDaDegradacao {
  return { nivel: 0, inicioDaJanela: agoraMs, somaDaJanela: 0, quadrosDaJanela: 0, baixoDesde: -1 };
}

/** Decide o nível a partir da média de uma janela fechada em `agoraMs`; muda `d.nivel` e `d.baixoDesde` e devolve o nível. */
export function proximoNivel(d: EstadoDaDegradacao, mediaMs: number, agoraMs: number): number {
  if (mediaMs > LIMITE_PARA_SUBIR_MS) {
    d.baixoDesde = -1;
    if (d.nivel < NIVEL_MAXIMO_DE_DEGRADACAO) d.nivel++;
  } else if (mediaMs < LIMITE_PARA_DESCER_MS) {
    if (d.baixoDesde < 0) d.baixoDesde = d.inicioDaJanela;
    if (d.nivel > 0 && agoraMs - d.baixoDesde >= TEMPO_PARA_DESCER_MS) {
      d.nivel--;
      d.baixoDesde = agoraMs;
    }
  } else {
    d.baixoDesde = -1;
  }
  return d.nivel;
}

/** Um quadro: `cpuMs` é o custo do frame; ao fechar a janela de 2 s decide o nível. Devolve o nível vigente. */
export function registrarQuadro(d: EstadoDaDegradacao, cpuMs: number, agoraMs: number): number {
  d.somaDaJanela += cpuMs;
  d.quadrosDaJanela++;
  if (agoraMs - d.inicioDaJanela >= JANELA_DA_DEGRADACAO_MS) {
    proximoNivel(d, d.somaDaJanela / d.quadrosDaJanela, agoraMs);
    d.inicioDaJanela = agoraMs;
    d.somaDaJanela = 0;
    d.quadrosDaJanela = 0;
  }
  return d.nivel;
}

/** O pool de mortes cai a 150 do nível 1 em diante e o anel de partículas pela metade (DG2); o nível 2 apaga luz e gradientes aditivos. */
export const POOL_DE_MORTES_DEGRADADO = 150;
export function luzLigada(nivel: number): boolean {
  return nivel < 2;
}
