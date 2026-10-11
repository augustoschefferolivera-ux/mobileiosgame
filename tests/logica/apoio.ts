// Dados fixos usados pelos testes da simulação: a Charneca com Aldric, como na
// Vigília real (src/cenas/Vigilia.ts), e a mesma região sem obstáculos (F-002.5).
import charneca from '../../src/dados/regioes/charneca_das_lanternas.json';
import vigilantes from '../../src/dados/vigilantes.json';
import { criarComandos, fonteConstante } from '../../src/logica/nucleo/comandos';
import { criarDadosDaVigilia } from '../../src/logica/mundo/dados';

const aldric = vigilantes.vigilantes[0]!;
export const DADOS_DA_CHARNECA = criarDadosDaVigilia(charneca, aldric);
export const DADOS_SEM_OBSTACULOS = criarDadosDaVigilia({ ...charneca, obstaculos: [] }, aldric);
/** Fonte que dá intenção nula em todos os passos. */
export const PARADO = fonteConstante(criarComandos());
