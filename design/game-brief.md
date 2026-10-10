# Brief do Jogo — *Vigília das Cinzas* (*Ashen Vigil*)

> **Status:** rascunho v2 para aprovação (Sessão 1, etapa 1). Revisado por 5 revisores independentes, cada um com um verificador cético; os achados confirmados foram aplicados.
> **Fontes:** `design/gdd/00` a `14` e `17` §4; recorte e números de `design/gdd/18-briefing-tecnico.md`, citado como **B**. Os docs 09, 15 e 16 não foram lidos nesta fase.
> **Precedência:** dentro do recorte do MVP, **B prevalece** sobre o GDD. Onde B é omisso, a regra proposta está na Q-00. Tudo o que não está em B nem no GDD aparece na seção 11 como pergunta ou proposta, nunca como decisão.
> **Convenção deste documento:** o que vem de B ou do GDD é fato, com a fonte entre parênteses; o que é leitura ou proposta minha está marcado com o número da questão (Q-xx).

---

## 1. Em uma frase

Survivor-like com combate soulslike para iPhone em retrato, jogado com uma mão. As armas atacam sozinhas e a horda cresce minuto a minuto; o jogador sobrevive lendo ataques telegrafados, gastando stamina em esquivas com invulnerabilidade e aparando no momento certo. A Vigília dura 20 minutos e termina no Amanhecer ou no Apagar.

## 2. Pilares (doc 00 §4) e o que a fatia vertical precisa provar

| # | Pilar | Na "Primeira Vigília" |
|---|---|---|
| 1 | **Ler, não reagir** | Todo ataque do Oco Grande, da Noviça de Sal, do Oco Grande Coroado e do Lanterneiro é telegrafado: branco (aparável) ou vermelho (só esquiva). Nenhum dano súbito sem aviso. |
| 2 | **O polegar decide duas coisas** | Mover, e esquivar ou aparar. Sem botão de ataque. |
| 3 | **Toda morte paga** | O Apagar leva as Almas para o Santuário, menos 30%, que ficam numa mancha de Cinzas Perdidas recuperável. |
| 4 | **A meta amplia, não substitui** | Os 8 nós de estatística da Fundação são modestos: +2 Armadura, +5% HP etc. por rank. |
| 5 | **O mundo lembra** | No MVP, só a mancha de Cinzas Perdidas. O Eco fica para a F-011. |
| 6 | **20 minutos, uma mão, sem culpa** | Fogueiras com autosave, retomada depois de a aba morrer, pausa sempre disponível. |
| 7 | **Justo no bolso** | **Nenhuma monetização**, no MVP nem no primeiro lançamento. |

**Critério de sucesso do marco (B §1):** "o aparo e a esquiva são gostosos no iPhone", e a Vigília inteira roda a 60 fps em iPhone 12 na Hora IV.

## 3. Público, plataforma e classificação

- **Público primário (doc 00 §7):** 18 a 35 anos, jogadores de Vampire Survivors, Brotato, Hades e Dead Cells no celular que querem desafio em sessões curtas. **Secundário:** fãs de Souls que não jogam no touch.
- **Plataforma:** web (PWA instalável), **iPhone em retrato**, Safari iOS 17+. A mesma build roda em desktop para os testes. App Store só depois, se a retenção justificar.
- **Classificação alvo:** 12+ (melancolia, não gore; sem sangue detalhado nem palavrões).
- **Idioma do MVP:** português (BR). Inglês fica para depois. Todo texto nasce com ID estável para localização.
- **Monetização:** nenhuma. Toda menção a anúncios nos docs 02 §8 e 11 §3.12 está fora.

## 4. O jogo completo (visão, fora do MVP)

Serve para orientar a arquitetura, que não pode fechar portas. Nada desta tabela entra antes da F-010.

| Categoria | Lançamento completo (doc 00 §6) | Na fatia vertical |
|---|---|---|
| Vigilantes | 12 | 1 (Aldric) |
| Armas | 38 | 3 |
| Passivas | 18 | 2 |
| Uniões | 34 | 1 |
| Relíquias | 20 | 0 (a vaga existe e fica vazia) |
| Inimigos | 32 + 2 especiais | 3, mais o placeholder de Guardião/Chefe Menor |
| Chefes | 13 | Chefe da Região: 1 (O Lanterneiro); Chefe Menor: só o placeholder |
| Regiões | 6 | 1 (Charneca das Lanternas) |
| Nós da árvore | 112 em 5 árvores | 8 (Fundação, estatística) |
| Ciclos, Pactos, Codex, Forja de Brann, Feitos | sim | não |

Implicação para a arquitetura: armas, passivas, Uniões, inimigos, chefes, regiões e timelines, nós e textos vivem em `src/dados/*.json` com JSON Schema desde o primeiro dia. Assim o resto do conteúdo entra como dado, não como código novo.

## 5. MVP — fatia vertical "Primeira Vigília"

### 5.1 Objetivo (B §1)

Uma Vigília completa e jogável em iPhone real: do toque em "Toque para acender a Chama" até o Amanhecer ou o Apagar, com retorno ao Santuário e uma Pesquisa comprada na árvore. Tudo com formas geométricas e paleta provisória.

### 5.2 Recorte (B §2)

| Sistema | No MVP | Fica para depois de F-010 |
|---|---|---|
| Vigilante | **Aldric, o Portador da Brasa** (único) | Outros 11; tela de seleção |
| Região | **Charneca das Lanternas** | Outras 5; modos de mapa; segredos |
| Inimigos | **Oco das Lanternas** (massa), **Oco Grande** (médio, tutorial de esquiva), **Noviça de Sal** (médio à distância, tutorial de aparo) | Os outros 29; eventos de enxame |
| Guardiões e Chefe Menor | **Placeholder "Oco Grande Coroado"**: Oco Grande com HP ×6, dois ataques telegrafados (patada branca, grito vermelho) e baú. Aparece em 5:00, em 10:00 (versão com HP ×10 e baú dourado) e em 15:00 (dois ao mesmo tempo) | Oco Coroado, Oco Coroado Maior, Noiva da Turfa, Guardião II real |
| Chefe da Região | **O Lanterneiro**: 3 fases, Postura, Fúria | Segredo das 7 lanternas |
| A Fome | Aos **23:00** com o chefe vivo: derrota imediata com tela própria ("A Fome desce.") | A Fome como inimigo aparável |
| Armas | **Espada Longa do Juramento** (direção do movimento), **Facas de Sal** (mais próximo), **Círculo de Sal** (aura) | As outras 35 |
| Passivas | **Elmo Sem Rosto** (+4 Armadura/nível), **Luvas de Fole** (+8% Poder/nível) | As outras 16 |
| União | **Lâmina do Juramento Eterno** (Espada Longa nv. 8 + Elmo Sem Rosto) | As outras 33 |
| Status | **Sal** (lentidão), **Postura Quebrada** | Sangramento, Queimadura, Medo, Marca |
| Relíquias | A vaga existe e fica vazia (Aldric: 5 vagas de arma + 1 de Relíquia) | Qualquer Relíquia |
| Fogueira | **Descansar, Forjar União, Partir**; relógio para; intensidade ×1,1; autosave e retomada | Oferenda, Rook, Pacto Momentâneo |
| Apagar | Tela, resumo, **30% das Almas viram mancha de Cinzas Perdidas**, recuperável na próxima Vigília ao encostar | Eco de Vigilante guardando a mancha; Reviver |
| Amanhecer | Céu clareia por 10 s, Almas ×1,5, 1 Brasa (só contabilizada) | Memória do chefe; Noite Infinita |
| Santuário | Cena mínima: "Acender", **Iselda** (árvore de Fundação com os 8 nós de estatística + reembolso), botão **Vigília** (leitura de "Acender": Q-34) | Outros NPCs, Codex, Forja de Brann, Pactos, Ciclos |
| Monetização | **Nenhuma** | — |
| Textos | Placeholders em `src/dados/textos/pt-BR.json` com **IDs definitivos** (doc 17 §4) | Roteiro final |
| Áudio | Desbloqueio no toque + **1 som placeholder** por evento crítico: aparo, esquiva perfeita, Quebra de Postura | Música, SFX finais |
| Arte | Formas geométricas: **círculo** (massa), **quadrado** (médios), **triângulo** (jogador), **retângulo grande** (chefe). Paleta provisória **#1a1f2b** (fundo) e **#ffb347** (brasa) | Sprites |

B também declara fora do MVP, de forma explícita: corrida, e Reroll/Pular/Banir (0 no MVP). Para os sistemas que B não cita (raridade de cartas, pickups como a Brasa Caída, Poise, opções de acessibilidade, telemetria, névoa da Charneca), a regra está na Q-00.

### 5.3 Fluxo do jogador

```
Primeira abertura:
  Tela de Acender ("Toque para acender a Chama": desbloqueia o áudio)
    → Vigília direto com Aldric na Charneca (doc 11 §4: jogar antes de ver menus)
    → Amanhecer | Apagar (inclusive por A Fome) → Resultado
    → Santuário: depois do 1º Apagar, Iselda apresenta a árvore e há 300 Almas garantidas (Q-20)
    → Pesquisa guiada → botão Vigília → nova Vigília

Aberturas seguintes:
  Tela de Acender
    ├─ havia Vigília interrompida → oferta "Continuar da Fogueira da Hora N"
    │     ├─ Continuar → volta à Vigília, na Fogueira, com o estado salvo
    │     └─ Recusar   → (Q-03) → Santuário
    └─ senão → Santuário → botão Vigília → Vigília
```

A pausa está sempre disponível: botão superior ou dois dedos parados por 0,5 s (B §3.5), e é automática em `visibilitychange` e em interrupção de áudio. Em paisagem aparece o overlay "gire o aparelho".

### 5.4 Estrutura da Vigília (20:00 em 4 Horas de 5:00)

O relógio de jogo **para** dentro do raio de 2 corpos da Fogueira, durante o level up, na pausa e nas transições de fase do chefe (B §3.1). B proíbe spawn nos 30 s antes de cada marco: a partir de 4:30, 9:30 e 14:30. Se 19:30 entra na regra é a Q-11.

**As Horas (doc 02 §3):** I · Crepúsculo 0:00–5:00 · II · Meia-Noite 5:00–10:00 · III · Hora Morta 10:00–15:00 · IV · Alvorada Negra 15:00–20:00 · 20:00–23:00 sem Hora (Lanterneiro e A Fome). O marco que fecha uma Hora acontece no 1º minuto da seguinte. A Fogueira que vem depois dele é a "Fogueira da Hora" fechada: depois do Guardião I, é a Fogueira da Hora I (B §3.10: Forjar custa 150 "na Hora I").

**Diretor da Charneca.** Roster e pesos vêm de B §3.7. Onde B dá uma faixa ("70 → 100"), os valores de cada minuto (mínimo e intervalo) vêm do doc 07 §3.2, que bate com as pontas da faixa de B. Os pesos do roster de B diferem do doc 07 (o Oco Grande entra já no minuto 6, a Noviça tem peso 4 nos minutos 11 a 14, o Oco Grande tem peso 5 nos minutos 16 a 19); vale B.

| Min | Hora | Roster (peso) | Mín. na tela | Intervalo (s) | Evento |
|---|---|---|---|---|---|
| 0 | I | Lanternas (10) | 15 | 2,0 | — |
| 1 | I | Lanternas (10), Grande (1) | 25 | 1,6 | 1 Oco Grande garantido (tutorial de esquiva) |
| 2 | I | idem | 35 | 1,4 | — |
| 3 | I | + Noviça (2) | 45 | 1,2 | 1 Noviça garantida (tutorial de aparo) |
| 4 | I | idem | 55 | 1,0 | sem spawn a partir de 4:30 |
| **5** | II | — | 40 | — | **Marco · Guardião I:** 1 Coroado (600 HP) → baú → Fogueira da Hora I |
| 6 | II | Lanternas (8), Grande (3), Noviça (3) | 70 | 0,9 | — |
| 7 | II | idem | 80 | 0,8 | — |
| 8 | II | idem | 90 | 0,8 | — |
| 9 | II | idem | 100 | 0,7 | sem spawn a partir de 9:30 |
| **10** | III | — | 60 | — | **Marco · Chefe Menor:** 1 Coroado (1.000 HP) → baú dourado → Fogueira da Hora II |
| 11 | III | Lanternas (6), Grande (4), Noviça (4) | 120 | 0,6 | — |
| 12 | III | idem | 140 | 0,6 | — |
| 13 | III | idem | 160 | 0,5 | — |
| 14 | III | idem | 180 | 0,5 | sem spawn a partir de 14:30 |
| **15** | IV | — | 80 | — | **Marco · Guardião II:** 2 Coroados (600 HP cada) → 2 baús (um por Coroado, B §3.6; doc 07 §3.3) → Fogueira da Hora III |
| 16 | IV | Lanternas (6), Grande (5), Noviça (4) | 200 | 0,45 | tela escurece 10% por minuto |
| 17 | IV | idem | 230 | 0,40 | idem |
| 18 | IV | idem | 260 | 0,40 | idem |
| 19 | IV | idem | 300 | 0,35 | idem (19:30: Q-11) |
| **20** | — | — | arena | — | **O Lanterneiro** |
| 20–23 | — | Lanternas (10) | 300 | 0,3 | 23:00 com o chefe vivo: **A Fome**. Conflito com a arena: Q-09 |

Regras (B §3.7):
- `intervalo_efetivo = intervalo × (1/I)` e `min_efetivo = min(min × I, TETO)`, com `I` = 1,0, ou 1,1 depois de Descansar na Fogueira.
- `TETO` = 300 (iPhone 11/12) ou 500 (iPhone 14+), detectado por `deviceMemory`/benchmark no boot; na falta, 300. O que o TETO conta é a Q-08.
- Excedente: a cada 10 Ocos das Lanternas que não cabem no TETO, surge 1 Oco Grande com o HP somado.
- Spawn em anel de 1,2 a 1,6 telas em volta do jogador (unidade: Q-06), com 60% do lado oposto ao movimento (Q-07).
- Escala por minuto (B §3.6): `HP = HP_base × (1 + 0,12·min) × I` e `Dano = Dano_base × (1 + 0,05·min)`. O que "min" significa e quando o valor é fixado é a Q-10.

### 5.5 Controles (B §3.5; doc 02 §4; doc 11 §1)

| Ação | Gesto | Números |
|---|---|---|
| Mover | Joystick flutuante: aparece onde o polegar toca na metade inferior e reposiciona a cada novo toque | Zona morta 0,15; raio 60 pt. A área do joystick deixa livres os botões da direita (doc 02 §4: "60% larg.") |
| Esquivar | Swipe com o dedo do joystick, na direção do swipe, ou toque duplo no joystick | Swipe > 400 pt/s |
| Aparar | Botão **Aparo** no canto inferior direito, acima da safe-area | 80 pt |
| Frasco | Botão **Frasco** acima do Aparo; segurar cancela (doc 02 §4) | 72 pt |
| Pausar | Botão superior ou dois dedos parados (conflito de gestos: Q-25) | 0,5 s |
| Level up | Toque na carta + segundo toque para confirmar | — |

Regras: nenhum alvo de toque menor que 72 pt; `touch-action: none`; `preventDefault` em `touchmove` não passivo; `-webkit-touch-callout: none`; `user-select: none`. O joystick tolera eventos perdidos e se reposiciona no próximo `touchstart` (doc 12 §2.6).

### 5.6 Combate (B §3.3 e §3.4; doc 02 §5)

**Aldric (B §3.3; doc 03 §3.1):**

| Atributo | Valor |
|---|---|
| HP | 130; com a passiva Brasa Firme (+15%), **150** |
| Passiva Brasa Firme | Também recebe 20% menos dano enquanto a stamina está acima de 50% |
| Maldição Juramento Pesado | No máximo 5 armas; a 6ª vaga vira Relíquia (vazia no MVP) |
| Stamina | 100 |
| Velocidade | 1,0 = 4,5 corpos/s (144 px/s) |
| Frascos | 3; curam 40% em 2 s; interrompidos por um golpe de mais de 15% do HP máximo; não gastam stamina, mas suspendem a regeneração por 2 s (doc 02 §5.2) |
| Vagas | 5 armas + 1 Relíquia (vazia) + 6 passivas |
| Perfil | FOR 6 / DES 3 / INT 1 / FÉ 3 / VIG 7; +1 ponto por nível, no MVP sempre em FOR (teto de FOR: 11.3, F-005) |
| Invulnerabilidade pós-acerto de contato | 0,3 s = 18 passos (o que ela bloqueia: Q-14) |
| Armadura | Redução `A / (A + 20)`, teto de 75% |
| Poise | O GDD define a regra (FOR e Armadura somam poise; só há empurrão se o knockback passar dele), mas sem números: Q-16 |

**Stamina, esquiva e aparo (B §3.4)**, em passos de 60 Hz (1 passo = 16,667 ms):

| Ação | Regra |
|---|---|
| Regeneração | 30/s depois de 0,5 s sem gastar |
| Esquiva | Custo 25. Duração 21 passos; i-frames 12 passos (passos 2 a 13); recuperação 3 passos; distância 2,5 corpos. Categoria Leve: no MVP nenhuma arma é pesada |
| Esquiva perfeita | "Um acerto teria ocorrido durante os i-frames" (o que conta: Q-15) → +15% Poder por 2 s. Dispara efeitos "ao usar i-frame": Facas de Sal +1 faca (doc 04 §3; doc 02 §5.3) |
| Aparo | Custo 15. Janela de 11 passos depois do toque. Sucesso: anula o dano, devolve 30 de stamina, aplica Postura Quebrada no atacante e em todos num raio de 2 corpos (2 s atordoados, recebem dano ×2) e dispara o Contra-ataque: todas as armas disparam uma salva extra com dano ×2 em 1,5 s, redirecionadas ao inimigo aparado (doc 04 §10) |
| Aparo falho | 24 passos sem regeneração e vulnerável. Aparar sem nenhum ataque chegando só custa a stamina (doc 02 §5.4) |
| Telegrafo branco | 0,5 s de aviso (Oco Grande: 0,6 s): brilho crescente + silhueta de alcance no chão. Aparável |
| Telegrafo vermelho | 0,8 a 1,2 s. Só esquiva. Só no Grito do Oco Grande Coroado e em ataques do Lanterneiro. B traz o vermelho já para as 5:00, contra o doc 02 §5.4 ("a partir da Hora III"); vale B |
| Feedback de aparo e esquiva perfeita | Flash branco de 2 frames + congelamento de 80 ms + som placeholder. Sem vibração, que não existe no iOS web |

**Dano das armas (doc 10 §2.2; B §3.8):**
`Dano = Base(nível) × (1 + Poder) × Escala × Mult_status × Mult_stamina`, com `Escala = Σ grau_mult × atributo/10` e graus E 0,25 · D 0,5 · C 0,75 · B 1,0 · A 1,25 · S 1,5. `Mult_stamina` só vale para armas pesadas, então é 1 no MVP. A ordem de empilhamento dos multiplicadores está no 11.3 (F-004).
Exemplo de B: Aldric nv. 1 com Espada Longa = 10 × 1,0 × (0,75 × 6/10 + 0,75 × 3/10) ≈ 7 por golpe. **Alvos de DPS (B §3.8; doc 10 §3.1):** ≈ 60 no minuto 5 e ≈ 2.000 no minuto 20.

### 5.7 Inimigos (B §3.6, Ciclo I, minuto 0)

| Inimigo | Forma | HP | Dano | Vel. | XP | Almas | Comportamento |
|---|---|---|---|---|---|---|---|
| Oco das Lanternas | círculo 32 px | 12 | 5/s contato (Q-13) | 0,55 | 1 | 0 ou 1 (50%) | Linha reta até o jogador; não telegrafa |
| Oco Grande | quadrado 48 px | 100 | 20 por ataque | 0,70 | 5 | 3 | Para a 1,5 corpo; telegrafo branco 0,6 s; arco de 120° à frente; 1,5 s de recuperação |
| Noviça de Sal | quadrado 48 px | 80 | 18 por projétil | 0,80 | 5 | 3 | Mantém 4 corpos; a cada 3 s, um projétil lento (3 corpos/s) com telegrafo branco, aparável; deixa Sal (−50% de velocidade por 3 s) |
| Oco Grande Coroado (placeholder) | quadrado (tamanho: 11.3, F-008) | 600 (Oco Grande × 6) / 1.000 (× 10) (escala: Q-12) | 25 | 0,65 | 25 | 30 + baú | Patada (branca, 0,6 s) e Grito (vermelho, 1,0 s, empurrão em raio de 3 corpos); convoca 10 Ocos das Lanternas a cada 10 s |

Se o Coroado das 10:00, que faz o papel de Chefe Menor, segue as regras universais de chefe do doc 06 §1 é a Q-02.

### 5.8 O Lanterneiro (B §3.11; doc 06 §1 e §2.2)

- `HP = 6.500 × (1 + 0,04 × nível do jogador)`.
- Arena: névoa em raio de 7 corpos, centrada onde o jogador estava. Os obstáculos somem, a massa que está dentro morre e ninguém novo entra, exceto os convocados pelo chefe.
- **Postura 100:** aparo +25; esquiva perfeita +10; acerto de arma +2 (Espada), +5 se for arma pesada. Quanto rendem Facas, Círculo e Lâmina não está definido (11.3, F-009). Cheia → **Quebra** de 3 s (dano ×2, sem Postura Firme). Depois ela zera e "regenera 20/s por 5 s se não atingida" (sentido: 11.3, F-009). **Postura Firme:** −40% de dano fora da Quebra.
- **Fases** em 100% / 60% / 25%, com transição de 1,5 s invulnerável (o relógio para).
  - Fase 1: Vara Horizontal (branco, 180°, 0,7 s); Bater a Vara (branco, linha de 6 corpos, 0,6 s); Luz Cega (vermelho, cone de 60° × 6 corpos, 1,0 s; inverte a tela em negativo por 2 s e causa 8 de dano/s).
  - Fase 2: a arena escurece 40%. Lanterna Arremessada (vermelho, círculo de 2 corpos que queima por 6 s, 6/s); convoca 10 Ocos das Lanternas que iluminam 3 corpos ao redor.
  - Fase 3: Explosão de Luz (vermelho, anel que se expande de 1 a 6 corpos em 1 s, a cada 12 s); Agarrar (branco, 0,8 s, raio de 2 corpos; aparar dá Quebra imediata; ser pego custa 20% do HP e prende por 1 s).
- **Fúria:** depois de 5 min de luta, +5% de dano a cada 10 s. Duração alvo: 2 a 3 min. No MVP a Fúria é inalcançável (Q-05).
- Derrotado → Amanhecer. Jogador com HP 0 → Apagar. 23:00 com o chefe vivo → A Fome.

### 5.9 Armas, passivas, União, XP, level up e baús (B §3.8 e §3.9)

| Item | Alvo | Escala | Base nv. 1 | Cooldown | Níveis |
|---|---|---|---|---|---|
| Espada Longa do Juramento | direção do movimento; arco de 120° à frente, 1 golpe (doc 04 §1.1) | FOR C / DES C | 10 | 1,2 s | nv2 +20% dano; nv3 +1 golpe (volta); **nv4** +50% em Postura Quebrada; nv5 +20% área; nv6 +20% dano; **nv7** 3º golpe é estocada perfurante (conflito de contagem: 11.3, F-004); nv8 +1 golpe |
| Facas de Sal | mais próximo | DES B | 6 × 2 facas | 0,9 s | nv2 +1 faca; nv3 +20% dano; nv4 facas aplicam Sal; nv5 +1 faca; nv6 +20% velocidade de projétil; nv7 atravessa 1 inimigo; nv8 +1 faca |
| Círculo de Sal | aura de raio 2 corpos; dano e lentidão (doc 04 §5) | FÉ A | 4/s | contínuo | nv2 +15% raio; nv3 +20% dano; nv4 Sal mais forte (−60%); nv5 +15% raio; nv6 +20% dano; nv7 pulso de knockback a cada 5 s; nv8 +20% raio |
| **Lâmina do Juramento Eterno** (União) | direção do movimento | FOR B / DES C | Espada nv8 × 1,5 | 1,0 s | Cada golpe gera uma onda de brasa no chão (3 corpos, 8 de dano) |
| Elmo Sem Rosto (passiva) | — | — | +4 Armadura por nível | — | máx. nv5 |
| Luvas de Fole (passiva) | — | — | +8% Poder por nível | — | máx. nv5 |

- **Cinzas de XP:** azul 1, verde 5, vermelha 25; Ímã de 1,5 corpo. `XP(n) = 10 + 8·(n−1) + 0,6·(n−1)²` (leitura de n: Q-22; XP(10) ≈ 130, XP(20) ≈ 380).
- **Level up:** o jogo pausa; 3 cartas; 60% são melhorias de itens já possuídos; arma nova só com vaga livre; depois do minuto 12, a passiva que completa uma União pendente aparece com 35%. Reroll, Pular e Banir: 0 no MVP. Detalhes do sorteio e cartas esgotadas: Q-22.
- **Baús:** do Guardião e do Chefe Menor. Depois do minuto 10, o baú contém a União se a Espada estiver no nível 8 e o Elmo estiver presente; senão, 1 item (70%), 3 (25%) ou 5 (5%). B dá essa regra também ao baú dourado; o doc 02 §6.3 ("na falta, uma Brasa") perde. O que é "1 item" e se o baú das 10:00 conta como "depois do minuto 10": Q-23.
- **União:** substitui a Espada Longa na mesma vaga; o Elmo continua. Também pode ser forjada na Fogueira (§5.10).
- **Números de dano** na tela, desligáveis (B, F-004).

### 5.10 Fogueira, autosave e retomada (B §3.10; doc 02 §3.1; doc 07 §4; doc 12 §2.2)

- Surge a 3 corpos do jogador depois do marco; raio de 2 corpos. Dentro do raio, o relógio para e os inimigos restantes no mapa "param e viram cinza (ninguém ataca). Sair do raio retoma" (doc 07 §4). A Fogueira "dura até o jogador sair dela" (doc 02 §3.1). Sair do raio sem Partir, ou ignorar a Fogueira: Q-24.
- **Descansar:** HP 100%, Frascos cheios e `I` = 1,1 até a próxima Fogueira ("a noite fica 10% mais densa"). Quem não descansa mantém `I` = 1,0, mas segue sem Frascos novos.
- **Forjar União:** com a Espada no nv8 e o Elmo, forja a União sem esperar baú. Custo: 150 Almas na Fogueira da Hora I, 250 na da II, 400 na da III.
- **Partir:** autosave ("Vigília guardada") e volta ao mapa.
- **Autosave** também a cada 60 s de jogo (B), e "ao abrir cada Fogueira" (doc 12 §2.2).
- **Retomada:** ao reabrir depois de a aba morrer ou o app fechar, o jogo oferece "Continuar da Fogueira da Hora N", com build, nível, Almas, Frascos e `I` daquele momento (B §3.10 e F-008). Perde-se o progresso da Hora atual, não a Vigília (doc 02 §3.1). O que o save de 60 s guarda, a Hora I e a recusa: Q-03.

### 5.11 Apagar, Cinzas Perdidas, Amanhecer e A Fome

- **Apagar** (HP 0): "Você se apaga.", câmera lenta de 1 s e tela de Resultado (§5.13). As Almas da Vigília vão para o Santuário, menos **30%**, que ficam na **mancha de Cinzas Perdidas**, com a posição no mapa e a Hora (doc 02 §2: "Almas ×1,0, −30% deixado como Cinzas Perdidas"). Na próxima Vigília, a mancha "estará lá" (doc 02 §8); encostar nela devolve as Almas, uma vez. Apagar antes de recuperar perde a mancha antiga para sempre. Uma mancha não recuperada continua depois de um Amanhecer, porque só uma nova morte a apaga. Sem Eco e sem Reviver no MVP. Quando ela aparece no mapa e para onde vão as Almas recuperadas: Q-04.
- **A Fome** (23:00 com o Lanterneiro vivo): é um **Apagar** com tela própria ("A Fome desce."), porque o doc 02 §3 dá "Apagar" como fecho de A Fome e B não contradiz. Vale a mesma divisão das Almas e a mesma mancha.
- **Amanhecer** (Lanterneiro derrotado): o céu clareia por 10 s sem UI, os inimigos restantes viram cinza, aparece o texto "Amanhecer." e depois o Resultado. Almas ×1,5 e 1 Brasa, sempre: B dá "1 Brasa (só contabilizada)", contra os 35% do doc 02 §9 depois da primeira, e vale B. A Brasa só fica registrada no save; ainda não compra nada. O doc 06 §1 dá 200 Almas pelo Chefe da Região e B não contradiz (a ordem em relação ao ×1,5 é a Q-35).

### 5.12 HUD, pausa e onboarding (doc 11 §1, §3.6, §3.9, §4; detalhes dos sistemas do MVP, pela Q-00)

- **Zonas:** superior (0 a 25% da altura) para informação; centro (25 a 65%) para o jogo; inferior (65 a 100%) para os controles. O HUD respeita a safe-area e nunca fica sob a Dynamic Island.
- **HUD da Vigília:** pausa, relógio e Hora; barra de XP e nível; HP (barra e número); stamina; ícones das 5 vagas de arma, da vaga de Relíquia e das 6 de passiva (28 pt); Almas e Frascos. Durante o Lanterneiro, as barras de HP e de Postura do chefe abaixo do HUD. Seta na borda da tela para um telegrafo fora da vista e para a mancha ou a Fogueira. Cada elemento entra na feature do sistema que ele mostra.
- **Pausa (doc 11 §3.9):** build, estatísticas da Vigília (mortes causadas, dano recebido, aparos), opções rápidas (som, flashes, números de dano) e "Abandonar Vigília" com confirmação e aviso de Almas ×0,5 (doc 02 §3.2). Em qual feature entra: Q-25.
- **Onboarding (doc 11 §4):** prompt de mover aos 0:10; aos 1:00, câmera lenta leve de 0,5 s + prompt de esquiva; aos 3:00, prompt de aparo, que repete com janela +0,1 s depois de 2 falhas; aos 5:00, tour de 3 balões na primeira Fogueira (puláveis); no primeiro Apagar, um balão explica as Cinzas Perdidas e Iselda apresenta a árvore; depois da 1ª Vigília completa, convite "Adicionar à Tela de Início" (repete após 5 Vigílias se recusado). Se os prompts valem só na 1ª vez: Q-26.

### 5.13 Resultado, Santuário e árvore de Fundação (B §3.12; doc 08 §3 e §4.1; doc 11 §3.12 e §3.13)

- **Resultado:** tempo, nível, mortes causadas (palavra: Q-31), chefe mais longe, Almas com contagem animada e Brasas. Se houver mancha, um mapa pequeno com ela e o texto "N Almas ficaram na Hora X". Botões: Voltar ao Santuário e Repetir Vigília. Fora: "Dobrar Almas" (anúncio), replay e Feitos.
- **Santuário:** cena mínima com Iselda (abre a árvore) e o botão **Vigília** (Aldric, Charneca). Barra superior com Almas e Brasas.
- **Árvore de Fundação, 8 nós de estatística.** O toque mostra o tooltip: nome-frase, efeito numérico, custo, rank e uma linha de lore (doc 17 G2; placeholder). O segundo toque compra a Pesquisa. **Reembolsar** é grátis, pede confirmação e zera a árvore e o fator global dela. Disposição na tela (grade 5×5 com revelação ou lista simples): Q-17.
- **Custo de uma Pesquisa:** `300 × 1,12^(rank−1) × (1 + 0,015 × ranks_globais)` (arredondamento: Q-19).

| Nó (nome-frase, doc 08 §4.1) | Ranks | Efeito por rank | No MVP |
|---|---|---|---|
| *O peso do martelo do seu pai* | 5 | +4% Poder de armas pesadas | sem efeito: não há arma pesada (Q-17) |
| *Pele que esqueceu de sangrar* | 5 | +2 Armadura | sim |
| *Fôlego de forja* | 5 | +5% HP máximo | sim |
| *Pés plantados* | 3 | +10% Poise | depende da Q-16 |
| *Casco* | 3 | Invulnerabilidade pós-acerto +0,05 s | sim |
| *Bigorna no peito* | 3 | +3% redução de dano de contato | sim |
| *Ferro frio* | 3 | −5% custo de stamina da esquiva pesada | sem efeito: não há esquiva pesada (Q-17) |
| *Mãos de aprendiz* | 3 | Armas de Orun começam no nível 2 | sim; semântica por rank: Q-18 |

- **Primeira Pesquisa guiada:** o jogador volta do primeiro Apagar com 300 Almas garantidas, e Iselda apresenta a árvore (B §3.12; doc 11 §4; leitura: Q-20).

### 5.14 Economia do MVP (B §3.12; doc 08 §3)

| Resultado da Vigília | Almas alvo (coletadas ou levadas: Q-21) |
|---|---|
| Apagar na Hora II | ≈ 400 |
| Apagar na Hora IV | ≈ 1.100 |
| Amanhecer (com o ×1,5) | ≈ 1.600 |

Recursos do MVP: **Almas**, gastas em Pesquisas e no Forjar União da Fogueira, e **Brasas**, só contadas. Sem Memórias e sem Escória.

### 5.15 Apresentação provisória

- **Formas e tamanhos (B §2 e §3.2; doc 13 §1.2):** triângulo para o jogador (48 px); círculo para a massa (32 px); quadrado para os médios (48 px); retângulo grande para o chefe (128 a 192 px). Tiles de 16 px.
- **Paleta provisória:** fundo #1a1f2b e brasa #ffb347. Regras de leitura do doc 13 §1.3: o jogador é a coisa mais quente da tela; o telegrafo branco é branco puro; o telegrafo vermelho é #ff2a2a e nada mais usa esse vermelho. Cores extras: Q-27.
- **Áudio:** 3 sons placeholder (aparo, esquiva perfeita, Quebra de Postura); proposta de implementação na Q-33. Na Tela de Acender, o aviso "Se não ouvir nada, verifique a chave de silêncio" (doc 11 §3.1).
- **Textos:** todos placeholder, com ID definitivo em `pt-BR.json`.
- **Espaço:** resolução lógica de 390×844 pontos a 2× (nunca 3×); corpo = 32 px; mapa de 3×3 telas (≈ 1.170×2.532 px) com wrap contínuo; 4 a 8 obstáculos por tela, que os inimigos contornam (doc 07 §1); câmera centrada no jogador, mostrando ≈ 12×26 corpos.

## 6. Restrições técnicas e de plataforma (resumo; detalhes no ADR-0002)

**Stack (ADR-0001, decidido):** Phaser 4.2.1 + TypeScript 5.9 + Vite 8. As versões existem no npm (conferido em 2026-10-10; Node 22 no ambiente).

**Arquitetura obrigatória:**
- **Simulação pura em `src/logica/`, sem Phaser:**
  - passo fixo de 60 Hz (16,667 ms) com acumulador e teto de 5 passos por frame; o tempo excedente é descartado e conta em `passos_perdidos`;
  - render desacoplado via `requestAnimationFrame`, que no iPhone fica em 60 fps e cai a 30 em Low Power Mode (2 passos por frame);
  - RNG com seed por Vigília (`xorshift128+` ou equivalente), com um gerador para o diretor e outro para o level up; os demais fluxos (drops, baús, IA, spawn) ficam definidos no ADR-0002;
  - entidades em arrays tipados SoA, com pools pré-alocados;
  - grade espacial própria para as hordas.
- **Cenas finas em `src/cenas/`.**
- **Conteúdo só em `src/dados/*.json`**, com JSON Schema e teste de integridade referencial.
- **Nenhuma string visível no código:** tudo em `src/dados/textos/pt-BR.json`, verificado por lint.

**Orçamento (B §3.13):**

| Métrica | iPhone 11/12 | iPhone 14+ |
|---|---|---|
| Inimigos simultâneos (B §3.13; doc 12 §4: "na tela"; o que conta: Q-08) | 300 | 500 |
| Inimigos simulados, incluindo fora da tela (doc 12 §4; B não cita; Q-08) | 600 | 1.000 |
| Projéteis/efeitos | 200 | 400 |
| Partículas | 300 | 600 |
| Draw calls | ≤ 150 | ≤ 150 |
| CPU por frame (simulação + render) | < 10 ms | < 8 ms |
| Memória total | < 150 MB | < 200 MB |
| Atlases | ≤ 2048² @2×, ≤ 6 por mapa | idem |
| Download inicial | < 15 MB | — |
| Alocação por frame no caminho quente | zero | zero |

- No máximo 12 partículas por evento, fundidas num "impacto grande" (doc 12 §4.1). Vale para a onda da União, o Contra-ataque e o pulso do Círculo.
- **Degradação graciosa:** frame acima de 16 ms por 2 s → reduz partículas → reduz luz → converte a massa excedente em Ocos Grandes ("a Fome engrossa").
- `window.__GAME_DEBUG__` expõe fps, passo, entidades vivas por tipo, passos perdidos e memória estimada.

**iOS (B §3.14; doc 12 §2):**
- Tela "Toque para acender a Chama" desbloqueia o áudio no `touchend`. Chave física de silêncio: truque do `<audio>` em loop silencioso no primeiro gesto, verificado em aparelho real a cada versão do iOS (doc 12 §2.3), mais um ícone visível de áudio e o aviso na Tela de Acender (doc 12 §8; doc 11 §3.1).
- `viewport-fit=cover` e `env(safe-area-inset-*)`; `100dvh`, nunca `100vh`.
- Canvas de tamanho fixo depois do boot; resolução interna nunca acima de 2×.
- Bloqueio de pull-to-refresh e de zoom.
- Sem Fullscreen API, sem Vibration API, sem orientation lock (overlay em paisagem).
- Wake Lock não funciona em standalone: fallback com vídeo invisível em loop.
- Pausa automática em `visibilitychange` e em interrupção de áudio.
- Sem `SharedArrayBuffer`. Se a simulação for para um Worker, a comunicação é por `postMessage` de TypedArrays; a decisão sai no ADR-0002.
- Save em IndexedDB com snapshot em localStorage e versão de schema.
- Manifest + service worker; convite "Adicionar à Tela de Início" depois da primeira Vigília.

## 7. Glossário obrigatório e palavras proibidas

**Usar em código, dados e tela:** Vigília, Vigilante, Hora, Amanhecer, Apagar, Fogueira, Santuário, Oco, Guardião, Chefe Menor, Chefe da Região, Brasa, Alma, Cinzas (de XP e Cinzas Perdidas), Frasco, Postura, Postura Quebrada, Relíquia, Maldição, Memória, Eco, Ciclo, Pacto, União, Pesquisa, A Fome.

No MVP, "Maldição" só aparece no sentido de mecânica do Vigilante (Juramento Pesado). A Maldição dos Pactos fica fora. "Pesquisa" é o nó comprado na árvore (doc 01 §8).

**Nunca em código, dados ou tela:** run, checkpoint, zumbi, roguelike, game over, upgrade, gema, menu principal, fusão, mutator, NG+. As listas extras dos docs 01 e 17 estão na Q-31.

**IDs de texto (doc 17 §4; B §3.15):** formato `BLOCO.SUBBLOCO.NÚMERO` (ex.: `A2.TUTORIAL.01`), em `pt-BR.json` com os campos `{ id, texto, contexto, limite_palavras }`. A divergência com os exemplos de B e os textos sem bloco estão na Q-32. Convenção de nomes no código: Q-33.

## 8. Features F-001 a F-010 (B §4)

Uma feature por sessão. **Pronto** = `scripts/verify.sh --feature F-xxx` verde (build, Vitest, Playwright com `--taps-game` e `--seed`), evidência em `production/evidencias/F-xxx/`, crítico independente ≥ 7 e commit descritivo. Os critérios de aceite são os de B §4, **literais**, e vão assim para o `feature_list.json` na etapa 3. A tabela abaixo só dá o escopo e a evidência exigida.

| ID | Feature (B §4) | Evidência exigida (B §4, literal) |
|---|---|---|
| F-001 | **Esqueleto e loop:** Phaser em retrato, 390×844 @2×, canvas fixo, safe-area, simulação pura com passo fixo de 60 Hz, acumulador, RNG com seed, `__GAME_DEBUG__`, Tela de Acender, bloqueio de pull-to-refresh e zoom | Screenshot; log do teste de determinismo |
| F-002 | **Movimento e mapa:** joystick flutuante, 4,5 corpos/s, mapa 3×3 com wrap, 4 a 8 obstáculos por tela com colisão, câmera | Vídeo curto ou 3 screenshots sequenciais |
| F-003 | **Hordas:** diretor por timeline, pools SoA, grade espacial, Oco das Lanternas, contato com invulnerabilidade de 18 passos, escala por minuto, TETO e conversão de excedente | Captura do debug com 300 vivos; relatório de alocações (heap snapshot sem crescimento em 60 s) |
| F-004 | **Armas automáticas:** arquétipos de alvo, as 3 armas nos níveis 1 a 8, fórmula de dano com escala, Sal, números de dano desligáveis | Screenshots das três armas ativas; tabela de dano gerada pelo teste |
| F-005 | **XP, level up, passivas e União:** Cinzas com Ímã, curva de XP, modal de 3 cartas com segundo toque, regra dos 60%, Elmo e Luvas, baú 1/3/5, União em baú depois do minuto 10 | Screenshot do modal; screenshot da União |
| F-006 | **Stamina, esquiva e aparo:** swipe, i-frames, esquiva perfeita, aparo e aparo falho, Postura Quebrada em área, Contra-ataque, Oco Grande e Noviça com telegrafo, feedback, tutoriais dos minutos 1 e 3 | Vídeo de 10 s com esquiva perfeita e aparo; log dos testes de janela |
| F-007 | **HP, Frascos, armadura, Apagar e Cinzas Perdidas:** Brasa Firme, armadura, Frasco interrompível, Apagar com câmera lenta, Resultado, mancha entre Vigílias | Screenshot do resultado; screenshot da mancha na Vigília seguinte |
| F-008 | **Horas, marcos e Fogueira:** Coroado, marcos 5/10/15, Fogueira (Descansar, Forjar, Partir), autosave na Fogueira e a cada 60 s, retomada depois de fechar a aba | Vídeo da retomada; JSON do save |
| F-009 | **O Lanterneiro, Amanhecer e A Fome:** arena, Postura, 3 fases, 7 ataques, Fúria, Amanhecer, A Fome aos 23:00 | Vídeo de 30 s da luta; screenshot do Amanhecer; screenshot de A Fome |
| F-010 | **Santuário mínimo e PWA:** Santuário, árvore de Fundação, 300 Almas garantidas, save meta, todos os textos por ID (lint), manifest + service worker + convite, overlay de paisagem, pausa em `visibilitychange`, **teste em iPhone real** (11 ou 12, e 14+) | Vídeo em iPhone real; captura de memória do Safari Web Inspector (< 150 MB); relatório do lint |

Depois de F-010 (B §5): direção de arte e de áudio (style card e sound bible, com sua aprovação antes de qualquer asset) → F-011 Eco de Vigilante → F-012 Nhara e Ulvar → F-013 Abadia Ruída → F-014 árvores de Caçada, Memória e Votos → F-015 Pactos → F-016 desafio diário com seed → F-017 conta e save em nuvem.

## 9. Riscos do MVP

| Risco | Mitigação |
|---|---|
| Aparo e esquiva não "sentirem" bem no touch (é o critério de sucesso) | Janelas exatas de B, em passos; feedback de flash, congelamento e som; build de teste em iPhone real logo depois da F-006, sem esperar a F-010 (Q-29) |
| Phaser ter mais custo por objeto que um renderer puro (doc 12 §3) | Simulação fora do Phaser; render da horda em lote; medição desde a F-003 com CPU 4× mais lenta |
| Jetsam do Safari matar a aba | Orçamento de 150 MB, autosave na Fogueira e a cada 60 s, retomada |
| `navigator.deviceMemory` não existe no Safari | O TETO de 300/500 sai de um benchmark curto no boot, com 300 como fallback (ADR-0002) |
| Ponto flutuante divergir entre motores JS (Safari × Chrome) | O teste da F-001 roda num só motor. O ADR-0002 define como evitar divergência (ex.: trigonometria por tabela), pensando no desafio diário futuro |
| Low Power Mode trava o rAF em 30 fps e derruba o teste de ≥ 55 fps | O teste em iPhone real é feito com Low Power Mode desligado, registrado no vídeo (Q-29) |
| A F-010 depende de hardware (iPhone 11/12, iPhone 14+ e um Mac com Safari Web Inspector) e de uma URL HTTPS para o service worker | Eu preparo o build, a URL e o roteiro; a execução no aparelho é sua (Q-29) |

## 10. Fora do MVP (resumo)

- **Personagens e mundo:** os outros 11 Vigilantes e a tela de seleção; as outras 5 regiões, os modos de mapa e os segredos.
- **Inimigos e chefes:** os outros 29 inimigos e os eventos de enxame; os Guardiões e o Chefe Menor reais (Oco Coroado, Oco Coroado Maior, Noiva da Turfa, Guardião II real); A Fome como inimigo aparável.
- **Arsenal:** as outras 35 armas, 16 passivas e 33 Uniões; Sangramento, Queimadura, Medo e Marca; Relíquias.
- **Fogueira e morte:** Oferenda, Rook e Pacto Momentâneo; Eco e Reviver; Memória do chefe e Noite Infinita.
- **Santuário e meta:** os outros NPCs, Codex, Forja de Brann, Pactos e Ciclos.
- **Sistemas que B exclui de forma explícita:** corrida; Reroll, Pular e Banir.
- **Idioma e conta:** inglês; conta e save em nuvem.
- **Acabamento:** roteiro final; música e SFX finais; sprites.
- **Qualquer monetização.**

## 11. Questões abertas (preciso da sua decisão)

Cada questão traz minha recomendação e o ponto que ela bloqueia. Nada aqui foi implementado. **Se concordar com todas as recomendações, basta responder "aprovo as recomendações"**, ou citar só as que quer mudar.

### 11.0 Regra de leitura

| ID | Questão | Recomendação |
|---|---|---|
| Q-00 | **O recorte de B §2 é exaustivo?** B lista os sistemas do MVP. O GDD tem sistemas que B não cita (pickups como a Brasa Caída, raridade de cartas, acessibilidade, telemetria, Poise, névoa da Charneca) e detalhes de sistemas que B cita (HUD, conteúdo da pausa, onboarding, Resultado). | **Sistemas e conteúdo:** B §2 é exaustivo; o que não está lá fica fora. **Detalhes de um sistema que está no MVP:** vale B, e o GDD preenche onde B é omisso. É assim que este brief foi escrito: HUD, pausa, onboarding e Resultado entram pelo GDD; Brasa Caída, Vela, Ímã de Osso e acessibilidade (salvo os toggles da pausa) ficam fora. A raridade de cartas fica sem efeito, porque nenhum item do MVP é raro. Exceções nas Q-16, Q-28 e Q-30. |

### 11.1 Bloqueiam o ADR-0002 (etapa 2)

| ID | Questão | Onde está a lacuna | Recomendação |
|---|---|---|---|
| Q-01 | **Relógio nos marcos.** B §3.1 só para o relógio na Fogueira, no level up, na pausa e na transição de fase. O relógio corre durante o Guardião? Se o Guardião estiver vivo às 6:00, a linha do minuto 6 começa? No minuto de marco o intervalo é "—": o diretor repõe até o mínimo (40/60/80)? | B §3.1 e §3.7; doc 07 §3.2 | O relógio corre (leitura literal de B) e a timeline segue o relógio, mesmo com o Guardião vivo. No minuto de marco, o diretor mantém o mínimo com o último intervalo da Hora anterior. |
| Q-02 | **Arena nos marcos e regras de chefe no placeholder.** O doc 07 §3.2 marca "(arena)" nos minutos 5, 10 e 15, e o doc 02 §3 diz que o Chefe Menor tem "arena fechada"; B só escreve "arena" no 20:00. As regras universais de chefe (doc 06 §1: Postura, Postura Firme −40%, 2 fases, HP por nível do jogador, +60 Almas) valem para o Coroado das 10:00? | B §2 e §3.7 × doc 06 §1, doc 07 §3.2, doc 02 §3 | Arena nos 3 marcos: o GDD manda e B não contradiz. **Sem** Postura e sem fases no placeholder: B o define por completo ("HP ×10 e baú dourado") e só dá Postura ao Lanterneiro, que chega na F-009. Almas: as de B ("30 + baú"); as +60 do doc 06 §1 não se somam. HP: Q-12. |
| Q-03 | **Autosave de 60 s × retomada da Fogueira.** B manda retomar "da Fogueira da Hora N". Para que serve o save de 60 s? De onde se retoma se a aba morre na Hora I, antes de qualquer Fogueira? O doc 12 manda salvar "ao abrir cada Fogueira", e B salva ao Partir. Onde o jogador reaparece? E o que significa recusar a retomada? | B §3.10; doc 02 §3.1; doc 12 §2.2 | Salvar ao abrir a Fogueira, a cada ação feita nela (Descansar, Forjar) e ao Partir. O ponto de retomada é sempre a última Fogueira (ou o início da Vigília, na Hora I), com o jogador dentro do raio e as ações já usadas marcadas, para não descansar duas vezes. O save de 60 s guarda a Vigília em andamento (Almas da Hora, posição, Hora), para que nada se perca se a retomada for recusada. Recusar = "Abandonar Vigília" (doc 02 §3.2): Almas ×0,5, sem mancha. Se a retomada desfizer a recuperação de uma mancha (recuperada depois da última Fogueira), a mancha volta ao mapa com as mesmas Almas: pelas fontes, ela só se perde por morte (B §3.12; doc 03 §2.3). Por isso, a recuperação só vira definitiva no save meta junto com o save da Fogueira seguinte ou com o fim da Vigília. |
| Q-04 | **A mancha no mapa.** Ela aparece desde o início da próxima Vigília ("estará lá", doc 02 §8) ou só ao chegar à Hora registrada? As Almas recuperadas voltam para a Vigília (e podem ser perdidas de novo) ou vão direto ao Santuário? Se a disposição dos obstáculos mudar com a seed, a mancha pode cair dentro de um obstáculo. E se o Apagar acontecer entre 20:00 e 23:00 (Lanterneiro ou A Fome), trecho que o doc 02 §3 deixa sem Hora ("—")? | B §3.12; doc 02 §3 e §8; doc 11 §3.12 | Desde o início; a Hora serve para o texto do Resultado. As Almas recuperadas entram na Vigília (padrão Souls). A disposição dos obstáculos é fixa por mapa (dado em JSON, não sorteada pela seed), então a posição da mancha é sempre alcançável, inclusive se ela ficou onde depois se forma a arena: dá para pegá-la antes das 20:00. Entre 20:00 e 23:00, a mancha registra o nome que o doc 02 §3 dá ao trecho ("A Fome") no lugar da Hora, e o Resultado usa um texto placeholder próprio, com ID. |
| Q-05 | **Fúria inalcançável.** O Lanterneiro surge às 20:00 e A Fome encerra às 23:00, então a luta dura no máximo ≈ 3 min, e a Fúria (depois de 5 min) nunca dispara. | B §3.11 × §3.1 | Implementar a Fúria como especificada, com teste isolado (A Fome desligada no teste), porque ela vale para os chefes futuros. Registrar que no MVP ela é inalcançável. |
| Q-06 | **Unidade "tela" do anel de spawn (1,2 a 1,6 telas).** A largura (390), a altura (844) ou a meia-diagonal (≈ 465 px)? Com 1,6 × 844 px, o anel dá a volta no mapa (1.170 px de largura) e cai dentro da vista. | B §3.7; doc 07 §3.4 | Largura da tela: anel de 468 a 624 px. Ele fica sempre fora da vista (acima da meia-diagonal de 465 px) e o mais perto possível. Nos ângulos quase horizontais, a ponta externa passa da meia-largura do mapa (585 px) e o wrap a leva para o lado oposto; o ADR-0002 trata isso. |
| Q-07 | **Regra de reposição do diretor.** Quantos inimigos saem por reposição? Ele só spawna abaixo do mínimo? Qual é a geometria do viés "60% do lado oposto ao movimento", e o que vale com o jogador parado? | B §3.7; doc 07 §3.1 ("Se abaixo, spawna até preencher") | A cada `intervalo`, se os vivos estão abaixo do mínimo, spawna a diferença de uma vez (leitura literal do doc 07). Cada spawn cai com 60% de chance no semicírculo oposto à direção do movimento; com o jogador parado, distribuição uniforme. |
| Q-08 | **O que o TETO conta.** O doc 12 separa 300 inimigos na tela de 600 simulados; B diz só "simultâneos". Os convocados (10 a cada 10 s por Coroado; 10 do Lanterneiro), o chefe e os Ocos Grandes de excedente contam? Quanto XP e Almas dá o Oco Grande convertido? | B §3.7 e §3.13 × doc 12 §4 | (a) O TETO conta todos os inimigos vivos, na tela ou fora: convocados, convertidos e chefe. Pools com capacidade = TETO (300/500). (b) Outra leitura possível: o TETO limita só o mínimo "na tela", e até 600/1.000 são simulados (doc 12 §4), com pools de 600/1.000. **Recomendo (a)**: é o número que B e você usam para o orçamento ("60 fps com 300 inimigos") e o que a F-003 testa ("300 inimigos vivos"). Em qualquer leitura, os convocados respeitam o TETO (o que não cabe vira Oco Grande pela regra de excedente), e o convertido dá a soma de XP e Almas dos 10 que substitui e causa o dano normal de Oco Grande. |
| Q-09 | **Arena × diretor.** De 20:00 a 23:00 o diretor repõe até 300 Ocos a cada 0,3 s, mas a arena mata a massa que está dentro e não deixa ninguém novo entrar, e o anel de spawn fica fora dela. O mesmo vale para os marcos, se tiverem arena (Q-02). | B §3.7 × §3.11; doc 06 §1 | Enquanto uma arena está ativa, o diretor não spawna; só as convocações do chefe ou do Coroado entram. A linha 20–23 fica no JSON (serve aos modos futuros), mas é suspensa pela arena. |
| Q-10 | **"min" nas fórmulas de escala.** É o minuto inteiro (a linha da tabela) ou o tempo contínuo? O HP e o dano ficam fixos no spawn ou são recalculados? O "nível do jogador" do HP do Lanterneiro é o do momento em que ele surge? | B §3.6 e §3.11 | Minuto inteiro decorrido (o mesmo da linha da tabela). Valores fixados no spawn. Nível do jogador no momento em que o Lanterneiro surge. |
| Q-11 | **Janela sem spawn antes das 20:00.** B proíbe spawn "nos 30 s antes de um marco", e só chama de marcos os minutos 5, 10 e 15 (F-008). O doc 07 fala de "evento" nos 30 s antes de "um chefe". | B §3.7 × doc 07 §3.3 | 19:30 não entra (não é marco em B): a reposição segue até as 20:00. "Nenhum spawn" suspende inclusive a reposição até o mínimo. |

### 11.2 Regras de jogo (bloqueiam a feature indicada)

| ID | Questão | Onde está a lacuna | Recomendação | Bloqueia |
|---|---|---|---|---|
| Q-12 | **HP do Oco Grande Coroado.** B o define como "Oco Grande com HP ×6" (e ×10) e o põe na tabela de "minuto 0", logo acima da fórmula de escala; na timeline, escreve "Coroado 600 HP". 600/1.000 são finais ou base com escala por minuto (`× (1 + 0,12·min) × I`)? O Chefe Menor usa a fórmula de chefe (doc 06 §1: `× (1 + 0,04·nível)`)? | B §2, §3.6 e §3.7; doc 06 §1 | Base com escala por minuto e por `I`, como o Oco Grande de que ele deriva: 5:00 → 960; 10:00 → 2.200; 15:00 → 1.680 cada. A fórmula de chefe fica só para o Lanterneiro, porque B a define só para ele e o placeholder é um Oco Grande. Fica registrado que isso afasta o doc 06 §1 para o Chefe Menor placeholder. | F-008 |
| Q-13 | **Dano de contato "5/s" com invulnerabilidade de 18 passos.** (a) Cada acerto vale 5 × 0,3 = 1,5 e o contato contínuo rende exatamente 5/s, por mais Ocos que encostem. (b) Cada acerto vale 5, e a invulnerabilidade limita a 1 acerto a cada 0,3 s (≈ 16,7/s no minuto 0). | B §3.6 × §3.3; doc 02 §5.4 ("baixo e contínuo"); doc 10 §1.1 | (a): respeita a unidade "/s" de B e o doc 10 §1.1 ("mortes por acúmulo invisível de dano de contato são falha de design"). A pressão da horda vem do cerco físico e dos médios. A (b) torna o cerco letal. | F-003 |
| Q-14 | **O que a invulnerabilidade pós-contato bloqueia.** B e o doc 02 §5.6 a disparam só por "acerto de contato". Durante os 18 passos, ela protege também contra projéteis e ataques telegrafados? E contra dano contínuo de área (Luz Cega 8/s, Lanterna 6/s)? | B §3.3; doc 02 §5.6; nó *Casco* | Disparada só por contato (B). Bloqueia só dano de contato, para um encostão não "comprar" imunidade a um telegrafo, que continua precisando de esquiva ou aparo. Dano contínuo de área não é afetado. | F-003/F-006 |
| Q-15 | **Esquiva perfeita e contato.** Ao pé da letra, B ("um acerto teria ocorrido") inclui o contato dos Ocos das Lanternas, que B chama de "acerto de contato". Então rolar pela horda dá +15% Poder, e também +10 de Postura no Lanterneiro, se houver Ocos convocados perto. | B §3.4 e §3.11; doc 02 §5.3 | Seguir B ao pé da letra para o +15% Poder e para o +1 faca. O +10 de Postura só conta quando o golpe evitado é do próprio Lanterneiro, para não se encher a Postura rolando pelos convocados. | F-006/F-009 |
| Q-16 | **Poise.** O GDD define a regra (doc 02 §5.6), mas sem números: poise por FOR e por Armadura, knockback do Grito. Entra no MVP? | doc 02 §5.6; doc 08 §4.1 | Fora do MVP (exceção à Q-00, porque faltam todos os números): o Grito sempre empurra. *Pés plantados* fica sem efeito. | F-008/F-010 |
| Q-17 | **Árvore no MVP.** (1) *O peso do martelo do seu pai* e *Ferro frio* não têm efeito no MVP, e *Pés plantados* também não, se a Q-16 for "fora". Mostrar e vender? (2) O nó central *Primeira brasa* ("Aberto. +5 HP") entra? Ele já valeria na 1ª Vigília (HP 155 contra os 150 de B). (3) Grade 5×5 com revelação de vizinhos ou lista? O doc 08 não dá a posição dos nós da Fundação, e sem os nós u/m/K parte dos 8 ficaria inalcançável. | B §2 × doc 08 §2.1 e §4.1 | (1) Os 8 aparecem; os sem efeito ficam visíveis mas bloqueados ("ainda esquecida"), para não vender nada vazio. (2) Fora: B fixa o HP inicial em 150. (3) Os 8 visíveis, numa grade simples, sem regra de revelação. | F-010 |
| Q-18 | ***Mãos de aprendiz* ×3:** o que muda por rank? | doc 08 §4.1 | Rank r: a Espada Longa (única arma de Orun no MVP) começa no nível 1 + r (máx. 4). A União não é afetada. | F-010 |
| Q-19 | **Arredondamento do custo.** A fórmula dá frações, e os exemplos do doc 08 arredondam de dois jeitos (602,1 → 602; 2.408,4 → 2.410). | doc 08 §3 | Inteiro mais próximo. | F-010 |
| Q-20 | **"300 Almas garantidas".** Completar o saldo até 300, ou +300 de bônus? Qual nó é o da Pesquisa guiada? E se a 1ª Vigília terminar em Amanhecer? | B §3.12; doc 11 §4 | Completar até 300 (só se o saldo estiver abaixo). Iselda destaca *Fôlego de forja*, mas qualquer nó pode ser comprado. Se a 1ª Vigília for um Amanhecer, a apresentação de Iselda acontece igual, sem a garantia (≈ 1.600 Almas já bastam). | F-010 |
| Q-21 | **Alvos de Almas** (≈ 400 / 1.100 / 1.600): coletadas na Vigília ou levadas ao Santuário, depois dos 30% da mancha? Se forem coletadas, um Apagar na Hora II leva 280, menos que a 1ª Pesquisa (300). | B §3.12; doc 10 §2.3 | Coletadas (é a fórmula `Almas_Vigília` do doc 10 §2.3). As 300 garantidas cobrem o 1º caso. | F-007/F-010 |
| Q-22 | **Sorteio do level up.** (1) Os 60% são uma chance por carta ou uma cota sobre as 3? (2) No início, só com a Espada, não há 60% de melhorias distintas para oferecer. (3) Com 3 armas e 2 passivas há no máximo 33 níveis de item, e o alvo é o nível 29 mais os baús: o que aparece quando não sobra carta? (4) `XP(n)` é o custo para ir do nível n ao n+1? | B §3.9; doc 02 §6 e §7 | (1) Chance por carta, sem repetir item na mesma oferta. (2) Quando não há melhoria possível, a carta vira item novo, e vice-versa. (3) Carta "Bolsa de Almas" (+50 Almas): reaproveita como carta o valor do pickup do doc 02 §7, que continua fora como pickup. (4) Sim; os alvos de nível 9/16/23/29 (doc 10 §3.1) serão conferidos por simulação. | F-005 |
| Q-23 | **Baús.** O que é "1 item"? O baú das 10:00 conta como "depois do minuto 10"? | B §3.9; doc 02 §6.3 | +1 nível numa arma ou passiva possuída, ao acaso e sem escolha (padrão Vampire Survivors). "Depois do minuto 10" = relógio ≥ 10:00, então o baú dourado das 10:00 conta. O "dourado" é só visual no MVP. | F-005/F-008 |
| Q-24 | **Sair da Fogueira.** Sair do raio sem tocar em Partir equivale a Partir (com autosave)? Dá para ignorar a Fogueira, sem nunca entrar? | doc 02 §3.1; doc 07 §4 | Sair do raio = Partir (autosave), e a Fogueira se apaga. Ignorar é permitido: ela fica acesa no mapa até o próximo marco. | F-008 |
| Q-25 | **Pausa: gesto e feature.** Com o polegar parado no joystick e outro dedo segurando o Frasco ou o Aparo, a regra "dois dedos parados 0,5 s" pausaria sozinha. Nenhuma feature de B cobre a tela de pausa, mas o toggle de números de dano (F-004) precisa de um lugar. | B §3.5 e §4; doc 11 §3.9 | O gesto só conta toques que não começaram no joystick nem num botão. Botão e tela de pausa na F-004; "Abandonar Vigília" na F-007, junto do Resultado. | F-004/F-007 |
| Q-26 | **Tutoriais.** Os prompts são "1 vez" (doc 11 §4), mas o Oco Grande e a Noviça garantidos estão na timeline de toda Vigília. A janela de aparo +0,1 s depois de 2 falhas também conflita com o teste "passo 12 não" da F-006. | doc 11 §4 × B §3.7 e F-006 | Os prompts aparecem até o jogador fazer a ação uma vez (marcado no save meta). Os inimigos garantidos ficam em toda Vigília. A janela +0,1 s vale só durante o prompt de aparo; o teste da F-006 roda sem prompt. | F-006 |
| Q-27 | **Cores além das duas provisórias.** A base do doc 13 §1.3 já dá UI osso (#e8dcc4), sal (#dfe8ea), #0b0e14, #2b3340, #e2652b, #7a1f1f e #ff2a2a. Faltam as Cinzas azul, verde e vermelha (a vermelha não pode ser #ff2a2a) e o amarelo dos críticos. Há também um conflito: o doc 11 §1 diz "branco só para aparo", mas o §3.6 pede números de dano brancos. | doc 13 §1.3; doc 11 §1 e §3.6 | Usar a base do doc 13. Cinzas: azul #5aa9e6, verde #6cc57c, vermelha #c8324b. Crítico: #ffd166. Números de dano em osso #e8dcc4 (não branco), para o branco ficar só com aparo e telegrafo. | F-002/F-004 |
| Q-28 | **Bônus e névoa da Charneca.** O doc 07 §2 dá à Charneca +10% de velocidade e névoa com visão de 85%. B fixa 4,5 corpos/s (teste da F-002) e não cita a névoa. | doc 07 §2 × B §3.3 e F-002 | Bônus fora (diverge de B). Névoa fora no MVP (é mecânica regional, exceção à Q-00): entra junto da luz, depois de F-010. | F-002 |
| Q-29 | **Teste em aparelho.** Onde hospedar o build HTTPS para os iPhones (o service worker exige HTTPS)? Teste antecipado depois da F-006? Low Power Mode? | B §1 e §4 (F-010) | GitHub Pages via Actions, a partir deste repositório. Builds de teste depois da F-006 e da F-010. Testes com Low Power Mode desligado. | F-006/F-010 |
| Q-30 | **Telemetria.** O doc 10 §6 pede eventos "desde o protótipo"; B não cita. | doc 10 §6 × B §2 | Sem envio no MVP. Só um registro local dos eventos do doc 10 §6, exposto em `__GAME_DEBUG__` para os testes. | F-001 |
| Q-31 | **Listas de palavras proibidas divergem.** B e você listam 11 palavras. O doc 17 §5 acrescenta "vitória, morte, menu", e o doc 01 §8, outras ("partida", "save", "ouro", "moeda"...). Mas a tela de Resultado do GDD mostra "mortes causadas" (doc 11 §3.12). | B §3.15 × doc 17 §5 × doc 01 §8 | O lint bloqueia as 11 de B em código, dados e textos (palavra inteira, ignorando `node_modules`, APIs de terceiros e `design/`). As extras viram aviso, só em `pt-BR.json`. O rótulo "mortes causadas" fica até o roteiro final propor outro. | etapa 3 |
| Q-32 | **Formato do ID de texto.** B e o doc 17 dizem `BLOCO.SUBBLOCO.NÚMERO`, mas os exemplos de B terminam em palavras (`I1.FOGUEIRA.DESCANSAR`, `E1.LANTERNEIRO.TITULO`). HUD, pausa, Resultado, overlay e convite PWA não têm bloco no doc 17, nem os nomes e linhas funcionais de armas e nós. | B §3.15 × doc 17 §3 e §4 | Aceitar número ou palavra em maiúsculas no 3º segmento: `^[A-K][0-9]+\.[A-Z0-9_]+\.[A-Z0-9_]+$`. Textos de sistema sem bloco vão para o Bloco A a partir de `A5` (ex.: `A5.HUD.01`, `A6.PAUSA.01`). Nomes e linhas funcionais ficam nos blocos do item (ex.: `F1.ESPADA_LONGA.NOME`, `G1.FOLEGO_DE_FORJA.EFEITO`). | etapa 3 |
| Q-33 | **Propostas de processo e de convenção** (não estão em B nem no GDD). (1) Código com identificadores em português, sem acento, em camelCase (`cinzasPerdidas`); chaves de JSON em snake_case, como B (`limite_palavras`); nomes que B fixa ficam como estão (`__GAME_DEBUG__`, `passos_perdidos`). (2) Sons placeholder sintetizados em Web Audio, sem arquivo de asset. (3) Como `/critico-independente` não existe, o crítico é um subagente revisor separado que dá nota de 0 a 10 contra os critérios de B (Pronto = nota ≥ 7, como B pede). | B §4; doc 19 | Aprovar as três. | todas |
| Q-34 | **"Acender" na cena do Santuário.** B lista "Acender, Iselda, botão Vigília". No GDD, "Acender" é a tela de entrada (doc 11 §3.1) e também o passo que inicia a Vigília (doc 02 §2). | B §2 e F-010; doc 11 §2 e §3.1 | "Acender" = a Tela de Acender, que leva ao Santuário. O botão Vigília inicia direto (não há seleção no MVP). | F-010 |
| Q-35 | **Ordem das Almas no Amanhecer.** As 200 Almas do Lanterneiro (doc 06 §1) entram antes do ×1,5? | doc 06 §1; doc 10 §2.3 | Sim: entram como Almas de inimigo, e o ×1,5 vale sobre o total. | F-009 |

### 11.3 Números ausentes (fecho com você antes de cada feature)

B e o GDD não dão estes números ou regras. Antes de começar cada feature, trago a lista com propostas para aprovar.

- **F-002:** tamanho e forma dos obstáculos (a disposição é fixa por mapa: Q-04); hitboxes do jogador e dos inimigos; algoritmo de contorno de obstáculos (o GDD só diz que eles contornam); se os obstáculos bloqueiam as Facas e o projétil da Noviça (o doc 07 §1 diz que depende da arma, sem dizer quais).
- **F-003:** força de separação entre Ocos.
- **F-004:**
  - Espada: alcance do arco; o que o "+20% área" do nv5 aumenta (alcance ou ângulo); intervalo entre golpes. O nv7 transforma "o 3º golpe", que só existe no nv8: o nv7 acrescenta a estocada como 3º golpe? E quantos golpes a União herda?
  - Facas: velocidade, alcance e escolha de alvo quando são várias.
  - Círculo: frequência do tick; força e distância do pulso de knockback do nv7; como a aura participa do Contra-ataque.
  - Lâmina: largura, velocidade e escala do dano da onda.
  - Direção das armas "de movimento" com o jogador parado.
  - Ordem de empilhamento dos multiplicadores (Contra-ataque ×2, Postura Quebrada ×2, nv4 +50%, Quebra ×2, Postura Firme −40%).
- **F-005:** teto de FOR (sem teto, FOR chega a 34 no nível 29); quanto HP Aldric ganha por nível (o doc 03 dá a regra, via Caël, mas não o número) e se FOR dá "+HP máximo leve" (doc 03 §2.1).
- **F-006:**
  - Oco Grande: alcance do arco.
  - Noviça: tamanho e duração do projétil.
  - Esquiva: se a recuperação está dentro dos 21 passos (passos 19 a 21) ou depois; intervalo, distância e direção do toque duplo; janela de medida da velocidade do swipe.
  - Feedback: o congelamento de 80 ms dá 4,8 passos (arredondar para 5?); fator da "câmera lenta leve" do tutorial.
  - Aparo: centro do raio de 2 corpos da Postura Quebrada (jogador ou atacante: muda o resultado contra o projétil da Noviça); o que define um aparo falho, em relação a "aparar sem ataque chegando"; o que "vulnerável" bloqueia; o que acontece ao aparar um ataque vermelho.
  - Ação com stamina abaixo do custo.
- **F-007:** fator da câmera lenta do Apagar; se o Frasco interrompido consome a carga; quanto tempo "segurar" leva para cancelar o Frasco; se dá para mover, esquivar ou aparar durante a cura; ordem entre a armadura e a Brasa Firme; se os 15% que interrompem o Frasco são medidos antes ou depois da redução.
- **F-008:**
  - Coroado: alcance da Patada; dano e distância do empurrão do Grito; cadência de ataque.
  - Tamanho do Coroado: B o chama de "Oco Grande" (48 px), o doc 13 §1.2 dá 64×64 para elite e 96 a 128 px para Chefe Menor, e o doc 12 §7 dá 48×48 para elite. Qual vale?
  - Escurecimento: os 10%/min da Hora IV somam com os 40% da fase 2? Atingem telegrafos e HUD?
- **F-009:**
  - Dano: Vara Horizontal, Bater a Vara e Explosão de Luz; se o dano do chefe escala por minuto.
  - Golpes: alcances e larguras.
  - IA: velocidade e escolha de ataque; frequência da convocação da fase 2.
  - Postura: quanto rendem Facas, Círculo, Lâmina e onda; o sentido de "zera e regenera 20/s por 5 s"; se o aparo comum aplica no chefe o atordoamento de Postura Quebrada ou só +25.
  - Luz: luz do jogador (doc 13 §1.4: raio de 5 corpos) e dos Ocos convocados (3 corpos) no MVP.
  - Tamanho: o doc 06 §2.2 dá 4 corpos (128 px) de altura e o doc 13 §1.2 dá 128 a 192 px; largura do retângulo.
- **F-010:** como *Bigorna no peito* (+3%) se combina com a armadura (multiplicativa?).

## 12. Notas de processo

- `CLAUDE.md`, `playbook/00-leia-primeiro.md` e `playbook/08-praticas-de-producao-web-phaser.md` **não existem** neste repositório; segui sem eles.
- Os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature` e `/critico-independente` não existem nesta sessão. O brief foi escrito à mão, e o substituto do crítico está na Q-33. O fechamento de cada sessão será um resumo em `progress.md`.
- **Stop hook:** o ambiente tem um Stop hook que exige commit e push antes de encerrar. **Não** existe o hook do doc 19, que impede encerrar sem verify, evidência e crítico; esse controle será manual.
- **ADR-0001 não existe** no repositório. Na etapa 2 eu o crio, registrando a decisão já tomada (Phaser 4.2.1 + TS 5.9 + Vite 8), junto com o ADR-0002.
- **`scripts/` não existe.** `scripts/verify.sh` e `scripts/novo-modulo.sh` serão criados na F-001.
- O objeto de debug se chama `window.__GAME_DEBUG__` (B §4). Na sua mensagem ele apareceu como `GAME_DEBUG` porque o Markdown come os sublinhados.
- O GDD foi copiado sem alterações de `docs/` do branch `claude/ecstatic-sagan-g9k3x6` (commit `62872cc`) para `design/gdd/`.
