// Dados fixos da Vigília do MVP (a Charneca com Aldric), montados a partir dos
// JSON de src/dados: um só lugar para o boot (sonda e Vigília) e os testes.
import armas from '../dados/armas.json';
import inimigos from '../dados/inimigos.json';
import passivas from '../dados/passivas.json';
import progressao from '../dados/progressao.json';
import unioes from '../dados/unioes.json';
import vigilantes from '../dados/vigilantes.json';
import charneca from '../dados/regioes/charneca_das_lanternas.json';
import { criarDadosDaVigilia, type DadosDaVigilia, type RegiaoDoJson } from '../logica/mundo/dados';
import type { FontesDaProgressao } from '../logica/progressao/tabela';

/** progressao.json, passivas.json e unioes.json (design/decisoes-F-005.md §7). */
export const FONTES_DA_PROGRESSAO: FontesDaProgressao = { progressao, passivas: passivas.passivas, unioes: unioes.unioes, forjaCustoPorHora: unioes.forja_custo_almas_por_hora };

/** Os dados da Charneca com Aldric, trocando as partes dadas da região. */
export function criarDadosDaCharneca(regiao: Partial<RegiaoDoJson> = {}): DadosDaVigilia {
  return criarDadosDaVigilia({ ...charneca, ...regiao }, vigilantes.vigilantes[0]!, inimigos.inimigos, armas.armas, FONTES_DA_PROGRESSAO);
}
