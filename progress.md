# progress.md

## Sessão 1 — brief, arquitetura e lista de features

### Estado: F-001 pronta (aguarda a revisão do usuário); F-002 não começada

- [x] GDD copiado de `docs/` (branch `claude/ecstatic-sagan-g9k3x6`, commit `62872cc`) para `design/gdd/`, sem alterações.
- [x] Leitura na ordem pedida: 18, 00, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13 §1.2; 01, 14 e 17 §4 para nomes e IDs. Os docs 09, 15 e 16 não foram lidos.
- [x] `design/game-brief.md` (v2) escrito e revisado: 5 revisores independentes (números, escopo, glossário, lacunas, features), cada um com um verificador cético; os achados confirmados foram aplicados.
- [x] Brief aprovado pelo usuário em 2026-10-10, com todas as recomendações da §11 (Q-00 a Q-35). Os itens da §11.3 continuam em aberto, por feature.
- [x] Etapa 2: `docs/decisoes/ADR-0001-stack.md` (registra a decisão já tomada) e `docs/decisoes/ADR-0002-arquitetura-da-simulacao.md` (v2). Antes, pesquisa técnica (4 investigações: render da horda, loop e escala, input e áudio, Worker/TETO/determinismo) e revisão adversarial (3 lentes + verificadores; 48 achados confirmados e aplicados).
- [x] ADR-0002 aprovado pelo usuário em 2026-10-10, com todas as recomendações da §15 (item 10: opção A).
- [x] Etapa 3: `feature_list.json` (escopo, critério e evidência literais de B §4 + 99 critérios verificáveis), `src/dados/schemas/` (10 schemas), dados do MVP em `src/dados/` (com `pendentes`/`pendencias` para cada número em aberto), `src/dados/textos/pt-BR.json` (147 textos) e `tests/dados.test.ts` (40 testes; verificado por mutação). Antes, revisão adversarial (3 lentes + verificadores; 39 achados confirmados e aplicados).
- [x] Etapa 3 aprovada pelo usuário em 2026-10-11, inclusive as [proposta de teste] e [proposta a aprovar] do feature_list.
- [x] Etapa 4: F-001 "Esqueleto e loop".
  - `scripts/verify.sh --feature F-001 --seed 1 --taps-game` verde, com estas etapas:
    - typecheck do projeto e de `src/logica` sem DOM nem Node;
    - lint;
    - Vitest (193 testes);
    - builds de produção e de debug;
    - Playwright no projeto taps-game (9 testes);
    - conferência do conteúdo das evidências.
  - Evidências em `production/evidencias/F-001/`: `screenshot-390x844.png` e `determinismo.log`. A seed 1 dá o hash `faad4a1f` no passo 1.000, no Node e no Chromium.
  - Crítico independente (subagente, Q-33): nota **7,5**. Revisão adversarial: 4 lentes, cada uma com um verificador cético; 28 achados confirmados e 16 refutados. Os confirmados foram aplicados em 8 commits pequenos, entre eles:
    - o nosso desbloqueio de áudio passou a ser o único caminho;
    - lint de textos mais forte;
    - `tsconfig.logica.json`;
    - driver testável;
    - contexto WebGL sem MSAA;
    - Playwright mais forte (safe-area emulada via CDP, contrato do `__GAME_DEBUG__`).
  - Decisões técnicas em `docs/decisoes/ADR-0003-implementacao-da-f001.md`.
  - Skills do Phaser lidas de novo para a F-001: game-setup-and-config, scale-and-responsive, scenes, audio-and-sound, além de trechos de time-and-timers, text-and-bitmaptext, cameras e input-keyboard-mouse-touch. Também o código-fonte de Game.js, TimeStep.js, WebAudioSoundManager.js, BaseSoundManager.js, Config.js e WebGLRenderer.js.

### Para o usuário ratificar (F-001)
- **Commits acima de ~300 linhas:** 5 dos primeiros commits da F-001 (bfbfddc, a390393, bb83f78, b3b4fc3, cc8f097) têm de 443 a 595 linhas, sem contar o lockfile. Os commits de correção ficaram dentro do limite. O histórico já foi enviado e não foi reescrito; das próximas features em diante, um commit por módulo + teste.
- **Artefatos aprovados alterados:**
  - ADR-0002 §12 e o "como" da F-001.4: a flag do Chromium passou a `--autoplay-policy=document-user-activation-required`. Medido: com `user-gesture-required`, o AudioContext já nasce `running`. O critério passou a descrever o teste mais forte.
  - Texto novo no `pt-BR.json`: `A8.SISTEMA.TITULO`.
- **Layout provisório da Tela de Acender:** botão de 288 × 72 pt, centrado na área segura. Não é número de simulação.
- **Riscos para o iPhone real (F-010):**
  - `audioSession = 'playback'` interrompe a música de outros apps e ignora a chave de silêncio; é o comportamento que o doc 12 §2.3 busca, mas vale confirmar;
  - o fallback do `<audio>` silencioso não roda no iOS 17+;
  - o efeito do MSAA desligado na arte final;
  - o desbloqueio dentro do `touchend` com `preventDefault`.

### Como rodar
- `npm install`.
- `scripts/verify.sh --feature F-001 [--seed N] [--taps-game]` (o Pronto).
- Avulsos: `npm test` (Vitest), `npm run typecheck`, `npm run lint`, `npm run build:debug` e depois `npm run e2e`, `npm run dev`.
- Módulo novo: `scripts/novo-modulo.sh <area>/<nome> [--cena NomeDaCena]`.

### Ambiente
- Não existem: `CLAUDE.md`, `playbook/` e os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature` e `/critico-independente`. O crítico é um subagente (Q-33). `scripts/` e o ADR-0001 foram criados nesta sessão.
- Playwright 1.56.1 usa o Chromium 1194 já instalado em `/opt/pw-browsers` (sem download). O site dos autores do xoshiro está bloqueado pelo proxy; os vetores vieram do crate `rand_xoshiro` (ADR-0003 §2).
- Há um Stop hook do ambiente que exige commit e push; não há o hook de verify/evidência/crítico do doc 19.
- Versões conferidas no npm em 2026-10-10: phaser 4.2.1, vite 8.x, typescript 5.9.x; Node 22.22.
- As skills oficiais do Phaser existem (`node_modules/phaser/skills/`, 28 assuntos). Para a etapa 2 foram lidas: game-setup-and-config, scale-and-responsive, scenes, time-and-timers, v4-new-features, v3-to-v4-migration, sprites-and-images, graphics-and-shapes, groups-and-containers, render-textures, particles, game-object-components, text-and-bitmaptext, cameras, input-keyboard-mouse-touch, audio-and-sound, geometry-and-math.

### Retomada
- **Sessão 1:** fecha na F-001, que aguarda a revisão do usuário. Não começar a F-002 nesta sessão.
- **Próxima sessão:**
  - ler este arquivo, o ADR-0003, a entrada da F-002 no `feature_list.json` (critérios e `pendencias_antes_de_comecar`) e o brief §11.3 F-002;
  - antes de qualquer código, resolver as pendências da F-002 com o usuário;
  - rodar `scripts/verify.sh --feature F-001` para conferir que o esqueleto continua verde.
