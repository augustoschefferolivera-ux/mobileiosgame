// Embrulha os 3 sons sintetizados (plataforma/sfx.ts) em AudioBuffer, na taxa do contexto do Phaser, e os toca como
// AudioBufferSourceNode ligados ao `destination` do SoundManager, que é o masterMuteNode: o `setMute` da pausa os
// cala (decisoes-F-006 RE12 e FB4). Nunca `ctx.suspend()` (ADR-0002 §12).
import Phaser from 'phaser';
import { sintetizarOsSfx } from '../plataforma/sfx';

export function criarReprodutorDeSfx(som: Phaser.Sound.BaseSoundManager): { tocar(sfx: number): void } | null {
  if (!(som instanceof Phaser.Sound.WebAudioSoundManager)) return null;
  const contexto = som.context;
  if (!contexto) return null;
  const taxa = contexto.sampleRate;
  const buffers = sintetizarOsSfx(taxa).map((amostras) => {
    const b = contexto.createBuffer(1, amostras.length, taxa);
    b.copyToChannel(amostras as Float32Array<ArrayBuffer>, 0);
    return b;
  });
  return {
    tocar(sfx: number): void {
      // Antes do desbloqueio do iOS o contexto está suspenso: o som ficaria na fila e tocaria de uma vez ao liberar.
      if (contexto.state !== 'running') return;
      const fonte = contexto.createBufferSource();
      fonte.buffer = buffers[sfx]!;
      fonte.connect(som.destination);
      fonte.start();
    },
  };
}
