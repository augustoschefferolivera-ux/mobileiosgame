# progress.md

## Sessão 3 — F-003 "Hordas"

### Estado: F-003 pronta (aguarda a revisão do usuário); F-004 não começada

- [x] Leitura: este arquivo, ADR-0004, `design/decisoes-F-002.md` (sobretudo a §9) e a entrada da F-003 no `feature_list.json`. Antes de começar, `scripts/verify.sh --feature F-002 --taps-game --seed 1` verde. Branch `claude/f003-hordas`, a partir de `claude/clever-galileo-26bjed`.
- [x] **Etapa 1, decisões:** `design/decisoes-F-003.md` (aqui, D3).
  - Levantamento: 4 pesquisadores (física da horda; diretor e spawn; contato, jogador e estado; render, debug e desempenho), cada um com um verificador cético, e um crítico de completude: 127 perguntas, 20 já respondidas pelos documentos.
  - Revisão adversarial: 3 lentes, cada uma com um verificador (notas 7, 7 e 6,5 antes das correções); 61 achados, 57 confirmados e aplicados (D3 §11), entre eles um que mudou o código: os laços por inimigo alocavam ≈ 48 KB por passo no V8.
  - A §0 lista para veto rápido as decisões delegadas (S1 a S8, K1 a K3, R1 a R9, M1, T1 a T3, V1 a V4, E1 a E4). O que é de outras features ficou como recomendação (§9), registrada nas pendências das F-004 a F-010 no `feature_list.json`.
- [x] **Etapa 2, implementação** (`96ab615..HEAD`, ≈ 30 commits de até ~300 linhas; os maiores: 341 linhas, que são um arquivo de teste só, o do diretor, e 318, o spec da F-003):
  - **simulação:** estado v3 (TETO, cenário, linha fixa, rotação, HP e timer de contato, pool de 500 SoA), grade de 64 px, pool com pilha de livres e lista densa, tipos de inimigo, timeline compilada, diretor (reposição até o mínimo, conversão de excedente, janela antes dos marcos, garantidos, anel com viés de 60% e busca de ponto livre), separação Jacobi limitada pela velocidade, inimigos sólidos para o jogador (regra simétrica), obstáculos por célula, contato com 18 passos de invulnerabilidade, rotação do cenário, verificação de NaN no `?debug=1`;
  - **plataforma:** `decidirTeto` com as 5 camadas, receitas de cenário (`horda`, `horda_rotativa`, `sem_horda`), parâmetros `?teto`, `?render`, `?buffer`, `?cenario`, `?debug`, painel do debug;
  - **render:** `SpriteGPULayer` com escrita direta no buffer de instâncias (stride 42), plano B `?render=image`, `?buffer=dinamico`, aquecimento na Acender, limpeza do que o `preDestroy` não libera, cores dos inimigos (Noviça em #8994b4);
  - **`__GAME_DEBUG__`:** vivos pelo pool, convertidos, diretor, teto, cenário, render, webgl, `quadrosContados`, HP; só no debug, `quadros()`, `inimigos()`, `hashPorSecao()` e `removerInimigo()`;
  - **testes:** 563 no Vitest (contorno S8, contato, diretor, anel, horda, F-003.11 com o `SpriteGPULayer` real, cores, alocação E4, determinismo com a horda) e 30 na Playwright (8 da F-003; as F-001 e F-002 passam a usar `?cenario=sem_horda`);
  - **decisões técnicas** em `docs/decisoes/ADR-0005-implementacao-da-f003.md`, com as 11 divergências do ADR-0002 (§8).
- [x] `scripts/verify.sh --feature F-003 --taps-game --seed 1` verde:
  - typecheck, lint, Vitest (563 testes), builds de produção e de debug;
  - Playwright `taps-game` (30 testes: 10 da F-001, 12 da F-002 e 8 da F-003);
  - evidências conferidas, com o aviso "fps não conferido: WebGL por software".
- [x] `scripts/verify.sh --feature F-002 --taps-game --seed 1` continua verde.
- [x] Evidências em `production/evidencias/F-003/`: `debug-300-vivos-390x844.png` (passo 1.800 do cenário horda, pausado), `heap-60s.json` (Δ de 2,8 KB e no máximo 13 nós por grupo em 60 s, com 570 liberações; limites de 32 KiB e 100) e `desempenho-30s.json` (300 vivos nas 30 leituras; p95 de um passo + p95 do resto até `PRE_RENDER` = 4,3 ms com CPU 4×; 4 draw calls; fps não conferido).
- [x] Determinismo: a seed 1 dá `e91ed119` no passo 1.000 com a horda e o diretor, no Node e no Chromium (`&teto=300`); a 424242 dá `6173ca75`. O cenário horda (300 vivos) também dá o mesmo hash nos dois motores no passo 1.800.
- [x] Crítico independente (Q-33): nota **8**, sem bloqueante nem alto. Os 4 achados médios e os baixos (menos o tamanho de 4 commits, de 301 a 341 linhas) foram aplicados (ADR-0005 §9):
  - teste de que os convertidos contam 10 em vivosEq;
  - teste da separação contra a força bruta (a visita da grade fica em linha);
  - spec da queda para `image` sem unidade de textura no vertex shader, e o texto corrigido (uma falha ao ligar o programa não é tratada);
  - fps médio pelo tempo real da janela;
  - hash Node × Chromium também no cenário horda, no passo 1.800.

### Decidido nesta sessão (técnico; detalhes no ADR-0005)
- **Laço quente:** nenhum double atravessa uma chamada fora de linha nos laços por inimigo; a colisão lê e escreve num `Float64Array` (`COLISAO`). De ≈ 48 KB para ≈ 9 B por passo no V8, com o mesmo hash.
- **Aquecimento do teste de heap: 90 s** (os 30 s de D3 não bastavam no contêiner: os metadados do JIT do V8 ainda cresciam ≈ 270 nós no minuto seguinte). Limites mantidos depois de 3 rodadas.
- **F-003.4 neste contêiner:** o WebGL é o SwiftShader; o teste confere sempre a CPU (p95 de um passo + p95 do resto até `PRE_RENDER` < 10 ms, com 300 vivos e CPU 4×) e registra "fps não conferido". O F-003.4 literal (fps ≥ 55) fica pendente de um desktop com GPU ou do build de teste do iPhone (F-006, Q-29).
- **Teste de contorno:** os 52 casos chegam; o campo de fluxo não foi implementado.

### Para o usuário revisar
- As decisões delegadas da §0 de D3 (veto rápido).
- O F-003.4 literal (fps ≥ 55) não foi medido: o contêiner só tem WebGL por software.
- As 11 divergências do ADR-0002 (ADR-0005 §8).

## Sessão 2 — F-002 "Movimento e mapa"

### Estado: F-002 pronta (aguarda a revisão do usuário); F-003 não começada

- [x] Leitura: este arquivo, ADR-0003, `design/decisoes-F-002.md` (D) e a entrada da F-002 no `feature_list.json`. Antes de começar, `scripts/verify.sh --feature F-001 --taps-game` verde.
- [x] Implementação, em commits de até ~300 linhas (`1b93b8d..HEAD`):
  - **dados:** schema da região (só círculo, 64/80/96, centro no toro, `inicio_jogador`), 54 obstáculos na Charneca (6/7/5, 8/4/6, 5/7/6; a tela do início com 4), início em (585, 1.266); saíram as pendências "se os obstáculos bloqueiam" de `armas.json` e `inimigos.json`;
  - **simulação** (`src/logica`): toro (normalização Float32, delta, interpolação, cópia mais próxima), colisão de um círculo contra os obstáculos com deslize e desempate, estado v2 (registro do jogador, tutoriais vistos e impressão da disposição no cabeçalho), `ComandosDoPasso` com fonte ao vivo e roteiro por passo absoluto, movimento a 2,4 px por passo e o prompt de mover;
  - **entrada** (`src/entrada`): vetor do joystick (zona morta radial 0,15, raio 60 pt, curva linear), área do joystick na tabela de alvos, fila de toques em Float64Array, TradutorDeGestos (5 dedos, dono até soltar, reconciliação por `e.touches`), caixa do canvas em cache, mouse e teclado só no debug;
  - **cenas** (`src/cenas`): atlas no Boot, render do mundo por `Image` atrás da interface do `SpriteGPULayer` (F-003), câmera no jogador arredondada a 0,5 pt, cena Hud com o joystick e o prompt "Deslize para mover", `?tutorial=0`, só WebGL;
  - **`__GAME_DEBUG__`:** `jogador`, `camera`, `entrada.joystick`, `toquesPerdidos` e, só no debug, `entrada.injetar` e `entrada.roteiro`;
  - **decisões técnicas** em `docs/decisoes/ADR-0004-implementacao-da-f002.md`; o gerador da disposição em `scripts/gerar-disposicao.py` (`--conferir` reproduz o JSON).
- [x] `scripts/verify.sh --feature F-002 --taps-game --seed 1` verde:
  - typecheck, lint, Vitest (362 testes), builds de produção e de debug;
  - Playwright `taps-game` (22 testes: 10 da F-001 e 12 da F-002);
  - evidências conferidas.
- [x] Evidências em `production/evidencias/F-002/`:
  - `movimento.webm` (≈ 18 s, 390 × 844, roteiro de D §8);
  - `movimento-1/2/3-390x844.png`;
  - `mapa-585x1266.png`, o mapa 3 × 3 para revisão, que entrou na lista de evidências da F-002.
- [x] Determinismo: o teste passa a rodar o roteiro `ROTEIRO_REFERENCIA` (movimento, deslize e as duas costuras). A seed 1 dá `3510977e` no passo 1.000, no Node e no Chromium; a evidência da F-001 foi regenerada com esse hash.
- [x] Revisão independente (Q-33):
  - 1ª rodada, 3 lentes: simulação **8**, entrada e render **8**, fidelidade e cobertura **9**. Os achados foram conferidos e aplicados:
    - desempate com tolerância (corpos presos numa reta 2:1);
    - colisão também parado, infinito como parada;
    - testes da costura em y e do passo 0;
    - reconciliação no `touchstart`;
    - jogador no pixel da câmera, só WebGL;
    - mouse de debug pela janela;
    - gerador versionado e documentação;
  - crítico final, sobre o estado corrigido: nota **8,5**, sem bloqueante. Os achados dele também foram aplicados: testes que travam a zona morta radial, o arredondamento da câmera, a cópia mais próxima no render e os números T1, mais a reconciliação exata no `touchstart`.

### Decidido nesta sessão (técnico; detalhes no ADR-0004)
- **Leituras de D que precisaram de detalhe:**
  - a tangente "nula" do desempate vale até 1e-3 × |mov|;
  - o corredor da regra 6 é a faixa varrida pelo corpo do jogador;
  - restrição a mais na disposição: o 1º obstáculo depois da costura é o do deslize, em (230, 1.278);
  - o "anel de 64 eventos" é uma fila linear esvaziada a cada frame.
- **O mapa 3 × 3 virou a 5ª evidência da F-002:** assim o `verify.sh` confere que ele é regenerado.
- **`?render=gpu|image` fica para a F-003,** junto com a 2ª implementação do render.

### Decididos por delegação do usuário (2026-10-11: "Pode resolver o que listou acima da melhor maneira que encontrar")
- **Ratificados como estão:**
  - a tolerância do desempate (1e-3 × |mov|);
  - a restrição a mais na disposição (o 1º obstáculo depois da costura é o do deslize);
  - o mapa 3 × 3 como 5ª evidência da F-002.
- **Commit de 317 linhas (`0b4cc0b`):** o histórico fica como está, sem reescrita, como na F-001. Os demais commits têm até 296.
- **Só WebGL:** fica, porque o tint é só WebGL e o WebGL 1 e 2 existe em todo hardware iOS desde o Safari 15 (wiki da Khronos). Sem contexto, agora aparece o aviso `A8.SISTEMA.SEM_WEBGL` no lugar do canvas, em vez de uma página vazia. É um texto novo no `pt-BR.json`, coberto por teste da Playwright com `--disable-webgl`.
- **Riscos do iPhone** (detalhes e fontes no ADR-0004 §9):
  - **5 dedos:** é o limite do iPhone (o iPad tem 11), e um 6º dedo cancela os outros, o que o `touchcancel` já trata. `__GAME_DEBUG__.entrada.maxToques` confirma no aparelho em uma leitura;
  - **fim de toque engolido:** coberto pelo `touchcancel`, por `visibilitychange`/`pagehide`/`blur` e pela reconciliação no toque seguinte. Fica para medir se a Central de Controle dispara `blur`;
  - **joystick perto da borda e zona morta sem histerese:** ficam como B e D mandam, para reavaliar no build de teste do iPhone (Q-29). Perto da borda esquerda, o movimento para a esquerda é mais lento (com o dedo a 30 pt da borda, 41%);
  - **caixa do canvas mudando no meio de um arrasto:** não acontece na Vigília: as barras do Safari só encolhem com rolagem, que está bloqueada, e a rotação pausa (F-010).

## Sessão 1 — brief, arquitetura e lista de features

### Estado: F-001 pronta

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
    - Vitest (198 testes);
    - builds de produção e de debug;
    - Playwright no projeto taps-game (10 testes);
    - conferência do conteúdo das evidências.
  - Evidências em `production/evidencias/F-001/`: `screenshot-390x844.png` e `determinismo.log`. A seed 1 dá o hash `faad4a1f` no passo 1.000, no Node e no Chromium.
  - Crítico independente (subagente, Q-33):
    - 1ª rodada: nota **7,5**, com revisão adversarial (4 lentes, cada uma com um verificador cético; 28 achados confirmados e 16 refutados);
    - 2ª rodada, sobre o estado corrigido: nota **8,2**, sem bloqueante. Os ajustes que ela apontou também foram aplicados (touchend, teto de 6 passos, import dinâmico, `100dvh`, `bitmapText`, caixa do toque);
    - os achados confirmados da 1ª rodada foram aplicados em 8 commits pequenos, entre eles:
    - o nosso desbloqueio de áudio passou a ser o único caminho;
    - lint de textos mais forte;
    - `tsconfig.logica.json`;
    - driver testável;
    - contexto WebGL sem MSAA;
    - Playwright mais forte (safe-area emulada via CDP, contrato do `__GAME_DEBUG__`).
  - Decisões técnicas em `docs/decisoes/ADR-0003-implementacao-da-f001.md`.
  - Skills do Phaser lidas de novo para a F-001: game-setup-and-config, scale-and-responsive, scenes, audio-and-sound, além de trechos de time-and-timers, text-and-bitmaptext, cameras e input-keyboard-mouse-touch. Também o código-fonte de Game.js, TimeStep.js, WebAudioSoundManager.js, BaseSoundManager.js, Config.js e WebGLRenderer.js.

### Decididos por delegação do usuário (2026-10-11: "Deixo a decisão por você")
- **Commits acima de ~300 linhas:** o histórico fica como está, sem reescrita. O limite vale daqui em diante.
- **Flag de autoplay:** fica `--autoplay-policy=document-user-activation-required`, como no ADR-0002 §12 e no F-001.4 corrigidos.
- **`A8.SISTEMA.TITULO` e o layout provisório do botão de Acender (288 × 72 pt):** ficam até a arte, depois da F-010.
- **As pendências da F-002:** decididas em `design/decisoes-F-002.md`.
  - Antes, um levantamento: 4 pesquisadores, 4 verificadores e um crítico de completude; 71 perguntas, 17 já respondidas pelos documentos.
  - Depois, uma revisão adversarial do documento: 29 achados confirmados e aplicados.
  - A §0 do documento lista, para veto rápido, as decisões de design e de número tomadas por delegação ([delegada]).
  - O que pertence a outras features ficou como recomendação (§9), registrada nas pendências de cada feature no `feature_list.json`.

### Itens que estavam para ratificar (F-001; decididos acima)
- **Commits acima de ~300 linhas:** 5 dos primeiros commits da F-001 (bfbfddc, a390393, bb83f78, b3b4fc3, cc8f097) têm de 443 a 595 linhas, sem contar o lockfile. Os commits de correção ficaram dentro do limite. O histórico já foi enviado e não foi reescrito; das próximas features em diante, um commit por módulo + teste.
- **Artefatos aprovados alterados:**
  - ADR-0002 §12 e o "como" da F-001.4: a flag do Chromium passou a `--autoplay-policy=document-user-activation-required`. Medido: com `user-gesture-required`, o AudioContext já nasce `running`. O critério passou a descrever o teste mais forte.
  - Texto novo no `pt-BR.json`: `A8.SISTEMA.TITULO`.
- **Layout provisório da Tela de Acender:** botão de 288 × 72 pt, centrado na área segura. Não é número de simulação.
- **Riscos para o iPhone real (F-010):**
  - `audioSession = 'playback'` interrompe a música de outros apps e ignora a chave de silêncio; é o comportamento que o doc 12 §2.3 busca, mas vale confirmar;
  - o fallback do `<audio>` silencioso não roda no iOS 17+;
  - o efeito do MSAA desligado na arte final;
  - o desbloqueio dentro do `touchend` com `preventDefault`;
  - o desbloqueio roda uma vez só: se o `resume()` falhar, a Vigília começa sem som até recarregar (pesa a partir dos sons da F-006);
  - o `onGameVisible` do Phaser ao voltar do segundo plano (ADR-0003 §1);
  - os 72 pt são lógicos: na aba do Safari o FIT encolhe o botão (≈ 57 pt físicos em 390 × 664);
  - o determinismo só foi medido no V8; o JavaScriptCore será conferido no aparelho.

### Como rodar
- `npm install`.
- `scripts/verify.sh --feature F-00N [--seed N] [--taps-game]` (o Pronto; F-001, F-002 e F-003 verdes; ≈ 12 min, dos quais ≈ 4 nos specs de desempenho e de heap da F-003).
- Avulsos: `npm test` (Vitest), `npm run typecheck`, `npm run lint`, `npm run build:debug` e depois `npm run e2e`, `npm run dev`.
- Módulo novo: `scripts/novo-modulo.sh <area>/<nome> [--cena NomeDaCena]`.
- Disposição dos obstáculos: `scripts/gerar-disposicao.py --conferir`; direções do anel: `scripts/gerar-direcoes.py --conferir` (Python 3).
- Cenários do build de debug: `?cenario=horda|horda_rotativa|sem_horda`, `?teto=300|500`, `?render=gpu|image`, `?buffer=dinamico`, `?debug=1` (painel e verificação de NaN).

### Ambiente
- Não existem: `CLAUDE.md`, `playbook/` e os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature` e `/critico-independente`. O crítico é um subagente (Q-33). `scripts/` e o ADR-0001 foram criados nesta sessão.
- Playwright 1.56.1 usa o Chromium 1194 já instalado em `/opt/pw-browsers` (sem download). O site dos autores do xoshiro está bloqueado pelo proxy; os vetores vieram do crate `rand_xoshiro` (ADR-0003 §2).
- Há um Stop hook do ambiente que exige commit e push; não há o hook de verify/evidência/crítico do doc 19.
- Versões conferidas no npm em 2026-10-10: phaser 4.2.1, vite 8.x, typescript 5.9.x; Node 22.22.
- As skills oficiais do Phaser existem (`node_modules/phaser/skills/`, 28 assuntos). Para a etapa 2 foram lidas: game-setup-and-config, scale-and-responsive, scenes, time-and-timers, v4-new-features, v3-to-v4-migration, sprites-and-images, graphics-and-shapes, groups-and-containers, render-textures, particles, game-object-components, text-and-bitmaptext, cameras, input-keyboard-mouse-touch, audio-and-sound, geometry-and-math.

### Retomada
- **Sessão 1:** fechou na F-001.
- **Sessão 2:** fechou na F-002.
- **Sessão 3:** fecha na F-003, que aguarda a revisão do usuário. A F-004 não foi começada.
- **Próxima sessão (F-004 "Armas"):**
  - ler este arquivo, o ADR-0005, `design/decisoes-F-003.md` (sobretudo a §9) e a entrada da F-004 no `feature_list.json`;
  - antes de implementar, fechar as pendências da F-004, inclusive as recomendações da F-003 (campo `armas` vazio nas receitas `horda` e `horda_rotativa`, Sal só no deslocamento de comportamento, sonda do TETO);
  - rodar `scripts/verify.sh --feature F-003 --taps-game --seed 1` para conferir que a horda continua verde.
