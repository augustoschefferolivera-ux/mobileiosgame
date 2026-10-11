# ADR-0004 — Decisões de implementação da F-002 (movimento e mapa)

- **Status:** registrado na Sessão 2 (2026-10-11) e revisto depois da revisão independente da F-002 (3 lentes; os achados confirmados foram aplicados e estão incorporados abaixo). São decisões técnicas tomadas ao implementar `design/decisoes-F-002.md` (aqui, **D**). Nenhuma muda número de design; as leituras de D que precisaram de detalhe estão marcadas **(leitura de D)**.
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
  - `fonteDoRoteiro(roteiro)`: trechos `{ passo, mx, my }` com passos estritamente crescentes; vale o último trecho com `passo` ≤ o pedido (busca binária); antes do 1º, parado. O 1º passo da Vigília é o passo 0. `validarRoteiro` recusa passo fora de ordem ou fracionário, NaN, infinito e |v| > 1 + 1e-6 (com o literal 1/√2 em double, 2r² dá 1,0000000000000002).
- **Roteiro de referência** (`ROTEIRO_REFERENCIA`, D §6): parado, meia velocidade, corredor, costura em x no passo 258, raspão no obstáculo de (230, 1.278), diagonal e costura em y no passo 962, com 91 passos de deslize. O Vitest trava os passos das duas costuras e o 1º obstáculo tocado; os passos de deslize vão para o log.
- **Defesa na simulação:** |v| > 1 é reduzido ao círculo; NaN e infinito contam como parada, para um comando malformado não espalhar NaN no estado.

## 3. Colisão

- **Função genérica** `colidirComObstaculos(obstaculos, x, y, raio, movX, movY, desempate, out)`: duas passadas sobre todos os obstáculos, em ordem de índice, com o empurrão pela menor penetração na normal toroidal (D §3). Devolve o número de empurrões e não normaliza: quem chama normaliza no toro.
- **O jogador colide em todo passo, mesmo parado** (D §3, "em cada passo"): quem estiver dentro de um obstáculo é empurrado para fora no passo seguinte. Na F-002 isso não acontece (a zona livre o impede), mas passa a valer com empurrões, knockback e saves.
- **Desempate (leitura de D):**
  - D pede a tangente "exatamente nula". Com esse limite, a revisão achou corpos presos para sempre: numa reta 2:1 pelo centro (ou com o alvo a 0,001 px da linha dos centros), a tangente não é exatamente 0, e o deslize por passo cai abaixo de meio ulp do Float32, que a normalização apaga. O equilíbrio, que devia ser instável, vira estável;
  - por isso, a tangente conta como nula até `TOLERANCIA_DO_DESEMPATE` (1e-3) × |mov|. Nesse caso, e com o movimento para dentro, o corpo desliza pelo comprimento da componente normal, no sentido em que a tangente pende; com a tangente exatamente 0, na normal girada +90°, (−ny, nx);
  - (−ny, nx) é o giro de +90° na fórmula, em coordenadas do mundo. Como o y cresce para baixo, na tela ele aparece no sentido horário. Só afeta a escolha do lado em que o corpo contorna;
  - a regra vale nas duas passadas; uma 2ª aplicação exigiria o corpo de novo na linha dos centros depois de já ter deslizado.
- **Mutações conferidas:** sem o delta toroidal em x ou em y, sem o desempate, com o desempate só na tangente exata, sem o sinal da tangente, com 1 iteração (a junção de dois obstáculos que se tocam fica com ≈ 0,07 px de penetração), com o giro trocado e sem colidir parado, os testes falham.
- **Deriva em Float32:** a soma de 2,4 px por passo em Float32 deriva ≈ 0,006 px em 250 passos; é determinística e fica muito abaixo do ±1% do F-002.5.

## 4. Disposição dos obstáculos

- **Geração:** feita uma vez por `scripts/gerar-disposicao.py`, por amostragem com rejeição (semente 2026), sob as regras 3 a 6 de D §2 e com as contagens por tela 6/7/5, 8/4/6 e 5/7/6. O JSON é a fonte, e o teste trava as regras; `scripts/gerar-disposicao.py --conferir` reproduz a disposição e a compara com o JSON.
- **Regra 6 (leitura de D):** o corredor vale para a faixa que o corpo do jogador varre (o obstáculo não pode ter `x + R > 569` com `|y − 1.266| < R + 16`).
- **Restrição a mais, para o vídeo e o roteiro:** do outro lado da costura, o 1º obstáculo no caminho é o de (230, 1.278), tocado de raspão. A 1ª geração tinha um obstáculo em (43, 1.271) que fechava o corredor logo depois da costura; o teste agora exige essa ordem.

## 5. Entrada

- **Fila de toques (D §4: "anel de eventos"):** um `Float64Array` de 64 eventos × 5 campos (tipo, identifier, x, y, timeStamp), esvaziado inteiro a cada frame; por isso é uma fila linear, não circular. Ela só aceita eventos durante a Vigília (`ativa`), para não encher na Tela de Acender.
- **Retrato de `e.touches`:** até 16 identificadores. Com mais dedos que isso, o retrato deixa de valer e ninguém é solto por ele naquele frame.
- **Soltar todos** (touchcancel sem toques restantes, `blur`, `pagehide`, `visibilitychange`): descarta os eventos pendentes, que são anteriores ao pedido, e solta todos os slots antes dos eventos que chegarem depois.
- **Reconciliação:** a cada `touchstart`, antes de classificar o dedo novo (ADR-0002 §12), e no fim de cada tradução. Fazê-la por frame equivale a fazê-la a cada passo (D §4), porque nenhum evento chega entre os passos de um frame.
  - Sem a do `touchstart`, o toque que seguia um fim que não chegou virava "outro", e o joystick sumia até o polegar levantar de novo.
  - O retrato é o do último evento do frame. Se o dono soltar no mesmo frame em que outro dedo começa, depois dele, o dedo novo vira dono: diferença de no máximo 1 frame.
- **Tradução mesmo com a simulação pausada pelo debug:** a fila não enche e o joystick continua a ser desenhado; os passos é que não rodam.
- **Caixa do canvas em cache:** relida no 1º evento depois de `resize`/`orientationchange` da janela ou do `RESIZE` do ScaleManager (o FIT muda o estilo do canvas no `refresh`, que pode vir até 500 ms depois). Assim, os handlers não alocam um `DOMRect` por evento. Um teste da Playwright cobre o toque depois de um resize; sem a invalidação, o toque em 80 pt cai em 88 pt.
- **Mouse de debug:** identificador −1, nunca solto pelo retrato de toques. `mousedown` vem do canvas; `mousemove` e `mouseup` vêm da janela, para soltar fora do canvas (no letterbox) não deixar o joystick preso. `mousemove` só conta com o botão apertado.
- **Área do joystick:** medida pela cena Hud em `create` e `resize` e passada ao tradutor (`definirArea`); está na tabela de alvos como `vigilia`.

## 6. Render, câmera e Hud

- **Ordem `Image` → `SpriteGPULayer` (D §5):** a interface `RenderDoMundo` nasce com `RenderPorImagem` (55 objetos: 54 obstáculos e o jogador, em camadas de chão vazio, obstáculos e jogador). O `SpriteGPULayer` entra na F-003, atrás da mesma interface; o parâmetro `?render=gpu|image` entra junto com a 2ª implementação.
- **Atlas:** `CanvasTexture` de 512 × 512 gerado no Boot com disco (240 px), anel (240 px, traço de 4 px = 2 pt), círculo (192 px) e triângulo (96 px), em branco a 2× e com 4 px de folga entre molduras.
- **Só WebGL** (`type: Phaser.WEBGL`): o tint é só WebGL no Phaser 4, e no renderer Canvas obstáculos, jogador e joystick sairiam em branco, a cor do aparo. O `SpriteGPULayer` da F-003 também é só WebGL. Sem WebGL, o Phaser lança erro na criação do jogo.
- **Triângulo:** origem (0,5; ≈ 0,691), o incentro; o ângulo é `atan2(dirY, dirX) + π/2`, calculado na cena. A posição desenhada é a interpolada, arredondada para o pixel do canvas como a câmera (C2); sem isso, o triângulo tremia até meio pixel em volta do centro.
- **Câmera:** o centro é o jogador interpolado, arredondado para 0,5 pt e normalizado em [0, W) × [0, H). Na costura, o centro salta de W para 0, mas como tudo é desenhado na cópia mais próxima dele, a imagem não salta.
- **Hud:** o painel do prompt é um `Graphics` redesenhado só em `create` e `resize`; por frame, só o alpha muda pelo tween de 200 ms (o ADR-0002 §11 proíbe `Graphics` redesenhado por frame). O joystick são três imagens do atlas que só se movem.
- **`textoAtivo` segue o `visible`, não o alpha:** o prompt entra na lista no 1º frame do fade de entrada e sai no fim do fade de saída (≈ 200 ms depois de mover). Os testes esperam com `waitForFunction`.
- **`ESCALA_DO_CANVAS`** foi para `src/cenas/escala.ts`, para o que não importa o Phaser (e o Vitest) poder usá-la.

## 7. `__GAME_DEBUG__` acrescido (D §8)

- **Sempre presentes:**
  - `jogador { x, y, dirX, dirY }` (estado da simulação, normalizado no toro);
  - `camera { x, y }`;
  - os dois valem `null` antes da Vigília;
  - `entrada.joystick { ativo, origemX, origemY, vx, vy }`, em pt; a origem fica com `ativo = false` depois de soltar;
  - `toquesPerdidos`: eventos além de 64 por frame e dedos além de 5, na Vigília.
- **Só no build de debug:**
  - `entrada.injetar(tipo, id, x, y, t)`, com `tipo` em `'inicio' | 'move' | 'fim' | 'cancela'`, x e y em pt e t em ms; grava na mesma fila da camada de toque e ajusta o retrato como um TouchEvent faria (senão a reconciliação soltaria o dedo injetado no frame seguinte). Não se mistura com toques reais: o próximo TouchEvent reescreve o retrato com os seus `e.touches`, e o dedo injetado é solto;
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
