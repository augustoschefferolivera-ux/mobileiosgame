// Lint do projeto: TypeScript recomendado + fronteiras da simulação (ADR-0002 §2 e §5),
// a lista densa do pool só no pool (design/decisoes-F-004.md §4), Phaser só em
// src/cenas, textos visíveis só por t(id) e glossário (Q-31).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import vdc from './eslint/vdc.js';

const PHASER = { group: ['phaser', 'phaser/*'], message: 'Só src/cenas importa phaser (ADR-0002 §2).' };

const MATEMATICA_APROXIMADA = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'pow', 'hypot', 'cbrt',
].map((property) => ({
  object: 'Math',
  property,
  message: `Math.${property} é aproximada pela implementação e pode divergir entre motores (ADR-0002 §5).`,
}));

const GLOBAIS_DO_AMBIENTE = [
  'window', 'document', 'navigator', 'performance', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'localStorage',
  'sessionStorage', 'indexedDB', 'fetch', 'XMLHttpRequest', 'crypto', 'self', 'globalThis', 'location',
  'eval', 'Function',
  // Node: passaria no Vitest e quebraria no Safari.
  'process', 'Buffer', 'require', 'global', 'module', 'setImmediate', '__dirname', '__filename',
].map((name) => ({ name, message: `src/logica é pura: sem ${name} (ADR-0002 §2).` }));

const MODULOS_DO_NODE = {
  regex: '^(node:|(fs|path|os|crypto|timers|perf_hooks|process|child_process|worker_threads|util|events)(/|$))',
  message: 'src/logica não usa módulos do Node (ADR-0002 §2).',
};

const SINTAXE_DA_LOGICA = [
  { selector: "BinaryExpression[operator='**']", message: 'O operador ** é aproximado (ADR-0002 §5).' },
  { selector: "AssignmentExpression[operator='**=']", message: 'O operador **= é aproximado (ADR-0002 §5).' },
  { selector: 'ImportExpression', message: 'src/logica não usa import() dinâmico (ADR-0002 §2).' },
  {
    selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
    message: 'A simulação nunca ordena sem critério de desempate (ADR-0002 §5).',
  },
];

/** A simulação percorre os slots por índice; a lista densa `ativos` só conta e aloca, dentro do pool. */
const MENSAGEM_DE_ATIVOS = 'Fora de pool.ts, src/logica não lê a lista densa `ativos` (design/decisoes-F-004.md §4, Remoções).';
const LER_ATIVOS = [
  { selector: "MemberExpression[property.name='ativos']", message: MENSAGEM_DE_ATIVOS },
  { selector: "MemberExpression[computed=true][property.value='ativos']", message: MENSAGEM_DE_ATIVOS },
  { selector: "ObjectPattern > Property[key.name='ativos']", message: MENSAGEM_DE_ATIVOS },
];

/** A simulação só escreve no anel de eventos, por gravarEvento (design/decisoes-F-004.md §4): nada de apelido nem de views. */
const MENSAGEM_DO_ANEL = 'src/logica só passa o anel a gravarEvento ou esvaziarAnel; ler o anel quebra a cópia do buffer e o save (design/decisoes-F-004.md §4).';
const LER_ANEL = [
  { selector: "ObjectPattern > Property[key.name='eventos']", message: MENSAGEM_DO_ANEL },
  { selector: "VariableDeclarator > MemberExpression.init[property.name='eventos']", message: MENSAGEM_DO_ANEL },
  { selector: "AssignmentExpression > MemberExpression.right[property.name='eventos']", message: MENSAGEM_DO_ANEL },
  { selector: "MemberExpression[object.type='MemberExpression'][object.property.name='eventos']", message: MENSAGEM_DO_ANEL },
];

export default defineConfig(
  { ignores: ['dist/', 'dist-debug/', 'node_modules/', 'coverage/', 'test-results/', 'playwright-report/', '.verify/', 'design/', 'docs/', 'production/', '.claude/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['eslint/**/*.js', 'eslint.config.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: { URL: 'readonly' } },
  },
  {
    files: ['src/**/*.{ts,js,mjs}'],
    ignores: ['src/cenas/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [PHASER] }] },
  },
  {
    files: ['src/logica/**/*.{ts,js,mjs}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            PHASER,
            MODULOS_DO_NODE,
            {
              regex: '(^|/)(cenas|entrada|plataforma)(/|$)',
              message: 'src/logica não importa src/cenas, src/entrada nem src/plataforma (ADR-0002 §2).',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...GLOBAIS_DO_AMBIENTE],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use o RNG com seed de src/logica/nucleo/rng (ADR-0002 §5).' },
        ...MATEMATICA_APROXIMADA,
      ],
      'no-restricted-syntax': ['error', ...SINTAXE_DA_LOGICA, ...LER_ATIVOS, ...LER_ANEL],
    },
  },
  {
    // O pool é o dono da lista densa (design/decisoes-F-004.md §4, Remoções).
    files: ['src/logica/nucleo/pool.ts'],
    rules: { 'no-restricted-syntax': ['error', ...SINTAXE_DA_LOGICA, ...LER_ANEL] },
  },
  {
    // Q-31: o glossário vale para todo o código (os testes do detector desligam a regra no arquivo).
    files: ['**/*.{ts,js,mjs}'],
    plugins: { vdc },
    rules: { 'vdc/glossario': 'error' },
  },
  {
    files: ['src/cenas/**/*.ts', 'src/entrada/**/*.ts', 'src/plataforma/**/*.ts', 'src/*.ts'],
    plugins: { vdc },
    rules: { 'vdc/textos': 'error' },
  },
);
