// Telemetria só local (Q-30): os eventos do doc 10 §6 que existem no MVP
// ficam num registro em memória, exposto em __GAME_DEBUG__.eventos. Nada sai
// pela rede. `anuncio` e `compra` ficam fora (sem monetização no MVP).

/** Campos por evento, na ordem do doc 10 §6, em snake_case (Q-33). */
export const CAMPOS_DOS_EVENTOS = {
  vigilia_inicio: ['personagem', 'mapa', 'ciclo', 'maldicao', 'reliquias', 'arvore_pct'],
  level_up: ['minuto', 'nivel', 'cartas_oferecidas', 'carta_escolhida', 'reroll_usado'],
  arma_uniao: ['minuto', 'arma', 'passiva'],
  esquiva: ['minuto', 'perfeita', 'peso'],
  aparo: ['minuto', 'sucesso', 'alvo'],
  frasco: ['minuto', 'hp_antes'],
  fogueira: ['hora', 'descansou', 'forjou', 'oferenda'],
  dano_recebido: ['fonte', 'minuto', 'hp_restante'],
  chefe: ['nome', 'fase_alcancada', 'duracao', 'quebras_de_postura', 'resultado'],
  apagar: ['minuto', 'nivel', 'almas', 'causa', 'posicao'],
  amanhecer: ['minuto', 'nivel', 'almas', 'causa', 'posicao'],
  cinzas_perdidas: ['recuperou', 'vigilias_ate_recuperar'],
  pesquisa_compra: ['no', 'rank', 'custo', 'almas_restantes', 'vigilias_desde_ultima_compra'],
  sessao: ['duracao', 'vigilias', 'saiu_em_fogueira', 'plataforma', 'aparelho', 'fps_medio', 'memoria_pico'],
  erro_recuperacao: ['aba_morreu', 'retomou_da_fogueira'],
} as const;

export type NomeDoEvento = keyof typeof CAMPOS_DOS_EVENTOS;
type Valor = string | number | boolean | null | readonly (string | number)[];
export type CamposDe<N extends NomeDoEvento> = { [K in (typeof CAMPOS_DOS_EVENTOS)[N][number]]: Valor };

export interface EventoDeTelemetria {
  evento: NomeDoEvento;
  /** Passo da simulação quando o evento ocorreu. */
  passo: number;
  campos: Record<string, Valor>;
}

/** Mesmo tamanho do anel de eventos da simulação (ADR-0002 §4). */
export const CAPACIDADE_DA_TELEMETRIA = 1024;

export class RegistroDeTelemetria {
  private readonly lista: EventoDeTelemetria[] = [];

  registrar<N extends NomeDoEvento>(evento: N, passo: number, campos: CamposDe<N>): void {
    const esperados: readonly string[] = CAMPOS_DOS_EVENTOS[evento];
    const recebidos = Object.keys(campos);
    if (recebidos.length !== esperados.length || recebidos.some((c) => !esperados.includes(c))) {
      throw new Error(`telemetria: campos de ${evento} não batem com o doc 10 §6`);
    }
    if (this.lista.length >= CAPACIDADE_DA_TELEMETRIA) this.lista.shift();
    this.lista.push({ evento, passo, campos: { ...campos } });
  }

  /** Cópia dos eventos registrados, do mais antigo ao mais novo. */
  eventos(): EventoDeTelemetria[] {
    return this.lista.map((e) => ({ evento: e.evento, passo: e.passo, campos: { ...e.campos } }));
  }
}
