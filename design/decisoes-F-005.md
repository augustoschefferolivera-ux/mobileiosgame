# Decisões da F-005 "XP, level up, passivas e União"

- **Status:** rascunho em 2026-10-11, pelo mesmo método das F-003 e F-004. Já passou pela revisão adversarial, e os achados confirmados estão aplicados (§11). Aguarda o seu veto antes da implementação (Etapa 2).
- **Como foi feito:**
  - levantamento: um workflow com 4 pesquisadores, cada um seguido de um verificador cético, e um crítico de completude. As áreas foram: XP, Cinzas e atributos; level up e modal; baú e União; estado, render e testes. Os verificadores conferiram as citações, procuraram a resposta em todas as fontes e refizeram as contas e as medições;
  - saíram 174 perguntas dos pesquisadores, 12 dos verificadores e 20 do crítico. 42 delas os documentos já respondem, no todo ou em parte (§1). Os verificadores revisaram 147 propostas e corrigiram 19. A verificação da área de estado e render foi parcial: 27 das 41 perguntas não foram revistas a fundo, e a revisão adversarial (§11) cobriu esse buraco;
  - o crítico achou 16 conflitos entre as áreas e 11 contradições entre fontes. Por exemplo, as áreas propuseram três unidades de XP diferentes e dois jeitos de entrar a escolha da carta. Cada conflito está resolvido no lugar da decisão, com o motivo;
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
| 1 | teto de FOR; HP por nível (brief §11.3) | §2, P1 e P2 |
| 2 | level up solta os dedos e esconde o joystick (D2 §9) | §3, M5 |
| 3 | camada GPU "mundo"; forma das Cinzas; hpMax e arredondamento | §6, R1 e R2; §2, P3 |
| 4 | União com os números da W18 (vaga, pool de 64, quem já acertou, visual, N7) | §4, U1, U2, U4 a U6 |
| 5 | geometria da onda | §4, U3 |
| 6 | Cinzas saem de `matarInimigo` com causa arma | §2, X3 |
| 7 | atributos, nível, XP e Poder; recálculo do dano; Luvas; teto de FOR | §2, P1, P4 e P5 |
| 8 | simulação de 20 min (alvos de DPS e de nível) | §2, P6; §4, U7 |
| 9 | ícones das vagas no HUD, passivas na pausa, pausa sem efeito no level up | §6, R5; §3, M5 |
| 10 | HUD numérico com os glifos da N4 | §6, R4 |

## 0. O que foi decidido (para vetar de relance)

### 0.A Decisões de design e divergências (para vetar)

Em negrito, o que diverge de um documento aprovado ou muda uma leitura anterior.

| # | Decisão | Valor |
|---|---|---|
| X1 | XP e custo | XP inteira. O custo do nível n é ⌈XP(n)⌉: 10, 19, 29, 40, 52, …, 131 (nv10), …, 379 (nv20). Sem teto de nível no jogo (teto técnico 255) |
| X2 | Cinzas | 1 Cinza por morte por arma, sempre (100%), com o XP do tipo: Oco 1, Oco Grande e Noviça 5, convertido 10, Coroado 25. Cor pela faixa: azul abaixo de 5, verde de 5 a 24, vermelha a partir de 25 (Q-27) |
| X4 | Ímã e coleta | 48 px de centro a centro (**a W3 da D4, acerto até a hitbox, não vale para o Ímã**, que é zona). A Cinza no raio voa 8 px por passo e é coletada a ≤ 16 px; parado, a 48 px, no 5º passo |
| P1 | Teto de FOR | **20, no nível 15** (+1 FOR automático por nível; depois do teto, o ponto se perde) |
| P2 | HP por nível | +2 de HP base por nível; **a FOR não dá HP no MVP (o doc 03 §2.1 dá "+HP máximo leve", sem número)** |
| P3 | hpMax | ⌊(base × (100 + Σ%) + 50) / 100⌋, os percentuais somados: 150 (nv1), 152 (nv2), 182 (nv15), 214 (nv29). Quando o máximo sobe, o HP atual sobe o mesmo tanto |
| P5 | Armadura do Elmo | só registrada (4 por nível); **não reduz dano na F-005**: a redução A/(A + 20) é da F-007 (B §4) |
| P6 | Simulação de 20 min | medida, sem gate. Níveis aos 5/10/15/20 min: parado 9/12/13/15; em círculo 4/16/28/41; caçando 15/26/35/46 (alvo do doc 10: 9/16/23/29). **Os alvos de nível e de DPS do doc 10 não são gate**; Facas e Círculo dão 1 a 4% do dano (risco para o balanceamento) |
| L2 | Sorteio | 3 cartas; cada uma é melhoria com 60% e item novo com 40%, sem repetir item (Q-22); categoria vazia troca; as duas vazias dão Bolsa de Almas (+50), que pode repetir |
| L3 | Os 35% da União | **lidos como piso** (leitura de B §3.9): depois das 12:00, com a Espada nv8, sem Elmo e sem União, a 1ª carta é o Elmo com 35%; a regra normal já o mostra em 68 a 100% das ofertas, e "exatamente 35%" baixaria a chance |
| L8 | Borda "Completa" | borda e linha "Completa: Lâmina do Juramento Eterno" no Elmo novo com a Espada nv8, e na Espada para o nv8 com o Elmo, sem União |
| M2 | Entrada da escolha | **fora do passo e dos `ComandosDoPasso`, por `confirmarModal`, com o replay guardando as escolhas na ordem dos modais. Diverge do ADR-0002 §12 (carta como borda do comando) e §9 (LEVEL_UP na máquina de estados)** |
| M4 | Toques no modal | 1º toque seleciona; toque na selecionada confirma; em outra carta, troca; fora, nada. Sem atraso de tempo. **Sem swipe e sem toque único (doc 11 §3.7)** |
| M5 | Dedos, joystick e pausa | ao abrir o modal, todos os dedos são soltos e o joystick some (adota a D2 §9); sem joystick, botão de pausa nem gesto até fechar; depois, só um toque novo cria o joystick |
| B1 | Conteúdo do baú | 1 (70%), 3 (25%) ou 5 (5%) itens, cada um +1 nível num item possuído, ao acaso, sem escolha (Q-23). [delegada] itens distintos no mesmo baú; o que falta vira Bolsa de Almas, como a Q-22 (3) e o F-005.5. Nunca item novo |
| B2 | União no baú | relógio ≥ 10:00 na abertura, Espada nv8 e Elmo, sem União → o baú contém só a União. Um baú de 5:00 aberto depois das 10:00 também conta. Uma União por baú |
| B3 | Baú na F-005 | entidade no pool de pickups, aberta ao encostar (≤ 32 px), com modal que congela o passo; **nunca recusada com o pool cheio (diverge do "pool cheio = recusa" do ADR-0002 §15.2)**. O Coroado o soltará na F-008; aqui entra pelo cenário `bau_uniao` |
| U1 | Números da União | base 21 (14 × 1,5), escala FOR B / DES C: 17,325 por golpe com FOR 6; 4 golpes do nv8; 12 passos entre golpes; recarga de 60. **O F-005.6 passa a testar a base 21 e o golpe 17,325: o golpe é 1,83 vezes o da Espada nv8, não 1,5** |
| U3 | Geometria da onda | 1 onda por golpe (inclusive a estocada): nasce no centro do jogador, segue a mira do golpe, fica no chão. Acerta como um quadrado de 32 × 32 px cujo centro anda 6,4 px por passo durante 15 passos (96 px); a borda da frente chega a 112 px |
| U4 | Dano da onda | **6,6 com FOR 6: os 8 de B §3.8 multiplicados pela escala da União (W18 da D4)**; fixado na criação; cada inimigo uma vez por onda; sem Sal e sem empurrão |
| U6 | Visual da onda | quadrado de 32 pt em brasa, alpha 0,4 até a idade 8 e 0 na 15 (dentro do ≤ 50% da D4; a 0,5, sobre a cunha, a brasa fica a ΔE 12,5 do jogador) |
| U7 | Quando a União é possível | só pelos baús das 10:00 e das 15:00 (ou pela Forja da F-008). **Os "minutos 12 a 15" do doc 10 §3.1 e o 13:30 do doc 02 §11 não se cumprem com os baús de B**: medida, sem mudar B |
| R2 | Formas | Cinza: losango de 12 × 16 pt em 3 tamanhos (azul menor, vermelha maior). Baú: quadrado de 32 pt, comum em bronze #b08d57, dourado em ouro escuro #a8841f com contorno |
| R3 | Cores fora da regra | aceitos, com a forma e o tamanho como 2º canal: Cinza vermelha × obstáculo (contraste 2,43:1, abaixo de 3:1); em deuteranopia, Cinza vermelha × Oco (ΔE 3,7) e verde × Oco e Oco Grande (14,8 e 13,5) |
| R4 | Barra de XP e nível | barra de 8 pt no topo, na cor da Cinza azul, e "Nv {nivel}" como texto. **Os glifos da N4 ficam para as Almas (F-007) e o relógio (F-008)** |
| R5 | Vagas no HUD | 12 vagas de 28 pt (5 armas, Relíquia, 6 passivas); **o painel do `?debug=1` desce para topo + 144 (muda a P2 da D4)** |
| R6 | Modal de cartas | véu escuro a 60%, 3 cartas de 342 × 152 pt embaixo, borda osso, selecionada com contorno brasa, "Completa" em #ffd166; a pausa lista as passivas e mostra a Lâmina sem nível (**muda a P5 da D4**) |
| E1 | Cenários novos | **`nivel_tres` e `bau_uniao`, 5º e 6º fora dos aprovados no ADR-0002 §14**, e a receita `vigilia_sem_cinzas` para os specs antigos |
| E3 | Critérios | **o "como" dos F-005.1 a F-005.6 é reescrito (§8) e entra o F-005.7 (baú e União no navegador)**; evidências `modal-390x844.png` e `uniao-390x844.png` |

### 0.B Decisões técnicas (informativo)

| # | Decisão | Valor |
|---|---|---|
| X3 | Onde a Cinza nasce | em `matarInimigo` (que passa a receber `dados`), só com causa arma, na posição do morto |
| X6 | Pool de pickups | 512 para Cinzas e baús (ADR-0002 §4), com `x`, `y`, `xAnt`, `yAnt` (ADR-0002 §3), `valor` (Uint32) e `tipo`. Cheio: a Cinza nova se junta à mais próxima (`juncoes`) |
| P4 | Dano | derivado por Estado (`danoVivo`, indexado por (arma, nível), mais o dano da onda), fora do buffer; recalculado quando mudam os atributos ou o Poder; com FOR 6 e Poder 0, igual à F-004 bit a bit |
| L4 | RNG | subfluxo `levelup` por nível e `baus` por índice de queda (ADR-0002 §5, no lugar do "um gerador" de B §3.1); sempre 7 u32 por oferta |
| L5 | Quando a oferta nasce | no fim da fase de pickups do passo que cruza, depois dos baús; ou ao fechar o último baú; ou na confirmação da carta anterior |
| L6, L7 | Escolha e Almas | a carta aplica o item; a Bolsa soma no contador `almas`, criado na F-005 |
| M1 | Parada | modal aberto = nenhum passo; `avancar` para no passo que abre o modal e devolve os passos rodados; o resto do quadro é descartado sem `passos_perdidos`; o `avancar(n)` do debug roda 0 passos com o modal aberto (a pausa do debug roda) |
| M3 | Fila de modais | baús primeiro, depois os níveis; tudo no estado e no hash; o `estado` do debug continua `VIGILIA` |
| B4, B5 | Modal e fila do baú | o resultado de cada baú fica numa fila de 4 no estado; com a fila cheia, o baú encostado espera no chão |
| U2 | Entrada da União | `aplicarUniao` na vaga da Espada, timers em 0; o Elmo continua |
| U5 | Pool da onda | efeitos de chão de 64 na soma de 200/400; bitset de 512 bits por onda |
| R1 | Camada "mundo" | `SpriteGPULayer` de 566 membros (54 obstáculos + 512 pickups) abaixo da horda, com plano B `image` |
| E2 | Layout e referências | VERSAO_LAYOUT 5; as 5 referências de hash são regravadas; regressão v4 contra o código da F-004 |
| E4 | Alocação | o E6 ganha variantes com Cinzas (pool cheio), level ups e União, ≤ 16 B por passo, sem exclusão |
| E5 | Eventos | EVENTO: nivel 5, carta 6, onda 7, bau 8, item 9, uniao 10; FORMA: onda 6 |
| E6 | Specs e evidências antigas | a Vigília normal parada abre o 1º modal no passo 723 (seed 1); os specs antigos que passam de 600 passos usam `vigilia_sem_cinzas`; as evidências das F-001 a F-004 são regeneradas |
| T1 | Telemetria | `level_up` e `arma_uniao`, só locais (Q-30) |

## 1. O que os documentos já respondem

- **Curva e leitura de n:** XP(n) = 10 + 8(n − 1) + 0,6(n − 1)² é o custo para ir do nível n ao n + 1 (Q-22 (4); F-005.1).
- **Valor das Cinzas:** azul 1, verde 5, vermelha 25 (B §3.9); XP por tipo na tabela de B §3.6 (Oco 1, Oco Grande 5, Noviça 5, Coroado 25); o convertido vale a soma dos 10 que substitui (Q-08; ADR-0002 §8).
- **Ímã:** 1,5 corpo (B §3.9). O Ímã de Osso, a Sorte e o bônus de Ímã ficam fora (doc 02 §7; brief Q-00; B §2 limita as passivas a duas).
- **Pool de pickups:** 512, com junção na Cinza mais próxima quando cheio (ADR-0002 §4 e §15.2); `xAnt` e `yAnt` por entidade para a interpolação (ADR-0002 §3).
- **Atributos, nível e XP** no registro do jogador (ADR-0002 §4); +1 ponto por nível, automático em FOR (B §3.3).
- **Luvas:** +8% de Poder por nível; **Elmo:** +4 de Armadura por nível; máximo nv5 (B §2 e §3.9; `passivas.json`).
- **Sorteio:** 3 cartas; 60% de melhorias; arma nova só com vaga; 35% da passiva que completa a União depois do minuto 12; Reroll, Pular e Banir em 0 (B §3.9). Chance por carta, sem repetir item; troca de categoria; Bolsa de Almas quando os itens se esgotam (Q-22 (1) a (3)).
- **Level up pausa** o passo e o relógio (B §3.1; ADR-0002 §3); toque na carta e segundo toque confirma (B §3.5).
- **RNG:** um gerador para o level up (B §3.1), com subfluxo por nível e outro para os baús, por índice (ADR-0002 §5). Os fluxos `levelup` e `baus` já estão nas palavras de RNG do estado e no hash.
- **Baú:** do Guardião e do Chefe Menor; depois do minuto 10, a União se a arma estiver no nv8 e a passiva presente; senão 1 (70%), 3 (25%) ou 5 (5%) itens (B §3.9). "1 item" = +1 nível num item possuído, ao acaso, sem escolha; "depois do minuto 10" = relógio ≥ 10:00; o dourado é só visual (Q-23).
- **União:** substitui a Espada na mesma vaga; o Elmo continua (brief §5.9); números da W18 (D4 §0). A raridade do doc 04 §1, o baú dourado com "União ou Brasa" do doc 02 §6.3 e o doc 06 §2 perdem para B e a Q-23 no MVP (Q-00; brief §5.9).
- **Onda:** obstáculos não bloqueiam ataques (D2 O6); dano fixado como na faca (W13 da D4); números pela N7.
- **Textos:** todos os da carta já existem (A10.LEVELUP.*, F1.*, F2.*, F3.*, A5.HUD.NIVEL). As lores ainda são "…".
- **Sem som de level up** (B §2 limita o áudio a 3 sons de evento crítico).

## 2. XP, Cinzas e progressão do personagem

- **XP (X1). [delegada; o crítico resolveu três propostas]** As áreas propuseram três unidades: inteiro com teto, décimos e `Math.round`. Fica a XP inteira em Uint32, porque as Cinzas são inteiras: com XP inteira, xp ≥ XP(n) equivale exatamente a xp ≥ ⌈XP(n)⌉, sem double. O arredondamento comum deixaria subir com 28 XP quando a fórmula pede 28,4. Décimos obrigariam a barra e o debug a dividir.
  - Custo em inteiros, com k = n − 1: ⌊(100 + 80k + 6k² + 9) / 10⌋, numa tabela Uint16 de 256 posições montada no boot (o custo do nv255 é 40.752).
  - O campo `xp` guarda o resto do nível atual. No fim da fase de pickups, em todo passo (mesmo sem coleta): enquanto xp ≥ custo(nível) e nível < 255, xp −= custo, nível + 1, `niveisPendentes` + 1. No nível 255, a XP excedente se perde. Nenhuma Vigília real passa do nível 50.
  - Sem teto de nível no jogo: quando os itens se esgotam, as cartas viram Bolsa de Almas (Q-22 (3)). No protótipo, quem caça chega ao nível 45 e vê 14 a 17 Bolsas.
  - Medido: soma até o nv29 de 7.473 (contra 7.462 da fórmula exata, +0,15%). XP(10) = 131 e XP(20) = 379, dentro de 130 ± 1 e 380 ± 2.
  - Teste: tabela literal de n = 1 a 30 escrita no teste; uma Cinza de 28 com xp 0 no nv1 deixa o jogador no nv2 com 18; uma vermelha (25) no nv1 com xp 9 cruza dois níveis no mesmo passo; no nv254, uma Cinza de 100.000 leva ao 255, sem laço infinito.
- **Cinzas (X2, X3). [documento, mais a chance de 100% delegada]**
  - Cada morte por arma solta exatamente uma Cinza com o XP do tipo (`inimigos.json`). O convertido solta uma Cinza de 10, e não 2 de 5 ou 10 de 1: ocupa uma vaga só.
  - Nasce dentro de `matarInimigo`, só com `CAUSA.arma`, antes de `removerInimigo`, no (x, y) do morto. `matarInimigo` passa a receber `dados` (hoje recebe `(e, s, causa)`, em `armas.ts`), e a função de soltar recebe só o slot e lê a posição e o XP em linha (regra do laço quente). O bit `semCinzas` (§5) é lido do cabeçalho.
  - As outras causas de morte (arena, marco vencido, A Fome, APAGANDO) não existem ainda: recomendação na §9.
  - Teste: um inimigo de cada tipo (Oco, Grande, Noviça, convertido) dá 1, 5, 5 e 10; o fluxo `drops` fica intocado; `removerInimigo` sozinho nunca solta Cinza.
- **Ímã e voo (X4). [delegada]**
  - Distância de centro a centro, pelo delta toroidal, d² ≤ 48². A Cinza é um ponto, e o Ímã é uma zona, como a Fogueira e as zonas da W3 da D4.
  - A cada passo, na fase de pickups: se d ≤ 16 px (a hitbox do jogador), coleta; senão, se d² ≤ 48², anda 8 px na direção do jogador já movido, com a posição normalizada no toro. Com d = 0, coleta sem dividir.
  - 8 px por passo é mais de 3 vezes a velocidade do jogador (2,4): uma Cinza que entra no raio sempre o alcança, sem campo de "atraída". A área de estado propôs 7,2; a de XP, 8 com o campo. Fica 8, sem o campo.
  - Teste: a 48 px a Cinza anda no 1º passo e a 48 + 1/16 não, por 600 passos (o critério aprovado dizia 49 px; 48 + 1/16 prova o ≤ sem ε, que 49 deixaria passar); com o jogador parado, coletada no 5º passo; costura em x (jogador em x = 5 e Cinza em x = 1.160: 15 px).
- **Pool de pickups (X6). [documento, com a mecânica (técnica)]**
  - Um pool de 512 para Cinzas e baús: Float32 `x`, `y`, `xAnt`, `yAnt`; Uint32 `valor` (XP da Cinza ou o índice de queda do baú); Uint8 `tipo` (1 Cinza, 2 baú comum, 3 baú dourado; a F-007 acrescenta a Alma). Os tipos complementam a tabela do ADR-0002 §4.
  - Cheio, a Cinza nova soma o valor na Cinza viva mais próxima do ponto da morte (d² pelo delta toroidal; empate, menor slot), que mantém a posição; `juncoes` + 1 (no mundo, no hash). O valor em Uint32 não satura: uma Cinza junta pode acumular centenas de mortes. Nos nomes, "junção" e "juntar" (o glossário proíbe "fusão").
  - O baú nunca é recusado: com o pool cheio, a Cinza mais próxima do ponto de queda é juntada na vizinha dela e o slot vai para o baú. É a divergência do B3 em relação ao ADR-0002 §15.2.
  - Sem vida útil: a Cinza só sai por coleta ou junção. Medido em 20 min: pico de 392 Cinzas andando e de 891 a 1.800 parado; a junção é necessária.
  - Teste: 512 Cinzas e um baú: o baú nasce e a soma dos valores se conserva; coletado + vivo = soltado.
- **Atributos e nível (P1, P2). [delegada]**
  - O nível sobe no cruzamento da XP, não na confirmação da carta: nível, FOR e hpMax mudam no passo do cruzamento. A carta só aplica o item.
  - FOR + 1 por nível até 20 (nível 15). Sem teto, a FOR chegaria a 34 no nível 29, e a Espada nv8 daria 38,85 por golpe (24,15 com o teto 20; 9,45 com FOR 6). Medido no protótipo, o DPS agregado no minuto 20 (caçando) fica em ≈ 6.000 sem teto, ≈ 3.950 com teto 30 e ≈ 3.060 com teto 20, o mais perto do alvo de ≈ 2.000 do doc 10 sem mexer em números de B. Depois do teto, o ponto se perde: no MVP não há para onde ele ir.
  - HP: +2 de HP base por nível; a FOR não dá HP no MVP. O doc 03 §2.1 dá à FOR "+HP máximo leve", sem número. Com o HP por nível, um golpe do Oco Grande no minuto 19 passa de 26% para 18% do HP máximo no nível 29.
  - Os atributos ficam no registro (Uint8 × 5, na ordem FOR, DES, INT, FE, VIG, a mesma das chaves de `vigilantes.json`, sem acento), gravados no início com o perfil de Aldric. Ficam no estado, e não derivados do nível, porque a árvore (F-010) e as maldições mudam a base por Vigília.
  - Em `vigilantes.json`: `hp_por_nivel` = 2 e `ponto_por_nivel.teto` = 20; saem as pendências.
  - Teste: do nível 15 ao 40, a FOR fica em 20.
- **hpMax (P3). [delegada]** Campo `hpMax` (Float32, valor inteiro) no registro do jogador.
  - hpMax = ⌊(base × (100 + Σ%) + 50) / 100⌋, em inteiros, com o meio para cima; Σ% soma a Brasa Firme (15) e, na F-010, o nó da árvore, como na DN2 da D4. `dados.hpInicial` passa a sair da mesma função (150; as referências não mudam por isso).
  - Quando o máximo sobe: hp = fround(hp + (novo − antigo)), só se hp > 0, nunca acima do máximo.
  - Teste: tabela literal (nv1 150, nv2 152, nv15 182, nv29 214).
- **Recálculo do dano (P4). (técnica; a verificação e a revisão corrigiram a 1ª proposta)** O pesquisador propôs calcular o dano a cada disparo com a FOR do estado. A D4 (DN1, §4) já trocou isso por uma tabela no boot, porque o cálculo raro roda no interpretador do V8 e aloca ≈ 14 B por passo (o E6 tem ≈ 3 B de folga).
  - Fica um derivado por Estado, fora do buffer, do hash e do save (como o anel de eventos): `danoVivo`, um Float64Array indexado como `danoDoNivel`, por (arma, nível), mais o dano da onda por arma. Os golpes e ticks leem `danoVivo[indiceDoNivel(código, nível)]`. Indexado por vaga, ele ficaria velho a cada escrita direta em `build.nivel`, `equiparArma` ou União; indexado por (arma, nível), só muda quando mudam os atributos ou o Poder.
  - Para isso, a tabela das armas guarda os graus por atributo (`grauPorAtributo`, Uint8 por arma × 5, em centésimos: Espada FOR 75 e DES 75; Facas DES 100; Círculo FE 125; União FOR 100 e DES 75). escalaMil = Σ grau × atributo, em inteiros, no recálculo. O `escalaMil` do boot vira a conferência de que o recálculo com o perfil inicial o reproduz.
  - Uma função única, `recalcularDano(e, dados)`, com a mesma `gravarDanoPorAcerto` da D4, roda em: criar ou reiniciar o estado, cruzar nível (FOR), mudar as Luvas (carta ou baú) e copiar um estado (`sincronizarDerivados`, para os testes e o save da F-008). Na F-006, também quando o Poder temporário entra ou sai. `dados` continua imutável e compartilhável entre estados.
  - Teste: 1.000 sequências de cruzar nível, carta de Luvas e escrita direta em `build.nivel`, com o derivado igual ao recalculado do zero; a cópia de um estado que já subiu de nível só fica igual com `sincronizarDerivados`; com FOR 6 e Poder 0, igual a `danoDoNivel` bit a bit; tabela literal (FOR 6, 20 e 34 × Espada nv1 e nv8 × União: 6,75, 17,25, 24,15 (Espada nv8, FOR 20), 38,85 (FOR 34), 17,325 e 46,725 (União, FOR 6 e 20)); o pior numerador (FOR 34, Poder 55) fica abaixo de 2^53.
- **Poder e Armadura (P5).** Funções puras das passivas, sem campo: Poder = 8 × nível das Luvas (em %, no (100 + poderPct) da fórmula); Armadura = 4 × nível do Elmo.
  - A Armadura não reduz dano na F-005: B §4 põe a redução e o teste dela na F-007, e aplicar agora anteciparia a ordem entre a armadura e a Brasa Firme (pendência da F-007). O Elmo vale como requisito da União e aparece no debug e na carta. O comentário de `contato.ts` que diz "F-005 a F-007" passa a dizer F-007.
  - Teste: Elmo nv1 a nv5 dá 4, 8, 12, 16 e 20; o dano de contato recebido é igual com e sem Elmo.
- **Simulação de 20 min (P6). [delegada]** Medida reprodutível, sem gate.
  - Script `scripts/sim20.ts` (Node, `npx tsx`): seeds 1, 2 e 3; jogador invulnerável; 72.000 passos; escolhas de carta pela 1ª carta de cada oferta. Três comportamentos: parado (comando nulo); em círculo (360° a cada 1.200 passos, na velocidade máxima); caçando (a cada 30 passos, rumo ao inimigo vivo mais próximo pelo delta toroidal). Saída em `.verify/sim20.json`: nível e DPS aos 5, 10, 15 e 20 min, pico de Cinzas, junções, Bolsas e o minuto em que a build chega a Espada nv8 + Elmo. O Vitest só confere que o script roda 3.600 passos, que duas execuções dão o mesmo JSON e que os campos existem.
  - Números do protótipo (seed 1): níveis aos 5/10/15/20 min, parado 9/12/13/15, em círculo 4/16/28/41, caçando 15/26/35/46; o alvo do doc 10 §3.1 é 9/16/23/29. O nível depende quase só de quanto o jogador anda: o diretor repõe até o mínimo, então a taxa de mortes segue o alcance.
  - DPS agregado (soma dos acertos por segundo, com overkill): ≈ 62 parado e 175 a 196 caçando no minuto 5 (alvo ≈ 60); ≈ 3.060 no minuto 20 com o teto de FOR 20 (alvo ≈ 2.000).
  - Facas e Círculo dão 1 a 4% do dano: com DES e FÉ em 3, não escalam. Recomendação ao balanceamento depois da F-010 (§9); a F-005 não muda números de B nem a curva. O ADR-0007 registra os números da implementação.

## 3. Level up

- **Cartas possíveis (L1).** Espada, Facas, Círculo (até nv8), Elmo e Luvas (até nv5) e a Bolsa de Almas. A União tem `uniao: true` e nunca é carta; depois dela, a Espada sai do sorteio (nem melhoria nem nova) e o Elmo continua até o nv5.
- **Sorteio (L2). [Q-22, com a mecânica (técnica)]**
  - Para cada carta, um u32 do subfluxo decide a categoria: abaixo de ⌈0,6 × 2³²⌉ = 2.576.980.378, melhoria de item possuído; senão, item novo. Outro u32 escolhe o item: índice ⌊u × k / 2³²⌋ sobre os k candidatos em ordem fixa (armas por código, depois passivas por código), sem os já escolhidos na oferta.
  - Categoria vazia troca para a outra; as duas vazias dão Bolsa de Almas. A oferta tem sempre 3 cartas, e a Bolsa pode sair 2 ou 3 vezes: a Q-22 (1) proíbe repetir item, e a Bolsa não é item.
  - Item novo só com vaga livre do seu tipo na build (`vagas.armas` = 5, com a União contando; `vagas.passivas` = 6). A vaga é conferida contra a build, não contra as outras cartas: com 1 vaga, duas armas novas podem aparecer, porque só uma será escolhida. No MVP a vaga nunca falta (3 armas e 2 passivas); o teste prova a regra com dados de teste de 2 vagas.
  - Consumo fixo: sempre 7 u32 por oferta, 1 da regra dos 35% e 2 por carta, mesmo quando não são usados (carta forçada, troca de categoria ou Bolsa). A oferta de um nível não muda o que as regras de troca consomem.
  - As decisões de limiar ficam em funções puras, testáveis com valor injetado: `categoriaDaCarta(u)`, `elmoForcado(u)` e `indiceUniforme(u, k)`.
  - Medido em 10.000 seeds: 0,6005 de melhorias nas cartas sem troca.
- **Os 35% (L3). [delegada; leitura de B para veto]** B diz que a passiva "aparece com 35%"; o doc 02 §6.2, que a chance "sobe para 35%". Medido: pela regra normal, o Elmo já aparece em 68 a 100% das ofertas com a Espada no nv8. Ler 35% como valor exato baixaria a chance para 0,349; fica o piso.
  - Regra: relógio ≥ 12:00 (43.200 passos; o relógio para no level up e na Fogueira), Espada no nv8, Elmo fora da build, sem a União e com vaga de passiva livre. Com isso, se o 1º u32 < ⌈0,35 × 2³²⌉ = 1.503.238.554, a carta 1 é o Elmo novo; as outras duas seguem a regra normal sem o Elmo. Sem a vaga, nada é forçado.
  - "União pendente" = Espada nv8 sem o Elmo. A Espada abaixo do nv8 não ativa a regra.
- **RNG (L4). [documento, com a mecânica (técnica)]** Ao gerar a oferta do nível n, o subfluxo `levelup` é semeado com a seed e o índice n (`semear` do `rng.ts`, sem mudança). B §3.1 fala em "um gerador para o level up"; o ADR-0002 §5 o divide em subfluxos por nível, e o sorteio de um nível não depende do consumo de outro sistema. A oferta depende só da seed, do índice, da build e do relógio. Prova Node × Chromium: `.verify/referencia-f005.json` com o hash e as cartas da 1ª oferta do `nivel_tres`.
- **Quando nasce (L5). (técnica)** A oferta é gerada quando a fila chega a um nível e não há oferta aberta: no fim da fase de pickups (§5) do passo que cruza, se não há baú por fechar; ao fechar o último baú, se há nível pendente; ou na confirmação da carta anterior, sobre a build já atualizada. Uma oferta por vez fica no estado. O nível ofertado é derivado (nível − pendentes + 1).
  - Invariante: níveis pendentes > 0 e nenhum baú por fechar implica oferta aberta.
  - Teste: em 1.000 seeds, depois de escolher Facas como nova, a 2ª oferta nunca traz Facas como nova e traz Facas nv2 em parte delas.
- **Efeito da escolha (L6). (técnica)** Melhoria de arma: nível + 1, timers mantidos (W16). Arma nova: 1ª vaga livre, nv1, timers em 0, age no passo seguinte. Passiva nova ou melhoria: entra nas 6 vagas de passiva, em ordem de aquisição, ou nível + 1. Bolsa: `almas` + 50. Com as Luvas, roda o recálculo do dano (P4). A validação de `equiparArma`, que aloca, não é usada: a oferta já garante a validade.
- **Almas (L7). (técnica)** O contador `almas` (Uint32, no estado) entra na F-005, somado só pela Bolsa (do level up e do baú). As Almas dos inimigos, o pickup de Alma e o HUD de Almas são da F-007.
- **Borda "Completa" (L8). [delegada]** Recebem a borda e a linha A10.LEVELUP.COMPLETA_UNIAO ({uniao} = o nome da Lâmina): o Elmo novo com a Espada nv8 na build, e a Espada para o nv8 com o Elmo na build, sem União nos dois casos. Calculado por função pura de `src/logica`, fora do estado.
- **Telemetria (T1). (técnica)** Em `confirmarModal`, antes de aplicar, a cena registra `level_up` com os campos de `CAMPOS_DOS_EVENTOS` (`src/plataforma/telemetria.ts`): `minuto` = ⌊relógio / 3.600⌋ da simulação, `nivel` = nível ofertado, `cartas_oferecidas` = os 3 ids (`bolsa_de_almas` para a Bolsa), `carta_escolhida` = o id e `reroll_usado` = 0. O baú não registra `level_up`. Fora da simulação (Q-30).

### Modal (M1 a M5)

- **Parada (M1). (técnica)** A simulação fica parada enquanto houver modal na fila.
  - `avancar` para depois do passo que deixa a fila não vazia e passa a devolver o número de passos rodados. Se a fonte de comandos traz a escolha (roteiro), aplica e continua no mesmo laço; ao vivo, devolve.
  - `rodarFrame` e `rodarFrameComPausas` também passam a devolver os passos rodados, e a cena usa esse valor no medidor e em `verificarNaN`. O portão de `rodarFrameComPausas` ganha a 3ª condição, `modalAberto(e)`, lida do estado. Os passos restantes do quadro são descartados sem contar em `passos_perdidos`, e o acumulador volta a 0. Com o modal aberto, o render desenha com alfa = 1.
  - Nos testes, `avancarTudo` lança erro se rodou menos passos que o pedido: um teste antigo não pode seguir calado com a simulação parada. O `avancar(n)` do debug devolve os passos rodados (0 com o modal aberto; a pausa do debug roda), e os specs o chamam em laço até o passo alvo, confirmando os modais pelo roteiro.
- **Entrada (M2). [delegada, divergência em negrito no §0]** A escolha entra por `confirmarModal(e, dados, k)`, função pura de `src/logica` aplicada entre dois passos:
  - com um baú na frente da fila, fecha o baú e não consome k;
  - senão, valida k ∈ {0, 1, 2}, aplica a carta k e tira um nível da fila;
  - nos dois casos, ao final, se não há baú por fechar, há nível pendente e não há oferta aberta, gera a oferta (L5); se a fila esvaziou, limpa a oferta;
  - um contador de modais confirmados (no estado) dá a ordem.
  - O replay guarda as escolhas na ordem dos modais: o método opcional `FonteDeComandos.escolhaDoModal?(ordem)` devolve o índice do roteiro, ou −1 (ou nada) para esperar o jogador. `fonteDoRoteiro` aceita um campo `escolhas`. As fontes que não têm o método continuam valendo.
  - Alternativa descartada (área de estado): a carta como borda nos `ComandosDoPasso`, com o valor nível × 4 + índice, como o ADR-0002 §12. Com o modal aberto não há passo para levar o comando; seria preciso rodar passos vazios, e uma fila de níveis pede várias escolhas sem passo entre elas.
  - Teste: o mesmo roteiro com 1 e com 5 passos por quadro dá o mesmo hash; k = 3, ou sem modal, lança; dois níveis seguidos aplicam as duas cartas na ordem; baú e cruzamento no mesmo passo: fechar o baú abre a oferta; uma fonte sem o método espera.
- **Fila (M3). [delegada]** No estado: a fila de baús (B5) e os níveis pendentes. Baús primeiro (abertos em slot crescente, §4), depois os níveis. O modal do baú mostra a cabeça da fila de baús. O `estado` do debug continua `VIGILIA` e o modal é lido em `levelUp` e `bau` (como a pausa da D4 P4); com ele aberto, o `textoAtivo` mostra os textos do modal, e o prompt de tutorial fica sob o véu.
- **Toques (M4). [delegada]** Toque = começar e soltar na mesma carta (a regra da P1 da D4). Nada selecionado: seleciona. Na selecionada: confirma. Em outra: troca. Fora: nada (nem desmarca nem fecha). A seleção é estado da cena, fora da simulação; só a confirmação chama `confirmarModal`.
  - O tradutor guarda até 8 toques em carta por quadro, consumidos em ordem: a 8 fps, um toque duplo entre dois quadros conta como 2. Ao confirmar, os toques de carta que sobraram no quadro são descartados, a seleção zera e os dedos são soltos: a oferta seguinte só recebe toques novos.
  - Sem atraso de tempo: a abertura solta todos os dedos, um toque começado antes nunca aciona carta, e a confirmação exige 2 toques novos. Entre duas ofertas da fila, as cartas refazem o fade de 200 ms. Reavaliar no iPhone (Q-29).
  - Sem swipe e sem toque único (doc 11 §3.7): B §3.5 dá só os dois toques.
  - Teste: 3 toques na carta 0 no mesmo quadro, com 2 ofertas na fila, confirmam uma só e deixam a seleção vazia.
- **Dedos, joystick e pausa (M5).** Fecha a D2 §9, que era recomendação. Ao abrir: `pedirSoltarTodos()` e o tradutor no modo `modal`, que só testa os alvos do modal (as 3 cartas, ou o Continuar do baú). O joystick, o botão de pausa e o gesto de dois dedos não existem nesse modo, e o ícone de pausa continua desenhado sob o véu. Ao fechar, de volta ao modo `vigilia` com os dedos soltos; só um toque novo cria o joystick (`joystick.criados` conta). Se a pausa e o modal abrem no mesmo quadro, a pausa vem primeiro e o modal aparece ao fechá-la.
- **Layout (R6). [delegada]** Cena `Modal` (ADR-0002 §11) acima da Hud, criada com a Vigília e invisível até abrir.
  - Véu #0b0e14 a 60% (P6 da D4). Coluna de 3 cartas de mín(342, largura útil − 48) × 152 pt, 12 pt entre elas, com o fundo da última a 24 pt do inset inferior.
  - Na carta, com 16 pt de margem: ícone de 64 pt à esquerda e coluna de texto. Linhas: nome (16 pt); "Nível N" ou "Novo" (13 pt, sal); a linha funcional do nível alvo (15 pt, até 2 linhas); a lore (13 pt, itálico, até 2 linhas) ou "Completa: …". A Bolsa mostra nome e efeito. Cada linha é um `Text` criado uma vez e trocado com `setText`, com `idTexto` para o `textoAtivo`.
  - A10.LEVELUP.CONFIRMAR ("Toque de novo para escolher", 15 pt, osso) 20 pt acima da 1ª carta, só com seleção.
  - Fundo #0b0e14 a 85% e borda de 2 pt em osso; selecionada com contorno externo de 4 pt em brasa; "Completa" com borda e texto em #ffd166. Fade de 200 ms que não bloqueia toque.
  - Ícones geométricos provisórios, desenhados uma vez em textura: Espada, cunha em brasa; Facas, 2 losangos em sal; Círculo, anel em sal; Lâmina, cunha em brasa com arco; Elmo, semicírculo sobre retângulo em osso; Luvas, 2 retângulos arredondados em osso; Bolsa, disco em #e2652b.

## 4. Baú e União

- **Baú como entidade (B3). [delegada; o crítico resolveu entre "só função" e "entidade"]** O baú é um pickup do pool (tipo 2 comum, 3 dourado) com o índice de queda no `valor`.
  - `soltarBau(e, dados, x, y, dourado)` soma o contador `bausSoltos` (no hash) e grava o índice. Nenhum inimigo da F-003 e F-004 solta baú: o Coroado o fará na F-008, que só troca o chamador. Aqui o baú entra pelo cenário `bau_uniao`.
  - Abre ao encostar: centros a ≤ 32 px (16 do jogador + 16 da meia-aresta), delta toroidal, ≤ sem ε, na fase de pickups, em slot crescente. O Ímã não o atrai. Não colide com obstáculos, não some e vai no save da F-008.
  - Foi preferido à "só função pura": o critério F-005.3 e a evidência de B (screenshot da União) pedem a União formada pelo baú, e o modal do baú ficaria sem teste no navegador. O custo é um tipo no mesmo pool.
- **Abertura (B1, B2). [Q-23, delegada nos itens distintos; mecânica (técnica)]** Síncrona, no passo da coleta, antes de qualquer level up do mesmo passo:
  - a União é avaliada primeiro, sobre o estado da abertura: relógio ≥ 36.000 passos; uma entrada de `unioes.json` com a arma na build em nível ≥ 8, a passiva presente e o resultado fora da build. Se vale, o baú contém só a União e não gasta RNG. Uma União por baú: dos 2 baús das 15:00, só o primeiro aberto a leva;
  - senão, o subfluxo `baus` com o índice de queda sorteia a quantidade: a = ⌊u × 100 / 2³²⌋; a < 70 → 1, a < 95 → 3, senão 5. Os itens elegíveis (possuídos e abaixo do máximo; a União nunca) ficam numa lista fixa (armas pela vaga, depois passivas), e um embaralhamento parcial (Fisher–Yates) escolhe os mín(N, M) primeiros, distintos, cada um com +1 nível. Os que faltam viram Bolsa de Almas (+50), como a Q-22 (3) e o F-005.5 fazem nas cartas;
  - o índice é o da queda, não o da abertura: os dois baús das 15:00 têm sorteios fixos, abertos em qualquer ordem;
  - o comum e o dourado usam a mesma função; o dourado é só visual (Q-23);
  - se as Luvas sobem, roda o recálculo do dano (P4);
  - eventos no anel: `bau`, um `item` por item e `uniao` (E5).
  - Teste: os limiares exatos da função de mapeamento (a = 69 → 1, 70 → 3, 94 → 3, 95 → 5) e a distribuição em 10.000 baús com ±1,5 / ±1,5 / ±0,8 p.p. (3,3 a 3,7 σ); com tudo no máximo, 5 Bolsas = +250 Almas; um baú solto em 18.000 passos e aberto em 36.001 com Espada nv8 e Elmo dá a União; a 35.999, nunca.
- **Fila de baús (B5). (técnica; a revisão achou que o resultado não tinha onde ficar)** O resultado de cada baú aberto e ainda não fechado fica numa fila de 4 entradas no estado e no hash, para o modal, o debug e a retomada da F-008: por entrada, o número de itens, a marca da União e até 5 trios (categoria, código, nível resultante). Com a fila cheia, o baú encostado não abre: fica no chão e abre num passo seguinte (o sorteio não muda, porque é pelo índice de queda). `confirmarModal` com baú na frente tira a cabeça da fila.
  - Teste: dois baús no mesmo passo mostram dois modais, em ordem de slot, com os conteúdos certos; hash igual com 1 e 5 passos por quadro.
- **Modal do baú (B4). [delegada]** Mesmo véu e mesma cena das cartas: título A10.BAU.TITULO ("Baú"); uma linha por item com o nome e A10.LEVELUP.NIVEL, ou a Bolsa; com a União, A10.BAU.UNIAO ("{uniao} se forma."); botão Continuar de 288 × 72 pt, reusando A6.PAUSA.CONTINUAR. O Continuar fecha pelo `confirmarModal` (M2). Sem animação no MVP: a animação da União fica para a arte.
- **Números da União (U1). [W18 da D4, conferidos]** A base sai do boot em inteiros: 10 × 140 × 150 / 10.000 = 21 (erro de boot se a conta não for inteira). A tabela usa `danoPorAcerto(21, …)`, e não a base 14 com um fator de 150, que deixaria só 1,27× de folga contra 2^53.
  - Escala FOR B / DES C = 1,0 × 0,6 + 0,75 × 0,3 = 0,825. Golpe: 17,325 com FOR 6 (Float32 17,325000762939453); com FOR 20, 21 × 2,225 = 46,725; com FOR 20 e Luvas nv5, 65,415.
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
  - Dano 8 × (1 + Poder) × 0,825 (6,6 com FOR 6; Float32 6,599999904632568), fixado na onda na criação, como a faca (W13). B §3.8 diz "8 de dano"; a W18 da D4 já aplicou a escala da União, e o F-005.6 a repete. Os mortos (hp ≤ 0) no meio da fase ficam fora (M1 da D4).
  - O acerto grava `acerto` com a arma da Lâmina e a forma `onda`; a N7 soma no número do inimigo (golpe 17,3 + onda 6,6 = "24"). Sem Sal, sem empurrão.
- **Pool e ordem (U5). (técnica)** Pool de efeitos de chão de 64 (ADR-0002 §4): Float32 x, y, dirX, dirY, dano; idade; arma; bitset. Criar uma onda zera o bitset antes de gravar; liberar zera o bitset, os floats, a idade e a arma, e o hash dos slots mortos é zero.
  - `limiteDeProjeteis` passa a somar projéteis e efeitos vivos contra 200 ou 400, na salva das Facas e na criação da onda. Recusa: nenhuma onda, nenhum evento, `efeitosRecusados` + 1 (no hash; no debug, `recusados.efeitosDeChao`, porque `recusados.efeitos` já conta o pool de render de 16).
  - Fase nova 7b' (ondas em slot crescente), depois dos projéteis (7b) e antes das vagas (7c): a onda criada em 7c no passo t só age em t + 1, como a faca nova; a criação fica dentro do golpe, depois do evento `golpe`.
- **Visual (U6). [delegada]** Um membro por slot do pool na camada das armas (de 421 para 485). Moldura `quadrado` de 32 × 32 pt na posição do acerto, girada pela mira, em brasa #ffb347, alpha 0,4 até a idade 8 e reto até 0 na 15; a posição é interpolada pela mesma conta, com a idade em passos. O 0,4 cabe no ≤ 50% da D4 e foi escolhido porque, empilhada sobre a cunha a 0,5, a brasa compõe a ΔE 12,5 do jogador (< 14); a 0,4, 15,3.
- **Quando a União é possível (U7). [medida, sem decisão nova]** Sem elites (fora do MVP), os baús só caem nos marcos: às 5:00 (relógio < 10:00, sem União), às 10:00 (dourado) e às 15:00 (2 baús). A primeira União possível é a do baú das 10:00, com a Espada nv8 e o Elmo já na build antes da ajuda dos 35% (que começa às 12:00), ou a das 15:00; a Forja da F-008 também só existe nesses marcos. Isso contradiz os "minutos 12 a 15" do doc 10 §3.1 e o 13:30 do doc 02 §11, e vale B (Q-00). O `sim20` registra o minuto em que a build chega a Espada nv8 + Elmo.
- **HUD e pausa da União.** A vaga da Espada passa a mostrar o ícone da Lâmina. Na pausa, a linha da União mostra só o nome (o nível fica escondido: "Nível 1" sugeriria uma arma fraca). `build.armas` lista a Lâmina na vaga 0 e `build.passivas` mantém o Elmo.
- **Telemetria (T1).** A cena registra `arma_uniao` ao ler o evento `uniao`: `minuto` (do relógio), `arma` = id da Lâmina e `passiva` = id do Elmo, que o evento carrega (Q-30).

## 5. Estado, ordem do passo e determinismo

- **Layout v5 (E2). (técnica)** Tudo no buffer e no hash, seções em múltiplos de 4 bytes:
  - jogador: `hpMax` (Float32);
  - progressão (Uint32): `nivel`, `xp`, `niveisPendentes`, `modaisConfirmados`, `almas`, `xpTotal` (para o debug e a telemetria);
  - atributos (Uint8 × 5 + 3 reservados);
  - passivas: `codigo[6]` e `nivel[6]` (Uint8), em ordem de aquisição;
  - oferta: `tipo[3]` e `item[3]` (Uint8, mais 2 reservados; tipos 1 melhoria de arma, 2 arma nova, 3 melhoria de passiva, 4 passiva nova, 5 Bolsa, 0 vazia);
  - fila de baús (B5): 4 entradas, com a contagem;
  - mundo: `juncoes`, `bausSoltos`, `efeitosRecusados`;
  - pool de pickups (512) e pool de efeitos de chão (64);
  - estimado ≈ 68 KB (era 42.988 B); o valor exato fica travado em `estado.test.ts`, com cada offset. `hashPorSecao` ganha `pickups` e `efeitos`.
  - `reiniciarEstado` esvazia os dois pools novos e a fila; `verificarNaN` (`?debug=1`) passa a cobrir os pickups vivos (x, y, xAnt, yAnt) e os efeitos vivos.
- **Ordem do passo v5. (técnica)** 1. relógio; 2. jogador; 3 a 6. horda, grade, separação e obstáculos; 7a. grade das armas; 7b. projéteis; **7b'. ondas**; 7c. vagas; 7d. mortes (`matarInimigo` solta as Cinzas); **7e. pickups: xAnt = x, Ímã, voo, coleta das Cinzas e abertura dos baús em slot crescente, soma da XP, cruzamento dos níveis e, se for o caso, a oferta (L5)**; 8. contato; 9. rotação; 10. diretor. O passo que abre um modal termina inteiro; o seguinte só roda depois da fila vazia. A Cinza solta em t já participa da fase 7e de t. Muda a ordem v4 da D4 §4 e do ADR-0006 §1.
- **Desligar as Cinzas. (técnica)** Bit `CENARIO.semCinzas` = 4 no cabeçalho, ligado pelo campo obrigatório `cinzas: false` das receitas: sem Cinzas, sem XP e sem level up. O `tres_armas` subiria de nível no passo 597 e travaria o F-004.5, a E7 e o E6. As receitas antigas (`horda`, `horda_rotativa`, `sem_horda`, `tres_armas`) ganham `cinzas: false` e os outros campos obrigatórios novos com os valores neutros (§7), cobertos por `tests/dados.test.ts`.
- **Specs e testes antigos (E6). (técnica; a revisão mediu)** A Vigília normal com o jogador parado e a Espada da build inicial abre o 1º modal no passo 723 (seed 1) e 795 (seed 424242); nas seeds 1 a 6, no 720; nas 7 e 8, no 792.
  - Receita nova `vigilia_sem_cinzas` (a Vigília normal com `cinzas: false`) e uma constante equivalente em `tests/logica/apoio.ts`. No início da Etapa 2, uma varredura: todo teste ou spec que rode a Vigília normal com armas, parado, por mais de 600 passos passa a usá-la. Na Playwright, os 8 `abrir(page)` do `f001.spec.ts` e o F-004.6 (a) a (c).
  - O F-004.4 fica na Vigília normal com Cinzas: ele termina na 1ª morte (passo 433), antes do 1º level up possível. O roteiro de referência (com movimento) não chega a nenhum level up em 1.000 passos nas seeds 1 e 424242.
  - Teste-guarda: Vigília normal, parada, seed 1: o modal não abre antes do passo 700 e abre até o 760.
- **Referências e regressão v4 (E2). (técnica)** As 5 referências de hash são regravadas pelo Vitest (`VDC_EVIDENCIAS=1`) e registradas no ADR-0007 e no `progress.md`, com os valores antigos e novos:
  - `tres_armas` (passo 601, 5628633f) e `horda` (passo 1.800, 6767ce88) mudam só pelo layout, porque ganham `cinzas: false`;
  - 901adb6d e 9cdc2c63 (F-001, roteiro de referência) e 86aa5388 (F-004.4, passo 433) rodam na Vigília normal com Cinzas: mudam pelo layout e, quando há morte na janela, também pelo conteúdo (a Cinza no pool; na seed 424242, xp = 4 e xpTotal = 4 no passo 1.000). A 1ª morte continua no passo 433;
  - a prova de que só isso mudou é a regressão v4: `regressao-v4.test.ts`, como a v3. O hash dos campos que já existiam no v4 é igual ao do código da F-004 (a árvore do commit `9271b10`, extraída à parte) na Vigília normal (passo 1.000), no horda (1.800) e no horda_rotativa (3.600), nas seeds 1 e 424242. Nos cenários antigos, a palavra 7 do cabeçalho é comparada com o bit `semCinzas` mascarado; a versão fica de fora. Sem a máscara, a regressão reprovaria código certo;
  - `tests/logica/determinismo.test.ts` (os literais das referências) entra na lista de arquivos da Etapa 2;
  - referências novas: `.verify/referencia-f005.json` (`nivel_tres`: hash e cartas no passo 1 com a 1ª oferta aberta, e o hash depois das duas escolhas, aplicadas por `confirmarModal` sem passos) e `.verify/referencia-uniao.json` (passo e hash da captura da União, §8).
- **Eventos (E5). (técnica; o crítico achou o código 5 usado por três eventos)** Os códigos só crescem no fim. EVENTO: `nivel` = 5 (um por nível cruzado: o nível), `carta` = 6 (na confirmação: tipo e item), `onda` = 7 (x, y, dirX, dirY), `bau` = 8 (x, y, índice de queda, número de itens), `item` = 9 (categoria 1 arma, 2 passiva, 3 Bolsa; código; nível resultante), `uniao` = 10 (a arma e a passiva, para a telemetria). FORMA: `onda` = 6. `NOMES_DOS_EVENTOS` e `EventoDebug` (`src/cenas/debug.ts`) acompanham. O anel continua com 1.024 entradas, fora do hash e do save, e a simulação só escreve nele. Teste: a tabela literal dos códigos.
- **Laço quente (E4). (técnica)** Coleta, Ímã, voo, junção, soltar Cinza, onda e bitset ficam em linha, sem double nem u32 ≥ 2³⁰ atravessando chamada. As funções raras (soltar baú, abrir baú, gerar oferta, confirmar) usam rascunhos (`Int32Array` dos elegíveis, `Uint32Array` do subfluxo).
  - `semear` do `rng.ts` fica como está (as referências dependem dele). A frio, ele aloca ≈ 700 a 900 B por chamada no interpretador do V8 (1,3 B a quente). A geração da oferta, com ele, conta no E6, sem exclusão: um level up a cada 6.000 passos soma ≈ 0,5 B por passo, dentro da folga. O ADR-0007 registra a medida a frio de uma oferta como informação (esperado ≤ 2 KB).
  - E6 ganha variantes, ≤ 16 B por passo, somando todas as funções de `src/`, 9.000 passos de aquecimento e 6.000 medidos:
    - (a) Cinzas ligadas no `tres_armas` (linha 19), com o pool cheio antes do aquecimento (um gancho de teste solta 512 Cinzas a mais de 48 px do jogador), o jogador andando em blocos e as escolhas pelo roteiro. O teste afirma `juncoes` > 0 com o pool em 512 e ≥ 1 level up (com a oferta gerada) na janela medida. Sem o pool cheio, a junção nunca rodaria: o E6 tem 418 mortes em 15.000 passos;
    - (b) a União no lugar da Espada, com Facas e Círculo no nv8, na linha 19.
  - Se uma variante passar do limite, a fase é reduzida; o limite e a falta de lista branca não mudam.
- **Sem gates de tempo novos.** As medidas de desempenho da F-005 só registram (draw calls: 9 na F-004, 11 com a pausa; estimadas 13 a 16 na F-005, longe de 150).

## 6. Render, HUD e cores

- **Camada "mundo" (R1). [D3 §9, decidida aqui]** `SpriteGPULayer` de 566 membros (54 obstáculos + 512 pickups), criada no `create` da Vigília com a configuração da horda, com o plano B `image` na mesma interface. Ordem de desenho: mundo (obstáculos, depois pickups) < mortes < horda < status < armas < jogador < dígitos < Hud. As Cinzas ficam abaixo da horda, como no ADR-0002 §11.
  - `prepararMundo` (puro): obstáculos na cópia mais próxima da câmera, com as mesmas contas de hoje; `prepararPickups`: interpolação entre xAnt e x pelo delta toroidal, arredondada ao pixel, escala e cor por uma tabela da faixa de valor, tudo em linha.
  - Teste: a posição dos obstáculos é igual à de hoje em 2.000 câmeras; gpu × image no spec.
- **Formas (R2). [delegada; D3 §9]** Cinza: moldura nova `cinza`, losango de 12 × 16 pt com a ponta para cima, em área livre do atlas, sem contorno, em 3 escalas pela faixa do valor (0,75 azul, 9 × 12 pt; 1,0 verde; 1,25 vermelha, 15 × 20 pt). Distingue-se do círculo de 32 pt da massa, do quadrado de 48 pt dos médios, da faca (16 × 4 em sal) e do marcador do Sal (8 × 8 em sal). Baú: quadrado de 32 pt, bronze #b08d57 (ΔE mínimo 17,2 das cores reservadas) e ouro escuro #a8841f com contorno (18,4). O #ffd166 do crítico ficaria a ΔE 9,8 do jogador num objeto do tamanho dele.
- **Cores (R3).** O teste de cores ganha o bloco das Cinzas e dos baús: ΔE ≥ 14 contra as reservadas e os inimigos; ≥ 18 entre as Cinzas, e ≥ 17,5 em deuteranopia e protanopia; contraste ≥ 3:1 contra o fundo e contra os obstáculos. Exceções aceitas, com o motivo: Cinza vermelha × obstáculo (contraste 2,43:1; contra o fundo, 3,15:1; a Cinza é pequena e fica acima do obstáculo plano, e #c8324b é da Q-27) e, em deuteranopia, Cinza vermelha × Oco (ΔE 3,7) e Cinza verde × Oco e Oco Grande (14,8 e 13,5), com a forma e o tamanho como 2º canal. Nenhuma cor da Q-27 muda.
- **Barra de XP e nível (R4). [delegada]** Barra de 8 pt em topo + 40, de esquerda + 80 até a largura − direita − 64; trilho #0b0e14 a 35% e preenchimento #5aa9e6 na proporção xp / custo(nível), por uma `Image` escalada. À direita, "Nv {nivel}" (A5.HUD.NIVEL, 15 pt, osso), trocado só quando o nível muda.
  - A pendência 10 recomendava os glifos da N4. O nível tem palavra ("Nv") e muda poucas vezes; um `Text` basta. Os glifos ganham ":" e "." quando entram números que mudam a cada quadro: Almas (F-007) e relógio (F-008).
  - Sem faísca e sem animação de "Cinza subindo para a barra" (doc 11 §5): ficam para a arte, depois da F-010, e a faísca nunca em branco (Q-27).
- **Vagas no HUD (R5). [delegada; pendência 9]** Linha de 12 vagas de 28 pt em topo + 80, centrada: 5 armas, a Relíquia (sempre vazia) e 6 passivas, 2 pt entre vagas do mesmo grupo e 6 pt entre grupos. Vaga vazia: contorno de 1 pt em osso a 30%. Os ícones são os do modal (§3) a 28/64, redesenhados só quando a build muda. Faixas reservadas: banda de 72 pt do botão de pausa (relógio e Hora na F-008; a barra de XP aqui; HP e stamina nas F-006 e F-007); ícones em topo + 80; Almas e Frascos em topo + 116. O painel do `?debug=1` desce para topo + 144.
- **Pausa (pendência 9).** A build da pausa ganha as passivas: 11 pares de `Text` (5 armas e 6 passivas), nome e A6.PAUSA.NIVEL, as passivas depois das armas; a Lâmina sem o nível. Os specs do F-004.6 passam a conferir os 11 pares e a ordem.

## 7. Dados, schemas e textos

- **`src/dados/progressao.json` (novo, com schema):** curva (10, 8, 6 décimos), valores e faixas das Cinzas, Ímã (1,5 corpo), velocidade da Cinza (15 corpos/s), coleta (0,5 corpo, a hitbox do jogador), pool de pickups (512), sorteio (60%, 35%, minuto 12), baús (70/25/5, minuto 10, 1/3/5 itens), Bolsa (+50 Almas) e a distância de abertura do baú. O boot confere tudo e erra se faltar número.
- **`vigilantes.json`:** `hp_por_nivel` = 2 e `ponto_por_nivel.teto` = 20; saem os `pendentes` e as pendências da F-005.
- **`armas.json`:** a União deixa de ser pulada na compilação; a onda ganha `base.onda` com largura 1 corpo, velocidade 12 corpos/s, comprimento 3 corpos e dano 8 (a vida sai de comprimento ÷ velocidade).
- **`cenario.schema.json`:** campos obrigatórios `cinzas` (boolean), `passivas` ([] por padrão), `baus` ([] de {dx, dy, dourado}), `xp_inicial` (0) e `relogio_inicial_s` (0; > 0 exige `linha_fixa`, senão a escala por minuto saltaria). As receitas antigas ganham `cinzas: false`, `passivas: []`, `baus: []`, `xp_inicial: 0` e `relogio_inicial_s: 0`. A lista `armas` continua recusando a União.
- **Textos novos:** A10.BAU.TITULO ("Baú") e A10.BAU.UNIAO ("{uniao} se forma."). O resto já existe. Glossário: "melhoria" (nunca a palavra proibida em inglês), "junção" (nunca "fusão"), "Cinza" (nunca "gema").

## 8. Cenários, debug, critérios, evidências e testes

- **Cenários (E1). [delegada]**
  - `nivel_tres`: diretor desligado, tutoriais vistos, rotação 0, só a Espada nv1, `cinzas: true` (com o diretor desligado, nada morre), sem baús, `xp_inicial` = 29. No passo 1, a XP cruza 10 e 19: nível 3 e duas ofertas na fila. Serve ao F-005.4 e à evidência do modal. Prefere-se dar XP no passo 1 a esperar mortes e coletas: o jogador parado não alcança as Cinzas que a Espada solta a 64 px.
  - `bau_uniao`: linha fixa 6 (a do `tres_armas`), diretor como nele, jogador invulnerável, tutoriais vistos, rotação 0, relógio inicial 600 s, Espada nv8, Elmo nv2, `cinzas: false` e um baú dourado em (0, −96) relativo ao início, com índice de queda 1. O spec anda para cima pelo roteiro até o baú.
  - `vigilia_sem_cinzas`: a Vigília normal com `cinzas: false`, para os specs antigos (§5).
- **`__GAME_DEBUG__`. (técnica)** `jogador` ganha `nivel`, `xp`, `xpParaSubir`, `xpTotal`, `niveisPendentes`, `atributos`, `poderPct`, `armadura`, `hpMax` e `almas`. `build.passivas`: [{ id, nivel }]. `levelUp`: { aberto, pendentes, nivel, cartas: [{ tipo, item, nivel, completaUniao }], selecionada }. `bau`: { aberto, itens } (da cabeça da fila de baús). `vivos.pickups`, `vivos.efeitosDeChao`, `juncoes`, `recusados.efeitosDeChao`. Só no build de debug: `pickups()` e `efeitosDeChao()`. `memoriaEstimadaMB` soma os membros novos (630 × 168 B, na CPU e na GPU) e o estado novo. Nenhum gancho de escrita: as escolhas são por toque ou pelo roteiro.
- **Critérios no `feature_list.json`.** A "descricao" e a "verificacao" dos F-005.1 a F-005.6 ficam; o "como" de todos é reescrito:
  - F-005.1: a tabela literal de n = 1 a 30 e os dois valores de B.
  - F-005.2 (o "como" pedia uma build impossível com 5 itens): seeds 1 a 10.000 numa build de 3 itens melhoráveis (Espada nv2, Facas nv1, Luvas nv1) e 2 novos (Círculo e Elmo), relógio 0 e 13:00. (a) Fração de melhorias de 0,60 ± 1,5 p.p. nas cartas 1 e 2, que nunca trocam; a carta 3 a 0,664 ± 2 p.p. (analítico 0,6 + 0,4 × 0,16). (b) Nenhuma oferta repete item. (c) Com dados de 2 vagas de arma cheias, nenhuma arma nova. (d) A 13:00 com a Espada nv8, o Elmo na carta 1 em ≥ 35% (piso, L3); às 11:59, a oferta é idêntica à da regra desligada; sem vaga de passiva, nunca forçado. (e) Os limiares exatos por valor injetado nas funções puras (2.576.980.377 e 2.576.980.378; 1.503.238.553 e 1.503.238.554). (f) A oferta com o Elmo forçado consome os mesmos 7 u32. Mutações que reprovam: 50/70, sem troca de categoria, 35% por carta, regra antes das 12:00, arma nova sem vaga, Elmo sem vaga, `<=` no lugar de `<`.
  - F-005.3: 1.000 baús com seeds diferentes, relógio ≥ 36.000, Espada nv8 e Elmo: União em 100%; o mesmo a 35.999: nunca; o baú solto antes das 10:00 e aberto depois.
  - F-005.4: o roteiro do `nivel_tres` (abaixo).
  - F-005.5: Ímã a 48 px atrai e a 48 + 1/16 não (§2, X4); os limiares exatos dos baús e a distribuição 70/25/5 em 10.000; a Bolsa (+50) com tudo no máximo (3 Bolsas em 1.000 seeds) e com só um item restante (1 carta e 2 Bolsas).
  - F-005.6: base da Lâmina 21 = 14 × 1,5 (±1%) e golpe de 17,325 com FOR 6; recarga de 60 passos; golpes e formas do nv8 com 12 passos entre eles; exatamente 1 evento `onda` por golpe; dano de onda 6,6. Numa arma sintética com bloco `onda` e 1 golpe: um Oco parado no percurso leva exatamente 1 acerto de onda em 15 passos; a 128 px de centro, no eixo da mira, leva 1, e a 128 + 1/16, nenhum. Com a Lâmina real: nenhuma onda acerta o mesmo inimigo duas vezes, e um inimigo leva no máximo 2 acertos de onda por janela de 15 passos. Recusa: com o pool cheio por um gancho de teste, a 65ª onda é recusada, `efeitosRecusados` = 1 e nenhum evento `onda` sai. A União na vaga da Espada, com o Elmo equipado.
  - **F-005.7 (novo, Playwright):** no `bau_uniao`, andar até o baú; `ultimosEventos` com `bau` e `uniao`; o modal com A10.BAU.TITULO; depois do Continuar, `build.armas[0]` é a Lâmina e `build.passivas` tem o Elmo; o passo e o hash do 1º golpe da Lâmina, lidos com a pausa do debug e `avancar`, são os da referência Node × Chromium.
- **F-005.4 (Playwright).** `?seed=<VDC_SEED>&cenario=nivel_tres&teto=300`, só o toque em Acender:
  1. esperar `levelUp.aberto`, `pendentes` = 2 e `jogador.nivel` = 3; o hash e as cartas são os de `referencia-f005.json`;
  2. por 30 quadros, passo, relógio e hash parados; o botão de pausa e o gesto de 1.000 ms sem efeito; um toque na área do joystick não cria joystick;
  3. tocar a carta 1: `selecionada` = 1 e A10.LEVELUP.CONFIRMAR no `textoAtivo`; tocar a carta 0: a seleção troca; tocar fora: nada muda; tocar a carta 0 de novo: confirma, `pendentes` = 1;
  4. pausar pelo debug (`pausar()`) e então selecionar e confirmar a carta 0 da 2ª oferta;
  5. `aberto` = false, `jogador.nivel` = 3, `build` com os itens das duas cartas, passo = 1 e o hash depois das duas escolhas é o da referência; depois de `retomar()`, o passo anda. Sem a pausa do debug, o hash dependeria do instante da leitura.
  - Os toques usam as caixas das cartas (`src/entrada/alvos.ts`, sem Phaser), com espera pela mudança de `selecionada` entre toques (≈ 8 fps). Sem gate de tempo: espera por condição, com timeout folgado.
- **Evidências (E3).**
  - `production/evidencias/F-005/modal-390x844.png`: a 1ª oferta do `nivel_tres` com a carta do meio selecionada, depois do fade (≥ 200 ms + 2 quadros).
  - `production/evidencias/F-005/uniao-390x844.png`: o `bau_uniao` depois do Continuar, no passo da referência: o 1º passo ≥ fechamento + 60, até fechamento + 600, com uma onda de idade 5 a 8 e ≥ 2 acertos de onda nos últimos 8 passos (achado pelo Vitest, que falha se não achar, e gravado em `referencia-uniao.json`); pausa do debug, 2 quadros, captura. Aparecem a Lâmina no HUD, a cunha, a onda em brasa, os números e o Elmo na build.
  - Como a E7 da D4, a captura não é comparada byte a byte (texto com fonte do sistema difere entre motores): o `verify.sh` confere 390 × 844, e o spec confere o hash e as cartas no passo da captura.
  - **Evidências das features anteriores:** o HUD novo, o painel descido e a camada "mundo" mudam as imagens das F-001 a F-004. No fim da F-005, roda-se `verify.sh --feature F-00N` para N = 1 a 4, com a mesma seed, e as evidências delas são regeneradas; a diferença nas imagens é esperada.
- **Outros testes:** o mesmo roteiro com escolhas em 1 e 5 passos por quadro (hash igual); a tabela de hpMax; a FOR no teto; Poder e Armadura por nível; o derivado do dano contra o recalculado; a onda no toro (costura em x e em y); o bitset com slot reaproveitado; `matarInimigo` em cenário `semCinzas`; o `textoAtivo` de cada carta e da Bolsa; a camada mundo nos dois modos; o lint do glossário nos nomes novos; a interface de `FonteDeComandos` sem o método novo.

## 9. Recomendações para as features seguintes (não decididas aqui)

- **F-006:**
  - Aparo, Frasco, swipe e toque duplo não existem no modo `modal` do tradutor; uma esquiva ou aparo pendente não atravessa o modal. Se o congelamento de 80 ms e a abertura de um modal caem no mesmo passo, o congelamento roda depois que o modal fecha;
  - o Poder temporário (+15% da esquiva perfeita) entra como campo do registro e dispara o recálculo do dano (P4) na entrada e na saída; as facas e as ondas no ar mantêm o dano fixado;
  - no Contra-ataque, a salva da União é a sequência de 4 golpes, e cada golpe cria sua onda, com o ×2 fixado na criação, como na faca;
  - os códigos de `EVENTO` e `FORMA` continuam crescendo só no fim (E5).
- **F-007:**
  - a redução A/(A + 20), teto de 75%, com a Armadura derivada do Elmo (P5), e a ordem com a Brasa Firme; o hpMax de P3 é a base da Brasa Firme e da cura do Frasco, com o mesmo arredondamento;
  - as Almas dos inimigos (50% no Oco, fluxo `drops`) e o pickup de Alma somam no contador `almas` da F-005; o pickup de Alma entra no pool de 512 com tipo próprio; a junção passa a ser por tipo (Cinza com Cinza, Alma com Alma), e sem vizinho do mesmo tipo a nova é descartada e conta; o baú nunca é descartado; o HUD de Almas em topo + 116 com os glifos da N4 e "." de milhar;
  - em APAGANDO, nenhuma morte nova solta Cinza nem soma XP; se a morte do jogador e a abertura de um modal caem no mesmo passo, a morte vale primeiro e a fila de modais é descartada, sem aplicar nada além do que a abertura do baú já aplicou; o Resultado mostra `nivel` do estado.
- **F-008:**
  - o Coroado chama `soltarBau` na morte (1 por Coroado; dourado às 10:00) e solta uma Cinza de 25 pelo caminho normal; a massa que a arena mata e os Coroados que viram cinza no marco vencido não soltam Cinza nem baú;
  - a Forja usa `uniaoDisponivel` e `aplicarUniao` e cobra o custo de `unioes.json`;
  - na Fogueira o passo roda: a fase de pickups continua e um level up pode abrir; o modal vem antes das ações da Fogueira; ondas e timers de arma ficam parados se as armas param; o baú caído no disco da arena fica alcançável;
  - o save grava o buffer da F-005 inteiro (progressão, atributos, passivas, oferta, fila de baús, pickups, efeitos de chão) e chama `sincronizarDerivados` na carga; com um modal aberto, a retomada o reabre antes de qualquer passo;
  - o baú de "1 item" com tudo no máximo vira Bolsa, como aqui; a medida do U7 (a União só às 10:00 ou às 15:00) volta com o Coroado de verdade;
  - o relógio no HUD com os glifos da N4 e ":".
- **F-009:** o HP do Lanterneiro lê `nivel` do estado no passo em que a arena se forma, já com os pendentes; a onda é acerto de arma (Postura +2 por acerto com dano > 0) e testa o retângulo contra a caixa do chefe; o multiplicador por alvo é lido no mesmo ponto de acerto; o A_FOME e o Lanterneiro ganham o seu código em `CAUSA`, e `matarInimigo` só solta Cinza com `CAUSA.arma`.
- **F-010:** a pausa automática com o modal aberto não faz nada (já está parado), e os dedos são soltos ao voltar; o nó da árvore de HP entra no Σ% do hpMax (P3); "Mãos de aprendiz" e o perfil de outros Vigilantes usam os parâmetros de progresso inicial (o campo `xp_inicial` e os atributos), sem palavra nova no cabeçalho; o toque único e o swipe para fechar (doc 11 §3.7) só se existir a tela de Opções; som e filtro de level up (doc 13) dependem de B §2 mudar; a animação da União, a faísca da barra e a Cinza subindo ficam para a arte.
- **Balanceamento, depois da F-010:**
  - Facas e Círculo não escalam com DES e FÉ em 3 (P6). Saídas: as armas de Aldric escalarem também com o atributo mais alto, bases maiores, ou a distribuição manual de pontos;
  - se os níveis-alvo do doc 10 valerem para quem caça, reduzir o XP por inimigo ou o mínimo na tela, nunca a curva de B;
  - a primeira União só às 10:00 ou às 15:00 (U7).

## 10. O que muda em dados e documentos

**No commit que registra este documento (`feature_list.json`):**

- F-005: `pendencias_antes_de_comecar` vira "Resolvidas em design/decisoes-F-005.md"; o "como" dos F-005.1 a F-005.6 segue a §8; o F-005.7 entra; as evidências passam a `modal-390x844.png` e `uniao-390x844.png`.
- F-006 a F-010: as recomendações da §9 entram nas pendências de cada uma.

**A F-005 aplica ao implementar:**

- `progressao.json` e o schema; `vigilantes.json`; `armas.json` (a onda); `cenario.schema.json` e as receitas (os campos novos; os cenários `nivel_tres`, `bau_uniao` e `vigilia_sem_cinzas`); `pt-BR.json` (A10.BAU.TITULO e A10.BAU.UNIAO);
- o comentário de `contato.ts` sobre a armadura (F-007);
- `scripts/sim20.ts`, a simulação de 20 min como medida;
- **ADR-0007**, com as decisões técnicas, as referências novas e as divergências:
  - do ADR-0002 §4 e §15.2: o tipo dos pickups (Cinza, baú comum, baú dourado); o baú nunca recusado (a Cinza mais próxima é juntada para liberar o slot); o pool de efeitos de chão com bitset; `juncoes`, `bausSoltos` e `efeitosRecusados` no mundo; a fila de baús;
  - do ADR-0002 §5 sobre B §3.1: os subfluxos `levelup` e `baus` no lugar de "um gerador";
  - do ADR-0002 §9 e §12: o level up e o baú fora da máquina de estados e a escolha fora dos `ComandosDoPasso` (M2); o `avancar(n)` do debug rodando 0 passos com o modal aberto;
  - do ADR-0002 §14: os cenários `nivel_tres`, `bau_uniao` e `vigilia_sem_cinzas`;
  - da D4 §4 e do ADR-0006 §1: a ordem do passo v5 (7b' ondas, 7e pickups);
  - da D4 W3 (o Ímã de centro a centro), P2 (o painel do debug em topo + 144) e P5 (a pausa com as passivas e a Lâmina sem nível);
  - de B §3.8 (a onda de 8 vira 6,6 pela escala da União, como a W18) e de B §3.9 (os 35% como piso, L3);
  - do F-005.5 (48 + 1/16 no lugar de 49 px) e do F-005.6 (a base 21 e o golpe 17,325);
  - do doc 03 §2.1 (a FOR sem HP), do doc 04 §1, doc 06 §2 e doc 02 §6.3 (raridade, dourado e Brasa sem efeito), do doc 10 §3.1 e doc 02 §11 (a 1ª União só às 10:00 ou às 15:00) e do doc 11 §3.7 e §5 (sem swipe, toque único, faísca e som);
  - a regra do laço quente com a medida a frio da oferta;
  - as referências de hash antigas e novas (§5) e os passos do 1º modal da Vigília normal parada (723 e 795).

## 11. Revisão adversarial

- **Método:** um workflow com 3 lentes (fidelidade às fontes, técnica e completude), cada uma seguida de um verificador cético que tentou refutar cada achado, refez as contas e mediu de novo onde havia número: 6 agentes. Notas, antes das correções: fidelidade 7,5, técnica 6,5 e completude 6,5.
- **Resultado:** 42 achados (12 de fidelidade, 15 técnicos e 15 de completude; 8 de gravidade alta, 22 média e 12 baixa). Os verificadores confirmaram os 42, alguns com a correção ajustada. Depois, ao aplicar, a correção de um foi recusada em parte:
  - C-09 (tirar a geração da oferta da janela do E6) não cabe: a oferta nasce dentro do passo que cruza o nível, então a janela com um cruzamento sempre a contém. Fica a correção do FID-11, que conta a oferta no E6 sem exclusão (≈ 0,5 B por passo, dentro da folga);
  - os verificadores já tinham refutado partes de 3 achados: o FID-04 (a Bolsa repetida na oferta já decorre da Q-22 (3)), o T-12 (o `avancar` devolver os passos já estava no M1) e o T-13 (a frase da pausa e do modal no mesmo quadro descreve um caso alcançável, porque a pausa do jogador é lida antes do passo; fica).
- **O que mudou no documento**, por tema:
  - contas: FID-02 e T-10 (a União com FOR 20 dá 46,725, e 65,415 com as Luvas nv5; o rascunho dizia 48,51); FID-03 e T-10 (sem teto, a Espada nv8 daria 38,85, e não 18,4); T-14 (teto técnico de nível 255 e o cruzamento em todo passo, que o `nivel_tres` exige);
  - estado e replay: T-01 (a oferta não nascia depois de um baú: `confirmarModal` gera a oferta em qualquer ramo, com a invariante); T-08 e C-02 (o resultado do baú não tinha onde ficar: fila de 4 baús no estado); T-02 e T-03 (o dano indexado por (arma, nível), com os graus por atributo na tabela, para não envelhecer com escrita direta no nível); T-09 (7 u32 por oferta, sempre, e funções puras para os limiares); T-11 (reserva da oferta, bitset zerado, NaN nos pools novos, campos nas receitas); T-12 (a interface opcional de `FonteDeComandos`, o retorno de `rodarFrame` e o `avancar` do debug em laço);
  - testes que reprovariam código certo ou passariam com código errado: T-06 (o hash depois das escolhas lido com a pausa do debug); T-07 (a onda testada numa arma de 1 golpe; a Lâmina tem 2 ondas vivas, e a recusa por gancho); T-04 (a variante do E6 nunca enchia o pool: enchido por gancho); FID-11 e C-09 (a oferta no E6, acima); T-13 (toques que sobram no quadro não caem na 2ª oferta);
  - specs, referências e evidências antigas: T-05 e C-04 (a Vigília normal parada abre o modal no passo 723: receita `vigilia_sem_cinzas` e a varredura dos specs); T-15 e C-03 (as 5 referências de hash, não 2, e por que a do F-004.4 muda); C-05 (as evidências das F-001 a F-004 regeneradas com o verify de cada uma);
  - fontes e divergências: FID-01 (os seis critérios reescritos, e o motivo do 48 + 1/16); FID-04 (itens distintos do baú marcados como delegados); FID-05 e C-10 (as divergências que faltavam no §0 e no ADR-0007); FID-06 (o alpha 0,4 não diverge da D4); FID-07 (o critério certo para o baú); FID-08 (o par da Cinza vermelha é de contraste, não de ΔE); FID-10 (a fonte da exclusão do Ímã de Osso); FID-12 (`xAnt` e `yAnt` vêm do ADR-0002 §3, não divergem);
  - completude: C-01 (a tabela dos códigos de EVENTO e FORMA); C-07 (U7, quando a União é possível); C-08 (o `sim20` definido: seeds, comportamentos, saída); C-12 (os cenários completos e o teto de 600 passos da busca da captura); C-13 e C-14 (recomendações às F-007 a F-010); C-15 (os campos da telemetria);
  - legibilidade: FID-09 e C-06 (os ids do §0 e do corpo batem); C-11 (o §0 em duas tabelas: para vetar e técnicas).
- **Medidas novas** (dos verificadores, Node 22 neste contêiner):
  - o 1º modal da Vigília normal parada: passo 723 (seed 1) e 795 (seed 424242); 720 nas seeds 1 a 6 e 792 nas 7 e 8;
  - no E6 (`tres_armas`, linha 19, 15.000 passos): 418 mortes e pico de 418 Cinzas sem coleta (318 com coleta), abaixo dos 512;
  - dano no código real: Espada nv8 9,45, 24,15 e 38,85 com FOR 6, 20 e 34; Espada nv1 com FOR 20, 17,25;
  - `semear` a frio: 711 a 801 B por chamada;
  - a brasa a 0,5 sobre a cunha: ΔE 12,5 do jogador; a 0,4, 15,4.
