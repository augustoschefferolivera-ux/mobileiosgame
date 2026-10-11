# ADR-0003 — Decisões de implementação da F-001 (esqueleto e loop)

- **Status:** registrado na Sessão 1, etapa 4 (2026-10-11). São decisões técnicas tomadas ao implementar o ADR-0002. Nenhuma muda número da simulação nem regra de design. O item 1 corrige um fato técnico do ADR-0002 §12 e do critério F-001.4.
- **Fontes:** B §3 e §4 (F-001); ADR-0002 §2, §3, §5, §11, §12 e §14; brief §5.15, Q-27, Q-30, Q-31, Q-32 e Q-33; doc 10 §6; doc 11 §3.1; doc 12 §2.3.

## 1. Flag de autoplay do Chromium (corrige o ADR-0002 §12 e o F-001.4)

- **Medido no Chromium 141 da Playwright 1.56.1:** um `AudioContext` criado na carga da página nasce `'running'` com `--autoplay-policy=user-gesture-required`, e `'suspended'` com `--autoplay-policy=document-user-activation-required` ou sem flag. Com a flag antiga, o teste da F-001.4 passaria sem toque.
- **Decisão:** o projeto `taps-game` usa `document-user-activation-required`.
- **Mais dois fatos:**
  - o `page.evaluate` da Playwright roda com `userGesture: true`, e a ativação de usuário fica para a página;
  - o `WebAudioSoundManager` agenda no BOOT um unlock próprio, com listeners de `touchstart`, `touchend`, `mousedown`, `mouseup` e `keydown` no `body`, que chamam `context.resume()` em qualquer toque.
- **Decisão:** o `callbacks.preBoot` tira esse unlock automático (`game.events.off(BOOT, sound.unlock, sound)`), e o nosso desbloqueio no `touchend` do botão de Acender passa a ser o único caminho, como diz o ADR-0002 §12.
- **Teste:**
  - depois de um toque fora do botão, `audio()` continua `'suspended'` e `somTravado` continua `true`;
  - depois do toque em Acender, `desbloqueioDoAudio === 'running'` e `somTravado === false`. Isso prova também que o campo privado `unlocked` funciona com o `BaseSoundManager` real (F-001.14).
- **Mutação conferida:** sem a chamada ao nosso desbloqueio, o teste falha.

## 2. RNG

- **Vetores de referência do xoshiro128\*\*:** vêm do teste `reference` do crate `rand_xoshiro`, gerado pelos autores com o `xoshiro128starstar.c` v1.1. O site dos autores está bloqueado pelo proxy desta sessão. Os vetores também foram conferidos com uma transcrição em C compilada com gcc.
- **splitmix32:** soma a razão áurea (0x9e3779b9) e passa o resultado por um hash de duas rodadas do hash-prospector de Chris Wellons, `[16 21f0aaad 15 735a2d97 15]`. Não existe um splitmix32 canônico; o teste fixa vetores gerados pela mesma transcrição em C.
- **Semente de um fluxo:** `fnv1a(seed u32 LE, id do fluxo em ASCII, índice u32 LE)`. O índice 0 é o fluxo principal; os subfluxos (por nível, por baú) usam índice > 0.

## 3. Estado e hash na F-001

- **Estado:** um `ArrayBuffer` de 128 bytes, com cabeçalho de 8 palavras (versão do layout, seed, passo, relógio e 4 reservadas) e os 6 fluxos de RNG.
- **Hash:** cobre o buffer inteiro.
- **Pools, jogador e mundo:** entram nas features que os usam, cada uma aumentando `VERSAO_LAYOUT`.
- **Limitação:** enquanto não houver sistemas, o hash depende só da seed e do número de passos. O teste de determinismo também troca `Math.random`, `Date.now` e `performance.now` por funções que lançam erro durante os passos, e fica mais forte a cada feature.

## 4. Builds e parâmetros

- **Build de debug:** `vite build --mode debug --outDir dist-debug`. É o que aceita `?seed`, e o único que expõe `pausar`, `retomar` e `avancar` no `__GAME_DEBUG__`. O build de produção (`dist/`) ignora os parâmetros. Os demais parâmetros do ADR-0002 §14 (`?debug`, `?teto`, `?render`, `?tutorial`, `?inicio`, `?cenario`) entram com as features que os usam.
- **Mouse:** só no build de debug, pela mesma camada DOM (ADR-0002 §12, "Em DEV").
- **Seed sem `?seed`:** sorteada com `crypto.getRandomValues` em `src/plataforma`; a simulação só recebe o número.
- **`.verify/`** (ignorado pelo git): o Vitest grava ali o hash de referência que a Playwright compara (F-001.11).

## 5. `__GAME_DEBUG__` na F-001

- **Campos presentes:** `fps`, `passo`, `relogio` (em passos), `estado`, `vivos` (todos 0 até a F-002/F-003), `passos_perdidos`, `recusados`, `memoriaEstimadaMB`, `seed`, `textoAtivo`, `eventos`, `desbloqueioDoAudio`, `hash()` e `audio()`.
- **`estado` na F-001:** vale `'BOOT'`, `'ACENDER'` ou `'VIGILIA'` até a máquina de estados da Vigília (ADR-0002 §9).
- **`memoriaEstimadaMB`:** estado + backbuffer calculado pelos atributos reais do contexto WebGL (`getContextAttributes()` e `gl.SAMPLES`): cor em dobro (drawing buffer e cópia exibida), depth/stencil e, com MSAA, as versões multiamostradas. A conferência no Web Inspector do iPhone fica para a F-010.
- **Os demais campos do ADR-0002 §14** (`jogador`, `chefe`, `save`, `teto`, `degradacao`, `cpuFrameMs`, `build`, `numerosDeDano`, `entrada`, `ultimosEventos`, `toquesPerdidos`) entram com as suas features.

## 6. Telemetria local (resolve a pendência da F-001 sobre a Q-30)

- **Eventos:** 15. O doc 10 §6 tem 16 linhas e 17 eventos, porque `apagar` e `amanhecer` dividem uma linha; saem `anuncio` e `compra`. Os campos são os do doc, em snake_case (Q-33).
- **`vigilia_inicio` no MVP:** `ciclo` 1, `maldicao` 0, `reliquias` [] (B: sem Relíquias no MVP) e `arvore_pct` 0 até o save meta (F-010).
- **Capacidade:** 1.024 eventos, o mesmo número do anel de eventos aprovado (ADR-0002 §15 item 2). Os mais antigos são descartados.
- **Rede:** nada sai pela rede (teste F-001.15).

## 7. Tela de Acender e textos

- **Layout provisório** (formas geométricas, brief §5.15):
  - botão de 288 × 72 pt, centrado na área segura (72 pt é o mínimo de B §3.5); a largura encolhe se a área segura for mais estreita;
  - triângulo de brasa no lugar do logotipo;
  - aviso da chave de silêncio com ícone de alto-falante, acima do inset de baixo.
- **Paleta:** fundo #1a1f2b e brasa #ffb347 (brief §5.15), mais a base do doc 13 §1.3 (Q-27). O letterbox do FIT usa a mesma cor de fundo.
- **Texto novo:** `A8.SISTEMA.TITULO` ("Vigília das Cinzas") para o `document.title`. O `<title>` do `index.html` fica vazio, para não haver texto visível fora do `pt-BR.json`.
- **Toque:** a Chama acende quando o dedo **solta** dentro do botão, onde quer que o toque tenha começado. A regra do botão (exigir também começar dentro) fica para quando houver mais de um alvo por tela.

## 8. Lint

- **Fronteiras de `src/logica`:**
  - `no-restricted-imports`, `no-restricted-globals` (as globais do ADR-0002 §2, mais `navigator`, `localStorage`, `indexedDB`, `fetch`, `crypto`, `self`, `globalThis`, `location` e os demais timers);
  - `no-restricted-properties`: `Math.random` e as funções aproximadas, incluindo as hiperbólicas;
  - `no-restricted-syntax`: `**`, `**=` e `sort()` sem comparador (ADR-0002 §5).
- **`vdc/textos`** (plugin próprio, `eslint/vdc.js`):
  - todo literal com forma de id (`/^[A-K][0-9]+\./`) precisa casar com a Q-32 e existir no `pt-BR.json`, onde quer que esteja. O id passado a `t()` (posição 0) e ao helper `texto()` (posição 3) só pode ser um id válido;
  - nenhum literal chega aos pontos que desenham texto (`add.text`, `setText`, `textContent` etc.), nem por constante do arquivo, concatenação, lista ou argumento de chamada como `String('...')`;
  - strings com forma de texto para pessoas são barradas fora de `t()`, de logs e de `Error`: duas palavras, letra acentuada ou uma palavra com inicial maiúscula (a forma dos rótulos, como "Pausa"). A exceção são as chaves de cena (`{ key: 'Boot' }`, `scene.start('Vigilia')`);
  - limite conhecido: a regra é sintática. Um texto montado em tempo de execução a partir de dados que não vêm do `pt-BR.json` escapa; o teste de dados cobre os JSON.
- **`vdc/glossario`:** cobre identificadores, strings e comentários de `src/`. O detector (`eslint/glossario.js` + `eslint/glossario.json`) é o mesmo do `tests/dados.test.ts`.

## 9. Sem MSAA no contexto WebGL

- **Fato:** sem bloco `render`, o Phaser 4.2.1 pede `antialias: true` (`antialiasGL`), `stencil: true` e `depth: true` (Config.js e WebGLRenderer.js). No WebKit, isso cria buffers de cor e de depth/stencil multiamostrados (até 4×) além do drawing buffer. A 780 × 1688, cada buffer simples tem ≈ 5 MiB e cada buffer 4× tem ≈ 20 MiB: o MSAA custaria ≈ 40 MiB do orçamento de < 150 MB (B §3.13), mais o blit de resolução a cada frame.
- **Decisão:** `render: { antialiasGL: false }`. O filtro das texturas (`antialias`) não muda. As bordas das formas geométricas provisórias ficam serrilhadas; a arte final (depois da F-010) decide se o MSAA volta.

