// Serviços compartilhados pelas cenas, criados uma vez no boot e passados
// pelo construtor de cada cena (nada de estado global além de __GAME_DEBUG__).
import type { Acumulador } from '../logica/nucleo/acumulador';
import type { Estado } from '../logica/nucleo/estado';
import type { CamadaDeToque } from '../entrada/camadaDeToque';
import type { Insets } from '../plataforma/safeArea';
import type { RegistroDeTelemetria } from '../plataforma/telemetria';

export type Tela = 'BOOT' | 'ACENDER' | 'VIGILIA';

export interface Simulacao {
  estado: Estado;
  acumulador: Acumulador;
  /** Driver parado pelos ganchos de debug (avancar). */
  pausada: boolean;
}

export interface ContextoDoJogo {
  readonly seed: number;
  readonly ehBuildDeDebug: boolean;
  readonly telemetria: RegistroDeTelemetria;
  readonly sonda: HTMLElement;
  readonly container: HTMLElement;
  /** Ligada no postBoot, quando o canvas existe. */
  camada: CamadaDeToque | null;
  /** Insets da safe-area em pt lógicos, medidos pela cena ativa no create e no resize (na F-001, a de Acender). */
  readonly insets: Insets;
  tela: Tela;
  simulacao: Simulacao | null;
  audioSilencioso: HTMLAudioElement;
  /** Estado do AudioContext devolvido pelo nosso desbloqueio (null antes do toque). */
  desbloqueioDoAudio: string | null;
}
