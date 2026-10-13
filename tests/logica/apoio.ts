// Dados fixos usados pelos testes da simulação: a Charneca com Aldric e os
// inimigos do MVP, como na Vigília real (src/cenas/Vigilia.ts), a mesma região
// sem obstáculos (F-002.5) e um auxiliar que troca partes da região.
import charneca from '../../src/dados/regioes/charneca_das_lanternas.json';
import armas from '../../src/dados/armas.json';
import inimigos from '../../src/dados/inimigos.json';
import vigilantes from '../../src/dados/vigilantes.json';
import { criarComandos, fonteConstante } from '../../src/logica/nucleo/comandos';
import { CENARIO, type ParametrosDaVigilia } from '../../src/logica/nucleo/estado';
import { criarDadosDaVigilia, type DadosDaVigilia, type RegiaoDoJson } from '../../src/logica/mundo/dados';
import { FONTES_DA_PROGRESSAO } from '../../src/plataforma/dadosDaVigilia';

export { FONTES_DA_PROGRESSAO };

const aldric = vigilantes.vigilantes[0]!;

/** Dados da Vigília com a Charneca, Aldric e os inimigos, trocando as partes dadas da região. */
export function dadosDe(regiao: Partial<RegiaoDoJson> = {}): DadosDaVigilia {
  return criarDadosDaVigilia({ ...charneca, ...regiao }, aldric, inimigos.inimigos, armas.armas, FONTES_DA_PROGRESSAO);
}

/**
 * Os mesmos dados com a Brasa Firme desligada (fator 1): os testes das F-003 a F-006 medem o dano bruto, e a
 * stamina inicial de 100 aplicaria o ×0,8 da F-007 (decisoes-F-007 DM7). Os testes do líquido usam os dados reais.
 */
export function semBrasaFirme(d: DadosDaVigilia): DadosDaVigilia {
  return { ...d, combate: { ...d.combate, brasaFirmeFator: 1 } };
}

/**
 * Os mesmos dados sem Almas (valor 0: nenhum drop, nenhum sorteio do fluxo drops): as regressões v4 e v5 comparam com o
 * código das F-004 e F-005, que não soltava Almas (decisoes-F-007 AM1; a Alma é um pickup novo e move o fluxo drops).
 */
export function semAlmas(d: DadosDaVigilia): DadosDaVigilia {
  return { ...d, tipos: { ...d.tipos, almasValor: new Uint16Array(d.tipos.almasValor.length) } };
}

/**
 * Dados com a mira automática da Espada desligada (ADR-0012 §9): o golpe volta a mirar pela direção do jogador, como no
 * código anterior ao pedido do usuário de 2026-10-13. Para as regressões de layout, que comparam bytes gravados antes dele.
 */
export function semMiraAutomatica(d: DadosDaVigilia): DadosDaVigilia {
  return { ...d, armas: { ...d.armas, miraAutomatica: new Uint8Array(d.armas.miraAutomatica.length) } };
}

export const DADOS_DA_CHARNECA = dadosDe();
export const DADOS_SEM_OBSTACULOS = dadosDe({ obstaculos: [] });
export const DADOS_BRUTOS = semBrasaFirme(DADOS_SEM_OBSTACULOS);
/** Fonte que dá intenção nula em todos os passos. */
export const PARADO = fonteConstante(criarComandos());
/** Parâmetros de uma Vigília sem armas: os testes das F-001 a F-003 que medem a horda sem mortes (decisoes-F-004 §5). */
export const SEM_ARMAS: Partial<ParametrosDaVigilia> = { armas: [] };
/** Parâmetros de uma Vigília sem diretor e sem armas (cenário sem_horda): os testes de movimento da F-002. */
export const SEM_HORDA: Partial<ParametrosDaVigilia> = { cenario: CENARIO.diretorDesligado, armas: [] };
/**
 * Os parâmetros da Vigília de produção (decisoes-F-006 ET3, VT1): a Vigília normal com os ataques dos
 * inimigos ligados. `criarEstado(seed, D)` e os helpers antigos seguem sem ataques.
 */
export const PRODUCAO: Partial<ParametrosDaVigilia> = { cenario: CENARIO.ataques };
/** A Vigília normal sem Cinzas (receita vigilia_sem_cinzas; design/decisoes-F-005.md §5, E6). */
export const SEM_CINZAS: Partial<ParametrosDaVigilia> = { cenario: CENARIO.semCinzas };
