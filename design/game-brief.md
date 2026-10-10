# Brief do Jogo — *Vigília das Cinzas* (*Ashen Vigil*)

> **Status:** rascunho para aprovação (Sessão 1, etapa 1).
> **Fontes:** `design/gdd/00` a `14` e `17` §4; recorte e números de `design/gdd/18-briefing-tecnico.md` (citado como **B**). Os docs 09, 15 e 16 não foram lidos nesta fase.
> **Precedência:** dentro do recorte do MVP, **B prevalece** sobre o GDD; onde B é omisso e o GDD não o contradiz, vale o GDD (fonte indicada entre parênteses). Tudo o que não está em nenhum dos dois está na seção 11 como pergunta, nunca como decisão.

---

## 1. Em uma frase

Survivor-like com combate soulslike para iPhone em retrato, jogado com uma mão: as armas atacam sozinhas, a horda cresce minuto a minuto, e o jogador sobrevive lendo ataques telegrafados, gastando stamina em esquivas com invulnerabilidade e aparando no momento certo, numa Vigília de 20 minutos que termina no Amanhecer ou no Apagar.

## 2. Pilares (doc 00 §4) e o que a fatia vertical precisa provar

| # | Pilar | Na "Primeira Vigília" |
|---|---|---|
| 1 | **Ler, não reagir** | Todo ataque de Oco Grande, Noviça de Sal, Oco Grande Coroado e Lanterneiro é telegrafado: branco (aparável) ou vermelho (só esquiva). Nenhum dano súbito sem aviso. |
| 2 | **O polegar decide duas coisas** | Mover e esquivar/aparar. Sem botão de ataque. |
| 3 | **Toda morte paga** | Apagar leva 70% das Almas para o Santuário e deixa 30% numa mancha de Cinzas Perdidas recuperável. |
| 4 | **A meta amplia, não substitui** | Os 8 nós de estatística da Fundação são modestos (+2 Armadura, +5% HP etc. por rank). |
| 5 | **O mundo lembra** | No MVP, só a mancha de Cinzas Perdidas (o Eco fica para F-011). |
| 6 | **20 minutos, uma mão, sem culpa** | Fogueiras com autosave, retomada após a aba morrer, pausa sempre disponível. |
| 7 | **Justo no bolso** | **Nenhuma monetização** no MVP nem no primeiro lançamento. |

**Critério de sucesso do marco (B §1):** "o aparo e a esquiva são gostosos no iPhone" e a Vigília inteira roda a 60 fps em iPhone 12 na Hora IV.

## 3. Público, plataforma e classificação

- **Público primário (doc 00 §7):** 18 a 35 anos, jogadores de Vampire Survivors, Brotato, Hades e Dead Cells no celular que querem desafio em sessões curtas. **Secundário:** fãs de Souls que não jogam no touch.
- **Plataforma:** web (PWA instalável), **iPhone em retrato**, Safari iOS 17+. Mesma build roda em desktop (testes). App Store só depois, se a retenção justificar.
- **Classificação alvo:** 12+ (melancolia, não gore; sem sangue detalhado, sem palavrões).
- **Idioma do MVP:** português (BR). Inglês fica para depois; todos os textos já nascem com ID estável para localização.
- **Monetização:** nenhuma. Toda menção a anúncios (docs 02 §8, 11 §3.12) está fora.

## 4. O jogo completo (visão, fora do MVP)

Para orientar decisões de arquitetura que não podem fechar portas. Nada desta tabela entra antes de F-010.

| Categoria | Lançamento completo (doc 00 §6) | Na fatia vertical |
|---|---|---|
| Vigilantes | 12 | 1 (Aldric) |
| Armas | 38 | 3 |
| Passivas | 18 | 2 |
| Uniões | 34 | 1 |
| Relíquias | 20 | 0 (vaga existe e fica vazia) |
| Inimigos | 32 + 2 especiais | 3 + 1 placeholder de elite |
| Chefes | 13 | 1 (O Lanterneiro) |
| Regiões | 6 | 1 (Charneca das Lanternas) |
| Nós da árvore | 112 em 5 árvores | 8 (Fundação, estatística) |
| Ciclos, Pactos, Codex, Forja, Feitos | sim | não |

Implicação de arquitetura: armas, passivas, Uniões, inimigos, chefes, regiões/timelines, nós e textos vivem em `src/dados/*.json` com JSON Schema desde o primeiro dia, para que os outros 35 itens entrem como dados, não como código novo.

## 5. MVP — fatia vertical "Primeira Vigília"

### 5.1 Objetivo (B §1)

Uma Vigília completa e jogável em iPhone real, do toque em "Toque para acender a Chama" até Amanhecer, Apagar ou A Fome, com retorno ao Santuário e uma compra na árvore. Tudo com formas geométricas e paleta provisória.

### 5.2 Recorte (B §2)

| Sistema | No MVP | Fica para depois de F-010 |
|---|---|---|
| Vigilante | **Aldric, o Portador da Brasa** (único) | Outros 11; tela de seleção |
| Região | **Charneca das Lanternas** | Outras 5; modos de mapa; segredos |
| Inimigos | **Oco das Lanternas** (massa), **Oco Grande** (médio, tutorial de esquiva), **Noviça de Sal** (médio à distância, tutorial de aparo) | Os outros 29; enxames e eventos |
| Guardiões e Chefe Menor | **Placeholder "Oco Grande Coroado"** em 5:00, 10:00 (versão maior, baú dourado) e 15:00 (dois ao mesmo tempo) | Oco Coroado, Oco Coroado Maior, Noiva da Turfa, Guardião II real |
| Chefe da Região | **O Lanterneiro**: 3 fases, Postura, Fúria | Segredo das 7 lanternas |
| A Fome | Aos **23:00** com o chefe vivo: derrota imediata com tela própria ("A Fome desce.") | A Fome como inimigo aparável |
| Armas | **Espada Longa do Juramento** (direção do movimento), **Facas de Sal** (mais próximo), **Círculo de Sal** (aura) | As outras 35 |
| Passivas | **Elmo Sem Rosto** (+4 Armadura/nível), **Luvas de Fole** (+8% Poder/nível) | As outras 16 |
| União | **Lâmina do Juramento Eterno** (Espada Longa nv. 8 + Elmo Sem Rosto) | As outras 33 |
| Status | **Sal** (lentidão), **Postura Quebrada** | Sangramento, Queimadura, Medo, Marca |
| Relíquias | Vaga existe e fica vazia (5 vagas de arma + 1 de Relíquia) | Qualquer Relíquia |
| Fogueira | **Descansar, Forjar União, Partir**; relógio para; intensidade ×1,1; autosave e retomada | Oferenda, Rook, Pacto Momentâneo |
| Apagar | Tela, resumo, **30% das Almas viram mancha de Cinzas Perdidas** recuperável na próxima Vigília ao encostar | Eco de Vigilante guardando a mancha; Reviver |
| Amanhecer | Céu clareia 10 s, Almas ×1,5, 1 Brasa (só contabilizada) | Memória do chefe; Noite Infinita |
| Santuário | Cena mínima: entrada pela tela de Acender, **Iselda** (árvore de Fundação: 8 nós de estatística + reembolso), botão **Vigília** | Outros NPCs, Codex, Forja, Pactos, Ciclos |
| Monetização | **Nenhuma** | — |
| Textos | Placeholders em `src/dados/textos/pt-BR.json` com **IDs definitivos** (doc 17 §4) | Roteiro final |
| Áudio | Desbloqueio no toque + **1 som placeholder** por evento crítico: aparo, esquiva perfeita, Quebra de Postura | Música, SFX finais |
| Arte | Formas geométricas: **círculo** (massa), **quadrado** (médios), **triângulo** (jogador), **retângulo grande** (chefe); paleta provisória **#1a1f2b** (fundo) e **#ffb347** (brasa) | Sprites |

Também fora do MVP por não constarem em B: corrida, Reroll/Pular/Banir, raridade de cartas, pickups além de Cinzas e Almas (Brasa Caída, Vela Apagada, Ímã de Osso, Bolsa de Almas, Página Esquecida), Modo Brasa Gentil e demais opções de acessibilidade além de "números de dano desligáveis", inglês, conta e save em nuvem. Telemetria e bônus/névoa da Charneca estão na seção 11.

### 5.3 Fluxo do jogador

```
Primeira abertura:
  Tela de Acender ("Toque para acender a Chama": desbloqueia o áudio)
    → Vigília direto com Aldric na Charneca (doc 11 §4: jogar antes de ver menus)
    → Amanhecer | Apagar | A Fome → Resultado
    → Santuário (Iselda apresenta a árvore; após o 1º Apagar, 300 Almas garantidas)
    → compra guiada de 1 nó → botão Vigília → nova Vigília

Aberturas seguintes:
  Tela de Acender → [se houver Vigília interrompida: "Continuar da Fogueira da Hora N"]
    → Santuário → Vigília → ...
```

Pausa a qualquer momento (botão superior ou dois dedos parados 0,5 s; automática em `visibilitychange` e em interrupção de áudio). Em paisagem, overlay "gire o aparelho".

### 5.4 Estrutura da Vigília (20:00 em 4 Horas de 5:00)

Relógio de jogo; ele **para** dentro do raio de 2 corpos da Fogueira, durante o level up, na pausa e nas transições de fase do chefe (B §3.1). Nenhum spawn nos 30 s antes de cada marco (4:30, 9:30, 14:30, 19:30).

Diretor da Charneca (B §3.7). Os valores minuto a minuto que B dá como faixa ("70 → 100") vêm da tabela base do doc 07 §3.2, que B resume sem contradizer.

| Min | Hora | Roster (peso) | Mín. na tela | Intervalo (s) | Evento |
|---|---|---|---|---|---|
| 0 | I · Crepúsculo | Lanternas (10) | 15 | 2,0 | — |
| 1 | I | Lanternas (10), Grande (1) | 25 | 1,6 | 1 Oco Grande garantido (tutorial de esquiva) |
| 2 | I | idem | 35 | 1,4 | — |
| 3 | I | + Noviça (2) | 45 | 1,2 | 1 Noviça garantida (tutorial de aparo) |
| 4 | I | idem | 55 | 1,0 | — |
| **5** | marco | — | 40 | — | **Guardião I:** Coroado (600 HP) → baú → Fogueira |
| 6 | II · Meia-Noite | Lanternas (8), Grande (3), Noviça (3) | 70 | 0,9 | — |
| 7 | II | idem | 80 | 0,8 | — |
| 8 | II | idem | 90 | 0,8 | — |
| 9 | II | idem | 100 | 0,7 | — |
| **10** | marco | — | 60 | — | **Chefe Menor:** Coroado (1.000 HP) → baú dourado → Fogueira |
| 11 | III · Hora Morta | Lanternas (6), Grande (4), Noviça (4) | 120 | 0,6 | — |
| 12 | III | idem | 140 | 0,6 | — |
| 13 | III | idem | 160 | 0,5 | — |
| 14 | III | idem | 180 | 0,5 | — |
| **15** | marco | — | 80 | — | **Guardião II:** 2 Coroados (600 HP) → Fogueira |
| 16 | IV · Alvorada Negra | Lanternas (6), Grande (5), Noviça (4) | 200 | 0,45 | tela escurece 10% por minuto |
| 17 | IV | idem | 230 | 0,40 | idem |
| 18 | IV | idem | 260 | 0,40 | idem |
| 19 | IV | idem | 300 | 0,35 | idem |
| **20** | chefe | — | arena | — | **O Lanterneiro** |
| 20–23 | chefe | Lanternas (10) | 300 | 0,3 | 23:00 com o chefe vivo: **A Fome** (derrota) |

Regras (B §3.7):
- `intervalo_efetivo = intervalo × (1/I)`; `min_efetivo = min(min × I, TETO)`; `I` = 1,0, ou 1,1 depois de Descansar na Fogueira.
- `TETO` = 300 (iPhone 11/12) ou 500 (iPhone 14+), detectado no boot; na dúvida, 300.
- Excedente: a cada 10 Ocos das Lanternas que não cabem no TETO, surge 1 Oco Grande com o HP somado.
- Spawn em anel de 1,2 a 1,6 telas em volta do jogador, com 60% do lado oposto ao movimento.
- Escala por minuto (B §3.6): `HP = HP_base × (1 + 0,12·min) × I`; `Dano = Dano_base × (1 + 0,05·min)`.

### 5.5 Controles (B §3.5; doc 02 §4; doc 11 §1)

| Ação | Gesto | Números |
|---|---|---|
| Mover | Joystick flutuante: aparece onde o polegar toca na metade inferior da tela, nunca no mesmo lugar | Zona morta 0,15; raio 60 pt; reposiciona a cada toque. A área de toque do joystick deixa livres os botões da direita (doc 02 §4: "60% da largura") |
| Esquivar | Swipe rápido com o dedo do joystick, na direção do swipe, ou toque duplo no joystick | Swipe > 400 pt/s |
| Aparar | Botão **Aparo** no canto inferior direito, acima da safe-area | 80 pt |
| Frasco | Botão **Frasco** acima do Aparo; segurar cancela (doc 02 §4) | 72 pt |
| Pausar | Botão superior ou dois dedos parados | 0,5 s |
| Level up | Toque na carta + segundo toque para confirmar | — |

Regras: nenhum alvo de toque menor que 72 pt; `touch-action: none`, `preventDefault` em `touchmove` não passivo, `-webkit-touch-callout: none`, `user-select: none`; o joystick tolera perda de eventos e se reposiciona no próximo `touchstart` (doc 12 §2.6).

### 5.6 Combate (B §3.3 e §3.4; doc 02 §5)

**Aldric (B §3.3; doc 03 §3.1):**

| Atributo | Valor |
|---|---|
| HP | 130; com a passiva Brasa Firme (+15%) → **150** |
| Brasa Firme | também recebe 20% menos dano enquanto stamina > 50% |
| Stamina | 100 |
| Velocidade | 1,0 = 4,5 corpos/s (144 px/s) |
| Frascos | 3; curam 40% em 2 s; interrompidos por dano > 15% do HP máximo num golpe; não gastam stamina mas bloqueiam a regeneração por 2 s (doc 02 §5.2) |
| Vagas | 5 armas + 1 Relíquia (vazia) + 6 passivas (Juramento Pesado: a 6ª vaga de arma vira Relíquia) |
| Perfil | FOR 6 / DES 3 / INT 1 / FÉ 3 / VIG 7; +1 ponto por nível, no MVP sempre em FOR |
| Invulnerabilidade pós-acerto de contato | 0,3 s = 18 passos |
| Armadura | redução `A / (A + 20)`, teto de 75% |

**Stamina, esquiva e aparo (B §3.4), em passos de 60 Hz:**

| Ação | Regra |
|---|---|
| Regeneração | 30/s depois de 0,5 s sem gastar |
| Esquiva | Custo 25. Duração 21 passos; i-frames 12 passos (passos 2 a 13); recuperação 3 passos; distância 2,5 corpos (categoria Leve: no MVP nenhuma arma é pesada) |
| Esquiva perfeita | Um acerto teria ocorrido durante os i-frames → +15% Poder por 2 s; dispara efeitos "ao usar i-frame" (Facas de Sal: +1 faca, doc 04 §3) |
| Aparo | Custo 15. Janela de 11 passos após o toque. Sucesso: anula o dano, devolve 30 de stamina, aplica Postura Quebrada no atacante e em todos num raio de 2 corpos (2 s atordoados, recebem dano ×2) e dispara o Contra-ataque (todas as armas disparam uma salva extra com dano ×2 em 1,5 s, redirecionadas ao inimigo aparado, doc 04 §10) |
| Aparo falho | 24 passos sem regeneração e vulnerável. Aparar sem ataque chegando só custa a stamina |
| Telegrafo branco | 0,5 s de aviso (Oco Grande: 0,6 s): brilho crescente + silhueta de alcance no chão. Aparável |
| Telegrafo vermelho | 0,8 a 1,2 s. Só esquiva. Só no Grito do Oco Grande Coroado e em ataques do Lanterneiro |
| Feedback de aparo e esquiva perfeita | Flash branco de 2 frames + congelamento de 80 ms + som placeholder. Sem vibração (não existe no iOS web) |

**Dano das armas (B §3.8; doc 10 §2.2):**
`Dano = Base(nível) × (1 + Poder) × Escala`, com `Escala = Σ grau_mult × atributo/10` e graus E 0,25 · D 0,5 · C 0,75 · B 1,0 · A 1,25 · S 1,5.
Exemplo de B: Aldric nv. 1 com Espada Longa = 10 × 1,0 × (0,75 × 6/10 + 0,75 × 3/10) ≈ 7 por golpe.

### 5.7 Inimigos (B §3.6, Ciclo I, minuto 0)

| Inimigo | Forma | HP | Dano | Vel. | XP | Almas | Comportamento |
|---|---|---|---|---|---|---|---|
| Oco das Lanternas | círculo 32 px | 12 | 5/s contato | 0,55 | 1 | 0 ou 1 (50%) | Linha reta até o jogador. Não telegrafa |
| Oco Grande | quadrado 48 px | 100 | 20 por ataque | 0,70 | 5 | 3 | Para a 1,5 corpo; telegrafo branco 0,6 s; arco de 120° à frente; 1,5 s de recuperação |
| Noviça de Sal | quadrado 48 px | 80 | 18 por projétil | 0,80 | 5 | 3 | Mantém 4 corpos; a cada 3 s, projétil lento (3 corpos/s) com telegrafo branco, aparável; o acerto deixa Sal (−50% de velocidade por 3 s) |
| Oco Grande Coroado (placeholder) | quadrado maior | 600 / 1.000 | 25 | 0,65 | 25 | 30 + baú | Patada (branca, 0,6 s) e Grito (vermelho, 1,0 s, empurrão em raio de 3 corpos); convoca 10 Ocos das Lanternas a cada 10 s |

### 5.8 O Lanterneiro (B §3.11; doc 06 §1 e §2.2)

- `HP = 6.500 × (1 + 0,04 × nível do jogador)`.
- Arena: névoa em raio de 7 corpos, centrada onde o jogador estava; obstáculos somem; massa dentro morre; novos não entram (exceto os convocados pelo chefe).
- **Postura 100:** aparo +25; esquiva perfeita +10; acerto de arma +2 (Espada), +5 se pesada. Cheia → **Quebra** de 3 s (dano ×2, sem Postura Firme); depois zera e regenera 20/s por 5 s se não for atingida. **Postura Firme:** −40% de dano fora da Quebra.
- **Fases** em 100% / 60% / 25%, transição de 1,5 s invulnerável (o relógio para).
  - Fase 1: Vara Horizontal (branco, 180°, 0,7 s); Bater a Vara (branco, linha de 6 corpos, 0,6 s); Luz Cega (vermelho, cone de 60° × 6 corpos, 1,0 s; inverte a tela em negativo por 2 s e causa 8 de dano/s).
  - Fase 2: a arena escurece 40%; Lanterna Arremessada (vermelho, círculo de 2 corpos que queima por 6 s, 6/s); convoca 10 Ocos das Lanternas que iluminam 3 corpos ao redor.
  - Fase 3: Explosão de Luz (vermelho, anel que se expande de 1 a 6 corpos em 1 s, a cada 12 s); Agarrar (branco, 0,8 s, raio de 2 corpos; aparar = Quebra imediata; ser pego = 20% do HP e 1 s preso).
- **Fúria:** depois de 5 min de luta, +5% de dano a cada 10 s. Duração alvo da luta: 2 a 3 min.
- Vitória → Amanhecer. Derrota → Apagar. 23:00 com o chefe vivo → A Fome.

### 5.9 Armas, passivas, União, XP, level up e baús (B §3.8 e §3.9)

| Item | Alvo | Escala | Base nv. 1 | Cooldown | Níveis |
|---|---|---|---|---|---|
| Espada Longa do Juramento | direção do movimento; arco de 120° à frente (doc 04 §1.1) | FOR C / DES C | 10 | 1,2 s | nv2 +20% dano; nv3 +1 golpe (volta); **nv4** +50% em Postura Quebrada; nv5 +20% área; nv6 +20% dano; **nv7** 3º golpe é estocada perfurante; nv8 +1 golpe |
| Facas de Sal | mais próximo | DES B | 6 × 2 facas | 0,9 s | nv2 +1 faca; nv3 +20% dano; nv4 facas aplicam Sal; nv5 +1 faca; nv6 +20% velocidade de projétil; nv7 atravessa 1 inimigo; nv8 +1 faca |
| Círculo de Sal | aura, raio 2 corpos; aplica Sal | FÉ A | 4/s | contínuo | nv2 +15% raio; nv3 +20% dano; nv4 Sal mais forte (−60%); nv5 +15% raio; nv6 +20% dano; nv7 pulso de knockback a cada 5 s; nv8 +20% raio |
| **Lâmina do Juramento Eterno** (União) | direção do movimento | FOR B / DES C | Espada nv8 × 1,5 | 1,0 s | Cada golpe gera uma onda de brasa no chão (3 corpos, 8 de dano) |
| Elmo Sem Rosto (passiva) | — | — | +4 Armadura por nível | — | máx. nv5 |
| Luvas de Fole (passiva) | — | — | +8% Poder por nível | — | máx. nv5 |

- **Cinzas de XP:** azul 1, verde 5, vermelha 25; Ímã de 1,5 corpo. `XP(n) = 10 + 8·(n−1) + 0,6·(n−1)²`, lido como o XP para passar do nível n ao n+1 (XP(10) ≈ 130, XP(20) ≈ 380).
- **Level up:** jogo pausado; 3 cartas; 60% são melhorias de itens já possuídos; arma nova só com vaga livre; depois do minuto 12, a passiva que completa uma União pendente aparece com 35%. Reroll, Pular e Banir: 0 no MVP.
- **Baús:** do Guardião e do Chefe Menor. Depois do minuto 10, o baú contém a União se a Espada estiver no nível 8 e o Elmo estiver presente; senão, 1 item (70%), 3 (25%) ou 5 (5%).
- **União:** substitui a Espada Longa na mesma vaga; o Elmo continua.
- **Números de dano** na tela, desligáveis (F-004).

### 5.10 Fogueira, autosave e retomada (B §3.10; doc 02 §3.1; doc 12 §2.2)

- Surge a 3 corpos do jogador depois do marco; raio de 2 corpos. Dentro do raio, o relógio para e os inimigos param e ficam cinzentos (ninguém ataca).
- **Descansar:** HP 100%, Frascos cheios, `I` = 1,1 até a próxima Fogueira ("a noite fica 10% mais densa").
- **Forjar União:** com Espada nv8 + Elmo, forja a União sem esperar baú. Custo: 150 Almas na Fogueira da Hora I, 250 na II, 400 na III.
- **Partir:** autosave ("Vigília guardada") e volta ao mapa.
- **Autosave** também a cada 60 s de jogo.
- **Retomada:** ao reabrir depois de a aba morrer ou o app fechar, oferece "Continuar da Fogueira da Hora N", com build, nível, Almas e Frascos daquele momento. Perde-se o progresso da Hora atual, não a Vigília.

### 5.11 Apagar, Cinzas Perdidas, Amanhecer e A Fome

- **Apagar** (HP 0): "Você se apaga.", câmera lenta de 1 s, tela de Resultado (tempo, nível, mortes causadas, Almas). **70%** das Almas vão para o Santuário; **30%** ficam na **mancha de Cinzas Perdidas**, com posição no mapa e Hora. Na próxima Vigília a mancha reaparece; encostar nela devolve as Almas. Apagar antes de recuperar perde a mancha antiga. Sem Eco e sem Reviver no MVP.
- **Amanhecer** (Lanterneiro derrotado): céu clareia por 10 s sem UI, os inimigos restantes viram cinza, texto "Amanhecer.", Resultado. Almas ×1,5 e 1 Brasa (só contabilizada no save; ainda não compra nada). O doc 06 §1 dá 200 Almas pelo Chefe da Região; B não contradiz.
- **A Fome** (23:00 com o Lanterneiro vivo): derrota imediata com tela própria ("A Fome desce.").

### 5.12 Santuário mínimo e árvore de Fundação (B §3.12; doc 08 §3 e §4.1; doc 11 §3.13)

- Cena mínima: Iselda (abre a árvore) e o botão **Vigília** (inicia direto: Aldric, Charneca). Barra superior com Almas e Brasas.
- **Árvore de Fundação, 8 nós de estatística:** toque mostra o tooltip (nome-memória, efeito, custo, rank); segundo toque compra. **Reembolsar** de graça, com confirmação, zera a árvore e o fator global dela.
- Custo: `300 × 1,12^(rank−1) × (1 + 0,015 × ranks_globais)`.

| Nó (nome-memória) | Ranks | Efeito por rank |
|---|---|---|
| *O peso do martelo do seu pai* | 5 | +4% Poder de armas pesadas |
| *Pele que esqueceu de sangrar* | 5 | +2 Armadura |
| *Fôlego de forja* | 5 | +5% HP máximo |
| *Pés plantados* | 3 | +10% Poise |
| *Casco* | 3 | Invulnerabilidade pós-acerto +0,05 s |
| *Bigorna no peito* | 3 | +3% redução de dano de contato |
| *Ferro frio* | 3 | −5% custo de stamina da esquiva pesada |
| *Mãos de aprendiz* | 3 | Armas de Orun começam no nível 2 |

Três desses nós não têm efeito no MVP (ver Q-11).

- **Primeira compra guiada:** o jogador volta do primeiro Apagar com 300 Almas garantidas e Iselda apresenta a árvore (doc 11 §4).

### 5.13 Economia do MVP (B §3.12; doc 08 §3)

| Resultado da Vigília | Almas alvo |
|---|---|
| Apagar na Hora II | ≈ 400 |
| Apagar na Hora IV | ≈ 1.100 |
| Amanhecer (×1,5 aplicado) | ≈ 1.600 |

Moedas no MVP: **Almas** (gastas na árvore e na Forja da Fogueira) e **Brasas** (só contadas). Sem Memórias e sem Escória.

### 5.14 Apresentação provisória

- **Formas:** triângulo (jogador, 48 px), círculo (massa, 32 px), quadrado (médios, 48 px), retângulo grande (chefe, 128 a 192 px). Tiles de 16 px (doc 13 §1.2).
- **Paleta provisória:** fundo #1a1f2b, brasa #ffb347. Regras de leitura do doc 13 §1.3: o jogador é a coisa mais quente da tela; telegrafo branco é branco puro; telegrafo vermelho é #ff2a2a e nada mais usa esse vermelho (cores extras: Q-17).
- **Áudio:** 3 sons placeholder (aparo, esquiva perfeita, Quebra de Postura). Proposta técnica: sintetizados em Web Audio, sem arquivo de asset.
- **Textos:** todos placeholder, com ID definitivo em `pt-BR.json`.
- **Resolução lógica:** 390×844 pontos a 2× (nunca 3×); corpo = 32 px; mapa 3×3 telas (≈ 1.170×2.532 px) com wrap contínuo; 4 a 8 obstáculos por tela; câmera centrada no jogador mostrando ≈ 12×26 corpos.

## 6. Restrições técnicas e de plataforma (resumo; detalhes no ADR-0002)

**Stack (ADR-0001, decidido):** Phaser 4.2.1 + TypeScript 5.9 + Vite 8. Versões conferidas no npm em 2026-10-10.

**Arquitetura obrigatória:**
- Simulação pura em `src/logica/` (sem Phaser): passo fixo de 60 Hz com acumulador e teto de 5 passos por frame (o excedente é descartado e conta em `passos_perdidos`); RNG com seed por Vigília, com um gerador para o diretor e outro para o level up; entidades em arrays tipados (SoA) com pools pré-alocados; grade espacial própria para as hordas.
- Cenas finas em `src/cenas/`.
- Conteúdo só em `src/dados/*.json`, com JSON Schema e teste de integridade referencial.
- Nenhuma string visível no código: tudo em `src/dados/textos/pt-BR.json`, verificado por lint.

**Orçamento (B §3.13):**

| Métrica | iPhone 11/12 | iPhone 14+ |
|---|---|---|
| Inimigos simultâneos | 300 | 500 |
| Projéteis/efeitos | 200 | 400 |
| Partículas | 300 | 600 |
| Draw calls | ≤ 150 | ≤ 150 |
| CPU por frame (simulação + render) | < 10 ms | < 8 ms |
| Memória total | < 150 MB | < 200 MB |
| Atlases | ≤ 2048² @2×, ≤ 6 por mapa | idem |
| Download inicial | < 15 MB | — |
| Alocação por frame no caminho quente | zero | zero |

Degradação graciosa: frame > 16 ms por 2 s → reduz partículas → reduz luz → converte massa excedente em Ocos Grandes ("a Fome engrossa"). `window.__GAME_DEBUG__` expõe fps, passo, entidades vivas por tipo, passos perdidos e memória estimada.

**iOS (B §3.14; doc 12 §2):**
- Tela "Toque para acender a Chama" desbloqueia o áudio no `touchend`.
- `viewport-fit=cover` e `env(safe-area-inset-*)`; `100dvh`, nunca `100vh`.
- Canvas de tamanho fixo após o boot; resolução interna nunca acima de 2×.
- Bloqueio de pull-to-refresh e zoom.
- Sem Fullscreen API, sem Vibration API, sem orientation lock (overlay em paisagem).
- Wake Lock não funciona em standalone: fallback de vídeo invisível em loop.
- Pausa automática em `visibilitychange` e em interrupção de áudio.
- Sem `SharedArrayBuffer`. Se a simulação for para um Worker, a comunicação é por `postMessage` de TypedArrays (decisão no ADR-0002).
- Save em IndexedDB com snapshot em localStorage e versão de schema; autosave na Fogueira e a cada 60 s.
- Manifest + service worker; convite "Adicionar à Tela de Início" depois da primeira Vigília.

## 7. Glossário obrigatório e palavras proibidas

**Usar em código, dados e tela:** Vigília, Vigilante, Hora, Amanhecer, Apagar, Fogueira, Santuário, Oco, Guardião, Chefe Menor, Chefe da Região, Brasa, Alma, Cinzas (de XP e Cinzas Perdidas), Frasco, Postura, Postura Quebrada, Relíquia, Maldição, Memória, Eco, Ciclo, Pacto, União, Pesquisa, A Fome.

**Nunca em código, dados ou tela:** run, checkpoint, zumbi, roguelike, game over, upgrade, gema, menu principal, fusão, mutator, NG+.

Convenção proposta para código: identificadores em português, sem acento (`vigilia`, `cinzasPerdidas`, `posturaQuebrada`); acentos só nos textos de `pt-BR.json`.

**IDs de texto** (doc 17 §4; B §3.15): formato `BLOCO.SUBBLOCO.NÚMERO` (ex.: `A2.TUTORIAL.01`), em `pt-BR.json` com os campos `{ id, texto, contexto, limite_palavras }`.

## 8. Features F-001 a F-010 (B §4; detalhe em `feature_list.json` na etapa 3)

Uma feature por sessão. **Pronto** = `scripts/verify.sh --feature F-xxx` verde (build, Vitest, Playwright com `--taps-game` e `--seed`), evidência em `production/evidencias/F-xxx/`, crítico independente ≥ 7 e commit descritivo.

| ID | Feature | Prova central |
|---|---|---|
| F-001 | Esqueleto e loop | mesma seed + 1.000 passos = mesmo hash; screenshot 390×844; áudio `running` após o toque |
| F-002 | Movimento e mapa | zona morta e wrap testados; arrasto move; joystick nasce onde se toca |
| F-003 | Hordas | grade = força bruta em 1.000 casos; 300 vivos com fps ≥ 55 por 30 s (CPU 4× mais lenta); heap estável em 60 s |
| F-004 | Armas automáticas | dano por nível = tabela §5.9 (±1%); Sal −50% por 3 s; aura acerta a 2 corpos e não a 2,1 |
| F-005 | XP, level up, passivas e União | `XP(10) = 130 ±1`, `XP(20) = 380 ±2`; regra dos 60%; baú depois do minuto 10 dá a União em 100% dos casos |
| F-006 | Stamina, esquiva e aparo | i-frames nos passos 2 e 13 sim, 14 não; aparo no passo 11 sim, 12 não; falho bloqueia regeneração por 24 passos |
| F-007 | HP, Frascos, armadura, Apagar e Cinzas Perdidas | armadura em 5 casos; Frasco interrompido; mancha atravessa duas Vigílias |
| F-008 | Horas, marcos e Fogueira | save versionado com migração; fechar a página na Hora II e retomar |
| F-009 | O Lanterneiro, Amanhecer e A Fome | Postura cheia em 4 aparos; −40% fora da Quebra; fases em 60% e 25%; 23:00 → derrota |
| F-010 | Santuário mínimo e PWA | custo dos nós pela fórmula; reembolso; lint de strings; fluxo completo; **iPhone real** (11/12 e 14+) com Hora IV ≥ 55 fps médio, memória < 150 MB, 3 Vigílias seguidas sem recarga da aba |

Depois de F-010 (B §5): direção de arte e áudio (style card e sound bible, com aprovação antes de qualquer asset) → F-011 Eco de Vigilante → F-012 Nhara e Ulvar → F-013 Abadia Ruída → F-014 árvores de Caçada/Memória/Votos → F-015 Pactos → F-016 desafio diário com seed → F-017 conta e save em nuvem.

## 9. Riscos do MVP

| Risco | Mitigação |
|---|---|
| Aparo e esquiva não "sentirem" bem no touch (é o critério de sucesso) | Janelas exatas de B em passos; feedback de flash, congelamento e som; **sugestão:** um build de teste em iPhone real logo depois da F-006, sem esperar a F-010 |
| Phaser ter mais custo por objeto que um renderer puro (doc 12 §3) | Simulação fora do Phaser; render da horda em lote; medição desde a F-003 com CPU 4× mais lenta |
| Jetsam do Safari matar a aba | Orçamento de 150 MB, autosave na Fogueira e a cada 60 s, retomada |
| `navigator.deviceMemory` não existe no Safari | Detecção do TETO (300/500) por benchmark curto no boot, com fallback 300 (ADR-0002) |
| Determinismo de ponto flutuante entre motores JS (Safari × Chrome) | O teste de F-001 roda no mesmo motor; o ADR-0002 define como evitar divergência (ex.: trigonometria por tabela) pensando no desafio diário futuro |
| F-010 depende de hardware (iPhone 11/12, iPhone 14+, Mac com Safari Web Inspector) e de uma URL HTTPS para o service worker | Eu preparo o build, a URL e o roteiro de teste; a execução no aparelho é sua (Q-19) |

## 10. Fora do MVP (resumo)

Os outros 11 Vigilantes e a seleção; as outras 5 regiões, modos e segredos; os outros 29 inimigos, enxames e eventos; os chefes reais de marco (Oco Coroado, Oco Coroado Maior, Noiva da Turfa); A Fome aparável; as outras 35 armas, 16 passivas e 33 Uniões; Sangramento, Queimadura, Medo e Marca; Relíquias; Oferenda, Rook e Pacto Momentâneo; Eco e Reviver; Memória do chefe e Noite Infinita; os outros NPCs, Codex, Forja de Brann, Pactos e Ciclos; corrida; Reroll, Pular e Banir; pickups além de Cinzas e Almas; acessibilidade além de "números de dano desligáveis"; inglês; conta e nuvem; música e SFX finais; sprites; **qualquer monetização**.

## 11. Questões abertas (preciso da sua decisão)

Cada uma traz minha recomendação e o ponto que ela bloqueia. Nada aqui foi implementado.

### 11.1 Bloqueiam o ADR-0002 (etapa 2)

| ID | Questão | Onde está a lacuna | Recomendação |
|---|---|---|---|
| Q-01 | **Relógio nos marcos 5, 10 e 15.** B §3.1 só para o relógio na Fogueira, no level up, na pausa e na transição de fase. Então o relógio corre durante o Guardião? Se o Guardião ainda estiver vivo às 6:00, a linha do minuto 6 começa assim mesmo? Nos minutos de marco o intervalo é "—": o diretor repõe até o mínimo (40/60/80) ou não repõe? Há arena nos marcos (o doc 07 diz "arena"; B não diz)? | B §3.1 e §3.7; doc 07 §3.2 | O relógio corre (leitura literal de B). A timeline segue o relógio mesmo com o Guardião vivo. No minuto de marco, o diretor mantém o mínimo com o último intervalo da Hora anterior. Sem arena nos marcos (B só põe arena no 20:00). |
| Q-02 | **Autosave de 60 s × retomada da Fogueira.** B manda retomar "da Fogueira da Hora N", e o doc 02 diz que se perde a Hora atual. Para que serve então o save de 60 s, e de onde se retoma se a aba morre na Hora I (antes de qualquer Fogueira)? Recusar a retomada equivale a quê? | B §3.10; doc 02 §3.1; doc 12 §2.2 | O ponto de retomada é sempre a última Fogueira, ou o início da Vigília na Hora I. O save de 60 s guarda a Vigília em andamento (Almas, Hora, posição) para que nada se perca ao recusar a retomada. Recusar = "Abandonar Vigília" do doc 02 §3.2: leva Almas ×0,5, sem mancha. |
| Q-03 | **A Fome e as Cinzas Perdidas.** A Fome é derrota: ela deixa mancha como o Apagar? A mancha aparece desde o início da próxima Vigília ou só ao chegar à Hora registrada? Se o jogador chega ao Amanhecer sem recuperar a mancha, ela continua? As Almas recuperadas voltam para a Vigília (podem ser perdidas de novo) ou vão direto ao Santuário? | B §2 e §3.12; doc 02 §8; doc 03 §2.3 | A Fome deixa mancha como o Apagar (a derrota é a mesma; só muda a tela). A mancha aparece ao entrar na Hora registrada e fica até o fim da Vigília. Só some ao ser recuperada ou ao Apagar de novo. As Almas recuperadas entram na Vigília (padrão Souls). |
| Q-04 | **Fúria inalcançável.** O Lanterneiro surge às 20:00 e A Fome encerra às 23:00, então a luta dura no máximo ≈ 3 min e a Fúria (depois de 5 min) nunca dispara no MVP. | B §3.11 × B §3.1 | Implementar a Fúria como especificada (testada isoladamente, com A Fome desligada no teste), porque ela vale para os chefes futuros. Registrar que no MVP ela é inalcançável. |
| Q-05 | **Unidade "tela" do anel de spawn (1,2 a 1,6 telas).** A largura (390), a altura (844) ou a meia-diagonal (≈ 465 px)? Com o mapa 3×3 em wrap, 1,6 × 844 px dá a volta e cai na tela. | B §3.7; doc 07 §3.4 | Meia-diagonal da tela: anel de ≈ 558 a 744 px, sempre fora da vista e sem dar a volta no mapa. |

### 11.2 Regras de jogo (bloqueiam a feature indicada)

| ID | Questão | Onde está a lacuna | Recomendação | Bloqueia |
|---|---|---|---|---|
| Q-06 | **HP do Oco Grande Coroado:** 600/1.000 são valores finais, ou base que escala por minuto (`× (1 + 0,12·min) × I`), como os outros inimigos? O Chefe Menor usa a fórmula de inimigo ou a de chefe (`× (1 + 0,04·nível)`)? | B §3.6 (tabela "minuto 0" + fórmula) × §3.7 ("Coroado 600 HP") | Base com escala por minuto e por `I`, como qualquer inimigo (5:00 → 960; 10:00 → 2.200; 15:00 → 1.680 cada). Fórmula de chefe só no Lanterneiro. | F-008 |
| Q-07 | **Guardião II tem baú?** Na tabela do 15:00 B não cita baú, mas o Coroado tem "30 + baú" e §3.9 diz "Baú: Guardião e Chefe Menor". São 1 ou 2 baús (dois Coroados)? | B §3.7 × §3.6 × §3.9 | 1 baú por Coroado (2 no 15:00). | F-008 |
| Q-08 | **Dano de contato "5/s" com invulnerabilidade de 18 passos.** (a) Cada acerto vale 5 × 0,3 = 1,5, e o contato contínuo rende exatamente 5/s, por mais Ocos que encostem; ou (b) cada acerto vale 5, e a invulnerabilidade limita a 1 acerto a cada 0,3 s (até ≈ 16,7/s no minuto 0). | B §3.6 × §3.3 | (b): torna o cerco uma ameaça real, como pede o alvo de causas de morte do doc 10 §3.1 (30% cerco/contato). Mas é decisão de balanceamento sua. | F-003 |
| Q-09 | **A invulnerabilidade pós-acerto vale para qualquer dano** (ataques, projéteis), ou só para contato, como diz B? E o dano contínuo de área (Luz Cega 8/s, Lanterna Arremessada 6/s)? | B §3.3; doc 02 §5.6; nó *Casco* | Vale para contato, projétil e ataque. Dano contínuo de área ignora a invulnerabilidade e não a ativa. | F-006 |
| Q-10 | **Esquiva perfeita: o contato de Ocos das Lanternas conta?** Se contar, rolar pela horda vira +15% Poder de graça. | B §3.4; doc 02 §5.3 ("um ataque tocaria") | Só ataques telegrafados e projéteis contam. | F-006 |
| Q-11 | **Três nós da Fundação não fazem nada no MVP:** *O peso do martelo do seu pai* e *Ferro frio* (não há arma pesada) e *Pés plantados* (não há sistema de Poise). Mostrar e permitir comprar? E o nó central *Primeira brasa* (+5 HP, já aberto) entra? Ele mudaria o HP de 150 para 155. | B §2 ("8 nós de estatística") × doc 08 §4.1 | Os 8 aparecem; os 3 sem efeito ficam visíveis mas bloqueados ("ainda esquecida"), para não vender nada vazio. O nó central fica fora (B fixa HP 150). | F-010 |
| Q-12 | ***Mãos de aprendiz* ×3:** o que muda por rank? | doc 08 §4.1 | Rank r → a Espada Longa (e a União) começa no nível 1 + r (máx. 4). | F-010 |
| Q-13 | **Itens de level up esgotados.** Com 3 armas e 2 passivas, o máximo é 33 níveis de item, e o alvo é o nível 29 mais os baús. O que aparece quando não há mais cartas, e quando há menos de 3? | B §3.9; doc 02 §7 | Carta "Bolsa de Almas" (+50 Almas, valor do doc 02 §7) completando as vagas. | F-005 |
| Q-14 | **O que é "1 item" de baú?** | B §3.9; doc 02 §6.3 | +1 nível numa arma ou passiva possuída ao acaso, sem escolha (padrão Vampire Survivors). | F-005 |
| Q-15 | **Fogueira:** os inimigos "param e viram cinza" ficam congelados e voltam ao Partir, ou morrem? O jogador pode ignorar a Fogueira e seguir (sem Descansar)? Ela some ao Partir? | B §3.10; doc 07 §4; doc 02 §3.1 | Congelados e cinzentos; voltam ao Partir. Ignorar é permitido: a Fogueira fica no mapa até a próxima Hora começar (minuto 6/11/16) e some depois do Partir. | F-008 |
| Q-16 | **Pausa e "Abandonar Vigília".** Nenhuma feature de B cobre a tela de pausa, mas o botão está nos controles e o toggle de números de dano (F-004) precisa de um lugar. "Abandonar Vigília (Almas ×0,5)" entra no MVP? | B §3.5 e §4; doc 02 §3.2; doc 11 §3.9 | Botão e gesto de pausa + tela mínima (Continuar, números de dano, som) na F-004. "Abandonar" na F-007, com o Resultado. | F-004/F-007 |
| Q-17 | **Cores além das duas provisórias.** Preciso pelo menos de branco (telegrafo), #ff2a2a (telegrafo vermelho), Cinzas azul/verde/vermelha (a vermelha não pode ser #ff2a2a) e uma cor de UI. | B §1 × doc 13 §1.3 | Usar a base do doc 13 §1.3 (#0b0e14, #2b3340, #e2652b, #7a1f1f, #e8dcc4 osso/UI, #dfe8ea sal, #ff2a2a, branco). Para as Cinzas: azul #5aa9e6, verde #6cc57c, vermelha #c8324b. | F-002 |
| Q-18 | **Bônus e névoa da Charneca.** O doc 07 dá à Charneca +10% de velocidade e névoa com visão de 85%. B fixa 4,5 corpos/s e não cita a névoa. | doc 07 §2 × B §3.3 | Ambos fora do MVP. | F-002 |
| Q-19 | **Teste em aparelho.** Onde hospedar o build HTTPS para os iPhones (o service worker exige HTTPS)? E um teste antecipado depois da F-006? | B §4 (F-010) | GitHub Pages via Actions a partir deste repositório, com build de teste após a F-006 e a F-010. | F-006/F-010 |
| Q-20 | **Telemetria.** O doc 10 §6 pede eventos "desde o protótipo"; B não cita. | doc 10 §6 × B §2 | Fora do MVP como envio. Só um registro local de eventos exposto em `__GAME_DEBUG__` para os testes. | F-001 |
| Q-21 | **Listas de palavras proibidas divergem.** B e você listam 11 palavras. O doc 17 §5 acrescenta "vitória, morte, menu" e o doc 01 §8 acrescenta outras ("partida", "save", "ouro"...). Mas a tela de Resultado do GDD mostra "mortes causadas". | B §3.15 × doc 17 §5 × doc 01 §8 × doc 11 §3.12 | O lint bloqueia as 11 de B em código, dados e textos (palavra inteira, ignorando `node_modules` e APIs de terceiros). As extras viram aviso só em `pt-BR.json`. | etapa 3 |
| Q-22 | **Formato do ID de texto.** B e o doc 17 dizem `BLOCO.SUBBLOCO.NÚMERO`, mas os exemplos de B usam palavras no fim (`I1.FOGUEIRA.DESCANSAR`, `E1.LANTERNEIRO.TITULO`). Além disso, HUD, pausa, Resultado, overlay e convite PWA não têm bloco no doc 17. | B §3.15 × doc 17 §3 e §4 | Aceitar número ou palavra em maiúsculas no 3º segmento (`^[A-K][0-9]+\.[A-Z0-9_]+\.[A-Z0-9_]+$`). Textos de sistema sem bloco vão para o Bloco A a partir de `A5` (ex.: `A5.HUD.01`, `A6.PAUSA.01`). | etapa 3 |

### 11.3 Números ausentes (a fechar com você antes de cada feature)

B e o GDD não dão estes números. Antes de começar a feature, trago a lista com propostas para aprovar.

- **F-002:** tamanho e forma dos obstáculos; hitboxes (jogador e inimigos); como os inimigos contornam obstáculos.
- **F-003:** força de separação entre Ocos (para não se empilharem).
- **F-004:** alcance do arco da Espada; intervalo entre golpes extras; formato da estocada (nv7); velocidade, alcance e alvos múltiplos das Facas; frequência do tick do Círculo; dano da onda da Lâmina (escala ou fixo); como o Círculo (aura) participa do Contra-ataque; se os obstáculos bloqueiam as Facas e o projétil da Noviça.
- **F-006:** alcance do arco do Oco Grande; tamanho e duração do projétil da Noviça; se a recuperação da esquiva está dentro dos 21 passos (passos 19 a 21) ou depois; intervalo máximo do toque duplo; janela de medida do swipe; fator da "câmera lenta leve" do tutorial do minuto 1 (doc 11 §4). Já dados pelo GDD: o tutorial de aparo repete com janela +0,1 s após 2 falhas (doc 11 §4); o congelamento de 80 ms = 5 passos.
- **F-007:** fator da câmera lenta do Apagar; se o Frasco interrompido consome a carga; quanto tempo "segurar" leva para cancelar o Frasco; se FOR dá HP (doc 03 diz "+HP máximo leve", sem número) e se Aldric ganha HP por nível.
- **F-008:** alcance da Patada, dano e distância do empurrão do Grito, cadência de ataque do Coroado; tamanho do Coroado.
- **F-009:** dano de Vara Horizontal, Bater a Vara e Explosão de Luz; alcance e largura dos golpes; velocidade e IA de escolha de ataque do Lanterneiro; frequência da convocação da fase 2; se o dano do chefe escala por minuto; sentido de "zera e regenera 20/s por 5 s" na Postura; se o aparo comum aplica o atordoamento de Postura Quebrada no chefe ou só +25 de Postura; tamanho do retângulo do chefe.
- **F-010:** como *Bigorna no peito* (+3%) se combina com a armadura (multiplicativa?).

## 12. Notas de processo

- `CLAUDE.md`, `playbook/00-leia-primeiro.md` e `playbook/08-praticas-de-producao-web-phaser.md` **não existem** neste repositório; segui sem eles.
- Os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature` e `/critico-independente` não existem nesta sessão, e não há Stop hook configurado. O brief foi escrito à mão. O "crítico independente" será um subagente revisor separado, que dá nota de 0 a 10. O fechamento de cada sessão será um resumo em `progress.md`.
- **ADR-0001 não existe** no repositório. Na etapa 2 eu o crio, registrando a decisão já tomada (Phaser 4.2.1 + TS 5.9 + Vite 8), junto com o ADR-0002.
- O objeto de debug se chama `window.__GAME_DEBUG__` (B §4). Na sua mensagem ele apareceu como `GAME_DEBUG` porque o Markdown come os sublinhados.
- O GDD foi copiado sem alterações de `docs/` do branch `claude/ecstatic-sagan-g9k3x6` (commit `62872cc`) para `design/gdd/`.
