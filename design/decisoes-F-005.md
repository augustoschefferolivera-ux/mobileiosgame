# Decisões da F-005 "XP, level up, passivas e União"

- **Status:** rascunho em 2026-10-11, pelo mesmo método das F-003 e F-004. Revisado por uma revisão adversarial, com os achados registrados na §11. Aguarda o seu veto antes da implementação (Etapa 2).
- **Como foi feito:**
  - levantamento: um workflow com 4 pesquisadores, cada um seguido de um verificador cético, e um crítico de completude. As áreas foram: XP, Cinzas e atributos; level up e modal; baú e União; estado, render e testes. Os verificadores conferiram as citações, procuraram a resposta em todas as fontes e refizeram as contas e as medições;
  - saíram 174 perguntas dos pesquisadores, 12 dos verificadores e 20 do crítico. 42 delas os documentos já respondem, no todo ou em parte (§1). Os verificadores revisaram 147 propostas e corrigiram 19. A verificação da área de estado e render foi parcial: 27 das 41 perguntas não foram revistas a fundo, e a revisão adversarial (§11) cobriu esse buraco;
  - o crítico achou 16 conflitos entre as áreas (por exemplo, três unidades de XP diferentes e dois jeitos de entrar a escolha da carta) e 11 contradições entre fontes. Cada um está resolvido aqui, no lugar da decisão, com o motivo;
  - as medidas vêm de protótipos fora do repositório: o código de `src/logica` empacotado e rodado no Node 22 deste contêiner. Nada foi medido em iPhone.
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md` (prevalece no MVP);
  - o brief aprovado (`design/game-brief.md`), com as decisões Q-xx e a §11.3;
  - o GDD (`design/gdd/*.md`);
  - o ADR-0002 (aceito) e os ADR-0003 a ADR-0006;
  - D2, D3 e D4 = `design/decisoes-F-00{2,3,4}.md`;
  - o `feature_list.json`, `src/dados/*.json`, os schemas e o código em `src/`.
- **Convenção** (a mesma da D4):
  - **[delegada]** marca decisão de design ou número que nenhum documento dá; vale até você dizer o contrário;
  - **(técnica)** marca o que é só implementação;
  - o resto vem de documento, citado;
  - o que pertence às F-006 a F-010 não é decidido aqui: vira recomendação na §9.
- **Pendências da F-005 no `feature_list.json`:**

| # | Pendência | Onde |
|---|---|---|
| 1 | teto de FOR; HP por nível (brief §11.3) | §2, P1 a P3 |
| 2 | level up solta os dedos e esconde o joystick (D2 §9) | §3, M5 |
| 3 | camada GPU "mundo"; forma das Cinzas; hpMax e arredondamento | §6 (R1, R2) e §2 (P3) |
| 4 | União com os números da W18 (vaga, pool de 64, quem já acertou, visual, N7) | §4, U5 a U9 |
| 5 | geometria da onda | §4, U6 |
| 6 | Cinzas saem de `matarInimigo` com causa arma | §2, X3 |
| 7 | atributos, nível, XP e Poder; recálculo do dano; Luvas; teto de FOR | §2, P1 a P5 |
| 8 | simulação de 20 min (alvos de DPS e de nível) | §2, P6 |
| 9 | ícones das vagas no HUD, passivas na pausa, pausa sem efeito no level up | §6, R5, e §3, M5 |
| 10 | HUD numérico com os glifos da N4 | §6, R4 |

## 0. O que foi decidido por delegação (para vetar de relance)

Em negrito, o que diverge de um documento aprovado ou muda uma leitura anterior.

| # | Decisão | Valor |
|---|---|---|
| X1 | Unidade da XP | XP inteira (Uint32), guardada como o resto do nível atual. O custo do nível n é ⌈XP(n)⌉, calculado em inteiros: 10, 19, 29, 40, 52, 65, 80, 96, 113, 131 (nv10), …, 379 (nv20). Sem teto de nível |
| X2 | Cinzas | 1 Cinza por morte por arma, sempre (100%), com o XP do tipo: Oco 1, Oco Grande e Noviça 5, convertido 10, Coroado 25. Cor pela faixa do valor: azul abaixo de 5, verde de 5 a 24, vermelha a partir de 25 (cores da Q-27) |
| X3 | Onde a Cinza nasce | dentro de `matarInimigo`, só com causa arma, na posição do morto, sem sorteio. Único caminho de morte |
| X4 | Ímã | 1,5 corpo = 48 px, de centro a centro, d² ≤ 48² com ≤ e sem ε. **A W3 da D4 (acerto até a hitbox) não vale para o Ímã**, que é zona, como a Fogueira |
| X5 | Voo e coleta | a Cinza no raio voa 8 px por passo (15 corpos/s) até o jogador e é coletada a ≤ 16 px. Sem estado de "atraída": vale o raio a cada passo. Parado, a Cinza a 48 px é coletada no 5º passo |
| X6 | Pool de pickups | **um pool de 512 para Cinzas e baús (ADR-0002 §4), com `xAnt` e `yAnt` a mais**. Cheio, a Cinza nova soma o valor na Cinza viva mais próxima (junção; contador `juncoes`). O baú nunca é recusado: abre vaga por junção. Sem vida útil |
| P1 | Teto de FOR | **20, alcançado no nível 15** (+1 FOR automático por nível; depois do teto, o ponto se perde) |
| P2 | HP por nível | +2 de HP base por nível (130 + 2(n − 1)); a FOR não dá HP no MVP (**diverge do "+HP máximo leve" do doc 03 §2.1**) |
| P3 | hpMax e arredondamento | campo `hpMax` (Float32, valor inteiro) no registro do jogador: hpMax = ⌊(base × (100 + Σ%) + 50) / 100⌋, os percentuais somados (Brasa Firme 15, a árvore na F-010). Nv1 150; nv2 152; nv15 182; nv29 214. Quando o máximo sobe, o HP atual sobe o mesmo tanto, se for > 0 |
| P4 | Recálculo do dano | um derivado por Estado (`danoVivo`, por vaga, mais o dano da onda), fora do buffer e do hash, recalculado só em eventos raros: criação, cruzamento de nível, confirmação de carta, baú, União e restauração. **Não por disparo** (a D4 DN1 já mostrou que estoura o E6). Com FOR 6 e Poder 0, é bit a bit igual à F-004 |
| P5 | Poder e Armadura | derivados das passivas, sem campo: Poder = 8% × nível das Luvas; Armadura = 4 × nível do Elmo. **A Armadura não reduz dano na F-005**: a redução A/(A + 20) é da F-007 (B §4) |
| P6 | Simulação de 20 min | fica como medida, sem gate. O nível depende do jogador: parado, 9/12/13/15 aos 5/10/15/20 min; andando em círculo, 4/16/28/41; caçando, 15/26/35/46 (alvo do doc 10: 9/16/23/29). Facas e Círculo dão 1 a 4% do dano com DES e FÉ em 3: risco registrado para o balanceamento |
| L1 | Cartas possíveis | Espada, Facas, Círculo (até nv8), Elmo e Luvas (até nv5) e a Bolsa de Almas. A União nunca é carta |
| L2 | Sorteio | 3 cartas; para cada uma, 60% de chance de ser melhoria de item possuído e 40% de item novo, sem repetir item na oferta (Q-22). Categoria vazia troca para a outra; as duas vazias dão Bolsa de Almas (+50), que pode se repetir. Item novo só com vaga livre do seu tipo na build |
| L3 | Os 35% da União | **lidos como piso**: depois das 12:00 de relógio, com a Espada no nv8, sem Elmo, sem União e com vaga de passiva, a 1ª carta é o Elmo com 35% de chance; senão, a regra normal (que já mostra o Elmo em 68 a 100% das ofertas). A leitura "exatamente 35%" baixaria a chance |
| L4 | RNG | subfluxo `levelup` por nível e `baus` por índice de queda (ADR-0002 §5); a oferta não depende do consumo de outro sistema |
| L5 | Quando a oferta nasce | no fim da fase de pickups do passo que cruza o nível, depois dos baús desse passo; numa fila de níveis, a seguinte nasce na confirmação da anterior, sobre a build já atualizada |
| M1 | Simulação com modal aberto | não roda passo: passo e relógio parados (B §3.1). `avancar` para depois do passo que abre o modal e devolve quantos passos rodou; o resto do quadro é descartado sem contar em `passos_perdidos` |
| M2 | Entrada da escolha | **fora do passo e dos `ComandosDoPasso`, por `confirmarModal(e, dados, k)`, com o replay guardando as escolhas na ordem dos modais. Diverge do ADR-0002 §12 (carta como borda do comando) e do §9 (LEVEL_UP como estado da máquina)**: com o modal aberto não há passo para levar o comando, e uma fila de níveis precisa de várias escolhas seguidas |
| M3 | Fila de modais | baús primeiro (em slot crescente), depois os níveis, um modal por vez; tudo no estado e no hash. O `estado` do debug continua `VIGILIA` |
| M4 | Toques no modal | toque = começar e soltar na mesma carta. 1º toque seleciona; toque na selecionada confirma; em outra carta, troca a seleção; fora das cartas, nada. Sem atraso de tempo, sem swipe e sem toque único |
| M5 | Dedos, joystick e pausa | ao abrir: todos os dedos soltos e o joystick some (adota a D2 §9); o tradutor fica no modo `modal`, sem joystick, sem botão de pausa e sem gesto de dois dedos. Ao fechar, só um toque novo cria o joystick. Se a pausa e o level up caem no mesmo quadro, a pausa vem primeiro |
| B1 | Conteúdo do baú | 1 item (70%), 3 (25%) ou 5 (5%); cada item é +1 nível numa arma ou passiva possuída e abaixo do máximo, distintas, ao acaso (Q-23). Item que falta vira Bolsa de Almas. Nunca dá item novo |
| B2 | União no baú | avaliada na abertura: relógio ≥ 10:00 (36.000 passos), Espada nv8 e Elmo na build, sem União → o baú contém só a União (sem os 1/3/5 e sem RNG). Um baú de 5:00 aberto depois das 10:00 também conta. Uma União por baú |
| B3 | Baú na F-005 | **entidade no pool de pickups (tipos comum e dourado), aberta ao encostar (≤ 32 px de centro a centro)**, com modal próprio que congela o passo como o level up. Quem o solta na Vigília é o Coroado da F-008; aqui ele entra pelo cenário `bau_uniao` |
| B4 | Modal do baú | título "Baú", uma linha por item (nome e "Nível N", ou a União), botão Continuar (reusa A6.PAUSA.CONTINUAR); 2 textos novos: A10.BAU.TITULO e A10.BAU.UNIAO |
| U1 | Números da União (W18 da D4) | base 21 (14 × 1,5, inteira no boot); escala FOR B / DES C (0,825): 17,325 por golpe com FOR 6; 4 golpes e formas do nv8 (arco de 76,8 px, estocada 115,2 × 19,2); 12 passos entre golpes; recarga de 60 |
| U2 | Entrada da União | na vaga da Espada, com recarga, golpe, espera e pulso em 0; o Elmo continua. O 1º golpe sai no passo seguinte ao fechamento do modal. A Espada nunca mais é oferecida |
| U3 | Geometria da onda | uma onda por golpe (inclusive a estocada). Nasce no centro do jogador e segue a mira daquele golpe, fixa no chão. Acerta como um quadrado de 32 × 32 px, cujo centro avança 384·t/60 px (6,4 por passo) nos passos t = 1 a 15. "3 corpos" é o percurso do centro (96 px); a borda da frente chega a 112 px. Obstáculos não bloqueiam |
| U4 | Acertos da onda | cada inimigo uma vez por onda (bitset de 512 bits por onda; `removerInimigo` limpa o bit); dano 8 × (1 + Poder) × 0,825 = 6,6 com FOR 6, fixado na criação (como a faca); sem Sal e sem empurrão. O número soma no do inimigo (N7) |
| U5 | Pool da onda | efeitos de chão de 64, que entram na soma de 200/400 com os projéteis; cheio, a onda é recusada (`efeitosRecusados`) |
| U6 | Visual da onda | o quadrado de 32 × 32 pt na posição do acerto, girado pela mira, em brasa, alpha 0,4 até a idade 8 e reto até 0 na 15, na camada das armas (**0,4 e não os ≤ 50% da D4: a 0,5, sobre a cunha, a brasa fica a ΔE 12,5 do jogador**) |
| R1 | Camada GPU "mundo" | 54 obstáculos + 512 pickups numa `SpriteGPULayer`, abaixo das mortes e da horda, com plano B `image` |
| R2 | Forma das Cinzas e do baú | Cinza: losango de 12 × 16 pt, sem contorno, em 3 escalas (0,75 azul; 1,0 verde; 1,25 vermelha). Baú: quadrado de 32 pt, comum em bronze #b08d57 e dourado em ouro escuro #a8841f com contorno (não o #ffd166 do crítico, que fica a ΔE 9,8 do jogador) |
| R3 | Cores abaixo de ΔE 14 | dois pares aceitos com motivo (a forma e o tamanho são o 2º canal): Cinza vermelha × obstáculo (contraste 2,43:1) e, em deuteranopia, Cinza vermelha e verde × Ocos |
| R4 | Barra de XP e nível | barra de 8 pt em topo + 40, preenchida na cor da Cinza azul; o nível como texto "Nv {nivel}" (A5.HUD.NIVEL). **Os glifos da N4 ficam para os números que os pedem (Almas na F-007, relógio na F-008)**: o nível é um texto com palavra, que muda poucas vezes |
| R5 | Ícones das vagas | 12 vagas de 28 pt em topo + 80: 5 armas, Relíquia (vazia) e 6 passivas, com ícones geométricos provisórios. **O painel do `?debug=1` desce para topo + 144** |
| R6 | Modal de cartas | cena própria sobre a Hud, véu #0b0e14 a 60%, 3 cartas de 342 × 152 pt ancoradas embaixo, borda osso, selecionada com contorno brasa, "Completa:" em #ffd166 |
| E1 | Cenários novos | **`nivel_tres` (XP inicial de 29 no passo 1: dois níveis e duas ofertas) e `bau_uniao` (10:00, Espada nv8, Elmo nv2 e um baú dourado a 96 px), 5º e 6º fora dos aprovados no ADR-0002 §14**. As 4 receitas antigas ganham `cinzas: false` |
| E2 | Layout e referências | VERSAO_LAYOUT 5 (≈ 68 KB, travado na implementação); as referências 901adb6d e 9cdc2c63 mudam só pelo layout; regressão v4 contra o código da F-004, como a v3 |
| E3 | Critérios e evidências | **F-005.7 novo (baú e União no navegador)**; F-005.2 e F-005.6 reescritos (§8); evidências `modal-390x844.png` e `uniao-390x844.png` |
| E4 | Alocação | o E6 ganha variantes com Cinzas, level ups e União: ≤ 16 B por passo, sem lista branca. A geração da oferta, fria, tem medida própria registrada no ADR-0007 (≤ 2 KB por oferta) |

## 1. O que os documentos já respondem

- **Curva e leitura de n:** XP(n) = 10 + 8(n − 1) + 0,6(n − 1)² é o custo para ir do nível n ao n + 1 (Q-22 (4); F-005.1).
- **Valor das Cinzas:** azul 1, verde 5, vermelha 25 (B §3.9); XP por tipo na tabela de B §3.6 (Oco 1, Oco Grande 5, Noviça 5, Coroado 25); o convertido vale a soma dos 10 que substitui (Q-08; ADR-0002 §8).
- **Ímã:** 1,5 corpo (B §3.9). Ímã de Osso, Sorte e bônus de Ímã ficam fora (doc 02 §7; B §2).
- **Pool de pickups:** 512, com junção na mais próxima quando cheio (ADR-0002 §4).
- **Atributos, nível e XP** no registro do jogador (ADR-0002 §4); +1 ponto por nível, automático em FOR (B §3.3).
- **Luvas:** +8% de Poder por nível; **Elmo:** +4 de Armadura por nível; máximo nv5 (B §2 e §3.9; `passivas.json`).
- **Sorteio:** 3 cartas; 60% de melhorias; arma nova só com vaga; 35% da passiva que completa a União depois do minuto 12; Reroll, Pular e Banir em 0 (B §3.9). Chance por carta, sem repetir; troca de categoria; Bolsa de Almas (Q-22 (1) a (3)).
- **Level up pausa** o passo e o relógio (B §3.1; ADR-0002 §3); toque na carta e segundo toque confirma (B §3.5).
- **RNG:** um gerador para o level up (B §3.1), com subfluxo por nível e outro para os baús, por índice (ADR-0002 §5). Os fluxos `levelup` e `baus` já estão nas palavras de RNG do estado e no hash.
- **Baú:** do Guardião e do Chefe Menor; depois do minuto 10, a União se a arma estiver no nv8 e a passiva presente; senão 1 (70%), 3 (25%) ou 5 (5%) itens (B §3.9). "1 item" = +1 nível num item possuído, sem escolha; "depois do minuto 10" = relógio ≥ 10:00; o dourado é só visual (Q-23).
- **União:** substitui a Espada na mesma vaga; o Elmo continua (brief §5.9); números da W18 (D4 §0); o dourado e a Brasa do doc 02 §6.3 perdem para B (brief §5.9).
- **Onda:** obstáculos não bloqueiam ataques (D2 O6); dano fixado como na faca (W13 da D4); números pela N7.
- **Textos:** todos os da carta já existem (A10.LEVELUP.*, F1.*, F2.*, F3.*, A5.HUD.NIVEL). As lores ainda são "…".
- **Sem som de level up** (B §2 limita o áudio a 3 sons de evento crítico).

## 2. XP, Cinzas e progressão do personagem

- **XP (X1). [delegada; o crítico resolveu três propostas]** As áreas propuseram três unidades: inteiro com teto, décimos e `Math.round`. Fica a XP inteira em Uint32, porque as Cinzas são inteiras: com XP inteira, xp ≥ XP(n) equivale exatamente a xp ≥ ⌈XP(n)⌉, sem double. O arredondamento comum deixaria subir com 28 XP quando a fórmula pede 28,4. Décimos obrigariam a barra e o debug a dividir.
  - Custo em inteiros, com k = n − 1: ⌊(100 + 80k + 6k² + 9) / 10⌋. Fica numa tabela montada no boot.
  - O campo `xp` guarda o resto do nível atual. Ao coletar: xp += valor; enquanto xp ≥ custo(nivel): xp −= custo, nivel + 1, `niveisPendentes` + 1.
  - Sem teto de nível: quando os itens se esgotam, as cartas viram Bolsa de Almas (Q-22 (3)). No protótipo, quem caça chega ao nível 45 e vê 14 a 17 Bolsas.
  - Medido: soma até o nv29 de 7.473 (contra 7.462 da fórmula exata, +0,15%). XP(10) = 131 e XP(20) = 379, dentro de 130 ± 1 e 380 ± 2.
  - Teste: tabela literal de n = 1 a 30 escrita no teste; uma Cinza de 28 com xp 0 no nv1 deixa o jogador no nv2 com 18; uma vermelha (25) no nv1 com xp 9 cruza dois níveis no mesmo passo.
- **Cinzas (X2, X3). [documento, mais a chance de 100% delegada]**
  - Cada morte por arma solta exatamente uma Cinza com o XP do tipo (`inimigos.json`). O convertido solta uma Cinza de 10, e não 2 de 5 ou 10 de 1: ocupa uma vaga só.
  - Nasce dentro de `matarInimigo`, só com `CAUSA.arma`, antes de `removerInimigo`, no (x, y) do morto. `matarInimigo` passa a receber `dados` (hoje recebe `(e, s, causa)`), e a função de soltar recebe só o slot e lê a posição e o XP em linha (regra do laço quente).
  - As outras causas de morte (arena, marco vencido, A Fome, APAGANDO) não existem ainda: recomendação na §9.
  - Teste: um inimigo de cada tipo (Oco, Grande, Noviça, convertido) dá 1, 5, 5 e 10; o fluxo `drops` fica intocado; `removerInimigo` sozinho nunca solta Cinza.
- **Ímã e voo (X4, X5). [delegada]**
  - Distância de centro a centro, pelo delta toroidal, d² ≤ 48². A Cinza é um ponto, e o Ímã é uma zona, como a Fogueira e as zonas da W3 da D4.
  - A cada passo, na fase de pickups: se d ≤ 16 px (a hitbox do jogador), coleta; senão, se d² ≤ 48², anda 8 px na direção do jogador já movido, com a posição normalizada no toro. Com d = 0, coleta sem dividir.
  - 8 px por passo é mais de 3 vezes a velocidade do jogador (2,4): uma Cinza que entra no raio sempre o alcança, e não precisa de campo de "atraída". A área de estado propôs 7,2; a de XP, 8 com campo. Fica 8, sem campo.
  - Teste: a 48 px a Cinza anda no 1º passo e a 48 + 1/16 não, por 600 passos; com o jogador parado, coletada no 5º passo; costura em x (jogador em x = 5 e Cinza em x = 1.160: 15 px).
- **Pool de pickups (X6). [documento, com os campos a mais (técnica)]**
  - Um pool de 512 para Cinzas e baús: Float32 `x`, `y`, `xAnt`, `yAnt`; Uint32 `valor` (XP da Cinza ou o índice do baú); Uint8 `tipo` (1 Cinza, 2 baú comum, 3 baú dourado). `xAnt` e `yAnt` servem à interpolação do voo e divergem dos campos listados no ADR-0002 §4 (registrar no ADR-0007).
  - Cheio, a Cinza nova soma o valor na Cinza viva mais próxima do ponto da morte (d² pelo delta toroidal; empate, menor slot), que mantém a posição; `juncoes` + 1 (no mundo, no hash). O valor em Uint32 não satura: uma Cinza junta pode acumular centenas de mortes. Nos nomes, "junção" e "juntar" (o glossário proíbe "fusão").
  - O baú nunca é recusado: com o pool cheio, a Cinza mais próxima do ponto de queda é juntada na vizinha dela e o slot vai para o baú.
  - Sem vida útil: a Cinza só sai por coleta ou junção. Medido em 20 min: pico de 392 Cinzas andando e 891 a 1.800 parado; a junção é necessária.
  - Teste: 512 Cinzas e um baú: o baú nasce e a soma dos valores se conserva; coletado + vivo = soltado.
- **Atributos e nível (P1, P2). [delegada]**
  - O nível sobe no cruzamento da XP, não na confirmação da carta: nível, FOR e hpMax mudam no passo do cruzamento. A carta só aplica o item.
  - FOR + 1 por nível até 20 (nível 15). Sem teto, a FOR chegaria a 34 no nível 29 e a Espada nv8 daria 18,4 por golpe; medido no protótipo, o DPS agregado no minuto 20 (caçando) fica em ≈ 6.000 sem teto, ≈ 3.950 com teto 30 e ≈ 3.060 com teto 20, este o mais perto do alvo de ≈ 2.000 do doc 10 sem mexer em números de B. Depois do teto, o ponto se perde: no MVP não há para onde ele ir.
  - HP: +2 de HP base por nível; a FOR não dá HP no MVP. O doc 03 §2.1 dá à FOR "+HP máximo leve", sem número; com o HP por nível, um golpe do Oco Grande no minuto 19 passa de 26% para 18% do HP máximo no nível 29.
  - Os atributos ficam no registro (Uint8 × 5: FOR, DES, INT, FÉ, VIG), gravados no início com o perfil de Aldric. Ficam no estado, e não derivados do nível, porque a árvore (F-010) e as maldições mudam a base por Vigília.
  - Em `vigilantes.json`: `hp_por_nivel` = 2 e `ponto_por_nivel.teto` = 20; saem as pendências.
  - Teste: do nível 15 ao 40, a FOR fica em 20; Espada nv1 com FOR 20 dá 17,25.
- **hpMax (P3). [delegada]** Campo `hpMax` (Float32, valor inteiro) no registro do jogador.
  - hpMax = ⌊(base × (100 + Σ%) + 50) / 100⌋, em inteiros, com o meio para cima; Σ% soma a Brasa Firme (15) e, na F-010, o nó da árvore, como na DN2 da D4. `dados.hpInicial` passa a sair da mesma função (150, as referências não mudam por isso).
  - Quando o máximo sobe: hp = fround(hp + (novo − antigo)), só se hp > 0, nunca acima do máximo.
  - Teste: tabela literal (nv1 150, nv2 152, nv15 182, nv29 214).
- **Recálculo do dano (P4). (técnica; a verificação refutou a 1ª proposta)** O pesquisador propôs calcular o dano a cada disparo com a FOR do estado. A D4 (DN1, §4) já trocou isso por uma tabela no boot, porque o cálculo raro roda no interpretador do V8 e aloca ≈ 14 B por passo (o E6 tem 3 B de folga).
  - Fica um derivado por Estado, fora do buffer, do hash e do save (como o anel de eventos): `danoVivo` (Float64Array, uma posição por vaga) e o dano da onda da União.
  - Uma função única, `recalcularDano(e, dados)`, com a mesma `gravarDanoPorAcerto` da D4, roda em: criar ou reiniciar o estado, cruzar nível, confirmar carta, abrir baú, aplicar a União e copiar um estado (`sincronizarDerivados`, para os testes e o save da F-008). Na F-006, também quando o Poder temporário entra ou sai.
  - Os golpes e ticks leem `danoVivo[vaga]`; `danoDoNivel` fica em `dados` como referência do boot (FOR 6, Poder 0). `dados` continua imutável e compartilhável entre estados.
  - Teste: depois de cada evento, o derivado é igual ao recalculado do zero (1.000 sequências); a cópia de um estado que já subiu de nível só fica igual com `sincronizarDerivados`; com FOR 6 e Poder 0, igual a `danoDoNivel` bit a bit; o pior numerador (FOR 34, Poder 55) fica abaixo de 2^53.
- **Poder e Armadura (P5).** Funções puras das passivas, sem campo: Poder = 8 × nível das Luvas (em %, no (100 + poderPct) da fórmula); Armadura = 4 × nível do Elmo.
  - A Armadura não reduz dano na F-005: B §4 põe a redução e o teste dela na F-007, e aplicar agora anteciparia a ordem entre a armadura e a Brasa Firme (pendência da F-007). O Elmo vale como requisito da União e aparece no debug e na carta. O comentário de `contato.ts` que diz "F-005 a F-007" passa a dizer F-007.
- **Simulação de 20 min (P6). [delegada]** Medida reprodutível, sem gate (protótipo `sim20` com a simulação real, jogador invulnerável):
  - níveis aos 5/10/15/20 min: parado 9/12/13/15; em círculo 4/16/28/41; caçando 15/26/35/46. O alvo do doc 10 §3.1 é 9/16/23/29. O nível depende quase só de quanto o jogador anda: o diretor repõe até o mínimo, então a taxa de mortes segue o DPS e o alcance;
  - DPS agregado (soma dos acertos por segundo, com overkill): ≈ 62 parado e 175 a 196 caçando no minuto 5 (alvo ≈ 60); ≈ 3.060 no minuto 20 com o teto de FOR 20 (alvo ≈ 2.000);
  - Facas e Círculo dão 1 a 4% do dano: com DES e FÉ em 3, não escalam. Recomendação ao balanceamento depois da F-010 (§9); a F-005 não muda números de B nem a curva.
  - A F-005 grava a simulação como script de medida (`scripts/`), e o ADR-0007 registra os números.

## 3. Level up

- **Cartas possíveis (L1).** Espada, Facas, Círculo (até nv8), Elmo e Luvas (até nv5) e a Bolsa de Almas. A União tem `uniao: true` e nunca é carta; depois dela, a Espada sai do sorteio (nem melhoria nem nova) e o Elmo continua até o nv5.
- **Sorteio (L2). [Q-22, com a mecânica (técnica)]**
  - Para cada carta, um u32 do subfluxo comparado com ⌈0,6 × 2³²⌉ = 2.576.980.378: abaixo, melhoria de item possuído; acima, item novo. Dentro da categoria, um índice uniforme ⌊u × k / 2³²⌋ sobre os candidatos em ordem fixa (armas por código, depois passivas por código), sem os já escolhidos na oferta.
  - Categoria vazia troca para a outra; as duas vazias dão Bolsa de Almas. A oferta tem sempre 3 cartas, e a Bolsa pode sair 2 ou 3 vezes (ela não é item).
  - Item novo só com vaga livre do seu tipo na build (`vagas.armas` = 5, com a União contando; `vagas.passivas` = 6). A vaga é conferida contra a build, não contra as outras cartas: com 1 vaga, duas armas novas podem aparecer, porque só uma será escolhida. No MVP a vaga nunca falta (3 armas e 2 passivas); o teste prova a regra com dados de teste de 2 vagas.
  - Ordem de consumo: 1 u32 da regra dos 35% (sempre consumido), depois 2 por carta (categoria e índice). Medido em 10.000 seeds: 0,6005 de melhorias nas cartas sem troca.
- **Os 35% (L3). [delegada; leitura de B para veto]** B diz que a passiva "aparece com 35%"; o doc 02 §6.2, que a chance "sobe para 35%". Medido: pela regra normal, o Elmo já aparece em 68 a 100% das ofertas com a Espada no nv8. Ler 35% como valor exato baixaria a chance para 0,349; fica o piso.
  - Regra: relógio ≥ 12:00 (43.200 passos; o relógio para no level up e na Fogueira), Espada no nv8, Elmo fora da build, sem a União e com vaga de passiva livre. Com isso, se o 1º u32 < ⌈0,35 × 2³²⌉ = 1.503.238.554, a carta 1 é o Elmo novo; as outras duas seguem a regra normal sem o Elmo. Sem a vaga, o u32 é consumido e nada é forçado.
  - "União pendente" = Espada nv8 sem o Elmo. A Espada abaixo do nv8 não ativa a regra.
- **Borda "Completa" (L4). [delegada]** Recebem a borda e a linha A10.LEVELUP.COMPLETA_UNIAO ({uniao} = o nome da Lâmina): o Elmo novo com a Espada nv8 na build, e a Espada para o nv8 com o Elmo na build, sem União nos dois casos. Calculado por função pura de `src/logica`, fora do estado.
- **RNG (L5). [documento, com a mecânica (técnica)]** Ao gerar a oferta do nível n, o subfluxo `levelup` é semeado com a seed e o índice n (`semear` do `rng.ts`, sem mudança). A oferta de um nível depende só da seed, do índice, da build e do relógio. Prova Node × Chromium: `.verify/referencia-f005.json` com o hash e as cartas da 1ª oferta do `nivel_tres`.
- **Quando nasce (L5). (técnica)** No fim da fase de pickups (§5) do passo que cruza, depois dos baús desse passo; numa fila, a oferta seguinte nasce na confirmação da anterior, sobre a build já com a carta escolhida. Uma oferta por vez fica no estado: tipo e item das 3 cartas (Uint8). O nível ofertado é derivado (nível − pendentes + 1).
  - Teste: em 1.000 seeds, depois de escolher Facas como nova, a 2ª oferta nunca traz Facas como nova e traz Facas nv2 em parte delas.
- **Efeito da escolha (L6). (técnica)** Melhoria de arma: nível + 1, timers mantidos (W16). Arma nova: 1ª vaga livre, nv1, timers em 0, age no passo seguinte. Passiva nova ou melhoria: entra nas 6 vagas de passiva, em ordem de aquisição, ou nível + 1. Bolsa: `almas` + 50. Depois, o recálculo do dano (P4). A validação de `equiparArma`, que aloca, não é usada: a oferta já garante a validade.
- **Almas (L7). (técnica)** O contador `almas` (Uint32, no estado) entra na F-005, somado só pela Bolsa (level up e baú). As Almas dos inimigos, o pickup de Alma e o HUD de Almas são da F-007.

### Modal (M1 a M5)

- **Parada (M1). (técnica)** A simulação fica parada enquanto houver modal na fila.
  - `avancar` para depois do passo que deixa a fila não vazia e passa a devolver o número de passos rodados. Se a fonte de comandos traz a escolha (roteiro), aplica e continua no mesmo laço; ao vivo, devolve.
  - `rodarFrameComPausas` ganha a 3ª condição, `modalAberto(e)`, lida do estado. Os passos restantes do quadro são descartados sem contar em `passos_perdidos`, e o acumulador volta a 0. Com o modal aberto, o render desenha com alfa = 1.
  - Nos testes, `avancarTudo` lança erro se rodou menos passos que o pedido: um teste antigo não pode seguir calado com a simulação parada. O `avancar(n)` do debug roda 0 passos com o modal aberto (a pausa do debug roda).
- **Entrada (M2). [delegada, divergência em negrito no §0]** A escolha entra por `confirmarModal(e, dados, k)`, função pura de `src/logica` aplicada entre dois passos: com um baú na frente da fila, fecha o baú (k ignorado); senão, aplica a carta k, tira um nível da fila e, se houver outro, gera a oferta seguinte. Valida k ∈ {0, 1, 2}. Um contador de modais confirmados (no estado) dá a ordem.
  - O replay guarda as escolhas na ordem dos modais: `FonteDeComandos.escolhaDoModal(ordem)` devolve −1 ao vivo (espera o jogador) ou o índice do roteiro. Os roteiros de teste e de referência passam a lista de escolhas.
  - Alternativa descartada (área de estado): a carta como borda nos `ComandosDoPasso`, com o valor nível × 4 + índice, como o ADR-0002 §12. Com o modal aberto não há passo para levar o comando; seria preciso rodar passos vazios, e uma fila de níveis pede várias escolhas sem passo entre elas.
  - Teste: o mesmo roteiro com 1 e com 5 passos por quadro dá o mesmo hash; k = 3 ou sem modal lança; dois níveis seguidos aplicam as duas cartas na ordem.
- **Fila (M3). [delegada]** Duas contagens no estado: baús por fechar e níveis pendentes. Baús primeiro (abertos em slot crescente, §4), depois os níveis. O modal do baú só mostra o que a abertura já aplicou na simulação. O `estado` do debug continua `VIGILIA` e o modal é lido em `levelUp` e `bau` (como a pausa da D4 P4).
- **Toques (M4). [delegada]** Toque = começar e soltar na mesma carta (a regra da P1 da D4). Nada selecionado: seleciona. Na selecionada: confirma. Em outra: troca. Fora: nada (nem desmarca nem fecha). A seleção é estado da cena, fora da simulação; só a confirmação chama `confirmarModal`. O tradutor guarda até 8 toques em carta por quadro, consumidos em ordem: a 8 fps, um toque duplo entre dois quadros conta como 2.
  - Sem atraso de tempo: a abertura solta todos os dedos, um toque começado antes nunca aciona carta, e a confirmação exige 2 toques novos. Entre duas ofertas da fila, a seleção zera, os dedos são soltos e as cartas refazem o fade de 200 ms. Reavaliar no iPhone (Q-29).
  - Sem swipe e sem toque único (doc 11 §3.7): B §3.5 dá só os dois toques.
- **Dedos, joystick e pausa (M5).** Fecha a D2 §9, que era recomendação: ao abrir, `pedirSoltarTodos()` e o tradutor no modo `modal`, que só testa os alvos do modal (as 3 cartas, ou o Continuar do baú); o joystick, o botão de pausa e o gesto de dois dedos não existem nesse modo, e o ícone de pausa continua desenhado sob o véu. Ao fechar, de volta ao modo `vigilia` com os dedos soltos; só um toque novo cria o joystick (`joystick.criados` conta). Se a pausa e o modal abrem no mesmo quadro, a pausa vem primeiro e o modal aparece ao fechá-la.
- **Layout (R6). [delegada]** Cena `Modal` (ADR-0002 §11) acima da Hud, criada com a Vigília e invisível até abrir.
  - Véu #0b0e14 a 60% (P6 da D4). Coluna de 3 cartas de mín(342, largura útil − 48) × 152 pt, 12 pt entre elas, com o fundo da última a 24 pt do inset inferior.
  - Na carta, com 16 pt de margem: ícone de 64 pt à esquerda e coluna de texto. Linhas: nome (16 pt); "Nível N" ou "Novo" (13 pt, sal); a linha funcional do nível alvo (15 pt, até 2 linhas); a lore (13 pt, itálico, até 2 linhas) ou "Completa: …". A Bolsa mostra nome e efeito. Cada linha é um `Text` criado uma vez e trocado com `setText`, com `idTexto` para o `textoAtivo`.
  - A10.LEVELUP.CONFIRMAR ("Toque de novo para escolher", 15 pt, osso) 20 pt acima da 1ª carta, só com seleção.
  - Fundo #0b0e14 a 85% e borda de 2 pt em osso; selecionada com contorno externo de 4 pt em brasa; "Completa" com borda e texto em #ffd166. Fade de 200 ms que não bloqueia toque.
  - Ícones geométricos provisórios, desenhados uma vez em textura: Espada, cunha em brasa; Facas, 2 losangos em sal; Círculo, anel em sal; Lâmina, cunha em brasa com arco; Elmo, semicírculo sobre retângulo em osso; Luvas, 2 retângulos arredondados em osso; Bolsa, disco em #e2652b.
- **Telemetria.** Na confirmação, a cena registra `level_up` (minuto, nível, cartas oferecidas, escolhida, reroll 0), fora da simulação (Q-30).

## 4. Baú e União

- **Baú como entidade (B3). [delegada; o crítico resolveu entre "só função" e "entidade"]** O baú é um pickup do pool (tipo 2 comum, 3 dourado) com o índice de queda no `valor`.
  - `soltarBau(e, dados, x, y, dourado)` soma o contador `bausSoltos` (no hash) e grava o índice. Nenhum inimigo da F-003 e F-004 solta baú: o Coroado o fará na F-008, que só troca o chamador. Aqui o baú entra pelo cenário `bau_uniao`.
  - Abre ao encostar: centros a ≤ 32 px (16 do jogador + 16 da meia-aresta), delta toroidal, ≤ sem ε, na fase de pickups, em slot crescente. O Ímã não o atrai. Não colide com obstáculos, não some e vai no save da F-008.
  - Foi preferido à "só função pura": o critério F-005.6 e a evidência pedem a União formada pelo baú, e o modal do baú ficaria sem teste no navegador. O custo é um tipo no mesmo pool.
- **Abertura (B1, B2). [Q-23, com a mecânica (técnica)]** Síncrona, no passo da coleta, antes de qualquer level up do mesmo passo:
  - a União é avaliada primeiro, sobre o estado da abertura: relógio ≥ 36.000 passos; uma entrada de `unioes.json` com a arma na build em nível ≥ 8, a passiva presente e o resultado fora da build. Se vale, o baú contém só a União e não gasta RNG. Uma União por baú: dos 2 baús das 15:00, só o primeiro aberto a leva;
  - senão, o subfluxo `baus` com o índice de queda sorteia a quantidade: a = ⌊u × 100 / 2³²⌋; a < 70 → 1, a < 95 → 3, senão 5. Os itens elegíveis (possuídos e abaixo do máximo; a União nunca) ficam numa lista fixa (armas pela vaga, depois passivas), e um embaralhamento parcial (Fisher–Yates) escolhe os min(N, M) primeiros, cada um com +1 nível. Os que faltam viram Bolsa de Almas;
  - o índice é o da queda, não o da abertura: os dois baús das 15:00 têm sorteios fixos, abertos em qualquer ordem;
  - o comum e o dourado usam a mesma função; o dourado é só visual (Q-23);
  - eventos no anel: `bau` (posição, índice, número de itens), um `item` por item (categoria, código, nível resultante) e `uniao`.
  - Teste: os limiares exatos da função de mapeamento (a = 69 → 1, 70 → 3, 94 → 3, 95 → 5) e a distribuição em 10.000 baús com ±1,5 / ±1,5 / ±0,8 p.p. (3,3 a 3,7 σ); com tudo no máximo, 5 Bolsas = +250 Almas; um baú solto em 18.000 passos e aberto em 36.001 com Espada nv8 e Elmo dá a União; a 35.999, nunca.
- **Modal do baú (B4). [delegada]** Mesmo véu e mesma cena das cartas: título A10.BAU.TITULO ("Baú"); uma linha por item com o nome e A10.LEVELUP.NIVEL, ou a Bolsa; com a União, A10.BAU.UNIAO ("{uniao} se forma."); botão Continuar de 288 × 72 pt, reusando A6.PAUSA.CONTINUAR. O Continuar fecha pelo `confirmarModal` (M2). Sem animação no MVP: a animação da União de 1,5 s fica para a arte.
- **Números da União (U1). [W18 da D4, conferidos]** A base sai do boot em inteiros: 10 × 140 × 150 / 10.000 = 21 (erro de boot se a conta não for inteira). A tabela usa `danoPorAcerto(21, …)`, e não a base 14 com um fator de 150, que deixaria só 1,27× de folga contra 2^53.
  - Escala FOR B / DES C = 1,0 × 0,6 + 0,75 × 0,3 = 0,825. Golpe: 17,325 com FOR 6 (Float32 17,325000762939453); com FOR 20 e Luvas nv5, 34,65 × 1,4 = 48,51.
  - O F-005.6 dizia "base da Lâmina = base da Espada nv8 × 1,5 (±1%)": a base é 21 = 14 × 1,5, mas o golpe é 1,83 vezes o da Espada nv8 (9,45), porque a escala sobe de 0,675 para 0,825. O critério passa a testar a base 21 e o golpe 17,325 (§8).
  - `criarTabelaDeArmas` deixa de pular a União: a linha (União, nv1) copia golpes, formas, alcance, estocada e intervalo da linha (Espada, nv8) por `golpes_de` (uma só fonte); recarga 60; `nivelMax` 1.
- **Entrada da União (U2). [documento, com a mecânica (técnica)]** `aplicarUniao(e, dados, indice)`, porta única (baú agora, Forja na F-008): na vaga da arma de origem, código da Lâmina, nível 1 e todos os timers em 0; uma sequência pendente da Espada é descartada; as passivas não mudam. Como o modal congela o passo, a Lâmina golpeia no passo seguinte ao Continuar: golpes em t + 1, t + 13, t + 25, t + 37 e o ciclo seguinte em t + 61.
- **Onda sem depender do id. (técnica)** A presença de `base.onda` na arma liga colunas da tabela (dano, largura, velocidade e vida da onda). O golpe consulta a vida da onda > 0, nunca o código da Lâmina. Teste com arma sintética: a Espada com outro id e um bloco `onda` cria ondas; sem o bloco, não cria.
- **Geometria da onda (U3). [delegada]**
  - Origem: o centro do jogador no passo do golpe. Orientação: a mira (dirX, dirY) desse passo (W1). A onda fica no chão: não segue o jogador nem gira.
  - Forma do acerto: quadrado de 32 × 32 px (meia-largura 16 na perpendicular e meia-profundidade 16 ao longo da mira), cujo centro está a d(t) = 384 × t / 60 px da origem, para t = 1 a 15. É o teste exato de círculo × retângulo da estocada (W8), com ≤ e sem ε.
  - "3 corpos" é o percurso do centro (15 × 6,4 = 96 px), como "3 corpos de comprimento em 15 passos" do F-005.6. A borda da frente chega a 112 px; um Oco é acertado com o centro até 128 px e um médio até 136 px. A onda quase não amplia o alcance (1,56 inimigos novos por golpe, contra 27,25 do golpe, no cenário horda): o ganho é o dano extra nos que o golpe já pega.
  - Em inteiros (384 × t / 60) porque 6,4 × t em double difere em 1 ulp em 5 dos 15 passos (t = 3, 6, 7, 12 e 14). Vida = 3 × 60 / 12 = 15.
  - Os 4 golpes (ida, volta, estocada, ida) criam uma onda cada, pela mesma regra: no máximo 2 vivas por Lâmina.
- **Acertos da onda (U4).** Cada inimigo uma vez por onda: bitset de 512 bits (16 Uint32) por onda, indexado pelo slot. `removerInimigo` limpa o bit do slot em todas as ondas vivas, então um inimigo novo no mesmo slot nunca herda a marca. As palavras usam `&`, `|` e `<<` em linha (o bit 31 é um int32 negativo; nenhuma palavra atravessa chamada).
  - Dano 8 × (1 + Poder) × 0,825 (6,6 com FOR 6; Float32 6,599999904632568), fixado na onda na criação, como a faca (W13). Os mortos (hp ≤ 0) no meio da fase ficam fora (M1 da D4).
  - O acerto grava `acerto` com a arma da Lâmina e a forma nova `onda`; a N7 soma no número do inimigo (golpe 17,3 + onda 6,6 = "24"). Sem Sal, sem empurrão.
- **Pool e ordem (U5). (técnica)** Pool de efeitos de chão de 64 (ADR-0002 §4): Float32 x, y, dirX, dirY, dano; idade; arma; bitset. `limiteDeProjeteis` passa a somar projéteis e efeitos vivos contra 200 ou 400, na salva das Facas e na criação da onda. Recusa: nenhuma onda, nenhum evento, `efeitosRecusados` + 1 (no hash; no debug, `recusados.efeitosDeChao`, porque `recusados.efeitos` já conta o pool de render de 16).
  - Fase nova 7b' (ondas em slot crescente), depois dos projéteis (7b) e antes das vagas (7c): a onda criada em 7c no passo t só age em t + 1, como a faca nova; a criação fica dentro do golpe, depois do evento `golpe`.
- **Visual (U6). [delegada]** Um membro por slot do pool na camada das armas (de 421 para 485). Moldura `quadrado` de 32 × 32 pt na posição do acerto, girada pela mira, em brasa #ffb347, alpha 0,4 até a idade 8 e reto até 0 na 15; a posição é interpolada pela mesma conta, com a idade em passos. Fica abaixo dos ≤ 50% da D4 porque, empilhada sobre a cunha a 0,5, a brasa compõe a ΔE 12,5 do jogador (< 14); a 0,4, 15,3.
- **HUD e pausa da União.** A vaga da Espada passa a mostrar o ícone da Lâmina. Na pausa, a linha da União mostra só o nome (o nível fica escondido: "Nível 1" sugeriria uma arma fraca). `build.armas` lista a Lâmina na vaga 0 e `build.passivas` mantém o Elmo.
- **Telemetria.** A cena registra `arma_uniao` ao ler o evento `uniao` (Q-30).

## 5. Estado, ordem do passo e determinismo

- **Layout v5 (E2). (técnica)** Tudo no buffer e no hash, seções em múltiplos de 4 bytes:
  - jogador: `hpMax` (Float32);
  - progressão (Uint32): `nivel`, `xp`, `niveisPendentes`, `bausPorFechar`, `modaisConfirmados`, `almas`, `xpTotal` (para o debug e a telemetria);
  - atributos (Uint8 × 5 + 3 reservados);
  - passivas: `codigo[6]` e `nivel[6]` (Uint8), em ordem de aquisição;
  - oferta: `tipo[3]` e `item[3]` (Uint8; tipos 1 melhoria de arma, 2 arma nova, 3 melhoria de passiva, 4 passiva nova, 5 Bolsa);
  - mundo: `juncoes`, `bausSoltos`, `efeitosRecusados`;
  - pool de pickups (512) e pool de efeitos de chão (64);
  - estimado ≈ 68 KB (era 42.988 B); o valor exato fica travado em `estado.test.ts`, com cada offset. `hashPorSecao` ganha `pickups` e `efeitos`.
- **Ordem do passo v5. (técnica)** 1. relógio; 2. jogador; 3 a 6. horda, grade, separação e obstáculos; 7a. grade das armas; 7b. projéteis; **7b'. ondas**; 7c. vagas; 7d. mortes (`matarInimigo` solta as Cinzas); **7e. pickups: xAnt = x, Ímã, voo, coleta das Cinzas e abertura dos baús em slot crescente, soma da XP, cruzamento dos níveis, e então a oferta, se a fila de níveis começou neste passo e não há baú na frente**; 8. contato; 9. rotação; 10. diretor. O passo que abre um modal termina inteiro; o seguinte só roda depois da fila vazia.
  - A Cinza solta em t já participa da fase 7e de t.
- **Desligar as Cinzas. (técnica)** Bit `CENARIO.semCinzas` = 4 no cabeçalho, ligado pelo campo obrigatório `cinzas: false` das receitas (`horda`, `horda_rotativa`, `sem_horda`, `tres_armas`): sem Cinzas, sem XP e sem level up. O `tres_armas` subiria de nível no passo 597 e travaria o F-004.5, a E7 e o E6. A Vigília normal fica com as Cinzas.
- **Referências e regressão v4 (E2). (técnica)** Sem toques, não há level up nos 1.000 passos de referência (a seed 1 junta 0 XP; a 424242, 4). As referências 901adb6d e 9cdc2c63 mudam só pelo layout e são regravadas no ADR-0007 e na evidência da F-001.
  - `regressao-v4.test.ts`, como a v3: o hash dos campos que já existiam no v4 é igual ao do código da F-004 (a árvore do commit `9271b10`, extraída à parte) na Vigília normal (passo 1.000), no horda (1.800) e no horda_rotativa (3.600), nas seeds 1 e 424242. Nos cenários antigos, a palavra 7 do cabeçalho é comparada com o bit `semCinzas` mascarado; a versão fica de fora. Sem a máscara, a regressão reprovaria código certo.
  - Com a build inicial e as Cinzas ligadas, os campos v4 também são iguais aos da F-004 até o passo anterior ao 1º level up.
  - Referências novas, gravadas pelo Vitest: `.verify/referencia-f005.json` (`nivel_tres`: hash e cartas no passo 1 com a 1ª oferta aberta, e hash depois das duas escolhas) e `.verify/referencia-uniao.json` (passo e hash da captura da União, §8).
- **Laço quente (E4). (técnica)** Coleta, Ímã, voo, junção, soltar Cinza, onda e bitset ficam em linha, sem double nem u32 ≥ 2³⁰ atravessando chamada; as funções raras (soltar baú, abrir baú, gerar oferta, confirmar) usam rascunhos (`Int32Array` dos elegíveis, `Uint32Array` do subfluxo).
  - `semear` do `rng.ts` fica como está (as referências dependem dele). A frio, ele aloca ≈ 890 B por chamada no interpretador do V8 (medido; 1,3 B a quente). Isso acontece ≈ 30 vezes por Vigília. Em vez de reescrever o gerador, o ADR-0007 registra uma medida a frio da geração de uma oferta (≤ 2 KB), como exceção medida, sem lista branca no E6.
  - E6 ganha variantes (≤ 16 B por passo, somando todas as funções de `src/`, 9.000 passos de aquecimento): (a) Cinzas ligadas com o pool cheio e junção, um jogador que anda em blocos e escolhas pelo roteiro, com pelo menos um level up na janela medida; (b) a União no lugar da Espada, com Facas e Círculo no nv8, na linha 19.
- **Sem gates de tempo novos.** As medidas de desempenho da F-005 só registram (draw calls: 9 na F-004, 11 com a pausa; estimadas 13 a 16 na F-005, longe de 150).

## 6. Render, HUD e cores

- **Camada "mundo" (R1). [D3 §9, decidida aqui]** `SpriteGPULayer` de 566 membros (54 obstáculos + 512 pickups), criada no `create` da Vigília com a configuração da horda, com o plano B `image` na mesma interface. Ordem de desenho: mundo (obstáculos, depois pickups) < mortes < horda < status < armas < jogador < dígitos < Hud. As Cinzas ficam abaixo da horda, como o ADR-0002 §11.
  - `prepararMundo` (puro): obstáculos na cópia mais próxima da câmera, com as mesmas contas de hoje; `prepararPickups`: interpolação entre xAnt e x pelo delta toroidal, arredondada ao pixel, escala e cor por uma tabela da faixa de valor, tudo em linha.
  - Teste: a posição dos obstáculos é igual à de hoje em 2.000 câmeras; gpu × image no spec.
- **Formas (R2). [delegada; D3 §9]** Cinza: moldura nova `cinza`, losango de 12 × 16 pt com a ponta para cima, em área livre do atlas, sem contorno, em 3 escalas pela faixa do valor (0,75 azul, 9 × 12 pt; 1,0 verde; 1,25 vermelha, 15 × 20 pt). Distingue-se do círculo de 32 pt da massa, do quadrado de 48 pt dos médios, da faca (16 × 4 em sal) e do marcador do Sal (8 × 8 em sal). Baú: quadrado de 32 pt, bronze #b08d57 (ΔE mínimo 17,2 das cores reservadas) e ouro escuro #a8841f com contorno (18,4).
- **Cores (R3).** O teste de cores ganha o bloco das Cinzas e dos baús: ΔE ≥ 14 contra as reservadas e os inimigos; ≥ 18 entre as Cinzas, e ≥ 17,5 em deuteranopia e protanopia; contraste ≥ 3:1 contra o fundo. Os pares abaixo entram na lista de aceitos com o motivo: Cinza vermelha × obstáculo (2,43:1: a Cinza é pequena e fica acima do obstáculo plano) e, em deuteranopia, Cinza vermelha × Oco (ΔE 3,7) e Cinza verde × Oco e Oco Grande (14,8 e 13,5), com a forma e o tamanho como 2º canal. Nenhuma cor da Q-27 muda.
- **Barra de XP e nível (R4). [delegada]** Barra de 8 pt em topo + 40, de esquerda + 80 até a largura − direita − 64; trilho #0b0e14 a 35% e preenchimento #5aa9e6 na proporção xp / custo(nível), por uma `Image` escalada. À direita, "Nv {nivel}" (A5.HUD.NIVEL, 15 pt, osso), trocado só quando o nível muda.
  - A pendência 10 recomendava os glifos da N4. O nível tem palavra ("Nv") e muda poucas vezes; um `Text` basta. Os glifos ganham ":" e "." quando entram números que mudam a cada quadro: Almas (F-007) e relógio (F-008).
  - Sem faísca e sem animação de "Cinza subindo para a barra" (doc 11 §5): ficam para a arte, depois da F-010, e a faísca nunca em branco (Q-27).
- **Vagas no HUD (R5). [delegada; pendência 9]** Linha de 12 vagas de 28 pt em topo + 80, centrada: 5 armas, a Relíquia (sempre vazia) e 6 passivas, 2 pt entre vagas do mesmo grupo e 6 pt entre grupos. Vaga vazia: contorno de 1 pt em osso a 30%. Os ícones são os do modal (§3) a 28/64, redesenhados só quando a build muda. Faixas reservadas: banda de 72 pt do botão de pausa (relógio e Hora na F-008; a barra de XP aqui; HP e stamina nas F-006 e F-007); ícones em topo + 80; Almas e Frascos em topo + 116. O painel do `?debug=1` desce para topo + 144.
- **Pausa (pendência 9).** A build da pausa ganha as passivas: 11 pares de `Text` (5 armas e 6 passivas), nome e A6.PAUSA.NIVEL, as passivas depois das armas; a Lâmina sem o nível.

## 7. Dados, schemas e textos

- **`src/dados/progressao.json` (novo, com schema):** curva (10, 8, 6 décimos), valores e faixas das Cinzas, Ímã (1,5 corpo), velocidade da Cinza (15 corpos/s), coleta (0,5 corpo, a hitbox do jogador), pool de pickups (512), sorteio (60%, 35%, minuto 12), baús (70/25/5, minuto 10, 1/3/5 itens), Bolsa (+50 Almas) e a distância de abertura do baú. O boot confere tudo e erra se faltar número.
- **`vigilantes.json`:** `hp_por_nivel` = 2 e `ponto_por_nivel.teto` = 20; saem os `pendentes` e as pendências da F-005.
- **`armas.json`:** a União deixa de ser pulada na compilação; a onda ganha `base.onda` com largura 1 corpo, velocidade 12 corpos/s, comprimento 3 corpos e dano 8 (a vida sai de comprimento ÷ velocidade).
- **`cenario.schema.json`:** campos obrigatórios `cinzas` (boolean), `passivas` ([] por padrão), `baus` ([] de {dx, dy, dourado}), `xp_inicial` (0) e `relogio_inicial_s` (0; > 0 exige `linha_fixa`, senão a escala por minuto saltaria). A lista `armas` continua recusando a União.
- **Textos novos:** A10.BAU.TITULO ("Baú") e A10.BAU.UNIAO ("{uniao} se forma."). O resto já existe. Glossário: "melhoria" (nunca a palavra proibida em inglês), "junção" (nunca "fusão"), "Cinza" (nunca "gema").

## 8. Cenários, debug, critérios, evidências e testes

- **Cenários (E1). [delegada]**
  - `nivel_tres`: diretor desligado, tutoriais vistos, só a Espada nv1, `xp_inicial` = 29. No passo 1, a XP cruza 10 e 19: nível 3 e duas ofertas na fila. Serve ao F-005.4 e à evidência do modal. Prefere-se dar XP no passo 1 a esperar mortes e coletas: o jogador parado não alcança as Cinzas que a Espada solta a 64 px.
  - `bau_uniao`: linha fixa 6 (a do `tres_armas`), jogador invulnerável, relógio inicial 600 s, Espada nv8, Elmo nv2, `cinzas: false` e um baú dourado 96 px à frente do início. O spec anda para cima pelo roteiro até o baú.
- **`__GAME_DEBUG__`. (técnica)** `jogador` ganha `nivel`, `xp`, `xpParaSubir`, `xpTotal`, `niveisPendentes`, `atributos`, `poderPct`, `armadura`, `hpMax` e `almas`. `build.passivas`: [{ id, nivel }]. `levelUp`: { aberto, pendentes, nivel, cartas: [{ tipo, item, nivel, completaUniao }], selecionada }. `bau`: { aberto, itens }. `vivos.pickups`, `vivos.efeitosDeChao`, `juncoes`, `recusados.efeitosDeChao`. Só no build de debug: `pickups()` e `efeitosDeChao()`. `memoriaEstimadaMB` soma os membros novos (630 × 168 B, na CPU e na GPU) e o estado novo. Nenhum gancho de escrita: as escolhas são por toque ou pelo roteiro.
- **Critérios no `feature_list.json`:**
  - F-005.1: a tabela literal de n = 1 a 30 e os dois valores de B.
  - F-005.2 (o "como" pedia uma build impossível com 5 itens): seeds 1 a 10.000 numa build de 3 itens melhoráveis (Espada nv2, Facas nv1, Luvas nv1) e 2 novos (Círculo e Elmo), relógio 0 e 13:00. (a) Fração de melhorias de 0,60 ± 1,5 p.p. nas cartas 1 e 2, que nunca trocam; a carta 3 a 0,664 ± 2 p.p. (analítico 0,6 + 0,4 × 0,16). (b) Nenhuma oferta repete item. (c) Com dados de 2 vagas de arma cheias, nenhuma arma nova. (d) A 13:00 com a Espada nv8, o Elmo na carta 1 em ≥ 35% (piso, L3); às 11:59, a oferta é idêntica à da regra desligada; sem vaga de passiva, nunca forçado. (e) Os limiares exatos (60% e 35%) por valor injetado. Mutações que reprovam: 50/70, sem troca de categoria, 35% por carta, regra antes das 12:00, arma nova sem vaga, Elmo sem vaga, `<=` no lugar de `<`.
  - F-005.3: 1.000 baús com seeds diferentes, relógio ≥ 36.000, Espada nv8 e Elmo: União em 100%; o mesmo a 35.999: nunca; o baú solto antes das 10:00 e aberto depois.
  - F-005.4: o roteiro do `nivel_tres` (abaixo).
  - F-005.5: Ímã a 48 px atrai e a 48 + 1/16 não; os limiares exatos dos baús e a distribuição 70/25/5 em 10.000; a Bolsa (+50) com tudo no máximo (3 Bolsas em 1.000 seeds) e com só um item restante (1 carta e 2 Bolsas).
  - F-005.6: base da Lâmina 21 = 14 × 1,5 (±1%) e golpe de 17,325 com FOR 6; recarga de 60 passos; golpes e formas do nv8 com 12 passos entre eles; exatamente 1 onda por golpe (evento `onda`); onda de 6,6 que acerta cada inimigo uma vez nos 15 passos e acerta a 128 px de centro e não a 128 + 1/16 (Oco); a União na vaga da Espada, com o Elmo equipado.
  - **F-005.7 (novo, Playwright):** no `bau_uniao`, andar até o baú; `ultimosEventos` com `bau` e `uniao`; o modal com A10.BAU.TITULO; depois do Continuar, `build.armas[0]` é a Lâmina e `build.passivas` tem o Elmo; o passo e o hash do 1º golpe da Lâmina são os da referência Node × Chromium.
- **F-005.4 (Playwright).** `?seed=<VDC_SEED>&cenario=nivel_tres&teto=300`, só o toque em Acender:
  1. esperar `levelUp.aberto`, `pendentes` = 2 e `jogador.nivel` = 3; o hash e as cartas são os de `referencia-f005.json`;
  2. por 30 quadros, passo, relógio e hash parados; o botão de pausa e o gesto de 1.000 ms sem efeito; um toque na área do joystick não cria joystick;
  3. tocar a carta 1: `selecionada` = 1 e A10.LEVELUP.CONFIRMAR no `textoAtivo`; tocar a carta 0: a seleção troca; tocar fora: nada muda; tocar a carta 0 de novo: confirma, `pendentes` = 1;
  4. selecionar e confirmar a carta 0 da 2ª oferta;
  5. `aberto` = false, `jogador.nivel` = 3, `build` com os itens das duas cartas, o passo volta a andar, e o hash depois das duas escolhas é o da referência.
  - Os toques usam as caixas das cartas (`src/entrada/alvos.ts`, sem Phaser), com espera pela mudança de `selecionada` entre toques (≈ 8 fps). Sem gate de tempo: espera por condição, com timeout folgado.
- **Evidências (E3).**
  - `production/evidencias/F-005/modal-390x844.png`: a 1ª oferta do `nivel_tres` com a carta do meio selecionada, depois do fade (≥ 200 ms + 2 quadros).
  - `production/evidencias/F-005/uniao-390x844.png`: o `bau_uniao` depois do Continuar, no passo da referência: o 1º passo ≥ fechamento + 60 com uma onda de idade 5 a 8 e ≥ 2 acertos de onda nos últimos 8 passos (achado pelo Vitest, gravado em `referencia-uniao.json`); pausa do debug, 2 quadros, captura. Aparecem a Lâmina no HUD, a cunha, a onda em brasa, os números e o Elmo na build.
  - Como a E7 da D4, a captura não é comparada byte a byte (texto com fonte do sistema difere entre motores): o `verify.sh` confere 390 × 844, e o spec confere o hash e as cartas no passo da captura.
- **Outros testes:** o mesmo roteiro com escolhas em 1 e 5 passos por quadro (hash igual); a tabela de hpMax; a FOR no teto; Poder e Armadura por nível; o derivado do dano contra o recalculado; a onda no toro (costura em x e em y); o bitset com slot reaproveitado; `matarInimigo` em cenário `semCinzas`; o `textoAtivo` de cada carta e da Bolsa; a camada mundo nos dois modos; o lint do glossário nos nomes novos.

## 9. Recomendações para as features seguintes (não decididas aqui)

- **F-006:**
  - Aparo, Frasco, swipe e toque duplo não existem no modo `modal` do tradutor; uma esquiva ou aparo pendente não atravessa o modal. Se o congelamento de 80 ms e a abertura de um modal caem no mesmo passo, o congelamento roda depois que o modal fecha;
  - o Poder temporário (+15% da esquiva perfeita) entra como campo do registro e dispara o recálculo do dano (P4) na entrada e na saída; as facas e as ondas no ar mantêm o dano fixado;
  - no Contra-ataque, a salva da União é a sequência de 4 golpes, e cada golpe cria sua onda, com o ×2 fixado na criação, como na faca;
  - os códigos de `EVENTO` e `FORMA` só crescem no fim.
- **F-007:**
  - a redução A/(A + 20), teto de 75%, com a Armadura derivada do Elmo (P5), e a ordem com a Brasa Firme; o hpMax de P3 é a base da Brasa Firme e da cura do Frasco, com o mesmo arredondamento;
  - as Almas dos inimigos (50% no Oco, fluxo `drops`) e o pickup de Alma somam no contador `almas` da F-005; o pickup de Alma entra no pool de 512 com tipo próprio; o HUD de Almas em topo + 116 com os glifos da N4 e "." de milhar;
  - em APAGANDO, nenhuma morte nova solta Cinza nem soma XP; o Resultado mostra `nivel` do estado.
- **F-008:**
  - o Coroado chama `soltarBau` na morte (1 por Coroado; dourado às 10:00) e solta uma Cinza de 25 pelo caminho normal; a massa que a arena mata e os Coroados que viram cinza no marco vencido não soltam Cinza nem baú;
  - a Forja usa `uniaoDisponivel` e `aplicarUniao` e cobra o custo de `unioes.json`;
  - na Fogueira o passo roda: a fase de pickups continua e um level up pode abrir; o modal vem antes das ações da Fogueira; ondas e timers de arma ficam parados se as armas param;
  - o save grava o buffer da F-005 inteiro (progressão, atributos, passivas, oferta, pickups, efeitos de chão) e chama `sincronizarDerivados` na carga; com uma oferta aberta, a retomada reabre o modal antes de qualquer passo;
  - o baú de "1 item" com tudo no máximo vira Bolsa, como aqui; registrar a medida do U9: sem elites, a União só é alcançável às 10:00 (com a Espada nv8 e o Elmo antes do impulso dos 35%) ou às 15:00, contra os "minutos 12 a 15" do doc 10 §3.1;
  - o relógio no HUD com os glifos da N4 e ":".
- **F-009:** o HP do Lanterneiro lê `nivel` do estado no passo em que a arena se forma, já com os pendentes; a onda é acerto de arma (Postura +2 por acerto com dano > 0) e testa o retângulo contra a caixa do chefe; o multiplicador por alvo é lido no mesmo ponto de acerto; A_FOME não soma XP.
- **F-010:** a pausa automática com o modal aberto não faz nada (já está parado), e os dedos são soltos ao voltar; o nó da árvore de HP entra no Σ% do hpMax (P3); "Mãos de aprendiz" e o perfil de outros Vigilantes usam os parâmetros de progresso inicial (o campo `xp_inicial` e os atributos), sem palavra nova no cabeçalho; a animação da União, a faísca da barra e a Cinza subindo ficam para a arte.
- **Balanceamento, depois da F-010:**
  - Facas e Círculo não escalam com DES e FÉ em 3 (P6). Saídas: as armas de Aldric escalarem também com o atributo mais alto, bases maiores, ou a distribuição manual de pontos;
  - se os níveis-alvo do doc 10 valerem para quem caça, reduzir o XP por inimigo ou o mínimo na tela, nunca a curva de B.

## 10. O que muda em dados e documentos

**No commit que registra este documento (`feature_list.json`):**

- F-005: `pendencias_antes_de_comecar` vira "Resolvidas em design/decisoes-F-005.md"; o "como" do F-005.2, F-005.4, F-005.5 e F-005.6 segue a §8; o F-005.7 entra; as evidências passam a `modal-390x844.png` e `uniao-390x844.png`.
- F-006 a F-010: as recomendações da §9 entram nas pendências de cada uma.

**A F-005 aplica ao implementar:**

- `progressao.json` e o schema; `vigilantes.json`; `armas.json` (a onda); `cenario.schema.json` e as receitas (`cinzas`, `passivas`, `baus`, `xp_inicial`, `relogio_inicial_s`; os cenários `nivel_tres` e `bau_uniao`); `pt-BR.json` (A10.BAU.TITULO e A10.BAU.UNIAO);
- o comentário de `contato.ts` sobre a armadura (F-007);
- `scripts/` com a simulação de 20 min como medida;
- **ADR-0007**, com as decisões técnicas, as referências novas e as divergências:
  - do ADR-0002 §4: os campos `xAnt` e `yAnt` no pool de pickups; o pool de efeitos de chão com bitset; `juncoes`, `bausSoltos` e `efeitosRecusados` no mundo;
  - do ADR-0002 §9 e §12: o level up e o baú fora da máquina de estados e a escolha fora dos `ComandosDoPasso` (M2);
  - do ADR-0002 §14: os cenários `nivel_tres` e `bau_uniao`;
  - da D4 W3 (o Ímã de centro a centro) e da D4 W18 e §9 (o alpha da onda em 0,4);
  - do doc 03 §2.1 (a FOR sem HP) e do doc 11 §3.7 e §5 (sem swipe, toque único, faísca e som);
  - a regra do laço quente com a medida a frio da oferta.

## 11. Revisão adversarial

(Preenchida depois da revisão.)
