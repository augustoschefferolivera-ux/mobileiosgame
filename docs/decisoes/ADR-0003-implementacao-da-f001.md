# ADR-0003 — Decisões de implementação da F-001 (esqueleto e loop)

- **Status:** registrado na Sessão 1, etapa 4 (2026-10-11). São decisões técnicas tomadas ao implementar o ADR-0002. Nenhuma muda número da simulação nem regra de design. O item 1 corrige um fato técnico do ADR-0002 §12 e do critério F-001.4.
- **Fontes:** B §3 e §4 (F-001); ADR-0002 §2, §3, §5, §11, §12 e §14; brief §5.15, Q-27, Q-30, Q-31, Q-32 e Q-33; doc 10 §6; doc 11 §3.1; doc 12 §2.3.

## 1. Flag de autoplay do Chromium (corrige o ADR-0002 §12 e o F-001.4)

- **Medido no Chromium 141 da Playwright 1.56.1:** um `AudioContext` criado na carga da página nasce `'running'` com `--autoplay-policy=user-gesture-required`, e `'suspended'` com `--autoplay-policy=document-user-activation-required` ou sem flag. Com a flag antiga, o teste da F-001.4 passaria sem toque.
- **Decisão:** o projeto `taps-game` usa `document-user-activation-required`.
- **Mais dois fatos:**
  - o `page.evaluate` da Playwright roda com `userGesture: true`;
  - o Phaser registra listeners próprios de desbloqueio no `body`.
- **Consequência:** `'running'` depois do toque não basta para provar que o nosso desbloqueio rodou. Por isso o teste também exige `__GAME_DEBUG__.desbloqueioDoAudio === 'running'`, o valor que o nosso desbloqueio devolve.

## 2. RNG

- **Vetores de referência do xoshiro128\*\*:** vêm do teste `reference` do crate `rand_xoshiro`, gerado pelos autores com o `xoshiro128starstar.c` v1.1. O site dos autores está bloqueado pelo proxy desta sessão. Os vetores também foram conferidos com uma transcrição em C compilada com gcc.
- **splitmix32:** soma a razão áurea (0x9e3779b9) e passa o resultado pelo finalizador "lowbias32" de Chris Wellons (0x21f0aaad, 0x735a2d97). Não existe um splitmix32 canônico; o teste fixa vetores gerados pela mesma transcrição em C.
- **Semente de um fluxo:** `fnv1a(seed u32 LE, id do fluxo em ASCII, índice u32 LE)`. O índice 0 é o fluxo principal; os subfluxos (por nível, por baú) usam índice > 0.

## 3. Estado e hash na F-001

- **Estado:** um `ArrayBuffer` de 128 bytes, com cabeçalho de 8 palavras (versão do layout, seed, passo, relógio e 4 reservadas) e os 6 fluxos de RNG.
- **Hash:** cobre o buffer inteiro.
- **Pools, jogador e mundo:** entram nas features que os usam, cada uma aumentando `VERSAO_LAYOUT`.
- **Limitação:** enquanto não houver sistemas, o hash depende só da seed e do número de passos. O teste de determinismo também troca `Math.random`, `Date.now` e `performance.now` por funções que lançam erro durante os passos, e fica mais forte a cada feature.

## 4. Builds e parâmetros

- **Build de debug:** `vite build --mode debug --outDir dist-debug`. É o que aceita `?seed` e `?debug=1`, e o único que expõe `pausar`, `retomar` e `avancar` no `__GAME_DEBUG__`. O build de produção (`dist/`) ignora os parâmetros.
- **Mouse:** só no build de debug, pela mesma camada DOM (ADR-0002 §12, "Em DEV").
- **Seed sem `?seed`:** sorteada com `crypto.getRandomValues` em `src/plataforma`; a simulação só recebe o número.
- **`.verify/`** (ignorado pelo git): o Vitest grava ali o hash de referência que a Playwright compara (F-001.11).

## 5. `__GAME_DEBUG__` na F-001

- **Campos presentes:** `fps`, `passo`, `relogio` (em passos), `estado`, `vivos` (todos 0 até a F-002/F-003), `passos_perdidos`, `recusados`, `memoriaEstimadaMB`, `seed`, `textoAtivo`, `eventos`, `desbloqueioDoAudio`, `hash()` e `audio()`.
- **`estado` na F-001:** vale `'BOOT'`, `'ACENDER'` ou `'VIGILIA'` até a máquina de estados da Vigília (ADR-0002 §9).
- **`memoriaEstimadaMB`:** estado + backbuffer de 780 × 1688 × 4 bytes, contado duas vezes.
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
  - o id de `t()` precisa casar com a Q-32 e existir no `pt-BR.json`;
  - nenhum literal pode chegar aos pontos que desenham texto (`add.text`, `setText`, `textContent` etc.);
  - strings com forma de prosa (duas palavras ou letra acentuada) são barradas fora de `t()`, de logs e de `Error`.
- **`vdc/glossario`:** cobre identificadores, strings e comentários de `src/`. O detector (`eslint/glossario.js` + `eslint/glossario.json`) é o mesmo do `tests/dados.test.ts`.
