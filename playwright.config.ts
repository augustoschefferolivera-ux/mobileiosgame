// Playwright (ADR-0002 §14): o projeto taps-game dirige o jogo por toques reais
// (CDP Input.dispatchTouchEvent) num viewport de iPhone em retrato. Serve o build
// de debug em dist-debug/ (scripts/verify.sh gera os dois builds antes).
import { defineConfig } from '@playwright/test';

// Fora da 4173 padrão do vite preview, para não colidir com um preview aberto.
const PORTA = Number(process.env['VDC_PORTA'] ?? 4317);

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORTA}` },
  webServer: {
    command: `npx vite preview --outDir dist-debug --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'taps-game',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        launchOptions: {
          // Medido no Chromium 141: com user-gesture-required o AudioContext já nasce
          // 'running'; com document-user-activation-required ele nasce 'suspended' e
          // o teste do áudio (F-001.4) só passa com o toque.
          args: ['--autoplay-policy=document-user-activation-required'],
        },
      },
    },
  ],
});
