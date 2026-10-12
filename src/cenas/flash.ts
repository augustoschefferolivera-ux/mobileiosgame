// Flash branco de tela inteira (decisoes-F-006 FB2 e RE3), sem Phaser: o alfa de cada quadro de render, o limite de
// 3 por segundo e a opção "Flashes". Mora na interface: fora do estado, do hash e do replay.

/** Alfa do flash, quadros de render que ele dura e o máximo por segundo (somando aparo e esquiva perfeita). */
export const FLASH = { alfa: 0.35, quadros: 2, porSegundo: 3, janelaMs: 1000 } as const;

export class ControladorDeFlash {
  /** Quadros de render que faltam (o que `__GAME_DEBUG__.flash` expõe). */
  quadros = 0;
  /** Os instantes (ms de render) dos últimos disparos aceitos, em anel. */
  private readonly marcas = new Float64Array(FLASH.porSegundo).fill(-Infinity);
  private proxima = 0;

  /** Pede um flash em `agoraMs`; recusa o 4º dentro de 1 s. Devolve se foi aceito. */
  pedir(agoraMs: number): boolean {
    // A marca mais antiga é a que o anel vai sobrescrever: se ainda está dentro de 1 s, há 3 recentes.
    if (agoraMs - this.marcas[this.proxima]! < FLASH.janelaMs) return false;
    this.marcas[this.proxima] = agoraMs;
    this.proxima = (this.proxima + 1) % FLASH.porSegundo;
    this.quadros = FLASH.quadros;
    return true;
  }

  /**
   * O alfa deste quadro de render e passa ao seguinte. Desligado dá 0 (o contador anda do mesmo jeito); `segurar`
   * (?flash=segurar, só no build de debug) não decrementa, para o alfa ficar na captura.
   */
  proximoAlfa(ligado: boolean, segurar: boolean): number {
    const a = this.quadros > 0 && ligado ? FLASH.alfa : 0;
    if (this.quadros > 0 && !segurar) this.quadros--;
    return a;
  }

  reiniciar(): void {
    this.quadros = 0;
    this.marcas.fill(-Infinity);
    this.proxima = 0;
  }
}
