// Regras de lint do projeto (ADR-0002 §2 e §11; Q-31; Q-32).
// - vdc/glossario: nenhuma palavra proibida em identificadores, strings ou comentários;
// - vdc/textos: todo texto visível sai de t(id); o id casa com a regex da Q-32 e
//   existe em src/dados/textos/pt-BR.json; nada de literal nos pontos que desenham texto.
import { readFileSync } from 'node:fs';
import { proibidasEm } from './glossario.js';

const RE_ID = /^[A-K][0-9]+\.[A-Z0-9_]+\.[A-Z0-9_]+$/;
const IDS = new Set(
  JSON.parse(readFileSync(new URL('../src/dados/textos/pt-BR.json', import.meta.url), 'utf-8')).textos.map(
    (t) => t.id,
  ),
);

/** Literal com forma de id de texto: tem de casar com a Q-32 e existir no pt-BR.json, onde estiver. */
const RE_FORMA_DE_ID = /^[A-K][0-9]+\./;
/** Duas palavras de 2+ letras separadas por espaço, ou letra acentuada: forma de texto para pessoas. */
const RE_PROSA = /\p{L}{2,}[ \u00a0]+\p{L}{2,}|[\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff]/u;
/** Uma palavra com inicial maiúscula ("Pausa", "Fogueira"): a forma dos rótulos em pt-BR. */
const RE_ROTULO = /^\p{Lu}\p{Ll}+$/u;
/** Funções que recebem um id de texto, e a posição do id. */
const FUNCOES_DE_ID = new Map([['t', 0], ['texto', 3]]);
/** Métodos do ScenePlugin que recebem chave de cena (as chaves são PascalCase, como os rótulos). */
const METODOS_DE_CENA = new Set([
  'start', 'launch', 'get', 'sleep', 'wake', 'stop', 'switch', 'pause', 'resume', 'remove', 'restart',
  'bringToTop', 'sendToBack', 'moveAbove', 'moveBelow', 'isActive', 'isSleeping', 'isPaused', 'isVisible',
]);

/** Propriedades e métodos que desenham ou anunciam texto. */
const PROPS_TEXTO = new Set(['textContent', 'innerText', 'innerHTML', 'outerHTML', 'title', 'placeholder', 'ariaLabel', 'alt', 'text']);
const METODOS_TEXTO = new Set(['setText', 'appendText', 'createTextNode', 'insertAdjacentHTML', 'write', 'writeln', 'alert', 'confirm', 'prompt']);
const ATRIBUTOS_TEXTO = new Set(['aria-label', 'title', 'alt', 'placeholder']);
/** Chaves de objeto cujo valor é CSS de fonte, não texto. */
const CHAVES_FONTE = new Set(['font', 'fontFamily']);

function nomeDe(no) {
  if (!no) return undefined;
  if (no.type === 'Identifier') return no.name;
  if (no.type === 'Literal' && typeof no.value === 'string') return no.value;
  return undefined;
}

function propriedade(callee) {
  return callee && callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : undefined;
}

/** Posição do id se `no` é chamada a uma função de id (t, texto), senão -1. */
function posicaoDoId(no) {
  if (!no || no.type !== 'CallExpression' || no.callee.type !== 'Identifier') return -1;
  return FUNCOES_DE_ID.get(no.callee.name) ?? -1;
}

/** O literal é uma chave de cena: { key: 'Boot' } ou this.scene.start('Vigilia'). */
function ehChaveDeCena(no) {
  const p = no.parent;
  if (p.type === 'Property' && p.value === no && nomeDe(p.key) === 'key') return true;
  if (p.type !== 'CallExpression' || !METODOS_DE_CENA.has(propriedade(p.callee))) return false;
  const objeto = p.callee.object;
  return propriedade(objeto) === 'scene' || nomeDe(objeto) === 'scene';
}

/** Variável const do mesmo arquivo com o nome dado, subindo pelos escopos. */
function constanteVisivel(escopo, nome) {
  for (let s = escopo; s; s = s.upper) {
    const v = s.set.get(nome);
    if (!v) continue;
    const def = v.defs[0];
    const ehConst = def && def.type === 'Variable' && def.parent && def.parent.kind === 'const';
    return ehConst && v.defs.length === 1 ? def.node.init : null;
  }
  return null;
}

/**
 * A expressão leva texto literal (não vindo de t()) até a tela? Segue constantes
 * do arquivo, listas, concatenações e argumentos de chamadas como String('...').
 */
function contemTextoLiteral(e, escopo, profundidade = 0) {
  if (!e || profundidade > 8) return false;
  const rec = (x) => contemTextoLiteral(x, escopo, profundidade + 1);
  switch (e.type) {
    case 'Literal':
      return typeof e.value === 'string' && e.value.trim() !== '';
    case 'TemplateLiteral':
      return e.quasis.some((q) => (q.value.cooked ?? '').trim() !== '') || e.expressions.some(rec);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return rec(e.left) || rec(e.right);
    case 'ConditionalExpression':
      return rec(e.consequent) || rec(e.alternate);
    case 'ArrayExpression':
      return e.elements.some(rec);
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return rec(e.expression);
    case 'CallExpression':
      if (posicaoDoId(e) >= 0) return false;
      return e.arguments.some(rec) || (e.callee.type === 'MemberExpression' && rec(e.callee.object));
    case 'Identifier':
      return escopo ? rec(constanteVisivel(escopo, e.name)) : false;
    default:
      return false;
  }
}

/** Contextos em que um literal nunca chega à tela. */
function isento(no) {
  const p = no.parent;
  if (!p) return true;
  if (p.type === 'ImportDeclaration' || p.type === 'ExportAllDeclaration' || p.type === 'ExportNamedDeclaration' || p.type === 'ImportExpression') return true;
  if ((p.type === 'Property' || p.type === 'MethodDefinition' || p.type === 'PropertyDefinition') && p.key === no && !p.computed) return true;
  if (p.type === 'Property' && p.value === no && CHAVES_FONTE.has(nomeDe(p.key))) return true;
  if (p.type === 'TSLiteralType' || p.type === 'TSEnumMember' || p.type === 'TSPropertySignature') return true;
  if (p.type === 'ExpressionStatement' && p.directive) return true;
  if (p.type === 'CallExpression' || p.type === 'NewExpression') {
    if (posicaoDoId(p) >= 0 && p.arguments[posicaoDoId(p)] === no) return true;
    const c = p.callee;
    if (c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'console') return true;
    if (c.type === 'Identifier' && /Error$/.test(c.name)) return true;
  }
  return false;
}

const glossario = {
  meta: {
    type: 'problem',
    docs: { description: 'Palavras proibidas do glossário (Q-31)' },
    messages: { proibida: 'Palavra proibida pelo glossário ({{achadas}}) em "{{texto}}".' },
    schema: [],
  },
  create(context) {
    const vistos = new Set();
    function checar(no, texto, loc) {
      const achadas = proibidasEm(texto);
      if (!achadas.length) return;
      const chave = `${texto}@${loc ? loc.start.line : ''}`;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      context.report({ node: no, loc, messageId: 'proibida', data: { achadas: achadas.join(', '), texto } });
    }
    return {
      Program(no) {
        for (const c of context.sourceCode.getAllComments()) checar(no, c.value, c.loc);
      },
      Identifier(no) {
        checar(no, no.name, no.loc);
      },
      PrivateIdentifier(no) {
        checar(no, no.name, no.loc);
      },
      Literal(no) {
        if (typeof no.value === 'string') checar(no, no.value, no.loc);
      },
      TemplateElement(no) {
        checar(no, no.value.cooked ?? no.value.raw, no.loc);
      },
    };
  },
};

const textos = {
  meta: {
    type: 'problem',
    docs: { description: 'Texto visível só por t(id) com id de pt-BR.json (ADR-0002 §11; Q-32)' },
    messages: {
      semId: 't() precisa de um id como primeiro argumento.',
      idForaDoPadrao: 'O id "{{id}}" não casa com a regex da Q-32 (BLOCO.SUBBLOCO.NÚMERO).',
      idAusente: 'O id "{{id}}" não existe em src/dados/textos/pt-BR.json.',
      literalNaTela: 'Texto literal num ponto que desenha texto: use t(id).',
      prosa: 'String com forma de texto para pessoas ("{{texto}}"): mova para pt-BR.json e use t(id).',
    },
    schema: [],
  },
  create(context) {
    const escopo = (no) => context.sourceCode.getScope(no);
    const literalNaTela = (no, valor) => {
      if (contemTextoLiteral(valor, escopo(no))) context.report({ node: valor, messageId: 'literalNaTela' });
    };
    function conferirId(no, id) {
      if (!RE_ID.test(id)) context.report({ node: no, messageId: 'idForaDoPadrao', data: { id } });
      else if (!IDS.has(id)) context.report({ node: no, messageId: 'idAusente', data: { id } });
    }
    function prosa(no, texto) {
      const forma = RE_PROSA.test(texto) || (RE_ROTULO.test(texto) && !ehChaveDeCena(no));
      if (forma && !isento(no)) context.report({ node: no, messageId: 'prosa', data: { texto } });
    }
    return {
      CallExpression(no) {
        const pos = posicaoDoId(no);
        if (pos >= 0) {
          const a = no.arguments[pos];
          if (!a) return context.report({ node: no, messageId: 'semId' });
          if (a.type === 'Literal' && typeof a.value === 'string' && !RE_FORMA_DE_ID.test(a.value)) conferirId(a, a.value);
          else if (a.type === 'TemplateLiteral') {
            context.report({ node: a, messageId: 'idForaDoPadrao', data: { id: context.sourceCode.getText(a) } });
          }
          return;
        }
        const nome = propriedade(no.callee) ?? (no.callee.type === 'Identifier' ? no.callee.name : undefined);
        if (nome === 'text' && no.callee.type === 'MemberExpression' && ['add', 'make'].includes(propriedade(no.callee.object))) {
          const cfg = no.arguments[0];
          if (no.arguments[2]) literalNaTela(no, no.arguments[2]);
          if (cfg && cfg.type === 'ObjectExpression') {
            for (const p of cfg.properties) if (p.type === 'Property' && nomeDe(p.key) === 'text') literalNaTela(no, p.value);
          }
        } else if (nome && METODOS_TEXTO.has(nome)) {
          for (const a of no.arguments) if (!(nome === 'insertAdjacentHTML' && a === no.arguments[0])) literalNaTela(no, a);
        } else if (nome === 'setAttribute' && ATRIBUTOS_TEXTO.has(nomeDe(no.arguments[0])) && no.arguments[1]) {
          literalNaTela(no, no.arguments[1]);
        }
      },
      NewExpression(no) {
        const c = no.callee;
        const nome = c.type === 'Identifier' ? c.name : propriedade(c);
        if (nome && /Text$/.test(nome) && no.arguments[3]) literalNaTela(no, no.arguments[3]);
      },
      AssignmentExpression(no) {
        const l = no.left;
        if (l.type === 'MemberExpression' && !l.computed && PROPS_TEXTO.has(l.property.name)) literalNaTela(no, no.right);
      },
      Literal(no) {
        if (typeof no.value !== 'string') return;
        if (RE_FORMA_DE_ID.test(no.value)) return conferirId(no, no.value);
        prosa(no, no.value);
      },
      TemplateLiteral(no) {
        prosa(no, no.quasis.map((q) => q.value.cooked ?? '').join(' '));
      },
    };
  },
};

export default {
  meta: { name: 'vdc' },
  rules: { glossario, textos },
};
