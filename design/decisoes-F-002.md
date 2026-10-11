# Decisões da F-002 "Movimento e mapa"

- **Status:** decidido em 2026-10-11, antes de qualquer código da F-002, por delegação do usuário ("Deixo a decisão por você"). Nada da F-002 foi implementado.
- **Como foi feito:** um workflow com 4 pesquisadores (obstáculos e colisão, joystick e entrada, câmera e mapa, movimento e estado), cada um com um verificador cético que conferiu as citações e procurou a resposta em todas as fontes, e um crítico de completude. Das 71 perguntas levantadas, 17 os documentos já respondem (§1). As outras estão decididas abaixo.
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md`;
  - o brief aprovado, com as decisões Q-xx;
  - o GDD;
  - os ADR-0002 e ADR-0003;
  - o `feature_list.json`.
- **Convenção:** **[delegada]** marca decisão de design ou número que nenhum documento dá. Ela vale até você dizer o contrário. As outras decisões vêm de documento ou são só técnicas.
- **Pendências da F-002 no `feature_list.json`:**
  - "tamanho e forma dos obstáculos, hitboxes, contorno, bloqueio de projéteis": resolvida pelas §2 e §3;
  - "Cores extras da paleta (Q-27)": já estava decidida pela Q-27; o uso de cada cor está na §5.

## 0. O que foi decidido por delegação (para vetar de relance)

| # | Decisão | Valor |
|---|---|---|
| O1 | Forma dos obstáculos | só círculos, sem rotação |
| O2 | Tamanho dos obstáculos | diâmetro de 64, 80 ou 96 px (2 a 3 corpos) |
| O3 | Quantidade | 54 no mapa, de 4 a 8 por tela; a tela central (início) com 4 |
| O4 | Regras da disposição | folga de 64 px entre obstáculos; zona livre de 160 px em volta do início; nenhum cruza a costura do toro |
| O5 | Cor dos obstáculos | #2b3340 sólido, sem contorno |
| O6 | Bloqueio de projéteis | no MVP, nenhum projétil nem área é bloqueado por obstáculo |
| O7 | Arena de marco | desliga todo obstáculo que toca o disco de 224 px; eles ficam desligados até o fim da Vigília |
| H1 | Hitboxes | círculo: jogador 16 px, massa 16 px, médio 24 px de raio; chefe com caixa (medidas na F-009) |
| H2 | Inimigos e jogador | os inimigos são sólidos para o jogador; a esquiva atravessa a horda (F-003/F-006) |
| J1 | Área do joystick | x de 0 a 234 pt (60% da largura), y de 422 pt até a borda de cima do inset inferior |
| J2 | Dono do joystick | o 1º dedo que começa na área, até soltar; "reposiciona a cada novo toque" = cada toque novo depois de soltar |
| J3 | Curva | analógica: m = (d/60 − 0,15)/0,85, entre 0 e 1; velocidade = 144 px/s × m |
| J4 | Visual do joystick | base com fundo #0b0e14 a 35% e anel de 2 pt em osso a 60%, raio 60 pt; pino em osso a 60%, raio 24 pt; somem ao soltar |
| J5 | Prompt "Deslize para mover" | texto osso de 18 pt num painel #0b0e14 a 60% com borda de 2 pt em osso, no centro da área do joystick; fade de 200 ms |
| J6 | O que é "mover" | qualquer passo com vetor fora da zona morta, desde 0:00 |
| M1 | Partida e parada | instantâneas, sem inércia |
| M2 | Início do jogador | (585, 1.266), no campo novo `inicio_jogador` da região |
| M3 | Direção do triângulo | gira para a última direção não nula; no início, aponta para cima |
| C1 | Piso na F-002 | liso (#1a1f2b); a referência de movimento são os obstáculos |
| T1 | Capacidade da entrada | 5 dedos e anel de 64 eventos por frame |
| E1 | Evidência | vídeo `movimento.webm` de 390 × 844 e 3 PNG `movimento-N-390x844.png` |

## 1. O que os documentos já respondem

- **Câmera** rígida, centrada na posição interpolada do jogador pelo delta toroidal, sem atraso nem limites. Fontes: B §3.2 ("Câmera centrada no jogador"), ADR-0002 §3 e doc 07 §1 ("nunca encontra borda"). Arredondar a posição para 0,5 pt (1 px do canvas) é detalhe técnico.
- **Jogador no centro do canvas**, em (195, 422) pt. A vista de ≈ 12 × 26 corpos de B §3.2 é o canvas inteiro. A safe-area ancora o HUD e os alvos, não a câmera do mundo.
- **Unidades em pt lógicos (390 × 844)**: o raio de 60 pt, a zona morta de 9 pt e os 400 pt/s (ADR-0002 §11). Um toque no letterbox não conta, porque os listeners estão no canvas. O encolhimento na aba do Safari já está registrado como risco.
- **Vetor limitado a um círculo (|v| ≤ 1):** é exigência de B §3.3, que dá a velocidade como módulo ("1,0 = 4,5 corpos/s (144 px/s)"). Teste: 60 passos na diagonal = 144 px (±1%). No teclado do build de debug, a diagonal usa 1/√2 como literal.
- **Zona morta radial**, sobre o módulo do vetor. É o que o F-002.1 descreve ("vetor nulo abaixo de 0,15 × 60 pt").
- **Grade espacial de 64 px só na F-003** (B §4). Na F-002, o jogador testa a lista inteira de obstáculos (no máximo 72), fora da grade dinâmica (ADR-0002 §6).
- **A simulação só lê `ComandosDoPasso`.** A zona morta e o raio ficam no TradutorDeGestos, fora da simulação (ADR-0002 §12).
- **"Direção do movimento" das armas = intenção (o vetor do joystick):** ADR-0002 §7. A mesma leitura vale para "parado" (vetor nulo depois da zona morta), no viés do anel de spawn (Q-07) e no prompt.
- **Destrutíveis, visão e IA:** os obstáculos não têm HP (Q-00; o estado só tem o bit `ativo`, ADR-0002 §6) e não bloqueiam visão, escolha de alvo nem decisão de IA (nenhuma regra em vigor pede linha de visão).
- **HUD da Vigília na F-002:** nenhum. Cada elemento entra com a feature que ele mostra (brief §5.12): a pausa vem na F-004 (Q-25) e a Hora na F-008. O momento do prompt se confere por `__GAME_DEBUG__.relogio`.
- **Cores de UI:** osso #e8dcc4 sobre fundo escuro, com painel "pedra e osso" (borda de 2 px em osso, fundo translúcido escuro). Fontes: doc 11 §1 e doc 13 §1.3 e §1.7. Osso também vale para os números de dano (Q-27).
- **Corrida, joystick fixo e som de toque: fora.** A corrida está fora (B §3.4). O joystick fixo é opção da tela de Opções, que não está em B §2 (Q-00). O áudio do MVP é só para eventos críticos (B §2).
- **Persistência do "tutorial cumprido":** o meta guarda os tutoriais vistos (Q-26; ADR-0002 §10) e entra na Vigília como parâmetro (ADR-0002 §3). O meta é gravado pela primeira vez na F-007 e versionado na F-010.

## 2. Obstáculos

- **Forma: só círculos alinhados, sem rotação. [delegada]**
  - Mantém o formato aprovado `{ x, y, forma, tamanho }` (ADR-0002 §8), com `tamanho_px` = diâmetro, sem emendar ADR.
  - A colisão e o deslize ficam no par círculo × círculo, só com `Math.sqrt` (ADR-0002 §5).
  - Sem quinas, a horda não prende atrás de um canto (orçamento de B §3.13).
  - O doc 07 §1 cita "árvores, pilares, túmulos": os círculos representam as árvores retorcidas e os pilares (doc 01 §5.1). Quando chegarem os sprites, depois da F-010, um túmulo pode ter sprite retangular sobre a mesma área circular.
  - O schema passa a aceitar só `forma: "circulo"` em obstáculos.
- **Tamanho: diâmetro de 64, 80 ou 96 px (2 a 3 corpos), em múltiplos de 16 px (os tiles de B §3.2). [delegada]**
  - O menor (64 px) é maior que o maior corpo que anda pelo mapa (médio de 48 px), para o obstáculo não ser lido como inimigo.
  - O raio mínimo (32 px) é muito maior que o deslocamento por passo: 2,4 px andando e ≈ 3,8 px na esquiva de 2,5 corpos em 21 passos. A colisão discreta não deixa atravessar.
  - **Invariante para as features seguintes:** nenhum deslocamento por passo passa de 32 px. Esquiva, empurrão do Grito e knockback do Círculo nv7 conferem isso nos seus testes.
- **Quantidade: 54 no mapa, de 4 a 8 por tela, com densidades diferentes entre as 9 telas; a tela central, onde a Vigília começa, tem 4. [delegada]**
  - É a faixa de B §3.2.
  - Com o wrap, o jogador cruza as mesmas telas muitas vezes, e densidades diferentes ajudam a saber onde se está.
  - A tela de início aberta dá espaço ao prompt e aos testes de arrasto e de velocidade.
- **Disposição:** fixa no JSON da Charneca (Q-04), escrita na F-002 e travada por estas regras no Vitest:
  1. `(x, y)` é o centro do obstáculo. A tela é (⌊x/390⌋, ⌊y/844⌋), e a contagem por tela (F-002.6) usa o centro.
  2. 0 ≤ x < 1.170 e 0 ≤ y < 2.532 (o schema ganha os máximos).
  3. Nenhum obstáculo cruza a costura do toro: o centro fica a pelo menos um raio de x = 0, x = 1.170, y = 0 e y = 2.532. Pode cruzar a divisa entre duas telas.
  4. Folga mínima de 64 px (2 corpos) entre as bordas de dois obstáculos, para um médio de 48 px passar e cada obstáculo ficar isolado e convexo. **[delegada]**
  5. Zona livre de 160 px (5 corpos) entre o ponto de início e a borda de qualquer obstáculo. Cobre os 144 px do teste de velocidade (F-002.5). **[delegada]**
  - A F-002 entrega também uma imagem do mapa 3 × 3 com os obstáculos, para revisão, em `production/evidencias/F-002/`.
- **Tipo na ficção:** sem campo `tipo` no MVP (o formato aprovado não tem). Nenhum obstáculo se chama "lanterna": as 7 lanternas são o objeto de um segredo fora do MVP (doc 07 §2; B §2).
- **Cor: #2b3340 sólido, sem contorno. [delegada]**
  - Fica nos "azuis-pretos e cinzas frios" do fundo (doc 13 §1.3) e lê como cenário, não como ameaça.
  - Não usa branco (reservado ao aparo e ao telegrafo) nem #ff2a2a, e a brasa fica só para o jogador.
  - Um contorno de outra cor exigiria dois membros por obstáculo no atlas tingido (ADR-0002 §11).
  - Quando as cores dos inimigos forem escolhidas (F-003), elas evitam #2b3340.
- **Desenho:** os obstáculos ficam sob as entidades, na camada do mundo (ADR-0002 §11).
- **Bloqueio de projéteis e áreas: no MVP, nada é bloqueado por obstáculo:** Facas, projétil da Noviça, onda da Lâmina, arco da Espada, aura do Círculo, telegrafos, Grito e ataques do Lanterneiro. **[delegada]**
  - O doc 07 §1 diz que "projéteis do jogador passam ou não dependendo da arma (projéteis de Vharos atravessam)", ou seja, permite que a regra varie por arma. No MVP, as quatro armas são das que atravessam.
  - As Facas miram o "mais próximo" sem linha de visão (ADR-0002 §7). Bloqueá-las desperdiçaria facas e o Contra-ataque redirecionado ao inimigo aparado.
  - O projétil da Noviça é o tutorial do aparo (doc 11 §4), e o critério do marco é o aparo gostoso (B §1).
  - A silhueta do telegrafo no chão (B §3.4) nunca mente.
  - O campo por arma (`atravessa_obstaculos`) entra quando existir uma arma bloqueada, fora do MVP.
  - A F-002 retira as duas pendências que apontam para ela em `armas.json` (Facas) e `inimigos.json` (Noviça).
- **Arena de marco (F-008/F-009): desliga todo obstáculo que toca o disco de 224 px; eles ficam desligados até o fim da Vigília (o bit `ativo` só vai de 1 para 0). [delegada]**
  - É a leitura de "obstáculos somem" (B §3.11; doc 07 §4).
  - Nenhum obstáculo fica pela metade dentro da névoa, e a Fogueira e os baús, que nascem na antiga arena, nunca ficam presos.
  - Custo: até ≈ 16% do mapa fica sem obstáculo depois dos 3 marcos. A contagem do F-002.6 é sobre o JSON e continua valendo.
  - A borda da arena contém também o chefe, para o corpo dele não tocar um obstáculo do lado de fora (F-009).
- **Spawn em cima de obstáculo (F-003):** se o ponto sorteado no anel cair num obstáculo, testam-se, em ordem fixa, as direções seguintes da tabela literal até achar um ponto livre, sem sortear de novo. Isso mantém o anel de 468 a 624 px e o "sempre fora da vista" (Q-06). Empurrar para fora pode trazer o inimigo para dentro da vista perto das diagonais.
- **Fogueira, baús e pickups não colidem com obstáculos.** Os pickups caem onde o inimigo morreu, e ele nunca está dentro de um obstáculo. A direção da Fogueira, a 96 px do jogador, fica para a F-008: a primeira de 8 direções literais cujo disco fica livre.
- **Mancha de Cinzas Perdidas (F-007):** ao Apagar, a posição gravada vai para o ponto livre mais próximo, contando todos os obstáculos do JSON, ativos ou não. Assim ela é sempre alcançável (Q-04), mesmo quando o jogador morre onde havia um obstáculo desligado por uma arena.
- **Impressão da disposição:** o FNV-1a da lista de obstáculos da região vai para uma das palavras reservadas do cabeçalho do estado e entra no hash (ADR-0002 §5; ADR-0003 §3). Na F-008, um save gravado com outra disposição é descartado. Reordenar ou mover obstáculos nunca reaproveita um save, um replay ou um bit `ativo` errado.

## 3. Hitboxes e colisão

- **Forma: círculo para o jogador e para os inimigos; caixa alinhada aos eixos para o chefe. [delegada]** O círculo é o teste mais barato e determinístico no toro. O Lanterneiro é um retângulo alto (4 corpos, doc 06 §2.2), que um círculo cobriria mal; como ele só luta na arena sem obstáculos, a caixa só entra em acerto e contato (F-009).
- **Raios: jogador 16 px, massa 16 px, médio 24 px. [delegada]**
  - Os sprites de B §3.2 são 48 × 48 (jogador), 32 × 32 (massa) e 48 × 48 (médio). As áreas acompanham a forma visível:
    - o círculo inscrito no quadrado do médio tem 24 px;
    - o da massa tem 16 px;
    - o do triângulo de 48 px do jogador tem ≈ 15 px, e 16 px é 1 corpo de diâmetro.
  - Um círculo de 24 px no jogador sairia pelos lados do triângulo e daria "acerto no vazio".
  - Coroado: metade do lado que a F-008 escolher. Lanterneiro: caixa do tamanho que a F-009 escolher.
- **Colisão com obstáculos:**
  - em cada passo, `xAnt ← x`; somar o deslocamento; empurrar para fora de cada obstáculo ativo pela menor penetração, ao longo da normal centro a centro, no delta toroidal; normalizar no toro;
  - o resto do movimento fica tangente, e o jogador desliza junto à borda;
  - os obstáculos são percorridos em ordem fixa de índice, com 2 iterações por passo (cantos entre dois obstáculos);
  - centros coincidentes empurram para +x;
  - testes: contra a face, contra a junção de dois obstáculos e cruzando a costura.
- **Os inimigos contornam** (doc 07 §1). B §3.6 diz que o Oco anda "em linha reta até o jogador", e B prevalece. As duas leituras se conciliam: os inimigos andam reto e deslizam na borda pela mesma colisão. Com obstáculos convexos e isolados, o deslize leva o corpo em volta deles. No empate exato (movimento apontado para o centro), o lado sai do sinal do produto vetorial entre a direção ao jogador e o vetor até o centro do obstáculo; zero vai para um lado fixo.
  - A F-002 entrega a função genérica "círculo de raio r contra obstáculos" em `src/logica`, testada com o jogador e com corpos sintéticos de raio 16 e 24 px.
  - Na F-003, os Ocos reais passam a usá-la, com um teste: N corpos em posições sorteadas com seed fixa chegam ao jogador parado em até T passos. Se ele falhar, a reserva é um campo de fluxo numa grade.
- **Tudo é sólido contra obstáculos:** jogador, inimigos, esquiva e empurrões (Grito, knockback). Bater num obstáculo não causa dano: esse sistema não está em B §2.
- **Os inimigos são sólidos para o jogador, e a esquiva atravessa a horda. [delegada]** É a leitura conjunta de "cerco físico" (Q-13) e de "rolar através da horda é permitido" (doc 02 §5.3). Entra na F-003 (separação) e na F-006 (esquiva).

## 4. Joystick e entrada

- **Área que cria o joystick:**
  - o retângulo de x = 0 até 234 pt (60% da largura), e de y = 422 pt (a metade de 844) até a borda de cima do inset inferior;
  - fontes: B §3.5 ("metade inferior"), brief §5.5 e doc 02 §4 ("60% larg.", deixando livres os botões da direita), doc 12 §2.1 ("acima do home indicator");
  - um toque fora dela não move nada;
  - ela entra na tabela de alvos, e o teste de safe-area da F-001.13 a cobre;
  - o Aparo e o Frasco (F-006, F-007) ficam à direita, fora dela;
  - a medida exata da largura é **[delegada]**: é a leitura do diagrama.
- **Base fixa no ponto do toque; passou do raio, o vetor satura** (o pino fica preso na borda). É a leitura literal de B ("aparece onde o polegar toca") e do F-002.1 ("saturado em 1 no raio"). Nenhum número novo. Perto de uma borda, a base fica onde o dedo tocou. Reavaliar no build de iPhone depois da F-006 (Q-29).
- **Curva: analógica, linear depois da zona morta: m = mín(1, máx(0, (d/60 − 0,15)/0,85)). [delegada]**
  - É a leitura mais direta do F-002.1, sem salto na borda da zona morta.
  - A velocidade é 144 px/s × m; o F-002.5 mede com o joystick saturado.
  - O vetor vai para `ComandosDoPasso` como dois Float32 (mx, my), já com a zona morta, a curva e o limite aplicados, para o replay se reproduzir bit a bit.
- **Dono do joystick: o 1º dedo que começa na área, até soltar. [delegada]**
  - Outros dedos na área não mexem no movimento e ficam livres para a pausa de dois dedos (F-004; Q-25 classifica o toque pelo lugar onde começou).
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
  - `ComandosDoPasso` só com o movimento;
  - `entrada.joystick`, `entrada.injetar` e `toquesPerdidos` no `__GAME_DEBUG__`.
- **O que fica para a F-006:** swipe e toque duplo, porque os números ainda estão em aberto. Na F-002, um swipe rápido só move.
- **Capacidade: 5 slots de dedo e anel de 64 eventos por frame. [delegada]** O 6º dedo e o 65º evento são descartados e somados em `toquesPerdidos`. O iPhone costuma relatar até 5 toques; conferir no aparelho (Q-29).
- **Reconciliação:**
  - os slots são conferidos com `e.touches` em todo evento de toque;
  - todos são liberados num `touchcancel` sem toques restantes e em `blur`, `pagehide` e `visibilitychange` (por `addEventListener`, nunca `window.onblur`, ADR-0002 §12);
  - sem tempo limite, porque um dedo parado não gera `touchmove`.
- **Eventos entre passos:** o vetor do joystick é lido uma vez por frame e vale para todos os passos daquele frame. Ações pontuais, como o aparo, vão só no 1º passo (F-006). A divisão por `timeStamp` fica só para a velocidade do swipe, na F-006.
- **Quando a simulação para** (pausa, level up, overlay de paisagem, pausa automática), os slots são liberados e o joystick some; só um toque novo o cria de volta. A regra é implementada em cada feature. Ela não vale no congelamento de 80 ms do aparo e da esquiva perfeita, nem na Fogueira, onde o passo roda.
- **Mouse e teclado só no build de debug** (ADR-0002 §12; ADR-0003 §4):
  - o mouse é um dedo virtual com identificador reservado (`mousedown`, `mousemove` e `mouseup` vão para a mesma fila, com a mesma área, zona morta e raio);
  - WASD e setas dão um vetor de 8 direções com |v| = 1, direto em `ComandosDoPasso`; se o toque estiver ativo, o toque tem prioridade.

## 5. Câmera, mapa, render e cores

- **Piso na F-002: liso, na cor de fundo #1a1f2b. [delegada]**
  - B §3.2 dá tiles de 16 px, mas 1.170 e 2.532 não são múltiplos de 16 (sobram 2 px e 4 px), e um padrão repetido mostraria a costura.
  - Mudar o mapa ou esticar o tile mudaria números de B.
  - A camada de chão do ADR-0002 §11 fica vazia até a arte; os obstáculos dão a referência de movimento.
- **Início do jogador: (585, 1.266), o centro do mapa e da tela central, num campo novo `inicio_jogador { x, y }` do JSON da região. [delegada]**
  - Cada região define o seu, e o teste garante a zona livre (§2).
  - O schema da região ganha o campo.
  - Sortear o início exigiria um fluxo de RNG novo.
- **Jogador:**
  - triângulo isósceles de base e altura de 48 px, na cor brasa #ffb347 (B §1; doc 13 §1.3: o jogador é a coisa mais quente);
  - **gira para a última direção não nula; no início, aponta para cima. [delegada]**;
  - a simulação guarda essa direção como vetor unitário (`dirX`, `dirY`), sem trigonometria; a cena calcula o ângulo;
  - é a mesma proposta que o ADR-0002 §7 levava para a F-004, que fica fechada.
- **Cores:**
  - obstáculos #2b3340;
  - jogador #ffb347;
  - joystick e prompt em osso #e8dcc4 sobre #0b0e14 translúcido;
  - nada usa branco nem #ff2a2a.
- **Render:**
  - o atlas único é gerado no Boot da F-002 (círculo, triângulo, disco e anel; ADR-0002 §11);
  - a interface de render do mundo nasce com a implementação `Image` (o plano B, `?render=image`); o `SpriteGPULayer`, caminho principal do ADR-0002 §15 item 3, entra na F-003, atrás da mesma interface, junto com a horda;
  - na F-002 há no máximo 55 objetos de mundo (1 jogador e 54 obstáculos);
  - o wrap pela cópia mais próxima da câmera é uma função pura, testada (F-002.2) e reaproveitada pela F-003.

## 6. Movimento e estado

- **Partida e parada instantâneas, sem inércia. [delegada]** É a única opção que cumpre o F-002.5 como está (144 px em 60 passos, ±1%; uma rampa de k passos perde ≈ 1,2·k px). Dá a resposta mais direta ao polegar. Se um dia houver inércia, ela entra como dado do Vigilante.
- **Velocidade:** 144 px/s × m = 2,4 px por passo com o joystick saturado (B §3.3). O Sal (F-006) multiplica esse valor. O bônus regional e a névoa ficam fora (Q-28).
- **Estado (VERSAO_LAYOUT 2):**
  - registro do jogador com `x`, `y`, `xAnt`, `yAnt`, `dirX` e `dirY` (Float32) e o estado do prompt de mover (Uint8);
  - no cabeçalho, o flag "tutorial de mover visto", como parâmetro da Vigília (ADR-0002 §3), e a impressão da disposição dos obstáculos (§2);
  - o bit `ativo` dos obstáculos entra com a arena, na F-008, a primeira feature que o muda;
  - as referências fixas `faad4a1f` e `9d08b542` do teste de determinismo são atualizadas junto com a versão;
  - stamina, HP, Frascos e timers entram nas features que os usam (ADR-0003 §3).
- **Testes de determinismo:**
  - passam a rodar um roteiro fixo de `ComandosDoPasso`, com movimento, deslize num obstáculo e cruzamento da costura, em vez de 1.000 passos parado;
  - mantêm 1 contra 5 passos por frame;
  - mantêm Node contra Chromium, com o mesmo roteiro aplicado pelo gancho de debug.

## 7. Prompt "Deslize para mover" (A2.TUTORIAL.01; F-002.8)

- **Onde:**
  - na cena Hud, no centro da área do joystick: x = 117 pt, y = meio caminho entre 422 pt e a borda de cima do inset inferior;
  - sem anel-fantasma: o doc 02 §4 diz que o joystick "nunca reaparece no mesmo lugar", e um anel fixo ensinaria uma posição;
  - o texto vem de `t('A2.TUTORIAL.01')` e aparece em `__GAME_DEBUG__.textoAtivo`.
- **Estilo: texto osso de 18 pt (o tamanho do botão de Acender) num painel "pedra e osso" (#0b0e14 a 60%, borda de 2 pt em osso); fade de entrada e de saída de 200 ms (doc 11 §1: transições ≤ 200 ms). [delegada]**
- **Quando:**
  - o prompt aparece no passo de relógio 600 (0:10; doc 11 §4) se o tutorial ainda não foi cumprido;
  - o tutorial é cumprido no 1º passo com vetor fora da zona morta, desde 0:00 (Q-26: "até o jogador fazer a ação uma vez"). **[delegada]**;
  - quem já se moveu antes de 0:10 não vê o prompt;
  - o gatilho é a intenção (o vetor), então um obstáculo não segura o prompt;
  - com `?tutorial=0`, o flag entra como visto.
- **Persistência:**
  - na F-002, o cumprimento vale dentro da Vigília (parâmetro + estado do prompt), e o F-002.8 confere o "depois de cumprido" nela;
  - a gravação entre Vigílias chega com o primeiro save meta (F-007);
  - até lá, quem não se mexer nos primeiros 10 s vê o prompt em toda Vigília nova.

## 8. Evidência, debug e testes

- **Evidência: os dois formatos de B. [delegada]**
  - Vídeo `production/evidencias/F-002/movimento.webm`, gravado pela Playwright com `recordVideo` de tamanho 390 × 844; sem o tamanho, ela reduz para caber em 800 × 800.
  - 3 PNG `movimento-1-390x844.png`, `movimento-2-390x844.png` e `movimento-3-390x844.png`, cujas dimensões o `verify.sh` já confere.
  - O `feature_list.json` passa a listar os quatro arquivos.
- **Roteiro do vídeo (≈ 15 a 20 s), seed 1, sem `?tutorial=0`:**
  1. levar o relógio a 0:10 e chamar `retomar()`, porque `avancar` deixa a simulação pausada; o prompt aparece;
  2. tocar e arrastar para a direita: o joystick aparece, o prompt some e a câmera segue;
  3. cruzar a costura em x, a 144 px/s a partir de x = 585, em ≈ 4,1 s;
  4. encostar num obstáculo e deslizar;
  5. soltar e tocar em outro ponto: o joystick aparece em outro lugar.
- **`__GAME_DEBUG__`:**
  - o que o ADR-0002 §14 dá: `jogador { x, y }` (do estado da simulação, normalizado no toro), `entrada.joystick { ativo, origemX, origemY }` em pt e `entrada.injetar(tipo, id, x, y, t)`, só no build de debug, com tipos `'inicio'`, `'move'`, `'fim'` e `'cancela'`, x e y em pt e t em ms no relógio do `TouchEvent.timeStamp`, gravando no mesmo anel da camada de toque;
  - acréscimos para os testes: `jogador.dirX/dirY`, `entrada.joystick.vx/vy` (com a zona morta aplicada) e `camera { x, y }`;
  - `entrada.joystick` mantém a última origem com `ativo = false` depois de soltar, para o F-002.4 ler a origem de toques curtos;
  - o F-002.3 e o F-002.4 usam toques reais por CDP, como a F-001.
- **F-002.7:** a tabela de alvos da Vigília tem a área do joystick e, desde já, deixa livre o canto direito dos botões futuros. O teste confere os 72 pt e a safe-area.

## 9. Fica para outras features (com a recomendação registrada)

- **Distância de acerto (F-004):** as áreas de ataque e os projéteis acertam quando tocam a hitbox do alvo; as distâncias de comportamento ("para a 1,5", "mantém 4") e as zonas (Fogueira, Ímã) usam o centro. Isso muda a leitura do teste da aura de B ("acerta a 2 corpos e não a 2,1") e por isso volta à mesa na F-004.
- **Tamanho do Coroado (F-008) e da caixa do Lanterneiro (F-009):** já estão no brief §11.3.
- **Histerese na zona morta:** sem histerese, para não criar número. O polegar parado perto de 9 pt pode alternar entre parado e andando. Reavaliar no build de iPhone (Q-29).
- **Aperto de câmera de 2% no aparo (doc 11 §5):** não está em B. Decidir se entra antes da F-006. A câmera da F-002 não o impede.

## 10. O que a F-002 muda em dados e documentos

- `regiao.schema.json`:
  - obstáculo com `forma: "circulo"` e `tamanho_px` = diâmetro de 64 a 96;
  - máximos de x (< 1.170) e de y (< 2.532);
  - campo `inicio_jogador { x, y }`.
- `charneca_das_lanternas.json`: os 54 obstáculos e `inicio_jogador` (585, 1.266).
- `armas.json` e `inimigos.json`: saem as duas pendências "se os obstáculos bloqueiam" (§2).
- `feature_list.json`: evidências da F-002 (§8) e pendências marcadas como resolvidas por este documento.
- ADR da F-002 (ADR-0004): as decisões técnicas de implementação, o `__GAME_DEBUG__` acrescido e a ordem `Image` → `SpriteGPULayer`.
