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

const aldric = vigilantes.vigilantes[0]!;

/** Dados da Vigília com a Charneca, Aldric e os inimigos, trocando as partes dadas da região. */
export function dadosDe(regiao: Partial<RegiaoDoJson> = {}): DadosDaVigilia {
  return criarDadosDaVigilia({ ...charneca, ...regiao }, aldric, inimigos.inimigos, armas.armas);
}

export const DADOS_DA_CHARNECA = dadosDe();
export const DADOS_SEM_OBSTACULOS = dadosDe({ obstaculos: [] });
/** Fonte que dá intenção nula em todos os passos. */
export const PARADO = fonteConstante(criarComandos());
/** Parâmetros de uma Vigília sem armas: os testes das F-001 a F-003 que medem a horda sem mortes (decisoes-F-004 §5). */
export const SEM_ARMAS: Partial<ParametrosDaVigilia> = { armas: [] };
/** Parâmetros de uma Vigília sem diretor e sem armas (cenário sem_horda): os testes de movimento da F-002. */
export const SEM_HORDA: Partial<ParametrosDaVigilia> = { cenario: CENARIO.diretorDesligado, armas: [] };
