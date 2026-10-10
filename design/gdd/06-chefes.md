# 06 · Chefes

> Em *Vigília das Cinzas*, chefes são a parte mais "Souls" do jogo: arenas fechadas, fases legíveis, barra de Postura, ataques brancos (aparáveis) e vermelhos (só esquiva). Nenhum chefe morre só de encostar. Este documento define os 8 chefes de lançamento, suas fases, movesets, números e recompensas.

---

## 1. Regras universais de chefe

| Regra | Valor |
|---|---|
| **Arena** | Ao surgir, uma "parede de névoa" fecha um círculo de 7 corpos de raio. Inimigos massa dentro morrem; novos não entram (exceto os invocados pelo chefe). |
| **HP** | `HP_chefe = HP_base × (1 + 0,04 × nível do jogador) × Maldição × Ciclo`. Escala com nível do jogador (regra VS), mas suave. |
| **Postura Firme** | Dano fora de janela crítica é reduzido em 40%. |
| **Barra de Postura** | 100 pontos. Aparo = +25; esquiva perfeita = +10; armas pesadas = +5 por acerto; Martelo/Sino = +15. Ao encher: **Quebra** (3 s atordoado, dano ×2, Postura Firme desligada). Depois, a barra zera e regenera 20/s por 5 s se não for atingida. |
| **Fases** | Chefe Menor: 2 fases (100% e 50%). Chefe da Região: 3 fases (100%, 60%, 25%). Cada transição tem animação de 1,5 s invulnerável com mudança visível (cor, música, arena). |
| **Ataques brancos** | Telegrafo 0,5 a 0,8 s, brilho branco. Aparáveis. |
| **Ataques vermelhos** | Telegrafo 0,8 a 1,2 s, brilho vermelho. Não aparáveis; só esquiva. Aparecem a partir da fase 2 do Chefe Menor e da fase 1 do Chefe da Região. |
| **Duração alvo** | Chefe Menor: 60 a 90 s. Chefe da Região: 2 a 3 min. Se durar mais de 5 min, o chefe entra em "Fúria" (+5% dano a cada 10 s) para evitar empates. |
| **Recompensa** | Chefe Menor: baú dourado (União garantida se houver requisito) + 60 Almas. Chefe da Região: Amanhecer, Brasa (garantida na 1ª vitória por mapa/Ciclo/Maldição), Memória, 200 Almas. |
| **Retrato no Santuário** | Cada chefe derrotado vira um retrato na cripta de Ama-Nhu, com a Memória completa. |
| **Áudio** | Cada chefe tem tema próprio em 2 ou 3 camadas que se somam por fase. |

Arquétipos (pesquisa): *gatekeeper* (ensina regras), *herói caído*, *dupla*, *besta gigante*, *deus com mudança de regra*, *espelho*, *mestre de postura*. Cada chefe abaixo é marcado com o seu.

---

## 2. Charneca das Lanternas

### 2.1 Chefe Menor — O Oco Coroado Maior *(arquétipo: gatekeeper)*
- **Visual:** Oco de 2,5 corpos de altura, coroa de lata, manto de lanternas.
- **HP base:** 1.800 · **Fases:** 2
- **Fase 1:** *Grito* (branco, empurra em área) · *Patada* (branco, cone frontal) · *Convocar* (chama 15 Ocos).
- **Fase 2 (50%):** ganha *Queda de Lanternas* (vermelho, 4 áreas aleatórias de fogo no chão) e acelera 20%.
- **Lição ensinada:** aparar o Grito preenche a Postura rápido; o jogador aprende que chefe se vence pela Postura.
- **Memória:** *"Coroaram o maior deles para que a horda tivesse rei. A horda não sabe o que é rei."*

### 2.2 Chefe da Região — O Lanterneiro *(arquétipo: besta gigante / gatekeeper)*
- **Visual:** gigante magro, 4 corpos, sem cabeça: no lugar, uma lanterna âmbar do tamanho de um barril. Carrega uma vara com outras sete lanternas.
- **HP base:** 6.500 · **Fases:** 3
- **Fase 1 (100%):** *Vara Horizontal* (branco, arco de 180°) · *Bater a Vara* (branco, linha) · *Luz Cega* (vermelho: cone de luz que, se acertar, inverte a tela em negativo por 2 s e causa dano contínuo).
- **Fase 2 (60%):** apaga 3 lanternas da vara; a arena escurece. *Lanterna Arremessada* (vermelho, área que fica queimando 6 s) · *Convocar Ocos das Lanternas* (10, que carregam luz: zonas visíveis).
- **Fase 3 (25%):** a lanterna-cabeça racha. *Explosão de Luz* (vermelho, anel que exige esquiva no timing) a cada 12 s · *Agarrar* (branco, longo: aparar causa Quebra imediata).
- **Segredo:** se o jogador apagou as 7 lanternas da Charneca antes do minuto 10, o Lanterneiro surge já na Fase 2 com HP 70%, mas a Noiva da Turfa aparece como Chefe Menor em vez do Oco Coroado.
- **Memória:** *"Ele era quem acendia as lanternas da vila ao anoitecer. Quando a Chama minguou, continuou. Nunca mais houve anoitecer; ele nunca mais parou."*

### 2.3 Chefe secreto — A Noiva da Turfa *(arquétipo: herói caído)*
- **Visual:** mulher alta, vestido de casamento afundado em turfa, véu que arrasta Ocos.
- **HP base:** 2.600 · **Fases:** 2
- **Fase 1:** *Arrastar Véu* (branco, puxa o jogador 3 corpos) · *Passo Afundado* (vermelho, ela some na turfa e emerge sob o jogador em 1,2 s).
- **Fase 2:** *Procissão* (chama 30 Carpideiras em fila) · *Lamento* (branco, longo: aparar = ela chora e fica 4 s em Quebra).
- **Recompensa extra:** derrotá-la 3 vezes desbloqueia a Noiva como personagem (pós-lançamento).
- **Memória:** *"Casou-se no dia em que a Chama minguou. O noivo voltou da guerra. Oco. Ela nunca aceitou o 'não'."*

---

## 3. Abadia Ruída de Ama-Nhu

### 3.1 Chefe Menor — O Sino Mestre *(arquétipo: mestre de postura)*
- **Visual:** sino de bronze de 3 corpos com pernas de pedra; dentro, uma sepultadora.
- **HP base:** 2.200 · **Fases:** 2
- **Fase 1:** *Badalada* (branco, onda circular que ressuscita cadáveres recentes) · *Tombo* (branco, cai em direção ao jogador).
- **Fase 2:** *Dobre* (vermelho: 3 badaladas seguidas, cada uma com anel). Aparar a Badalada no timing certo o faz ressoar e perder 20 de Postura extra.
- **Lição:** aparo rítmico. O chefe só quebra rápido para quem apara.
- **Memória:** *"Tocava para os mortos. Agora os mortos tocam para ele."*

### 3.2 Chefe da Região — Madre Suturada *(arquétipo: dupla fundida em uma)*
- **Visual:** uma abadessa costurada a seis irmãs em uma única massa de hábitos brancos, 3,5 corpos; 7 cabeças, 12 braços.
- **HP base:** 7.200 · **Fases:** 3
- **Fase 1:** *Agulhas* (branco, leque de 7) · *Círculo de Sal* (área grande de lentidão) · *Abraço* (vermelho, agarrão que costura o jogador: 15% HP e perde 1 Frasco se ainda tiver).
- **Fase 2 (60%):** duas irmãs se soltam e viram **Costureiras** independentes (elites). A Madre fica parada curando as duas (sem Postura Firme nesse momento: janela).
- **Fase 3 (25%):** só sobra a Madre, agora rápida, com *Sutura Final* (vermelho: linhas em toda a arena que exigem ficar em uma faixa segura) e *Lamento* aparável (Quebra longa).
- **Memória:** *"Para que nenhuma irmã morresse sozinha, costurou-se a todas. Agora nenhuma morre."*

---

## 4. Forja Afundada de Orun

### 4.1 Chefe Menor — O Autômato Contador *(arquétipo: gatekeeper mecânico)*
- **Visual:** corvo de ferro de 2,5 corpos com ábaco no peito.
- **HP base:** 2.400 · **Fases:** 2
- **Fase 1:** *Investida* (branco, longa, para por 2 s depois) · *Bicada* (branco).
- **Fase 2:** *Contagem* (vermelho: a arena mostra números no chão; ele investe para cada um em ordem; o jogador precisa ler a sequência).
- **Memória:** *"Contava os mortos para Orun. Chegou a um número que não cabia no ábaco."*

### 4.2 Chefe da Região — O Martelo Sem Braço *(arquétipo: arma viva / herói caído)*
- **Visual:** um martelo de guerra de 4 corpos flutuando, com um braço de bronze preso ao cabo (o braço que Brann perdeu). A Brasa dentro da cabeça do martelo pulsa.
- **HP base:** 7.800 · **Fases:** 3
- **Fase 1:** *Queda* (branco, área circular) · *Varredura* (branco, 360°) · *Faísca* (vermelho: 5 projéteis de ferro).
- **Fase 2 (60%):** a cabeça fica incandescente. Toda a arena vira ferro quente (dano contínuo leve) exceto 4 "poças frias". *Terremoto* (vermelho: fendas que se propagam).
- **Fase 3 (25%):** o braço se solta e tenta pegar o jogador separadamente (segundo alvo, 800 HP). Matar o braço primeiro = o Martelo cai e fica 5 s em Quebra.
- **Evento de Santuário:** após a primeira vitória, Brann recebe o braço de volta. Diálogo novo, e Brann passa a forjar Uniões 20% mais barato.
- **Memória:** *"Brann forjou-o para o rei. O rei virou Oco antes de recebê-lo. O martelo esperou. Ainda espera."*

---

## 5. Biblioteca Invertida de Vharos

### 5.1 Chefe Menor — O Capítulo Perdido *(arquétipo: regra)*
- **Visual:** livro aberto de 3 corpos, páginas em movimento, uma boca entre as páginas.
- **HP base:** 2.600 · **Fases:** 2
- **Fase 1:** *Tiro de Palavras* (branco, 8 projéteis em círculo) · *Fechar* (branco, bate as capas; área).
- **Fase 2:** *Reescrever* (vermelho: inverte a gravidade dos projéteis do jogador por 5 s; eles voltam) · *Rasgar* (branco).
- **Memória:** *"Vharos arrancou este capítulo para que ninguém lesse. Ele leu."*

### 5.2 Chefe da Região — O Índice *(arquétipo: deus com mudança de regra)*
- **Visual:** uma figura humana feita de lombadas de livros, 4 corpos, sem rosto; atrás, estantes que se movem.
- **HP base:** 8.000 · **Fases:** 3 ("Volumes")
- **Volume I:** *Consulta* (branco, estantes avançam de um lado da arena) · *Nota de Rodapé* (branco, pequenos projéteis).
- **Volume II (60%):** regra: **o jogador não vê o HP do chefe nem o próprio HP** (HUD some; só stamina). *Página Branca* (vermelho: a arena fica branca por 3 s; apenas sombras).
- **Volume III (25%):** regra: **as armas do jogador mudam de alvo a cada 5 s** (próximo → aleatório → mais distante). *Errata* (vermelho: cópias do Índice; só a verdadeira tem sombra).
- **Memória:** *"Catalogou todos os livros. Depois, todas as pessoas. Depois, não havia mais o que catalogar, e ele catalogou o vazio."*

---

## 6. Bosque de Sélide

### 6.1 Chefe Menor — O Mestre de Caça Maior *(arquétipo: caçador)*
- **HP base:** 2.800 · **Fases:** 2. Investidas montadas (branco), flechas (branco), apito que chama 15 lobos (fase 2), *Tiro Certeiro* (vermelho, mira laser de 1,2 s).
- **Memória:** *"Prometeu à deusa a maior presa do bosque. A deusa não respondeu. Ele continua caçando a resposta."*

### 6.2 Chefe da Região — A Matilha de Três Gargantas *(arquétipo: dupla, aqui tripla)*
- **Visual:** três lobos gigantes (branco, cinza, negro) que **compartilham uma única barra de HP** (9.000) e uma única barra de Postura.
- **Fase 1 (3 lobos):** *Cerco* (os três circundam e atacam em sequência, brancos) · *Uivo* (vermelho: medo, o jogador anda 50% mais devagar por 2 s).
- **Fase 2 (60%):** um lobo (aleatório) morre; os dois restantes ganham velocidade e atacam **simultaneamente de lados opostos** (um branco, um vermelho: aparar um e esquivar o outro).
- **Fase 3 (25%):** sobra um, com o tamanho dos três; *Salto* (vermelho, cai sobre o jogador) e *Mordida* (branco, longa, aparar = Quebra).
- **Memória:** *"Eram os três cães de Sélide. Quando ela se calou, dividiram a fome entre si."*

---

## 7. A Cisterna (final do Ciclo I)

### 7.1 Chefe Menor — Não-Vigilante Coroado *(arquétipo: espelho invertido)*
- Cópia do personagem com atributos invertidos (elite do bestiário, versão chefe). **HP base:** 3.000. Usa a arma inicial do jogador e 2 passivas aleatórias.
- **Memória:** *"Você, se tivesse escolhido diferente. Também não deu certo."*

### 7.2 Chefe da Região — A Fome, Vestida de Vigilante *(arquétipo: espelho / deus)*
- **Visual:** o personagem do jogador, mas feito de sombra líquida, com as armas que ele mais usou nas últimas 10 Vigílias (lê o perfil de jogo).
- **HP base:** 10.000 · **Fases:** 3
- **Fase 1:** usa as **3 armas mais usadas pelo jogador** (versão inimiga de cada uma: Espada Longa vira arco de sombra etc.). Ataques brancos.
- **Fase 2 (60%):** usa as **Uniões** do jogador atual, uma a uma (vermelhas). O jogador enfrenta a própria build.
- **Fase 3 (25%):** a Fome "despe" o Vigilante: vira uma boca gigante no chão (como a Boca no Chão) que persegue; só a Postura importa, e ela só enche com **aparos** (cada mordida é branca). Ensina o jogador a terminar o jogo no gesto mais Souls possível.
- **Final do Ciclo I:** a Fome recua; Iselda fala pela primeira vez em primeira pessoa; o Ciclo II abre.
- **Memória:** *"Não tem rosto. Usa o seu."*

---

## 8. Chefes de Ciclo II+ (planejados)

| Chefe | Tipo | Ideia |
|---|---|---|
| **Versões Lembradas** de todos os 6 Chefes de Região | Ciclo II | Fase 4 extra; uma mecânica nova cada (ex.: Lanterneiro Lembrado tem 14 lanternas) |
| **Iselda, Que Guardava a Chama** | Ciclo III, chefe opcional | Luta contra a Guardiã; derrotá-la abre o Final C |
| **A Primeira Chama, Faminta** | Ciclo III, final verdadeiro | Arena é o próprio Santuário; 4 fases, uma por deus |
| **Rook, Desencapuzado** | Evento | Chefe de traição no meio do jogo |

## 9. Tabela resumo

| # | Chefe | Mapa | Tipo | HP base | Fases | Duração alvo |
|---|---|---|---|---|---|---|
| 1 | Oco Coroado Maior | Charneca | Menor | 1.800 | 2 | 60 s |
| 2 | O Lanterneiro | Charneca | Região | 6.500 | 3 | 2:30 |
| 3 | A Noiva da Turfa | Charneca | Secreto | 2.600 | 2 | 80 s |
| 4 | O Sino Mestre | Abadia | Menor | 2.200 | 2 | 70 s |
| 5 | Madre Suturada | Abadia | Região | 7.200 | 3 | 2:40 |
| 6 | Autômato Contador | Forja | Menor | 2.400 | 2 | 70 s |
| 7 | O Martelo Sem Braço | Forja | Região | 7.800 | 3 | 2:45 |
| 8 | Capítulo Perdido | Biblioteca | Menor | 2.600 | 2 | 75 s |
| 9 | O Índice | Biblioteca | Região | 8.000 | 3 | 3:00 |
| 10 | Mestre de Caça Maior | Bosque | Menor | 2.800 | 2 | 75 s |
| 11 | Matilha de Três Gargantas | Bosque | Região | 9.000 | 3 | 3:00 |
| 12 | Não-Vigilante Coroado | Cisterna | Menor | 3.000 | 2 | 80 s |
| 13 | A Fome, Vestida de Vigilante | Cisterna | Região | 10.000 | 3 | 3:30 |

