# Style card da arte (F-011, etapa 1)

> Fonte: `design/arte/plano-de-arte.md` (decidido pelo usuário em 2026-10-12), doc 13 §1 e a referência aprovada `aldric24-referencia.png`. Toda a arte é escrita em código: grades de caracteres da paleta (`src/arte/sprites/`) e procedurais (`src/arte/procedural.ts`). As amostras e a checagem automática leem os mesmos arquivos que o jogo. **Aguarda a aprovação do usuário antes da produção (etapa 2).**

## 0. Decisões para aprovar

| # | Decisão | Por quê |
|---|---|---|
| E1 | **Uma densidade de pixel só:** 1 px de arte = 2 pt (4 px no canvas de 2×), sem escala fracionária. | Pixels de tamanhos diferentes no mesmo quadro ("mixels") são o erro de consistência mais visível; 2 pt casa com os tamanhos atuais (jogador 48 pt, massa 32 pt, médios 48 pt). |
| E2 | **Grade fina de 1 pt só para efeitos** (arco do golpe, faíscas, anéis, rastros, brilho). | O plano pede "efeitos em resolução livre" e muito detalhe nos efeitos e nas armas; meio pixel dá esse detalhe sem misturar densidades nos corpos. |
| E3 | **Paleta de 32 cores** (§2) que contém todas as cores que o jogo já usa (HUD, Cinzas, Alma, baús). | Nada muda de cor na HUD nem nos testes de pixel; a arte só acrescenta as rampas que faltavam. |
| E4 | **Luz de cima, fria**, e a luz quente só da brasa do Aldric (§3). | Com a luz de cima, espelhar o sprite (virar para a esquerda) não inverte a luz: metade dos desenhos. |
| E5 | **Aldric de frente, espelhado para a esquerda; o corpo não gira.** A direção exata (o que o triângulo girando mostra hoje) passa para um marcador de brasa no chão, a 20 pt dos pés, nas 8 direções. | Sprite girado em ângulo livre perde a grade; a direção continua legível para mirar o golpe e a esquiva. |
| E6 | **Nada gira em ângulo livre:** as direções são desenhadas em 0°, 22,5°, 45° e 67,5° e giradas só em múltiplos de 90° (16 direções). | Giro de 90° com filtro NEAREST é exato; ângulo livre borra ou serrilha o pixel. |
| E7 | **Atlas único de 1024 × 1024 com filtro NEAREST** (4 MB de GPU); a arte entra a 1 texel por px de arte, as formas de 2× atuais (joystick) continuam no mesmo atlas. | Um atlas mantém o lote único do iPhone (ADR-0002 §11); NEAREST deixa o pixel nítido em qualquer escala inteira. |
| E8 | **Texto continua na fonte do sistema** nesta feature; os números de dano seguem na fonte pixel 5 × 7 da F-004 (célula de 1,5 pt, exceção documentada). A fonte pixel própria da HUD (doc 13 §1.7), com acentos, fica para uma feature de UI. | Trocar o texto por bitmap mexe no `t(id)`, no lint de textos e nos ganchos de debug que leem o texto; a arte da HUD (molduras, barras, ícones, botões) não depende disso. |

## 1. Pesquisa: referências e métodos

**Leitura em tela pequena.** Silhueta primeiro: uma silhueta reconhecível em 16 × 16 vale mais que um 32 × 32 detalhado e ilegível ([bugnet](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly), [sprite-ai](https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art)). Conferir sempre na escala real em que o sprite aparece; 4 a 8 cores por sprite pequeno. Para o gênero, o que decide a leitura é o contraste de **valor** (conferir a tela em tons de cinza), não o de matiz, e o chão não pode ter a cor dos pickups nem da UI ([itch.io: comentários de jogos do gênero](https://itch.io/post/13269305), [itch.io](https://itch.io/post/11934270)). Inimigos de mesma aparência em todo mapa ajudam a reconhecer a ameaça na hora ([relato sobre Vampire Survivors](https://reddit.sentinel-team.org/posts/1skdn4m/snapshots/2026-04-13T15%3A14%3A56.45584Z)).

**Contorno.** Contorno total de 1 px escuro, contorno seletivo (escuro só onde cairia a sombra) ou nenhum ([bugnet](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly)). Aqui o contorno total vence: na horda de 300 os corpos se sobrepõem, e o contorno escuro separa um do outro; por dentro, as linhas são do tom escuro do próprio material (seletivo).

**Consistência.** Paleta mestre de rampas, com deslocamento de matiz ao longo da rampa (10° a 20° por passo), e as mesmas cores de sombra e de luz em todo o conjunto ([Slynyrd, Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes), [Aseprite community](https://community.aseprite.org/t/how-do-i-make-cohesive-color-palettes-on-aseprite/7983)); luz principal quente com ambiente frio é o par comum. Ferramentas que geram rampas por código existem ([PalettePainter](https://github.com/chickensoft-games/PalettePainter)); aqui a paleta é fixa no código e a checagem é automática (§7).

**Animação com poucos quadros.** Andar em 4 quadros (ou 1-2-3-4-3-2) é o mínimo legível em sprite pequeno ([itch.io: walk cycle](https://itch.io/blog/526535/pixel-art-walk-cycle-animation), [OpenGameArt: modelo de andar](https://opengameart.org/content/walk-animation-template)).

**Efeitos.** Em pixel art não há borrão de movimento, só quadros: o "smear" (1 a 2 quadros esticados entre duas poses fortes) comunica velocidade e direção ([Prolific: smear frames](https://prolificstudio.co/blog/smear-frames/)); congelar 2 a 4 quadros (a 60 fps) num golpe leve e 6 a 10 num pesado dá peso, e efeito afinado para quadro parado costuma falhar no jogo em movimento ([gamineai](https://gamineai.com/blog/pixel-art-combat-fx-hitstop-smear-frames-impact-timing-2026)). Brilho e degradê em pixel art: faixas quantizadas e dither ordenado (Bayer 4 × 4) na fronteira das faixas, em vez de gradiente liso ([GameDev.net: filtro de paleta](https://gamedev.net/shaderlab/39-pixel-art-palette-filter/), [Godot Shaders: posterização e dither](https://godotshaders.com/shader/outline-posterization-color-palette-and-dithering/)). O congelamento de quadro (hitstop) mexeria no relógio da simulação e fica fora desta feature (só apresentação).

**Produção por código.** Grade de caracteres por sprite (como a referência), contorno gerado por código nos procedurais, rotações pré-desenhadas, morte e acerto derivados de qualquer sprite por função (§6). Isso dá consistência por construção: a mesma função desenha o contorno de todas as facas e cristais, e a mesma função vira cinza todos os inimigos.

## 2. Paleta (32 cores, `src/arte/paleta.ts`)

| # | Chave | Hex | Nome | Uso |
|---|---|---|---|---|
| 0 | K | #0b0e14 | preto-pedra | contorno de tudo; olhos fundos; fundo dos painéis |
| 1 | F | #1a1f2b | fundo | chão |
| 2 | D | #2b3340 | ferro escuro | sombra do ferro; face de baixo das rochas; hábito da Noviça |
| 3 | M | #4a5466 | ferro | armadura; tampo das rochas |
| 4 | L | #8a93a6 | ferro claro | luz do ferro; borda de cima das rochas |
| 5 | H | #c9d0dc | brilho frio | 1 a 3 px de brilho por sprite; quadro de acerto |
| 6 | W | #ffffff | branco puro | **reservado:** telegrafo, ataques e projéteis brancos, flash do aparo |
| 7 | c | #4a1414 | vinho escuro | sombra da capa |
| 8 | C | #7a1f1f | vermelho escuro | capa do Aldric; fim do rastro do golpe |
| 9 | B | #e2652b | laranja queimado | brasa; 1 px de lanterna dos Ocos |
| 10 | A | #ffb347 | âmbar | brasa, olhos do Aldric, luz |
| 11 | a | #ffd699 | brasa clara | arco do golpe; cura na barra de HP |
| 12 | Y | #fff1b0 | núcleo da brasa | coração da brasa; borda do arco; faíscas |
| 13 | G | #5a3a22 | couro | cabos, cinto, baú comum |
| 14 | Z | #b08d57 | bronze | guardas, cintas, lanterna dos Ocos |
| 15 | O | #e8dcc4 | osso | tabardo, touca da Noviça; bordas da HUD e textos |
| 16 | S | #dfe8ea | sal | lâmina, Facas e Círculo de Sal |
| 17 | s | #96a5ac | sal na sombra | sombra do sal e do osso |
| 18 | e | #2f3a24 | musgo escuro | sombra e dobras dos Ocos; tufos do chão |
| 19 | E | #76884c | musgo | trapos dos Ocos; musgo das rochas |
| 20 | p | #5f645c | pele cinza escura | sombra da pele dos Ocos |
| 21 | P | #9fa39a | pele cinza | pele dos Ocos |
| 22 | n | #4b5472 | sal azulado escuro | debrum do véu das Sepultadoras |
| 23 | N | #8994b4 | sal azulado | olhos e frasco da Noviça |
| 24 | b | #5aa9e6 | Cinza azul | Cinza < 5; barra de XP |
| 25 | g | #6cc57c | Cinza verde | Cinza de 5 a 24 |
| 26 | r | #c8324b | Cinza vermelha | Cinza ≥ 25 |
| 27 | V | #b18cff | Alma | Alma, mancha |
| 28 | v | #9e3a52 | retardo do HP | perda de HP atrasada, vinheta |
| 29 | y | #ffd166 | amarelo do crítico | número crítico, atordoado, cintas do baú dourado |
| 30 | o | #a8841f | ouro velho | baú dourado |
| 31 | R | #ff2a2a | vermelho de ataque | **reservado:** ataques vermelhos (não aparáveis) |

Rampas com deslocamento de matiz: o frio vai do preto-azulado ao cinza-azul (K → F → D → M → L → H); a brasa vai do vinho ao amarelo (c → C → B → A → a → Y); o musgo e a pele dos Ocos puxam para o verde-oliva.

## 3. Luz e cor

- **Luz de cima, fria.** As superfícies de cima ganham o tom claro do material, as de baixo o escuro; nunca luz lateral (o espelho a inverteria). Cada material tem 3 tons (sombra, base, luz) e no máximo 1 a 3 px de brilho H por sprite.
- **Luz quente só da brasa do Aldric** (doc 13 §1.4): um brilho aditivo de raio 5 corpos (160 pt), em 4 faixas quantizadas (A e B com alfa de 18 a 110, de 255; eram 12 a 70 até a revisão da etapa 3) e dither de Bayer na fronteira, logo acima do chão (§11). Não se pinta a luz quente nos inimigos.
- **O jogador é a coisa mais quente da tela.** Inimigos usam no máximo 1 px quente (B, a lanterna do Oco); nenhum inimigo usa A, a nem Y.
- **W e R são dos ataques** (doc 13 §1.3): nenhum sprite os pinta. O quadro de acerto usa H, não W.
- **Valor antes de matiz:** em tons de cinza, o miolo de todo corpo tem valor acima do chão (F) e o contorno abaixo dele. O chão fica em F com pedriscos D e tufos e esparsos, sem nada que lembre pickup.
- **Facções pela cor** (doc 13 §1.3): Ocos em musgo e pele cinza; Sepultadoras em preto, osso e sal azulado.

## 4. Escala de cada coisa (1 px de arte = 2 pt; grade fina = 1 pt)

| Coisa | Arte (px) | Tela (pt) | Quadros |
|---|---|---|---|
| Aldric | 24 × 24 | 48 × 48 | parado 2, andar 4, esquiva 3, aparo 2, Frasco 2, Apagar 4 (+3 da cinza), acerto 1 |
| Massa: Oco das Lanternas | 16 × 16 | 32 × 32 | andar 2 (o doc 13 pede 4; com a horda fora de sincronia, 2 bastam em 16 px), acerto 1, morrer 3 (cinza) |
| Médios: Oco Grande, Noviça de Sal | 24 × 24 | 48 × 48 | andar 2, telegrafo 2 ("inspirar"), ataque 2, acerto 1, morrer 3 (cinza) |
| Faca de Sal | 13 × 13 (lâmina ≈ 9) | 26 × 26 (≈ 18 de lâmina) | 4 desenhos × giros de 90° = 16 direções |
| Golpe da Espada / Lâmina do Juramento Eterno | grade fina, raio 46 | raio 46 | 3 (0,05 s cada) |
| Círculo de Sal | grade fina, anel de 2 pt | raio do alcance | pulso 3 + cristais girando |
| Projétil da Noviça | grade fina: disco 16 + anel 24 | 16 / 24 | 1 (W, sem contorno) |
| Telegrafo do braço | grade fina, setor de 120° | alcance | alfa crescente (W) |
| Cinzas (azul, verde, vermelha) | 7 × 9, 9 × 11, 11 × 13 com contorno | 14 × 18, 18 × 22, 22 × 26 | cintila 2 |
| Alma | 7 × 8 | 14 × 16 | chama 2 |
| Baú comum / dourado | 16 × 11 | 32 × 22 | 1 |
| Ícones (armas, passivas) | 14 × 14 | 28 no HUD, 56 no modal | 1 |
| Botões Aparo e Frasco | círculo de 36 px com ícone | 72 | aceso / apagado |
| Joystick | círculo de 60 px | 120 | 1 |
| Rochas (obstáculos) | procedurais pelo raio da simulação | o raio atual | 1 |
| Chão | ladrilho 16 × 16 (6 variantes) | 32 × 32 | 1 |
| Brilho da brasa | grade fina, raio 160 | raio 160 | pulso lento |
| Números de dano | fonte 5 × 7 da F-004 | célula de 1,5 pt (exceção, E8) | — |

Os tamanhos da simulação (raio de colisão, `tamanho_px` em `inimigos.json`) não mudam: o sprite cabe no corpo que já existe.

## 5. Contorno e forma

- **Contorno total de 1 px em K, fechado,** em todo corpo, pickup, ícone e projétil do jogador. Fechado quer dizer: nenhum pixel colorido encosta no vazio sem um K entre eles (4-conexo). Checado por teste (§7).
- **Linhas internas seletivas:** dobras e divisões no tom escuro do próprio material (e no musgo, p na pele, c na capa, D no ferro); K por dentro só onde separa partes grandes (braço do tronco, rosto do capuz, pernas).
- **Sem pontilhado de ruído em sprite:** textura por dobras (linhas de 1 px na direção do tecido) e por blocos de tom. Dither (Bayer 4 × 4) só em degradê de efeito, de luz e na transição das rochas.
- **Ataque inimigo não tem contorno:** branco puro (W) ou vermelho (R) liso. A falta de contorno é o sinal de "isto fere"; o projétil do jogador sempre tem contorno.
- **Silhuetas distintas por papel:** Aldric vertical com espada ao lado e capa; massa curvada de capuz; Oco Grande largo, com braço-clava; Noviça estreita, em triângulo.

## 6. Efeitos e armas (procedurais)

- **Cor pelo dono:** efeitos do jogador nas cores da brasa (Y → a → A → B → C, esfriando) ou do sal (S, s, H); inimigo em W (aparável) e R (não aparável), N para a Noviça.
- **Golpe da Espada:** arco de 120° na grade fina, raio 46 pt; borda externa Y, para dentro a, A, B e C; o rastro esfria do fim do arco para o começo; 3 quadros (varredura de 55%, arco cheio, só a borda) e 4 a 8 faíscas Y/A de 1 pt na ponta. A **Lâmina do Juramento Eterno** usa o mesmo arco mais grosso, com brasas que sobem.
- **Facas de Sal:** 16 direções (E6), rastro de 2 a 3 px S/s na grade fina; ao acertar, 3 lascas de sal (S/H) saltam.
- **Círculo de Sal:** anel S de 2 pt com lascas girando na borda; no pulso, uma onda s que se apaga.
- **Acerto no inimigo:** 1 quadro com o miolo em H (contorno mantido) e faíscas na cor da arma.
- **Morte:** qualquer sprite vira cinza em 3 quadros pela mesma função (doc 13 §1.5): corpo em tons de cinza; um terço some e afunda 1 px; sobra um punhado de cinza; mais 3 a 5 grãos (L/M) caindo.
- **Aparo:** o flash W atual (RE) mais um anel de faíscas Y. **Frasco:** brasas (a/Y) subindo do Aldric. **Apagar:** o Aldric vira cinza e as brasas sobem e somem.
- **Pickups vivos:** Cinzas cintilam (1 px H) e a Alma oscila em 2 quadros; a mancha mantém o anel de brasa pulsando e a Alma lilás (MC9).
- **Brilho da brasa:** E4; pulsa devagar (±10% de raio) no ritmo do parado do Aldric.
- **Durações:** faísca 4 a 8 quadros a 60 fps; golpe 0,15 s; smear 1 a 2 quadros.

## 7. Animação e alinhamento

- Tempo base de 8 quadros por segundo (andar); parado a 2 por segundo; os quadros de esquiva, aparo e Frasco seguem o tempo da simulação (o render escolhe o quadro pela fase, sem relógio próprio).
- Todos os quadros de um personagem têm o mesmo tamanho e a mesma linha dos pés (a última linha cheia), para não tremer na troca.
- A horda não anda em sincronia: cada inimigo começa o ciclo num quadro derivado do seu índice.
- Nada de giro do corpo; espelho horizontal para a esquerda.

## 8. Checagem automática e revisão

`tests/arte/arte.test.ts` (Vitest) confere em cada sprite e procedural:
- paleta de 32 cores, chaves únicas e as cores fixas do doc 13;
- só chaves da paleta e nenhuma reservada (W, R) nos sprites;
- tamanho exigido pela escala (§4);
- contorno de 1 px em K fechado (4-conexo, borda da imagem incluída);
- no máximo 1 px quente por inimigo;
- efeitos e quadros derivados (acerto, cinza) dentro da paleta; a faca de 0° simétrica.

Na produção entram também: mesma linha dos pés em todos os quadros, e a folha de cada categoria lado a lado em escala real (390 × 844) para o revisor independente (etapa 3).

## 9. Amostras

Geradas por `node scripts/arte/rodar.mjs amostras` a partir das grades e procedurais do jogo:

1. `amostra-1-paleta-e-aldric.png`: as 32 cores com o índice; o Aldric a 12× sem luz, com a luz da brasa e com o golpe; à direita, em escala real (4 px de canvas por px de arte, o jogo no canvas de 2×) e a 6× (o iPhone de 3×).
2. `amostra-2-modelos.png`: um modelo de cada categoria na mesma escala de pixel (8×; a grade fina a 4×): Aldric; Oco das Lanternas, o quadro de acerto e os 3 da cinza; Oco Grande; Noviça; Faca de Sal em 6 direções; as 3 Cinzas; Alma; os baús; o ícone da espada; 3 rochas e 4 ladrilhos de chão; os 3 quadros do golpe e o telegrafo; o projétil da Noviça, o anel do Círculo de Sal e o brilho.
3. `amostra-3-cena-390x844.png`: uma cena montada em escala real de 390 × 844 pt (780 × 1688 px, o canvas do jogo): 90 Ocos, o Oco Grande telegrafando, a Noviça e o projétil, o Aldric com a luz e o golpe, facas, faíscas, pickups, rochas, chão e uma HUD provisória. Serve para julgar leitura e escala, não é a HUD final.

`node scripts/arte/rodar.mjs previa <saida.png> [filtro]` desenha qualquer grade a 12× para o trabalho do dia a dia.

## 10. Pipeline da produção (etapa 2)

- Grades e procedurais em `src/arte/` (sem Phaser, sem DOM); o Boot rasteriza tudo num `CanvasTexture` de 1024 × 1024 com `putImageData` e registra as molduras, como o atlas de formas de hoje (`src/cenas/render/atlas.ts`).
- O render troca a moldura e o tint branco pela moldura do quadro certo; a horda (SpriteGPULayer) continua num lote só.
- Só apresentação: nada em `src/logica`, no layout do estado nem nos hashes; textos só por `t(id)`.

## 11. Notas da produção (etapa 2)

O que a produção detalhou ou mudou em relação ao card aprovado, e por quê:

- **Círculo de Sal e pulso em grãos de sal**, não num anel liso: o raio da aura e do pulso varia sem parar (nível, passivas, o pulso crescendo 96 pt), e um anel de pixel por raio não cabe no atlas. São cristais de 3 e 2 px com contorno (10 e 8 pt), um a cada 10 pt da circunferência (até 64 por anel), girando devagar, numa camada própria abaixo das facas e dos golpes.
- **Brilho do telegrafo nos médios (RE4)**: o corpo troca para o quadro de "inspirar" e uma silhueta branca do mesmo quadro fica por cima com alfa 1 − blend. O modo de tint SCREEN não serve: no SpriteGPULayer do Phaser 4.2.1 o modo é multiplicado por 255 no shader sem ter sido dividido antes.
- **NEAREST depois do `refresh()`**: o Phaser reenvia o canvas com LINEAR a cada refresh (antialias ligado). Com o filtro certo, os modos GPU e Image saem idênticos pixel a pixel.
- **Inimigos olham para o lado do Aldric** (a horda persegue): a regra depende só do estado do passo, então a imagem pausada não depende de quantos quadros o render desenhou.
- **Oco Grande Coroado** (elite que a F-008 fez nascer nesta branch): 32 × 32 px (64 pt), o Oco Grande maior, de coroa de bronze, com andar, telegrafo e ataque. A cor de identidade é a dos elites da F-008 (`COR_DOS_ELITES`); o molde provisório dela continua valendo só para elite sem arte.
- **Golpe e estocada em escala livre pelo alcance** (raio ÷ 64 pt; comprimento ÷ 96 pt): o único lugar com escala não inteira, num efeito que dura 8 passos; o ângulo segue a regra dos 16 passos.
- **Partículas**: pool de 256 pelo passo (sem alocar e sem reciclar), pontos de 1 e 2 pt tingidos na cor exata da paleta: 3 faíscas Y/A por acerto da Espada e da Lâmina, 2 lascas S/H das Facas, 1 grão do Círculo, 4 grãos de cinza por morte, 10 faíscas em anel no aparo e uma brasa subindo a cada 5 passos do Frasco (a cada 2 no Apagar).
- **Marcadores de status**: a estrela do atordoado a 2 pt por px; o cristal do Sal na grade fina (centenas de inimigos salgados ao mesmo tempo não podem cobrir os rostos). Os dois 12 pt acima do centro do corpo.
- **HUD em células de 2 pt**: Graphics desenha a arte, o disco, o anel e o triângulo na grade (`src/cenas/pixel.ts`); ícones a 2 pt no HUD (28 pt) e a 4 pt no modal (56 pt dentro dos 64); o traço dos anéis dos botões vira 4 pt (os 3 pt arredondados para 2 células); o joystick usa máscaras de pixel do atlas, tingidas. O texto continua na fonte do sistema (E8).
- **Tela de Acender**: o Aldric a 4 pt por px (96 pt) no lugar do logotipo, respirando, com a luz da brasa: a única exceção de escala fora dos efeitos, por ser uma ilustração de título.
- **Chão**: TileSprite com a textura de 64 × 64 px (16 ladrilhos), a 2 pt por px; na costura do mapa (1.170 pt, não múltiplo de 128) o padrão salta uma vez, sem efeito na leitura.
- **Animações**: a massa anda em 2 quadros, os médios em 2 mais telegrafo e ataque; o Aldric respira, anda em 4, esquiva (agachado, rolando na capa, agachado) com 2 rastros, apara, bebe o Frasco e ajoelha antes de virar cinza; o acerto dura 3 passos.
