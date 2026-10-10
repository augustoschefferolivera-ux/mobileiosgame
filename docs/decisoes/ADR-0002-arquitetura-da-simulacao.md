# ADR-0002 — Arquitetura da simulação, do render e da persistência

- **Status:** **aceito** pelo usuário em 2026-10-10, com todas as recomendações da §15 (Sessão 1, etapa 2). No item 10, que não tinha número, vale a opção A. Antes da aprovação, o texto passou por revisão adversarial: 3 lentes (fidelidade, correção técnica, completude), cada uma com um verificador cético.
- **Fontes:**
  - `design/gdd/18-briefing-tecnico.md` (**B**), §3;
  - `design/game-brief.md` (aprovado), com as decisões da §11 (Q-xx);
  - docs 02, 04, 06, 07, 10 e 12 do GDD;
  - skills oficiais do Phaser 4.2.1 lidas: `game-setup-and-config`, `scale-and-responsive`, `scenes`, `time-and-timers`, `v4-new-features`, `v3-to-v4-migration`, `sprites-and-images`, `graphics-and-shapes`, `groups-and-containers`, `render-textures`, `particles`, `game-object-components`, `text-and-bitmaptext`, `cameras`, `input-keyboard-mouse-touch`, `audio-and-sound`, `geometry-and-math`;
  - código-fonte do Phaser 4.2.1, conferido onde citado;
  - benchmarks desta sessão (Chromium/V8, desktop; servem só para comparar estratégias, não para prever o iPhone).
- **Convenção:** o que vem de B, do GDD ou de uma Q aprovada é citado assim. **Toda constante ou regra que nenhum documento dá está marcada [proposta]** e listada na §15 para aprovação.

---

## 1. Contexto

- **Alvo:** iPhone 11/12 (Safari iOS 17+, PWA).
- **Orçamento:** 300 inimigos + 200 projéteis/efeitos + 300 partículas; ≤ 150 draw calls; < 10 ms de CPU por frame; < 150 MB; zero alocação por frame no caminho quente (B §3.13).
- **Stack:** Phaser 4.2.1 (ADR-0001).
- **O que B exige:**
  - simulação pura em `src/logica/`, com passo fixo de 60 Hz, acumulador e teto de 5 passos por frame;
  - RNG com seed separado para o diretor e para o level up;
  - SoA com pools pré-alocados e grade espacial própria;
  - determinismo verificável: mesma seed + 1.000 passos = mesmo hash (F-001).

## 2. Visão geral

```
 DOM (toque, visibilidade, áudio, armazenamento)          Phaser 4.2.1 (só render, cenas, áudio)
 ┌──────────────────────────────┐                        ┌───────────────────────────────────┐
 │ src/entrada  (fila de toques)│──► ComandosDoPasso ──► │  src/cenas  (Boot, Acender,       │
 │ src/plataforma (save, TETO,  │                        │   Santuario, Vigilia, Hud, Modal) │
 │   áudio, visibilidade, PWA,  │                        │  src/cenas/render (atlas, camadas │
 │   safe-area)                 │                        │   SpriteGPULayer, interpolação)   │
 └──────────────────────────────┘                        └───────────────▲───────────────────┘
                 │                                                       │ lê estado + eventos
                 ▼                                                       │
        ┌──────────────────────────────────────────────┐                 │
        │ src/logica  (TypeScript puro, sem Phaser/DOM)│─────────────────┘
        │  passo(estado, comandos) — 60 Hz, determinístico
        │  estado = 1 ArrayBuffer com views SoA        │
        │  saída: views (só leitura) + anel de eventos │
        └──────────────────────────────────────────────┘
                 ▲
        src/dados/*.json (validados por JSON Schema no boot e no Vitest)
```

**Fronteiras, verificadas por lint (ESLint, regras `no-restricted-*`):**
- `src/logica/` não importa `phaser`, `src/cenas`, `src/entrada` nem `src/plataforma`.
- `src/logica/` não usa `window`, `document`, `performance`, `Date`, `requestAnimationFrame`, `setTimeout` nem `Math.random`.
- `src/logica/` não usa `Math.sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `exp`, `expm1`, `log*`, `pow`, `hypot`, `cbrt`, nem o operador `**` (motivo na §5).
- Só `src/cenas/` importa `phaser`. `src/plataforma/` e `src/entrada/` usam DOM, mas não Phaser; o `AudioContext` do Phaser chega por injeção.
- O lint de strings e o de palavras proibidas estão na §11.

## 3. Laço de passo fixo (B §3.1)

- **Passo:** 1/60 s = 16,667 ms. Toda duração da simulação é contada em **passos inteiros**.
- **Conversão de segundos em passos:**
  - quando B já dá o número de passos, vale o de B: esquiva 21 (i-frames nos passos 2 a 13), recuperação 3, aparo 11, aparo falho 24, invulnerabilidade de contato 18;
  - nos demais casos, **[proposta]** arredondar para o inteiro mais próximo. Exemplos: 0,5 s = 30; 2 s = 120; 0,6 s = 36; 1,5 s = 90; 80 ms = 4,8 → 5, que também é a proposta da §11.3 F-006 do brief. Cada conversão fica listada num teste.
- **Driver** (em `src/cenas/Vigilia`, nunca em `src/logica`):
  - escuta `Phaser.Core.Events.STEP`, que o Phaser emite antes dos `update()` das cenas (Game.js:474-478);
  - soma `game.loop.rawDelta`, o delta bruto do rAF, sem suavização (TimeStep.js:412);
  - roda no máximo **5 passos** por frame; o excedente é descartado e somado em `passos_perdidos`;
  - o resto do acumulador vira `alfa` (0..1), usado para interpolar o render.
- **Config do loop:** `fps: { target: 60, limit: 0, forceSetTimeOut: false, smoothStep: false }`.
  - Com o `smoothStep: true` padrão, medido com o `TimeStep.js` real: a 30 fps (Low Power Mode), o delta suavizado soma 2,9 s a cada 5 s reais nos 120 frames depois de cada `focus`/`visible`.
  - `fps.limit: 60` pulou 4 de 600 frames com o rAF a 16,6 ± 0,1 ms.
- **30 fps (Low Power Mode, térmico, iframe de portal):** 2 passos por frame. O laço aguenta de 0 a 5.
- **Interpolação no toro:**
  - a simulação guarda `xAnt`/`yAnt` por entidade;
  - o render tira o delta pelo toro, com a regra da §6: `d = atual − ant`; se `d > W/2`, `d −= W`; se `d < −W/2`, `d += W` (o mesmo em y, com H). Depois desenha `ant + d × alfa` e só então aplica o wrap relativo à câmera (§11);
  - a câmera centra no valor interpolado do jogador pela mesma regra. Sem o delta toroidal, `xAnt = 1.168` e `x = 2` com `alfa = 0,5` dariam 585, meio mapa de distância;
  - não aloca;
  - teste (B F-002, "wrap de posição"): uma entidade e o jogador cruzando a costura em x e em y com `alfa = 0,5` ficam a menos de um passo de deslocamento de `ant`.
- **O passo NÃO roda** (o relógio também para; o render continua):
  - **pausa** e **level up** (B §3.1);
  - **congelamento** do aparo e da esquiva perfeita (80 ms ≈ 5 passos, §11.3 F-006): a simulação inteira congela, inclusive o relógio **[proposta]**, de forma determinística: só anda o contador de congelamento.
- **O passo roda, mas o relógio para:**
  - **Fogueira:** jogador dentro do raio; os inimigos ficam parados e acinzentados (B §3.10; doc 07 §4). O jogador pode andar e sair do raio (Q-24). Mostrar a Fogueira na cena Modal **não** pausa o passo;
  - **transição de fase** do Lanterneiro: 90 passos em que o chefe ignora dano (B §3.1 e §3.11); o resto da simulação continua.
- **Ritmo de apresentação** (no driver, não muda a simulação):
  - **câmera lenta** do Apagar (1 s) e câmera lenta leve do prompt de esquiva (0,5 s aos 1:00, doc 11 §4);
  - o driver roda 1 passo a cada k frames (fatores: §11.3 F-006 e F-007).
- **Tutoriais (F-006; Q-26) [proposta]:**
  - os flags "tutoriais vistos" do `meta` entram na Vigília como parâmetro, como o TETO: são gravados no `vigilia`, no replay e no hash;
  - o estado do prompt e o contador de falhas de aparo ficam no registro do jogador;
  - a janela de aparo +0,1 s (6 passos, doc 11 §4) só vale com o prompt de aparo ativo;
  - o Vitest da F-006 começa com os tutoriais marcados como vistos; a Playwright usa `?tutorial=0`.

## 4. Estado, SoA e pools

- **Um único `ArrayBuffer`**, alocado no início da Vigília, com *views* tipadas por campo (SoA). Nada é alocado durante a Vigília. Isso deixa a migração para Worker (§12) trivial e o hash (§5) barato.
- **Posições:** `Float32Array` em px lógicos, sempre normalizadas para o toro [0, W) × [0, H), com W = 1.170 e H = 2.532 (mapa 3×3 telas, B §3.2). `Float32Array` é IEEE 754, portanto determinístico entre motores.
- **Pools e capacidades [proposta]:**

| Pool | Capacidade alocada | Limite lógico | Campos (resumo) |
|---|---|---|---|
| Inimigos (inclui Coroados e o Lanterneiro) | 500 | **TETO** da Vigília: 300 ou 500. O TETO conta todos os vivos (Q-08 (a)). **Diverge do texto da Q-08 (a)**, "pools com capacidade = TETO": aqui a capacidade física é sempre 500, o mesmo layout e o mesmo save nos dois casos, e o TETO é o limite lógico | x, y, xAnt, yAnt, hp, hpMax, dano, tipo, estado, timerEstado, salPassos, salFator, quebradaPassos, alvoAtaque, convertido, geração |
| Projéteis (jogador e inimigos) + efeitos de chão | 400 + 64 | **200 ou 400 somados**: projéteis vivos + efeitos de chão vivos (B §3.13, "Projéteis/efeitos") | Projéteis: x, y, xAnt, yAnt, vx, vy, dano, vida, perfurações, dono, tipo. Efeitos (onda de brasa, Lanterna Arremessada, anel da Explosão de Luz): x, y, raio, vida, dano, tipo |
| Pickups (Cinzas, Almas, baús) | 512 | 512: acima disso, a nova Cinza é **fundida** na mais próxima, somando o valor | x, y, tipo, valor |
| Partículas | 600 | 300 ou 600 (B §3.13) | **fora da simulação**: pool de render, RNG cosmético, não entra no hash |
| Números de dano | 96 | 96 | **fora da simulação**: pool de render alimentado pelo anel de eventos |

- **Pool cheio [proposta]:** o spawn é recusado (o projétil, o efeito ou o pickup não nasce) e contado em `__GAME_DEBUG__.recusados` por pool. Nada é reciclado.
- **Alocar e liberar em O(1):** pilha de índices livres (`Int32Array`) mais uma lista densa de ativos com troca e remoção. Referências entre entidades (o alvo do Contra-ataque, o dono de um projétil) usam *handle* = índice + geração (`Uint16Array`), que fica inválido quando o slot é reaproveitado.
- **Jogador:** um registro fixo de campos numéricos no mesmo buffer: posição, stamina, HP, Frascos, timers da esquiva, do aparo e da invulnerabilidade, Poder temporário, nível, XP, atributos, estado do tutorial.
- **Mundo:** `arenaAtiva`, centro da arena, Fogueira (acesa, posição, ações usadas), bit `ativo` por obstáculo, diretor (linha, acumulador de intervalo), relógio e estado da máquina (§9).
- **Saída para o render:**
  - os próprios views (o render só lê);
  - um **anel de eventos** de 1.024 entradas **[proposta]** (`Uint32Array` + `Float32Array`): acerto, morte, aparo, esquiva perfeita, Quebra, level up, telegrafo iniciado, baú, Fogueira etc. Ele alimenta som, partículas, números de dano, a telemetria local (Q-30) e `__GAME_DEBUG__.ultimosEventos`.

## 5. Determinismo, RNG e hash

- **RNG:** **xoshiro128\*\*** (32 bits), estado `Uint32Array(4)` por fluxo. B pede "xorshift128+ ou equivalente"; o xoshiro128** é o equivalente de 32 bits da mesma família. O xorshift128+ com BigInt custou 233 ns por chamada e ~370 GCs por 1,2 M sorteios, contra 11 ns e zero alocação.
- **Semeadura:** cada fluxo recebe `splitmix32(fnv1a(seed, id_do_fluxo))`. O teste do RNG confere a implementação contra os vetores de referência dos autores.
- **Fluxos.** Os de B são `diretor` e `levelup`. **[proposta]** Para que o consumo de um sistema não desloque a sequência de outro, acrescentam-se:
  - `drops` (Almas 50%);
  - `baus` (1/3/5 itens);
  - `ia` (escolha de ataque dos inimigos e do chefe);
  - `armas` (se alguma arma sortear algo).
- **Subfluxos [proposta]:** `levelup` tem um por nível e `baus` um por baú, derivados por índice. Assim, a carta do nível 12 não depende de quantas Almas caíram antes.
- **Partículas e efeitos visuais** usam um RNG cosmético nas cenas, fora do hash.
- **Aritmética exata entre motores (ECMA-262):**
  - permitidos em `src/logica`: `+ − × ÷ %`, `Math.sqrt`, `fround`, `imul`, `floor`, `round`, `trunc`, `abs`, `min`, `max`, `sign` (o `%` é exato; ele preserva o sinal do dividendo, e o código corrige onde importa);
  - proibidos: `sin`, `cos`, `atan2`, `exp`, `log`, `pow`, `**` e `hypot`, que são *implementation-approximated* (o V8 usa LLVM-libc e o JSC usa a libm da Apple, que podem divergir no último ulp);
  - cones e arcos são testados por produto escalar contra cossenos **literais**: 120° → cos 60° = 0,5; 180° → 0; 60° → cos 30° = 0,8660254037844386;
  - as direções do anel de spawn vêm de uma **tabela literal** de vetores unitários, gerada offline e versionada;
  - `1,12^(rank−1)` do custo de Pesquisa é calculado por multiplicação iterativa.
- **Ordem:** a simulação nunca usa `sort` sem desempate. O "mais próximo" desempata pelo menor índice.
- **Hash:** FNV-1a de 32 bits sobre os bytes das regiões canônicas: passo, estados de RNG, parâmetros (TETO, tutoriais), jogador, mundo, slots ativos de cada pool e diretor. Custo ≈ 0,05 ms para ≈ 35 KB.
  - Em debug há também hash por seção e uma trilha a cada 100 passos **[proposta]**, para localizar uma divergência.
  - Com `?debug=1`, o código verifica que não há NaN, porque a codificação de NaN em `Float32Array` não é padronizada.
- **Testes de determinismo (F-001 em diante):**
  - mesma seed, duas execuções, 1.000 passos → mesmo hash;
  - 1 passo por frame contra 5 passos por frame → mesmo hash;
  - salvar no passo 500, restaurar e continuar → mesmo hash do que sem salvar;
  - o mesmo hash de referência no Vitest (Node) e no Playwright (Chromium).

## 6. Grade espacial e obstáculos (B §2; F-002, F-003)

- **Grade uniforme sobre o toro**, com célula de **64 px = 2 corpos [proposta]**: 19 colunas × 40 linhas, sendo a última coluna (18 px) e a última linha (36 px) mais estreitas.
  - É refeita a cada passo por *counting sort*: `contagem`, `inicio` e `indicesOrdenados` em `Int32Array`. Custo O(n + células) e iteração contígua.
- **Distância no toro:**
  ```
  dx = x2 − x1
  se dx > W/2: dx −= W;   se dx < −W/2: dx += W
  (o mesmo para dy, com H)
  ```
- **Consulta:**
  - o intervalo de células vem das **coordenadas em px**, não de um número de anéis: colunas de `floor(wrapX(x − r)/64)` até `floor(wrapX(x + r)/64)`, linhas de `floor(wrapY(y − r)/64)` até `floor(wrapY(y + r)/64)`, avançando com wrap de índice;
  - com isso a última coluna e a última linha, mais estreitas, não deixam vizinhos de fora (um ponto em x = 10 com r = 30 precisa da coluna 17);
  - devolve os índices num `Int32Array` de saída pré-alocado, e serve para qualquer raio (o Círculo de Sal chega a ≈ 3,0 a 3,2 corpos no nv8, conforme os bônus de raio de B §3.8 se somem ou se multipliquem; a confirmar antes da F-004).
- **Teste (B F-003):** em 1.000 casos aleatórios, a grade devolve os mesmos vizinhos que a força bruta, inclusive casos fixos junto da costura: (x = 10, r = 30) precisa da coluna 17; (y = 10, r = 50) precisa da linha 38.
- **Usos:**
  - contato inimigo–jogador;
  - acerto de projétil e de arco;
  - aura;
  - "mais próximo";
  - separação entre Ocos (força: §11.3 F-003).
- **Pickups:** o Ímã percorre o pool inteiro (≤ 512 testes por passo).
- **Obstáculos:**
  - estáticos, com disposição fixa por mapa no JSON da região (Q-04), 4 a 8 por tela (B F-002), numa estrutura pré-calculada no boot, fora da grade dinâmica;
  - colidem com o jogador e com os inimigos no toro, pela mesma distância;
  - forma, tamanho, contorno pelos inimigos e bloqueio das Facas e do projétil da Noviça ficam para a §11.3 F-002;
  - o estado guarda só 1 bit `ativo` por obstáculo (a arena os desliga), que entra no hash e no save.

## 7. Armas e arquétipos de alvo (B §3.8; F-004)

Armas são **dados** (`src/dados/armas.json`): arquétipo, escala, base por nível, cooldown em passos e efeitos de cada nível. O código implementa só os arquétipos:

| Arquétipo | Armas do MVP | Como resolve o alvo |
|---|---|---|
| `direcao_movimento` | Espada Longa, Lâmina do Juramento Eterno | Vetor de mira = direção atual do joystick. Com o jogador parado, inclusive no início: §11.3 F-004 (**[proposta]** a levar: manter a última direção não nula; no início, para cima). Testa um arco de 120°, de alcance a definir (§11.3 F-004), por produto escalar + distância no toro, consultando a grade. Golpes extras (nv3 e nv8) são agendados em passos. A União acrescenta a onda de brasa como efeito de chão |
| `mais_proximo` | Facas de Sal | Consulta a grade a partir do jogador, com desempate por índice. Alcance e escolha de alvo de uma salva com várias facas: §11.3 F-004 (**[proposta]** a levar: N alvos distintos, N = facas da salva; com menos de N alvos, repete o mais próximo) |
| `aura` | Círculo de Sal | A cada tick (frequência: §11.3 F-004), consulta o raio e aplica dano e Sal (−50%; −60% no nv4). O acerto testa `d ≤ r` com `d` exato; o teste de B é "acerta a 2 corpos e não a 2,1". Como o Sal se aplica é a §15, item 12 |

- **Dano:** `Base(nível) × (1 + Poder) × Escala × Mult_status × Mult_stamina`, com `Escala = Σ grau × atributo/10` e `Mult_stamina = 1` no MVP (doc 10 §2.2). A ordem dos multiplicadores fica para a §11.3 F-004.
- **Contra-ataque (aparo bem-sucedido):** cada arma ganha **uma** salva extra com ×2, redirecionada ao handle do inimigo aparado (doc 04 §10), disparada dentro da janela de 1,5 s. O agendamento exato sai na F-006.

## 8. Diretor por timeline (B §3.7; Q-01, Q-02, Q-07 a Q-11)

**Formato:** em `src/dados/regioes/charneca_das_lanternas.json`, uma linha por minuto, derivada **literalmente** da tabela do brief §5.4: roster e pesos de B, mínimo e intervalo por minuto do doc 07. Mais `obstaculos: [{ x, y, forma, tamanho }]`, preenchido na F-002. O JSON completo está no Apêndice A.

**Algoritmo** (puro, fluxo `diretor`):
1. Linha corrente = minuto inteiro decorrido (Q-10).
2. **Arena ativa** (marco ou chefe) → o diretor não spawna (Q-09). Só entram os convocados pelo Coroado ou pelo Lanterneiro, que surgem **dentro da arena**, em volta do convocador (§9), e não no anel do passo 6.
3. **Janela de 30 s antes dos marcos** 5:00, 10:00 e 15:00 → nenhum spawn, nem de reposição. O 19:30 não entra (Q-11).
4. A cada `intervalo_efetivo = intervalo × (1/I)` (B), calcula `alvo = min × I` (sem limite) e `min_efetivo = min(alvo, TETO)` (B). Se os vivos estão abaixo de `min_efetivo`, spawna a diferença de uma vez (Q-07), sorteando o tipo pelos pesos do roster. A contagem de vivos segue o passo 7.
5. **Linhas de marco** (intervalo "—"): depois que a arena se desfaz e até o próximo minuto, vale o mínimo da linha do marco, com o intervalo da linha anterior (Q-01; combinação na §15, item 1).
6. **Posição:**
   - anel de 468 a 624 px (1,2 a 1,6 larguras de tela; Q-06), sempre fora da vista;
   - com 60% de chance, no semicírculo oposto à direção do movimento; com o jogador parado, uniforme (Q-07);
   - as direções vêm da tabela literal da §5;
   - quando a ponta do anel passa da meia-largura do mapa, o wrap leva o ponto para o lado oposto: ele continua fora da vista, mas o viés se inverte. Isso foi aceito, porque só acontece perto da horizontal e na borda externa.
7. **TETO e excedente** (B; Q-08):
   - a conversão é decidida pelo valor **sem limite**: `excedente = max(0, alvo − TETO)` na reposição, ou `max(0, vivos + n − TETO)` numa convocação de n;
   - cada 10 Ocos das Lanternas do excedente viram 1 Oco Grande com o HP e o XP somados e o dano normal de Oco Grande;
   - no MVP, fora das convocações e da degradação, isso só acontece no minuto 19 com `I` = 1,1 (`alvo` = 330 contra TETO 300).
   - **Slots, resto e recompensa [proposta, §15 item 9]:**
     - o convertido ocupa 1 slot e conta no TETO (Q-08 (a)); para o mínimo, vale pelos 10 que substitui: `vivosEq = comuns + 10 × convertidos`;
     - sejam `falta = alvo − vivosEq` (reposição) ou `falta = n` (convocação), e `livres = TETO − slots`. Entram `min(falta, livres)` inimigos; desses, `g = min(⌊max(0, falta − livres)/10⌋, min(falta, livres))` são convertidos, cada um no slot de um comum;
     - o resto que não forma um grupo de 10 é descartado, sem acumular;
     - o XP do convertido é a soma dos 10; as Almas são 10 sorteios de 50% no fluxo `drops`, feitos na morte dele;
     - teste: com TETO 300, 0 vivos e `alvo` = 330, entram 297 do roster e 3 convertidos, e os slots nunca passam de 300.
8. **Escala:**
   - `HP = HP_base × (1 + 0,12·min) × I` e `Dano = Dano_base × (1 + 0,05·min)`, fixados no spawn (Q-10). O Coroado também escala (Q-12);
   - o Lanterneiro usa `6.500 × (1 + 0,04 × nível)`, com o nível do momento em que surge.
9. **Garantidos:** 1 Oco Grande no minuto 1 e 1 Noviça no minuto 3, em toda Vigília (Q-26).

## 9. Máquina de estados da Vigília (§5.4 a §5.11 do brief)

```
                 ┌──────── sobreposições (congelam a simulação e o relógio) ────────┐
                 │   LEVEL_UP (modal de cartas) · PAUSA · CONGELAMENTO (≈5 passos)  │
                 └──────────────────────────────────────────────────────────────────┘
ACENDER (passo 0; grava o vigilia de retomada da Hora I)
  └─► HORA(n=1) ──5:00──► MARCO(guardiao 1) ──último Coroado morto──► HORA(n=2, fogueira acesa)
                               │                                       │ jogador entra no raio
                               │ relógio chega a 10:00 com Coroado vivo ▼
                               │ (marco vencido, §15 item 7)        FOGUEIRA (passo roda, relógio parado)
                               ▼                                       │ Partir ou sair do raio
                         MARCO(chefe_menor)                            ▼
  HORA(2) ──10:00──► MARCO(chefe_menor) ──► HORA(3)+fogueira ──► FOGUEIRA ──► HORA(3)
  HORA(3) ──15:00──► MARCO(guardiao 2, 2 Coroados) ──► HORA(4)+fogueira ──► FOGUEIRA ──► HORA(4)
  HORA(4) ou qualquer MARCO ──20:00──► CHEFE (fases 1 → 2 → 3; entre elas, TRANSICAO_FASE:
                                       90 passos, simulação roda, relógio parado, chefe sem dano)
  CHEFE ──Lanterneiro HP 0──► AMANHECER (600 passos de céu clareando) ──► FIM(amanhecer)
  CHEFE ──relógio 23:00──► A_FOME ──► FIM(apagar, causa = a_fome)
  qualquer estado ──HP do jogador 0──► APAGANDO (câmera lenta de 1 s) ──► FIM(apagar)
  PAUSA ──Abandonar confirmado──► FIM(abandonar)
```

- **Hora:** a Hora II vai de 5:00 a 10:00 (doc 02 §3). O marco que fecha a Hora N acontece no 1º minuto da Hora N+1, e a Fogueira que vem depois dele é a "Fogueira da Hora N" (brief §5.4).
- **MARCO:**
  - a **arena [proposta]** tem centro na posição do jogador quando se forma e raio de 7 corpos (224 px). O centro e `arenaAtiva` ficam no estado, no hash e no save;
  - os obstáculos dentro da arena são desligados e a massa que está dentro morre (brief §5.8, Q-02);
  - a borda é colisão circular para os inimigos de fora ("ninguém novo entra"); se ela também prende o jogador é a §15, item 14;
  - as convocações nascem dentro da arena, em volta do convocador (raio a fechar nas §11.3 F-008/F-009);
  - o relógio corre (Q-01). Quando o último Coroado morre, a arena se desfaz, os baús caem (1 por Coroado) e a Fogueira acende a 3 corpos do jogador;
  - **marco vencido pelo relógio [proposta, §15 item 7]:** se o relógio chega a 10:00, 15:00 ou 20:00 com Coroados vivos, os Coroados restantes viram cinza (sem baú), a Fogueira desse marco não acende e começa o marco seguinte (ou o CHEFE). Com isso nunca há duas arenas, e a Vigília sempre chega às 20:00 e às 23:00. Teste: o Guardião I vivo até 10:00 leva a MARCO(chefe_menor); o Guardião II vivo até 20:00 leva a CHEFE, e 23:00 leva a A_FOME.
- **FOGUEIRA:**
  - o passo roda e o relógio para; os inimigos ficam parados e acinzentados (doc 07 §4); o autosave acontece ao abrir (Q-03);
  - Descansar, Forjar e Partir; sair do raio equivale a Partir, com autosave, e a Fogueira se apaga (Q-24);
  - se o jogador não entrar, ela fica acesa até o próximo marco (Q-24). **[proposta, §15 item 8]** A Fogueira da Hora III, para a qual não há marco seguinte, se apaga às 20:00, quando se forma a arena do Lanterneiro.
- **FIM:**
  - encerra a simulação; a cena Modal mostra o Resultado e o save meta é gravado (§10);
  - **FIM(abandonar)** dá as Almas da Vigília ×0,5, somando o `andamento`, sem mancha (doc 02 §3.2; Q-03; Q-25). O Recusar da retomada aplica a mesma regra.
- **Na simulação:** a máquina é uma função pura `transicionar(estado, eventos)` com um `enum` (`Uint8`) e timers em passos. As cenas só observam.

## 10. Save versionado e retomada (B §3.10 e §3.14; Q-03, Q-04; doc 12 §2.2 e §6)

**Três registros**, todos com `versao` (inteiro), `seq` (contador monotônico) e `soma` (FNV-1a do conteúdo):

| Registro | Conteúdo | Quando grava |
|---|---|---|
| `meta` | Almas, Brasas, ranks da árvore e ranks globais, mancha (`{x, y, hora, rotulo, almas}` ou null), tutoriais vistos, "1º Apagar feito", opções (som, flashes, números de dano), `vigiliasConcluidas`, `conviteRecusadoEm`, `proximaIdVigilia`, `ultimaEncerrada` | Fim da Vigília; compra e reembolso de Pesquisa; opção alterada; tutorial cumprido; junto com o `vigilia` seguinte a uma recuperação de mancha (confirmação, Q-03) |
| `vigilia` | `idVigilia` + **estado completo da simulação** em forma estruturada e migrável: seed, estados de RNG, parâmetros (TETO, tutoriais), relógio, `I`, build, nível, XP, Almas, Frascos, HP, posição, Fogueira (ações já usadas), mancha recuperada (pendente) e todos os slots vivos de inimigos, projéteis, efeitos e pickups | No passo 0 (ponto de retomada da Hora I); ao abrir a Fogueira; depois de cada ação feita nela; ao Partir ou sair do raio (Q-03; doc 12 §2.2) |
| `andamento` | Vigília em curso: `idVigilia`, Almas da Hora atual, Hora, posição e `seq` do último `vigilia` | A cada 60 s de jogo (B §3.10); em `visibilitychange`/`pagehide` |

- **O save do Partir e o da saída do raio** gravam o estado do **último passo antes da transição FOGUEIRA → HORA**: jogador dentro do raio, Fogueira acesa, ações já usadas. Assim, a retomada sempre volta à Fogueira (Q-03), e a restauração exata e o teste de hash continuam valendo.
- **Retomada:**
  - na Tela de Acender, se existir um `vigilia` válido cuja `idVigilia` seja diferente de `meta.ultimaEncerrada`, aparece a oferta "Continuar da Fogueira da Hora N";
  - **Continuar** restaura o estado salvo bit a bit (teste: o hash depois de restaurar é igual ao do estado gravado), com o jogador dentro do raio e as ações já usadas marcadas (Q-03);
  - **na Hora I**, o ponto de retomada é o `vigilia` do passo 0;
  - **Recusar** = FIM(abandonar) (§9).
- **Mancha:** se a retomada desfaz uma recuperação de mancha, a mancha volta ao mapa. A recuperação só é confirmada no `meta` junto com o `vigilia` seguinte ou com o FIM (Q-03).
- **Armazenamento:**
  - IndexedDB, banco `vigilia-das-cinzas`, store `saves`, chaves `meta`, `vigilia` e `andamento`;
  - **snapshot** em `localStorage` (`vdc.meta`, `vdc.vigilia`, `vdc.andamento`), gravado na mesma hora;
  - na leitura vale o registro de maior `seq` com `soma` válida;
  - ao rodar como PWA, `navigator.storage.persist()` (§12).
- **Fim da Vigília (atomicidade) [proposta]:**
  - o `meta` (com `ultimaEncerrada = idVigilia`, as Almas creditadas e a mancha) e a remoção do `vigilia` e do `andamento` vão numa única transação `readwrite` do IndexedDB;
  - no `localStorage`, grava-se primeiro o `vdc.meta` e depois se removem os outros dois;
  - na leitura, um `vigilia` com a `idVigilia` de `meta.ultimaEncerrada` é descartado. Assim, a mesma Vigília nunca é creditada e oferecida de novo.
- **Migração:** uma lista de funções puras `vN → vN+1` em `src/logica/save/migracoes.ts`, com teste por versão (B F-008: "migração de versão").
- **Serialização** em `src/logica/save/` (pura, testada no Vitest). O I/O fica em `src/plataforma/armazenamento.ts`.

## 11. Render (Phaser 4.2.1)

- **Canvas** (skill `scale-and-responsive`; ScaleManager.js):
  - backing store **fixo em 780 × 1688** (390 × 844 × 2), com `scale.mode = Phaser.Scale.FIT`, `parent: 'jogo'` (um div próprio, nunca o `body`), `autoCenter: CENTER_BOTH`, `expandParent: false`;
  - **nunca** usar `setGameSize`/`resize` nem os modos RESIZE/EXPAND, que reescrevem `canvas.width`/`height`, o vazamento do iOS;
  - o Phaser 4 não tem `resolution` e não usa `devicePixelRatio` para criar o canvas, então o limite de 2× sai da própria construção;
  - as câmeras usam `setZoom(2)` + `centerOn(...)`, e todo o código de jogo trabalha em pontos lógicos 390 × 844;
  - na aba do Safari, o FIT gera faixas laterais (letterbox) na cor #1a1f2b; instalado como PWA, a proporção quase coincide.
- **Horda, projéteis, pickups, telegrafos e partículas: `SpriteGPULayer` com escrita direta por frame no buffer de instâncias.**
  - *Camadas:* 4 a 5 (mundo: chão, obstáculos e pickups; horda; jogador, projéteis e telegrafos; partículas com blend ADD; dígitos de dano). Cada uma tem capacidade fixa igual ao teto do orçamento, preenchida no boot com `addMember`.
  - *A cada frame:* o sincronizador copia o estado interpolado para `layer.submitterNode.instanceBufferLayout.buffer.viewF32/viewU32` e chama `setAllSegmentsNeedUpdate()`. Stride = `getDataByteSize()/4` = 42 floats; layout descrito no JSDoc de `getMemberData`; os slots mortos ficam com escala e alpha 0, como o código documenta.
  - *Wrap:* cada entidade é escrita na cópia mais próxima da câmera: `x' = camX + m − W/2`, com `m = (x − camX + W/2) % W` e, se `m < 0`, `m += W` (o mesmo em y, com H). O `%` do JS preserva o sinal do dividendo; sem a correção, `camX = 1.100` e `x = 50` dariam 50, fora da vista, em vez de 1.220. Teste: `camX` perto de W com `x` perto de 0, e o mesmo em y.
  - *Ordem de desenho:* dentro de uma camada vale a ordem do buffer.
  - *Custo medido* (V8 desktop, 1.500 quads): ≈ 0,014 ms de sincronização + 0,08 ms de render além da cena vazia, 1 draw call por camada; o pool de `Image` custou ≈ 0,6 a 0,9 ms. A imagem saiu idêntica pixel a pixel nos dois casos.
  - *Contra:* a escrita por frame vai contra a recomendação do código ("Avoid changing the contents of the SpriteGPULayer frequently"; buffer criado como `STATIC_DRAW`, SubmitterSpriteGPULayer.js:206-207) e depende do layout de 42 floats, que já mudou num beta do v4.
  - *Mitigações:* versão fixada em 4.2.1; um teste confere os offsets via `getMemberData()`; **plano B** atrás da mesma interface, `?render=image` (pool de `Image` dentro de `this.add.layer()`, no mesmo atlas, com escrita direta de propriedades); validação no iPhone no build de teste pós-F-006 (Q-29).
  - *Se o iPhone mostrar custo alto:* o 1º recurso é usar `DYNAMIC_DRAW`, pelo caminho interno (a API pública não oferece isso; o submitter nasce com config vazio, SpriteGPULayer.js:377): no boot, antes do `addMember`, `buffer.bufferUsage = gl.DYNAMIC_DRAW` e `layer.resize(capacidade)`, que refaz o `gl.bufferData` e recria `viewF32`/`viewU32`; o sincronizador só guarda as views depois disso. O teste de offsets cobre também esse caminho. O 2º recurso é o plano B.
- **Atlas único**, gerado no boot:
  - `this.textures.createCanvas('atlas', 512, 512)` **[proposta: 512²]** + Canvas 2D: círculo, quadrado, triângulo, retângulo, projétil, partícula, cunhas e anéis de telegrafo, dígitos 0 a 9;
  - tudo em branco e a 2×, com a cor via tint e molduras registradas com `Texture#add`;
  - **`atlas.refresh()`** uma vez depois de desenhar: no WebGL o canvas sobe para a GPU só na criação da textura, ainda vazio, e o que se desenha depois só chega com `CanvasTexture#refresh()` (CanvasTexture.js:521);
  - no iPhone, `autoMobileTextures` limita o batch a 1 textura (RenderNodeManager.js:140): **tudo no mesmo atlas**.
- **Proibido no caminho quente:** `Graphics` ou `Shape` redesenhados por frame (bench: 11 a 102 ms e > 12 MB/frame para 1.500 formas), `ParticleEmitter` (roda fora do passo e aloca por frame), `Text` por número de dano, `Blitter` (não escala nem rotaciona).
- **Textos de UI e lint de strings:**
  - HUD numérico com os dígitos do atlas;
  - rótulos, cartas, Fogueira, Resultado e Santuário usam `Text` com `resolution: 2` (precisa de acentos), criados uma vez por tela e alterados só quando o valor muda. Fonte provisória: do sistema;
  - todo texto visível sai de uma função única, `t(id, params?)`, em `src/cenas/textos.ts`, que lê o `pt-BR.json` carregado no Boot; um ID ausente falha no boot e no Vitest;
  - **lint de strings [proposta]** (regra própria do ESLint em `src/cenas`, `src/entrada` e `src/plataforma`): um literal string só é aceito como argumento de `t()`, e precisa casar com a regex da Q-32 e existir no `pt-BR.json`; `this.add.text`, `setText` e os construtores de UI não aceitam literal nem template. Ficam fora da regra os IDs de dados (ex.: `oco_das_lanternas`), os nomes de evento e as chaves de JSON e de armazenamento, que nunca chegam à tela;
  - o lint de **palavras proibidas** segue a Q-31;
  - o `verify.sh` grava o relatório dos dois lints em `production/evidencias/F-010/`.
- **Aquecimento:** a Tela de Acender desenha uma vez todas as camadas, fora da vista, para compilar os shaders antes da Vigília (a 1ª compilação custou ≈ 1,3 s no bench).
- **Draw calls estimados:** 4 a 5 camadas + chão + HUD + Modal ≈ 10 a 25. O limite é ≤ 150 (B).
- **Escopo do "zero alocação":** vale para o **nosso** código. O próprio Phaser 4.2.1 aloca ≈ 6,6 KB/frame numa cena vazia, mais ≈ 3 KB por `SpriteGPULayer`. O teste de heap da F-003 aceita esse serrilhado pequeno e constante e exige que não haja **crescimento** em 60 s (B F-003).

### 11.1 Cenas (skill `scenes`)

| Cena | Plugins | Papel |
|---|---|---|
| `Boot` | Loader | Gera o atlas, sintetiza os SFX, carrega os JSON e o `pt-BR.json` |
| `Acender` | — | "Toque para acender a Chama" (o toque é tratado pela camada DOM, §12); oferta de retomada; aviso da chave de silêncio; aquece os shaders; roda a sonda do TETO (§13) |
| `Santuario` | TweenManager | Iselda, árvore de Fundação, botão Vigília |
| `Vigilia` | TweenManager | Driver do passo fixo e câmera do mundo; sincroniza as camadas |
| `Hud` | TweenManager | HUD de 390 × 844 lógicos, câmera própria com zoom 2, ancorado na safe-area (§12) |
| `Modal` | TweenManager | Level up, Fogueira, pausa, Resultado, retomada |

- No máximo **3** cenas desenhando ao mesmo tempo: Vigilia, Hud e Modal. As outras usam `sleep`/`wake`.
- Como `init()` não roda de novo no `wake`, o reset fica no evento `WAKE`.
- **Nenhuma** cena usa o `InputPlugin` do Phaser, em nenhuma build (§12).

## 12. Entrada, safe-area, áudio, visibilidade, PWA e onde roda a simulação

- **Entrada própria (DOM), com todo o input do Phaser desligado:**
  - *Config:* `input: { touch: false, mouse: false, keyboard: false, gamepad: false, windowEvents: false }`. Por padrão o Phaser tem só 1 pointer de toque e descarta o 2º dedo em silêncio (InputManager.js:560-586), e aloca a cada evento. Em DEV, mouse e teclado entram pela mesma camada DOM de `src/entrada`.
  - *Listeners:* `touchstart`, `touchmove`, `touchend` e `touchcancel` no canvas com `{ passive: false }` e `preventDefault()`. No `document`: `touchmove`, `gesturestart`, `gesturechange` e `contextmenu`, para bloquear pull-to-refresh, zoom e callout.
  - *CSS:* `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `overscroll-behavior: none`, `#jogo { position: fixed; inset: 0; height: 100dvh }`, `html, body { margin: 0; height: 100%; overflow: hidden }`.
  - *Fila:* os handlers só copiam `identifier`, posição em pt e `timeStamp` para um anel `Float64Array`, sem alocar e sem `stopPropagation`.
  - *Tradução:* a cada passo, o `TradutorDeGestos` (slots fixos de dedos) converte a fila em `ComandosDoPasso`: movimento com zona morta de 0,15 e raio de 60 pt (B); esquiva quando a velocidade passa de 400 pt/s (Δposição/Δ`timeStamp`, janela: §11.3 F-006) ou com toque duplo; aparo, Frasco, pausa e carta tocada como bordas travadas. Um toque curto entre dois frames ainda gera exatamente 1 passo de aparo.
  - *Reconciliação:* a cada `touchstart` os slots são conferidos com `e.touches`, para soltar dedos "presos" (doc 12 §2.6).
  - *UI:* o hit-test é nosso, numa tabela de alvos em pt. Um teste falha se algum alvo tiver menos de 72 pt (B §3.5).
  - *Pausa:* o gesto de dois dedos só conta toques que não começaram no joystick nem num botão (Q-25).
  - *Replay:* a simulação só lê `ComandosDoPasso`. Gravá-los por passo dá replay e testes determinísticos.
- **Viewport e safe-area (B §3.14; F-001):**
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`;
  - os insets são lidos de um elemento sonda (`position: fixed; inset: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); visibility: hidden; pointer-events: none`) com `getComputedStyle`, no boot e em `resize`/`orientationchange`. O canvas não muda; só as âncoras são recalculadas;
  - em `src/plataforma`, cada inset em px CSS vira pt lógicos: desconta-se a faixa do letterbox daquele lado e aplica-se o fator do FIT. Exemplo: `topo = max(0, insetTop − scale.canvasBounds.top) × scale.displayScale.y / 2`;
  - o `Hud` e a tabela de hit-test ancoram nesses insets: o HUD superior fica abaixo do inset de cima (Dynamic Island); o Aparo e o Frasco ficam acima do inset de baixo (B §3.5);
  - teste: com insets não nulos, nenhum alvo cai dentro deles.
- **Áudio:**
  - *Desbloqueio:* dentro do próprio handler de `touchend` da Tela de Acender, de forma síncrona: `navigator.audioSession.type = 'playback'` quando existir, senão o `<audio>` silencioso em loop (doc 12 §2.3); depois `sound.context.resume()`. Se o Phaser continuar `locked`, marca-se o campo `unlocked`, que é privado e coberto por teste.
  - *Teste da F-001:* `__GAME_DEBUG__.audio()` deve devolver `'running'`. O Chromium do Playwright roda com `--autoplay-policy=user-gesture-required`, para o teste não passar sem o toque.
  - *SFX placeholder:* 3 `AudioBuffer` sintetizados no boot por funções TS puras, testáveis por hash. Cada disparo cria 1 `AudioBufferSourceNode` → barramento pré-alocado → `sound.destination`, com limite de vozes e intervalo mínimo por SFX. É a única alocação, e fica fora do caminho quente da simulação.
  - *Ícone de áudio visível* e aviso da chave de silêncio na Tela de Acender (doc 12 §8; doc 11 §3.1).
- **Visibilidade e interrupção:**
  - `Phaser.Core.Events.HIDDEN` e `BLUR`, `pagehide` e `statechange` do `AudioContext` (estado `'interrupted'`) → **pausa automática** da simulação + gravação do `andamento`;
  - a retomada é só por toque, nunca automática;
  - na pausa o som é silenciado com `setMute`/`pauseAll`, nunca com `ctx.suspend()`, que o Phaser desfaz a cada frame;
  - nunca atribuir `window.onblur` nem `window.onfocus`, que o Phaser usa (VisibilityHandler.js:77 e :82); usar `addEventListener`.
- **Paisagem:** overlay DOM "gire o aparelho" por media query, com a simulação pausada. O canvas não é tocado.
- **Wake Lock:** fallback com `<video>` invisível, `playsinline` e em loop, iniciado no gesto da Tela de Acender (B §3.14).
- **PWA (B §3.14; F-010):**
  - `manifest.webmanifest` com `display: standalone`;
  - standalone detectado em `src/plataforma` por `navigator.standalone` ou `matchMedia('(display-mode: standalone)')`; quando dá verdadeiro, chama `navigator.storage.persist()`;
  - **service worker [proposta]:** precache versionado por build, com o mesmo identificador de build do cache do TETO (§13). Uma versão nova só assume no próximo boot, nunca no meio de uma Vigília, e um `vigilia` de versão anterior passa pelas migrações (§10);
  - **convite "Adicionar à Tela de Início":** fora do standalone, depois da 1ª Vigília concluída; se recusado, repete após 5 Vigílias (brief §5.12; estado em `meta`).
- **Worker: não no MVP.** A simulação roda na thread principal, **isolada como se estivesse num Worker**: estado num `ArrayBuffer`, entrada só por `ComandosDoPasso`, saída só por views + anel de eventos. Os motivos:
  1. O Phaser 4.2.1 não renderiza fora da thread principal (0 ocorrências de `OffscreenCanvas` em `src/`), então um Worker levaria só a simulação, que é a parte barata. A sonda sintética deu ≈ 0,085 ms por passo com 500 inimigos + 400 projéteis no V8 desktop.
  2. Sem `SharedArrayBuffer` (doc 12 §2.5), o Worker soma **1 frame** de latência ao aparo e à esquiva (17 ms a 60 fps, 33 ms a 30 fps), o que ameaça o critério de sucesso do marco. Há também jitter de mensagem: RTT p95 de 5,8 a 7,5 ms no Chromium com CPU 4×.
  3. Depuração, `__GAME_DEBUG__` e Playwright ficam síncronos.
- **Critério para migrar [proposta: números]:** medir no iPhone 11/12, Hora IV com TETO cheio por 60 s, em janelas de 60 frames (o `performance.now` do Safari tem 1 ms de resolução). Migrar se **p95 da CPU do frame > 10 ms** (o orçamento de B) E **p95 da simulação ≥ 3 ms** E **p95(frame − simulação) + 1 ms < 10 ms**. Se o excesso vier do render, o Worker não resolve.

## 13. TETO: 300 ou 500 (B §3.7 e §3.13)

- **Por que não detectar o modelo:**
  - B cita "`deviceMemory`/benchmark", mas `navigator.deviceMemory` **não existe no Safari** (MDN BCD);
  - `hardwareConcurrency` devolve 4 em todo iPhone (WebKit NavigatorBase.cpp);
  - `UNMASKED_RENDERER` devolve sempre "Apple GPU".
- **Detecção em camadas:**
  1. **Override de teste:** `?teto=300|500`.
  2. **Cache** numa chave própria do `localStorage` (`vdc.teto`, fora do `meta`), por build + token `Version/` do Safari + classe de tela. O "OS xx" do user agent está congelado no Safari 26. A chave é gravada ao fim da sonda (exceto com o rAF a 30 fps) e no rebaixamento.
  3. **Classe de tela [proposta]:** DPR 2, ou largura ≤ 375 pt, ou 414 × 896 → **300** direto (aparelhos anteriores ao iPhone 12).
  4. **Sonda de boot**, na Tela de Acender, depois que os assets carregaram: 120 passos de aquecimento + 8 lotes de 30 passos **[proposta]** da **simulação real** com 500 inimigos + 400 projéteis, num estado descartável. Se a mediana for ≤ **2 ms por passo [proposta, provisório: calibrar na F-010 com iPhone 12 e 14]**, o TETO é 500; senão, 300. A sonda tem teto de 800 ms **[proposta]**; passou disso, 300.
  5. **Fallback:** 300.
- **Rebaixamento:** se a degradação graciosa chegar ao nível 3 numa Vigília com TETO 500, `vdc.teto` passa para 300.
- **TETO fixo por Vigília:** é parâmetro da simulação, gravado no save e no replay. O futuro desafio diário (F-016) usa TETO fixo em 300.
- **Limitação conhecida:** a sonda provavelmente não separa o iPhone 12 do 14, que diferem ≈ 8% em single-core. Um iPhone 12 pode começar com 500 até a primeira degradação; o custo é pequeno, porque no MVP o mínimo da tabela é 300 e `min × I` chega a 330.
- **Debug:** `__GAME_DEBUG__.teto = { valor, origem: 'override'|'cache'|'tela'|'sonda'|'fallback', sondaMs }`.

## 14. Degradação graciosa, debug e testes (B §3.13; F-001 a F-010)

- **Medida [proposta, §15 item 11]:**
  - CPU do frame = `performance.now()` de `PRE_STEP` a `POST_RENDER`, agregada em janelas. Usa CPU e não o intervalo entre rAFs, para que o Low Power Mode (rAF a 33 ms) não dispare a degradação sem necessidade;
  - isso diverge do "frame time" do doc 12 §4.1: a CPU de JS não inclui o trabalho da GPU, que roda de forma assíncrona, então um gargalo de fill rate não dispara os níveis 1 e 2.
- **Gatilho (B):** média > 16 ms por 2 s → sobe um nível.
  1. Reduz partículas (o teto do anel cai pela metade **[proposta]**).
  2. Desliga a luz e os gradientes aditivos.
  3. Converte a massa excedente em Ocos Grandes ("a Fome engrossa", B §3.13). Como o nível 3 define o novo limite de massa é a **§15, item 10**.
- **Determinismo do nível 3:** como muda a simulação, o nível chega a ela como campo de `ComandosDoPasso` (gravado no replay e no save). Os níveis 1 e 2 são só render.
- **Volta [proposta]:** desce um nível depois de 10 s com média < 10 ms (o orçamento de B).
- **`window.__GAME_DEBUG__`** (sempre presente; os ganchos de escrita só no build de debug):
  - `fps`, `passo`, `relogio`, `estado`;
  - `vivos` por tipo (`{ oco_das_lanternas, oco_grande, novica_de_sal, oco_grande_coroado, o_lanterneiro, projeteis, efeitos, pickups, particulas }`);
  - `passos_perdidos` (nome de B), `recusados` por pool, `memoriaEstimadaMB` (pools + atlas + backbuffer, porque `performance.memory` não existe no Safari);
  - `cpuFrameMs` (p50/p95 da janela), `teto`, `degradacao`, `seed`, `hash()`, `audio()`, `toquesPerdidos`;
  - `jogador` (`{ x, y, hp, stamina, nivel, xp }`);
  - `entrada.joystick` (`{ ativo, origemX, origemY }`, em pt);
  - `chefe` (`{ tipo, hp, hpMax, fase, postura, posturaMax, quebradaPassos, transicaoPassos, furia }`, ou `null`), para a F-009;
  - `save` (`{ seq, hash }` do último `vigilia`), para a F-008;
  - `ultimosEventos` (cópia do anel de eventos, com o passo de cada um, inclusive "telegrafo iniciado") e `eventos` (telemetria local do doc 10 §6, Q-30);
  - ganchos de debug: `entrada.injetar(tipo, id, x, y, t)` (swipe sintético com timestamps controlados) e `avancar(n)` (com a simulação pausada).
- **Builds [proposta]:** o build de teste do GitHub Pages (Q-29) é um **build de debug** e aceita os parâmetros abaixo; o build de produção ignora todos.
- **Parâmetros de URL (só no build de debug) [proposta]:**
  - `?seed=N` (o `--seed` do `verify.sh`), `?teto=300|500`, `?render=gpu|image`, `?tutorial=0`, `?debug=1`;
  - `?inicio=MM:SS`: começa a Vigília no minuto pedido, com Aldric no estado de início (nível 1, só a Espada Longa, `I` = 1,0, 3 Frascos, HP cheio, 0 Almas) e com a máquina no estado que a timeline dá para esse minuto. O `vigilia` do primeiro passo é gravado como o do passo 0;
  - `?cenario=<id>`: carrega um estado pronto de `src/dados/cenarios/<id>.json`, no formato do `vigilia` (§10), validado pelo mesmo JSON Schema e pelas mesmas migrações. A build exata de cada cenário é aprovada na feature:
    - `horda` (F-003): jogador invulnerável e sem armas, linha 19 do diretor fixa (mínimo 300, sem marco nem chefe), TETO pelo `?teto=`. Serve para "300 vivos e `fps` ≥ 55 por 30 s com CPU 4×" e para o heap snapshot de 60 s, e continua válido depois das F-004, F-007 e F-009;
    - `fogueira_hora1` (F-008): dentro do raio da Fogueira da Hora I, para Partir, fechar a página na Hora II e reabrir;
    - `lanterneiro` (F-009): 20:00, nível 29 (doc 10 §3.1), com uma build que dê o DPS-alvo de ≈ 2.000 do minuto 20 (doc 10 §3.1), para lutar 60 s e chegar ao Amanhecer.
- **Medida em aparelho (F-010) [proposta]:**
  - com `?debug=1`, um overlay DOM (fora do canvas) mostra o fps instantâneo e o fps médio da Hora corrente, para aparecer no vídeo;
  - ao fim de cada Vigília, o evento `sessao` (doc 10 §6) registra o fps médio por Hora, e o `erro_recuperacao` marca uma Vigília interrompida por recarga da aba.
- **`verify.sh --taps-game`:** roda o projeto do Playwright com `hasTouch: true` e `isMobile: true` em 390 × 844, dirigindo o jogo por toques reais (CDP `Input.dispatchTouchEvent`) ou por `entrada.injetar`.

## 15. Pontos confirmados (aprovados em 2026-10-10)

1. **Combinação das Q-01, Q-02 e Q-09:** o mínimo do minuto de marco só vale depois que a arena se desfaz (§8).
2. **Constantes técnicas [proposta]:**
   - célula da grade de 64 px;
   - pools: 500 inimigos, 400 projéteis + 64 efeitos dentro do limite somado, 512 pickups com junção na Cinza mais próxima, 600 partículas, 96 números de dano; pool cheio = spawn recusado;
   - anel de 1.024 eventos;
   - conversão de segundos em passos por arredondamento, com o congelamento de 80 ms valendo 5 passos e congelando também o relógio;
   - subfluxos de RNG por nível e por baú;
   - trilha de hash a cada 100 passos;
   - atlas de 512 × 512;
   - critério do Worker: 60 s de medida, janelas de 60 frames, simulação ≥ 3 ms, folga de 1 ms;
   - TETO: classe de tela (DPR 2, largura ≤ 375 pt, 414 × 896), sonda (120 passos de aquecimento + 8 lotes de 30 passos, teto de 800 ms, limiar provisório de 2 ms por passo);
   - degradação: nível 1 = partículas pela metade; volta depois de 10 s abaixo de 10 ms;
   - arena: raio de colisão de 7 corpos centrado no jogador;
   - atomicidade do FIM (`idVigilia`/`ultimaEncerrada`);
   - service worker com precache por build.
3. **SpriteGPULayer com escrita direta** como caminho principal, com o plano B (pool de `Image`) atrás de `?render=image` e validação no iPhone no build de teste pós-F-006.
4. **Retomada exata:** o save da Fogueira (inclusive o do Partir e o da saída do raio) guarda o estado completo da simulação no último passo dentro do raio, e a retomada continua idêntica (mesmo hash).
5. **Parâmetros de teste por URL e cenários** (`horda`, `fogueira_hora1`, `lanterneiro`), só no build de debug, incluindo o de teste do GitHub Pages.
6. **Simulação na thread principal**, com o contrato pronto para Worker e o critério de migração do §12.
7. **Marco vencido pelo relógio:** Coroados ainda vivos no marco seguinte (ou às 20:00) viram cinza, sem baú, e a Fogueira daquele marco não acende. Nunca há duas arenas.
8. **Fogueira da Hora III ignorada:** se apaga às 20:00.
9. **Excedente:** o convertido ocupa 1 slot e vale 10 para o mínimo; o resto menor que 10 é descartado; as Almas são 10 sorteios de 50% na morte (§8.7).
10. **Nível 3 da degradação:** B só diz "converte massa excedente em Ocos Grandes". É preciso definir o novo limite de massa sem depender do instante em que o nível dispara. Opção A: TETO efetivo = `min_efetivo` da linha corrente sem o fator `I`. Opção B: uma fração fixa do TETO, com o valor a definir por você. **Não tenho recomendação de número:** prefiro a A, porque não inventa número.
11. **Medida da degradação:** só a CPU de JS (§14), ou também o intervalo entre rAFs, separando o Low Power Mode (rAF estável a 30 fps). Recomendo só a CPU no MVP e medir o fill rate no aparelho.
12. **Sal:** aplicação direta, que é a leitura de B ("facas aplicam Sal", "deixa Sal" e o teste da F-004 "reduz velocidade em 50% por 3 s"), ou acúmulo até 100 (doc 04 §8, pela Q-00, mas sem números de acúmulo)? Recomendo a aplicação direta.
13. **Pool de inimigos com capacidade física 500** nos dois TETOs, divergindo do texto da Q-08 (a), que diz "capacidade = TETO".
14. **A névoa da arena prende o jogador?** Recomendo que sim: "parede de névoa fecha um círculo" (doc 06 §1) e "arena fechada" (doc 02 §3).
15. **Lint de strings** com a função única `t(id)` (§11).
16. **Tutoriais como parâmetro da Vigília** (§3), e a janela +0,1 s só com o prompt ativo.

## 16. Consequências

- **Positivas:**
  - a simulação é testável no Vitest sem navegador, determinística e com replay;
  - o render da horda cabe com folga no orçamento de draw calls;
  - mover a simulação para Worker depois é trocar o driver;
  - conteúdo novo entra como JSON;
  - as evidências das F-003, F-008 e F-009 têm caminho reproduzível (cenários).
- **Negativas e riscos:**
  - escrita direta por frame no buffer do `SpriteGPULayer`, contra a recomendação documentada, e dependência do layout de 42 floats do JSDoc de `getMemberData`, que já mudou num beta do v4 (mitigadas pelo plano B e pelo teste de offsets) e, se o `DYNAMIC_DRAW` for usado, da troca de `bufferUsage` por fora da API;
  - entrada e hit-test de UI próprios (mais código);
  - campo privado `unlocked` do som (coberto por teste);
  - a sonda do TETO pode errar entre iPhone 12 e 14 (mitigada pelo rebaixamento);
  - o "zero alocação" vale só para o nosso código.
- **Fica para medir em aparelho (build pós-F-006 e F-010):**
  - custo do `bufferSubData` por frame no Safari/Metal;
  - se `blur` dispara no iOS ao abrir a Central de Controle;
  - estado do `AudioContext` depois de uma ligação;
  - efeito do `<audio>` silencioso e do `audioSession`;
  - fill rate a 2× com a horda cheia;
  - limiar da sonda do TETO.

---

## Apêndice A — Timeline da Charneca (JSON derivado do brief §5.4)

```json
{
  "id": "charneca_das_lanternas",
  "nome_id": "D1.CHARNECA.NOME",
  "sem_spawn_antes_do_marco_s": 30,
  "a_fome_em_s": 1380,
  "obstaculos": [],
  "linhas": [
    { "minuto": 0,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }], "min_na_tela": 15, "intervalo_s": 2.0 },
    { "minuto": 1,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }, { "inimigo": "oco_grande", "peso": 1 }], "min_na_tela": 25, "intervalo_s": 1.6,
      "garantidos": [{ "inimigo": "oco_grande", "quantidade": 1, "tutorial": "esquiva" }] },
    { "minuto": 2,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }, { "inimigo": "oco_grande", "peso": 1 }], "min_na_tela": 35, "intervalo_s": 1.4 },
    { "minuto": 3,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }, { "inimigo": "oco_grande", "peso": 1 }, { "inimigo": "novica_de_sal", "peso": 2 }], "min_na_tela": 45, "intervalo_s": 1.2,
      "garantidos": [{ "inimigo": "novica_de_sal", "quantidade": 1, "tutorial": "aparo" }] },
    { "minuto": 4,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }, { "inimigo": "oco_grande", "peso": 1 }, { "inimigo": "novica_de_sal", "peso": 2 }], "min_na_tela": 55, "intervalo_s": 1.0 },
    { "minuto": 5,  "roster": [], "min_na_tela": 40, "intervalo_s": null,
      "marco": { "tipo": "guardiao", "indice": 1, "inimigos": [{ "inimigo": "oco_grande_coroado", "hp_base": 600, "quantidade": 1 }], "bau": "comum" } },
    { "minuto": 6,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 8 }, { "inimigo": "oco_grande", "peso": 3 }, { "inimigo": "novica_de_sal", "peso": 3 }], "min_na_tela": 70,  "intervalo_s": 0.9 },
    { "minuto": 7,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 8 }, { "inimigo": "oco_grande", "peso": 3 }, { "inimigo": "novica_de_sal", "peso": 3 }], "min_na_tela": 80,  "intervalo_s": 0.8 },
    { "minuto": 8,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 8 }, { "inimigo": "oco_grande", "peso": 3 }, { "inimigo": "novica_de_sal", "peso": 3 }], "min_na_tela": 90,  "intervalo_s": 0.8 },
    { "minuto": 9,  "roster": [{ "inimigo": "oco_das_lanternas", "peso": 8 }, { "inimigo": "oco_grande", "peso": 3 }, { "inimigo": "novica_de_sal", "peso": 3 }], "min_na_tela": 100, "intervalo_s": 0.7 },
    { "minuto": 10, "roster": [], "min_na_tela": 60, "intervalo_s": null,
      "marco": { "tipo": "chefe_menor", "indice": 1, "inimigos": [{ "inimigo": "oco_grande_coroado", "hp_base": 1000, "quantidade": 1 }], "bau": "dourado" } },
    { "minuto": 11, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 4 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 120, "intervalo_s": 0.6 },
    { "minuto": 12, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 4 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 140, "intervalo_s": 0.6 },
    { "minuto": 13, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 4 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 160, "intervalo_s": 0.5 },
    { "minuto": 14, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 4 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 180, "intervalo_s": 0.5 },
    { "minuto": 15, "roster": [], "min_na_tela": 80, "intervalo_s": null,
      "marco": { "tipo": "guardiao", "indice": 2, "inimigos": [{ "inimigo": "oco_grande_coroado", "hp_base": 600, "quantidade": 2 }], "bau": "comum" } },
    { "minuto": 16, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 5 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 200, "intervalo_s": 0.45, "escurecer_pct": 10 },
    { "minuto": 17, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 5 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 230, "intervalo_s": 0.40, "escurecer_pct": 10 },
    { "minuto": 18, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 5 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 260, "intervalo_s": 0.40, "escurecer_pct": 10 },
    { "minuto": 19, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 6 }, { "inimigo": "oco_grande", "peso": 5 }, { "inimigo": "novica_de_sal", "peso": 4 }], "min_na_tela": 300, "intervalo_s": 0.35, "escurecer_pct": 10 },
    { "minuto": 20, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }], "min_na_tela": 300, "intervalo_s": 0.3,
      "chefe": { "inimigo": "o_lanterneiro", "hp_base": 6500 } },
    { "minuto": 21, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }], "min_na_tela": 300, "intervalo_s": 0.3 },
    { "minuto": 22, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }], "min_na_tela": 300, "intervalo_s": 0.3 }
  ]
}
```

- **"bau": "comum"** no Guardião II significa 1 baú **por Coroado**: 2 no total (brief §5.4).
- **Linhas 20 a 22:** existem para os modos futuros, mas a arena do Lanterneiro as suspende no MVP (Q-09).
- **`escurecer_pct`:** 10% por minuto, acumulado (B §3.7).
- **`a_fome_em_s`:** 1.380 s = 23:00.
- **`obstaculos`:** preenchido na F-002.
- **Validação:** o JSON Schema e o teste de integridade da etapa 3 conferem que todo `inimigo` existe em `inimigos.json` e que os números batem com esta tabela.
