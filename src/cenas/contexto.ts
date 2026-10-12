// Serviços compartilhados pelas cenas, criados uma vez no boot e passados
// pelo construtor de cada cena (nada de estado global além de __GAME_DEBUG__).
import type { Acumulador } from '../logica/nucleo/acumulador';
import type { CameraLenta } from '../logica/nucleo/cameraLenta';
import type { AcaoDeRoteiro, ComandosDoPasso, FonteDeComandos, Roteiro } from '../logica/nucleo/comandos';
import type { Estado } from '../logica/nucleo/estado';
import type { ResultadoDaVigilia } from '../logica/mundo/vigilia';
import type { Meta } from '../logica/save/meta';
import type { OfertaDeRetomada } from './retomada';
import type { ArmazenamentoDoMeta } from '../plataforma/armazenamento';
import type { ArmazenamentoDaVigilia, GravadorDaVigilia } from '../plataforma/vigiliaGuardada';
import type { DadosDaVigilia } from '../logica/mundo/dados';
import type { CamadaDeToque } from '../entrada/camadaDeToque';
import type { FilaDeToques } from '../entrada/filaDeToques';
import type { OrigemDaPausa, TradutorDeGestos } from '../entrada/tradutorDeGestos';
import type { ParametrosDoCenario } from '../plataforma/cenarios';
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
import type { FeedbackDaInterface } from './feedback';
import type { EfeitosDaVigilia } from './render/efeitos';
import type { EscritorDaHorda } from './render/escritores';

export type Tela = 'BOOT' | 'ACENDER' | 'VIGILIA' | 'RESULTADO';

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
  readonly pausa: { ativa: boolean; origem: OrigemDaPausa | null; alfa: number; abandonarArmado: boolean };
  /**
   * Modal da simulação (level up ou baú; design/decisoes-F-005.md M1 a M5): a
   * carta selecionada é estado da UI, fora da simulação; só a confirmação chama
   * confirmarModal.
   */
  readonly modal: { selecionada: number | null };
  /** Câmera lenta leve do tutorial da esquiva (decisoes-F-006 FB5): fora do estado, do hash e do replay. */
  readonly cameraLenta: CameraLenta;
  /**
   * Fim da Vigília (decisoes-F-007 SV7): `fimCreditado` garante o crédito do meta uma vez; `resultado` é o que o Resultado
   * mostra. Fora do estado, do hash e do replay.
   */
  fimCreditado: boolean;
  resultado: ResultadoDaVigilia | null;
  /** O gravador do `vigilia` e do `andamento` (F-008 SV3); null nos cenários, que não gravam (salvo fogueira_hora1). */
  gravador: GravadorDaVigilia | null;
  /** `idVigilia` desta Vigília (SV4); 0 sem save. */
  idVigilia: number;
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
  /** Seed da Vigília: a do ?seed ou sorteada; Repetir Vigília sorteia outra (decisoes-F-007 RS6). */
  seed: number;
  readonly ehBuildDeDebug: boolean;
  /** ?tutorial=0 (só no build de debug): a Vigília começa com os tutoriais vistos. */
  readonly pularTutoriais: boolean;
  /** ?visto (só no build de debug): bits de TUTORIAL marcados como vistos; null sem o parâmetro. */
  readonly vistos: number | null;
  /** ?inicio=MM:SS (só no build de debug): relógio inicial em passos, com a linha livre; null sem o parâmetro. */
  readonly inicio: number | null;
  /** ?almas=N (só no build de debug): Almas iniciais da Vigília, fora do meta (decisoes-F-007 MC12); null sem o parâmetro. */
  readonly almasIniciais: number | null;
  /** O meta: o armazenamento (localStorage com queda para a memória) e a cópia lida no boot, a que o fim da Vigília atualiza. */
  readonly meta: { readonly armazenamento: ArmazenamentoDoMeta; atual: Meta };
  /** O `vigilia` e o `andamento` guardados (F-008 SV2): o gravador escreve, o Acender lê. */
  readonly vigiliaGuardada: ArmazenamentoDaVigilia;
  /** A Vigília guardada que o Acender ofereceu e o jogador aceitou: a Vigília usa o estado dela e abre na pausa (F-008 SV5); null sem retomada. */
  retomada: OfertaDeRetomada | null;
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
  /** Ações do roteiro, em passos exatos (lista paralela; decisoes-F-006 ET5). */
  acoesDoRoteiro: AcaoDeRoteiro[] | null;
  /** TETO desta sessão (ADR-0002 §13), fixo para cada Vigília; a sonda o decide na Tela de Acender. */
  teto: Teto;
  /** A sonda do TETO em andamento (null sem sonda ou depois dela); o toque em Acender a cancela (decisoes-F-004 §5). */
  sondaDoTeto: SondaPendente | null;
  /** ?cenario (só no build de debug): o id e os parâmetros da Vigília que ele impõe. */
  readonly cenario: { readonly id: string; readonly parametros: ParametrosDoCenario } | null;
  readonly render: RenderDaHorda;
  /** Opções do jogador, em memória, fora da simulação (design/decisoes-F-004.md N8 e F-006 RE11); o meta da F-007 as lê no boot e as grava ao tocar. */
  readonly opcoes: { numerosDeDano: boolean; som: boolean; flashes: boolean };
  /** Flash, sons e pulso da stamina: a interface lida do anel (decisoes-F-006 FB2, FB4 e RE3), fora do estado. */
  readonly feedback: FeedbackDaInterface;
  /** Toca um dos 3 sons sintetizados no boot (índice de SFX); null sem WebAudio (decisoes-F-006 RE12). */
  sfx: { tocar(sfx: number): void } | null;
  /** ?flash=segurar (só no build de debug): o Hud não decrementa o contador do flash (decisoes-F-006 RE3). */
  readonly flashSegurar: boolean;
  /** ?debug=1 (só no build de debug): painel e verificação de NaN. */
  readonly debug: boolean;
  readonly medidor: MedidorDeQuadros;
}
