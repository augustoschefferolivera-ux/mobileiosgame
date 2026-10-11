# ADR-0004 — Decisões de implementação da F-002 (movimento e mapa)

- **Status:** registrado na Sessão 2 (2026-10-11). São decisões técnicas tomadas ao implementar `design/decisoes-F-002.md` (aqui, **D**). Nenhuma muda número da simulação nem regra de design; as poucas leituras de D que precisaram de detalhe estão marcadas **(leitura de D)**.
- **Fontes:** B §3.2, §3.3, §3.5 e §4 (F-002); D §2 a §8 e §10; ADR-0002 §3 a §6, §11, §12 e §14; ADR-0003.

## 1. Estado v2 e hash

- **Layout (`VERSAO_LAYOUT` 2, 156 bytes):**
  - cabeçalho de 8 palavras: versão, seed, passo, relógio, `tutoriaisVistos` (bits de `TUTORIAL`; parâmetro da Vigília), `disposicao` (impressão dos obstáculos) e 2 reservadas;
  - 6 fluxos de RNG (96 bytes);
  - jogador em Float32: `x`, `y`, `xAnt`, `yAnt`, `dirX`, `dirY`; em Uint8: `promptMover` (0 aguardando, 1 visível, 2 cumprido) e 3 bytes reservados.
- **Impressão da disposição:** FNV-1a de `n` e dos bits Float32 de x, y e r de cada obstáculo, na ordem do JSON (`impressaoDaDisposicao`).
- **Dados fixos fora do estado:** `DadosDaVigilia` (obstáculos, início e velocidade por passo) é montado uma vez a partir dos JSON e passado a `passo(estado, dados, comandos)`. A velocidade é `velocidade × 4,5 × 32 ÷ 60` em double (2,4 px por passo para Aldric).
- **Referências do determinismo (seed 1 e 424242, 1.000 passos com o roteiro):** `3510977e` e `3b7955cb`. Node e Chromium dão o mesmo hash (F-001.11).

## 2. ComandosDoPasso e fontes de comandos

- **Formato:** `{ movimento: Float32Array(2) }`; o arredondamento para Float32 acontece na escrita.
- **Fontes:**
  - `fonteConstante(cmd)`: ao vivo, o vetor que o tradutor leu no frame vale para todos os passos dele (D §4);
  - `fonteDoRoteiro(roteiro)`: trechos `{ passo, mx, my }` com passos estritamente crescentes; vale o último trecho com `passo` ≤ o pedido (busca binária); antes do 1º, parado. `validarRoteiro` recusa passo fora de ordem ou fracionário, NaN e |v| > 1 + 1e-6 (1/√2 em Float32 é um pouco maior que o real).
- **Roteiro de referência** (`ROTEIRO_REFERENCIA`, D §6): parado, meia velocidade, corredor, costura em x no passo 258, raspão no obstáculo de (230, 1.278), diagonal e costura em y no passo 962, com 91 passos de deslize. O Vitest confere esses fatos.
- **Defesa na simulação:** |v| > 1 é reduzido ao círculo e NaN conta como parada, para um comando malformado não espalhar NaN no estado.

## 3. Colisão

- **Função genérica** `colidirComObstaculos(obstaculos, x, y, raio, movX, movY, desempate, out)`: duas passadas sobre todos os obstáculos, em ordem de índice, com o empurrão pela menor penetração na normal toroidal (D §3). Devolve o número de empurrões e não normaliza: quem chama normaliza no toro.
- **Desempate (leitura de D):** com a tangente exatamente nula e o movimento para dentro, o corpo desliza na normal girada +90° (−ny, nx) pelo comprimento da componente normal do movimento. A regra vale nas duas passadas; uma 2ª aplicação exigiria o corpo de novo exatamente na linha dos centros depois de já ter deslizado, o que não acontece.
- **Mutações conferidas:** sem o delta toroidal, sem o desempate, com 1 iteração (a junção de dois obstáculos que se tocam fica com ≈ 0,07 px de penetração) e com o giro trocado, os testes falham.
- **Deriva em Float32:** a soma de 2,4 px por passo em Float32 deriva ≈ 0,006 px em 250 passos; é determinística e fica muito abaixo do ±1% do F-002.5.

## 4. Disposição dos obstáculos

- **Geração:** feita uma vez, fora do repositório, por amostragem com rejeição (semente 2026) sob as regras 3 a 6 de D §2, com as contagens por tela 6/7/5, 8/4/6 e 5/7/6. O JSON é a fonte; o teste trava as regras.
- **Regra 6 (leitura de D):** o corredor vale para a faixa que o corpo do jogador varre (o obstáculo não pode ter `x + R > 569` com `|y − 1.266| < R + 16`).
- **Restrição a mais, para o vídeo e o roteiro:** do outro lado da costura, o 1º obstáculo no caminho é o de (230, 1.278), tocado de raspão. A 1ª geração tinha um obstáculo em (43, 1.271) que fechava o corredor logo depois da costura; o teste agora exige essa ordem.

## 5. Entrada

- **Fila de toques (D §4: "anel de eventos"):** um `Float64Array` de 64 eventos × 5 campos (tipo, identifier, x, y, timeStamp), esvaziado inteiro a cada frame; por isso é uma fila linear, não circular. Ela só aceita eventos durante a Vigília (`ativa`), para não encher na Tela de Acender.
- **Retrato de `e.touches`:** até 16 identificadores. Com mais dedos que isso, o retrato deixa de valer e ninguém é solto por ele naquele frame.
- **Soltar todos** (touchcancel sem toques restantes, `blur`, `pagehide`, `visibilitychange`): descarta os eventos pendentes, que são anteriores ao pedido, e solta todos os slots antes dos eventos que chegarem depois.
- **Reconciliação:** uma vez por frame, junto com a tradução. É equivalente a fazê-la a cada passo (D §4), porque nenhum evento chega entre os passos de um frame.
- **Tradução mesmo com a simulação pausada pelo debug:** a fila não enche e o joystick continua a ser desenhado; os passos é que não rodam.
- **Caixa do canvas em cache:** relida no 1º evento depois de `resize`/`orientationchange` da janela ou do `RESIZE` do ScaleManager (o FIT muda o estilo do canvas no `refresh`, que pode vir até 500 ms depois). Assim, os handlers não alocam um `DOMRect` por evento. Um teste da Playwright cobre o toque depois de um resize; sem a invalidação, o toque em 80 pt cai em 88 pt.
- **Mouse de debug:** identificador −1, nunca solto pelo retrato de toques; `mousemove` só conta com o botão apertado.
- **Área do joystick:** medida pela cena Hud em `create` e `resize` e passada ao tradutor (`definirArea`); está na tabela de alvos como `vigilia`.

## 6. Render, câmera e Hud

- **Ordem `Image` → `SpriteGPULayer` (D §5):** a interface `RenderDoMundo` nasce com `RenderPorImagem` (55 objetos: 54 obstáculos e o jogador, em camadas de chão vazio, obstáculos e jogador). O `SpriteGPULayer` entra na F-003, atrás da mesma interface; o parâmetro `?render=gpu|image` entra junto com a 2ª implementação.
- **Atlas:** `CanvasTexture` de 512 × 512 gerado no Boot com disco (240 px), anel (240 px, traço de 4 px = 2 pt), círculo (192 px) e triângulo (96 px), em branco a 2× e com 4 px de folga entre molduras.
- **Triângulo:** origem (0,5; ≈ 0,691), o incentro; o ângulo é `atan2(dirY, dirX) + π/2`, calculado na cena.
- **Câmera:** o centro é o jogador interpolado, arredondado para 0,5 pt e normalizado em [0, W) × [0, H). Na costura, o centro salta de W para 0, mas como tudo é desenhado na cópia mais próxima dele, a imagem não salta.
- **Hud:** o painel do prompt é um `Graphics` redesenhado só em `create` e `resize`; por frame, só o alpha muda pelo tween de 200 ms (o ADR-0002 §11 proíbe `Graphics` redesenhado por frame). O joystick são três imagens do atlas que só se movem.
- **`ESCALA_DO_CANVAS`** foi para `src/cenas/escala.ts`, para o que não importa o Phaser (e o Vitest) poder usá-la.

## 7. `__GAME_DEBUG__` acrescido (D §8)

- **Sempre presentes:**
  - `jogador { x, y, dirX, dirY }` (estado da simulação, normalizado no toro; `null` antes da Vigília);
  - `camera { x, y }`;
  - `entrada.joystick { ativo, origemX, origemY, vx, vy }`, em pt; a origem fica com `ativo = false` depois de soltar;
  - `toquesPerdidos`: eventos além de 64 por frame e dedos além de 5, na Vigília.
- **Só no build de debug:**
  - `entrada.injetar(tipo, id, x, y, t)`, com `tipo` em `'inicio' | 'move' | 'fim' | 'cancela'`, x e y em pt e t em ms; grava na mesma fila da camada de toque e ajusta o retrato como um TouchEvent faria (senão a reconciliação soltaria o dedo injetado no frame seguinte);
  - `entrada.roteiro(lista | null)`: impõe o roteiro por passo absoluto ao driver e ao `avancar`; chamado antes da Vigília, vale desde o passo 0 (inclusive os passos que o driver roda antes do `avancar`, F-001.11); `null` volta à entrada ao vivo;
  - `avancar(n)` usa a mesma fonte de comandos do driver.
- **Parâmetro novo:** `?tutorial=0` marca todos os tutoriais como vistos (ADR-0002 §3 e §14).

## 8. Evidências

- **Vídeo:** contexto próprio da Playwright com `recordVideo` de 390 × 844, no mesmo dispositivo do projeto `taps-game`, salvo em `movimento.webm` depois de fechar o contexto. Os 3 PNG são tirados durante o vídeo.
- **Mapa:** `mapa-585x1266.png`, o mapa a 1/2, desenhado em SVG a partir do JSON, com a contagem por tela, o início, a zona livre e o corredor. Entrou na lista de evidências da F-002, para o `verify.sh` conferir que é regenerado.
- **JSON na Playwright:** o ESM do Node exige atributo de importação para JSON, então o spec lê a região do disco.

## 9. Fica para o aparelho e para as features seguintes

- Conferir no iPhone: 5 dedos simultâneos (Q-29), o joystick perto da borda (a base fica onde o dedo tocou), a falta de histerese na zona morta e o encolhimento do FIT na aba do Safari.
- O pool de `Image` custou ≈ 0,6 a 0,9 ms para 1.500 quads no bench do ADR-0002; com 55 objetos é irrelevante. A troca para o `SpriteGPULayer` na F-003 não muda a interface.
- As recomendações de D §9 continuam nas pendências das F-003 a F-010.
