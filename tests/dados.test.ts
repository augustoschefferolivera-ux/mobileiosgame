/* eslint-disable vdc/glossario -- este arquivo testa o detector de palavras proibidas com exemplos delas */
// Teste de integridade dos dados (Sessão 1, etapa 3).
// - cada arquivo de src/dados valida no seu JSON Schema;
// - toda referência por id entre arquivos resolve;
// - todo campo *_id aponta para um texto existente em pt-BR.json;
// - nenhuma palavra proibida do glossário em ids, nomes ou textos;
// - os números dos dados batem com o briefing técnico (design/gdd/18 §3).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { A_EVITAR, proibidasEm, tokens } from '../eslint/glossario.js';

type Json = null | boolean | number | string | Json[] | { [chave: string]: Json };
type Objeto = { [chave: string]: Json };

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'dados');
const DIR_SCHEMAS = join(RAIZ, 'schemas');

function ler(relativo: string): Objeto {
  return JSON.parse(readFileSync(join(RAIZ, relativo), 'utf-8')) as Objeto;
}

function lista(o: Objeto, chave: string): Objeto[] {
  const v = o[chave];
  if (!Array.isArray(v)) throw new Error(`campo ${chave} não é lista`);
  return v as Objeto[];
}

function obj(o: Objeto, chave: string): Objeto {
  const v = o[chave];
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error(`campo ${chave} não é objeto`);
  return v as Objeto;
}

function porId(itens: Objeto[], id: string): Objeto {
  const achado = itens.find((i) => i['id'] === id);
  if (!achado) throw new Error(`id ${id} não encontrado`);
  return achado;
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

const ARQUIVOS: { arquivo: string; schema: string }[] = [
  { arquivo: 'armas.json', schema: 'arma.schema.json' },
  { arquivo: 'passivas.json', schema: 'passiva.schema.json' },
  { arquivo: 'unioes.json', schema: 'uniao.schema.json' },
  { arquivo: 'progressao.json', schema: 'progressao.schema.json' },
  { arquivo: 'inimigos.json', schema: 'inimigo.schema.json' },
  { arquivo: 'chefes.json', schema: 'chefe.schema.json' },
  { arquivo: 'arvore.json', schema: 'no-arvore.schema.json' },
  { arquivo: 'vigilantes.json', schema: 'vigilante.schema.json' },
  { arquivo: 'textos/pt-BR.json', schema: 'texto.schema.json' },
  ...readdirSync(join(RAIZ, 'regioes'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ arquivo: `regioes/${f}`, schema: 'regiao.schema.json' })),
  ...readdirSync(join(RAIZ, 'cenarios'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ arquivo: `cenarios/${f}`, schema: 'cenario.schema.json' })),
];

const dados = new Map<string, Objeto>(ARQUIVOS.map(({ arquivo }) => [arquivo, ler(arquivo)]));
const d = (arquivo: string): Objeto => {
  const v = dados.get(arquivo);
  if (!v) throw new Error(`arquivo ${arquivo} não carregado`);
  return v;
};

const armas = lista(d('armas.json'), 'armas');
const passivas = lista(d('passivas.json'), 'passivas');
const unioes = lista(d('unioes.json'), 'unioes');
const inimigos = lista(d('inimigos.json'), 'inimigos');
const chefes = lista(d('chefes.json'), 'chefes');
const arvores = lista(d('arvore.json'), 'arvores');
const vigilantes = lista(d('vigilantes.json'), 'vigilantes');
const textos = lista(d('textos/pt-BR.json'), 'textos');
const regioes = ARQUIVOS.filter((a) => a.arquivo.startsWith('regioes/')).map((a) => d(a.arquivo));

const idsDeTexto = new Set(textos.map((t) => String(t['id'])));

// Percorre um valor JSON e chama `visitar` para cada par (chave, valor) de objeto
// e para cada item primitivo de lista (com a chave da lista).
function percorrer(valor: Json, visitar: (chave: string, v: Json, caminho: string) => void, caminho = '$', chaveDoPai = ''): void {
  if (Array.isArray(valor)) {
    valor.forEach((item, i) => {
      const c = `${caminho}[${i}]`;
      if (item === null || typeof item !== 'object') visitar(chaveDoPai, item, c);
      percorrer(item, visitar, c, chaveDoPai);
    });
  } else if (valor !== null && typeof valor === 'object') {
    for (const [chave, v] of Object.entries(valor)) {
      visitar(chave, v, `${caminho}.${chave}`);
      percorrer(v, visitar, `${caminho}.${chave}`, chave);
    }
  }
}

// ---------------------------------------------------------------------------
// Palavras proibidas (B §3.15; Q-31) e palavras a evitar (doc 17 §5; doc 01 §8)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

describe('schemas', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  for (const f of readdirSync(DIR_SCHEMAS).filter((x) => x.endsWith('.schema.json'))) {
    ajv.addSchema(JSON.parse(readFileSync(join(DIR_SCHEMAS, f), 'utf-8')) as object);
  }

  for (const { arquivo, schema } of ARQUIVOS) {
    it(`${arquivo} valida em ${schema}`, () => {
      const validar = ajv.getSchema(schema);
      expect(validar, `schema ${schema} não carregado`).toBeTruthy();
      const ok = validar!(d(arquivo));
      expect(ok, JSON.stringify(validar!.errors, null, 2)).toBe(true);
    });
  }
});

describe('integridade referencial', () => {
  it('ids de conteúdo são únicos entre todos os arquivos', () => {
    const vistos = new Map<string, string>();
    const repetidos: string[] = [];
    const registrar = (id: Json, origem: string) => {
      const s = String(id);
      if (vistos.has(s)) repetidos.push(`${s} (${vistos.get(s)} e ${origem})`);
      else vistos.set(s, origem);
    };
    armas.forEach((a) => registrar(a['id']!, 'armas'));
    passivas.forEach((p) => registrar(p['id']!, 'passivas'));
    unioes.forEach((u) => registrar(u['id']!, 'unioes'));
    inimigos.forEach((i) => registrar(i['id']!, 'inimigos'));
    chefes.forEach((c) => registrar(c['id']!, 'chefes'));
    vigilantes.forEach((v) => registrar(v['id']!, 'vigilantes'));
    regioes.forEach((r) => registrar(r['id']!, 'regioes'));
    arvores.forEach((a) => {
      registrar(a['id']!, 'arvore');
      lista(a, 'nos').forEach((n) => registrar(n['id']!, `arvore.${String(a['id'])}`));
    });
    expect(repetidos).toEqual([]);
  });

  it('Uniões apontam para arma, passiva e resultado existentes', () => {
    const problemas: string[] = [];
    for (const u of unioes) {
      const arma = armas.find((a) => a['id'] === u['arma']);
      if (!arma) problemas.push(`${String(u['id'])}: arma ${String(u['arma'])}`);
      else if (arma['uniao'] !== false) problemas.push(`${String(u['id'])}: a arma de origem não pode ser União`);
      else if (Number(u['arma_nivel']) !== Number(arma['nivel_max'])) problemas.push(`${String(u['id'])}: arma_nivel ≠ nivel_max da arma`);
      if (!passivas.some((p) => p['id'] === u['passiva'])) problemas.push(`${String(u['id'])}: passiva ${String(u['passiva'])}`);
      const res = armas.find((a) => a['id'] === u['resultado']);
      if (!res || res['uniao'] !== true) problemas.push(`${String(u['id'])}: resultado ${String(u['resultado'])} precisa ser arma com uniao: true`);
    }
    expect(problemas).toEqual([]);
  });

  it('armas derivadas (dano_de) e arma inicial dos Vigilantes existem', () => {
    const problemas: string[] = [];
    for (const a of armas) {
      const base = obj(a, 'base');
      const de = base['dano_de'] as Objeto | undefined;
      if (de && !armas.some((x) => x['id'] === de['arma'])) problemas.push(`${String(a['id'])}: dano_de.arma ${String(de['arma'])}`);
    }
    for (const v of vigilantes) {
      if (!armas.some((a) => a['id'] === v['arma_inicial'] && a['uniao'] === false)) problemas.push(`${String(v['id'])}: arma_inicial ${String(v['arma_inicial'])}`);
    }
    expect(problemas).toEqual([]);
  });

  it('as armas das receitas de cenário existem, com nível ≤ nivel_max, sem repetir e sem União (decisoes-F-004 §5)', () => {
    const problemas: string[] = [];
    for (const { arquivo } of ARQUIVOS.filter((a) => a.arquivo.startsWith('cenarios/'))) {
      const vistas = new Set<unknown>();
      for (const item of lista(d(arquivo), 'armas')) {
        const a = armas.find((x) => x['id'] === item['arma']);
        if (!a) problemas.push(`${arquivo}: arma ${String(item['arma'])} não existe`);
        else if (a['uniao'] !== false) problemas.push(`${arquivo}: ${String(item['arma'])} é União (F-005)`);
        else if (Number(item['nivel']) > Number(a['nivel_max'])) problemas.push(`${arquivo}: ${String(item['arma'])} nv${String(item['nivel'])} > nivel_max`);
        if (vistas.has(item['arma'])) problemas.push(`${arquivo}: ${String(item['arma'])} repetida`);
        vistas.add(item['arma']);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('as passivas, os baús e o relógio das receitas de cenário são válidos (decisoes-F-005 §7)', () => {
    const passivas = lista(d('passivas.json'), 'passivas');
    const problemas: string[] = [];
    for (const { arquivo } of ARQUIVOS.filter((a) => a.arquivo.startsWith('cenarios/'))) {
      const c = d(arquivo);
      const vistas = new Set<unknown>();
      for (const item of lista(c, 'passivas')) {
        const p = passivas.find((x) => x['id'] === item['passiva']);
        if (!p) problemas.push(`${arquivo}: passiva ${String(item['passiva'])} não existe`);
        else if (Number(item['nivel']) > Number(p['nivel_max'])) problemas.push(`${arquivo}: ${String(item['passiva'])} acima do nivel_max`);
        if (vistas.has(item['passiva'])) problemas.push(`${arquivo}: ${String(item['passiva'])} repetida`);
        vistas.add(item['passiva']);
      }
      if (Number(c['relogio_inicial_s']) > 0 && c['linha_fixa'] === null) problemas.push(`${arquivo}: relogio_inicial_s > 0 sem linha_fixa`);
    }
    expect(problemas).toEqual([]);
  });

  it('a soma das chances de quantidade do baú é 100 e as faixas das Cinzas crescem (decisoes-F-005 §7)', () => {
    const p = d('progressao.json');
    const itens = lista(obj(p, 'baus'), 'itens');
    expect(itens.reduce((s, i) => s + Number(i['pct']), 0)).toBe(100);
    const faixas = lista(obj(p, 'cinzas'), 'faixas').map((f) => Number(f['a_partir_de']));
    expect(faixas[0]).toBe(1);
    for (let i = 1; i < faixas.length; i++) expect(faixas[i]!).toBeGreaterThan(faixas[i - 1]!);
  });

  it('a timeline de cada região só cita inimigos e chefes existentes', () => {
    const idsInimigos = new Set(inimigos.map((i) => i['id']));
    const idsChefes = new Set(chefes.map((c) => c['id']));
    const problemas: string[] = [];
    for (const r of regioes) {
      for (const l of lista(r, 'linhas')) {
        const m = `${String(r['id'])} min ${String(l['minuto'])}`;
        for (const e of lista(l, 'roster')) if (!idsInimigos.has(e['inimigo']!)) problemas.push(`${m}: roster ${String(e['inimigo'])}`);
        for (const g of (l['garantidos'] as Objeto[] | undefined) ?? []) if (!idsInimigos.has(g['inimigo']!)) problemas.push(`${m}: garantido ${String(g['inimigo'])}`);
        const marco = l['marco'] as Objeto | undefined;
        if (marco) for (const e of lista(marco, 'inimigos')) if (!idsInimigos.has(e['inimigo']!)) problemas.push(`${m}: marco ${String(e['inimigo'])}`);
        const chefe = l['chefe'] as Objeto | undefined;
        if (chefe && !idsChefes.has(chefe['inimigo']!)) problemas.push(`${m}: chefe ${String(chefe['inimigo'])}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('convocações citam inimigos existentes e chefes citam regiões existentes', () => {
    const idsInimigos = new Set(inimigos.map((i) => i['id']));
    const idsRegioes = new Set(regioes.map((r) => r['id']));
    const problemas: string[] = [];
    const conferirConvoca = (dono: string, c: Json | undefined) => {
      if (c && typeof c === 'object' && !Array.isArray(c) && !idsInimigos.has(c['inimigo']!)) problemas.push(`${dono}: convoca ${String(c['inimigo'])}`);
    };
    inimigos.forEach((i) => conferirConvoca(String(i['id']), i['convoca']));
    for (const c of chefes) {
      if (!idsRegioes.has(c['regiao']!)) problemas.push(`${String(c['id'])}: regiao ${String(c['regiao'])}`);
      lista(c, 'fases').forEach((f) => conferirConvoca(`${String(c['id'])} fase ${String(f['fase'])}`, f['convoca']));
    }
    expect(problemas).toEqual([]);
  });
});

describe('textos', () => {
  it('todo campo *_id dos dados aponta para um texto de pt-BR.json', () => {
    const faltando: string[] = [];
    for (const { arquivo } of ARQUIVOS) {
      if (arquivo.startsWith('textos/')) continue;
      percorrer(d(arquivo), (chave, v, caminho) => {
        if (chave.endsWith('_id') && typeof v === 'string' && !idsDeTexto.has(v)) faltando.push(`${arquivo} ${caminho} → ${v}`);
      });
    }
    expect(faltando).toEqual([]);
  });

  it('ids de texto seguem BLOCO.SUBBLOCO.NÚMERO (Q-32) e não se repetem', () => {
    const formato = /^[A-K][0-9]+\.[A-Z0-9_]+\.[A-Z0-9_]+$/;
    const ids = textos.map((t) => String(t['id']));
    expect(ids.filter((id) => !formato.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('nenhum texto passa do limite de palavras definido', () => {
    const excedentes = textos
      .filter((t) => typeof t['limite_palavras'] === 'number')
      .filter((t) => String(t['texto']).trim().split(/\s+/).length > Number(t['limite_palavras']))
      .map((t) => String(t['id']));
    expect(excedentes).toEqual([]);
  });

  it('nenhum texto tem mais de 60 palavras (doc 17 R1)', () => {
    expect(textos.filter((t) => String(t['texto']).trim().split(/\s+/).length > 60).map((t) => String(t['id']))).toEqual([]);
  });
});

describe('glossário', () => {
  it('nenhuma palavra proibida em ids, nomes, textos, chaves e schemas (B §3.15; Q-31)', () => {
    const achados: string[] = [];
    const conferir = (arquivo: string, json: Json) =>
      percorrer(json, (chave, v, caminho) => {
        const pc = proibidasEm(chave);
        if (pc.length) achados.push(`${arquivo} ${caminho} (chave): "${chave}" → ${pc.join(', ')}`);
        if (typeof v !== 'string') return;
        const p = proibidasEm(v);
        if (p.length) achados.push(`${arquivo} ${caminho}: "${v}" → ${p.join(', ')}`);
      });
    for (const { arquivo } of ARQUIVOS) conferir(arquivo, d(arquivo));
    for (const f of readdirSync(DIR_SCHEMAS).filter((x) => x.endsWith('.schema.json'))) {
      conferir(`schemas/${f}`, JSON.parse(readFileSync(join(DIR_SCHEMAS, f), 'utf-8')) as Json);
    }
    expect(achados).toEqual([]);
  });

  it('o detector acusa as variações (plural, camelCase, hífen, ponto, NG Plus, itens de lista)', () => {
    for (const s of ['upgrades', 'runSalva', 'upgradeArma', 'checkpointSalvo', 'game-over', 'GAME.OVER', 'menu-principal', 'menus principais', 'ng_plus', 'NG Plus', 'NG+', 'check-point', 'fusão', 'Zumbis']) {
      expect(proibidasEm(s).length, s).toBeGreaterThan(0);
    }
    for (const s of ['Voltar ao Santuário', 'trunc', 'gemido', 'corrida', 'Hora III']) expect(proibidasEm(s), s).toEqual([]);
    const achados: string[] = [];
    percorrer({ pendencias: ['o upgrade do nv5'] }, (_c, v) => {
      if (typeof v === 'string') achados.push(...proibidasEm(v));
    });
    expect(achados).toEqual(['upgrade']);
  });

  it('palavras a evitar (doc 17 §5; doc 01 §8) só geram aviso em pt-BR.json (Q-31)', () => {
    const avisos = textos
      .map((t) => ({ id: String(t['id']), achadas: tokens(String(t['texto'])).filter((x) => A_EVITAR.includes(x)) }))
      .filter((a) => a.achadas.length > 0);
    for (const a of avisos) console.warn(`[aviso Q-31] ${a.id}: ${a.achadas.join(', ')}`);
    expect(Array.isArray(avisos)).toBe(true);
  });
});

describe('coerência interna', () => {
  it('telegrafo branco é aparável e vermelho não é (B §3.4)', () => {
    const errados: string[] = [];
    const conferir = (dono: string, ataques: Objeto[]) => {
      for (const a of ataques) {
        const cor = obj(a, 'telegrafo')['cor'];
        if ((cor === 'branco') !== (a['aparavel'] === true)) errados.push(`${dono}.${String(a['id'])}`);
      }
    };
    inimigos.forEach((i) => conferir(String(i['id']), lista(i, 'ataques')));
    chefes.forEach((c) => lista(c, 'fases').forEach((f) => conferir(`${String(c['id'])}.f${String(f['fase'])}`, lista(f, 'ataques'))));
    expect(errados).toEqual([]);
  });

  it('todo null é um campo de `pendentes` (com pendência da mesma feature) ou um "não se aplica" de B', () => {
    // null que não é número em aberto: o dado de B diz que o campo não vale para aquele item.
    const NAO_SE_APLICA = new Set([
      'arma circulo_de_sal base.cooldown_s', // B §3.8: "contínuo"
      'chefe o_lanterneiro fases[1].ataques[0].dano', // B §3.11: dano só por dano_por_s ("queima 6 s, 6/s")
      'chefe o_lanterneiro fases[2].ataques[1].dano', // B §3.11: dano só por agarrar ("acertar = 20% HP")
    ]);
    const problemas: string[] = [];
    const entidades: { nome: string; o: Objeto }[] = [
      ...armas.map((o) => ({ nome: `arma ${String(o['id'])}`, o })),
      ...inimigos.map((o) => ({ nome: `inimigo ${String(o['id'])}`, o })),
      ...chefes.map((o) => ({ nome: `chefe ${String(o['id'])}`, o })),
      ...vigilantes.map((o) => ({ nome: `vigilante ${String(o['id'])}`, o })),
      ...arvores.flatMap((a) => lista(a, 'nos').map((o) => ({ nome: `no ${String(o['id'])}`, o }))),
    ];
    for (const { nome, o } of entidades) {
      const nulos: string[] = [];
      percorrer(o, (_k, v, caminho) => {
        if (v === null) nulos.push(caminho.replace(/^\$\./, ''));
      });
      const pendentes = (o['pendentes'] ?? {}) as Record<string, string>;
      const feats = ((o['pendencias'] ?? []) as string[]).flatMap((p) => p.match(/F-0\d\d/g) ?? []);
      for (const c of nulos) {
        if (NAO_SE_APLICA.has(`${nome} ${c}`)) continue;
        if (!(c in pendentes)) problemas.push(`${nome}: ${c} é null sem entrada em pendentes`);
        else if (!feats.includes(pendentes[c]!)) problemas.push(`${nome}: ${c} → ${pendentes[c]!} sem pendência dessa feature`);
      }
      for (const c of Object.keys(pendentes)) if (!nulos.includes(c)) problemas.push(`${nome}: pendentes.${c} não é null`);
    }
    expect(problemas).toEqual([]);
  });

  it('níveis das armas são contíguos de 1 até nivel_max', () => {
    for (const a of armas) {
      const niveis = lista(a, 'niveis').map((n) => Number(n['nivel']));
      expect(niveis, String(a['id'])).toEqual(Array.from({ length: Number(a['nivel_max']) }, (_, i) => i + 1));
    }
  });

  it('a timeline tem uma linha por minuto, de 0 até a última, e os pesos do roster são positivos', () => {
    for (const r of regioes) {
      const minutos = lista(r, 'linhas').map((l) => Number(l['minuto']));
      expect(minutos).toEqual(Array.from({ length: minutos.length }, (_, i) => i));
    }
  });
});

describe('números do briefing técnico (design/gdd/18 §3)', () => {
  it('inimigos batem com a tabela B §3.6', () => {
    const esperado: Record<string, [number, number, string, number, number]> = {
      // id: [HP, dano, tipo de dano, velocidade, XP]
      oco_das_lanternas: [12, 5, 'contato_por_s', 0.55, 1],
      oco_grande: [100, 20, 'por_ataque', 0.7, 5],
      novica_de_sal: [80, 18, 'por_projetil', 0.8, 5],
      oco_grande_coroado: [600, 25, 'por_ataque', 0.65, 25],
    };
    for (const [id, [hp, dano, tipo, vel, xp]] of Object.entries(esperado)) {
      const i = porId(inimigos, id);
      expect([i['hp_base'], i['dano_base'], i['dano_tipo'], i['velocidade'], i['xp']], id).toEqual([hp, dano, tipo, vel, xp]);
    }
    expect(obj(porId(inimigos, 'oco_das_lanternas'), 'almas')).toEqual({ valor: 1, chance: 0.5 });
    expect(obj(porId(inimigos, 'oco_grande'), 'almas')).toEqual({ valor: 3, chance: 1 });
    expect(obj(porId(inimigos, 'novica_de_sal'), 'almas')).toEqual({ valor: 3, chance: 1 });
    expect(obj(porId(inimigos, 'oco_grande_coroado'), 'almas')).toEqual({ valor: 30, chance: 1 });
    expect(porId(inimigos, 'oco_grande_coroado')['convoca']).toEqual({ inimigo: 'oco_das_lanternas', quantidade: 10, intervalo_s: 10 });
    // dano por ataque = dano_base do inimigo (B §3.6); o Grito do Coroado fica pendente (F-008)
    for (const i of inimigos) {
      for (const a of lista(i, 'ataques')) if (typeof a['dano'] === 'number') expect(a['dano'], `${String(i['id'])}.${String(a['id'])}`).toBe(i['dano_base']);
    }
    expect(porId(lista(porId(inimigos, 'oco_grande_coroado'), 'ataques'), 'grito')['dano']).toBeNull();
    // Coroado = Oco Grande com HP ×6 (Guardião) e ×10 (Chefe Menor) (B §2)
    expect(Number(porId(inimigos, 'oco_grande_coroado')['hp_base'])).toBe(Number(porId(inimigos, 'oco_grande')['hp_base']) * 6);
  });

  it('armas batem com a tabela B §3.8', () => {
    const espada = obj(porId(armas, 'espada_longa_do_juramento'), 'base');
    expect([espada['dano'], espada['cooldown_s'], espada['arco_graus']]).toEqual([10, 1.2, 120]);
    const facas = obj(porId(armas, 'facas_de_sal'), 'base');
    expect([facas['dano'], facas['projeteis'], facas['cooldown_s']]).toEqual([6, 2, 0.9]);
    const circulo = obj(porId(armas, 'circulo_de_sal'), 'base');
    expect([circulo['dano_por_s'], circulo['raio_corpos'], circulo['cooldown_s']]).toEqual([4, 2, null]);
    const lamina = obj(porId(armas, 'lamina_do_juramento_eterno'), 'base');
    expect(lamina['dano_de']).toEqual({ arma: 'espada_longa_do_juramento', nivel: 8, mult: 1.5 });
    expect(lamina['cooldown_s']).toBe(1.0);
    expect(obj(lamina, 'onda')).toMatchObject({ comprimento_corpos: 3, dano: 8 });
    const escalas = (id: string) => lista(porId(armas, id), 'escala').map((e) => `${String(e['atributo'])} ${String(e['grau'])}`);
    expect(escalas('espada_longa_do_juramento')).toEqual(['FOR C', 'DES C']);
    expect(escalas('facas_de_sal')).toEqual(['DES B']);
    expect(escalas('circulo_de_sal')).toEqual(['FE A']);
    expect(escalas('lamina_do_juramento_eterno')).toEqual(['FOR B', 'DES C']);
  });

  it('passivas, União e forja batem com B §2, §3.8 e §3.10', () => {
    expect(obj(porId(passivas, 'elmo_sem_rosto'), 'efeito_por_nivel')).toEqual({ tipo: 'armadura', valor: 4 });
    expect(obj(porId(passivas, 'luvas_de_fole'), 'efeito_por_nivel')).toEqual({ tipo: 'poder_pct', valor: 8 });
    passivas.forEach((p) => expect(p['nivel_max']).toBe(5));
    expect(obj(d('unioes.json'), 'forja_custo_almas_por_hora')).toEqual({ 1: 150, 2: 250, 3: 400 });
  });

  it('Aldric bate com B §3.3', () => {
    const a = porId(vigilantes, 'aldric');
    expect([a['hp'], a['stamina'], a['velocidade']]).toEqual([130, 100, 1.0]);
    expect(obj(a, 'atributos')).toEqual({ FOR: 6, DES: 3, INT: 1, FE: 3, VIG: 7 });
    expect(obj(a, 'vagas')).toEqual({ armas: 5, reliquias: 1, passivas: 6 });
    expect(obj(a, 'frascos')).toMatchObject({ cargas: 3, cura_pct: 40, duracao_s: 2, interrompe_acima_pct_hp: 15 });
    expect(obj(a, 'passiva')).toMatchObject({ hp_max_pct: 15, reducao_dano_pct: 20, condicao_stamina_acima_pct: 50 });
    // B §3.3: 130 com Brasa Firme (+15%) → 150 (149,5 arredondado para cima)
    expect(Math.round(Number(a['hp']) * (1 + Number(obj(a, 'passiva')['hp_max_pct']) / 100))).toBe(150);
  });

  it('O Lanterneiro bate com B §3.11', () => {
    const l = porId(chefes, 'o_lanterneiro');
    expect([l['hp_base'], l['hp_escala_por_nivel'], l['postura_firme_reducao_pct'], l['transicao_fase_s']]).toEqual([6500, 0.04, 40, 1.5]);
    expect(obj(l, 'arena')).toEqual({ raio_corpos: 7 });
    expect(obj(l, 'postura')).toMatchObject({ max: 100, ganho_aparo: 25, ganho_esquiva_perfeita: 10, ganho_acerto_espada: 2, ganho_acerto_pesada: 5, quebra_s: 3, quebra_mult_dano: 2, regen_por_s: 20, regen_duracao_s: 5 });
    expect(lista(l, 'fases').map((f) => f['limiar_hp_pct'])).toEqual([100, 60, 25]);
    expect(obj(l, 'furia')).toEqual({ apos_s: 300, dano_pct: 5, intervalo_s: 10 });
    const telegrafos = lista(l, 'fases').flatMap((f) => lista(f, 'ataques').map((a) => `${String(a['id'])}:${String(obj(a, 'telegrafo')['cor'])}`));
    expect(telegrafos).toEqual([
      'vara_horizontal:branco', 'bater_a_vara:branco', 'luz_cega:vermelho',
      'lanterna_arremessada:vermelho',
      'explosao_de_luz:vermelho', 'agarrar:branco',
    ]);
  });

  it('efeitos por nível das armas batem com B §3.8 (marcos nos níveis 4 e 7, doc 04)', () => {
    const efeitos = (id: string) => lista(porId(armas, id), 'niveis').map((n) => n['efeitos']);
    // As formas dos golpes extras, o bloco aplica do Sal das Facas, a redução do nv4 e o pulso são da F-004 (design/decisoes-F-004.md §10).
    expect(efeitos('espada_longa_do_juramento')).toEqual([[], [{ tipo: 'dano_pct', valor: 20 }], [{ tipo: 'golpes_extra', valor: 1, forma: 'volta' }], [{ tipo: 'dano_pct_vs_postura_quebrada', valor: 50 }], [{ tipo: 'area_pct', valor: 20 }], [{ tipo: 'dano_pct', valor: 20 }], [{ tipo: 'golpes_extra', valor: 1, forma: 'estocada' }], [{ tipo: 'golpes_extra', valor: 1, forma: 'ida' }]]);
    expect(efeitos('facas_de_sal')).toEqual([[], [{ tipo: 'projeteis_extra', valor: 1 }], [{ tipo: 'dano_pct', valor: 20 }], [{ tipo: 'aplica_sal', aplica: { status: 'sal', fator_pct: 50, duracao_s: 3 } }], [{ tipo: 'projeteis_extra', valor: 1 }], [{ tipo: 'velocidade_projetil_pct', valor: 20 }], [{ tipo: 'perfura', valor: 1 }], [{ tipo: 'projeteis_extra', valor: 1 }]]);
    expect(efeitos('circulo_de_sal')).toEqual([[], [{ tipo: 'raio_pct', valor: 15 }], [{ tipo: 'dano_pct', valor: 20 }], [{ tipo: 'sal_reducao_pct', valor: 60 }], [{ tipo: 'raio_pct', valor: 15 }], [{ tipo: 'dano_pct', valor: 20 }], [{ tipo: 'pulso_knockback', intervalo_s: 5, velocidade_corpos_s: 15, duracao_max_s: 0.2 }], [{ tipo: 'raio_pct', valor: 20 }]]);
    for (const id of ['espada_longa_do_juramento', 'facas_de_sal', 'circulo_de_sal']) {
      expect(lista(porId(armas, id), 'niveis').filter((n) => n['marco'] === true).map((n) => n['nivel']), id).toEqual([4, 7]);
    }
  });

  it('comportamento, telegrafo e intervalo dos inimigos batem com B §3.6 e §3.4', () => {
    expect(obj(porId(inimigos, 'oco_das_lanternas'), 'comportamento')).toEqual({ tipo: 'perseguir_reto' });
    const grande = porId(inimigos, 'oco_grande');
    expect(obj(grande, 'comportamento')).toEqual({ tipo: 'aproximar_e_atacar', para_a_corpos: 1.5 });
    expect(lista(grande, 'ataques')[0]).toMatchObject({ telegrafo: { cor: 'branco', duracao_s: 0.6 }, forma: 'arco', angulo_graus: 120, recuperacao_s: 1.5 });
    const novica = porId(inimigos, 'novica_de_sal');
    expect(obj(novica, 'comportamento')).toEqual({ tipo: 'manter_distancia', distancia_corpos: 4 });
    expect(lista(novica, 'ataques')[0]).toMatchObject({ telegrafo: { cor: 'branco', duracao_s: 0.5 }, intervalo_s: 3, projetil: { velocidade_corpos_s: 3 }, aplica: { status: 'sal', fator_pct: 50, duracao_s: 3 } });
    const [patada, grito] = lista(porId(inimigos, 'oco_grande_coroado'), 'ataques');
    expect(patada).toMatchObject({ id: 'patada', telegrafo: { cor: 'branco', duracao_s: 0.6 } });
    expect(grito).toMatchObject({ id: 'grito', telegrafo: { cor: 'vermelho', duracao_s: 1 }, empurrao: { raio_corpos: 3 } });
  });

  it('geometria, duração e efeitos dos ataques do Lanterneiro batem com B §3.11', () => {
    const [f1, f2, f3] = lista(porId(chefes, 'o_lanterneiro'), 'fases');
    const atq = (f: Objeto, id: string) => porId(lista(f, 'ataques'), id);
    expect(atq(f1!, 'vara_horizontal')).toMatchObject({ telegrafo: { duracao_s: 0.7 }, angulo_graus: 180 });
    expect(atq(f1!, 'bater_a_vara')).toMatchObject({ telegrafo: { duracao_s: 0.6 }, forma: 'linha', alcance_corpos: 6 });
    expect(atq(f1!, 'luz_cega')).toMatchObject({ telegrafo: { duracao_s: 1 }, forma: 'cone', angulo_graus: 60, alcance_corpos: 6, efeito_tela: 'inverte_cores', duracao_efeito_s: 2, dano_por_s: 8 });
    expect(f2!['escurecer_arena_pct']).toBe(40);
    expect(atq(f2!, 'lanterna_arremessada')).toMatchObject({ forma: 'area_circular', raio_corpos: 2, duracao_efeito_s: 6, dano_por_s: 6 });
    expect(obj(f2!, 'convoca')).toMatchObject({ inimigo: 'oco_das_lanternas', quantidade: 10, ilumina_raio_corpos: 3 });
    expect(atq(f3!, 'explosao_de_luz')).toMatchObject({ forma: 'anel_expansivo', raio_inicial_corpos: 1, raio_final_corpos: 6, expansao_s: 1, intervalo_s: 12 });
    expect(atq(f3!, 'agarrar')).toMatchObject({ telegrafo: { duracao_s: 0.8 }, raio_corpos: 2, agarrar: { dano_hp_pct: 20, preso_s: 1, aparo_quebra_imediata: true } });
  });

  it('a timeline da Charneca bate com B §3.7 e o brief §5.4', () => {
    const r = regioes.find((x) => x['id'] === 'charneca_das_lanternas');
    expect(r).toBeTruthy();
    const linhas = lista(r!, 'linhas');
    const minimos = linhas.map((l) => l['min_na_tela']);
    const intervalos = linhas.map((l) => l['intervalo_s']);
    expect(minimos).toEqual([15, 25, 35, 45, 55, 40, 70, 80, 90, 100, 60, 120, 140, 160, 180, 80, 200, 230, 260, 300, 300, 300, 300]);
    expect(intervalos).toEqual([2.0, 1.6, 1.4, 1.2, 1.0, null, 0.9, 0.8, 0.8, 0.7, null, 0.6, 0.6, 0.5, 0.5, null, 0.45, 0.4, 0.4, 0.35, 0.3, 0.3, 0.3]);
    const pesos = (m: number) => Object.fromEntries(lista(linhas[m]!, 'roster').map((e) => [e['inimigo'], e['peso']]));
    expect(pesos(0)).toEqual({ oco_das_lanternas: 10 });
    expect(pesos(1)).toEqual({ oco_das_lanternas: 10, oco_grande: 1 });
    expect(pesos(3)).toEqual({ oco_das_lanternas: 10, oco_grande: 1, novica_de_sal: 2 });
    for (const m of [6, 7, 8, 9]) expect(pesos(m), `min ${m}`).toEqual({ oco_das_lanternas: 8, oco_grande: 3, novica_de_sal: 3 });
    for (const m of [11, 12, 13, 14]) expect(pesos(m), `min ${m}`).toEqual({ oco_das_lanternas: 6, oco_grande: 4, novica_de_sal: 4 });
    for (const m of [16, 17, 18, 19]) expect(pesos(m), `min ${m}`).toEqual({ oco_das_lanternas: 6, oco_grande: 5, novica_de_sal: 4 });
    for (const m of [20, 21, 22]) expect(pesos(m), `min ${m}`).toEqual({ oco_das_lanternas: 10 });
    const marcos = linhas.filter((l) => l['marco']).map((l) => {
      const mc = obj(l, 'marco');
      return [l['minuto'], mc['tipo'], lista(mc, 'inimigos').map((e) => `${String(e['quantidade'])}×${String(e['hp_base'])}`).join('+'), mc['bau']];
    });
    expect(marcos).toEqual([
      [5, 'guardiao', '1×600', 'comum'],
      [10, 'chefe_menor', '1×1000', 'dourado'],
      [15, 'guardiao', '2×600', 'comum'],
    ]);
    expect(obj(linhas[20]!, 'chefe')).toEqual({ inimigo: 'o_lanterneiro', hp_base: 6500 });
    expect(lista(linhas[1]!, 'garantidos')).toEqual([{ inimigo: 'oco_grande', quantidade: 1, tutorial: 'esquiva' }]);
    expect(lista(linhas[3]!, 'garantidos')).toEqual([{ inimigo: 'novica_de_sal', quantidade: 1, tutorial: 'aparo' }]);
    expect([16, 17, 18, 19].map((m) => linhas[m]!['escurecer_pct'])).toEqual([10, 10, 10, 10]);
    expect([r!['sem_spawn_antes_do_marco_s'], r!['a_fome_em_s']]).toEqual([30, 23 * 60]);
  });

  it('a árvore de Fundação bate com B §3.12 e o doc 08 §4.1', () => {
    const f = porId(arvores, 'fundacao');
    expect(obj(f, 'custo')).toEqual({ multiplicador_por_rank: 1.12, fator_global: 0.015, arredondamento: 'inteiro_mais_proximo' });
    const nos = lista(f, 'nos');
    expect(nos).toHaveLength(8);
    nos.forEach((n) => expect([n['tipo'], n['custo_base']], String(n['id'])).toEqual(['estatistica', 300]));
    expect(Object.fromEntries(nos.map((n) => [n['id'], n['ranks']]))).toEqual({
      o_peso_do_martelo_do_seu_pai: 5, pele_que_esqueceu_de_sangrar: 5, folego_de_forja: 5,
      pes_plantados: 3, casco: 3, bigorna_no_peito: 3, ferro_frio: 3, maos_de_aprendiz: 3,
    });
    expect(nos.filter((n) => n['no_mvp'] === 'bloqueado').map((n) => n['id']).sort()).toEqual(['ferro_frio', 'o_peso_do_martelo_do_seu_pai', 'pes_plantados']);
  });
});

describe('feature_list.json', () => {
  const lista_ = JSON.parse(readFileSync(join(RAIZ, '..', '..', 'feature_list.json'), 'utf-8')) as Objeto;
  const briefing = readFileSync(join(RAIZ, '..', '..', 'design', 'gdd', '18-briefing-tecnico.md'), 'utf-8');
  const features = lista(lista_, 'features');

  it('tem exatamente F-001 a F-010, em ordem', () => {
    expect(features.map((f) => f['id'])).toEqual(Array.from({ length: 10 }, (_, i) => `F-${String(i + 1).padStart(3, '0')}`));
  });

  it('nome, escopo, critério e evidência são cópia literal da tabela de B §4', () => {
    for (const f of features) {
      const linha = `| **${String(f['id'])}** | **${String(f['nome'])}** — ${String(f['escopo_b'])} | ${String(f['criterio_b'])} | ${String(f['evidencia_b'])} |`;
      expect(briefing.includes(linha), String(f['id'])).toBe(true);
    }
  });

  it('cada critério tem verificação de um tipo conhecido e cada feature tem evidência em production/evidencias/F-xxx/', () => {
    const tipos = new Set(['vitest', 'playwright', '__GAME_DEBUG__', 'lint', 'iphone_real']);
    for (const f of features) {
      for (const c of lista(f, 'criterios')) expect(tipos.has(String(c['verificacao'])), String(c['id'])).toBe(true);
      const evid = lista(f, 'evidencias');
      expect(evid.length, String(f['id'])).toBeGreaterThan(0);
      for (const e of evid) expect(String(e['arquivo']).startsWith(`production/evidencias/${String(f['id'])}/`), String(e['arquivo'])).toBe(true);
    }
  });

  it('cada feature tem critérios completos (ao menos um de B §4) e uma evidência por item de evidencia_b', () => {
    for (const f of features) {
      const id = String(f['id']);
      const criterios = lista(f, 'criterios');
      expect(criterios.length, id).toBeGreaterThan(0);
      expect(criterios.some((c) => String(c['origem']).startsWith('B §4')), `${id} sem critério de B §4`).toBe(true);
      const ids = criterios.map((c) => String(c['id']));
      expect(ids.filter((x) => !x.startsWith(`${id}.`)), id).toEqual([]);
      expect(new Set(ids).size, id).toBe(ids.length);
      for (const c of criterios) {
        expect(typeof c['descricao'] === 'string' && c['descricao'].trim() !== '', `${String(c['id'])}.descricao`).toBe(true);
        expect(typeof c['como'] === 'string' && c['como'].trim() !== '', `${String(c['id'])}.como`).toBe(true);
      }
      expect(lista(f, 'evidencias').length, id).toBeGreaterThanOrEqual(String(f['evidencia_b']).split(';').length);
    }
  });

  it('não usa palavras proibidas fora das citações literais de B', () => {
    // escopo_b, criterio_b e evidencia_b citam B ao pé da letra; o próprio B usa "upgrades" (F-005, §3.9).
    const CITACOES = new Set(['escopo_b', 'criterio_b', 'evidencia_b']);
    const achados: string[] = [];
    percorrer(lista_, (chave, v, caminho) => {
      if (proibidasEm(chave).length) achados.push(`${caminho} (chave): ${chave}`);
      if (typeof v === 'string' && !CITACOES.has(chave) && proibidasEm(v).length) achados.push(`${caminho}: ${v}`);
    });
    expect(achados).toEqual([]);
  });
});
