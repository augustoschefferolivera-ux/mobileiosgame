import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Um it.only esquecido faria o verify.sh ficar verde rodando só parte dos testes.
    allowOnly: false,
  },
});
