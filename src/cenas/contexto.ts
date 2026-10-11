// Serviços compartilhados pelas cenas, criados uma vez no boot e passados
// pelo construtor de cada cena (nada de estado global além de __GAME_DEBUG__).
import type { Acumulador } from '../logica/nucleo/acumulador';
import type { ComandosDoPasso, FonteDeComandos, Roteiro } from '../logica/nucleo/comandos';
import type { Estado } from '../logica/nucleo/estado';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { CamadaDeToque } from '../entrada/camadaDeToque';
import type { Insets } from '../plataforma/safeArea';
import type { RegistroDeTelemetria } from '../plataforma/telemetria';

export type Tela = 'BOOT' | 'ACENDER' | 'VIGILIA';

export interface Simulacao {
  estado: Estado;
  dados: DadosDaVigilia;
  acumulador: Acumulador;
  /** Comandos ao vivo: o vetor que o tradutor leu no frame. */
  readonly comandosAoVivo: ComandosDoPasso;
  /** De onde vêm os ComandosDoPasso: ao vivo, comandosAoVivo; com entrada.roteiro, o roteiro. */
  fonte: FonteDeComandos;
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
  /** Roteiro imposto por __GAME_DEBUG__.entrada.roteiro (só no build de debug); vale desde o passo 0. */
  roteiro: Roteiro | null;
}
