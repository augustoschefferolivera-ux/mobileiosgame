# Decisões da F-004 "Armas automáticas"

- **Status:** rascunho em 2026-10-11, por delegação do usuário, pelo mesmo método da F-003; a revisão adversarial vem depois (§11).
- **Como foi feito:**
  - levantamento: um workflow com 4 pesquisadores (armas, alvos e geometria; dano, níveis, Sal, knockback e morte; feedback, números de dano, pausa e debug; estado, ordem do passo, projéteis, TETO, cenários, desempenho e testes), cada um com um verificador cético que conferiu as citações, procurou a resposta em todas as fontes e refez as contas e as medições, e um crítico de completude. Saíram 148 perguntas (114 dos pesquisadores, 25 que os verificadores acrescentaram e 9 do crítico), e 13 delas os documentos já respondem (§1). O crítico apontou 11 conflitos entre as áreas, e as decisões seguem a recomendação dele. Sobraram 8 contradições sem recomendação, decididas aqui com o motivo no lugar de cada uma: o contador `mortes` (M3), a pausa fora dos `ComandosDoPasso` (P4), o pool de números cheio (§6), a arma que matou (§4, anel), a medida do Círculo no F-004.1 (E4), o nome do fator do Sal (§10), o visual do Sal (V4) e o nível inicial da Espada na F-010 (§9);
  - as medidas vêm de protótipos fora do repositório: o código de `src/logica` empacotado e rodado no Node 22 deste contêiner. Nada foi medido em iPhone;
  - depois, este documento passa por uma revisão adversarial (§11).
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md` (prevalece no MVP);
  - o brief aprovado (`design/game-brief.md`), com as decisões Q-xx e a §11.3;
  - o GDD (`design/gdd/*.md`);
  - o ADR-0002 (aceito) e os ADR-0003, ADR-0004 e ADR-0005;
  - D2 = `design/decisoes-F-002.md` e D3 = `design/decisoes-F-003.md`;
  - o `feature_list.json`, `src/dados/armas.json`, os schemas e o código em `src/`.
- **Convenção:**
  - **[delegada]** marca decisão de design ou número que nenhum documento dá; ela vale até você dizer o contrário. **(técnica)** marca o que é só implementação. O resto vem de documento, citado;
  - o que pertence às F-005 a F-010 **não** é decidido aqui: vira recomendação na §9. A exceção são os números da União (W18), que a §11.3 do brief e o `armas.json` põem na F-004.
- **Pendências da F-004 no `feature_list.json`:**
  - brief §11.3 e `armas.json` (alcance, intervalo de golpes, "+20% área", nv7, facas, tick, knockback, onda, direção parado, ordem dos multiplicadores): §2 (W1 a W18) e §3 (D3, K1);
  - soma ou produto dos +20%: §3 (D2);
  - Sal reaplicado: §3 (S1);
  - `__GAME_DEBUG__` com `numerosDeDano`, `build` e `textoAtivo`: §8;
  - recomendações da D2 §9 (direção parado, acerto até a hitbox, knockback com obstáculos e 32 px): §2 (W1, W3) e §3 (K1);
  - recomendações da D3 §9 (Sal só no comportamento, knockback antes dos obstáculos, grade remontada, remoções na varredura, anel de eventos, sonda do TETO, campo `armas` na receita): §3, §4 e §5.

## 0. O que foi decidido por delegação (para vetar de relance)

| # | Decisão | Valor |
|---|---|---|
| W1 | Mira das armas de movimento | (dirX, dirY) do estado no passo de cada golpe: a última intenção não nula; no início, (0, −1). Intenção nula, NaN ou infinita não muda a mira |
| W2 | Arco da Espada | setor de 120° (±60°) com vértice no centro do jogador e raio R = 2 corpos = 64 px, sem zona morta; o golpe é instantâneo (todos os acertos no passo do golpe) |
| W3 | Distância de acerto | **toda forma de ataque do jogador acerta ao tocar a hitbox do alvo (aura: d ≤ R + r), com ≤ e sem ε; escolher alvo usa o centro. Muda a leitura do F-004.3 (Oco com centro a 80 px leva, a 83,2 px não) e diverge do "d ≤ r" do ADR-0002 §7** |
| W4 | Alvos por golpe | todo inimigo vivo cuja hitbox toca a forma, sem limite e com o mesmo dano; cada golpe acerta cada inimigo uma vez |
| W5 | Golpes por nível | **1, 1, 2, 2, 2, 2, 3, 4: ida; ida e volta (o mesmo setor); a estocada entra na 3ª posição no nv7; o nv8 soma uma ida. Diverge do "golpes extras (nv3 e nv8)" do ADR-0002 §7** |
| W6 | Intervalo entre golpes | 12 passos (0,2 s); cada golpe lê a mira e o nível no próprio passo; a recarga de 72 passos vai do 1º golpe de um ciclo ao 1º do seguinte |
| W7 | "+20% área" do nv5 | **escala linear de 1,2 no tamanho: arco de 76,8 px e estocada de 115,2 × 19,2 px; o ângulo fica em 120°. Desvia da letra de B (a área em px² daria 70,1 px)** |
| W8 | Estocada do nv7 | retângulo a partir do centro do jogador, ao longo da mira: 3 corpos de comprimento e ½ corpo de meia-largura (96 × 16 px), ou seja, sempre 115,2 × 19,2 px no nv7 e no nv8; atravessa todos; dano de um golpe |
| W9 | Facas | 12 corpos/s (6,4 px por passo; 7,68 do nv6 em diante); alcance de 6 corpos (192 px) na busca e no voo; vida de 30 passos (25 do nv6 em diante); hitbox de 8 px; voo reto; no máximo 1 acerto por passo, no mais próximo pelo centro (empate: menor slot); some ao acertar até o nv6 |
| W10 | Alvos de uma salva | **candidatos com o centro a ≤ 192 px, por d² e depois slot; a faca k vai ao candidato k mod M (2 alvos e 5 facas: A, B, A, B, A). Troca a proposta do ADR-0002 §7 ("repete o mais próximo")**. Sem alvo, a salva espera com a recarga em 0 |
| W11 | Facas no mesmo alvo | saem em paralelo, deslocadas (i − (m − 1)/2) × 8 px na perpendicular, com m facas nesse alvo e i de 0 a m − 1 |
| W12 | Perfuração do nv7 | 1; a faca guarda o handle do último inimigo acertado (sentinela 0xFFFFFFFF), nunca o acerta de novo e some no 2º acerto |
| W13 | Dano e Sal da faca | fixados no disparo, com o nível, o Poder e a Escala daquele passo |
| W14 | Tick do Círculo | global, a cada 30 passos (0,5 s), com metade do dano por segundo (0,75 no nv1); o Sal sai no mesmo tick |
| W15 | Bônus de raio do Círculo | somam: 64; 73,6; 73,6; 73,6; 83,2; 83,2; 83,2; 96 px do nv1 ao nv8 |
| W16 | Fase inicial dos timers | toda arma e todo efeito periódico nascem prontos: a Espada golpeia no passo 1; o pulso sai no 1º passo no nv7; Espada e Círculo disparam sem inimigos; subir de nível não reinicia timer |
| W17 | Ordem das vagas | ordem de aquisição (a Espada na vaga 0); no cenário, a ordem da lista `armas`; a vaga 0 age primeiro no passo |
| W18 | União (números; implementação na F-005) | herda os 4 golpes e as formas do nv8 (76,8 px; 115,2 × 19,2 px), 12 passos entre golpes, recarga de 60 passos, base 21 (14 × 1,5); uma onda por golpe: 1 corpo de largura, 12 corpos/s, 3 corpos de comprimento (15 passos), acerta cada inimigo uma vez, dano 8 × (1 + Poder) × Escala da União (6,6 com FOR 6) |
| D1 | Precisão do dano | fracionário, sem arredondar na simulação: numerador inteiro e uma divisão em double; `hp = fround(hp − dano)` |
| D2 | Bônus percentuais de nível | somam sobre a base do nv1: +20% e +20% = ×1,40 (Espada nv6 9,45; Círculo nv6 2,1/s). A mesma regra vale para raio, área e velocidade; o +50% contra Postura Quebrada fica fora |
| D3 | Ordem dos multiplicadores | **na F-004 fica só a estrutura: dano × multStatus × multStamina, os dois em 100%. Se Postura Quebrada, Contra-ataque, nv4, Quebra e Postura Firme somam ou multiplicam fica para as F-006 e F-009. Adia uma pendência que o brief §5.6 põe na F-004** |
| S1 | Sal reaplicado | fica o maior fator e a maior duração, campo a campo (comutativo); uma aplicação mais fraca prolonga a mais forte |
| K1 | Pulso do Círculo (nv7) | a cada 300 passos, todo inimigo cuja hitbox toca a aura recebe mín(12, ⌈(R + r − d)/8⌉) passos de afastamento radial de 8 px por passo; **o afastamento substitui o passo de comportamento (a D3 §9 recomendava "somado")**; sem dano e sem Sal |
| M1 | Mortos no meio da fase | ficam fora de todo acerto e escolha de alvo seguintes; saem no fim da fase de armas, em slot crescente; o overkill se perde |
| M2 | Armas antes do contato | o inimigo morto no passo não causa contato nesse passo |
| M3 | Contador `mortes` | 1 por slot morto por arma, no estado e no hash, para testes e debug; o que o Resultado chama de "mortes causadas" (o convertido vale 1 ou 10?) é da F-007 |
| M4 | HP 0 do jogador | as armas não leem o HP e continuam disparando até a F-007 |
| N1 | Acertos com número | só dano de arma do jogador num inimigo; o valor é o dano final do acerto, sem cortar pelo HP restante |
| N2 | Formato do número | inteiro arredondado (meio para cima), mínimo 1, sem separador de milhar, máximo 9999 |
| N3 | Número crítico | flag no evento; #ffd166 e escala ×1,5; na F-004, só em teste |
| N4 | Glifos | fonte pixel 5 × 7 escrita no código, célula de 1,5 pt, contorno de 1 pt em #0b0e14, molduras de 20 × 26 px, osso pelo tint |
| N5 | Posição do número | ponto do acerto, com a base 2 pt acima da hitbox; preso ao mundo; sem corte pela vista e sem sorteio |
| N6 | Animação | 36 passos: sobe 16 pt com saída quadrática; alpha 1 até a idade 24 e 0 na 36; idade contada em passos da simulação |
| N7 | Agregação | um acerto no mesmo inimigo (handle) soma no número vivo dele se esse número tem até 12 passos; o crítico prevalece |
| N8 | Opção de números | ligada por padrão, em memória, fora da simulação; desligar apaga os vivos; religar mostra só acertos novos |
| V1 | Golpe da Espada | cunha de 120° (ou o retângulo da estocada) em brasa #ffb347, alpha de 0,5 a 0 em 8 passos |
| V2 | Faca | losango de 16 × 4 pt em sal #dfe8ea, girado pelo voo |
| V3 | Aura e pulso | só o anel, em sal a 60%, com a borda externa no raio de acerto; o pulso é o anel crescendo 96 px em 12 passos |
| V4 | Sal no inimigo | losango de 8 × 8 pt em sal no centro do corpo; a cor do corpo não muda |
| V5 | Morte | a forma e a cor do tipo, alpha de 1 a 0 e escala de 1 a 0,6 em 12 passos, abaixo da horda, pool de 300 |
| V6 | Regras de cor | nenhum efeito de arma usa branco; nenhuma área em sal é preenchida; sal × branco (ΔE 6,5) e crítico × brasa (ΔE 9,8) são pares aceitos abaixo de 14 |
| V7 | Flash de acerto | nenhum na F-004 |
| P1 | Botão de pausa | alvo de 72 × 72 pt no canto superior esquerdo, dentro da safe-area; ícone de duas barras; aciona ao soltar dentro, se o toque começou dentro |
| P2 | Painel do debug | **desce para safe-area + 76 pt, para não cobrir o botão. Muda a V4 da D3** |
| P3 | Gesto de dois dedos | "parado" = até 10 pt lógicos do touchstart; dispara com ≥ 2 dedos que contam, cada um com ≥ 500 ms; borda travada |
| P4 | Onde mora a pausa | **fora do estado, do hash, do replay e dos `ComandosDoPasso`: dois flags no driver (o do jogador e o do debug). Diverge do ADR-0002 §9 e §12** |
| P5 | Conteúdo da tela de pausa | **título, build (nome + "Nível {nivel}"), opção de números e Continuar. Som e Flashes vão para a F-006 e as estatísticas para a F-007, embora a Q-25 só tire o Abandonar** |
| P6 | Layout da pausa | cena Modal, véu #0b0e14 a 60%, textos no terço de cima, Continuar e opção (288 × 72 pt) no de baixo, fade de 200 ms |
| P7 | Retomar | só pelo Continuar, sem contagem; o gesto não retoma |
| P8 | Joystick na pausa | todos os dedos são soltos; depois do Continuar, só um toque novo cria o joystick (adota a D2 §9) |
| P9 | Opção na tela | linha de 288 × 72 pt com caixa de 28 pt, cheia quando ligada; sem texto novo |
| E1 | Cenário `tres_armas` | linha 6 fixa; Espada, Facas e Círculo no nv8; jogador invulnerável. O campo `armas` é obrigatório e fica vazio em `horda`, `horda_rotativa` e `sem_horda` |
| E2 | TETO | **a sonda e o cache `vdc.teto` entram (ADR-0002 §13), mas o rebaixamento fica para a F-010, com a degradação de nível 3. Estende a divergência 8 do ADR-0005** |
| E3 | F-004.4 | **os "30 s" contam em passos de jogo: 1ª morte com passo ≤ 1.800, timeout real de 120 s. Muda a verificação de um critério de B** |
| E4 | F-004.1 | ±1% contra o valor da fórmula (6,75 no nv1), não contra o "≈ 7" de B; o Círculo pelo valor do tick × 2 |
| E5 | Horda depois do pulso | na linha 19, a horda volta aos limites da S5 da D3 em ≤ 600 passos depois do último empurrão (a calibrar) |
| E6 | Alocação com armas | o E4 da D3 ganha uma variante com as 3 armas no nv8: ≤ 16 B por passo, somando todas as funções de `src/` |
| E7 | Evidência das três armas | `tres-armas-390x844.png`, no 1º passo depois do 600 com golpe de até 2 passos, faca em voo e número vivo |

## 1. O que os documentos já respondem

- **Obstáculos não bloqueiam ataques:** "no MVP, nenhum projétil nem área é bloqueado por obstáculo" (D2 O6). Vale para o arco, a estocada, as facas e a aura.
- **Tempos em passos** (ADR-0002 §3, inteiro mais próximo): Espada 1,2 s = 72; Facas 0,9 s = 54; União 1,0 s = 60; pulso 5 s = 300 (B §3.8); Sal 3 s = 180 (B §3.6). Cada conversão fica listada num teste.
- **Sal:** aplicação direta (ADR-0002 §15 item 12; "como" do F-004.2), −50% de velocidade por 3 s (doc 04 §8: "Auras e facas"); −60% no Círculo nv4 (B §3.8). A aura aplica dano e Sal a cada tick (ADR-0002 §7). O Sal vale para todos os tipos do MVP, inclusive o convertido.
- **Escalas de Aldric** (B §3.8; `armas.json`; `vigilantes.json`): Espada FOR C / DES C = 0,75 × 6/10 + 0,75 × 3/10 = 0,675; Facas DES B = 1,0 × 3/10 = 0,3; Círculo FÉ A = 1,25 × 3/10 = 0,375.
- **Poder e atributos na F-004:** Poder = 0 e FOR 6 / DES 3 / FÉ 3 (B §3.3). Nenhuma fonte de Poder nem de crescimento de atributo existe antes das F-005 e F-006; a F-004 não cria campo para eles (§9).
- **`Mult_stamina` = 1** (brief §5.6: só armas pesadas; nenhuma no MVP).
- **Build inicial:** Espada Longa nv1 na vaga 0 (doc 03 §3.1; `vigilantes.json` `arma_inicial`; ADR-0002 §14 `?inicio`; doc 02 §11). Facas e Círculo só entram por cenário ou teste até o level up (F-005).
- **Vagas:** 5 armas (B §3.3; `vigilantes.json` `vagas.armas`). O "6" do doc 04 §1 é de personagens fora do MVP.
- **Knockback:** só o pulso do Círculo nv7 desloca inimigos; nenhuma arma empurra no acerto; sem poise (B §3.8; doc 04 §2, que marca o knockback do Martelo; Q-16; D3 K3).
- **Nenhuma arma sorteia** (B §3.8; ADR-0002 §5: "o 'mais próximo' desempata pelo menor índice"). O fluxo `armas` fica semeado e intocado.
- **Mortos e diretor:** a morte libera o slot e o `vivosEq` cai (10 por convertido); a reposição seguinte repõe até o mínimo; nada nasce na janela de 30 s antes de um marco (Q-07; D3 §1 e R2).
- **Pools aprovados** (ADR-0002 §4 e §15 item 2): projéteis 400 (+64 efeitos de chão), limite somado 200 ou 400; números de dano 96, fora da simulação; pool cheio = recusa, nada é reciclado; anel de 1.024 eventos (`Uint32Array` + `Float32Array`), que a D3 §9 põe num `ArrayBuffer` próprio, fora do hash e do save.
- **Números de dano:** osso #e8dcc4, não branco (Q-27); críticos amarelos e maiores na Postura Quebrada (doc 11 §3.6) e na Quebra (doc 04 §8); crítico #ffd166 (Q-27); dígitos do atlas numa camada GPU, nunca `Text` por número (ADR-0002 §11).
- **Pausa:** "botão superior ou dois dedos parados 0,5 s" (B §3.5); o gesto só conta toques que não começaram no joystick nem num botão (Q-25; ADR-0002 §12); o passo e o relógio param (B §3.1; ADR-0002 §3); alvo ≥ 72 pt (B §3.5); tela de pausa na F-004 e "Abandonar" na F-007 (Q-25); a pausa automática é da F-010 (B §4). O "relógio para" do F-004.6 vem de B §3.1, não da Q-25.
- **Sem som de UI:** B §2 limita o áudio a 3 sons de evento crítico e prevalece sobre o "cada toque tem som curto" do doc 11 §1.
- **Sonda do TETO:** entra na 1ª feature com projéteis (ADR-0005 §8 item 8; ADR-0002 §13 e §15 item 2).
- **`textoAtivo`** já existe desde a F-001 (ADR-0003 §5); da pendência 4 faltam `numerosDeDano`, `build` e `ultimosEventos`.

## 2. Armas e alvos

- **Mira (W1). [delegada]** As armas de `direcao_movimento` usam (dirX, dirY) do estado no passo de cada golpe. O campo já existe e já está no hash (`estado.ts` nasce com dirY = −1; `jogador.ts` só o muda com 0 < |m|² < ∞). É a regra do triângulo (D2 M3) e do viés do anel (D3 R6): o golpe sai para onde o triângulo aponta. Vale para a Espada e a União.
  - Teste: 10 passos com intenção (1, 0) e depois nula: o golpe seguinte acerta um Oco em (+60, 0) e não um em (−60, 0). Numa Vigília nova, o 1º golpe acerta (0, −60) e não (0, +60). Intenção NaN mantém a mira.
- **Arco (W2). [delegada]** Setor de 120° com vértice no centro do jogador, raio de 64 px, sem zona morta interna. "2 corpos" é o raio de corpo a corpo que B já usa (aura; Postura Quebrada do aparo). Alcança o Oco encostado (32 px) e o Oco Grande parado a 48 px; não alcança a Noviça a 128 px; fica abaixo dos 3 corpos da onda da União.
  - Medido no cenário horda (passo 1.800, 300 vivos, média das 4 direções), pela hitbox: 9,0 inimigos por golpe com R = 48; 16,3 com 64; 21,8 com 76,8; 29,0 com 96.
  - Consequência a não tratar como bug: com o vértice no centro e a regra da hitbox, um corpo encostado leva o golpe até ≈ 90° da mira (Oco, d = 32: a distância à borda é 32·sen(θ − 60°) ≤ 16) e ≈ 97° (médio, d = 40). O arco acerta todo corpo encostado na metade da frente.
  - Golpe instantâneo: o setor inteiro é testado no passo do golpe. "Ida" e "volta" são só desenho.
- **Hitbox (W3). [delegada, segue a D2 §9]** Toda forma de ataque do jogador acerta quando toca a hitbox circular do alvo (16 ou 24 px, D2 H1):
  - círculo (aura): d² ≤ (R + r)²;
  - setor: distância do centro do alvo ao setor ≤ r (teste abaixo);
  - retângulo (estocada): teste exato círculo × retângulo (W8);
  - faca: d² ≤ (8 + r)².
  - As contas são em double sobre os Float32 do estado, pelo delta toroidal, com ≤ e sem ε. O ε do contato (D3 §3) não entra: o resultado na borda é determinístico (Float32 no estado, double na conta), e um corpo empurrado até R + r volta 1,32 px por passo bem antes do tick seguinte.
  - Escolher alvo ("mais próximo", alcance da busca) e as zonas (Fogueira, Ímã) usam o centro, como as distâncias de comportamento (D3 S7).
  - Medido no cenário horda: a aura nv1 pega 38 inimigos pela hitbox e 18 pelo centro; o arco de 64 px, 16,3 e 5,5. A regra corresponde ao que se vê: quem encosta no anel ou na cunha desenhados leva dano.
  - Teste: tabela de casos de borda por forma, com Oco e médio, nos dois eixos e cruzando a costura (jogador em x = 5, alvo em x = 1.095). A mutação "centro" reprova.
- **Teste do setor sem trigonometria** (técnica). p = delta toroidal alvo − jogador, d = √(p·p):
  1. d > R + r → não acerta;
  2. d = 0 ou p·dir ≥ 0,5·d (cos 60° literal, ADR-0002 §5) → acerta;
  3. senão, acerta se a menor distância de p aos segmentos-borda [0, R·e±] for ≤ r. Os vetores e± são dir girado ±60° com cos 60° = 0,5 e sen 60° = 0,8660254037844386 literais, calculados uma vez por golpe, fora do laço.
  - É exato para setores convexos e só usa √, × e +. Conferido contra varredura angular densa em 20.000 casos (R = 64, r de 16 e 24, dir em Float32): nenhuma discordância acima de 0,05 px.
  - Teste: força bruta em 10.000 casos com r de 16 e 24, com o mesmo dir Float32, inclusive na costura, ignorando uma faixa de 1e-6 px; a função com r = 0 acerta a 59° e não a 61°. Casos fixos com dir (0, −1) exato (o de uma Vigília nova): Oco em (0, −80) leva e em (0, −80,5) não; médio em (0, −88) leva; Oco em (32, −2) leva (borda a 14,27) e em (32, +2) não (17,73); Oco encostado atrás, em (0, +32), não leva.
- **Alvos (W4). [delegada]** Cada golpe acerta uma vez todo inimigo vivo (hp > 0) que ele toca, sem limite e com o mesmo dano. Um inimigo pode levar todos os golpes de uma sequência. Teste: 5 Ocos no setor e 1 fora: os 5 perdem o dano de 1 golpe; um Oco atrás de um obstáculo, dentro do setor, também leva.
- **Golpes por nível (W5). [delegada]**
  - nv1 e nv2: ida; nv3 a nv6: ida e volta; nv7: ida, volta e estocada; nv8: ida, volta, estocada e ida.
  - A "volta" é o mesmo setor frontal. Um golpe para trás tiraria a obrigação de "mirar com os pés" (doc 04 §10, item 4).
  - O nv7 acrescenta a estocada na hora, como pede a "mudança qualitativa" de marco (doc 04 §1.1); se ele só transformasse o 3º golpe, que chega no nv8, a carta do nv7 ficaria vazia. É a leitura que o brief §11.3 sugere.
  - Os dados dizem a forma de cada golpe extra (§10); o código nunca deduz a forma pelo id da arma (ADR-0002 §7). Divergência do ADR-0002 §7 no ADR-0006.
  - Teste: golpes e forma por nível (1, 1, 2, 2, 2, 2, 3, 4; o 3º é estocada a partir do nv7).
- **Sequência (W6). [delegada]** 12 passos entre os golpes. 12 divide 72 e 60, então as fases não escorregam, e a sequência do nv8 dura 36 passos, menos que a recarga da União (60). 0,1 s sobreporia os golpes desenhados.
  - Estado (técnica): no passo em que a recarga dispara, sai o 1º golpe; se o nível tem mais, `golpe` = 1 (o índice do próximo) e `esperaGolpe` = 12. A cada passo com `golpe` > 0, `esperaGolpe` − 1; em 0, sai o golpe de índice `golpe`, com a forma e o total lidos do nível corrente, e depois `golpe` + 1 e `esperaGolpe` = 12, ou `golpe` = 0 se era o último.
  - Teste: Espada nv8 com um Oco Grande parado a 48 px na mira (dentro do setor e do retângulo): acertos em t, t + 12, t + 24, t + 36 e t + 72. Trocar a intenção entre t e t + 12 muda o setor do 2º golpe.
- **Área do nv5 (W7). [delegada]** "Área" é o tamanho da forma (a estatística Área do doc 03 §2.2), não a área em px² nem o ângulo. O ângulo de 120° é a identidade da arma e não pede cosseno novo. Medido no cenário horda: 16,3 inimigos por golpe com 64 px e 21,8 com 76,8. A alternativa literal (70,1 px) fica listada para veto.
  - Teste: no nv4, um Oco com centro a 81 px na mira não leva; no nv5, leva a 92,8 px e não a 93,3 px. O ângulo se testa com r = 0, ou com um Oco a 100° e 40 px (distância de 25,7 à borda), que não leva em nenhum nível.
- **Estocada (W8). [delegada]** Retângulo que sai do centro do jogador ao longo da mira. O comprimento reaproveita os 3 corpos da onda da União; 1 corpo de largura é o diâmetro do Oco. Como os níveis acumulam, o nv7 e o nv8 sempre levam o +20% do nv5: L = 115,2 e w = 19,2 px.
  - Teste exato, em coordenadas locais: a = p·dir, b = p·n, com n = (−dirY, dirX); ca = clamp(a, 0, L), cb = clamp(b, −w, w); acerta se (a − ca)² + (b − cb)² ≤ r². A consulta à grade usa √(L² + w²) + R_MAX.
  - Alcance axial do centro: L + r = 131,2 px (Oco) e 139,2 px (médio): a estocada alcança a Noviça parada a 128 px.
  - Medido no cenário horda: 19,5 inimigos por estocada no nv7 (retângulo).
  - Teste (forma real do nv7): Oco em (0, −131,2) leva e em (0, −131,3) não; Oco a 35,2 px do eixo leva e a 35,3 px não; 5 Ocos em fila levam todos; e a função com L e w explícitos.
- **Facas (W9). [delegada]**
  - 12 corpos/s, 4 vezes o projétil "lento" da Noviça (3 corpos/s). Alcance de 6 corpos = 192 px, a meia-largura da vista (195 pt): a faca nunca mira o que o jogador não vê na horizontal.
  - Velocidade calculada uma vez no boot, com numerador inteiro: v = 32 × 12 × (100 + Σvel_pct) / 6.000 = 6,4 ou 7,68 px por passo (em double, 6,4 × 1,2 daria 7,679999999999999). Vida = round(192 / v) = 30 ou 25 passos.
  - Hitbox de 8 px (o círculo inscrito no menor projétil do doc 13 §1.2, de 16 px). Voo reto: o alvo só define a direção. Acerta qualquer inimigo no caminho. No máximo 1 acerto por passo: entre os vivos com hp > 0 e handle ≠ `ultimoAlvo`, o de menor d² pelo centro, com empate pelo menor slot. Com um Oco e um médio tocando a faca no mesmo passo, ela pode acertar o de trás pela borda: escolha aceita, determinística.
  - Sem varredura contínua: |v_faca| + d_max_inimigo ≤ 2 × (8 + 16) − margem, com d_max_inimigo = 12 px (o maior entre o passo da horda e o empurrão do pulso). Com 7,68 px, sobra folga.
  - Teste: uma faca sem nada no caminho anda 6,4 px por passo e some no passo 30, a 192 px (±1e-3); no nv6, 7,68 e 25. Mirada num alvo em (100, 0), com outro Oco em (50, 5), acerta o do caminho. Dois Ocos tocando no mesmo passo: só o mais próximo perde HP. Atravessa um obstáculo e acerta o Oco atrás. Com |v| = 7,68 e um Oco vindo de frente a 12 px por passo, nunca atravessa (1.000 casos).
- **Alvos da salva (W10). [delegada; o crítico recomendou o ciclo]**
  - Candidatos: vivos com o centro a ≤ 192 px pelo delta toroidal, em ordem de d² e depois slot. A seleção parcial dos N ≤ 6 menores (5 facas no nv8 mais a da esquiva perfeita da F-006) é feita durante a visita da grade, sem sort e sem alocar.
  - A faca k vai ao candidato k mod M. Com M = 2 e N = 5, o ciclo dá 3 + 2 e o texto do ADR-0002 §7 daria 1 + 4. O ciclo espalha o dano e o Sal do nv4, e não gasta a salva num Oco que já morre. Divergência no ADR-0006.
  - Direção: o delta toroidal até o centro do alvo, normalizado e fixado no disparo; com d = 0, (dirX, dirY).
  - Sem nenhum candidato, a salva não sai e a recarga fica em 0; ela dispara no 1º passo em que houver alvo e recarrega 54 passos. As Facas não disparam no vazio.
  - Teste: Ocos a 50, 60 e 70 px e 2 facas → os de 50 e 60; empate exato em d² → menor slot; nenhum a ≤ 192 px → nenhum projétil e recarga em 0; quando um entra, a salva sai no mesmo passo, e a seguinte 54 passos depois.
- **Facas no mesmo alvo (W11). [delegada]** Sem isso, as facas de um alvo saem pelo mesmo caminho e parecem uma só. A faca de índice i entre as m desse alvo nasce deslocada (i − (m − 1)/2) × 8 px ao longo de (−uy, ux), com u a direção unitária, e voa em paralelo. Com m ≤ 5, o desvio máximo é 16 px < 8 + 16: todas continuam acertando. O espaçamento fica em `armas.json` (§10). Teste: 1 Oco e 3 facas → 3 acertos, nascidas a −8, 0 e +8 px.
- **Perfuração (W12). [delegada]** No nv7, `perfuracoes` = 1: a faca acerta, segue com a vida que resta e some no 2º acerto. `ultimoAlvo` (Uint32, handle) nasce em 0xFFFFFFFF, porque o handle 0 (slot 0, geração 0) é um inimigo válido; o slot `0xFFFF` passa da capacidade e `slotDoHandle` devolve −1. A comparação vai em linha (um handle ≥ 2³¹ atravessando chamada vira HeapNumber). Teste: 2 Ocos em fila: no nv6 só o 1º perde HP; no nv7 os dois, e a faca some; um Oco que segue sobreposto à faca não leva o 2º acerto; uma faca nova acerta o inimigo do slot 0 na geração 0.
- **Dano fixado no disparo (W13). [delegada; recomendação do crítico]** A faca é uma entidade própria, gravada no save da F-008, e carrega o ×2 do Contra-ataque (F-006). Uma faca disparada durante o +15% de Poder da esquiva perfeita leva o bônus até acertar. Golpes e ticks, que são instantâneos, leem o dano do passo (§4).
- **Tick (W14). [delegada]** 30 divide 60: o valor por tick é exato (0,75 no nv1, exato em binário), e 2 ticks por segundo ainda leem como contínuo. Um tick por passo daria 0,025 por inimigo e 60 eventos por inimigo por segundo. O tick é global, sem campo por inimigo: quem entra na aura leva o Sal em até 29 passos.
  - Teste: um Oco Grande parado a 48 px (o próprio comportamento o mantém ali) na aura nv1, sozinho, por 600 passos: HP de 100 a exatamente 85 (20 ticks de 0,75); ticks em t, t + 30….
- **Raio (W15). [delegada]** Soma, pela regra da D2. Calculado uma vez no boot, com inteiros: R = 32 × raio_corpos × (100 + Σraio_pct) / 100 (somando 0,15 + 0,15 + 0,2 em double daria 95,99999999999999). No nv8, 3 corpos exatos; o produto daria 101,57 px. A mutação "produto" reprova no nv5 (84,64 px).
- **Timers (W16). [delegada]**
  - Arma pronta na largada é o padrão do gênero, torna o F-004.4 determinístico e mostra o golpe desde o início.
  - Recarga: a cada passo, se `recarga` > 0, subtrai 1; depois, se `recarga` = 0, dispara e volta ao período (72, 54 ou 30). Assim a Espada de Aldric golpeia nos passos 1, 73, 145….
  - Subir de nível no meio do ciclo não reinicia nada: a recarga, a fase do tick e a sequência continuam, e cada golpe lê na tabela o nível corrente (número de golpes, forma, dano). `esperaPulso` fica em 0 abaixo do nv7, então o pulso sai no 1º passo no nv7.
  - Os timers contam passos simulados: param na pausa, no level up e no congelamento.
  - Teste: numa Vigília nova, golpes nos passos 1 e 73; um Círculo equipado no passo t tica em t e t + 30; pausado, nada anda.
- **Ordem das vagas (W17). [delegada]** A vaga 0 age antes: mata antes, e as Facas de uma vaga posterior já ignoram quem ficou com hp ≤ 0. A União herda a vaga da Espada (brief §5.9), então a ordem não muda quando ela chega.
- **União (W18). [delegada nos números; implementação na F-005]** Decidida aqui porque o brief §11.3 e o `armas.json` põem a pendência na F-004 e o F-005.6 remete a ela. Os golpes herdam o nv8 (W5 a W8); a velocidade da onda é a da faca; "3 corpos" é o comprimento (`armas.json` `onda.comprimento_corpos`). Escala FOR B / DES C = 1,0 × 0,6 + 0,75 × 0,3 = 0,825: 17,325 por golpe e 6,6 por onda com FOR 6; com FOR 34 e Poder 40%, 106,6 e 40,6. Com 8 de dano fixo, a onda perderia sentido a partir da Hora II (Oco no minuto 10 = 26,4 HP). As pendentes da União em `armas.json` recebem os valores (§10), sem trocar "F-004" por "F-005".
- **Arquétipos** (técnica): no boot, `armas.json` vira uma tabela por (arma, nível) em arrays tipados: numerador do dano, golpes e forma de cada um, R e (R + r)² por tipo de inimigo, L e w, facas, velocidade por passo, vida, perfurações, intervalo do tick, Sal (fator e passos), pulso. Uma função por arquétipo, chamada por vaga. Um `null` pendente numa arma que pode entrar na Vigília da feature é erro no boot (a União fica fora até a F-005), como o `existe` dos tipos de inimigo (ADR-0005 §3). Os outros arquétipos do doc 04 entram como funções novas. Teste: as 3 armas compilam sem `null` nos 8 níveis; a mutação "alcance null" falha no boot; um teste por arquétipo com uma arma sintética prova que o código não depende do id.

## 3. Dano, níveis, Sal, knockback e morte

- **Fórmula (D1). [delegada]** Por vaga e por passo, nunca por inimigo:
  - `dano = base × num × (100 + Σdano_pct) × (100 + poderPct) × escalaMil × multStatus × multStamina / (den × 10⁷ × 10⁴)`, com o numerador inteiro (abaixo de 2⁵³ no pior caso do MVP, conferido num teste) e uma única divisão em double. `escalaMil` = Σ grau em centésimos × atributo (Espada: 75 × 6 + 75 × 3 = 675); multStatus e multStamina em porcento (100 na F-004); num/den = 30/60 no tick do Círculo e 1/1 nas outras armas.
  - Resultado independe da ordem das multiplicações e bate com o oráculo do teste. Conferido no Node: a via inteira dá o mesmo Float32 que a fórmula em todos os níveis das 3 armas com Poder de 0 a 55%.
  - Uma função única, `danoPorAcerto`, serve à simulação e ao teste. Ela recebe inteiros: (Espada, nv1, FOR 6, DES 3, Poder 0) = 6,75; Poder 8 → 7,29; FOR 14 → 12,75.
  - Por acerto: `hp[s] = fround(hp[s] − dano)`. Arredondar para inteiro violaria o ±1% de B em quase toda a tabela (Facas 1,8 → 2: +11,1%; Espada 6,75 → 7: +3,7%). O "≈ 7" de B é arredondamento de texto.
- **Soma dos bônus (D2). [delegada]** Base(nível) = Base₁ × (1 + Σ pct/100). Apoio: o doc 04 §1.1 ("cada nível adiciona um incremento previsível"); B escreve "+" para incremento e "×" para multiplicar ("Espada nv8 ×1,5"); as Luvas dão "+8% Poder por nível" (`passivas.json`), lidos como soma; a conta fica exata em inteiros. O produto muda o nv6 em 2,86%, e o ±1% do F-004.1 separa as duas regras. O +50% contra Postura Quebrada (nv4 da Espada) é condicional e fica fora: ele entra no multStatus da F-006.
- **Tabela de dano esperada** (Aldric FOR 6 / DES 3 / FÉ 3, Poder 0, soma dos bônus; por acerto, salvo indicação):

| Nv | Espada por golpe | golpes | Espada por ciclo (72 passos) | alcance (px) | Facas por faca | facas | Facas por salva (54 passos) | Círculo por s | por tick (30 passos) | raio (px) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 6,75 | 1 | 6,75 | 64 | 1,8 | 2 | 3,6 | 1,5 | 0,75 | 64 |
| 2 | 8,1 | 1 | 8,1 | 64 | 1,8 | 3 | 5,4 | 1,5 | 0,75 | 73,6 |
| 3 | 8,1 | 2 | 16,2 | 64 | 2,16 | 3 | 6,48 | 1,8 | 0,9 | 73,6 |
| 4 | 8,1 | 2 | 16,2 | 64 | 2,16 | 3 | 6,48 | 1,8 | 0,9 | 73,6 |
| 5 | 8,1 | 2 | 16,2 | 76,8 | 2,16 | 4 | 8,64 | 1,8 | 0,9 | 83,2 |
| 6 | 9,45 | 2 | 18,9 | 76,8 | 2,16 | 4 | 8,64 | 2,1 | 1,05 | 83,2 |
| 7 | 9,45 | 3 | 28,35 | 76,8 (estocada 115,2 × 19,2) | 2,16 | 4 | 8,64 | 2,1 | 1,05 | 83,2 |
| 8 | 9,45 | 4 | 37,8 | 76,8 (estocada 115,2 × 19,2) | 2,16 | 5 | 10,8 | 2,1 | 1,05 | 96 |

  - Contas: Espada 10 × (100 + Σ)/100 × 0,675, com Σ = 0, 20 (nv2 a nv5) e 40 (nv6 a nv8); Facas 6 × (100 + Σ)/100 × 0,3, com Σ = 20 do nv3 em diante; Círculo 4 × (100 + Σ)/100 × 0,375, com Σ = 20 (nv3 a nv5) e 40 (nv6 a nv8); tick = por s × 30/60. Conferidas no Node.
  - Em Float32: 8,1 → 8,1000004; 9,45 → 9,4499998; 1,8 → 1,7999999; 2,16 → 2,1600001; 0,9 → 0,89999998; 1,05 → 1,0499999 (erro relativo < 1e-7).
  - Com o produto, os nv6 a nv8 dariam 9,72 (Espada) e 2,16/s (Círculo): +2,86%.
  - O nv4 da Espada fica igual ao nv3: o +50% não tem gatilho antes da Postura Quebrada (F-006).
  - Referências de morte (HP em Float32, conferidas): Oco no minuto 0 (12 HP) morre com 2 golpes de Espada nv1, 7 facas nv1 ou 16 ticks (8 s de aura); no minuto 19 (39,36 HP), com 6 golpes, 22 facas ou 53 ticks.
- **Multiplicadores (D3). [delegada]** Na F-004, `dano × multStatus × multStamina`, os dois de uma função única que devolve um inteiro percentual (100). A forma interna (soma ou produto entre fontes) não é decidida: nenhum desses estados existe antes da F-006 (Postura Quebrada, Contra-ataque, nv4) e da F-009 (Quebra, Postura Firme), e decidir sem eles seria inventar sem poder testar. Os números da escolha vão para a §9.
- **Sal: campos e duração** (técnica): por inimigo, `salPct` (Uint8, redução em %: 0, 50 ou 60) e `salPassos` (Uint8). A aplicação no passo t (fase de armas) grava 180. Na fase da horda, uma vez por passo para todo inimigo vivo, fora dos ramos de comportamento e de knockback: se `salPassos` > 0, o comportamento usa v_ef = v × (100 − salPct)/100, em linha, e `salPassos` − 1; em 0, `salPct` = 0. Assim, os passos t + 1 a t + 180 andam devagar e o t + 181 volta ao normal. Velocidades salgadas: Oco 0,66 px por passo (0,528 com 60%); Oco Grande 0,84; Noviça 0,96. `nascerInimigo` e `removerInimigo` zeram os dois.
- **Sal só no comportamento** (técnica; adota a D3 §9): perseguir, parar à distância e manter distância (inclusive o recuo da Noviça) usam v_ef. O limite da separação continua a velocidade base, e o bloqueio S4, os obstáculos e o knockback não mudam. Medido (Círculo nv7, Sal de 60% na aura, linha 19, 300 vivos): a horda assenta com penetração média de 19,9% da soma dos raios, contra 19,3% sem Sal (a S5 aceita 25%).
- **Facas no nv4** (documento): aplicam o Sal padrão do doc 04 §8 (50%, 180 passos), fixado no disparo (W13). O `armas.json` ganha o bloco `aplica` nas Facas (§10), para não haver número implícito no código.
- **Reaplicação (S1). [delegada]** `salPct ← máx(salPct, novo)` e `salPassos ← máx(salPassos, novo)`. O resultado não depende da ordem das armas no passo, e quem fica na aura nunca perde o Sal (cada tick renova). Efeito colateral aceito: uma aplicação mais fraca (Facas, 50%) prolonga a mais forte (60%) por mais 180 passos. A alternativa lexicográfica (fator maior vence, empate pela duração) "pisca" no caso misto.
  - Teste: 60% no passo t e 50% no t + 100 → 40% da velocidade até o t + 280 inclusive e cheia no t + 281; as duas aplicações no mesmo passo, em ordens trocadas, dão o mesmo hash.
- **Knockback (K1). [delegada; recomendação do crítico, que juntou os números de uma proposta com o estado de outra]**
  - A cada 300 passos, na fase de armas, todo inimigo vivo cuja hitbox toca a aura (o mesmo teste do dano, nas posições finais) recebe `kbPassos` = mín(12, ⌈(R + r − d)/8⌉). Um pulso novo substitui o resto do anterior (com 300 passos de período, não acontece). O jogador não é afetado.
  - Nos passos t + 1 em diante, na fase da horda, enquanto `kbPassos` > 0: o passo de comportamento é **trocado** por um afastamento radial de 8 px, na direção jogador → inimigo, recalculada a cada passo pelo delta toroidal (centros coincidentes: (1, 0)); depois `kbPassos` − 1. Esse afastamento é o vetor de desempate dos obstáculos. Em seguida vêm a separação (limite v base), o bloqueio S4 (que não atua num corpo que se afasta) e os obstáculos, por último.
  - Por que trocar e não somar: somado, o Oco Grande sem Sal no nv8 andaria 8 − 1,68 por passo e não sairia da aura; trocado, o pulso abre o cerco. O deslize no obstáculo continua dependendo do desempate da D3 §2: um empurrão de frente contra um obstáculo para na borda.
  - "Até a borda" usa o raio que já existe, sem inventar força. Abre um anel de 7 Ocos encostados para ≈ 104 px, com folgas de ≈ 58 px entre corpos (pela corda), mais que os 32 px do jogador. Medido num protótipo (cópia de `horda.ts` com o empurrão de 8 px **somado** ao comportamento, antes dos obstáculos, e Sal de 60% na aura): na linha 0, "até a borda" deu de 107 a 127 passos de alívio por pulso e −35% de acertos de contato em 3.000 passos. A troca não foi medida.
  - Limite físico (técnica): deslocamento antes da colisão = 8 + separação (≤ 1,92) < 16 px por passo. Assim, 2·R_MAX + deslocamento < 64 px (a folga mínima de D2 O4; 67,4 px na Charneca), e a lista de obstáculos por célula continua bit a bit igual à lista inteira (D3 §2). O invariante de 32 px de D2 §2 não bastaria: acima de 19,4 px por passo, um médio pode tocar dois obstáculos.
  - 8 px por passo, 12 passos e 300 passos ficam em `armas.json` (§10), nunca no código.
  - Teste: sem obstáculos e com o comportamento normal, um Oco a 40 px no nv7 (R = 83,2) recebe 8 passos e está a 104 px no fim do 8º (±1e-3); um anel de 7 Ocos encostados termina todo a d ≥ 99,2 − 1e-3; cada passo de cada corpo < 16 px no total (`EMPURRAO.total2`); contra um obstáculo, o Oco para fora dele; centros coincidentes não geram NaN; fora da aura ninguém se move; o pulso seguinte vem 300 passos depois; em 1.000 pulsos aleatórios na Charneca, nenhum corpo termina dentro de obstáculo; o teste de equivalência da lista por célula é refeito com deslocamentos de até 8 + 1,92 px. E5 confere a horda depois do pulso (§8).
- **Morte: critério** (técnica): morre com hp ≤ 0 depois de `hp = fround(hp − dano)`, sem ε. Medido em 1.009.792 combinações (4 tipos, minutos 0 a 22, I de 1,0 e 1,1, Espada com FOR de 6 a 34 e Poder de 0 a 55%, Facas, Círculo com tick de 15, 30 e 60): o Float32 pede 1 acerto a mais que a conta exata em 0,05% dos casos e nunca 1 a menos (exemplo: um Oco no minuto 0 com I = 1,1, 13,2 HP, leva 17 ticks de 0,825). Teste: 2 golpes de Espada nv1 matam o Oco do minuto 0 e 1 não; HP exatamente 0 conta como morto; 1e-7 não.
- **Mortos no meio da fase (M1). [delegada]** Marcar e varrer: com hp ≤ 0, o inimigo fica fora do resto da fase (sem dano, Sal, número, faca gasta, perfuração nem escolha de alvo). O número mostra o dano cheio do acerto que matou; o overkill não passa a outro inimigo. Como nada é liberado durante a fase, a grade e a lista densa continuam válidas. Teste: um Oco com 1 HP atingido pela Espada e por uma faca no mesmo passo dá 1 acerto e 1 morte, e a faca segue; um alvo de HP alto atingido pela Espada e pela aura no mesmo passo perde a soma.
- **Armas antes do contato (M2). [delegada]** Um Oco morto no passo não encosta no jogador nesse passo (doc 10 §1.1: mais justo). Teste: Oco encostado, timer de contato em 0, HP ≤ o dano do golpe do mesmo passo: o HP do jogador não muda; a mutação "contato antes das armas" reprova.
- **`matarInimigo` e `mortes` (M3). [delegada]** Uma função única, `matarInimigo(e, dados, slot, causa)`, chamada só pela varredura do fim da fase (§4): grava o evento `morte` com o handle da geração antiga, o tipo, a posição, a causa e o bit de convertido; soma 1 em `mortes` se a causa é arma; e só então chama `removerInimigo`, que continua sem efeito de morte (testes e rotação do cenário) e passa a zerar `salPct`, `salPassos` e `kbPassos`.
  - O conflito: as áreas de dano e de estado punham `mortes` no estado; a de feedback o tirava, porque a semântica de "mortes causadas" (convertido 1 ou 10, massa da arena, Coroados que viram cinza) é da F-007. Fica o contador, com 1 por slot: ele trava as referências de determinismo (§8) e prova que o caminho de morte rodou igual no Node e no Chromium; o que o Resultado mostra a F-007 decide, derivando dele ou com outro contador (§9).
  - Teste: matar um convertido sintético soma 1 em `mortes` e emite 1 `morte` com convertido = 1; a rotação do cenário não mexe em `mortes`; na linha 0, matar 5 Ocos faz a reposição seguinte repor 5 (e 10 com um convertido sintético, se couber).
- **HP 0 do jogador (M4). [delegada]** As armas não leem o HP. No F-004.4, o jogador parado perde HP e as armas continuam. A F-007 decide o APAGANDO (§9).

## 4. Estado v4, ordem do passo, projéteis e anel de eventos

- **Layout (`VERSAO_LAYOUT` 4)** (técnica). Cada campo entra com o 1º consumidor (ADR-0003 §3; D3 §6):
  - cabeçalho e RNG: sem mudança;
  - build no registro do jogador, 5 vagas (B §3.3; recomendação do crítico): Uint16 `recarga` (no Círculo, o timer do tick) e `esperaPulso`; Uint8 `codigo`, `nivel`, `golpe` (próximo golpe da sequência; 0 = nenhum) e `esperaGolpe`. São 40 B, sem campo de direção (cada golpe lê a mira, W6) e sem campo genérico;
  - mundo: + `mortes` e `projeteisRecusados` (Uint32);
  - inimigos: + Uint8 `salPct`, `salPassos` e `kbPassos` (sem kbX e kbY: a direção se recalcula, K1);
  - pool de projéteis, capacidade 400: metadados do pool; Float32 `x`, `y`, `xAnt`, `yAnt`, `vx`, `vy`, `dano`; Uint32 `ultimoAlvo`; Uint16 `vida`; Uint8 `tipo` (1 = faca), `perfuracoes` e `salPct`. `dono` não entra: não tem consumidor, e a F-006 decide se o projétil da Noviça precisa dele (§9);
  - ficam para depois: `hpMax`, `estado`, `timerEstado`, `quebradaPassos`, `alvoAtaque` (F-006, F-009), efeitos de chão e pickups (F-005), atributos, nível, XP e Poder (F-005, F-006);
  - as seções ficam agrupadas por largura (Float32/Uint32, depois Uint16, depois Uint8) ou acolchoadas até múltiplo de 4: `new Float32Array(buffer, off)` lança erro com `off` fora de múltiplo de 4. Nessa ordem, o buffer passa de 20.232 B a 42.188 B; um teste trava `BYTES_ESTADO`, cada deslocamento e o alinhamento de cada view;
  - hash do buffer inteiro: FNV-1a de 48 KB medido em 0,083 ms (Node 22); só testes e debug o chamam.
- **Tabela de armas** (técnica): códigos fixos que só crescem no fim, como os tipos de inimigo: 0 vazia, 1 `espada_longa_do_juramento`, 2 `facas_de_sal`, 3 `circulo_de_sal`, 4 `lamina_do_juramento_eterno`. Um teste confere que todo id de `armas.json` tem código.
- **Ordem do passo v4** (técnica; recomendação do crítico):
  1. `passo` e `relogio` + 1;
  2. jogador, como na F-003;
  3. inimigos, em slot crescente: xAnt; v_ef pelo Sal; se `kbPassos` > 0, afastamento de 8 px no lugar do comportamento e `kbPassos` − 1, senão o comportamento com v_ef; decremento do Sal (uma vez por passo, em todo vivo); normaliza;
  4. grade; 5. separação; 6. soma, bloqueio S4, obstáculos, normaliza (como na D3 §2);
  7. armas:
     - 7a. remonta a grade com as posições finais;
     - 7b. projéteis em voo, slot 0 a 399 crescente: anda (x += vx, y += vy), normaliza no toro em Float32, testa acerto, `vida` − 1; some na hora ao esgotar a vida ou a perfuração;
     - 7c. vagas 0 a 4: recarga, sequência da Espada, salva das Facas (a faca nova nasce com xAnt = x e não testa acerto nesse passo), tick do Círculo e depois o pulso;
     - 7d. varredura de mortes, slot 0 a 499 crescente: `matarInimigo` em cada vivo com hp ≤ 0;
  8. contato, só com os sobreviventes;
  9. rotação do cenário; 10. diretor.
  - Consequências: as armas veem as posições que o render desenha e o hash vê; nenhum efeito de arma move corpo no mesmo passo, então a grade de 7a não envelhece; Sal e knockback aplicados em t valem da fase 3 de t + 1; quem nasce em t não leva golpe em t. Muda a ordem registrada na D3 §2 e no ADR-0005 §2 (ADR-0006).
  - Uma proposta punha as armas depois do contato e remontava a grade sob demanda. Vale a ordem acima; a remontagem sob demanda pode entrar como otimização se o resultado for bit a bit igual.
  - Teste: Sal aplicado na fase de armas do passo t: 1,32 px no passo t e 0,66 px no t + 1 (±1e-3); faca lançada em t tem x = xAnt no fim de t; um Oco que o obstáculo empurra para dentro do setor no mesmo passo leva o golpe (posições finais).
- **Grade das armas** (técnica): a grade e a lista de vivos viram rascunhos de módulo compartilhados pela horda e pelas armas, refeitos inteiros em 7a. Todos os vivos têm hp > 0 nesse ponto (os mortos do passo anterior já saíram). As consultas usam o raio da forma + R_MAX e filtram cada candidato pela regra da hitbox. Medido (Node 22, horda assentada da linha 19): `reconstruirGrade` com 300 vivos, 6,3 µs; a aura pela grade, 1,5 µs. Teste: equivalência com a força bruta nas posições finais em 1.000 configurações, com casos fixos nas costuras (x = 10, y = 10): o conjunto acertado pela aura, pelo arco e por cada faca é igual.
- **Remoções** (técnica; adota a D3 §9): a simulação nunca percorre a lista densa (`ativos`), só os slots por índice; a lista densa serve para contar e alocar. Inimigos saem em 7d, em slot crescente, então a pilha de livres recebe os slots em ordem e o próximo nascer pega o último (LIFO). Projéteis saem na hora, dentro do laço por índice; a salva vem depois do laço, então um slot liberado e reaproveitado no mesmo passo não é visitado de novo. Uma regra `no-restricted-syntax` em `src/logica` (fora de `pool.ts`) barra a leitura de `.ativos`, com um caso em `tests/lint.test.ts`. Teste: um golpe mata Ocos nos slots 4, 9 e 2 → removidos na ordem 2, 4, 9, e o próximo nascer usa o 9.
- **Projéteis** (técnica): capacidade física 400 nos dois TETOs. Limite lógico 200 com TETO 300 e 400 com TETO 500: leitura das duas colunas de B §3.13, cuja classe de aparelho o TETO representa. Até a F-005, os efeitos de chão não entram na soma. Pool cheio: a faca é recusada e soma em `projeteisRecusados` (no hash). No MVP da F-004 o pico é a salva do nv8: 5 facas, vida de 30 passos, recarga de 54. A faca nasce no centro do jogador (mais o deslocamento da W11) com xAnt = x; o slot liberado é zerado inteiro, inclusive `ultimoAlvo`. Teste: com TETO 300, a 201ª faca é recusada e soma 1; com 500, a 401ª; os slots livres ficam zerados (varredura byte a byte depois de matar e remover N inimigos e projéteis).
- **Anel de eventos** (técnica; formato recomendado pelo crítico):
  - no objeto `Estado` (`e.eventos`), num `ArrayBuffer` próprio de 4 + 1.024 × 32 = 32.772 B, fora de `bytes`: nem o hash nem a cópia do buffer o veem. `reiniciarEstado` o zera. Cada estado tem o seu (a sonda e os testes não se misturam);
  - contador `escritos` (Uint32, só cresce) e 1.024 entradas de 4 Uint32 + 4 Float32;
  - Uint32: [passo; tipo do evento | arma << 8 | forma << 16; handle do alvo (0xFFFFFFFF sem alvo); tipo do inimigo | flags << 8 | causa << 16]. Tipos: 1 `acerto`, 2 `morte`, 3 `golpe`, 4 `pulso`. Formas: 1 ida, 2 volta, 3 estocada, 4 faca, 5 tick. Flags: bit 0 crítico, bit 1 matou, bit 2 convertido. Causa: 1 arma (as F-008 e F-009 acrescentam as suas). Os códigos só crescem no fim;
  - Float32 por tipo: `acerto` = x, y do alvo, valor, 0; `morte` = x, y, 0, 0; `golpe` = dirX, dirY, alcance (R ou L), meia-largura (w ou 0); `pulso` = 0, 0, R, 96 (o empurrão máximo);
  - quem matou: uma proposta queria a arma no evento `morte`, mas a varredura de 7d não sabe qual arma zerou o HP sem um campo por inimigo. O `acerto` que zera o HP leva a flag "matou", com a arma e a forma; a `morte` leva a causa. O render e a telemetria juntam os dois pelo handle e pelo passo;
  - **a simulação só escreve no anel, nunca lê**: uma leitura quebraria a cópia do buffer e a restauração do save. Um teste de lint (grep em `src/logica`) confere que só o gravador toca nas views do anel;
  - os eventos de um passo saem na ordem das fases (7b por slot, 7c por vaga, 7d por slot), o que torna `ultimosEventos` comparável entre motores;
  - vazão: na horda assentada da linha 19, 75 inimigos tocam a aura do nv8 (medido); com golpe, facas e mortes, ≈ 110 eventos num passo e ≈ 550 num quadro de 5 passos, abaixo de 1.024. O transbordo real vem de `avancar(n)` longo; o leitor que atrasa mais de 1.024 pula para os últimos e soma a diferença em `eventosPerdidos`;
  - teste: 1.500 eventos → `ultimosEventos` devolve os 1.024 últimos, em ordem; um leitor atrasado conta 476 perdidos; o hash do estado é o mesmo com o anel cheio ou vazio; a mutação "anel dentro do buffer" reprova.
- **Dano por passo** (técnica; recomendação do crítico): golpes e ticks leem `DANO[vaga]` (`Float64Array(5)` de rascunho), calculado uma vez no passo em que a vaga dispara. Facas levam o dano gravado em Float32 no disparo (W13).
- **Laço quente** (técnica; ADR-0005 §2): nos laços por inimigo e por projétil das armas (arco, estocada, aura, pulso, voo e acerto da faca, mortes), nenhuma chamada fora de linha recebe ou devolve double. Ficam em linha: o dano, o Sal, o knockback, a normalização no toro e a comparação de handles. São permitidas funções auxiliares que só recebem inteiros (`gravarEvento(e, tipo, arma, forma, handle, extra)`, com os floats lidos de um `Float64Array` de rascunho) e consultas à grade que leem x, y e r de um rascunho, como `COLISAO`. A salva grava direto nos campos do pool. O E6 é o árbitro.
- **Rascunhos** (técnica): grade e lista de vivos, `DANO`, a consulta, os 6 candidatos das facas (`Int32Array` e `Float64Array`) e os floats do evento: alocados uma vez, refeitos a cada passo, sem memória entre passos.
- **NaN** (técnica): a verificação do `?debug=1` passa a ler os Float32 dos projéteis vivos. Pontos de divisão por distância: a faca com o alvo no centro do jogador usa (dirX, dirY); o knockback com centros coincidentes usa (1, 0); o setor com d = 0 acerta. Teste: NaN injetado num projétil vivo é pego com o slot; um Oco exatamente no centro do jogador recebe faca, golpe e pulso sem NaN em 10 passos. Nenhum evento é gravado com valor não finito.
- **RNG** (documento): o fluxo `armas` fica intocado. Teste: depois de 3.600 passos com as 3 armas no nv8 na linha 19, as 4 palavras do fluxo são as do passo 0; a mutação "escolher alvo com `proximoU32`" reprova.

## 5. Cenários, build inicial, TETO e sonda

- **Parâmetro `armas`** (técnica): `ParametrosDaVigilia.armas` é uma lista de `{ codigo, nivel }` ou `null`. `null` é a arma inicial do Vigilante no nv1, lida uma vez em `criarDadosDaVigilia`, que passa a receber `armas.json` e falha no boot se a arma inicial não existir ou não tiver código. Assim `criarEstado(seed, dados)` é a Vigília normal que o Chromium roda no F-001.11. Erro na montagem: 6 armas, nível 0 ou acima de `nivel_max`, arma repetida, id desconhecido ou a União (até a F-005). Teste: os parâmetros padrão dão a vaga 0 = Espada nv1.
- **`equiparArma(e, dados, codigo, nivel)`** (técnica): ocupa a 1ª vaga livre com `recarga`, `golpe`, `esperaGolpe` e `esperaPulso` em 0 (W16). Serve aos testes e à receita; a F-005 pode reusá-la no level up.
- **Testes das F-001 a F-003** (técnica): `tests/logica/apoio.ts` ganha `SEM_ARMAS = { armas: [] }`, e `SEM_HORDA` passa a incluir `armas: []`. Todo teste que monta o cenário horda passa por `parametrosDoCenario('horda')` (hoje `horda.test.ts` o monta à mão em três lugares); `contato.test.ts` e todo estado com o diretor desligado montado à mão recebem `armas: []`; os testes do diretor que contam spawns, vivos ou reposição passam `SEM_ARMAS`. Sem isso, a Espada voltada para cima mata os Ocos de cima, e o anel de 7 Ocos do contato, a horda assentada da S5 e as reposições deixam de medir o que medem, e nem toda falha seria visível.
- **Receitas (E1). [delegada no cenário novo]** O `cenario.schema.json` ganha o campo obrigatório `armas`: lista de `{ "arma": <id de armas.json>, "nivel": 1 a 8 }`, com 0 a 5 itens e ids únicos (o nome `arma` evita confusão com o `id` da receita). Um teste de integridade confere que o id existe, que o nível ≤ `nivel_max` e que a arma tem `uniao: false` (o schema não sabe). As receitas mudam juntas:
  - `horda`, `horda_rotativa` e `sem_horda`: `armas: []`. O E1, o E2 e o E3 da D3 continuam válidos, e o `sem_horda` continua isolando o movimento das F-001 e F-002;
  - nova `tres_armas`: linha fixa 6 (mínimo 70, pesos 8/3/3: os três tipos numa horda média), diretor ligado, jogador invulnerável, tutoriais vistos, rotação 0, `armas` = Espada, Facas e Círculo, todas no nv8, nessa ordem (vagas 0, 1 e 2). O nv8 mostra numa imagem só os 4 golpes, a estocada, as 5 facas, o raio de 96 px e o pulso. Serve à evidência (E7), ao F-004.5 e ao E6. É um 4º cenário fora dos aprovados no ADR-0002 §14, registrado no ADR-0006.
- **Sonda do TETO** (documento: ADR-0002 §13; ADR-0005 §8 item 8). Entra na F-004, a 1ª feature com projéteis:
  - `montarEstadoDaSonda(dados)`, pura, em `src/logica`: TETO 500, jogador invulnerável, diretor desligado, sem armas, 500 Ocos numa malha fixa a ≥ 34 px do jogador e 400 projéteis sintéticos (dano 0, vida máxima, nas direções da tabela de 256). Os projéteis usam a perfuração sentinela 255, que não decrementa, para continuarem 400 nos 360 passos; só `montarEstadoDaSonda` a aceita, com teste;
  - `medirSonda(estado, dados, agora)`, em `src/plataforma`, com o relógio injetado: 120 passos de aquecimento + 8 lotes de 30, um lote por quadro na Tela de Acender, depois do aquecimento do layer; mediana ≤ 2 ms por passo → 500, senão 300; passou de 800 ms → 300;
  - a sonda só roda se o override, o cache e a classe de tela derem `null` (a ordem de `decidirTeto`); assim, os specs com `?teto` não gastam CPU nela;
  - cache `vdc.teto` por build + token `Version/` do Safari + classe de tela, gravado ao fim da sonda, exceto com o rAF a 30 fps (ADR-0002 §13). Se o toque em Acender chegar antes do fim, a Vigília usa 300 com origem `fallback` e não grava o cache;
  - `?sonda=0`, só no build de debug, desliga a sonda; o F-003.10 passa a usá-lo para continuar testando `fallback` sem depender da máquina. Parâmetro novo, no ADR-0006;
  - medido (Node 22 neste contêiner): com 494 Ocos e sem projéteis, mediana de 2,16 ms por passo (p95 dos lotes, 2,85 ms). Aqui a sonda dá 300 ou estoura os 800 ms. Os testes de hash continuam com `?teto=300`;
  - teste: relógio falso com 1,5 ms por passo → 500, origem `sonda`; 2,5 ms → 300; soma acima de 800 ms → 300; o estado da sonda tem 500 vivos e 400 projéteis no início e no fim dos 360 passos. Playwright: o F-003.10 com `&sonda=0` igual ao de hoje; sem `?sonda=0` e sem `?teto`, a origem é `sonda` ou `fallback`.
- **Rebaixamento (E2). [delegada]** Depende do nível 3 da degradação graciosa, que só existe na F-010. Fica para lá, registrado no ADR-0006 como extensão da divergência 8 do ADR-0005.


_(continua no próximo commit: §6 a §11)_
