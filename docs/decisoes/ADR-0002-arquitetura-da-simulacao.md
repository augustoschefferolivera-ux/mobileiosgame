# ADR-0002 — Arquitetura da simulação, do render e da persistência

- **Status:** proposto, aguardando aprovação (Sessão 1, etapa 2)
- **Fontes:**
  - `design/gdd/18-briefing-tecnico.md` (**B**), §3;
  - `design/game-brief.md` (aprovado), com as decisões da §11 (Q-xx);
  - docs 02, 07, 10 e 12 do GDD;
  - skills oficiais do Phaser 4.2.1 lidas: `game-setup-and-config`, `scale-and-responsive`, `scenes`, `time-and-timers`, `v4-new-features`, `v3-to-v4-migration`, `sprites-and-images`, `graphics-and-shapes`, `groups-and-containers`, `render-textures`, `particles`, `game-object-components`, `text-and-bitmaptext`, `cameras`, `input-keyboard-mouse-touch`, `audio-and-sound`, `geometry-and-math`;
  - código-fonte do Phaser 4.2.1, conferido onde citado;
  - benchmarks feitos nesta sessão (Chromium/V8, desktop; servem só para comparar estratégias, não para prever o iPhone).
- **Convenção:** o que vem de B, do GDD ou de uma Q aprovada é citado assim. Constantes técnicas que nenhum documento dá estão marcadas como **[proposta]** e reunidas na §15 para aprovação.

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
 │ src/entrada  (fila de toques)│──► ComandosDoPasso ──► │                                   │
 │ src/plataforma (save, TETO,  │                        │  src/cenas  (Boot, Acender,       │
 │   áudio, visibilidade, PWA)  │                        │   Santuario, Vigilia, Hud, Modal) │
 └──────────────────────────────┘                        │  src/cenas/render (atlas, camadas │
                 │                                       │   SpriteGPULayer, interpolação)   │
                 ▼                                       └───────────────▲───────────────────┘
        ┌──────────────────────────────────────────────┐                 │ lê estado + eventos
        │ src/logica  (TypeScript puro, sem Phaser/DOM)│─────────────────┘
        │  passo(estado, comandos) — 60 Hz, determinístico
        │  estado = 1 ArrayBuffer com views SoA        │
        │  saída: visão de render + anel de eventos    │
        └──────────────────────────────────────────────┘
                 ▲
        src/dados/*.json (validados por JSON Schema no boot e no Vitest)
```

**Fronteiras, verificadas por lint (ESLint, regras `no-restricted-*`):**
- `src/logica/` não importa `phaser`, `src/cenas`, `src/entrada` nem `src/plataforma`.
- `src/logica/` não usa `window`, `document`, `performance`, `Date`, `requestAnimationFrame`, `setTimeout` nem `Math.random`.
- `src/logica/` não usa `Math.sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `exp`, `expm1`, `log*`, `pow`, `hypot`, `cbrt`, nem o operador `**`. O motivo está na §5.
- Só `src/cenas/` importa `phaser`. `src/plataforma/` e `src/entrada/` usam DOM, mas não Phaser, exceto pelo `AudioContext` do Phaser, que é recebido por injeção.

## 3. Laço de passo fixo (B §3.1)

- **Passo:** 1/60 s = 16,667 ms. Toda duração da simulação é contada em **passos inteiros**.
- **Conversão de segundos em passos:**
  - quando B já dá o número de passos, vale o de B: esquiva 21 (i-frames nos passos 2 a 13), recuperação 3, aparo 11, aparo falho 24, invulnerabilidade de contato 18;
  - nos demais casos, **[proposta]** arredondar para o inteiro mais próximo. Exemplos: 0,5 s = 30; 2 s = 120; 0,6 s = 36; 80 ms = 4,8 → 5, que também é a proposta da §11.3 F-006 do brief. Cada conversão fica listada num teste.
- **Driver** (em `src/cenas/Vigilia`, nunca em `src/logica`):
  - escuta `Phaser.Core.Events.STEP`, que o Phaser emite antes dos `update()` das cenas (Game.js:474-478);
  - soma `game.loop.rawDelta`, o delta bruto do rAF, sem suavização (TimeStep.js:412);
  - roda no máximo **5 passos** por frame; o excedente é descartado e somado em `passos_perdidos`;
  - o resto do acumulador vira `alfa` (0..1), usado para interpolar o render.
- **Config do loop:** `fps: { target: 60, limit: 0, forceSetTimeOut: false, smoothStep: false }`.
  - Com o `smoothStep: true` padrão, medido com o `TimeStep.js` real: a 30 fps (Low Power Mode), o delta suavizado soma 2,9 s a cada 5 s reais nos 120 frames depois de cada `focus`/`visible`.
  - `fps.limit: 60` pulou 4 de 600 frames com o rAF a 16,6 ± 0,1 ms.
- **30 fps (Low Power Mode, térmico, iframe de portal):** 2 passos por frame. O laço aguenta de 0 a 5.
- **Interpolação:** a simulação guarda `xAnt`/`yAnt` por entidade e o render desenha `ant + (atual − ant) × alfa`. Não aloca.
- **Pausas da simulação** (o passo não roda; o render continua):
  - pausa, level up e Modal: o relógio da Vigília para (B §3.1);
  - **congelamento** do aparo e da esquiva perfeita (80 ms ≈ 5 passos, §11.3 F-006): a simulação inteira congela, inclusive o relógio **[proposta]**, de forma determinística: são passos em que só o contador de congelamento anda;
  - **câmera lenta** do Apagar (1 s): é ritmo de apresentação. O driver roda 1 passo a cada k frames (fator k: §11.3 F-007); a simulação não muda.

## 4. Estado, SoA e pools

- **Um único `ArrayBuffer`**, alocado no início da Vigília, com *views* tipadas por campo (SoA). Nada é alocado durante a Vigília. Isso também deixa a migração para Worker (§12) trivial e o hash (§5) barato.
- **Posições:** `Float32Array` em px lógicos, sempre normalizadas para o toro [0, W) × [0, H), com W = 1.170 e H = 2.532 (mapa 3×3 telas, B §3.2). Números em `Float32Array` são IEEE 754, portanto determinísticos entre motores.
- **Pools e capacidades [proposta]:**

| Pool | Capacidade alocada | Limite lógico | Campos (resumo) |
|---|---|---|---|
| Inimigos (inclui Coroados e o Lanterneiro) | 500 | **TETO** da Vigília: 300 ou 500 (Q-08 (a): o TETO conta todos os vivos) | x, y, xAnt, yAnt, hp, hpMax, dano, tipo, estado, timerEstado, salPassos, salFator, quebradaPassos, alvoAtaque, geração |
| Projéteis (jogador e inimigos) | 400 | 200 ou 400 (B §3.13) | x, y, xAnt, yAnt, vx, vy, dano, vida, perfurações, dono, tipo |
| Pickups (Cinzas, Almas, baús) | 512 | 512: acima disso, a nova Cinza é **fundida** na mais próxima, somando o valor | x, y, tipo, valor |
| Efeitos de chão (onda de brasa, Lanterna Arremessada, anel da Explosão de Luz) | 64 | 64 | x, y, raio, vida, dano, tipo |
| Partículas | 600 | 300 ou 600 (B §3.13) | **fora da simulação**: pool de render, RNG cosmético, não entra no hash |
| Números de dano | 96 | 96 | **fora da simulação**: pool de render alimentado pelo anel de eventos |

- **Alocar e liberar em O(1):** pilha de índices livres (`Int32Array`) mais uma lista densa de ativos com troca e remoção. Referências entre entidades (o alvo do Contra-ataque, o dono de um projétil) usam *handle* = índice + geração (`Uint16Array`), que fica inválido quando o slot é reaproveitado.
- **Jogador:** um registro fixo de campos numéricos no mesmo buffer: posição, stamina, HP, Frascos, timers da esquiva, do aparo e da invulnerabilidade, Poder temporário, nível, XP, atributos.
- **Saída para o render:**
  - os próprios views (o render só lê);
  - um **anel de eventos** de 1.024 entradas **[proposta]** (`Uint32Array` + `Float32Array`): acerto, morte, aparo, esquiva perfeita, Quebra, level up, telegrafo iniciado, baú, Fogueira, e assim por diante. Ele alimenta som, partículas, números de dano e a telemetria local (Q-30).

## 5. Determinismo, RNG e hash

- **RNG:** **xoshiro128\*\*** (32 bits), estado `Uint32Array(4)` por fluxo. B pede "xorshift128+ ou equivalente"; o xoshiro128** é o equivalente de 32 bits da mesma família. O xorshift128+ com BigInt custou 233 ns por chamada e ~370 GCs por 1,2 M sorteios, contra 11 ns e zero alocação.
- **Semeadura:** cada fluxo recebe `splitmix32(fnv1a(seed, id_do_fluxo))`. O teste do RNG confere a implementação contra os vetores de referência dos autores.
- **Fluxos.** Os de B são `diretor` e `levelup`. Para que o consumo de um sistema não desloque a sequência de outro, a proposta acrescenta:
  - `drops` (Almas 50%);
  - `baus` (1/3/5 itens);
  - `ia` (escolha de ataque dos inimigos e do chefe);
  - `armas` (se alguma arma sortear algo).
- **Subfluxos [proposta]:** `levelup` tem um subfluxo por nível e `baus` um por baú, ambos derivados por índice. Assim, a carta oferecida no nível 12 não depende de quantas Almas caíram antes.
- **Partículas e efeitos visuais** usam um RNG cosmético nas cenas, fora do hash.
- **Aritmética exata entre motores (ECMA-262):**
  - permitidos em `src/logica`: `+ − × ÷`, `Math.sqrt`, `fround`, `imul`, `floor`, `round`, `trunc`, `abs`, `min`, `max`, `sign`;
  - proibidos por lint: `sin`, `cos`, `atan2`, `exp`, `log`, `pow`, `**` e `hypot`, que são *implementation-approximated* (o V8 usa LLVM-libc e o JSC usa a libm da Apple, que podem divergir no último ulp);
  - cones e arcos são testados por produto escalar contra cossenos **literais**: 120° → cos 60° = 0,5; 180° → 0; 60° → cos 30° = 0,8660254037844386;
  - as direções do anel de spawn vêm de uma **tabela literal** de vetores unitários, gerada offline e versionada;
  - `1,12^(rank−1)` do custo de Pesquisa é calculado por multiplicação iterativa.
- **Ordem:** a simulação nunca usa `sort` sem desempate. O "mais próximo" desempata pelo menor índice.
- **Hash:** FNV-1a de 32 bits sobre os bytes das regiões canônicas: passo, estados de RNG, jogador, slots ativos de cada pool e diretor. Custo ≈ 0,05 ms para ≈ 35 KB. Em debug há também hash por seção e uma trilha a cada 100 passos, para localizar uma divergência. Com `?debug=1`, o código verifica que não há NaN, porque a codificação de NaN em `Float32Array` não é padronizada.
- **Testes de determinismo (F-001 em diante):**
  - mesma seed, duas execuções, 1.000 passos → mesmo hash;
  - 1 passo por frame contra 5 passos por frame → mesmo hash;
  - salvar no passo 500, restaurar e continuar → mesmo hash do que sem salvar;
  - o mesmo hash de referência no Vitest (Node) e no Playwright (Chromium).

## 6. Grade espacial (B §2; F-003)

- **Grade uniforme sobre o toro**, com célula de **64 px = 2 corpos [proposta]**: 19 × 40 células, sendo a última coluna e a última linha mais estreitas. É refeita a cada passo por *counting sort*: `contagem`, `inicio` e `indicesOrdenados` em `Int32Array`. Custo O(n + células) e iteração contígua.
- **Distância no toro:**
  ```
  dx = x2 − x1
  se dx > W/2: dx −= W;   se dx < −W/2: dx += W
  (o mesmo para dy)
  ```
- **Consulta:** devolve os índices num `Int32Array` de saída pré-alocado. Raios maiores que uma célula (o Círculo de Sal chega a ≈ 3,2 corpos no nv8) percorrem mais anéis de células.
- **Teste (B F-003):** em 1.000 casos aleatórios, a grade devolve os mesmos vizinhos que a força bruta, inclusive através das bordas do toro.
- **Usos:**
  - contato inimigo–jogador;
  - acerto de projétil e de arco;
  - aura;
  - "mais próximo";
  - separação entre Ocos (força: §11.3 F-003).
- **Pickups:** o Ímã do jogador percorre o pool inteiro (≤ 512 testes por passo) e dispensa a grade.

## 7. Armas e arquétipos de alvo (B §3.8; F-004)

Armas são **dados** (`src/dados/armas.json`): arquétipo, escala, base por nível, cooldown em passos e efeitos de cada nível. O código implementa só os arquétipos:

| Arquétipo | Armas do MVP | Como resolve o alvo |
|---|---|---|
| `direcao_movimento` | Espada Longa, Lâmina do Juramento Eterno | Usa o vetor de mira = última direção não nula do joystick (inicial: para cima; com o jogador parado: §11.3 F-004). Testa um arco de 120°, de alcance a definir (§11.3 F-004), por produto escalar + distância no toro, consultando a grade. Golpes extras (nv3 e nv8) são agendados em passos. A União acrescenta a onda de brasa como efeito de chão |
| `mais_proximo` | Facas de Sal | Consulta a grade em anéis crescentes até achar N alvos distintos (N = facas da salva), com desempate por índice. Cria N projéteis; com menos de N alvos, repete o mais próximo |
| `aura` | Círculo de Sal | A cada tick (frequência: §11.3 F-004), consulta o raio, aplica dano e Sal (−50%; −60% no nv4; renova a duração, não acumula). O acerto testa `d ≤ r` com `d` exato; o teste de B é "acerta a 2 corpos e não a 2,1" |

- **Dano:** `Base(nível) × (1 + Poder) × Escala × Mult_status × Mult_stamina`, com `Escala = Σ grau × atributo/10` e `Mult_stamina = 1` no MVP (doc 10 §2.2). A ordem dos multiplicadores fica para a §11.3 F-004.
- **Contra-ataque (aparo bem-sucedido):** cada arma ganha **uma** salva extra com ×2, redirecionada ao handle do inimigo aparado (doc 04 §10), disparada dentro da janela de 1,5 s. O agendamento exato sai na F-006.

## 8. Diretor por timeline (B §3.7; Q-01, Q-02, Q-07 a Q-11)

**Formato:** em `src/dados/regioes/charneca_das_lanternas.json`, uma linha por minuto, derivada **literalmente** da tabela do brief §5.4: roster e pesos de B, mínimo e intervalo por minuto do doc 07. O JSON completo está no Apêndice A.

```jsonc
{
  "id": "charneca_das_lanternas",
  "nome_id": "D1.CHARNECA.NOME",
  "linhas": [
    { "minuto": 0, "roster": [{ "inimigo": "oco_das_lanternas", "peso": 10 }],
      "min_na_tela": 15, "intervalo_s": 2.0 },
    { "minuto": 5, "roster": [], "min_na_tela": 40, "intervalo_s": null,
      "marco": { "tipo": "guardiao", "indice": 1,
                 "inimigos": [{ "inimigo": "oco_grande_coroado", "hp_base": 600, "quantidade": 1 }],
                 "bau": "comum" } }
  ],
  "sem_spawn_antes_do_marco_s": 30,
  "a_fome_em_s": 1380
}
```

**Algoritmo** (puro, fluxo `diretor`):
1. Linha corrente = minuto inteiro decorrido (Q-10).
2. **Arena ativa** (marco ou chefe) → o diretor não spawna; só entram os convocados pelo Coroado ou pelo Lanterneiro (Q-09).
3. **Janela de 30 s antes dos marcos** 5:00, 10:00 e 15:00 → nenhum spawn, nem de reposição. O 19:30 não entra (Q-11).
4. A cada `intervalo_efetivo = intervalo × (1/I)` (B), calcula `min_efetivo = min(min × I, TETO)`. Se `vivos < min_efetivo`, spawna a diferença de uma vez (Q-07), sorteando o tipo pelos pesos do roster.
5. **Linhas de marco** (intervalo "—"): depois que a arena se desfaz e até o próximo minuto, vale o mínimo da linha do marco, com o intervalo da linha anterior (Q-01).
6. **Posição:** anel de 468 a 624 px (1,2 a 1,6 larguras de tela; Q-06), sempre fora da vista. Com 60% de chance, no semicírculo oposto à direção do movimento; com o jogador parado, uniforme (Q-07). As direções vêm da tabela literal da §5. Quando a ponta do anel passa da meia-largura do mapa, o wrap leva o ponto para o lado oposto; ele continua fora da vista, mas o viés se inverte. Isso foi aceito: acontece só perto da horizontal e só na borda externa.
7. **TETO e excedente:** quando `min_efetivo` ou uma convocação não cabe no TETO, cada 10 Ocos das Lanternas que sobram viram 1 Oco Grande com o HP, o XP e as Almas somados e o dano normal de Oco Grande (B; Q-08).
8. **Escala:** `HP = HP_base × (1 + 0,12·min) × I` e `Dano = Dano_base × (1 + 0,05·min)`, fixados no spawn (Q-10). O Coroado também escala (Q-12). O Lanterneiro usa `6.500 × (1 + 0,04 × nível)`, com o nível do momento em que surge.
9. **Garantidos:** 1 Oco Grande no minuto 1 e 1 Noviça no minuto 3, em toda Vigília (Q-26).

**Combinação de duas decisões aprovadas (para confirmar, §15):** a Q-01 manda manter, no minuto de marco, o mínimo da linha. A Q-02 põe arena nos marcos, e a Q-09 suspende o diretor durante a arena. Leio as três juntas assim: o mínimo do minuto de marco só vale **depois** que a arena se desfaz e até o minuto seguinte.

## 9. Máquina de estados da Vigília (§5.4 a §5.11 do brief)

```
                 ┌──────────────── sobreposições (congelam a simulação e o relógio) ────────────────┐
                 │   LEVEL_UP (modal de cartas) · PAUSA · CONGELAMENTO (≈5 passos) · TRANSICAO_FASE │
                 └──────────────────────────────────────────────────────────────────────────────────┘
ACENDER (passo 0)
  └─► HORA(n=1) ──5:00──► MARCO(guardiao 1) ──Coroado morto──► HORA(n=2, fogueira acesa)
                                                               │  jogador entra no raio
                                                               ▼
                                                           FOGUEIRA ──Partir ou sair do raio──► HORA(n=2)
  HORA(2) ──10:00──► MARCO(chefe_menor) ──► HORA(3)+fogueira ──► FOGUEIRA ──► HORA(3)
  HORA(3) ──15:00──► MARCO(guardiao 2, 2 Coroados) ──► HORA(4)+fogueira ──► FOGUEIRA ──► HORA(4)
  HORA(4) ──20:00──► CHEFE(fase 1 → 2 → 3, com TRANSICAO_FASE de 90 passos invulnerável, relógio parado)
  CHEFE ──Lanterneiro HP 0──► AMANHECER (600 passos de céu clareando) ──► FIM(amanhecer)
  CHEFE ──relógio 23:00──► A_FOME ──► FIM(apagar, causa = a_fome)
  qualquer estado ──HP do jogador 0──► APAGANDO (câmera lenta de 1 s) ──► FIM(apagar)
```

- **Hora:** a Hora II vai de 5:00 a 10:00, conforme o doc 02 §3. O marco que fecha a Hora N acontece no 1º minuto da Hora N+1, e a Fogueira que vem depois dele é a "Fogueira da Hora N" (brief §5.4).
- **MARCO:**
  - a arena se forma (Q-02): névoa de raio 7 corpos centrada no jogador; obstáculos somem; massa dentro morre;
  - o relógio corre (Q-01);
  - quando o último Coroado morre, a arena se desfaz, os baús caem (1 por Coroado) e a Fogueira acende a 3 corpos do jogador.
- **FOGUEIRA:**
  - o relógio para e os inimigos ficam congelados e acinzentados (doc 07 §4); o autosave acontece ao abrir (Q-03);
  - Descansar, Forjar e Partir; sair do raio equivale a Partir, com autosave, e a Fogueira se apaga (Q-24);
  - se o jogador não entrar, ela fica acesa até o próximo marco (Q-24).
- **FIM:** encerra a simulação. A cena Modal mostra o Resultado e o save meta é gravado (§10).
- **Na simulação:** a máquina é uma função pura `transicionar(estado, eventos)` com um `enum` (`Uint8`) e timers em passos. As cenas só observam.

## 10. Save versionado e retomada (B §3.10 e §3.14; Q-03, Q-04; doc 12 §2.2 e §6)

**Três registros**, todos com `versao` (inteiro), `seq` (contador monotônico) e `soma` (FNV-1a do conteúdo):

| Registro | Conteúdo | Quando grava |
|---|---|---|
| `meta` | Almas, Brasas, ranks da árvore e ranks globais, mancha (`{x, y, hora, rotulo, almas}` ou null), tutoriais vistos, "1º Apagar feito", opções (som, flashes, números de dano), TETO em cache (§13) | Fim da Vigília; compra e reembolso de Pesquisa; opção alterada; tutorial cumprido |
| `vigilia` | **Estado completo da simulação no momento da Fogueira**, em forma estruturada e migrável: seed, estados de RNG, relógio, `I`, TETO, build, nível, XP, Almas, Frascos, HP, posição do jogador, ações da Fogueira já usadas, mancha recuperada (ainda pendente), e todos os slots vivos de inimigos, projéteis, pickups e efeitos | Ao abrir a Fogueira; depois de cada ação feita nela; ao Partir ou sair do raio (Q-03; doc 12 §2.2) |
| `andamento` | Vigília em curso: Almas da Hora atual, Hora, posição e `seq` do último `vigilia` | A cada 60 s de jogo (B §3.10); em `visibilitychange`/`pagehide` |

- **Retomada:**
  - na Tela de Acender, se existir um `vigilia` sem `FIM`, aparece a oferta "Continuar da Fogueira da Hora N";
  - **Continuar** restaura o estado salvo bit a bit (teste: o hash depois de restaurar é igual ao de antes de salvar), com o jogador dentro do raio e as ações já usadas marcadas;
  - **na Hora I** não há Fogueira: o ponto de retomada é o início da Vigília, gravado no passo 0;
  - **Recusar** = Abandonar (Almas da Vigília ×0,5, somando o `andamento`; sem mancha) (Q-03).
- **Mancha:** se a retomada desfaz uma recuperação de mancha, a mancha volta ao mapa. A recuperação só é confirmada no `meta` junto com o `vigilia` seguinte ou com o `FIM` (Q-03).
- **Armazenamento:**
  - IndexedDB, banco `vigilia-das-cinzas`, store `saves`, chaves `meta`, `vigilia` e `andamento`;
  - **snapshot** em `localStorage` (`vdc.meta`, `vdc.vigilia`, `vdc.andamento`), gravado na mesma hora;
  - na leitura vale o registro de maior `seq` com `soma` válida;
  - ao instalar o PWA, `navigator.storage.persist()`.
- **Migração:** uma lista de funções puras `vN → vN+1` em `src/logica/save/migracoes.ts`, com teste por versão (B F-008: "migração de versão").
- **Serialização** em `src/logica/save/` (pura, testada no Vitest). O I/O fica em `src/plataforma/armazenamento.ts`.

## 11. Render (Phaser 4.2.1)

- **Canvas** (skill `scale-and-responsive`; ScaleManager.js):
  - backing store **fixo em 780 × 1688** (390 × 844 × 2), com `scale.mode = Phaser.Scale.FIT`, `parent: 'jogo'` (um div próprio, nunca o `body`), `autoCenter: CENTER_BOTH`, `expandParent: false`;
  - **nunca** usar `setGameSize`/`resize` nem os modos RESIZE/EXPAND, que reescrevem `canvas.width`/`height`, o vazamento do iOS;
  - o Phaser 4 não tem `resolution` e não usa `devicePixelRatio` para criar o canvas, então o limite de 2× sai da própria construção;
  - as câmeras usam `setZoom(2)` + `centerOn(...)`, e todo o código de jogo trabalha em pontos lógicos 390 × 844;
  - na aba do Safari, o FIT gera faixas laterais (letterbox) na cor #1a1f2b; instalado como PWA, a proporção quase coincide.
- **Horda, projéteis, pickups, telegrafos e partículas: `SpriteGPULayer` com escrita direta no buffer de instâncias.**
  - *Camadas:* 4 a 5 (mundo/chão e pickups; horda; jogador, projéteis e telegrafos; partículas com blend ADD; dígitos de dano). Cada uma tem capacidade fixa igual ao teto do orçamento, preenchida no boot com `addMember`.
  - *A cada frame:* o sincronizador copia o estado interpolado para `layer.submitterNode.instanceBufferLayout.buffer.viewF32/viewU32` e chama `setAllSegmentsNeedUpdate()`. Stride = `getDataByteSize()/4` = 42 floats; os slots mortos ficam com escala e alpha 0, como o código documenta.
  - *Wrap:* cada entidade é escrita na cópia mais próxima da câmera, `x' = camX + ((x − camX + W/2) mod W) − W/2`.
  - *Ordem de desenho:* dentro de uma camada vale a ordem do buffer.
  - *Custo medido* (V8 desktop, 1.500 quads): ≈ 0,014 ms de sincronização + 0,08 ms de render além da cena vazia, 1 draw call por camada; o pool de `Image` custou ≈ 0,6 a 0,9 ms. A imagem saiu idêntica pixel a pixel nos dois casos.
  - *Contra:* é uso fora da intenção documentada ("Avoid changing the contents of the SpriteGPULayer frequently"; buffer criado como `STATIC_DRAW`) e depende do layout interno do buffer, que já mudou num beta do v4.
  - *Mitigações:* versão fixada em 4.2.1; um teste confere os offsets via `getMemberData()`; **plano B** atrás da mesma interface, `?render=image` (pool de `Image` dentro de `this.add.layer()`, no mesmo atlas, com escrita direta de propriedades); validação no iPhone no build de teste pós-F-006 (Q-29). Se o iPhone mostrar custo alto, o primeiro recurso é usar `DYNAMIC_DRAW` antes de cair para o plano B.
- **Atlas único**, gerado no boot:
  - `this.textures.createCanvas('atlas', 512, 512)` + Canvas 2D: círculo, quadrado, triângulo, retângulo, projétil, partícula, cunhas e anéis de telegrafo, dígitos 0 a 9;
  - tudo em branco e a 2×, com a cor via tint e molduras registradas com `Texture#add`;
  - no iPhone, `autoMobileTextures` limita o batch a 1 textura (RenderNodeManager.js:140): **tudo no mesmo atlas**.
- **Proibido no caminho quente:** `Graphics` ou `Shape` redesenhados por frame (bench: 11 a 102 ms e > 12 MB/frame para 1.500 formas), `ParticleEmitter` (roda fora do passo e aloca por frame), `Text` por número de dano, `Blitter` (não escala nem rotaciona).
- **Textos de UI:** HUD numérico com dígitos do atlas. Rótulos, cartas, Fogueira, Resultado e Santuário usam `Text` com `resolution: 2` (precisa de acentos), criados uma vez por tela e alterados só quando o valor muda. Fonte provisória: do sistema. As fontes finais vêm da direção de arte.
- **Aquecimento:** a Tela de Acender desenha uma vez todas as camadas, fora da vista, para compilar os shaders antes da Vigília (a 1ª compilação custou ≈ 1,3 s no bench).
- **Draw calls estimados:** 4 a 5 camadas + chão + HUD + Modal ≈ 10 a 25. O limite é ≤ 150 (B).
- **Escopo do "zero alocação":** vale para o **nosso** código. O próprio Phaser 4.2.1 aloca ≈ 6,6 KB/frame numa cena vazia, mais ≈ 3 KB por `SpriteGPULayer`. O teste de heap da F-003 aceita esse serrilhado pequeno e constante e exige que não haja **crescimento** em 60 s (B F-003).

### 11.1 Cenas (skill `scenes`)

| Cena | Plugins | Papel |
|---|---|---|
| `Boot` | Loader | Gera o atlas, sintetiza os SFX, carrega os JSON e o `pt-BR.json`, aquece os shaders |
| `Acender` | — | "Toque para acender a Chama" (o toque é tratado pela camada DOM, §12); oferta de retomada; aviso da chave de silêncio |
| `Santuario` | TweenManager | Iselda, árvore de Fundação, botão Vigília |
| `Vigilia` | TweenManager | Driver do passo fixo e câmera do mundo; sincroniza as camadas |
| `Hud` | TweenManager | HUD de 390 × 844 lógicos, câmera própria com zoom 2 |
| `Modal` | TweenManager | Level up, Fogueira, pausa, Resultado, retomada |

- No máximo **3** cenas desenhando ao mesmo tempo: Vigilia, Hud e Modal. As outras usam `sleep`/`wake`.
- Como `init()` não roda de novo no `wake`, o reset fica no evento `WAKE`.
- O `InputPlugin` do Phaser fica desligado (§12).

## 12. Entrada, áudio, visibilidade e onde roda a simulação

- **Entrada própria (DOM), com o toque do Phaser desligado:**
  - *Config:* `input: { touch: false, mouse: DEV, keyboard: DEV, gamepad: false, windowEvents: false }`. Por padrão o Phaser tem só 1 pointer de toque e descarta o 2º dedo em silêncio (InputManager.js:560-586), e aloca a cada evento.
  - *Listeners:* `touchstart`, `touchmove`, `touchend` e `touchcancel` no canvas com `{ passive: false }` e `preventDefault()`. No `document`: `touchmove`, `gesturestart`, `gesturechange` e `contextmenu`, para bloquear pull-to-refresh, zoom e callout. CSS com `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `overscroll-behavior: none`, `100dvh`.
  - *Fila:* os handlers só copiam `identifier`, posição em pt e `timeStamp` para um anel `Float64Array`, sem alocar e sem `stopPropagation`.
  - *Tradução:* a cada passo, o `TradutorDeGestos` (slots fixos de dedos) converte a fila em `ComandosDoPasso`: movimento com zona morta de 0,15 e raio de 60 pt (B); esquiva quando a velocidade passa de 400 pt/s (Δposição/Δ`timeStamp`, janela: §11.3 F-006) ou com toque duplo; aparo, Frasco, pausa e carta tocada como bordas travadas. Um toque curto entre dois frames ainda gera exatamente 1 passo de aparo.
  - *Reconciliação:* a cada `touchstart` os slots são conferidos com `e.touches`, para soltar dedos "presos" (doc 12 §2.6).
  - *UI:* o hit-test é nosso, numa tabela de alvos em pt. Um teste falha se algum alvo tiver menos de 72 pt (B §3.5).
  - *Pausa:* o gesto de dois dedos só conta toques que não começaram no joystick nem num botão (Q-25).
  - *Replay:* a simulação só lê `ComandosDoPasso`. Gravá-los por passo dá replay e testes determinísticos.
- **Áudio:**
  - *Desbloqueio:* dentro do próprio handler de `touchend` da Tela de Acender, de forma síncrona: `navigator.audioSession.type = 'playback'` quando existir, senão o `<audio>` silencioso em loop (doc 12 §2.3); depois `sound.context.resume()`. Se o Phaser continuar `locked`, marca-se o campo `unlocked`, que é privado e coberto por teste.
  - *Teste da F-001:* `__GAME_DEBUG__.audio()` deve devolver `'running'`. O Chromium do Playwright roda com `--autoplay-policy=user-gesture-required`, para o teste não passar sem o toque.
  - *SFX placeholder:* 3 `AudioBuffer` sintetizados no boot por funções TS puras, testáveis por hash. Cada disparo cria 1 `AudioBufferSourceNode` → barramento pré-alocado → `sound.destination`, com limite de vozes e intervalo mínimo por SFX. É a única alocação, e fica fora do caminho quente da simulação.
- **Visibilidade e interrupção:**
  - `Phaser.Core.Events.HIDDEN` e `BLUR`, `pagehide` e `statechange` do `AudioContext` (estado `'interrupted'`) → **pausa automática** da simulação + gravação do `andamento`;
  - a retomada é só por toque, nunca automática;
  - na pausa o som é silenciado com `setMute`/`pauseAll`, nunca com `ctx.suspend()`, que o Phaser desfaz a cada frame;
  - nunca atribuir `window.onblur`, que o Phaser usa.
- **Paisagem:** overlay DOM "gire o aparelho" por media query, com a simulação pausada. O canvas não é tocado.
- **Wake Lock:** fallback com `<video>` invisível, `playsinline` e em loop, iniciado no gesto da Tela de Acender (B §3.14).
- **Worker: não no MVP.** A simulação roda na thread principal, **isolada como se estivesse num Worker**: estado num `ArrayBuffer`, entrada só por `ComandosDoPasso`, saída só por views + anel de eventos. Os motivos:
  1. O Phaser 4.2.1 não renderiza fora da thread principal (0 ocorrências de `OffscreenCanvas` em `src/`), então um Worker levaria só a simulação, que é a parte barata. A sonda sintética deu ≈ 0,085 ms por passo com 500 inimigos + 400 projéteis no V8 desktop.
  2. Sem `SharedArrayBuffer` (doc 12 §2.5), o Worker soma **1 frame** de latência ao aparo e à esquiva (17 ms a 60 fps, 33 ms a 30 fps), o que ameaça o critério de sucesso do marco. Mede-se também jitter de mensagem: RTT p95 de 5,8 a 7,5 ms no Chromium com CPU 4×.
  3. Depuração, `__GAME_DEBUG__` e Playwright ficam síncronos.
- **Critério para migrar** (medido no iPhone 11/12, Hora IV com TETO cheio por 60 s, em janelas de 60 frames, porque o `performance.now` do Safari tem 1 ms de resolução): **p95 da CPU do frame > 10 ms** E **p95 da simulação ≥ 3 ms** E **p95(frame − simulação) + 1 ms < 10 ms**. Se o excesso vier do render, o Worker não resolve.

## 13. TETO: 300 ou 500 (B §3.7 e §3.13)

- **Por que não detectar o modelo:**
  - B cita "`deviceMemory`/benchmark", mas `navigator.deviceMemory` **não existe no Safari** (MDN BCD);
  - `hardwareConcurrency` devolve 4 em todo iPhone (WebKit NavigatorBase.cpp);
  - `UNMASKED_RENDERER` devolve sempre "Apple GPU".
- **Detecção em camadas:**
  1. **Override de teste:** `?teto=300|500`.
  2. **Cache** em `localStorage`, por build + token `Version/` do Safari + classe de tela. O "OS xx" do user agent está congelado no Safari 26.
  3. **Classe de tela:** DPR 2, ou largura ≤ 375 pt, ou 414 × 896 → **300** direto (aparelhos anteriores ao iPhone 12).
  4. **Sonda de boot**, durante a Tela de Acender, depois que os assets carregaram: 120 passos de aquecimento + 8 lotes de 30 passos da **simulação real** com 500 inimigos + 400 projéteis, num estado descartável. Se a mediana for ≤ **2 ms por passo [proposta, provisório: calibrar na F-010 com iPhone 12 e 14]**, o TETO é 500; senão, 300. A sonda tem teto de 800 ms; passou disso, 300. Com o rAF a 30 fps, não grava cache.
  5. **Fallback:** 300.
- **Rebaixamento:** se a degradação graciosa chegar ao nível 3 numa Vigília com TETO 500, o cache passa para 300.
- **TETO fixo por Vigília:** é parâmetro da simulação, gravado no save e no replay. O futuro desafio diário (F-016) usa TETO fixo em 300.
- **Limitação conhecida:** a sonda provavelmente não separa o iPhone 12 do 14, que diferem ≈ 8% em single-core. Um iPhone 12 pode começar com 500 até a primeira degradação; o custo é pequeno, porque no MVP o mínimo da tabela é 300 e `min × I` chega a 330.
- **Debug:** `__GAME_DEBUG__.teto = { valor, origem: 'override'|'cache'|'tela'|'sonda'|'fallback', sondaMs }`.

## 14. Degradação graciosa e debug (B §3.13; F-001)

- **Medida:** CPU do frame = `performance.now()` de `PRE_STEP` a `POST_RENDER`, agregada em janelas. Usa CPU e não o intervalo entre rAFs, para que o Low Power Mode (rAF a 33 ms) não dispare a degradação sem necessidade.
- **Gatilho (B):** média > 16 ms por 2 s → sobe um nível.
  1. Reduz partículas (o teto do anel cai pela metade).
  2. Desliga a luz e os gradientes aditivos.
  3. Converte a massa excedente em Ocos Grandes: o TETO efetivo cai para os vivos atuais, e o excesso futuro vira Oco Grande pela regra do §8.7.
- **Determinismo do nível 3:** como muda a simulação, o nível chega a ela como campo de `ComandosDoPasso` (gravado no replay e no save). Os níveis 1 e 2 são só render.
- **Volta [proposta]:** desce um nível depois de 10 s com média < 10 ms (o orçamento de B).
- **`window.__GAME_DEBUG__`** (sempre presente; os ganchos de escrita só com `?debug=1`):
  - `fps`, `passo`, `relogio`, `estado`;
  - `vivos` por tipo (`{ oco_das_lanternas, oco_grande, novica_de_sal, oco_grande_coroado, o_lanterneiro, projeteis, pickups, particulas }`);
  - `passosPerdidos`, `memoriaEstimadaMB` (pools + atlas + backbuffer, porque `performance.memory` não existe no Safari);
  - `cpuFrameMs` (p50/p95 da janela), `teto`, `degradacao`, `seed`, `hash()`, `audio()`, `toquesPerdidos`;
  - `eventos` (telemetria local dos eventos do doc 10 §6, Q-30);
  - debug: `entrada.injetar(tipo, id, x, y, t)` (swipe sintético com timestamps controlados) e `avancar(n)` (com a simulação pausada).
- **Parâmetros de URL, só para teste [proposta]:**
  - `?seed=N` (`--seed` do `verify.sh`);
  - `?teto=`;
  - `?render=gpu|image`;
  - `?inicio=MM:SS` (começar a Vigília num minuto, para testar marcos e o Lanterneiro sem jogar 20 minutos);
  - `?debug=1`.
  - Em produção, `?inicio` é ignorado.
- **`verify.sh --taps-game`:** roda o projeto do Playwright com `hasTouch: true` e `isMobile: true` em 390 × 844, dirigindo o jogo por toques reais (CDP `Input.dispatchTouchEvent`) ou por `entrada.injetar`.

## 15. Pontos para você confirmar

1. **Combinação das Q-01, Q-02 e Q-09:** o mínimo do minuto de marco só vale depois que a arena se desfaz (§8).
2. **Constantes técnicas [proposta]:**
   - célula da grade de 64 px;
   - capacidades dos pools (500 inimigos, 400 projéteis, 512 pickups com fusão, 64 efeitos, 600 partículas, 96 números de dano);
   - anel de 1.024 eventos;
   - conversão de segundos em passos por arredondamento, com o congelamento de 80 ms valendo 5 passos e congelando também o relógio;
   - limiar de 2 ms por passo da sonda do TETO (provisório);
   - volta da degradação depois de 10 s abaixo de 10 ms.
3. **SpriteGPULayer com escrita direta** como caminho principal, com o plano B (pool de `Image`) atrás de `?render=image` e validação no iPhone no build de teste pós-F-006.
4. **Retomada exata:** o save da Fogueira guarda o estado completo da simulação, e a retomada continua idêntica (mesmo hash).
5. **Parâmetros de teste por URL**, inclusive `?inicio=MM:SS`, só em debug.
6. **Simulação na thread principal** com o contrato pronto para Worker e o critério de migração do §12.

## 16. Consequências

- **Positivas:**
  - a simulação é testável no Vitest sem navegador, determinística e com replay;
  - o render da horda cabe com folga no orçamento de draw calls;
  - mover a simulação para Worker depois é trocar o driver;
  - conteúdo novo entra como JSON.
- **Negativas e riscos:**
  - dependência de um uso não documentado do `SpriteGPULayer` (mitigada pelo plano B e pelo teste de offsets);
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
- **Validação:** o JSON Schema e o teste de integridade da etapa 3 conferem que todo `inimigo` existe em `inimigos.json` e que os números batem com esta tabela.
