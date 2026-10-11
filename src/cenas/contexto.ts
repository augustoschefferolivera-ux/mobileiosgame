// Serviços compartilhados pelas cenas, criados uma vez no boot e passados
// pelo construtor de cada cena (nada de estado global além de __GAME_DEBUG__).
import type { Acumulador } from '../logica/nucleo/acumulador';
import type { ComandosDoPasso, FonteDeComandos, Roteiro } from '../logica/nucleo/comandos';
import type { Estado } from '../logica/nucleo/estado';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { CamadaDeToque } from '../entrada/camadaDeToque';
import type { FilaDeToques } from '../entrada/filaDeToques';
import type { OrigemDaPausa, TradutorDeGestos } from '../entrada/tradutorDeGestos';
import type { ParametrosDaVigilia } from '../logica/nucleo/estado';
import type { ModoDeRender } from '../plataforma/parametros';
import type { Insets } from '../plataforma/safeArea';
import type { RegistroDeTelemetria } from '../plataforma/telemetria';
import type { IdentidadeDoCache, SondaDoTeto } from '../plataforma/sonda';
import type { EntradasDoTeto, Teto } from '../plataforma/teto';

/** A sonda e o que falta para decidir o TETO e gravar o cache quando ela terminar. */
export interface SondaPendente {
  readonly sonda: SondaDoTeto;
  readonly entradas: EntradasDoTeto;
  readonly identidade: IdentidadeDoCache;
}
import type { MedidorDeQuadros } from './medidas';
import type { EfeitosDaVigilia } from './render/efeitos';
import type { EscritorDaHorda } from './render/escritores';

export type Tela = 'BOOT' | 'ACENDER' | 'VIGILIA';

export interface Simulacao {
  estado: Estado;
  dados: DadosDaVigilia;
  acumulador: Acumulador;
  /** Comandos ao vivo: o vetor que o tradutor leu no frame. */
  readonly comandosAoVivo: ComandosDoPasso;
  /** De onde vêm os ComandosDoPasso: ao vivo, comandosAoVivo; com entrada.roteiro, o roteiro. */
  fonte: FonteDeComandos;
  /** Centro da câmera do mundo no último frame, em px lógicos do toro. */
  readonly camera: { x: number; y: number };
  /** Driver parado pelos ganchos de debug (avancar); pausada, o render desenha o estado atual (alfa = 1). */
  pausada: boolean;
  /**
   * Pausa do jogador (botão ou gesto; design/decisoes-F-004.md P4): fora do
   * estado, do hash, do replay e dos ComandosDoPasso; o driver não roda passo
   * e o render congela o alfa enquanto ela está ativa.
   */
  readonly pausa: { ativa: boolean; origem: OrigemDaPausa | null; alfa: number };
  /** O escritor da horda desta Vigília, para o debug. */
  horda: EscritorDaHorda | null;
  /** Consumidor do anel de eventos e pools do render (números, mortes, efeitos), para o debug. */
  efeitos: EfeitosDaVigilia | null;
}

/** Modo do render da horda (design/decisoes-F-003.md §7). */
export interface RenderDaHorda {
  modo: ModoDeRender;
  /** 'parametro' (o padrão gpu ou ?render) ou 'fallback' (o SpriteGPULayer não roda neste aparelho). */
  origem: 'parametro' | 'fallback';
  bufferDinamico: boolean;
  /** O aquecimento da Acender já compilou o programa do SpriteGPULayer. */
  aquecido: boolean;
}

export interface ContextoDoJogo {
  readonly seed: number;
  readonly ehBuildDeDebug: boolean;
  /** ?tutorial=0 (só no build de debug): a Vigília começa com os tutoriais vistos. */
  readonly pularTutoriais: boolean;
  readonly telemetria: RegistroDeTelemetria;
  readonly sonda: HTMLElement;
  readonly container: HTMLElement;
  /** Ligada no postBoot, quando o canvas existe. */
  camada: CamadaDeToque | null;
  /** Fila de toques (a camada escreve) e tradutor de gestos (a Vigília lê uma vez por frame). */
  readonly entrada: { readonly fila: FilaDeToques; readonly tradutor: TradutorDeGestos };
  /** Insets da safe-area em pt lógicos, medidos no create e no resize pela Tela de Acender e, na Vigília, pela Hud. */
  readonly insets: Insets;
  tela: Tela;
  simulacao: Simulacao | null;
  audioSilencioso: HTMLAudioElement;
  /** Estado do AudioContext devolvido pelo nosso desbloqueio (null antes do toque). */
  desbloqueioDoAudio: string | null;
  /** Roteiro imposto por __GAME_DEBUG__.entrada.roteiro (só no build de debug); vale desde o passo 0. */
  roteiro: Roteiro | null;
  /** TETO desta sessão (ADR-0002 §13), fixo para cada Vigília; a sonda o decide na Tela de Acender. */
  teto: Teto;
  /** A sonda do TETO em andamento (null sem sonda ou depois dela); o toque em Acender a cancela (decisoes-F-004 §5). */
  sondaDoTeto: SondaPendente | null;
  /** ?cenario (só no build de debug): o id e os parâmetros da Vigília que ele impõe. */
  readonly cenario: { readonly id: string; readonly parametros: Omit<ParametrosDaVigilia, 'teto'> } | null;
  readonly render: RenderDaHorda;
  /** Opções do jogador, em memória, fora da simulação (design/decisoes-F-004.md N8); o meta da F-007 as grava. */
  readonly opcoes: { numerosDeDano: boolean };
  /** ?debug=1 (só no build de debug): painel e verificação de NaN. */
  readonly debug: boolean;
  readonly medidor: MedidorDeQuadros;
}
