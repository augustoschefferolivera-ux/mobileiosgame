---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/index.html"
---
# Regras para jogos web (Phaser, PixiJS, Three.js, Babylon.js)

- TypeScript estrito, Vite, versão do engine fixada no `package.json` (sem `^` em dependências
  críticas); documente a versão em `docs/decisoes/`.
- Mobile Safari primeiro: `devicePixelRatio`, `touch-action: none` no canvas, áudio só após
  gesto do usuário (desbloqueio do `AudioContext`), `visibilitychange` para pausar.
- Assets: atlas (JSON hash) e texturas potência de 2 quando o engine exigir; KTX2/Basis em 3D;
  carregamento progressivo com tela de loading real.
- PWA: `manifest.webmanifest`, service worker com cache de assets versionado, `display: standalone`.
- Sem segredos no bundle; IA em runtime via backend mínimo com rate limit e consentimento.
- Testes: Vitest para lógica; Playwright com viewport de iPhone e emulação de toque para
  screenshots em `production/evidencias/`; `scripts/verify.sh` sobe `vite preview` e roda isso.
- Empacotar para App Store (Capacitor) só com funcionalidade e integração nativa reais (4.2, 4.7).
