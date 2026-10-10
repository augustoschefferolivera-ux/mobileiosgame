import { defineConfig } from 'vitest/config';

// Vitest 5 (compatível com Vite 8: peerDependencies vite ^6.4 || ^7 || ^8; Node >= 22.12).
// Padrão: ambiente node para lógica pura em src/**/*.test.ts (rápido, sem DOM).
// Testes que precisam de Phaser real marcam `// @vitest-environment jsdom` e importam
// tests/setup-phaser-headless.ts (modo Phaser.HEADLESS, sem pixels).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup-phaser-headless.ts'], // só age quando o arquivo de teste pede jsdom
    testTimeout: 10000,
  },
});
