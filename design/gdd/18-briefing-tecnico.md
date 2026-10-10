# 18 · Briefing Técnico — Fatia Vertical "Primeira Vigília"

> Documento-ponte entre o GDD e o código. Define o MVP (fatia vertical), fecha as decisões que o GDD deixa em aberto para esse recorte, consolida todos os números que a simulação precisa e lista as dez primeiras features com critérios de aceite e evidência exigida. Quando este documento e o GDD divergirem **dentro do recorte do MVP**, este documento prevalece; fora do MVP, o GDD prevalece.

---

## 1. Objetivo da fatia vertical

Uma Vigília completa e jogável em iPhone real, do toque em "Acender a Chama" até Amanhecer ou Apagar, com retorno ao Santuário e uma compra na árvore. Tudo com formas geométricas e paleta provisória (cinza-azulado `#1a1f2b` e brasa `#ffb347`). Critério de sucesso do marco (doc 15, M0/M1): **"o aparo e a esquiva são gostosos no iPhone"** e a Vigília inteira roda a 60 fps em iPhone 12 na Hora IV.

## 2. Recorte do MVP

| Sistema | No MVP | Fora do MVP (fica para depois de F-010) |
|---|---|---|
| Vigilantes | Aldric (único) | Outros 11; seleção com bloqueados |
| Região | Charneca das Lanternas | Outras 5; modos de mapa; segredos |
| Inimigos | Oco das Lanternas (massa), Oco Grande (médio, tutorial de esquiva), Noviça de Sal (médio à distância, tutorial de aparo) | Os outros 29; eventos de enxame |
| Guardiões e Chefe Menor | **Placeholder "Oco Grande Coroado"**: Oco Grande com HP ×6, dois ataques telegrafados (patada branca, grito vermelho) e baú. Aparece em 5:00, 10:00 (versão com HP ×10 e baú dourado) e 15:00 (dois ao mesmo tempo). | Oco Coroado, Oco Coroado Maior, Noiva da Turfa, Guardião II real |
| Chefe da Região | O Lanterneiro, 3 fases, Postura, Fúria | Segredo das 7 lanternas |
| A Fome (23:00) | Derrota imediata com tela própria ("A Fome desce.") | A Fome como inimigo aparável |
| Armas | Espada Longa do Juramento (direção do movimento), Facas de Sal (mais próximo), Círculo de Sal (aura) | As outras 35 |
| Passivas | Elmo Sem Rosto (+4 Armadura/nível), Luvas de Fole (+8% Poder/nível) | As outras 16 |
| Uniões | Lâmina do Juramento Eterno (Espada Longa nv. 8 + Elmo Sem Rosto) | As outras 33 |
| Status | Sal (lentidão), Postura Quebrada | Sangramento, Queimadura, Medo, Marca |
| Relíquias | Vaga existe e fica vazia (Aldric tem 5 vagas de arma + 1 de Relíquia) | Qualquer Relíquia |
| Fogueira | Descansar, Forjar União, Partir; relógio para; intensidade ×1,1; autosave e retomada | Oferenda, Rook, Pacto Momentâneo |
| Apagar | Tela, resumo, 30% das Almas ficam como **mancha de Cinzas Perdidas** recuperável na próxima Vigília ao encostar | Eco de Vigilante guardando a mancha; Reviver |
| Amanhecer | Céu clareia 10 s, Almas ×1,5, 1 Brasa (só contabilizada) | Memória do chefe; Noite Infinita |
| Santuário | Cena mínima: Acender, Iselda (árvore de Fundação com os 8 nós de estatística + reembolso), botão Vigília | Outros NPCs, Codex, Forja, Pactos, Ciclos |
| Monetização | **Nenhuma.** Ignorar toda menção a anúncios nos docs 02 (seção 8), 09 e 11 (seção 3.12) | — |
| Textos | Placeholders em `pt-BR.json` com IDs definitivos (doc 17, seção 4) | Roteiro final |
| Áudio | Desbloqueio de áudio no toque + 1 som placeholder por evento crítico (aparo, esquiva perfeita, quebra) | Música, SFX finais |
| Arte | Formas geométricas: círculos (massa), quadrados (médios), triângulo (jogador), retângulo grande (chefe) | Sprites |

## 3. Números consolidados (fonte entre parênteses)

### 3.1 Tempo e simulação
- Passo fixo: **60 Hz** (1 passo = 16,667 ms). Render desacoplado via `requestAnimationFrame`, que no iPhone fica em 60 fps e cai a 30 em Low Power Mode (doc 12). Acumulador com teto de 5 passos por frame; acima disso, descarta tempo e registra `passos_perdidos` no debug.
- RNG com seed por Vigília (`xorshift128+` ou equivalente), um gerador para o diretor e outro para level up, para que a seed do desafio diário reproduza a mesma sequência (doc 14).
- Vigília: 20:00 em 4 Horas de 5:00; A Fome aos 23:00 se o chefe estiver vivo (doc 02, seção 3).
- Relógio para dentro do raio de 2 corpos da Fogueira e durante level up, pausa e arena de transição de fase (doc 02).

### 3.2 Espaço e câmera
- Resolução lógica **390×844 pontos**, renderizada a **2×** (nunca 3×). Canvas de tamanho fixo após o boot; nunca redimensionar por frame (docs 12 e 13).
- Corpo (unidade de distância) = **32 px lógicos**. Jogador 48×48, massa 32×32, médios 48×48, chefe 128 a 192 px. Tiles 16 px (doc 13, seção 1.2).
- Mapa 3×3 telas (≈ 1.170×2.532 px lógicos) com wrap visual contínuo; 4 a 8 obstáculos por tela (doc 07, seção 1).
- Câmera centrada no jogador, mostra ≈ 12×26 corpos.

### 3.3 Jogador (Aldric, doc 03)
| Atributo | Valor |
|---|---|
| HP | 130 (passiva Brasa Firme: +15% → 150) |
| Stamina | 100 |
| Velocidade | 1,0 = **4,5 corpos/s** (144 px/s) |
| Frascos | 3; curam 40% em 2 s; interrompe se receber dano > 15% do HP máximo em um golpe |
| Vagas | 5 armas + 1 Relíquia (vazia) + 6 passivas |
| Perfil | FOR 6 / DES 3 / INT 1 / FÉ 3 / VIG 7; +1 ponto por nível (fora do MVP: distribuição manual; no MVP, FOR automático) |
| Brasa Firme | recebe 20% menos dano enquanto stamina > 50% |
| Invulnerabilidade pós-acerto de contato | 0,3 s = 18 passos (doc 02, seção 5.6) |
| Redução de armadura | `A / (A + 20)`, cap 75% (doc 10) |

### 3.4 Stamina, esquiva, aparo (doc 02, seções 5.2 a 5.4)
| Ação | Valor |
|---|---|
| Esquiva | custo 25; duração 0,35 s = 21 passos; **i-frames 0,20 s = 12 passos** (passos 2 a 13); recuperação 0,05 s = 3 passos; distância 2,5 corpos (categoria Leve: 0 ou 1 arma pesada; no MVP nenhuma arma é pesada) |
| Esquiva perfeita | um acerto teria ocorrido durante os i-frames; +15% Poder por 2 s |
| Aparo | custo 15; **janela 0,18 s = 11 passos** após o toque; sucesso devolve 30 de stamina, aplica Postura Quebrada em raio de 2 corpos (2 s, dano ×2) e dispara Contra-ataque (todas as armas disparam uma salva extra com ×2 em 1,5 s) |
| Aparo falho | 0,4 s = 24 passos sem regeneração e vulnerável |
| Regeneração | 30/s após 0,5 s sem gastar |
| Corrida | fora do MVP |
| Telegrafo branco | 0,5 s de aviso (brilho crescente + silhueta de alcance no chão); aparável |
| Telegrafo vermelho | 0,8 a 1,2 s; só esquiva; só no Oco Grande Coroado (grito) e no Lanterneiro |

### 3.5 Controles (doc 02, seção 4; doc 11, seção 1)
- Joystick flutuante: aparece onde o polegar toca na metade inferior; zona morta 0,15; raio 60 pt; reposiciona a cada novo toque.
- Esquiva: **swipe > 400 pt/s** com o dedo do joystick, ou toque duplo no joystick. Direção = direção do swipe.
- Aparo: botão de **80 pt** no canto inferior direito, acima da safe-area inferior. Frasco: botão de **72 pt** acima do Aparo.
- Pausa: botão superior ou dois dedos parados 0,5 s.
- Level up: toque na carta + segundo toque para confirmar.
- Nenhum alvo de toque menor que 72 pt. `touch-action: none`, `preventDefault` em `touchmove` não passivo, `-webkit-touch-callout: none`, `user-select: none` (doc 12).

### 3.6 Inimigos do MVP (doc 05, Ciclo I, minuto 0)
| Inimigo | HP | Dano | Velocidade | XP | Almas | Comportamento |
|---|---|---|---|---|---|---|
| Oco das Lanternas | 12 | 5/s contato | 0,55 | 1 | 0 ou 1 (50%) | Linha reta até o jogador |
| Oco Grande | 100 | 20 por ataque | 0,70 | 5 | 3 | Para a 1,5 corpo; telegrafo branco 0,6 s; arco de 120° à frente; 1,5 s de recuperação |
| Noviça de Sal | 80 | 18 por projétil | 0,80 | 5 | 3 | Mantém 4 corpos; a cada 3 s, projétil lento (3 corpos/s) telegrafado branco, aparável; deixa Sal (−50% velocidade por 3 s) |
| Oco Grande Coroado (placeholder) | 600 / 1.000 | 25 | 0,65 | 25 | 30 + baú | Patada (branca, 0,6 s) e Grito (vermelho, 1,0 s, empurrão em raio de 3 corpos); convoca 10 Ocos a cada 10 s |

Escala por minuto: `HP = HP_base × (1 + 0,12·min) × I`; `Dano = Dano_base × (1 + 0,05·min)`; `I` = 1,0 ou 1,1 após descansar na Fogueira (doc 10).

### 3.7 Diretor de spawn da Charneca (MVP; doc 07, seção 3.2 reduzido ao roster do MVP)
| Min | Roster (peso) | Mínimo na tela | Intervalo (s) | Evento |
|---|---|---|---|---|
| 0 | Lanternas (10) | 15 | 2,0 | — |
| 1 | Lanternas (10), Grande (1) | 25 | 1,6 | 1 Oco Grande garantido (tutorial esquiva) |
| 2 | idem | 35 | 1,4 | — |
| 3 | + Noviça (2) | 45 | 1,2 | 1 Noviça garantida (tutorial aparo) |
| 4 | idem | 55 | 1,0 | — |
| 5 | — | 40 | — | **Guardião I** (Coroado 600 HP) → baú → Fogueira |
| 6 a 9 | Lanternas (8), Grande (3), Noviça (3) | 70 → 100 (+10/min) | 0,9 → 0,7 | — |
| 10 | — | 60 | — | **Chefe Menor** (Coroado 1.000 HP) → baú dourado → Fogueira |
| 11 a 14 | Lanternas (6), Grande (4), Noviça (4) | 120 → 180 (+20/min) | 0,6 → 0,5 | — |
| 15 | — | 80 | — | **Guardião II** (2 Coroados 600 HP) → Fogueira |
| 16 a 19 | Lanternas (6), Grande (5), Noviça (4) | 200 → 300 | 0,45 → 0,35 | tela escurece 10% por minuto |
| 20 | — | arena | — | **O Lanterneiro** |
| 20 a 23 | Lanternas (10) | 300 | 0,3 | 23:00 com chefe vivo: A Fome (derrota) |

Regras: `intervalo_efetivo = intervalo × (1/I)`; `min_efetivo = min(min × I, TETO)`; TETO = 300 (iPhone 11/12) ou 500 (iPhone 14+), por detecção de `deviceMemory`/benchmark no boot, com fallback 300. Excedente: a cada 10 massa que não cabem, 1 Oco Grande com HP agregado. Spawn em anel de 1,2 a 1,6 telas, 60% do lado oposto ao movimento. Nenhum spawn nos 30 s antes de um marco.

### 3.8 Armas do MVP (doc 04)
| Arma | Alvo | Escala | Dano base nv. 1 | Cooldown | Níveis |
|---|---|---|---|---|---|
| Espada Longa do Juramento | direção do movimento | FOR C / DES C | 10 | 1,2 s | nv2 +20% dano; nv3 +1 golpe (volta); **nv4** +50% em Postura Quebrada; nv5 +20% área; nv6 +20% dano; **nv7** 3º golpe estocada perfurante; nv8 +1 golpe |
| Facas de Sal | mais próximo | DES B | 6 ×2 facas | 0,9 s | nv2 +1 faca; nv3 +20% dano; nv4 facas aplicam Sal; nv5 +1 faca; nv6 +20% velocidade de projétil; nv7 atravessa 1 inimigo; nv8 +1 faca |
| Círculo de Sal | aura, raio 2 corpos | FÉ A | 4/s | contínuo | nv2 +15% raio; nv3 +20% dano; nv4 Sal mais forte (−60%); nv5 +15% raio; nv6 +20% dano; nv7 pulso de knockback a cada 5 s; nv8 +20% raio |
| **Lâmina do Juramento Eterno** (União) | direção do movimento | FOR B / DES C | Espada nv8 ×1,5 | 1,0 s | cada golpe gera onda de brasa no chão (3 corpos, 8 de dano) |

Fórmula: `Dano = Base(nível) × (1 + Poder) × Escala(attr, grau)`, com `Escala = grau_mult × attr/10` e graus E 0,25 · D 0,5 · C 0,75 · B 1,0 · A 1,25 · S 1,5 (doc 10). Aldric nv1 com Espada Longa: 10 × 1,0 × (0,75×6/10 + 0,75×3/10) = 10 × 0,675 ≈ 7 por golpe; a curva de XP e os níveis de arma levam o DPS a ≈ 60 no min 5 e ≈ 2.000 no min 20 (alvos do doc 10, seção 3.1).

### 3.9 XP, level up, baús (doc 02, seção 6)
- `XP(n) = 10 + 8·(n−1) + 0,6·(n−1)²`. Cinzas: azul 1, verde 5, vermelha 25. Raio de Ímã 1,5 corpo.
- Modal: 3 cartas. 60% upgrades de itens possuídos; arma nova só com vaga; após o min 12, a passiva que completa uma União pendente aparece com 35%.
- Reroll/Pular/Banir: 0 no MVP (nós da árvore de Memória, fora do MVP).
- Baú: Guardião e Chefe Menor. Após o min 10, contém a União se arma nv. 8 + passiva presente; senão 1 item (70%), 3 (25%), 5 (5%).
- Passivas: nível máximo 5; armas: 8.

### 3.10 Fogueira (doc 02, seção 3.1)
- Surge a 3 corpos do jogador após o marco; raio 2 corpos; relógio para; inimigos param e viram cinza.
- Descansar: HP 100%, Frascos cheios, `I` = 1,1 até a próxima Fogueira. Forjar União: 150 Almas na Hora I, 250 na II, 400 na III. Partir: autosave.
- Autosave também a cada 60 s de jogo. Retomada: ao reabrir, oferece "Continuar da Fogueira da Hora N" com build, nível, Almas e Frascos daquele momento (doc 12, seção 2.2).

### 3.11 O Lanterneiro (doc 06, seção 2.2)
- `HP = 6.500 × (1 + 0,04 × nível do jogador)`. Arena: névoa, raio 7 corpos; obstáculos somem; massa dentro morre.
- Postura 100: aparo +25, esquiva perfeita +10, acerto de arma +2 (Espada), +5 se pesada. Cheia → Quebra 3 s (dano ×2, sem Postura Firme); depois zera e regenera 20/s por 5 s se não atingida. Postura Firme: −40% de dano fora de Quebra.
- Fases 100% / 60% / 25%, transição 1,5 s invulnerável.
- Fase 1: Vara Horizontal (branco, 180°, 0,7 s), Bater a Vara (branco, linha de 6 corpos, 0,6 s), Luz Cega (vermelho, cone 60° × 6 corpos, 1,0 s; inverte a tela 2 s e 8 de dano/s).
- Fase 2: arena escurece 40%; Lanterna Arremessada (vermelho, círculo de 2 corpos que queima 6 s, 6/s); convoca 10 Ocos das Lanternas que iluminam 3 corpos ao redor.
- Fase 3: Explosão de Luz (vermelho, anel que se expande de 1 a 6 corpos em 1 s, a cada 12 s); Agarrar (branco, 0,8 s, raio 2 corpos: aparar causa Quebra imediata; acertar = 20% HP e 1 s preso).
- Fúria: após 5 min de luta, +5% dano a cada 10 s. Duração alvo 2 a 3 min.
- Vitória: Amanhecer. Derrota: Apagar. 23:00 com chefe vivo: A Fome (derrota).

### 3.12 Economia do MVP (docs 08 e 10)
- Almas por Vigília alvo: Apagar na Hora II ≈ 400; Hora IV ≈ 1.100; Amanhecer ≈ 1.600 (×1,5 aplicado).
- Apagar: 30% das Almas ficam na mancha (posição no mapa + Hora). Encostar na mancha na próxima Vigília devolve. Morrer antes perde.
- Árvore de Fundação, 8 nós de estatística (doc 08, seção 4.1): `custo = 300 × 1,12^(rank−1) × (1 + 0,015 × ranks_globais)`; reembolso gratuito zera a árvore.
- Primeira compra guiada: o jogador volta do primeiro Apagar com 300 Almas garantidas (doc 11, seção 4).

### 3.13 Orçamento técnico (doc 12)
| Métrica | iPhone 11/12 | iPhone 14+ |
|---|---|---|
| Inimigos simultâneos | 300 | 500 |
| Projéteis/efeitos | 200 | 400 |
| Partículas | 300 | 600 |
| Draw calls | ≤ 150 | ≤ 150 |
| CPU por frame (sim + render) | < 10 ms | < 8 ms |
| Memória total | < 150 MB | < 200 MB |
| Atlases | ≤ 2048² @2×, ≤ 6 por mapa | idem |
| Download inicial | < 15 MB | — |
| Alocação por frame no caminho quente | zero | zero |
Degradação graciosa: frame > 16 ms por 2 s → reduz partículas → reduz efeitos de luz → converte massa excedente em Ocos Grandes ("a Fome engrossa").

### 3.14 Plataforma iOS (doc 12, lista obrigatória)
Tela "Toque para acender a Chama" desbloqueia o áudio (`touchend`); `viewport-fit=cover` e `env(safe-area-inset-*)`; `100dvh`; sem Fullscreen API; sem Vibration API (feedback só visual e sonoro); sem orientation lock (overlay "gire o aparelho" em paisagem); Wake Lock não funciona em standalone (vídeo loop invisível como fallback); pausa automática em `visibilitychange` e em interrupção de áudio; sem `SharedArrayBuffer` (Worker com `postMessage` de TypedArrays se a simulação for para Worker); save em IndexedDB com snapshot em localStorage e versão de schema; convite "Adicionar à Tela de Início" após a primeira Vigília.

### 3.15 Textos
IDs no formato `BLOCO.SUBBLOCO.NÚMERO` do doc 17, seção 4 (ex.: `A2.TUTORIAL.01`, `I1.FOGUEIRA.DESCANSAR`, `E1.LANTERNEIRO.TITULO`). Tabela em `pt-BR.json`: `{ id, texto, contexto, limite_palavras }`. Nenhuma string visível no código. Palavras proibidas em código, dados e tela: run, checkpoint, zumbi, roguelike, game over, upgrade, gema, menu principal, fusão, mutator, NG+.

## 4. Lista de features F-001 a F-010

Cada feature é uma sessão. "Pronto" exige: build verde, Vitest verde, Playwright verde com `--taps-game` e `--seed`, evidência em `production/evidencias/F-xxx/`, crítico independente ≥ 7, commit descritivo.

| ID | Feature | Critério de aceite verificável | Evidência exigida |
|---|---|---|---|
| **F-001** | **Esqueleto e loop** — Phaser em retrato, resolução lógica 390×844 @2×, canvas fixo, safe-area, simulação pura em `src/logica/` com passo fixo 60 Hz, acumulador, RNG com seed, `window.__GAME_DEBUG__` (fps, passo, entidades vivas, passos perdidos), tela "Toque para acender a Chama", bloqueio de pull-to-refresh e zoom | Teste: mesma seed + 1.000 passos = estado idêntico (hash). Playwright: screenshot 390×844 sem barras de rolagem; `__GAME_DEBUG__.passo` avança; áudio em estado `running` após o toque simulado | Screenshot; log do teste de determinismo |
| **F-002** | **Movimento e mapa** — joystick flutuante (zona morta 0,15, raio 60 pt, reposiciona por toque), jogador a 4,5 corpos/s, mapa 3×3 telas com wrap, 4 a 8 obstáculos por tela com colisão, câmera | Teste: vetor do joystick com zona morta; wrap de posição. Playwright `--taps-game`: arrasto move o jogador; dois toques em lugares diferentes criam o joystick em lugares diferentes | Vídeo curto ou 3 screenshots sequenciais |
| **F-003** | **Hordas** — diretor por timeline (JSON da seção 3.7), pools SoA pré-alocados, grade espacial própria, Oco das Lanternas, dano de contato com invulnerabilidade de 18 passos, HP/dano escalando por minuto, teto de entidades e conversão de excedente | Teste: grade retorna os mesmos vizinhos que força bruta em 1.000 casos aleatórios; diretor repõe até o mínimo; conversão de excedente ao passar o teto. Playwright: 300 inimigos vivos e `__GAME_DEBUG__.fps` ≥ 55 por 30 s em desktop com throttling de CPU 4× | Captura do debug com 300 vivos; relatório de alocações (heap snapshot sem crescimento em 60 s) |
| **F-004** | **Armas automáticas** — arquétipos de alvo (direção do movimento, mais próximo, aura), Espada Longa, Facas de Sal, Círculo de Sal com níveis 1 a 8, fórmula de dano com escala por atributo, status Sal, números de dano na tela (desligáveis) | Teste por arma: dano em cada nível bate com a tabela 3.8 (±1%); Sal reduz velocidade em 50% por 3 s; aura acerta a 2 corpos e não a 2,1. Playwright: inimigos morrem sem input | Screenshots das três armas ativas; tabela de dano gerada pelo teste |
| **F-005** | **XP, level up, passivas e União** — Cinzas com Ímã, curva de XP, modal de 3 cartas com confirmação por segundo toque, regra de 60% de upgrades, Elmo Sem Rosto e Luvas de Fole, baú com 1/3/5 itens, União Lâmina do Juramento Eterno em baú após o min 10 | Teste: `XP(10) = 130 ±1`, `XP(20) = 380 ±2`; sorteio respeita vagas e 60%; baú após min 10 com Espada nv8 + Elmo contém a União em 100% dos casos. Playwright: subir a nível 3 e escolher carta via toques | Screenshot do modal; screenshot da União |
| **F-006** | **Stamina, esquiva e aparo** — barra de stamina, esquiva por swipe (> 400 pt/s) com 12 passos de i-frames e 3 de recuperação, esquiva perfeita (+15% Poder 2 s), botão de Aparo com janela de 11 passos, aparo falho (24 passos), Postura Quebrada em área, Contra-ataque, Oco Grande e Noviça de Sal com telegrafos brancos (0,6 s / 0,5 s), feedback (flash 2 frames + congelamento 80 ms + som placeholder), prompts de tutorial nos min 1 e 3 | Teste: acerto no passo 2 e no 13 da esquiva não causa dano, no passo 14 causa; aparo no passo 11 após o toque funciona, no 12 não; aparo falho bloqueia regen por 24 passos; Contra-ataque dispara todas as armas uma vez. Playwright: swipe sintético gera esquiva; toque no botão durante o telegrafo gera aparo | Vídeo de 10 s com esquiva perfeita e aparo; log dos testes de janela |
| **F-007** | **HP, Frascos, armadura, Apagar e Cinzas Perdidas** — HP com Brasa Firme, redução `A/(A+20)`, Frasco (40% em 2 s, interrompível, botão 72 pt), Apagar com câmera lenta 1 s, tela de resultado (tempo, nível, mortes, Almas), 30% das Almas viram mancha com posição e Hora, mancha reaparece na próxima Vigília e devolve ao encostar | Teste: redução de armadura em 5 casos; Frasco interrompe com golpe > 15% HP; mancha salva e restaurada entre duas Vigílias com seeds diferentes. Playwright: morrer de propósito e ver a tela de resultado | Screenshot do resultado; screenshot da mancha na Vigília seguinte |
| **F-008** | **Horas, marcos e Fogueira** — Oco Grande Coroado (patada branca, grito vermelho, convoca Ocos, baú), marcos 5/10/15, Fogueira (relógio para, inimigos viram cinza, Descansar com `I` = 1,1, Forjar União com custo por Hora, Partir), autosave na Fogueira e a cada 60 s, **retomada após fechar a aba** ("Continuar da Fogueira da Hora N") | Teste: save versionado serializa e restaura build/nível/Almas/Frascos/`I`; migração de versão. Playwright: fechar a página na Hora II e reabrir mostra a oferta de retomada e restaura o estado | Vídeo da retomada; JSON do save |
| **F-009** | **O Lanterneiro, Amanhecer e A Fome** — arena com névoa (raio 7), HP por nível, Postura (ganhos da seção 3.11, Quebra 3 s, Postura Firme −40%), 3 fases com transição invulnerável, 7 ataques (brancos e vermelhos), Fúria após 5 min, Amanhecer (10 s de céu clareando, Almas ×1,5, Brasa), A Fome aos 23:00 | Teste: Postura enche com 4 aparos; dano fora de Quebra reduzido em 40%; fases trocam em 60% e 25%; aos 23:00 com chefe vivo → derrota. Playwright com seed fixa e script de inputs: lutar 60 s e verificar barra de Postura no debug | Vídeo de 30 s da luta; screenshot do Amanhecer; screenshot de A Fome |
| **F-010** | **Santuário mínimo e PWA** — cena do Santuário (Acender, Iselda, botão Vigília), árvore de Fundação com 8 nós de estatística e reembolso, 300 Almas garantidas após o primeiro Apagar, save meta versionado, todos os textos em `pt-BR.json` por ID (nenhuma string no código, verificado por lint), manifest + service worker + convite "Adicionar à Tela de Início", overlay de paisagem, pausa em `visibilitychange`, **teste em iPhone real** (11 ou 12 e 14+) com vídeo | Teste: custo dos nós segue a fórmula; reembolso zera; lint de strings passa. Playwright: fluxo completo Acender → Vigília → Apagar → Santuário → comprar nó → nova Vigília. iPhone real: Hora IV com ≥ 55 fps médio e sem recarga da aba em 3 Vigílias seguidas | Vídeo em iPhone real; captura de memória do Safari Web Inspector (< 150 MB); relatório do lint |

## 5. Depois de F-010

Ordem sugerida: direção de arte e áudio (style card e sound bible, com aprovação antes de gerar assets) → F-011 Eco de Vigilante → F-012 Nhara e Ulvar (segundo e terceiro Vigilantes, para testar maldições) → F-013 Abadia Ruída → F-014 árvores de Caçada/Memória/Votos → F-015 Pactos → F-016 desafio diário com seed → F-017 conta e save em nuvem. Monetização só após retenção medida (doc 09).
