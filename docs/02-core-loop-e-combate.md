# 02 · Core Loop e Combate

> O coração do jogo. Define a estrutura de uma Vigília (partida), os controles de toque, o sistema de stamina/esquiva/aparo, o level up, a morte e o que o jogador leva de volta ao Santuário. Tudo aqui foi pensado para **uma mão, tela de iPhone em retrato, sessões de 20 minutos ou menos**.

---

## 1. O que o jogo é, em uma frase

**Vampire Survivors com a alma de Dark Souls:** você anda, as armas atacam sozinhas, as hordas crescem a cada minuto, mas a sua sobrevivência depende de **ler ataques telegrafados, gastar stamina em esquivas com janela de invulnerabilidade, aparar no momento certo** e enfrentar chefes que não morrem só de encostar.

## 2. Loop macro (entre Vigílias)

```
SANTUÁRIO
  ├─ escolher Vigilante (personagem)
  ├─ equipar Relíquia(s)
  ├─ escolher Região (mapa) e Ciclo
  ├─ ativar Pactos (modificadores de dificuldade opcionais)
  └─ "Acender a Chama" → VIGÍLIA (≈20 min)
        ├─ Amanhecer (vitória)  → Almas ×1,5 + Brasa de chefe + Memórias
        └─ Apagar (derrota)     → Almas ×1,0 (−30% deixado como Cinzas Perdidas)
SANTUÁRIO
  ├─ gastar Almas na Árvore de Pesquisa (Iselda)
  ├─ gastar Brasas em nós-chave, personagens, Ciclos (Rook / Criança)
  ├─ ler Memórias no Codex (Oto), forjar (Brann), skins (Nhemi)
  └─ desafio diário (Corvo de Ferro)
```

Meta de cadência (ver documento 08): **1 pesquisa pequena por Vigília** e **1 pesquisa grande (desbloqueio) a cada 4 a 6 Vigílias**. Padrão validado por Vampire Survivors e Hades.

## 3. Estrutura da Vigília (20 minutos, 4 Horas da Noite)

Pesquisa de mercado: Vampire Survivors mobile mantém 30 minutos e é criticado por sessões longas; Brotato fragmenta em 20 waves de 20 a 90 segundos com loja entre elas, o que cria pontos de saída naturais. *Vigília das Cinzas* usa um meio-termo: **20 minutos divididos em 4 Horas de 5 minutos, cada uma encerrada por um Guardião e uma Fogueira.** A Fogueira é o ponto de saída e o autosave.

| Hora | Minutos | Nome | O que acontece | Fecho |
|---|---|---|---|---|
| I | 0:00–5:00 | **Crepúsculo** | Ocos lentos, aprendizado, primeiros 8 a 10 níveis. Tutorial de esquiva no min 1 (um Oco Grande com ataque telegrafado) e de aparo no min 3. | **Guardião I** (elite com baú) → Fogueira |
| II | 5:00–10:00 | **Meia-Noite** | Facção regional entra; primeiro enxame scriptado (min 7); elites aleatórios. | **Chefe Menor** (chefe regional com 2 fases, arena fechada) → Fogueira + baú dourado (União garantida se houver requisito) |
| III | 10:00–15:00 | **Hora Morta** | Densidade máxima; "cercos" (anéis de inimigos); evento regional (lanternas, capítulos etc.). | **Guardião II** (elite duplo) → Fogueira |
| IV | 15:00–20:00 | **Alvorada Negra** | Crias da Fome aparecem misturadas; o mapa escurece gradualmente; música sobe. | **Chefe da Região** no 20:00 (3 fases). Matá-lo = **Amanhecer**. |
| — | 20:00–23:00 | **A Fome** | Se o chefe não morrer até 23:00, A Fome (equivalente da Morte em VS) desce: HP absurdo, velocidade crescente, só pode ser aparada, nunca morta (exceto União secreta). | Apagar |

### 3.1 A Fogueira (checkpoint dentro da Vigília)
Aparece após o Guardião/Chefe de cada Hora e dura **até o jogador sair dela** (o relógio para). Menu de uma tela:

| Ação | Custo | Nota |
|---|---|---|
| **Descansar** | grátis | Recarrega Frascos; HP até 100%. Efeito colateral soulslike: a próxima Hora começa com intensidade +1 (10% a mais de inimigos). Não descansar mantém a intensidade normal, mas sem Frascos. É uma decisão real. |
| **Forjar União** | 150 a 400 Almas (cresce por Hora) | Se arma nv. 8 + passiva correspondente, forja a União sem esperar baú. |
| **Oferenda** | 100 Almas | Reroll de uma arma/passiva por outra do mesmo deus (troca de build no meio da Vigília). |
| **Rook** (se Relíquia ou pesquisa ativa) | Almas | Loja de 3 itens: Frasco extra, passiva aleatória, Vela (limpa tela). |
| **Pacto Momentâneo** | grátis | Ativar +1 Maldição (+10% HP/+8% dano inimigo, +12% Almas) só até a próxima Fogueira. |
| **Partir** | — | Volta ao mapa. Autosave neste momento. |

**Sessão interrompida:** se a aba morrer, a bateria acabar ou o jogador fechar o app, a Vigília retoma da última Fogueira com a build e os níveis daquele momento. Perde-se o progresso da Hora atual, não a Vigília inteira. Isso é obrigatório para iOS web (ver documento 12, risco de jetsam).

### 3.2 Pausa
Toque no ícone de pausa ou **dois dedos na tela** pausam. Menu de pausa mostra build atual (6 armas, 6 passivas), stats e opção "Abandonar Vigília" (mantém Almas coletadas ×0,5).

## 4. Controles (retrato, uma mão)

Pesquisa: Dead Cells mobile usa stick flutuante + swipe para esquiva + Auto-Hit opcional; Hades no iOS sofre com botões próximos demais; Pascal's Wager foi criticado por esquiva sem invulnerabilidade previsível. Conclusão: **auto-ataque libera o polegar para só duas decisões: esquivar e aparar.**

```
┌───────────────────────────────┐
│ ⏸  ❚❚❚❚❚❚ XP         12:34  │  ← HUD superior (fora da zona de polegar)
│ ♥♥♥♥♥  ▰▰▰▰▱ stamina         │
│ [armas 6] [passivas 6] ⚗3    │
│                               │
│                               │
│           JOGO                │
│                               │
│                               │
│                               │
│   ◎ joystick flutuante        │  ← aparece onde o polegar encosta
│   (metade inferior, 60% larg.)│
│                     ⚗ Frasco  │  ← botão único à direita, 72 pt
│                 ⟲ Aparo       │  ← botão único, 80 pt, acima do Frasco
└───────────────────────────────┘
```

| Ação | Gesto padrão | Alternativa (configurável) |
|---|---|---|
| Mover | Joystick flutuante (aparece onde tocar na metade inferior; zona morta 0,15; raio 60 pt) | Joystick fixo |
| **Esquivar (rolamento)** | **Swipe rápido** (>400 pt/s) em qualquer direção com o polegar do joystick, ou toque duplo no joystick | Botão dedicado |
| **Aparar** | Toque no botão **Aparo** (canto inferior direito, 80 pt) | Toque com segundo dedo em qualquer ponto da tela (modo "duas mãos") |
| Frasco | Toque no botão Frasco (acima do Aparo, 72 pt). Segurar = cancela. | — |
| Pausar | Botão superior ou dois dedos parados 0,5 s | — |
| Level up | Modal com 3 cartas; toque na carta e **confirme** (dois toques, evita erro) | Toque simples (opção) |

Regras de UX obrigatórias:
- Toda ação crítica tem **hitbox de no mínimo 72 pt**.
- O joystick nunca reaparece no mesmo lugar: zera a cada toque (evita "aprender" posição errada).
- Os botões respeitam `safe-area-inset-bottom` (barra do iPhone).
- Feedback de esquiva perfeita e aparo: **flash branco de 2 frames + som agudo + congelamento de 80 ms**. Sem depender de vibração (não existe no iOS web).
- Suporte a controle físico (Backbone) é bônus, não requisito.

## 5. Sistema de combate

### 5.1 Auto-ataque
Todas as armas disparam sozinhas em cooldown, cada uma com seu alvo (documento 04). O jogador não aperta nada para atacar. Dano = Base da arma × (1 + Poder) × escala de atributo × multiplicadores de status.

### 5.2 Stamina (a camada soulslike)
Pesquisa: em Souls, toda ação deliberada consome stamina, e o auto-ataque aqui é livre. Então **stamina só paga ações deliberadas**:

| Ação | Custo | Notas |
|---|---|---|
| Esquiva | 25 | 100 de stamina = 4 esquivas seguidas |
| Aparo | 15 | Aparo bem-sucedido **devolve** 30 |
| Aparo falho | 15 + 0,4 s de recuperação sem regen | Punição do erro |
| Frasco | 0, mas 2 s sem regen | — |
| Corrida (segurar o joystick na borda por 1 s) | 10/s | Opcional, para escapar de cercos |

Regeneração: 30/s após 0,5 s sem gastar. Armas "pesadas" (Martelo, Bigorna, Mão do Sepultador) causam +25% de dano com stamina cheia e −25% abaixo de 25%.

### 5.3 Esquiva (rolamento)
Pesquisa: em Dark Souls, todos os rolamentos têm a mesma janela de invulnerabilidade (11 frames); o que muda com o peso é a recuperação. Reproduzimos isso.

| Categoria de peso | Quando | Duração | i-frames | Recuperação | Distância |
|---|---|---|---|---|---|
| **Leve** | 0 a 1 arma pesada equipada | 0,35 s | 0,20 s (12 frames) | 0,05 s | 2,5 corpos |
| **Médio** | 2 armas pesadas | 0,40 s | 0,20 s | 0,12 s | 2,0 corpos |
| **Pesado** | 3+ armas pesadas | 0,50 s | 0,17 s | 0,25 s (recebe 1,3× dano nesse tempo) | 1,5 corpos |

- **Esquiva perfeita** = um ataque tocaria o jogador durante a janela de i-frames. Dispara efeitos "ao usar i-frame" (Nhara, Facas de Sal, Dança da Caçadora) e dá **+15% Poder por 2 s**.
- Rolar através da horda é permitido (i-frames valem contra corpos e projéteis). Rolar à toa custa stamina e recuperação.
- Grôm não rola: bloqueia (ver documento 03).

### 5.4 Ataques telegrafados e aparo
- Inimigos "massa" (Ocos) não telegrafam: só encostam. Dano de contato é baixo e contínuo (como VS).
- Inimigos médios, elites e chefes têm **ataques telegrafados**: 0,5 s de brilho branco crescente + som de "inspirar" + silhueta de alcance no chão. Isso é o momento de ler.
- **Aparo:** janela de 0,18 s (11 frames) após o toque. Aparar um ataque telegrafado:
  1. anula o dano,
  2. aplica **Postura Quebrada** no atacante e em todos num raio de 2 corpos (2 s atordoados, recebem ×2),
  3. dispara **Contra-ataque**: todas as armas equipadas disparam uma salva extra com dano ×2 em 1,5 s,
  4. devolve 30 de stamina.
- Aparo falho: 0,4 s vulnerável. Aparar sem nenhum ataque chegando não tem efeito além do custo.
- **Ataques vermelhos** (chefes, a partir da Hora III): não podem ser aparados, só esquivados. Brilho vermelho em vez de branco. Padrão de Lies of P invertido: ensina a diferença entre os dois gestos.
- Chefes têm barra de **Postura** própria (ver documento 06). Aparos enchem 25 cada; cheia = 3 s de janela crítica.

### 5.5 Frascos de Brasa (estus)
3 cargas base. Cura 40% em 2 s; dano acima de 15% do HP máximo interrompe. Recarregam em Fogueiras (se descansar). Pesquisas da árvore de Ama-Nhu aumentam cargas (até 6) e potência. Cura passiva por inimigos mortos existe só via armas específicas (Chicote evoluído, Caël). Não existem "corações no chão" aleatórios como em VS; a única cura de drop é a rara **Brasa Caída** (5%, dropada por elites).

### 5.6 Dano recebido e armadura
- Dano recebido = Dano do inimigo × (1 − Redução), Redução = Armadura / (Armadura + 20) (curva de Brotato, cap 75%).
- **Poise:** Força e Armadura somam poise; inimigos só empurram o jogador se o knockback deles exceder o poise. Grôm é imune.
- Invulnerabilidade de 0,3 s após qualquer acerto de contato (evita morrer em um frame dentro de uma horda).

## 6. Experiência, level up e escolhas

### 6.1 Cinzas de XP
Inimigos dropam **Cinzas** (gemas) que precisam ser coletadas (raio de Ímã). XP necessário por nível: `XP(n) = 10 + 8·(n−1) + 0,6·(n−1)²`. Nível 10 ≈ 130, nível 20 ≈ 380, nível 30 ≈ 750. Meta: nível 28 a 34 ao fim de uma Vigília padrão.

### 6.2 Modal de level up
3 cartas (4 com Ulvar ou Sorte ≥ 30%). Cada carta: ícone grande, nome, uma linha funcional, uma linha de lore em itálico. Ferramentas por Vigília (padrão VS, compradas na árvore):

| Ferramenta | Base | Máximo via pesquisa |
|---|---|---|
| Reroll | 0 | 3 |
| Pular (ganha 20 Almas) | 0 | 2 |
| Banir (remove da Vigília) | 0 | 2 |

Regras do sorteio: 60% das cartas são upgrades de itens já possuídos (evita diluição); armas novas só aparecem se houver vaga; a partir do minuto 12, a chance de aparecer a **passiva que completa uma União** pendente sobe para 35% ("o jogo ajuda a fechar a build", regra de bondade).

### 6.3 Baús
Caem de Guardiões, elites e chefes. 1 item (70%), 3 itens (25%), 5 itens (5%, Sorte aumenta). Depois do minuto 10, **um baú contém uma União se houver requisito cumprido**, uma por baú (regra de VS). Baú dourado (chefe) sempre contém União ou, na falta, uma Brasa.

## 7. Pickups

| Pickup | Efeito | Lore |
|---|---|---|
| Cinza de XP (azul, verde, vermelho) | 1 / 5 / 25 XP | "o que sobra de um Oco" |
| Alma (moeda) | 1 a 10 Almas | — |
| Bolsa de Almas | 50 Almas | — |
| Brasa Caída | cura 30% | rara (5% em elites) |
| Vela Apagada | mata todos os inimigos "massa" na tela (não elites) | "um sopro de Ama-Nhu" |
| Ímã de Osso | atrai todas as Cinzas do mapa | — |
| Página Esquecida | Memória (codex) | eventos de mapa |
| Lanterna / objeto regional | ativa evento do mapa (documento 07) | — |

## 8. Apagar (morte) e Reviver

1. HP chega a 0 → **"Você se apaga."** Câmera lenta 1 s. Se houver Reviver (pesquisa ou Relíquia), volta com 50% HP e 3 s de invulnerabilidade; máximo 1 por Vigília (2 com Pacto específico).
2. Sem Reviver, oferta de **Reviver assistindo um anúncio** (1× por Vigília, só na versão gratuita; documento 09). Sem anúncios dentro da Vigília além disso.
3. Tela de Apagar: resumo (tempo, nível, mortes causadas, dano recebido, chefe mais longe), Almas ganhas. **30% das Almas ficam no mapa como Cinzas Perdidas**; a tela mostra onde ("Hora III, perto da capela"). Na próxima Vigília naquele mapa, a mancha estará lá, com um **Eco** do seu personagem anterior (inimigo espelho com a build daquela Vigília) guardando-a. Derrotar o Eco devolve as Almas. Morrer antes perde para sempre.
4. Opção de **dobrar as Almas assistindo um anúncio** (versão gratuita) ou simplesmente voltar ao Santuário.

Nenhuma morte é "nada": o jogador sempre volta com Almas, progresso de conquistas, Memórias e, se o Eco for derrotado, o que perdeu.

## 9. Amanhecer (vitória)

Chefe da Região derrotado → o céu clareia em 10 s, inimigos restantes viram cinza, música resolve. Recompensas: Almas ×1,5, **1 Fragmento de Brasa** (garantido na primeira vitória por mapa e Ciclo; depois 35% de chance), Memória do chefe, desbloqueio do próximo mapa (primeira vez). Depois do Amanhecer, opção **"Continuar na Noite Infinita"**: a Vigília segue sem fim com a regra de Endless de VS (a cada 5 min, +100% HP base, +50% spawn, +25% dano) para ranking.

## 10. Pactos (modificadores de dificuldade, estilo Heat/Danger)

Ativados no Santuário antes da Vigília, com a Criança da Cisterna. Cada Pacto soma pontos de **Maldição** (0 a 10 no lançamento).

| Pacto | Maldição | Efeito | Recompensa |
|---|---|---|---|
| Fome Maior | +1 a +3 | +10% HP e +8% dano dos inimigos por ponto | +12% Almas por ponto |
| Noite Longa | +1 | Horas de 6 min (Vigília de 24 min) | +1 baú por Hora |
| Sem Descanso | +2 | Fogueiras não recarregam Frascos | +25% Almas |
| Mãos Trêmulas | +1 | Janela de aparo 0,12 s | Aparo gera +50% Postura |
| Ocos Lembram | +2 | Elites ganham um ataque telegrafado extra | Elites dropam baú garantido |
| Chefes Gêmeos | +3 | Chefe da Região vem com seu Eco | Brasa garantida |

Como em Hades: **a Brasa só é garantida na primeira vitória em cada nível de Maldição por personagem e mapa**. Isso cria uma escada de "sobe um ponto por vez".

## 11. Ritmo de uma Vigília exemplar (Aldric, Charneca, Ciclo I)

| Min | Evento | Estado do jogador |
|---|---|---|
| 0:00 | 15 Ocos lentos. Tutorial de movimento. | Nv 1, Espada Longa |
| 1:00 | Oco Grande telegrafando: prompt "Deslize para esquivar". | Nv 3 |
| 3:00 | Sepultadora atirando sal: prompt "Toque para aparar". | Nv 6, 2 armas |
| 5:00 | Guardião I (Lanterneiro Menor). Baú. Fogueira. | Nv 9, 3 armas, 2 passivas |
| 7:00 | Enxame de Páginas atravessa a tela. | Nv 12 |
| 10:00 | Chefe Menor: A Noiva da Turfa (ou Oco Coroado). Arena fecha. 2 fases. Baú dourado. Fogueira. | Nv 16, 5 armas |
| 12:00 | Cerco: anel de Ocos fechando. Vela aparece no centro. | Nv 19 |
| 13:30 | Primeira União (Lâmina do Juramento Eterno). | — |
| 15:00 | Guardião II (dois Ferreiros Cegos). Fogueira. | Nv 23, build fechada |
| 17:00 | Crias da Fome. Tela escurece. | Nv 26 |
| 20:00 | O Lanterneiro. 3 fases, 2 min 30 de luta média. | Nv 29 |
| 22:30 | Amanhecer. ~1.400 Almas, 1 Brasa. | — |
