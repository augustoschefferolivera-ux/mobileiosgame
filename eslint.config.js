// Lint do projeto: TypeScript recomendado + fronteiras da simulação (ADR-0002 §2 e §5),
// Phaser só em src/cenas, textos visíveis só por t(id) e glossário (Q-31).
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
].map((name) => ({ name, message: `src/logica é pura: sem ${name} (ADR-0002 §2).` }));

export default defineConfig(
  { ignores: ['dist/', 'dist-debug/', 'node_modules/', 'coverage/', 'test-results/', 'playwright-report/', '.verify/', 'design/', 'docs/', 'production/'] },
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
    files: ['src/**/*.ts'],
    ignores: ['src/cenas/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [PHASER] }] },
  },
  {
    files: ['src/logica/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            PHASER,
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
      'no-restricted-syntax': [
        'error',
        { selector: "BinaryExpression[operator='**']", message: 'O operador ** é aproximado (ADR-0002 §5).' },
        { selector: "AssignmentExpression[operator='**=']", message: 'O operador **= é aproximado (ADR-0002 §5).' },
        {
          selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
          message: 'A simulação nunca ordena sem critério de desempate (ADR-0002 §5).',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { vdc },
    rules: { 'vdc/glossario': 'error' },
  },
  {
    files: ['src/cenas/**/*.ts', 'src/entrada/**/*.ts', 'src/plataforma/**/*.ts', 'src/*.ts'],
    plugins: { vdc },
    rules: { 'vdc/textos': 'error' },
  },
);
