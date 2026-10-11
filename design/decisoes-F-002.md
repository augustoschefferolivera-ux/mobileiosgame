# Decisões da F-002 "Movimento e mapa"

- **Status:** decidido em 2026-10-11, antes de qualquer código da F-002, por delegação do usuário ("Deixo a decisão por você"). Nada da F-002 foi implementado.
- **Como foi feito:**
  - levantamento: um workflow com 4 pesquisadores (obstáculos e colisão, joystick e entrada, câmera e mapa, movimento e estado), cada um com um verificador cético que conferiu as citações e procurou a resposta em todas as fontes, e um crítico de completude. Saíram 71 perguntas, e 17 delas os documentos já respondem (§1);
  - depois, este documento passou por uma revisão adversarial (3 lentes + verificadores): 29 achados confirmados, todos aplicados.
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md`;
  - o brief aprovado, com as decisões Q-xx;
  - o GDD;
  - os ADR-0002 e ADR-0003;
  - o `feature_list.json`.
- **Convenção:**
  - **[delegada]** marca decisão de design ou número que nenhum documento dá; ela vale até você dizer o contrário. As outras decisões vêm de documento ou são só técnicas;
  - o que pertence a outras features (F-003 a F-009) **não** foi decidido aqui: fica como recomendação na §9, para ser fechado com as pendências daquela feature.
- **Pendências da F-002 no `feature_list.json`:**
  - "tamanho e forma dos obstáculos, hitboxes, contorno, bloqueio de projéteis": resolvida pelas §2 e §3;
  - "Cores extras da paleta (Q-27)": já estava decidida pela Q-27; o uso de cada cor está na §5.

## 0. O que foi decidido por delegação (para vetar de relance)

| # | Decisão | Valor |
|---|---|---|
| O1 | Forma dos obstáculos | só círculos |
| O2 | Tamanho dos obstáculos | diâmetro de 64, 80 ou 96 px (2 a 3 corpos) |
| O3 | Quantidade | 54 no mapa, de 4 a 8 por tela; a tela central (início) com 4 |
| O4 | Regras da disposição | nenhum cruza a costura do toro; folga de 64 px entre obstáculos, medida no toro; zona livre de 192 px em volta do início; corredor livre do início até a costura em x |
| O5 | Cor dos obstáculos | #2b3340 sólido, sem traço de borda |
| O6 | Bloqueio de projéteis | no MVP, nenhum projétil nem área é bloqueado por obstáculo |
| H1 | Hitboxes | círculo: jogador 16 px, massa 16 px, médio 24 px de raio |
| H3 | Contorno pelos inimigos | andam reto e deslizam na borda pela mesma colisão; tangente nula gira a normal +90°; reserva: campo de fluxo (F-003) |
| J1 | Área do joystick | 60% da largura útil à esquerda, da metade da tela até a borda de cima do inset inferior, ancorada na safe-area |
| J2 | Dono do joystick | o 1º dedo que começa na área, até soltar; "reposiciona a cada novo toque" = cada toque novo depois de soltar |
| J3 | Curva | analógica: m = (d/60 − 0,15)/0,85, entre 0 e 1; velocidade = 144 px/s × m |
| J4 | Visual do joystick | base com fundo #0b0e14 a 35% e anel de 2 pt em osso a 60%, raio 60 pt; pino em osso a 60%, raio 24 pt; somem ao soltar |
| J5 | Prompt "Deslize para mover" | texto osso de 18 pt num painel #0b0e14 a 60% com borda de 2 pt em osso, no centro da área do joystick; fade de 200 ms |
| J6 | O que é "mover" | qualquer passo com vetor fora da zona morta, desde 0:00 |
| T1 | Capacidade da entrada | 5 dedos e anel de 64 eventos por frame |
| M1 | Partida e parada | instantâneas, sem inércia |
| M2 | Início do jogador | (585, 1.266), no campo novo `inicio_jogador` da região |
| M3 | Direção do triângulo | gira para a última direção não nula da intenção (mx, my); no início, aponta para cima |
| C1 | Piso no MVP (até a arte, depois da F-010) | liso (#1a1f2b), sem os tiles de 16 px de B §3.2; a referência de movimento são os obstáculos |
| C2 | Câmera | posição arredondada para 0,5 pt (1 px do canvas) |
| E1 | Evidência | vídeo `movimento.webm` de 390 × 844 e 3 PNG `movimento-N-390x844.png` |

## 1. O que os documentos já respondem

- **Câmera** rígida, centrada na posição interpolada do jogador pelo delta toroidal, sem atraso nem limites. Fontes: B §3.2 ("Câmera centrada no jogador"), ADR-0002 §3 e doc 07 §1 ("nunca encontra borda").
- **Jogador no centro do canvas**, em (195, 422) pt. A vista de ≈ 12 × 26 corpos de B §3.2 é o canvas inteiro. A safe-area ancora o HUD e os alvos, não a câmera do mundo.
- **Unidades em pt lógicos (390 × 844)**: o raio de 60 pt, a zona morta de 9 pt e os 400 pt/s (ADR-0002 §11). Um toque no letterbox não conta, porque os listeners estão no canvas. O encolhimento na aba do Safari já está registrado como risco.
- **Vetor limitado a um círculo (|v| ≤ 1):** B §3.3 dá a velocidade como rapidez ("1,0 = 4,5 corpos/s (144 px/s)"), então a diagonal não pode passar de 144 px/s. Teste: 60 passos na diagonal = 144 px (±1%).
- **Zona morta radial**, sobre o módulo do vetor. É o que o F-002.1 descreve ("vetor nulo abaixo de 0,15 × 60 pt").
- **Grade espacial de 64 px só na F-003** (B §4). Na F-002, o jogador testa a lista inteira de obstáculos (54), fora da grade dinâmica (ADR-0002 §6).
- **A simulação só lê `ComandosDoPasso`.** A zona morta e o raio ficam no TradutorDeGestos, fora da simulação (ADR-0002 §12).
- **A mira das armas de "direção do movimento" usa a intenção**, isto é, a direção do joystick (ADR-0002 §7).
- **Destrutíveis, visão e IA:** os obstáculos não têm HP (Q-00; o estado só tem o bit `ativo`, ADR-0002 §6) e não bloqueiam visão, escolha de alvo nem decisão de IA (nenhuma regra em vigor pede linha de visão).
- **HUD da Vigília na F-002:** nenhum. Cada elemento entra com a feature que ele mostra (brief §5.12): a pausa vem na F-004 (Q-25) e a Hora na F-008. O momento do prompt se confere por `__GAME_DEBUG__.relogio`.
- **Cores de UI:** osso #e8dcc4 sobre fundo escuro, com painel "pedra e osso" (borda de 2 px em osso, fundo translúcido escuro). Fontes: doc 11 §1 e doc 13 §1.3 e §1.7. Osso também vale para os números de dano (Q-27).
- **Corrida, joystick fixo e som de toque: fora.** A corrida está fora (B §3.4). O joystick fixo é opção da tela de Opções, que não está em B §2 (Q-00). O áudio do MVP é só para eventos críticos (B §2).
- **"Obstáculos dentro da arena somem"** (B §3.11; doc 07 §4): regra da arena (F-008/F-009); recomendação na §9.

## 2. Obstáculos

- **Forma: só círculos. [delegada]**
  - Mantém o formato aprovado `{ x, y, forma, tamanho }` (ADR-0002 §8), com `tamanho_px` = diâmetro, sem emendar ADR.
  - A colisão e o deslize ficam no par círculo × círculo, só com `Math.sqrt` (ADR-0002 §5).
  - Sem quinas, a horda não prende atrás de um canto (orçamento de B §3.13).
  - O doc 07 §1 cita "árvores, pilares, túmulos": os círculos representam as árvores retorcidas (doc 01 §5.1) e os pilares. Quando chegarem os sprites, depois da F-010, um túmulo pode ter sprite retangular sobre a mesma área circular.
  - O schema passa a aceitar só `forma: "circulo"` em obstáculos.
- **Tamanho: diâmetro de 64, 80 ou 96 px (2 a 3 corpos), em múltiplos de 16 px (os tiles de B §3.2). [delegada]**
  - O menor (64 px) é maior que o maior corpo que anda pelo mapa (médio de 48 px), para o obstáculo não ser lido como inimigo.
  - O raio mínimo (32 px) é muito maior que o deslocamento por passo (2,4 px andando), e a colisão discreta não deixa atravessar.
  - **Invariante para as features seguintes:** nenhum deslocamento por passo passa de 32 px. Esquiva, empurrões e knockback conferem isso nos seus testes (§9).
- **Quantidade: 54 no mapa, de 4 a 8 por tela, com densidades diferentes entre as 9 telas; a tela central, onde a Vigília começa, tem 4. [delegada]**
  - É a faixa de B §3.2.
  - Com o wrap, o jogador cruza as mesmas telas muitas vezes, e densidades diferentes ajudam a saber onde se está.
- **Disposição:** fixa no JSON da Charneca (Q-04), escrita na F-002 e travada por estas regras no Vitest:
  1. `(x, y)` é o centro do obstáculo. A tela é (⌊x/390⌋, ⌊y/844⌋), e a contagem por tela (F-002.6) usa o centro.
  2. 0 ≤ x < 1.170 e 0 ≤ y < 2.532 (o schema ganha os máximos).
  3. **[delegada]** Nenhum obstáculo cruza a costura do toro: o centro fica a pelo menos um raio de x = 0, x = 1.170, y = 0 e y = 2.532. Pode cruzar a divisa entre duas telas.
  4. **[delegada]** Folga mínima de 64 px (2 corpos) entre as bordas de dois obstáculos, **medida pelo delta toroidal** (ADR-0002 §6). Assim um médio de 48 px passa, e cada obstáculo fica isolado e convexo, também através da costura. Um caso fixo no Vitest tem de ser reprovado: R = 48 em x = 48 e em x = 1.122, na mesma y.
  5. **[delegada]** Zona livre de 192 px (6 corpos) entre o ponto de início e a borda de qualquer obstáculo. Ela comporta os 144 px do teste de velocidade (F-002.5), mais o raio de 16 px do jogador e uma folga de 32 px. Mesmo assim, o F-002.5 roda com a lista de obstáculos vazia, para nenhuma colisão esconder um erro de velocidade.
  6. **[delegada]** Corredor livre do início até a costura em x: nenhum obstáculo com |y − 1.266| < raio + 16 px para x entre 585 e 1.170. É o caminho do vídeo de evidência (§8).
  - A F-002 entrega também uma imagem do mapa 3 × 3 com os obstáculos, para revisão, em `production/evidencias/F-002/`.
- **Tipo na ficção:** sem campo `tipo` no MVP (o formato aprovado não tem). Nenhum obstáculo se chama "lanterna": as 7 lanternas são o objeto de um segredo fora do MVP (doc 07 §2; B §2).
- **Cor: #2b3340 sólido, sem traço de borda. [delegada]**
  - Fica nos "azuis-pretos e cinzas frios" do fundo (doc 13 §1.3) e lê como cenário, não como ameaça.
  - Não usa branco (reservado ao aparo e ao telegrafo) nem #ff2a2a, e a brasa fica só para o jogador.
  - Uma borda de outra cor exigiria dois membros por obstáculo no atlas tingido (ADR-0002 §11).
  - Os obstáculos ficam sob as entidades, na camada do mundo (ADR-0002 §11).
- **Bloqueio de projéteis e áreas: no MVP, nada é bloqueado por obstáculo:** Facas, projétil da Noviça, onda da Lâmina, arco da Espada, aura do Círculo, telegrafos, Grito e ataques do Lanterneiro. **[delegada]**
  - O doc 07 §1 diz que "projéteis do jogador passam ou não dependendo da arma (projéteis de Vharos atravessam)", ou seja, permite que a regra varie por arma. No MVP, as quatro armas ficam entre as que atravessam.
  - As Facas miram o "mais próximo" sem linha de visão (ADR-0002 §7). Bloqueá-las desperdiçaria facas e o Contra-ataque redirecionado ao inimigo aparado.
  - O projétil da Noviça é o tutorial do aparo (doc 11 §4), e o critério do marco é o aparo gostoso (B §1).
  - A silhueta do telegrafo no chão (B §3.4) nunca mente.
  - O campo por arma (`atravessa_obstaculos`) entra quando existir uma arma bloqueada, fora do MVP.
  - A F-002 retira as duas pendências que apontam para ela em `armas.json` (Facas) e `inimigos.json` (Noviça).
- **Impressão da disposição:** o FNV-1a da lista de obstáculos da região vai para uma das palavras reservadas do cabeçalho do estado e entra no hash (ADR-0002 §5; ADR-0003 §3). Um replay ou uma referência de hash feitos com outra disposição deixam de bater. O que um save faz nesse caso fica para a F-008 (§9).

## 3. Hitboxes e colisão

- **Forma: círculo para o jogador e para os inimigos (massa e médios).** O círculo é o teste mais barato e determinístico no toro. A forma da área do chefe fica para a F-009 (§9).
- **Raios: jogador 16 px, massa 16 px, médio 24 px. [delegada]**
  - Massa e médio: metade do `tamanho_px` de `inimigos.json` (32 → 16 e 48 → 24), o círculo inscrito no sprite (B §3.2).
  - Jogador: o triângulo isósceles de 48 × 48 tem círculo inscrito de ≈ 14,8 px; 16 px (1 corpo de diâmetro) passa dele por ≈ 1,2 px.
  - **A posição (x, y) do jogador é o incentro do triângulo**, que é também o centro da hitbox e o pivô da rotação. Ele fica a ≈ 14,8 px da base, ou seja, origem do sprite em (0,5; 0,691) com a ponta para cima.
  - Um círculo de 24 px no jogador sairia pelos lados do triângulo e daria "acerto no vazio".
- **Colisão com obstáculos, em cada passo:**
  1. `xAnt ← x`, `yAnt ← y`;
  2. somar o deslocamento do comando;
  3. para cada obstáculo ativo, em ordem fixa de índice, com 2 iterações por passo (junções), empurrar para fora pela menor penetração, ao longo da normal centro a centro, medida pelo delta toroidal. Centros coincidentes empurram para +x;
  4. normalizar no toro, **em Float32**: `x = fround(x)`; se `x < 0`, `x = fround(x + W)`; se `x ≥ W`, `x = fround(x − W)`, nessa ordem, para que a segunda checagem pegue o caso em que `x + W` arredonda para W (o mesmo vale para y, com H).
  - O F-002.2 testa x = −1e-5 e x = W − 1e-5, e o mesmo em y. Os outros testes: contra a face, contra a junção de dois obstáculos e cruzando a costura.
  - O resto do movimento fica tangente, e o corpo desliza junto à borda.
- **Contorno pelos inimigos: andam reto e deslizam na borda pela mesma colisão. [delegada]**
  - B §3.6 diz que o Oco anda "em linha reta até o jogador" (B prevalece), e o doc 07 §1 diz que os inimigos contornam. Com obstáculos circulares, isolados e convexos, o deslize leva o corpo em volta.
  - **Desempate:** se a componente tangente do movimento for exatamente nula (movimento apontado para o centro do obstáculo, caso provável com o jogador parado e coordenadas inteiras), o corpo desliza na direção da normal girada +90° (anti-horário, em coordenadas do mundo). O teste põe jogador, obstáculo e corpo na mesma y e confere que o corpo sai do contato.
  - O desempate não vale para o jogador: andar de frente para um obstáculo só para, porque ele segue a intenção do polegar.
  - A F-002 entrega a função genérica "círculo de raio r contra obstáculos" em `src/logica`, testada com o jogador e com corpos sintéticos de raio 16 e 24 px. Os Ocos reais passam a usá-la na F-003, com um teste de chegada e a reserva de campo de fluxo (§9).
- **Tudo é sólido contra obstáculos:** o jogador e os corpos sintéticos da F-002. Esquiva, empurrões e knockback seguem a mesma regra (§9). Bater num obstáculo não causa dano: esse sistema não está em B §2.

## 4. Joystick e entrada

- **Área que cria o joystick, ancorada na safe-area. [delegada na medida]**
  - É o retângulo:
    - de x = `insets.esquerda` até `insets.esquerda + 0,6 × (390 − insets.esquerda − insets.direita)`;
    - de y = máx(422, `insets.topo`) até `844 − insets.baixo`.
  - Em retrato, com insets laterais nulos: x de 0 a 234 pt e y de 422 pt até a borda de cima do inset inferior.
  - Fontes: B §3.5 ("metade inferior"), brief §5.5 e doc 02 §4 ("60% larg.", deixando livres os botões da direita), doc 12 §2.1 ("acima do home indicator").
  - Um toque fora dela não move nada.
  - Ela entra na tabela de alvos, e o teste de safe-area da F-001.13 a cobre com insets laterais e verticais não nulos.
  - O Aparo e o Frasco (F-006, F-007) ficam à direita, fora dela.
- **Base fixa no ponto do toque; passou do raio, o vetor satura** (o pino fica preso na borda). É a leitura literal de B ("aparece onde o polegar toca"; "reposiciona a cada novo toque") e do F-002.1 ("saturado em 1 no raio"). Perto de uma borda, a base fica onde o dedo tocou. Reavaliar no build de iPhone depois da F-006 (Q-29).
- **Curva: analógica, linear depois da zona morta: m = mín(1, máx(0, (d/60 − 0,15)/0,85)). [delegada]**
  - É a leitura mais direta do F-002.1, sem salto na borda da zona morta.
  - A velocidade é 144 px/s × m; o F-002.5 mede com o joystick saturado.
  - O vetor vai para `ComandosDoPasso` como dois Float32 (mx, my), já com a zona morta, a curva e o limite aplicados, para o replay se reproduzir bit a bit.
- **Dono do joystick: o 1º dedo que começa na área, até soltar. [delegada]**
  - Outros dedos na área não mexem no movimento.
  - O dono continua dono se sair da área ou passar sobre um botão.
  - "Reposiciona a cada novo toque" (B §3.5) fica lido como cada toque novo depois de soltar. Um 2º dedo acidental não teletransporta o joystick.
  - O F-002.4 (dois toques em lugares diferentes, um depois do outro) continua valendo.
  - Um toque que começou antes da Vigília nunca vira dono.
- **Visual: base de raio 60 pt com fundo #0b0e14 a 35% de opacidade e anel de 2 pt em osso a 60%; pino de raio 24 pt em osso a 60%. [delegada]**
  - É o estilo "pedra e osso" do doc 13 §1.7.
  - Aparecem no `touchstart` e somem no mesmo frame do `touchend`.
  - Ficam na cena **Hud** (ADR-0002 §11.1), criada na F-002, como imagens do atlas que só se movem: nada de Graphics redesenhado por frame.
  - A Hud mede os insets da safe-area em `create` e `resize`.
- **Tradutor de gestos na F-002:**
  - anel de eventos (`Float64Array`);
  - slots fixos de dedos;
  - classificação pelo lugar onde o toque começou;
  - reconciliação;
  - vetor de movimento;
  - `ComandosDoPasso` só com o movimento.
- **O que fica para a F-006:** swipe e toque duplo, porque os números ainda estão em aberto. Na F-002, um swipe rápido só move.
- **Capacidade: 5 slots de dedo e anel de 64 eventos por frame. [delegada]** O 6º dedo e os eventos além do 64º são descartados e somados em `toquesPerdidos`. O iPhone costuma relatar até 5 toques; conferir no aparelho (Q-29).
- **Reconciliação, sem perder um fim de toque:**
  - o handler guarda, sem alocar, os identificadores de `e.touches` do último evento;
  - a cada passo, o tradutor libera os slots cujos identificadores não estão nesse retrato. Isso cobre um `touchend` descartado num estouro do anel;
  - todos os slots são liberados num `touchcancel` sem toques restantes e em `blur`, `pagehide` e `visibilitychange` (por `addEventListener`, nunca `window.onblur`, ADR-0002 §12);
  - sem tempo limite, porque um dedo parado não gera `touchmove`.
- **Comandos por passo:**
  - a simulação recebe `ComandosDoPasso` por passo (ADR-0002 §12);
  - ao vivo, o driver repete em todos os passos de um frame o vetor que o tradutor leu naquele frame. Ações pontuais, como o aparo, vão só no 1º passo (F-006);
  - em teste e em replay, os comandos vêm de um roteiro indexado pelo passo absoluto (§6).
- **Mouse e teclado só no build de debug** (ADR-0002 §12; ADR-0003 §4):
  - o mouse é um dedo virtual com identificador reservado (`mousedown`, `mousemove` e `mouseup` vão para a mesma fila, com a mesma área, zona morta e raio);
  - WASD e setas dão um vetor de 8 direções com |v| = 1 (a diagonal usa 1/√2 como literal), direto em `ComandosDoPasso`; se o toque estiver ativo, o toque tem prioridade.

## 5. Câmera, mapa, render e cores

- **Piso no MVP: liso, na cor de fundo #1a1f2b, até a arte (depois da F-010). [delegada]**
  - B §3.2 dá tiles de 16 px, mas 1.170 e 2.532 não são múltiplos de 16 (sobram 2 px e 4 px), e um padrão repetido mostraria a costura.
  - Mudar o mapa ou esticar o tile mudaria números de B.
  - A camada de chão do ADR-0002 §11 fica vazia; os obstáculos dão a referência de movimento.
- **Câmera: posição arredondada para 0,5 pt (1 px do canvas a 2×). [delegada]** Evita tremor sub-pixel nas bordas das formas.
- **Início do jogador: (585, 1.266), o centro do mapa e da tela central, num campo novo `inicio_jogador { x, y }` do JSON da região. [delegada]**
  - Cada região define o seu, e o teste garante a zona livre e o corredor (§2).
  - O schema da região ganha o campo.
  - Sortear o início exigiria um fluxo de RNG novo.
- **Jogador:**
  - triângulo isósceles de base e altura de 48 px, na cor brasa #ffb347 (B §1; doc 13 §1.3: o jogador é a coisa mais quente), com a origem no incentro (§3);
  - **gira para a última direção não nula da intenção (mx, my); no início, aponta para cima. [delegada]**;
  - a simulação guarda essa direção como vetor unitário (`dirX`, `dirY`), sem trigonometria; a cena calcula o ângulo;
  - é a mesma regra que o ADR-0002 §7 propõe para a mira das armas, mas aqui ela decide só o desenho. A pendência da F-004 (direção das armas com o jogador parado) continua aberta (§9).
- **Cores:**
  - obstáculos #2b3340;
  - jogador #ffb347;
  - joystick e prompt em osso #e8dcc4 sobre #0b0e14 translúcido;
  - nada usa branco nem #ff2a2a.
- **Render:**
  - o atlas único é gerado no Boot da F-002 (círculo, triângulo, disco e anel; ADR-0002 §11);
  - a interface de render do mundo nasce com a implementação `Image` (o plano B, `?render=image`); o `SpriteGPULayer`, caminho principal do ADR-0002 §15 item 3, entra na F-003, atrás da mesma interface, junto com a horda. Na F-002 há só 55 objetos de mundo (1 jogador e 54 obstáculos);
  - o wrap pela cópia mais próxima da câmera é uma função pura, testada (F-002.2) e reaproveitada pela F-003.

## 6. Movimento e estado

- **Partida e parada instantâneas, sem inércia. [delegada]** É a opção mais simples que cumpre o F-002.5. Com o ±1% (ainda proposta de teste), só caberia uma rampa de no máximo 1 passo: uma rampa de k passos perde ≈ 1,2·k px, e 1% de 144 px é 1,44 px. Se um dia houver inércia, ela entra como dado do Vigilante.
- **Velocidade:** 144 px/s × m = 2,4 px por passo com o joystick saturado (B §3.3). O Sal (F-006) multiplica esse valor. O bônus regional e a névoa ficam fora (Q-28).
- **Estado (VERSAO_LAYOUT 2):**
  - registro do jogador com `x`, `y`, `xAnt`, `yAnt`, `dirX` e `dirY` (Float32) e o estado do prompt de mover (Uint8);
  - no cabeçalho, o flag "tutorial de mover visto", como parâmetro da Vigília (ADR-0002 §3), e a impressão da disposição dos obstáculos (§2);
  - o bit `ativo` dos obstáculos entra com a arena, na F-008, a primeira feature que o muda;
  - as referências fixas `faad4a1f` e `9d08b542` do teste de determinismo são atualizadas junto com a versão;
  - stamina, HP, Frascos e timers entram nas features que os usam (ADR-0003 §3).
- **Testes de determinismo:**
  - passam a rodar um roteiro fixo de 1.000 passos de `ComandosDoPasso`, indexado pelo passo absoluto desde o passo 0, com movimento, deslize num obstáculo e cruzamento da costura, em vez de 1.000 passos parado;
  - continua o teste de 1 contra 5 passos por frame;
  - Node contra Chromium aplica o mesmo roteiro pelo gancho de debug `entrada.roteiro(lista)` (§8), que vale também para os passos rodados pelo driver, inclusive os que rodam antes do `avancar`.

## 7. Prompt "Deslize para mover" (A2.TUTORIAL.01; F-002.8)

- **Onde:**
  - na cena Hud, no centro da área do joystick (§4): em retrato sem insets laterais, x = 117 pt e y no meio do caminho entre 422 pt e a borda de cima do inset inferior;
  - sem anel-fantasma: o doc 02 §4 diz que o joystick "nunca reaparece no mesmo lugar", e um anel fixo ensinaria uma posição;
  - o texto vem de `t('A2.TUTORIAL.01')` e aparece em `__GAME_DEBUG__.textoAtivo`.
- **Estilo: texto osso de 18 pt (o tamanho do botão de Acender) num painel "pedra e osso" (#0b0e14 a 60%, borda de 2 pt em osso); fade de entrada e de saída de 200 ms (doc 11 §1: transições ≤ 200 ms). [delegada]**
- **Quando:**
  - o prompt aparece no passo de relógio 600 (0:10; doc 11 §4) se o tutorial ainda não foi cumprido;
  - **[delegada]** o tutorial é cumprido no 1º passo com vetor fora da zona morta, desde 0:00 (Q-26: "até o jogador fazer a ação uma vez");
  - quem já se moveu antes de 0:10 não vê o prompt;
  - o gatilho é a intenção (o vetor), então um obstáculo não segura o prompt;
  - com `?tutorial=0`, o flag entra como visto.
- **Persistência:**
  - na F-002, o cumprimento vale dentro da Vigília (parâmetro + estado do prompt), e o F-002.8 confere o "depois de cumprido" nela (o "como" do critério muda: §10);
  - a gravação entre Vigílias chega com o primeiro save meta, na F-007 (pendência registrada lá: §10);
  - até lá, quem não se mexer nos primeiros 10 s vê o prompt em toda Vigília nova.

## 8. Evidência, debug e testes

- **Evidência: os dois formatos de B. [delegada]**
  - Vídeo `production/evidencias/F-002/movimento.webm`, gravado pela Playwright com `recordVideo` de tamanho 390 × 844; sem o tamanho, ela reduz para caber em 800 × 800.
  - 3 PNG `movimento-1-390x844.png`, `movimento-2-390x844.png` e `movimento-3-390x844.png`, cujas dimensões o `verify.sh` já confere.
  - O `feature_list.json` passa a listar os quatro arquivos.
- **Roteiro do vídeo (≈ 15 a 20 s), seed 1, sem `?tutorial=0`:**
  1. levar o relógio a 0:10 e chamar `retomar()`, porque `avancar` deixa a simulação pausada; o prompt aparece;
  2. tocar e arrastar para a direita: o joystick aparece, o prompt some e a câmera segue pelo corredor livre;
  3. cruzar a costura em x, a 144 px/s a partir de x = 585, em ≈ 4,1 s;
  4. encostar num obstáculo e deslizar;
  5. soltar e tocar em outro ponto: o joystick aparece em outro lugar.
- **`__GAME_DEBUG__`:**
  - o que o ADR-0002 §14 dá: `jogador { x, y }`, `entrada.joystick { ativo, origemX, origemY }` em pt e `entrada.injetar(tipo, id, x, y, t)`, só no build de debug;
  - acréscimos desta decisão:
    - os tipos do `injetar` são `'inicio'`, `'move'`, `'fim'` e `'cancela'`, com x e y em pt e t em ms no relógio do `TouchEvent.timeStamp`; o `injetar` grava no mesmo anel da camada de toque;
    - `jogador.dirX/dirY` e `entrada.joystick.vx/vy` (com a zona morta aplicada);
    - `camera { x, y }`;
    - `entrada.roteiro(lista)`, que impõe `ComandosDoPasso` por passo absoluto (§6);
    - `jogador.x/y` vêm do estado da simulação, normalizados no toro;
  - `entrada.joystick` mantém a última origem com `ativo = false` depois de soltar, para o F-002.4 ler a origem de toques curtos;
  - o F-002.3 e o F-002.4 usam toques reais por CDP, como a F-001;
  - esses acréscimos vão para o ADR-0004.
- **F-002.7:** a tabela de alvos da Vigília tem a área do joystick e, desde já, deixa livre o canto direito dos botões futuros. O teste confere os 72 pt e a safe-area.

## 9. Recomendações para as features seguintes (não decididas aqui)

Cada item volta às pendências da feature indicada, que fecha a decisão antes de implementar (§10).

- **F-003:**
  - inimigos sólidos para o jogador, com a esquiva atravessando a horda: "cerco físico" (Q-13) e "rolar através da horda é permitido" (doc 02 §5.3);
  - spawn que cai sobre um obstáculo: testar, em ordem fixa, as direções seguintes da tabela literal até achar ponto livre, sem novo sorteio, mantendo o anel de 468 a 624 px fora da vista (Q-06). Empurrar para fora pode trazer o inimigo para dentro da vista perto das diagonais;
  - "parado" para o viés do anel de spawn (Q-07): ler pela intenção (vetor nulo), como a mira das armas (ADR-0002 §7);
  - o teste de contorno precisa de N corpos, de T passos e do critério de falha; a reserva é um campo de fluxo numa grade;
  - as cores dos inimigos evitam #2b3340.
- **F-004:**
  - a direção das armas de movimento com o jogador parado continua aberta. A regra da M3 (última direção não nula da intenção; no início, para cima) é candidata natural;
  - distância de acerto: áreas de ataque e projéteis acertam quando tocam a hitbox do alvo; distâncias de comportamento ("para a 1,5", "mantém 4") e zonas (Fogueira, Ímã) usam o centro. Isso muda a leitura do teste da aura de B ("acerta a 2 corpos e não a 2,1");
  - o knockback do Círculo nv7 respeita os obstáculos e o invariante de 32 px por passo.
- **F-004, F-005 e F-010:** quando a simulação para (pausa, level up, overlay de paisagem, pausa automática), liberar os slots e esconder o joystick; só um toque novo o cria de volta. Não vale no congelamento de 80 ms do aparo e da esquiva perfeita, nem na Fogueira, onde o passo roda.
- **F-006:**
  - a esquiva respeita os obstáculos e o invariante de 32 px por passo;
  - o aparo vai só no 1º passo do frame;
  - o swipe é medido por `timeStamp`.
- **F-007:**
  - ao Apagar, mover a posição gravada da mancha para o ponto livre mais próximo, contando todos os obstáculos do JSON, ativos ou não, para ela ser sempre alcançável (Q-04). Atenção: muda o que B manda gravar ("posição no mapa");
  - gravar no meta o tutorial de mover cumprido, e o prompt não voltar numa Vigília nova (Q-26).
- **F-008:**
  - arena de marco: desligar todo obstáculo que toca o disco de 224 px e deixá-lo desligado até o fim da Vigília (o bit `ativo` só vai de 1 para 0). É a leitura de "obstáculos somem" (B §3.11; doc 07 §4), e a Fogueira e os baús nunca ficam presos. Custo: a área dos 3 discos é ≈ 16% do mapa, e com os obstáculos que tocam a borda a região sem obstáculo chega a ≈ 24%;
  - Fogueira e baús não colidem com obstáculos. A direção da Fogueira, a 96 px do jogador, precisa de regra (por exemplo, a primeira de 8 direções literais com disco livre, mais a direção de partida e o caso sem nenhuma livre);
  - um save gravado com outra impressão de disposição: decidir entre migrar (o ADR-0002 §12 manda um `vigilia` de versão anterior passar pelas migrações) e descartar (e, nesse caso, se vale como Recusar);
  - o empurrão do Grito respeita os obstáculos e o invariante de 32 px por passo.
- **F-009:**
  - a área do Lanterneiro (retângulo alto, 4 corpos, doc 06 §2.2) como caixa alinhada aos eixos para acerto e contato;
  - a borda da arena contém também o chefe, para o corpo dele não tocar um obstáculo do lado de fora;
  - o Coroado com raio de metade do lado que a F-008 escolher.
- **Sem feature:**
  - histerese na zona morta: sem histerese por ora, para não criar número; reavaliar no build de iPhone (Q-29);
  - aperto de câmera de 2% no aparo (doc 11 §5): não está em B; decidir se entra antes da F-006.

## 10. O que muda em dados e documentos

**Já aplicado no registro destas decisões (`feature_list.json`):**

- F-002:
  - evidências (§8);
  - `pendencias_antes_de_comecar` marcadas como resolvidas por este documento;
  - o "como" do F-002.8 diz que o "depois de cumprido" é conferido na mesma Vigília.
- F-003, F-004, F-005, F-006, F-007, F-008, F-009 e F-010: uma pendência em cada, remetendo às recomendações da §9 que valem para ela.

**A F-002 aplica ao implementar:**

- `regiao.schema.json`:
  - obstáculo com `forma: "circulo"` e `tamanho_px` com `enum: [64, 80, 96]`;
  - máximos de x (< 1.170) e de y (< 2.532);
  - campo `inicio_jogador { x, y }`.
- `charneca_das_lanternas.json`: os 54 obstáculos e `inicio_jogador` (585, 1.266).
- `armas.json` e `inimigos.json`: saem as duas pendências "se os obstáculos bloqueiam" (§2).
- ADR da F-002 (ADR-0004):
  - as decisões técnicas de implementação;
  - o `__GAME_DEBUG__` acrescido;
  - o gancho `entrada.roteiro`;
  - a ordem `Image` → `SpriteGPULayer`.
