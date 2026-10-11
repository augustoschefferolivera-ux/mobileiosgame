// Desbloqueio do áudio no iOS (ADR-0002 §12; doc 12 §2.3). Roda de forma
// síncrona dentro do handler de touchend da Tela de Acender. As dependências
// chegam por injeção: o SoundManager do Phaser e o ambiente do navegador.

/** O que este módulo usa do WebAudioSoundManager do Phaser. */
export interface SomDesbloqueavel {
  context?: { readonly state: string; resume(): Promise<void> } | null;
  locked: boolean;
  /** Campo privado do Phaser: no update seguinte, ele zera `locked` e emite UNLOCKED. */
  unlocked: boolean;
}

export interface AmbienteDeAudio {
  /** `navigator.audioSession` (Safari 17+), quando existir. */
  audioSession?: { type: string } | undefined;
  /** Toca o `<audio>` silencioso em loop: o fallback sem audioSession (doc 12 §2.3). */
  tocarSilencio(): void;
}

/**
 * Pede a sessão de áudio de reprodução e chama `context.resume()` ainda dentro
 * do gesto. Se o contexto ficar `running` e o Phaser continuar `locked`, marca
 * o campo `unlocked`. Devolve o estado final do contexto.
 */
export function desbloquearAudio(som: SomDesbloqueavel, ambiente: AmbienteDeAudio): Promise<string> {
  if (ambiente.audioSession) {
    try {
      ambiente.audioSession.type = 'playback';
    } catch {
      ambiente.tocarSilencio();
    }
  } else {
    ambiente.tocarSilencio();
  }
  const contexto = som.context;
  if (!contexto) return Promise.resolve('ausente');
  return contexto.resume().then(
    () => {
      if (som.locked && contexto.state === 'running') som.unlocked = true;
      return contexto.state;
    },
    () => contexto.state,
  );
}

/** WAV PCM de 8 bits, mono, só com silêncio (valor 128), para o `<audio>` em loop. */
export function wavSilencioso(amostras: number, taxa: number): Uint8Array {
  const bytes = new Uint8Array(44 + amostras);
  const v = new DataView(bytes.buffer);
  const ascii = (pos: number, s: string): void => {
    for (let i = 0; i < s.length; i++) bytes[pos + i] = s.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + amostras, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true); // tamanho do bloco fmt
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa, true); // bytes por segundo
  v.setUint16(32, 1, true); // bytes por quadro
  v.setUint16(34, 8, true); // bits por amostra
  ascii(36, 'data');
  v.setUint32(40, amostras, true);
  bytes.fill(128, 44);
  return bytes;
}

/** Cria o `<audio>` silencioso em loop (sem tocar). */
export function criarAudioSilencioso(doc: Document): HTMLAudioElement {
  const audio = doc.createElement('audio');
  // 1 s de silêncio a 8 kHz (8 KB); o efeito precisa de teste em aparelho (doc 12 §2.3).
  const wav = wavSilencioso(8000, 8000);
  audio.src = URL.createObjectURL(new Blob([wav.buffer as ArrayBuffer], { type: 'audio/wav' }));
  audio.loop = true;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  return audio;
}
