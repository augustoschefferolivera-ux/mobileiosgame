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

/** Duas palavras de 2+ letras separadas por espaço, ou letra acentuada: forma de texto para pessoas. */
const RE_PROSA = /\p{L}{2,}[ \u00a0]+\p{L}{2,}|[\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff]/u;

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

function ehChamadaDeT(no) {
  return no && no.type === 'CallExpression' && no.callee.type === 'Identifier' && no.callee.name === 't';
}

/** A expressão contém texto literal (não vindo de t())? */
function contemTextoLiteral(e) {
  if (!e) return false;
  switch (e.type) {
    case 'Literal':
      return typeof e.value === 'string' && e.value.trim() !== '';
    case 'TemplateLiteral':
      return e.quasis.some((q) => (q.value.cooked ?? '').trim() !== '') || e.expressions.some(contemTextoLiteral);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return contemTextoLiteral(e.left) || contemTextoLiteral(e.right);
    case 'ConditionalExpression':
      return contemTextoLiteral(e.consequent) || contemTextoLiteral(e.alternate);
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
    if (ehChamadaDeT(p)) return true;
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
    function prosa(no, texto) {
      if (RE_PROSA.test(texto) && !isento(no)) context.report({ node: no, messageId: 'prosa', data: { texto } });
    }
    return {
      CallExpression(no) {
        if (ehChamadaDeT(no)) {
          const a = no.arguments[0];
          if (!a) return context.report({ node: no, messageId: 'semId' });
          if (a.type === 'Literal' && typeof a.value === 'string') {
            if (!RE_ID.test(a.value)) context.report({ node: a, messageId: 'idForaDoPadrao', data: { id: a.value } });
            else if (!IDS.has(a.value)) context.report({ node: a, messageId: 'idAusente', data: { id: a.value } });
          } else if (a.type === 'TemplateLiteral') {
            context.report({ node: a, messageId: 'idForaDoPadrao', data: { id: context.sourceCode.getText(a) } });
          }
          return;
        }
        const nome = propriedade(no.callee) ?? (no.callee.type === 'Identifier' ? no.callee.name : undefined);
        if (nome === 'text' && no.callee.type === 'MemberExpression' && ['add', 'make'].includes(propriedade(no.callee.object))) {
          const texto = no.arguments[2];
          const cfg = no.arguments[0];
          if (contemTextoLiteral(texto)) context.report({ node: texto, messageId: 'literalNaTela' });
          if (cfg && cfg.type === 'ObjectExpression') {
            for (const p of cfg.properties) {
              if (p.type === 'Property' && nomeDe(p.key) === 'text' && contemTextoLiteral(p.value)) {
                context.report({ node: p.value, messageId: 'literalNaTela' });
              }
            }
          }
        } else if (nome && METODOS_TEXTO.has(nome)) {
          for (const a of no.arguments) if (contemTextoLiteral(a) && !(nome === 'insertAdjacentHTML' && a === no.arguments[0])) {
            context.report({ node: a, messageId: 'literalNaTela' });
          }
        } else if (nome === 'setAttribute' && ATRIBUTOS_TEXTO.has(nomeDe(no.arguments[0])) && contemTextoLiteral(no.arguments[1])) {
          context.report({ node: no.arguments[1], messageId: 'literalNaTela' });
        }
      },
      NewExpression(no) {
        const c = no.callee;
        const nome = c.type === 'Identifier' ? c.name : propriedade(c);
        if (nome && /Text$/.test(nome) && contemTextoLiteral(no.arguments[3])) {
          context.report({ node: no.arguments[3], messageId: 'literalNaTela' });
        }
      },
      AssignmentExpression(no) {
        const l = no.left;
        if (l.type === 'MemberExpression' && !l.computed && PROPS_TEXTO.has(l.property.name) && contemTextoLiteral(no.right)) {
          context.report({ node: no.right, messageId: 'literalNaTela' });
        }
      },
      Literal(no) {
        if (typeof no.value === 'string') prosa(no, no.value);
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
