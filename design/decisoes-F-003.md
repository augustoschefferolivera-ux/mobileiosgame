# Decisões da F-003 "Hordas"

- **Status:** decidido em 2026-10-11 por delegação do usuário ("Deixo essas decisões por você"). A grade espacial e o pool de slots (commits `96ab615` e `e883636`) vieram antes e seguem o ADR-0002 §4 e §6 sem decisão nova; o resto da implementação correu junto com o levantamento, e as medidas da física foram refeitas com esse código. As divergências entre código e documento achadas na revisão adversarial foram corrigidas (§11).
- **Como foi feito:**
  - levantamento: um workflow com 4 pesquisadores (física da horda; diretor e spawn; contato, jogador e estado; render, debug e testes de desempenho), cada um com um verificador cético que conferiu as citações, procurou a resposta em todas as fontes e refez as medições, e um crítico de completude. Saíram 127 perguntas (95 dos pesquisadores, 21 que os verificadores acrescentaram e 11 do crítico), e 20 delas os documentos já respondem (§1). O crítico também apontou 11 conflitos entre as áreas, resolvidos aqui. Os pesquisadores mediram com protótipos fora do repositório (física da horda em Node, render no Chromium da Playwright), e as medidas da física foram refeitas com o código da F-003;
  - depois, este documento passou por uma revisão adversarial (§11).
- **Fontes, em ordem de autoridade:**
  - B = `design/gdd/18-briefing-tecnico.md`;
  - o brief aprovado, com as decisões Q-xx;
  - o GDD;
  - os ADR-0002, ADR-0003 e ADR-0004;
  - D = `design/decisoes-F-002.md`;
  - o `feature_list.json`.
- **Convenção:**
  - **[delegada]** marca decisão de design ou número que nenhum documento dá; ela vale até você dizer o contrário. As outras decisões vêm de documento ou são só técnicas;
  - o que pertence a outras features (F-004 a F-010) **não** foi decidido aqui: fica como recomendação na §9, para ser fechado com as pendências daquela feature.
- **Pendências da F-003 no `feature_list.json`:**
  - "força de separação entre Ocos": §2 (S1 a S3);
  - "render da horda com SpriteGPULayer + plano B ?render=image": §7;
  - "tolerância do teste de heap de 60 s e do viés de 60% do anel": §8 (E2) e §4 (R8);
  - recomendações de D §9: inimigos sólidos (§2, S4), spawn sobre obstáculo (§4, R7), "parado" no viés (§4, R6), teste de contorno (§2, S8) e cores (§7, V1).

## 0. O que foi decidido por delegação (para vetar de relance)

| # | Decisão | Valor |
|---|---|---|
| S1 | Separação entre inimigos | restrição de não sobreposição: cada par sobreposto recebe ½ da penetração para cada lado, numa passada por passo (Jacobi); o empurrão somado de cada corpo é limitado à velocidade base dele por passo (1,32 px no Oco das Lanternas). Só sobreposição, sem "espaço pessoal" |
| S2 | Efeito visível da S1 | a horda densa e parada se sobrepõe em média ≈ 19% da soma dos raios (o teste da S5 aceita até 25%), e até ≈ 60% num par |
| S3 | Tamanhos diferentes | partilha igual entre massa (16 px) e médio (24 px), sem massa |
| S4 | Inimigos sólidos para o jogador | bloqueio mútuo sem empurrão: no passo, ninguém aumenta a sobreposição que tinha com o outro no início do passo. O jogador nunca é deslocado por corpos; obstáculos vencem por último |
| S5 | Teste da separação | um par com 2 px de sobreposição se resolve em 1 passo; o empurrão de separação de cada corpo nunca passa da velocidade dele; na linha 19 com o jogador parado, penetração média ≤ 25% da soma dos raios e máxima ≤ 70% (medido: 19% e 60%), e a horda assenta: nos passos 6.600 a 7.200, deslocamento médio ≤ 0,01 px e máximo ≤ 0,1 px por passo (medido: 0,000 e 0,014) |
| S6 | Oco Grande e Noviça na F-003 | nascem pelo roster e pelos garantidos, com HP, dano, raio e velocidade próprios, mas só com o movimento: o Oco Grande anda até 48 px do centro do jogador e para (não recua); a Noviça aproxima ou recua até 128 px. Sem ataques, telegrafos nem dano até a F-006. **Amplia o escopo de B §4**, que cita só o Oco das Lanternas |
| S7 | Distâncias de comportamento | medidas de centro a centro (antecipa a recomendação de D §9 para a F-004) |
| S8 | Teste de contorno | T = 1.800 passos; C1: 4 tipos de corpo sozinhos, com o jogador a 200 px do obstáculo e encostado nele; C2: 20 Ocos e 12 Ocos Grandes atrás do obstáculo; C3: fenda de 64 px com 30 e com 60 Ocos e com 12 Ocos Grandes; cada caso em 4 deslocamentos. Se algum não chegasse, o campo de fluxo (grade de 32 px) entraria antes de fechar a F-003. **Resultado: os 52 casos chegam; o campo de fluxo não entra** |
| K1 | Vários Ocos encostados no mesmo passo | um acerto só, com o maior dano entre eles; empate → menor slot |
| K2 | Sinal do acerto na F-003 | nenhum (nem flash nem som); o HP só aparece no debug até a F-007 |
| K3 | Knockback de contato | zero no MVP. B é omisso; o doc 05 §2 dá "baixo" sem número, e o doc 02 §5.6 condiciona o empurrão ao poise, que a Q-16 tirou do MVP; vale a analogia com a exceção da Q-16 (sem números, fora). Coerente com S4 |
| R1 | Contador do intervalo | não reinicia ao trocar de linha nem de I |
| R2 | Passos sem spawn | a janela de 30 s zera o contador; o 1º passo depois dela repõe na hora (às 5:00, 10:00 e 15:00) |
| R3 | Garantidos | entram na F-003: o Oco Grande no 1º passo da linha 1 e a Noviça no 1º da linha 3, no anel, uma vez por Vigília. O doc 02 §11 e o doc 11 §4 querem o Oco Grande "telegrafando" às 1:00; vale B (o garantido é da linha do minuto 1), e o momento do tutorial fica para a F-006 |
| R4 | Direções do anel | 256, em (k + ½) × 360°/256 |
| R5 | Raio no anel | uniforme no raio: 468 + 156 × u |
| R6 | Viés de 60% | 60% no semicírculo oposto à intenção do passo e 40% no da frente, uniforme dentro de cada um; "parado" = intenção nula (D §9) |
| R7 | Spawn sobre obstáculo | mesmo raio, direções k, k+1, k−1, k+2, k−2… até a 1ª livre (D §9 dizia "as seguintes"; a busca alternada desvia menos); sem nenhuma livre, o spawn é recusado |
| R8 | Tolerância do viés (F-003.9) | N = 10.000 por caso, seeds 1 a 5: fração oposta em [0,58; 0,62] em 4 direções; parado, cada quadrante em [0,233; 0,267] |
| R9 | Anel medido no centro do corpo | mantém os 468 a 624 px da Q-06; a borda do corpo aparece no canto da tela em 0,34% dos spawns de massa e 0,88% dos de médios, o que enfraquece o "sempre fora da vista" da Q-06 (a alternativa, somar o raio, mudaria o número aprovado) |
| M1 | Roster das linhas de marco (5, 10 e 15) sem arena | o da linha anterior. B e o ADR-0002 Apêndice A deixam o roster vazio ("—"/`[]`), mas a Q-01 e o ADR-0002 §8.5 mandam manter o mínimo da linha, o que exige roster; o "idem" do doc 07 §3.2 dá a leitura. Diverge do Apêndice A (ADR-0005) |
| T1 | TETO na F-003 | override (`?teto`) e classe de tela; **a sonda, o cache `vdc.teto` e o rebaixamento saem da F-003** (a sonda do ADR-0002 §13 pede 400 projéteis). Reduz o "benchmark no boot" de B §3.7 e diverge do ADR-0002 §11.1 e §13 (ADR-0005); o destino é recomendação (§9). Até lá, todo aparelho fica com 300 |
| T2 | Cenário horda | receita em JSON (o formato `vigilia` só nasce na F-008): linha 19 fixa, jogador parado e invulnerável, sem armas, tutoriais vistos, TETO pelo `?teto`; os 300 nascem no 1º passo. Uma variante, `horda_rotativa`, remove e repõe 10 inimigos a cada 60 passos, só para o teste de heap |
| T3 | Cenário sem_horda | diretor desligado, para os testes e a evidência de movimento das F-001 e F-002 continuarem valendo |
| V1 | Cores dos inimigos | delegados: qual das 3 cores da facção (doc 13 §1.3) vai para cada tipo (o âmbar de lanterna e o branco-osso ficam de fora) e o hex: Oco das Lanternas #76884c (verde-musgo), Oco Grande #9fa39a (pele cinza), Noviça de Sal #8994b4 (sal azulado), sem borda |
| V2 | Convertido | desenhado como um Oco Grande comum |
| V3 | Quadrados dos médios | alinhados aos eixos, sem girar para o jogador |
| V4 | Painel do debug | `?debug=1` mostra um painel DOM com fps, vivos por tipo, teto, CPU e render (antecipa uma parte do painel previsto para a F-010). **Exceção a B §3.15, só no build de debug:** o painel mostra identificadores do `__GAME_DEBUG__` fora de `t()` |
| E1 | F-003.4 neste contêiner | o WebGL roda por software (SwiftShader) e nem uma cena vazia chega a 55 fps. O teste confere **sempre** a CPU do nosso código com 300 vivos e CPU 4×: p95 de um passo + p95 do resto do quadro até `PRE_RENDER` < 10 ms, a parte do orçamento de B §3.13 (sim + render < 10 ms) que não depende da GPU. O fps ≥ 55 e o quadro inteiro só são conferidos **com GPU de hardware**; com GPU por software, o teste registra "fps não conferido" e o verify avisa. A F-003 pode fechar como pronta com o F-003.4 literal pendente; o dono da medida é o build de teste do iPhone (F-006, Q-29). **Muda a verificação de um critério de B** |
| E2 | Heap de 60 s (F-003.7) | no cenário `horda_rotativa`, 90 s de aquecimento (calibrado; eram 30 s); Δ dos bytes ≤ 32 KiB no total e Δ ≤ 100 objetos em cada construtor, fora uma lista fechada de exclusões (código do JIT e entradas de desempenho do navegador, listadas no relatório); limites confirmados em 3 rodadas de calibração no `horda_rotativa` (ADR-0005 §7) |
| E3 | Captura do debug | `debug-300-vivos-390x844.png`, no passo 1.800 do cenário horda, com a simulação pausada |
| E4 | Zero alocação (B §3.13) | HeapProfiler amostral do Node (64 B), 6.000 passos do cenário horda (300 vivos) mais 6.000 quadros de `prepararHorda` e do escritor GPU: ≤ 16 B por passo nas funções de `src/` (medido: 8,5 a 9,2; a mutação de um `new Float32Array(2)` por passo mede ≈ 210 e reprova). O "zero" de B vira "sem alocação nossa": o resto é do tiering do V8 e do Vitest |

## 1. O que os documentos já respondem

- **Convenção de passos** (técnica): "passo N" é o valor do contador depois de N passos; o 1º passo leva o contador e o relógio a 1 (r = 1).
- **Linha do diretor = minuto inteiro decorrido** (Q-10; ADR-0002 §8, passo 1), contado no relógio do passo, já incrementado: a linha m vale de r = 3.600·m a 3.600·(m + 1) − 1. Depois da linha 22, vale a 22 até a F-009 encerrar a Vigília às 23:00 (técnico).
- **1ª reposição no 1º passo da Vigília:** o doc 02 §11 diz "| 0:00 | 15 Ocos lentos. |". Com o diretor da Q-07 ("a cada intervalo, se abaixo do mínimo, spawna a diferença de uma vez"), os 15 nascem no 1º passo (r = 1).
- **Intervalo em passos:** `intervalo_efetivo = intervalo × (1/I)` (B §3.7), arredondado para o inteiro mais próximo (ADR-0002 §3). Com I = 1,0, `intervalo_s × 60` é inteiro em todas as linhas (120, 96, 84, 72, 60, 54, 48, 48, 42, 36, 36, 30, 30, 27, 24, 24, 21, 18, 18, 18). Com I = 1,1: 109, 87, 76, 65, 55, 49, 44, 44, 38, 33, 33, 27, 27, 25, 22, 22, 19, 16, 16, 16, sem empate em ,5.
- **Alvo:** "spawna até preencher" (doc 07 §3.1) com "vivos abaixo de `min_efetivo`" (ADR-0002 §8, passo 4) só se cumpre com o teto: 15 × 1,1 = 16,5 → 17. Calculado em inteiros: `alvo = ⌊(min × I10 + 9) / 10⌋`, com I10 = I em décimos. Em double, 90 × 1,1 = 99,00000000000001, e 5 linhas sairiam com 1 a mais.
- **O que conta como vivo e a conversão de excedente:** o TETO conta todos os inimigos vivos (Q-08 (a)). A reposição segue o ADR-0002 §8, passo 7, aprovado no §15 item 9, que contém o passo 4: `vivosEq = slots + 9 × convertidos`; `falta = alvo − vivosEq`; `livres = TETO − slots`; entram `n = min(falta, livres)`, dos quais `g = min(⌊max(0, falta − livres)/10⌋, n)` são convertidos.
- **Linhas de marco (5, 10 e 15) sem arena:** valem o mínimo da linha do marco, com o intervalo da linha anterior (Q-01; ADR-0002 §8, passo 5). O roster é decisão delegada (M1, §4). Na F-003 não há arena, então isso vale desde r = 3.600·m; na F-008, só depois que a arena se desfaz.
- **Janela sem spawn:** 3.600·m − 1.800 ≤ r < 3.600·m, para as linhas com `marco` (5, 10 e 15). B §3.7 ("nenhum spawn nos 30 s antes de um marco"), o brief §5.4 ("a partir de 4:30") e a Q-11 (o 19:30 não entra). Dentro dela não nasce nada: nem reposição, nem convertido, nem garantido.
- **Escala no spawn** (B §3.6; Q-10): `hp = fround(hp_base × (100 + 12·min) × I10 / 1.000)` e `dano = fround(dano_base × (100 + 5·min) / 100)`, sem arredondar para inteiro. A via inteira e a via double dão o mesmo Float32 em todos os tipos, minutos e valores de I (conferido); a via inteira fica por clareza.
- **Convertido** (B §3.7; Q-08; ADR-0002 §8.7): um slot de tipo Oco Grande com a flag `convertido`. HP = `fround(10 × 12 × (100 + 12·min) × I10 / 1.000)`, calculado de uma vez e nunca como soma de 10 parcelas (dá outros bits no minuto 19 com I = 1,1: 432,95999 pela via inteira, contra 432,96002 somando as 10 parcelas em double e 432,95996 acumulando em Float32). Dano de Oco Grande escalado. Raio, velocidade e movimento de Oco Grande. XP e Almas entram na morte (F-005 e F-007).
- **Wrap do anel:** o ADR-0002 §8, passo 6, aceitou que, perto da horizontal, a ponta do anel passe da meia-largura do mapa e o wrap inverta o viés (3,8% dos spawns). Nos spawns que dão a volta, a distância no toro fica em [546, 624]; nos outros, é o próprio r ∈ [468, 624). Então o F-003.9 (468 a 624 px) vale sem exceção.
- **Invulnerabilidade de contato:** o período é de 18 passos, contando o do acerto: só ele dá "exatamente 5/s" (Q-13 (a): 1,5 × 60/18 = 5). Com 19, seriam 4,74/s.
- **Valor do acerto:** `acerto = dano × 0,3`, com o dano do inimigo escalado e fixado no spawn (Q-13 (a); Q-10). O fator 0,3 é uma constante própria, separada dos 18 passos, porque o nó Casco (F-010) alonga a invulnerabilidade sem mudar o acerto.
- **Quem causa contato:** só `dano_tipo = "contato_por_s"`, ou seja, o Oco das Lanternas (B §3.6; `inimigos.json`). O Oco Grande, a Noviça e o convertido ("dano normal de Oco Grande", Q-08) não causam.
- **HP do jogador:** 150 (B §3.3: "130 (passiva Brasa Firme: +15% → 150)"; F-007.6). Em 0 não acontece nada até a F-007 (B §4 põe o Apagar lá).
- **Dano bruto:** o F-003.5 mede antes da armadura e da Brasa Firme, que são das F-005 a F-007.
- **A invulnerabilidade de contato não desliga a solidez:** ela só "bloqueia dano de contato" (Q-14); só os i-frames da esquiva atravessam a horda (doc 02 §5.3, F-006).
- **Velocidades por passo** (B §3.3 e §3.6): v = velocidade × 4,5 × 32 ÷ 60, em double: Oco das Lanternas 1,32 px, Oco Grande 1,68 px, Noviça 1,92 px.
- **Formas, tamanhos e raios:** círculos para a massa e quadrados para os médios (B §2); 32 e 48 pt (B §3.2); hitbox circular de 16 e 24 px (D, H1), com a origem do desenho no centro.
- **`?render`:** o padrão é `gpu`, e o build de produção ignora o parâmetro (ADR-0002 §14 e §15 item 3).
- **Grade:** consulta pelo intervalo em px, nunca pela vizinhança fixa de 3 × 3 células (ADR-0002 §6; já implementado e testado contra a força bruta).
- **Hash:** cobre o buffer inteiro (ADR-0003 §3). Os slots mortos ficam zerados, então ele contém os "slots ativos" do ADR-0002 §5.
- **Sem HUD de HP na F-003:** cada elemento do HUD entra com o sistema que ele mostra (brief §5.12); a barra de HP é da F-007.

## 2. Física da horda

- **Separação (S1, S2): restrição posicional de não sobreposição, Jacobi, uma passada por passo. [delegada]**
  - Para cada par (i < j) com d < rᵢ + rⱼ, medida pelo delta toroidal: pen = rᵢ + rⱼ − d; i recebe −½·pen·n e j recebe +½·pen·n, com n = (pⱼ − pᵢ)/d.
  - Os empurrões vão para dois `Float64Array(500)` de rascunho, fora do estado, zerados a cada passo. Só são aplicados depois de visitados todos os pares; as posições ficam congeladas durante a passada.
  - O empurrão somado de cada corpo é limitado, como vetor, à velocidade **base** do tipo por passo (vᵢ), independente do passo de comportamento daquele passo (um Oco Grande parado a 48 px continua com limite 1,68).
  - Não há ganho, "força" contínua, RNG nem trigonometria: a "força de separação" do brief vira uma restrição com um só parâmetro, o limite de 1 × vᵢ por passo, que vem dos dados e foi escolhido contra 0,5·v e 2·v, medidos (o ½ vem da simetria).
  - Alcance: só sobreposição. A consulta usa a grade com R = rᵢ + R_MAX, com R_MAX = o maior raio dos tipos que podem nascer (§4; 24 na F-003), e o par só é processado se j > i.
  - **Medido** com o código da F-003, o jogador parado e a Charneca: 300 Ocos das Lanternas assentam em menos de 1 min (deslocamento médio de 0,000 px por passo); com a linha 19 (pesos 6/5/4), a horda assenta em ≈ 2 min (nos passos 6.600 a 7.200, média de 0,000 e máximo de 0,014 px por passo), com penetração média de 8,0 px por par em contato (19% da soma dos raios) e máxima de ≈ 60%, num disco de raio ≈ 310 px em volta do jogador.
  - Alternativas medidas e descartadas: limite 0,5·v (a horda colapsa, 15,5 px de média); 2·v (tremor de 3 a 3,6 px); sem limite (saltos de até 46 px, acima do invariante de 32 px de D §2); Gauss-Seidel (agitação de 1,3 px, viés de ordem); boids (não assenta); sem separação (a horda vira um ponto e a grade concentra tudo em poucas células).
- **Teste da separação (S5). [delegada, proposta de teste]** Vitest sem obstáculos e com o jogador longe: um par com 2 px de sobreposição, chamando só a separação (sem o passo de comportamento), se resolve em 1 passo (cada um anda 1 px; resíduo < 1e-3); o empurrão de separação de cada corpo nunca passa de vᵢ (+1e-9); três corpos em coordenadas exatas dão o mesmo resultado em qualquer ordem de inserção (Jacobi). Na Charneca, com a linha 19 e o jogador parado: sem NaN; penetração média ≤ 25% e máxima ≤ 70% da soma dos raios do par; nos passos 6.600 a 7.200, deslocamento médio por corpo ≤ 0,01 px e máximo ≤ 0,1 px por passo. As mutações "sem o limite", "limite 2·v" e Gauss-Seidel reprovam.
- **Tamanhos diferentes (S3): partilha igual, sem massa. [delegada]** Com a linha 19, a ponderação por área deu sobreposições parecidas. Sobreposição média por par massa–massa / massa–médio / médio–médio: partilha igual 7,2 / 7,0 / 9,7 px (código da F-003, passo 7.200; o protótipo dava 6,4 / 7,0 / 10,0); ponderação por área 6,5 / 8,4 / 8,7 px (protótipo). O caso do Coroado, maior, fica para a F-008 (§9).
- **Inimigos sólidos para o jogador (S4): bloqueio mútuo, sem empurrão. [delegada]**
  - Regra simétrica: no passo, ninguém aumenta a sobreposição que tinha com o outro no início do passo. O empurrão ao longo da normal é `max(0, pen_depois − max(0, pen_inicio))`.
  - **Fase do jogador:** cada inimigo é um círculo parado na posição do fim do passo anterior; 2 passadas em ordem de slot, sem desempate (como D §3 manda para o jogador); obstáculos por último. `pen_inicio` é medida entre o (xAnt, yAnt) do jogador e o inimigo.
  - **Fase dos inimigos,** depois da separação: o inimigo não pode aumentar a sobreposição com o jogador; `pen_inicio` é medida entre o (xAnt, yAnt) dos dois.
  - Consequências: o jogador nunca é deslocado por um corpo; a horda cerca e bloqueia ("cerco físico", Q-13; doc 02 §5.2 e §3; doc 10 §3.1); a sobreposição herdada (um corpo imprensado contra um obstáculo, ou a saída da esquiva na F-006) não cresce nem é expulsa de uma vez, e cada empurrão fica ≤ 2v + 2,4 px.
  - Medido: com o empurrão inteiro, como de um obstáculo, um Oco imprensado numa folga de 12 px empurrava o jogador parado 33,7 px em 60 s, e um corpo que começava o passo sobreposto levava empurrões de até 40 px (acima do invariante). Com a regra simétrica, nada disso acontece.
  - Se o jogador empurrasse a horda, ele a atravessaria andando (2,4 > 1,32 px por passo) e não haveria cerco.
  - **Risco de design, para reavaliar no build de iPhone (Q-29):** 6 a 7 Ocos já fecham o jogador parado. Na F-003, sem armas (F-004) nem esquiva (F-006), quem ficar parado ≈ 25 s no minuto 0 fica preso pela horda (o HP 0 não tem efeito até a F-007); por isso os testes que não se movem usam o `sem_horda` (T3).
- **Ordem do passo** (técnica):
  1. `passo` e `relogio` + 1;
  2. jogador: xAnt; intenção; deslocamento; bloqueio pelos inimigos (S4); obstáculos; normaliza no toro; prompt de mover;
  3. inimigos, em ordem crescente de slot: xAnt; deslocamento de comportamento em direção ao jogador já movido; normaliza;
  4. grade (counting sort, slots crescentes);
  5. separação (S1);
  6. por inimigo: soma a separação; bloqueio pelo jogador (S4); obstáculos com desempate; normaliza;
  7. contato e dano (§3), nas posições finais;
  8. rotação do cenário, se houver (§5);
  9. diretor (§4). Quem nasce fica com xAnt = x e só anda no passo seguinte.
- **Laço quente** (técnica): em todo código que roda por inimigo dentro do passo (comportamento, separação, bloqueio do jogador, colisão, contato) e por slot em `prepararHorda`, nenhuma chamada fora de linha recebe ou devolve double. O delta toroidal, a normalização no toro, o passo de comportamento, o intervalo de células e a célula do ponto são escritos em linha (como em `consultarGrade`), e a colisão lê e escreve num `Float64Array` de rascunho (`COLISAO`). No V8, cada double que atravessa uma chamada não inlinada vira um HeapNumber: medido, o 1º código alocava ≈ 48 KB por passo com 300 vivos; com a regra, ≈ 9 B (E4). No JSC (iPhone) os doubles não viram objeto, mas o Chromium dos testes e o GC de qualquer navegador baseado no V8 ganham com a regra. O caminho de nascer (≈ 0,2 por passo) roda frio, no interpretador, e fica com o teste de heap (E2).
- **Rascunhos** (técnica): a grade, as somas da separação e a lista de slots vivos são rascunhos de módulo, alocados uma vez e refeitos inteiros a cada passo, sem memória entre passos; dois estados podem alternar passos (testes, a sonda futura). O que é fixo (lista de obstáculos por célula, tipos, timeline) fica nos dados da Vigília.
- **Ordem de visita** (técnica): toda a física percorre os slots de 0 a 499 em ordem crescente, pulando os livres, e não a lista densa. Assim, o resultado não depende da história de trocas da lista densa. No Jacobi, a soma de cada corpo segue i crescente (pares em que ele é o j) e depois a ordem das células da consulta (pares em que ele é o i).
- **Comportamento até a F-006 (S6, S7). [delegada]**
  - Oco das Lanternas (`perseguir_reto`): passo = mín(v, d) na direção do jogador, para não cruzar o centro.
  - Oco Grande e convertido (`aproximar_e_atacar`, "para a 1,5 corpo"): passo = mín(v, máx(0, d − 48)). Para a 48 px e não recua.
  - Noviça (`manter_distancia`, "mantém 4 corpos"): passo com sinal = mín(v, máx(−v, d − 128)): aproxima ou recua até 128 px, sem passar do alvo. Medido: sem o recuo, a Noviça parada no anel de 128 px é arrastada pelos Ocos que passam para dentro, e a horda da linha 19 nunca assenta (média de 0,09 e picos de 2,2 px por passo depois de 2 min); com o recuo, ela assenta.
  - d é medida de centro a centro, pelo delta toroidal. A 48 px, o Oco Grande fica a 8 px da borda do jogador (24 + 16 = 40) e não o toca.
  - O código e os testes marcam esse comportamento como provisório; a F-006 acrescenta telegrafos e ataques.
  - Por que já na F-003: o F-003.3 exige Ocos Grandes convertidos, e o cenário horda do ADR-0002 §14 é a linha 19 (pesos 6/5/4, ≈ 60% de médios). Trocar os médios por Ocos das Lanternas mudaria o sorteio e a carga do teste de desempenho.
- **Obstáculos** (técnica): cada inimigo usa a colisão genérica de D §3 (2 passadas, desempate), mas só contra os obstáculos de uma lista estática por célula da grade de 64 px, montada uma vez com os obstáculos cuja distância ao retângulo da célula é < r_o + R_MAX + 1 px. A célula é a da posição antes da colisão, levada ao toro. Como a menor folga entre obstáculos da Charneca é 67,4 px, maior que 2·R_MAX + v, nenhum corpo toca dois obstáculos de uma vez, e o resultado é bit a bit o da lista inteira (teste de equivalência). Sem isso, seriam 54 × 2 × 300 testes por passo (≈ 0,25 ms a mais). O jogador continua com a lista inteira.
- **Vetor do desempate** (técnica): o inimigo passa a `colidirComObstaculos` o deslocamento de comportamento do passo, sem a separação e sem o bloqueio do jogador, que são ruído para o caso simétrico que o desempate resolve.
- **Casos degenerados** (técnica): dois corpos no mesmo ponto usam n = (1, 0), o de slot menor indo para −x; no par jogador–inimigo, n = (1, 0) do jogador para o inimigo. Nenhum NaN.
- **Invariante de 32 px** (D §2): com a regra simétrica, cada parcela é limitada (comportamento ≤ v, separação ≤ v, bloqueio pelo jogador ≤ 2v + 2,4 px, obstáculo ≤ a penetração restante). Um teste instrumentado confere cada empurrão por inimigo e por passo.
- **Spawn sobre outro inimigo:** permitido. A separação desfaz a sobreposição fora da vista.
- **Teste de contorno (S8). [delegada]**
  - Vitest com obstáculos sintéticos de 96 px (r = 48) e o jogador parado, alinhados num eixo (|Δ| < meia dimensão do mapa, para o delta toroidal não mandar o corpo pelo outro lado), com uma asserção de que o segmento inicial corpo → jogador cruza o obstáculo. Cada caso roda com o grupo deslocado em {0; 0,001; 7; 23} px na perpendicular. T = 1.800 passos (30 s).
  - C1: duas posições do jogador, a 200 px do centro do obstáculo e encostado nele (64 px); em ambas, um corpo começa a 400 px do jogador, atrás do obstáculo. Corpos: um Oco das Lanternas, um Oco Grande, uma Noviça e um corpo sintético de raio 24 que persegue reto.
  - C2: 20 Ocos das Lanternas em bloco 4 × 5 (34 px entre centros) e 12 Ocos Grandes em 3 × 4, atrás do obstáculo.
  - C3: fenda de 64 px entre dois obstáculos, com 30 e com 60 Ocos das Lanternas, e com 12 Ocos Grandes.
  - Critério de chegada em T: Oco das Lanternas em contato (§3); Oco Grande a d ≤ 48 + 1e-3; Noviça a |d − 128| ≤ 1e-3; corpo sintético encostado. Em C2 e C3: todos a d ≤ R_emp + 64, com R_emp = √(Σ 2√3·rᵢ²/π + 16²), o raio do disco que comporta os N empacotados.
  - Medido no protótipo: o pior caso chega em ≤ 772 passos (margem ≥ 2,3×).
  - **Falha = algum caso fora** → implementar a reserva antes de fechar a F-003: campo de fluxo por BFS a partir da célula do jogador, numa grade de 32 px (37 × 80; a de 64 px fecharia a fenda de 64), recalculado quando o jogador muda de célula. Se passar, a reserva não é implementada.
  - A mutação "sem desempate" tem de reprovar o C1 com deslocamento 0.
  - **Resultado** (`tests/logica/mundo/contorno.test.ts`): os 52 casos chegam em T, e a reserva não é implementada. A mutação "sem desempate" reprova 17: todo o C1 com deslocamento 0 e 0,001 (4 corpos × 2 posições do jogador) e o C2 dos 12 Ocos Grandes com deslocamento 0.

## 3. Contato e jogador

- **Contato** (técnica): distância no toro entre os centros ≤ r_jogador + r_inimigo + ε, com ε = 1/16 px, comparada pelos quadrados em double: d² ≤ (16 + 16 + 1/16)² = 1.028,00390625 para o Oco das Lanternas.
  - É medido uma vez por passo, nas posições finais (as que o render desenha e o hash vê).
  - O ε existe porque um corpo empurrado até d = 32 e gravado em Float32 fica com d² > 32² em ≈ 50% dos casos (erro máximo de 1,3e-4 px). 1/16 px é 1/8 de pixel do canvas: invisível.
  - Uma 1ª proposta (que o crítico de completude preferia) media a penetração antes do bloqueio, sem ε. Ela falha num anel de 7 Ocos encostados sem ninguém atrás: cada par vizinho se sobrepõe 4,2 px, a componente radial da separação (1,8 px para fora, limitada a 1,32) anula a perseguição, a penetração antes do bloqueio fica nula e o contato nunca dispara. Um teste fixa esse caso.
  - Medido na implementação: um anel **perfeitamente simétrico** de 7 ou mais Ocos que chega junto, partindo de 33 a 40 px, para a ≈ 34,7 px (a separação limitada anula a perseguição antes do contato) e não acerta. Com chegadas reais (direções e distâncias aleatórias, de 3 a 40 Ocos, 20 seeds), o jogador parado leva os 5/s em todos os casos: os primeiros encostam e ficam (um anel em [32; 34,7] px é estacionário). O teste fixa o regime com 7 e 20 Ocos.
- **Timer** (B §3.3; Q-13 (a)): `invulContato` (Uint8) no registro do jogador. No início da fase de contato, se > 0, decrementa. Só há acerto com 0 depois do decremento; o acerto o põe em 18. Acertos possíveis em t, t + 18, t + 36…
  - O timer conta passos simulados: corre na Fogueira e para na pausa, no level up e no congelamento, em que o passo não roda.
  - A varredura dos inimigos só roda quando o timer está em 0.
- **Vários Ocos encostados (K1): um acerto, com o maior dano entre os encostados; empate → menor slot. [delegada]** O máximo não depende de ordem. Com "o 1º em ordem de slot", um Oco antigo do minuto 0 esconderia o dano maior dos novos. Na F-003, o slot escolhido não muda o HP; ele fica para a telemetria e a esquiva perfeita.
- **Dano ao jogador** (técnica): uma função única, `danoAoJogador(estado, bruto, origem)`, com a origem em código numérico (contato na F-003). Ela respeita o bit de invulnerabilidade do cenário (§5): com ele, o contato é detectado e o timer corre, mas o HP não muda. As features seguintes acrescentam etapas a ela: i-frames e aparo (F-006), Brasa Firme e armadura (F-007), Bigorna no peito só para o contato (F-010).
- **HP:** campo `hp` (Float32) no registro do jogador, nascendo em 150 = `round(130 × 115 / 100)`. Cada acerto faz `hp = fround(max(0, hp − acerto))`. Em 0 a Vigília continua (§1); `hpMax` entra com o 1º consumidor (o HP por nível da F-005 ou o Frasco da F-007). A regra geral de arredondamento do HP com bônus continua com a F-005 e a F-007.
- **Knockback de contato (K3): zero no MVP. [delegada]** B não dá knockback de contato (só o Grito empurra, §3.6). Pela Q-00, o "baixo" do doc 05 §2 preencheria a omissão, mas ele não tem número, e o doc 02 §5.6 só empurra se o knockback passar do poise, que a Q-16 tirou do MVP "porque faltam todos os números". Vale a mesma exceção. Coerente com S4: nenhum corpo desloca o jogador.
- **Sinal do acerto (K2): nenhum na F-003. [delegada]** Sem flash, tint nem som; o HP e o timer aparecem em `__GAME_DEBUG__.jogador`. Branco e #ff2a2a são reservados (doc 11 §1; doc 13 §1.3), B §2 não dá som de contato, e o HP 0 não tem efeito, então não há "morte por acúmulo invisível" (doc 10 §1). A barra de HP e o sinal do acerto são da F-007 (§9).

## 4. Diretor de spawn

- **Estado do diretor** (técnica): no bloco do mundo, `intensidade10` (I em décimos: 10 ou 11; sempre 10 na F-003), `espera` (passos até a próxima reposição), `garantidosEntregues` (um bit por linha) e contadores, todos no hash: `spawns`; `recusados` (o pool físico cheio, ADR-0002 §4; com TETO ≤ 500 fica sempre em 0, e os testes conferem); `garantidosPerdidos` (garantido com os slots no TETO); `semPontoLivre`.
- **Tipos que podem nascer** (técnica): os do roster e dos garantidos de todas as linhas, mais o Oco Grande (convertido). Na montagem dos dados (`criarDadosDaVigilia`), cada um precisa ter tamanho, velocidade, HP, dano e comportamento de movimento; um número pendente (como o tamanho do Coroado, da F-008) é erro no boot, com teste. O R_MAX sai desse conjunto (24 na F-003). A linha não é guardada: ela sai do relógio (ou da linha fixa do cenário), e guardá-la poderia divergir. Isso diverge da letra do ADR-0002 §4 ("diretor (linha, acumulador de intervalo)") e vai para o ADR-0005.
- **Calendário** (técnica, com R1 e R2): em cada passo ativo do diretor, se `espera` = 0, faz a reposição e recarrega `espera` com o intervalo efetivo da linha e do I correntes; em seguida, `espera` − 1. A recarga acontece mesmo quando ninguém nasce ("a cada intervalo, se abaixo"). Com `espera` = 0 no início, a 1ª reposição é no 1º passo (r = 1, §1), e na linha 0 as seguintes caem em r = 1 + 120k.
  - **R1 [delegada]:** trocar de linha ou de I não reinicia o contador; o intervalo novo vale a partir da próxima recarga (atraso máximo de 24 passos, 120 → 96).
  - **R2 [delegada]:** num passo da janela de 30 s, `espera` = 0 e nada mais. O 1º passo depois dela repõe na hora (às 5:00, 10:00 e 15:00 na F-003). A extensão à arena e ao relógio parado é recomendação para a F-008 (§9).
- **Roster das linhas de marco (M1). [delegada]** B §3.7 e o ADR-0002 Apêndice A deixam o roster das linhas 5, 10 e 15 vazio ("—"/`[]`), e o JSON da região segue o Apêndice. Mas a Q-01 e o ADR-0002 §8.5 mandam manter o mínimo da linha do marco, e um mínimo sem roster não tem o que fazer nascer. A timeline compilada usa o roster da linha anterior, que é o "idem" do doc 07 §3.2. A divergência com o Apêndice A vai para o ADR-0005; a alternativa (o roster explícito no JSON, emendando o Apêndice) fica para quando a F-008 mexer nessas linhas.
- **Garantidos (R3). [delegada]**
  - Entram na F-003, porque fazem parte da tabela de B §3.7; o comportamento completo e o prompt de tutorial são da F-006.
  - Nascem no 1º passo ativo da linha (r = 3.600 e r = 10.800, fora de janela), antes da reposição desse passo, uma vez por Vigília (bit por linha em `garantidosEntregues`). A posição é a do anel, pela mesma regra. Contam nos vivos e no TETO; com os slots no TETO, não nascem e somam em `garantidosPerdidos`.
  - HP no nascimento: Oco Grande 112, Noviça 108,8.
  - O campo `tutorial` do JSON é ignorado na F-003. Com a linha fixa do cenário, os garantidos não entram.
- **Sorteio do tipo** (técnica): os pesos passam a inteiros no schema (`"type": "integer", "minimum": 1`; os dados já são 10, 1, 2, 8, 3, 6, 4 e 5). O índice é ⌊u × W / 2³²⌋ sobre os pesos acumulados na ordem do JSON, com u de 32 bits (u × W é exato em double; viés ≤ W/2³² ≈ 3,5e-9, sem rejeição, para o consumo do fluxo ser fixo).
- **Consumo do fluxo `diretor`** (técnica): cada spawn do roster faz sempre 4 sorteios, nesta ordem: tipo, lado, direção e raio. Garantidos e convertidos fazem 3 (lado, direção e raio). O lado é sorteado também com o jogador parado (e ignorado), para a sequência de tipos não depender do movimento. Numa reposição, nascem primeiro os n − g do roster, um a um, e depois os g convertidos.
- **Direções (R4). [delegada no número]** Tabela literal de 256 vetores unitários em (k + ½) × 360°/256 (ADR-0002 §5: "tabela literal ... gerada offline e versionada"). O meio passo deixa as entradas fora dos eixos e das diagonais, então as 8 direções do teclado nunca são perpendiculares a uma entrada. O índice é `u >>> 24`. Um script versionado (`scripts/gerar-direcoes.py`, com `--conferir` por igualdade exata, porque a tabela é a fonte bit a bit da simulação e o gerador arredonda corretamente a partir de 50 dígitos) calcula as 64 entradas do 1º quadrante com alta precisão e monta as outras por rotação exata de 90° e por negação, de modo que v[k + 128] = −v[k] e a rotação de 90° valem bit a bit. Com 256 direções, o passo é de 1,4° (≈ 11,5 px a 468 px), sem fileiras visíveis.
- **Anel medido no centro (R9). [delegada]** 468 > 464,9 (meia-diagonal) deixa o centro sempre fora da vista (Q-06). A borda do corpo aparece no canto da tela em 0,34% dos spawns de massa e 0,88% dos de médios. Somar o raio ao anel manteria a propriedade, mas mudaria o número aprovado.
- **Raio (R5): uniforme no raio, r = 468 + 156 × u, em double. [delegada]** Mais simples que o uniforme na área (√), com diferença de jogo pequena (a densidade na borda interna é 1,33× a da externa).
- **Viés (R6). [delegada, seguindo a recomendação de D §9]**
  - A direção de referência é a intenção saneada do próprio passo, a mesma que moveu o jogador: com intenção, (dirX, dirY) já atualizados no passo; o diretor recebe o "houve intenção" de `moverJogador`.
  - "Parado" = sem intenção (vetor nulo, NaN ou infinito), mesmo com o corpo travado num obstáculo ou na horda; com intenção, conta como em movimento mesmo sem sair do lugar. É a regra da mira das armas (ADR-0002 §7).
  - Com intenção: lado oposto se u < 2.576.980.378 (⌈0,6 × 2³²⌉), senão a frente. Sorteia-se k; se v_k · d cair do lado errado (oposto pedido e > 0, ou frente pedida e < 0), usa-se k + 128. O produto 0 fica como está (não acontece com a tabela deslocada e as 8 direções do teclado). Assim, 60% caem no semicírculo oposto e 40% no da frente, uniformes dentro de cada um; "60% + uniforme" daria 80%.
  - Parado: k uniforme, lado ignorado.
- **Spawn sobre obstáculo (R7). [delegada]**
  - Ponto livre: distância no toro a cada obstáculo ≥ r_obstáculo + r_inimigo (a partir da F-008, só os ativos).
  - Com o mesmo raio, testa k, k + 1, k − 1, k + 2, k − 2… (mod 256), até 256 tentativas, e vale a 1ª livre, sem novo sorteio. O teste de 60% mede o vetor sorteado, antes da busca.
  - Medido (20.000 posições do jogador na Charneca): 20% dos pontos sorteados caem sobre obstáculo; a busca alternada desvia no máximo 7 passos (≈ 10°), com fração oposta de 0,598, contra 12 passos (≈ 17°) e 0,594 na unidirecional de D §9.
  - Sem nenhuma direção livre, o spawn é recusado e soma em `semPontoLivre` (separado de `recusados`); a cota tenta de novo na reposição seguinte. Na Charneca isso é geometricamente impossível.
  - A colisão nunca conserta um spawn: nenhum corpo começa um passo sobreposto a um obstáculo (empurrar para fora moveria até 72 px e poderia trazer o corpo para a vista).
- **Testes do diretor** (técnica): na F-003 ninguém morre, então os testes de reposição e da janela removem inimigos com `removerInimigo`. F-003.2: remover k vivos e conferir que, na reposição seguinte, entram exatamente `alvo − vivosEq`. F-003.8: em cada passo das janelas, remover todos os vivos e conferir que `spawns` não muda; no passo seguinte à janela, a reposição volta; às 19:30, a reposição continua. As simulações longas têm timeout explícito.
- **Tolerância do viés (R8). [delegada, proposta de teste]** Função pura de posição, sem obstáculos, com a seed do fluxo `diretor` e N = 10.000 spawns por caso, seeds 1 a 5. Em movimento, com d em {(1, 0), (0, 1), (−1/√2, 1/√2), (0,6; −0,8)}, a fração com v · d < 0 fica em [0,58; 0,62] (σ = 0,0049; ±0,02 ≈ 4σ, que separa 0,80, 0,50 e 0,40, os erros comuns). Parado: cada quadrante em [0,233; 0,267] e cada meio-plano dos 4 d em [0,48; 0,52]. A distância no toro é conferida em [468 − 1e-3; 624 + 1e-3] (a posição é gravada em Float32, com meio ulp de até 1,2e-4 px por coordenada) na mesma função com os obstáculos da Charneca, em ≥ 1.000 posições do jogador, inclusive na costura.

## 5. TETO e cenários

- **TETO (T1). [delegada]**
  - O TETO vai para o cabeçalho do estado como parâmetro da Vigília e entra no hash (ADR-0002 §13: "TETO fixo por Vigília").
  - `src/plataforma/teto.ts` ganha a função pura `decidirTeto({ override, cache, tela, sonda })`, com as 5 camadas na ordem do ADR-0002 §13, testada inteira; a saída é `{ valor, origem, sondaMs }`.
  - Na F-003 só existem os produtores de override (`?teto=300|500`, só no build de debug; outro valor é ignorado) e de tela (DPR 2, largura ≤ 375 pt ou 414 × 896 → 300). O cache e a sonda chegam como `null`; `__GAME_DEBUG__.teto = { valor, origem, sondaMs: null }`.
  - A sonda, a gravação de `vdc.teto` e o rebaixamento saem da F-003: a sonda do ADR-0002 §13 roda "500 inimigos + 400 projéteis", e sem projéteis (F-004) mediria menos do que o pedido; uma sonda por tempo de CPU no Chromium da Playwright tornaria o hash dependente da máquina (F-001.11). Até a sonda, todo aparelho fica com 300; nos dados, o único efeito é a conversão do minuto 19 com I = 1,1 acontecer também num iPhone 14.
  - O F-003.10 fixa uma tela fora da classe (DPR 3, 390 × 844), para a origem sair `fallback`.
- **Cenário horda (T2). [delegada]**
  - O ADR-0002 §14 manda o cenário "no formato do `vigilia` (§10)", que só nasce na F-008. Na F-003 ele é uma **receita** (`src/dados/cenarios/horda.json`, com `src/dados/schemas/cenario.schema.json`), da qual a Vigília monta o estado inicial. A divergência vai para o ADR-0005, e a F-008 decide se converte a receita (§9).
  - Conteúdo: linha fixa 19 (mínimo 300, intervalo de 21 passos, pesos 6/5/4, escala do minuto 19, I = 1,0); jogador parado em (585, 1.266) e invulnerável; sem armas; tutoriais vistos.
  - Com a linha fixa, o diretor usa sempre essa linha para roster, mínimo, intervalo e escala, e ignora o relógio para a janela, os marcos e os garantidos. O relógio corre; o recomendado é que a máquina de estados da F-008 e da F-009 também fique presa no cenário (§9).
  - Os 300 nascem na 1ª reposição, no 1º passo (r = 1), sem conversão (alvo 300 = TETO), no anel, e convergem para o jogador parado (o pior caso de render e de vizinhança). Com `?teto=500` continuam 300 (300 × 1,0).
  - Os 300 são **vivos**, não "na tela": em volta do jogador parado, eles ocupam um disco de raio ≈ 310 px (medido, §2; o corpo mais distante chega a ≈ 330 px, e seriam ≈ 385 px sem sobreposição), maior que a meia-largura da vista (195 px).
  - **Rotação:** a receita tem o campo `rotacao` (padrão 0). Com N > 0, a cada 60 passos, dentro do passo, os N inimigos de menor slot são removidos pelo caminho comum de liberação (que zera os campos, o mesmo que a morte vai usar na F-004), e o diretor repõe na reposição seguinte (≤ 21 passos). Cada remoção soma no contador `removidos` (no hash). Um 2º cenário, `horda_rotativa` (rotacao 10), serve só ao teste de heap (E2): sem ele, a F-003 não tem nascimento nem morte depois do 1º passo, e o heap não veria o caminho de nascer e liberar. A rotação é campo da receita, não parâmetro de URL.
- **Cenário sem_horda (T3). [delegada]** Bit "diretor desligado" na mesma palavra de cenário, ligado por `?cenario=sem_horda` no build de debug. Com 15 Ocos sólidos no minuto 0, os testes e a evidência de movimento das F-001 e F-002 (vídeo pelo corredor, posição parada idêntica, prompt de mover aos 10 s, vivos = 0) deixariam de valer: os Ocos chegam ao jogador parado em 330 a 450 passos e o cercam. Esses testes passam a usar o `sem_horda`; o F-001.11 (hash Node × Chromium) usa a Vigília completa. É um cenário fora dos três aprovados no ADR-0002 §14, registrado no ADR-0005.
- **Parâmetros do cenário no estado** (técnica): tudo o que muda a simulação é parâmetro da Vigília no cabeçalho e no hash: palavra `cenario` (bit 0 = jogador invulnerável; bit 1 = diretor desligado), `linhaFixa` (0xFFFFFFFF = nenhuma) e `rotacao`. Nas Vigílias normais, todos ficam em 0 (ou "nenhuma"), e o build de produção ignora `?cenario`.
- **Receitas** (técnica): `src/dados/cenarios/horda.json`, `horda_rotativa.json` e `sem_horda.json`, validadas por `cenario.schema.json` em `tests/dados.test.ts`, lidas só no build de debug. Campos na F-003: `id`, `versao`, `linha_fixa`, `jogador.invulneravel`, `diretor_desligado`, `tutoriais_vistos` e `rotacao`; armas e roteiro entram quando forem usados. Um id desconhecido é erro no boot, como um texto ausente.

## 6. Estado v3 e determinismo

- **Layout (`VERSAO_LAYOUT` 3)** (técnica):
  - cabeçalho de 16 palavras: versão, seed, passo, relógio, tutoriais vistos, disposição, `teto`, `cenario`, `linhaFixa`, `rotacao` e 6 reservadas;
  - 6 fluxos de RNG;
  - jogador: Float32 `x`, `y`, `xAnt`, `yAnt`, `dirX`, `dirY`, `hp`; Uint8 `promptMover`, `invulContato` e 2 reservados;
  - mundo e diretor (8 palavras Uint32, sem reserva): `intensidade10`, `espera`, `garantidosEntregues`, `spawns`, `recusados`, `semPontoLivre`, `removidos` (rotação do cenário, §5) e `garantidosPerdidos`;
  - pool de inimigos com capacidade física 500 (ADR-0002 §15 item 13): Float32 `x`, `y`, `xAnt`, `yAnt`, `hp`, `dano`; Uint8 `tipo`, `convertido`; e os metadados do pool (contagens, pilha de livres, lista densa, posição, geração). Os demais campos do ADR-0002 §4 (hpMax, estado, timers, Sal, Quebra, alvo) entram nas features que os usam.
- **Códigos de tipo** (técnica): tabela fixa no código, que só cresce no fim: 0 vazio, 1 `oco_das_lanternas`, 2 `oco_grande`, 3 `novica_de_sal`, 4 `oco_grande_coroado`, 5 `o_lanterneiro`. Um teste confere que todo id de `inimigos.json` e `chefes.json` tem código. Os dados por código (raio, velocidade, `dano_tipo`, comportamento, HP e dano base) são montados uma vez nos dados da Vigília, junto com a timeline compilada (passos-base, mínimos, linha do roster e pesos acumulados por linha): nada é lido de string nem alocado por passo.
- **Nascer e remover** (técnica): `nascerInimigo(estado, dados, codigo, x, y, convertido)` é a função única de nascimento (diretor, cenário e testes; convocações na F-008). Grava x, y, xAnt = x, yAnt = y, tipo, HP e dano com o minuto do passo. `removerInimigo(estado, slot)` libera o slot e zera os campos, sem efeito de morte; na F-003 só os testes e a rotação do cenário a usam.
- **Hash:** o buffer inteiro (≈ 20 KB; FNV-1a ≈ 0,03 ms), com os slots mortos zerados. A grade e os rascunhos da separação ficam fora do buffer e do hash.
- **Determinismo:**
  - o `ROTEIRO_REFERENCIA` continua igual e passa a rodar a Charneca completa, com o diretor ligado; as referências novas das seeds 1 e 424242 vão para o ADR-0005, e a evidência da F-001 é regenerada;
  - o log de determinismo trava também os vivos e os spawns no passo 1.000 e o passo do 1º acerto de contato;
  - os fatos de movimento do roteiro (costuras nos passos ≈ 258 e ≈ 962, o deslize) passam a ser conferidos numa Vigília sem diretor;
  - novo teste: copiar o buffer no passo 500 para um estado novo e seguir os dois até o 1.000 dá o mesmo hash. Isso prova que nada da simulação fica fora do buffer (a versão com save estruturado é da F-008);
  - continuam: duas execuções, seeds diferentes, 1 contra 5 passos por frame e Node × Chromium (F-001.11, com `?teto=300` explícito); e o Node × Chromium também no cenário horda, no passo 1.800 da captura E3 (300 vivos);
  - o hash por seção (cabeçalho, RNG, jogador, mundo, pool) e a trilha a cada 100 passos, aprovados no ADR-0002 §5 e §15 item 2, entram agora: a trilha vai para o log de determinismo, e `__GAME_DEBUG__.hashPorSecao()` (build de debug) ajuda a achar a 1ª seção divergente quando o F-001.11 falhar.

## 7. Render da horda

- **O que vai para o `SpriteGPULayer`** (técnica): só a horda, numa camada de capacidade 500 com um membro por slot do pool. Os 54 obstáculos e o jogador continuam como `Image` nos dois modos, com o código da F-002. Ordem de desenho: chão (vazio), obstáculos, horda e jogador; dentro da horda, a ordem do slot, estável quando outro inimigo morre.
  - A camada é preenchida no `create` da Vigília, e não "no boot" como diz o ADR-0002 §11: um layer é objeto de cena e não atravessa cenas. Vai para o ADR-0005.
  - A tabela de desenho por tipo tem só os tipos que a F-003 faz nascer e que têm tamanho (Oco das Lanternas, Oco Grande, Noviça); pedir um tipo sem entrada é erro alto na montagem, nunca NaN. O Coroado (F-008) e o Lanterneiro (F-009, de `chefes.json`) acrescentam as suas entradas.
- **`?render=gpu|image`** (ADR-0002 §14 e §15 item 3): padrão `gpu`; no build de debug, `?render=image` troca só a horda pelo pool de `Image`, e qualquer outro valor vale `gpu`. O modo ativo aparece em `__GAME_DEBUG__.render.modo`.
- **Um cálculo, dois escritores** (técnica): a função pura `prepararHorda` (em `src/cenas/render/horda.ts`, sem Phaser) percorre os 500 slots e escreve numa saída pré-alocada a posição de desenho e o tipo de cada slot vivo (o livre sai invisível). Dois escritores consomem a saída:
  - pelo `SpriteGPULayer`: escrita direta no buffer de instâncias;
  - pelo pool de 500 `Image` dentro de `this.add.layer()`: por frame, `setVisible` e `setPosition`; moldura, escala e tint só quando o tipo do slot muda.
  - Assim os dois modos desenham o mesmo por construção. Medido: com a horda na grade de 0,5 pt, o PNG do canvas sai idêntico byte a byte nos dois. A Playwright compara os dois modos no mesmo passo, pausado, com alfa = 1 e sem `?debug=1`, na escala do dispositivo (os pixels do canvas, não um screenshot reduzido).
  - A igualdade byte a byte foi medida no SwiftShader e é exigida com renderer por software. Com GPU de hardware, os dois caminhos montam as coordenadas de modo diferente (shader instanciado × vértices na CPU), e o spec aceita diferença ≤ 1 por canal em ≤ 0,1% dos pixels, registrando a contagem; qualquer diferença maior reprova.
- **Posição de desenho** (técnica): interpolação pelo delta toroidal (ADR-0002 §3), arredondamento para o pixel do canvas (0,5 pt, como o jogador e a câmera; o shader só arredonda com escala 1) e cópia mais próxima da câmera (ADR-0002 §11), nessa ordem, com as contas em linha (laço quente, §2); um teste confere a igualdade com as funções do toro e da câmera. O slot que nasce grava xAnt = x, para não ser interpolado a partir do ocupante anterior.
- **Escrita no buffer** (técnica; layout de `getMemberData` no 4.2.1, conferido no código e num protótipo):
  - na criação: 500 × `addMember` com escala e alpha 0; depois disso, as views `viewF32`/`viewU32` são guardadas;
  - por frame, no membro i (base = 42·i): vivo → x em [base], y em [base + 4], escala em [base + 12] e [base + 16], alpha 1 em [base + 20], índice da moldura em [base + 24] e a cor nos 4 tints de [base + 32] a [base + 35] (0xff000000 | rgb); livre → escala e alpha 0;
  - no fim, `setAllSegmentsNeedUpdate()`: o submitter sobe o buffer inteiro (500 × 168 = 84.000 B) sem alocar. A atualização por segmento não é usada, porque aloca um `subarray` por segmento;
  - medido: ≈ 0,1 ms para escrever 500 membros (p95 de 1,1 ms com CPU 4×);
  - "sem alocar" vale para o nosso código: o submitter do Phaser aloca alguns objetos por desenho (é o "≈ 3 KB por `SpriteGPULayer`" que o ADR-0002 §11 já aceita).
- **`STATIC_DRAW` e `DYNAMIC_DRAW`** (técnica): o padrão é o do Phaser (`STATIC_DRAW`). No build de debug, `?buffer=dinamico` troca para `DYNAMIC_DRAW` na criação (bufferUsage + `resize(500)` antes dos `addMember`, ADR-0002 §11), para o build de teste do iPhone comparar os dois sem recompilar. Parâmetro novo, registrado no ADR-0005. A Playwright confere que a imagem com `?buffer=dinamico` é idêntica à do padrão no mesmo passo.
- **F-003.11** (técnica): Vitest com o `SpriteGPULayer` real do bundle do jogo, um `gl` falso e o `WebGLShaderSetterWrapper` real. Confere o stride de 168 B (42 floats); os offsets que o escritor grava (0, 4, 12, 16, 20, 24 e 32 a 35) e também 8 (rotação), 28 (`tintBlend`) e 38 (`tintMode`), pelo `addMember` e pelo `getMemberData`; a escrita direta lida de volta pelo `getMember` do próprio Phaser; o membro "morto"; e o caminho `DYNAMIC_DRAW`. A mutação de um offset reprova (conferido com o y em 5).
- **Queda para o plano B** (técnica): o vertex shader do `SpriteGPULayer` lê uma textura (`MAX_VERTEX_TEXTURE_IMAGE_UNITS` > 0). Se a Acender achar 0 unidades de textura no vértice ou a criação do layer falhar, a Vigília usa o modo `image` sozinha, também no build de produção (o ADR-0002 só prevê o plano B como parâmetro de debug; ADR-0005), e `__GAME_DEBUG__.render.origem` diz `fallback`; a Playwright confere a queda com 0 unidades. Uma falha ao ligar o programa só aparece no 1º desenho, dentro do render do Phaser, e não é tratada. Todo iPhone com iOS 17 tem 16 unidades: é rede de segurança.
- **Atlas** (técnica): duas molduras novas no tamanho exato a 2×, `massa` (círculo de 64 px = 32 pt) e `quadrado` (96 px = 48 pt), com escala 0,5 para todos os inimigos do MVP; o índice da moldura vem de `layer.frameDataIndices`, nunca de literal.
- **Aquecimento** (ADR-0002 §11): a Tela de Acender cria um `SpriteGPULayer` de 1 membro de escala 0 e o desenha uma vez, para compilar o programa antes da Vigília; o cache de programas é do renderer. O teste conta os programas do `SpriteGPULayer` no cache no último frame da Acender: o número é ≥ 1 e não muda no 1º frame da Vigília.
- **Limpeza** (técnica): o `preDestroy` do `SpriteGPULayer` não libera o submitter (um "TODO" no 4.2.1). No `SHUTDOWN` da Vigília e da Acender, antes do `destroy`: `renderer.deleteBuffer` nos dois buffers do submitter; o VAO de cada suíte de programa sai de `renderer.glVAOWrappers` e é destruído; `renderer.deleteTexture` na textura de molduras. O programa fica, no cache compartilhado. Sem isso, cada Vigília deixaria 84.000 B, um buffer de GPU, um VAO e uma textura presos (e o renderer os recriaria numa restauração de contexto). Um teste com o `gl` falso confere que as listas do renderer voltam ao tamanho inicial.
- **Cores (V1). [delegada]**

| Inimigo | Cor | Contraste com #1a1f2b | com #2b3340 | Origem (doc 13 §1.3) |
|---|---|---|---|---|
| Oco das Lanternas | #76884c | 4,23:1 | 3,27:1 | Ocos: verde-musgo |
| Oco Grande (e convertido) | #9fa39a | 6,42:1 | 4,96:1 | Ocos: pele cinza |
| Noviça de Sal | #8994b4 | 5,46:1 | 4,22:1 | Sepultadoras: sal azulado |

  - Todas passam de 3:1 (objeto gráfico, WCAG 2.1 SC 1.4.11) contra o fundo e contra os obstáculos, e ficam abaixo da luminância da brasa (o jogador continua a coisa mais quente da tela). ΔE2000 ≥ 14 (CIEDE2000, sRGB D65) contra todas as cores reservadas (fundo, obstáculo, #0b0e14, brasa, #e2652b, #7a1f1f, #ff2a2a, osso, sal, branco, as 3 Cinzas e o crítico) e ≥ 18 entre si. O par mais próximo é Noviça × Cinza azul, com 15,7. A 1ª escolha da Noviça (#8796b4) dava 13,98 e não cumpria a regra; a cor atual está a ΔE 2 dela.
  - O âmbar de lanterna ficou de fora (compete com a brasa do jogador), e o branco-osso também (confunde com o osso da UI e com o branco do aparo e do telegrafo).
  - A massa tem o menor contraste de propósito: são 300 corpos. Os médios, mais claros, telegrafam (F-006).
  - Na simulação de deuteranopia e de protanopia (Machado, 2009, severidade 1), os três continuam separáveis (ΔE ≥ 17,5; medido ≥ 17,9).
  - Uma cor por tipo: as 3 variantes de paleta por tipo do doc 13 §1.5 são técnica de sprite e ficam para a arte, depois da F-010 (B §1: "formas geométricas e paleta provisória").
  - As cores ficam em `src/cenas/estilo.ts`, como a dos obstáculos (cor provisória de cena, até a arte); um teste confere as regras acima para os tipos que a F-003 desenha. O Coroado e o Lanterneiro ganham cor nas suas features, com o mesmo teste.
- **Convertido (V2): igual a um Oco Grande. [delegada]** Nas regras e na ficção ele é um Oco Grande; a distinção fica no debug (`convertidos`).
- **Sem rotação (V3). [delegada]** Os quadrados ficam alinhados aos eixos; a "frente" do Oco Grande aparece no telegrafo da F-006.

## 8. Debug, evidências e testes de desempenho

- **`__GAME_DEBUG__` acrescido** (técnica):
  - `vivos` por tipo, contando o pool; o convertido conta em `oco_grande`, e `convertidos` diz quantos são;
  - `recusados.inimigos` (pool físico cheio; fica em 0) e `diretor` (`{ linha, espera, alvo, minEfetivo, vivosEq, spawns, garantidosPerdidos, semPontoLivre, removidos }`);
  - `jogador.hp` e `jogador.invulContato`;
  - `teto` (`{ valor, origem, sondaMs }`), `cenario` e `render` (`{ modo, origem, buffer, stride, capacidade, drawCalls }`), `webgl` (`{ renderer, software }`);
  - só no build de debug: `inimigos()` (cópia dos vivos) e `hashPorSecao()`;
  - `cpuFrameMs` (`{ p50, p95 }` dos últimos 60 quadros, de `PRE_STEP` a `POST_RENDER`, ADR-0002 §14);
  - só no build de debug: os últimos 2.048 quadros (quadro inteiro, até `PRE_RENDER`, tempo da simulação e passos de cada um), para o F-003.4; e o contador de draw calls do último quadro (os pontos de desenho do renderer, `drawElements` e `drawInstancedArrays`, envolvidos por um contador sem alocação, zerado a cada `PRE_RENDER`);
  - `memoriaEstimadaMB` passa a somar o atlas e o buffer de instâncias.
- **`?debug=1`** (técnica): liga o painel (V4) e a verificação de NaN do ADR-0002 §5, que entra agora: ao fim de cada quadro, depois dos passos dele, os floats do jogador e dos slots vivos são lidos um a um (sem alocar), e um NaN lança erro com o slot e "no passo N ou antes (quadro de k passos)". A verificação fica fora do tempo que o medidor conta como simulação e entra no resto do quadro (≈ 0,01 ms). A F-003 é a 1ª feature com centenas de floats por passo e com divisões por distância.
- **Painel do debug (V4). [delegada]** Só no build de debug e com `?debug=1`: um `<pre>` fixo no canto superior esquerdo, dentro da safe-area, sem receber toques, em osso sobre #0b0e14 a 60%, atualizado a cada 500 ms fora do caminho quente. Linhas "chave valor" com identificadores do `__GAME_DEBUG__` (sem textos novos no `pt-BR.json`): fps, vivos e cada tipo, convertidos, teto e origem, passo, relógio, passos perdidos, cpu (p50/p95), render, draw calls e o renderer do WebGL. A F-010 acrescenta o fps médio por Hora.
  - O lint de textos (`vdc/textos`, ADR-0003 §8) barra qualquer literal que chegue a `textContent`, inclusive por concatenação. O painel serializa um objeto-instantâneo cujas chaves são nomes de propriedade, com separadores só de espaço e quebra de linha (vazios depois do `trim`): as chaves passam pelo `vdc/textos` porque a regra é sintática (o limite conhecido do ADR-0003 §8), sem `eslint-disable` e sem texto novo no `pt-BR.json`. É o único texto visível fora de `t()`, só no build de debug: uma exceção a B §3.15 e ao ADR-0002 §11 ("todo texto visível sai de t()"), registrada no ADR-0005.
- **Projeto da Playwright** (técnica): o F-003.4 e o F-003.7 rodam no `taps-game`, o projeto do Pronto (390 × 844, DPR 3, toque); "desktop" é a CPU da máquina que roda o teste. Com DPR 3 e 390 pt, a classe de tela do TETO não dispara: a origem é `override` com `?teto` e `fallback` sem ele.
- **A horda desenhada corresponde à simulação** (técnica): `__GAME_DEBUG__.inimigos()` (build de debug) devolve uma cópia `{ slot, tipo, x, y }` dos vivos. Com a simulação pausada e alfa = 1, no passo 600 do cenário horda, nos dois modos de render: o pixel do centro projetado de 10 inimigos visíveis e não cobertos por outro tem a cor do tipo (±2 por canal), e as duas imagens do canvas são idênticas. Pega offset errado e tint trocado. Como no cenário horda ninguém morre, o "slot morto visível" (um membro que continua desenhado depois de liberado) é provocado: com a simulação pausada, `__GAME_DEBUG__.removerInimigo(slot)` (só no build de debug, pelo caminho comum de `removerInimigo`) remove 3 inimigos visíveis e não cobertos; depois de 2 frames, nos dois modos, o pixel da posição antiga de cada um tem a cor do fundo ou do obstáculo de baixo, e as duas imagens continuam idênticas.
- **Evidência da captura (E3)** (técnica): `production/evidencias/F-003/debug-300-vivos-390x844.png` (o nome com as dimensões deixa o `verify.sh` conferir o PNG). Roteiro: `?seed=1&cenario=horda&teto=300&debug=1`; tocar em Acender; pausar; avançar até o passo 1.800 (30 s, com a horda já em volta do jogador); esperar 2 frames e uma atualização do painel; screenshot. **Regra de render:** com a simulação pausada pelo debug, o render e a câmera usam alfa = 1 (o estado atual), e a imagem passa a depender só da seed e do passo.
- **F-003.4 (E1). [delegada: muda a verificação de um critério de B]**
  - **Por quê:** o WebGL deste contêiner é o SwiftShader, por software. Medido: uma cena do Phaser quase vazia faz ≈ 33 fps (≈ 50 com `--use-angle=swiftshader`); a Vigília da F-002, ≈ 30 (≈ 19 com CPU 4×); um bench de 300 inimigos, ≈ 13,5 fps, e ≈ 9 com CPU 4×. Essas medidas foram feitas num contexto "desktop" (DPR 1, sem `isMobile`); o gate roda no `taps-game` (DPR 3), em que o SwiftShader compõe mais pixels. Nenhuma combinação de flags passou de 55, nem o llvmpipe em Xvfb (≈ 42 com 4×). O limite é a GPU por software, não o nosso código. Além disso, o SwiftShader rasteriza em threads que disputam as 4 CPUs com a thread principal estrangulada, e o tempo até `POST_RENDER` às vezes incha (uma rodada em quatro deu p50 de 10,2 ms).
  - **Sempre** (`?cenario=horda&teto=300&debug=1`, `Emulation.setCPUThrottlingRate` 4, 10 s de aquecimento e 30 s de medida): 300 vivos em cada uma das 30 leituras de 1 s; e **p95 de um passo + p95 do resto do quadro até `PRE_RENDER` < 10 ms**: a parte do orçamento de CPU por frame de B §3.13 (sim + render < 10 ms, iPhone 11/12, um quadro de 60 Hz = 1 passo) que não depende da GPU. O resto é a tradução da entrada, a sincronização da horda, o `update` das cenas e a verificação de NaN. O p95 do passo (simulação ÷ passos do quadro) usa só os quadros com passos ≥ 1; o p95 do resto usa todos. A soma de p95 é pessimista. Separar o passo evita que o fps baixo do contêiner (até 5 passos por quadro) infle a conta, e parar em `PRE_RENDER` tira o tempo que o SwiftShader rouba; a CPU do render do Phaser fica de fora no contêiner.
  - **Só com GPU de hardware** (o renderer de `WEBGL_debug_renderer_info` não casa com /SwiftShader|llvmpipe|softpipe|Software/i): também `__GAME_DEBUG__.fps` ≥ 55 nas 30 leituras (o `actualFps` do Phaser é uma média móvel que nasce em 60, daí o aquecimento), Δ quadros ÷ 30 s ≥ 55 (o doc 10 §8 e B §4 F-010 leem o 55 como média) e p95 de um passo + p95 do resto do quadro inteiro < 10 ms. Com GPU por software, o teste anota "fps não conferido: WebGL por software", e o `verify.sh` imprime a linha. No desktop: `npm run e2e -- --headed` (ou o Chromium com GPU), conferindo o renderer.
  - **Aprovado se:** 300 vivos nas 30 leituras ∧ a soma do contêiner < 10 ms ∧ draw calls ≤ 150 no modo `gpu` (B §3.13) ∧ (fps conferido ⇒ os três critérios com GPU). Com o fps não conferido, `aprovado` pode ser `true`, e o `verify.sh` avisa. Os draw calls do modo `image` são lidos no spec de igualdade, como registro.
  - **Registro:** `production/evidencias/F-003/desempenho-30s.json` (evidência nova), com fps, os tempos (passo, até `PRE_RENDER`, quadro inteiro de `PRE_STEP` a `POST_RENDER`), vivos, passos perdidos, draw calls, renderer, `fps_conferido` e `aprovado`. O quadro inteiro vai para o registro sem valer como critério no contêiner.
  - **Pendente:** a F-003 pode fechar como pronta com o F-003.4 literal (fps ≥ 55) pendente; o "como" do F-003.4 e o `progress.md` dizem isso, e o dono da medida é o build de teste do iPhone da F-006 (Q-29), ou um desktop com GPU antes dele.
  - **Calibração:** antes de valer como gate, o spec roda 5 vezes no `taps-game` com CPU 4×, e o ADR-0005 registra p50, p95 e máximo do passo, do resto e da soma. O gate só vale se as 5 rodadas passarem; se alguma reprovar, o E1 volta para decisão (o limite de B não é afrouxado, e o spec não é repetido até passar).
  - **Resultado da calibração** (ADR-0005 §7): soma de 3,80 a 4,34 ms nas 5 rodadas (p95 do passo de 1,70 a 1,90 ms; do resto, de 2,1 a 2,5 ms); draw calls 4. O E1 vale como gate.
- **F-003.7 (E2). [delegada: proposta de teste]**
  - Roteiro: cenário `horda_rotativa`, `?teto=300`, sem throttling. Chegar a 300 vivos, aquecer 90 s (o JIT cresce ≈ 240 KB no 1º minuto; com 30 s, os metadados do JIT do V8 ainda cresciam ≈ 270 nós no minuto seguinte, ADR-0005 §7); snapshot A; 60 s; snapshot B. Cada snapshot é precedido de `HeapProfiler.collectGarbage` (o próprio `takeHeapSnapshot` também faz coleta completa).
  - Agrupamento por nome do construtor nos nós `object`, `closure` e `native`, e pelo tipo nos demais.
  - Exclusões, por lista fechada (repetida no relatório, com o motivo de cada uma): `(code)` (código do JIT), `PerformanceLongTaskTiming` e `TaskAttributionTiming` (entradas de desempenho do navegador, que crescem com tarefas longas). Uma exclusão nova segue o caminho da calibração.
  - **Aprovado se:** Δ total de bytes próprios (B − A), sem os excluídos, ≤ 32.768 B; e, em todo grupo, Δ de contagem ≤ 100.
  - Medido na Vigília da F-002: o ruído em regime fica em ≈ 0,6 KB e ≈ 21 nós sem os excluídos. Um vazamento de 1 objeto por frame (≈ 13 fps no contêiner) dá ≈ 800 objetos em 60 s, e 1 por passo, 3.600 objetos e ≈ 58 KB: os dois limites os pegam.
  - **Calibração:** como o ruído foi medido sem a horda, os limites são provisórios até 3 rodadas no `horda_rotativa`, registradas no ADR-0005. Se o maior Δ das 3 rodadas passar de metade de um limite, o limite proposto vira 2 × esse Δ e volta à §0 para veto antes de o teste valer como gate.
  - **Resultado da calibração** (ADR-0005 §7): com 90 s de aquecimento, Δ de 2,9 a 3,7 KB e no máximo 13 nós num grupo, abaixo da metade dos dois limites, que ficam. As duas mutações reprovam.
  - Mutações: (1) um `push` de um objeto novo (`{ slot }`) num array de módulo a cada spawn (≈ 600 em 60 s, acima de 100 no grupo `Object`) reprova pela contagem; (2) um `new Float64Array(8)` retido por spawn (≈ 600 × 64 B mais os cabeçalhos, acima de 32 KiB) reprova pelos bytes. Um número (Smi) num array não cria nós no snapshot e não seria pego, por isso as mutações retêm objetos. Um objeto de vida curta não é retido e não aparece no heap: isso é o E4.
  - O relatório `heap-60s.json` traz a identificação (seed, teto, render, cenário, navegador, renderer), os dois snapshots (passo, vivos, liberações, bytes, nós, tempo), os excluídos, os deltas, os limites, os grupos que mudaram, o heap usado a cada 10 s (`Runtime.getHeapUsage` depois de coleta) e `aprovado`.
- **Zero alocação no caminho quente (E4). [delegada, proposta de teste]** `tests/cenas/alocacao.test.ts`: o `HeapProfiler.startSampling` do `node:inspector` (intervalo de 64 B, contando também os objetos coletados pelos GCs), depois de 3.000 passos e quadros de aquecimento, mede 6.000 passos do cenário horda (300 vivos) e 6.000 quadros de `prepararHorda` + o escritor GPU sobre o `gl` falso, e soma os bytes amostrados em funções de `src/`. Aprovado com ≤ 16 B por passo em média. Medido: 8,5 a 9,2 B em 3 rodadas, quase tudo do tiering do V8 e dos getters de import do Vitest; a mutação de um `new Float32Array(2)` retido por passo mede ≈ 210 B e reprova. O "zero" de B vira "nenhuma alocação nossa por passo": o profiler amostral nunca dá 0 com o JIT em volta. O caminho de nascer e liberar fica de fora: no `horda_rotativa`, ele somaria ≈ 125 B por passo de código frio, que o V8 ainda interpreta (≈ 0,2 spawn por passo), e é conferido pelo E2. O teste mede o V8: no JSC (iPhone), um double não vira objeto ao passar por uma chamada.
- **`verify.sh`:** uma evidência `.json` com o campo `aprovado` só passa com `aprovado: true`, como os `.log` com `iguais=true`.
- **Tempo** (técnica): os specs de desempenho e de heap têm timeout próprio (120 s e 240 s) e rodam em todo verify das features seguintes, como guarda de regressão (≈ +3,5 min). Eles rodam no modo `gpu`; o plano B é coberto pela igualdade de imagem (§7). O E4 roda no Vitest (≈ 15 s).

## 9. Recomendações para as features seguintes (não decididas aqui)

Cada item volta às pendências da feature indicada, que fecha a decisão antes de implementar.

- **F-004:**
  - o Sal multiplica só o deslocamento de comportamento; o limite da separação continua a velocidade base (com 0,5·v, a horda se comprime: 15,5 px de média);
  - knockback como deslocamento somado antes dos obstáculos, ≤ 32 px por passo; se as armas consultarem a grade depois da física, remontá-la com as posições finais (≈ 8 µs);
  - remoções durante a varredura da lista densa iteram de trás para a frente ou ficam para o fim da fase (`liberar` move o último ativo);
  - o anel de eventos entra com o 1º consumidor, num ArrayBuffer próprio, fora do hash e do save;
  - a sonda do TETO entra na 1ª feature com projéteis, antes do build de iPhone pós-F-006 de preferência, e todos os testes de hash passam `?teto=300`;
  - a receita de cenário ganha o campo `armas` (lista vazia em `horda` e `horda_rotativa`, como o ADR-0002 §14 manda), validado pelo `cenario.schema.json`, para o E1 (300 vivos nas 30 leituras) e o E2 continuarem verdes com a Espada Longa;
  - as distâncias de comportamento (D §9) já estão resolvidas pela S7; falta a distância de acerto até a hitbox.
- **F-005:**
  - a camada GPU "mundo" (obstáculos e Cinzas) e as Cinzas com forma diferente do círculo de 32 pt e do quadrado de 48 pt (a Cinza azul fica a ΔE 15,7 da Noviça);
  - `hpMax`, se o HP por nível vier aqui, e a regra de arredondamento do HP com bônus (hoje `round(130 × 115/100)` = 150).
- **F-006:**
  - nos i-frames, o jogador ignora os inimigos nas duas fases e os obstáculos continuam duros; depois, vale a regra simétrica de S4 (a sobreposição herdada não é expulsa nem cresce). Fica para decidir se a solidez desligada vale nos 21 passos da esquiva ou só nos i-frames;
  - o contato durante os i-frames não tira HP nem liga o timer; conta como esquiva perfeita só se o timer estiver em 0 (um acerto "teria ocorrido", B §3.4);
  - o prompt de esquiva segue o evento "telegrafo iniciado" do Oco Grande garantido, que chega ≈ 4 a 6 s depois das 1:00 (R3), e não o relógio; isso exige mudar o "como" do F-006.8 ("a partir de 1:00") e diverge do doc 11 §4;
  - com `?inicio=MM:SS`, o 1º passo já repõe, e os garantidos de linhas já passadas não são entregues;
  - o atordoado da Postura Quebrada não persegue, mas continua sendo separado;
  - os médios desenhados acima da massa (uma 2ª camada GPU ou faixas de slots por camada de inimigo), antes de pôr o telegrafo no membro: com a ordem por slot da F-003, um médio pode ficar sob os círculos da massa;
  - o brilho do telegrafo branco e o flash no próprio membro da horda, por `tintMode` e `tintBlend` (offsets 38 e 28, já cobertos pelo F-003.11);
  - os telegrafos e ataques se somam ao movimento provisório da S6, que continua valendo para a aproximação e o recuo;
  - no build de teste do iPhone (Q-29): o F-003.4 literal (fps ≥ 55 com `?cenario=horda&teto=300`), a comparação `gpu` × `image` e `STATIC_DRAW` × `DYNAMIC_DRAW` (`?buffer=dinamico`), e a reavaliação do cerco de S4 e da sobreposição visual de S2 (uma borda escura de 1 pt nos corpos é a 1ª alternativa barata).
- **F-007:**
  - a barra de HP e um sinal do acerto que não use branco nem #ff2a2a e respeite "desligar flashes"; a transição HP 0 → APAGANDO;
  - manter o F-003.5 verde com stamina ≤ 50 no teste, ou com a asserção sobre o valor bruto;
  - a regra de arredondamento do HP com bônus para a Brasa Firme e para a cura de 40% do Frasco (e `hpMax`, se a F-005 não o trouxer);
  - a política de `dano_recebido` para o contato (≈ 3,3 por segundo expulsariam os outros eventos da telemetria local): registrar só os golpes e o acerto que zera o HP, ou uma linha agregada.
- **F-008:**
  - o diretor só roda nos passos em que o relógio avança; com o relógio parado ou a arena ativa, nada nasce e `espera` = 0 (R2); a busca de ponto livre conta só os obstáculos ativos;
  - na Fogueira, congelar o comportamento e a separação dos inimigos, e nenhum contato causa dano ("ninguém ataca", doc 07 §4); o mesmo no Amanhecer (F-009);
  - convocações com `falta = n` e o mesmo g do §8.7, com a posição na arena (o código da F-003 recebe a posição como estratégia);
  - o Coroado: todo tipo que entra no pool precisa entrar no conjunto do R_MAX ou ser tratado à parte. Inflar o R_MAX para 48 a 96 px aumenta de 2,6 a 8 vezes a área consultada por cada Oco; a alternativa a medir é uma lista própria de corpos grandes, consultada com o raio deles e com o par processado sem a regra j > i. Se 2·R_MAX + v_max ≥ a folga mínima entre obstáculos da região (67,4 px na Charneca; 64 px pela regra de D O4 para regiões futuras), um corpo pode tocar dois obstáculos, e a lista por célula e as 2 passadas precisam de outro teste de equivalência. Partilha igual contra elites, camada GPU própria acima da massa e cor da facção Ocos fora do âmbar;
  - a lista estática de obstáculos por célula e a colisão pulam os obstáculos inativos, com o teste de equivalência refeito;
  - o Grito empurra o jogador (a exceção da Q-16), respeitando obstáculos e os 32 px;
  - a receita do cenário horda vira `vigilia` (ou fica como receita), e a máquina de estados fica presa em HORA no cenário;
  - o save grava a pilha de livres, a lista densa e as gerações do pool;
  - o escurecimento de 10% por minuto (`escurecer_pct`) e os inimigos acinzentados, pelo tint do membro.
- **F-009:** o Lanterneiro (caixa alinhada aos eixos, 128 a 192 px) contra os círculos da massa, numa camada acima da horda, com cor sem #ff2a2a e sem a brasa. Ele vem de `chefes.json` e não está no roster: precisa entrar no conjunto do R_MAX ou na lista de corpos grandes (F-008), e a F-009 decide como S1 e S4 valem para uma caixa.
- **F-010:**
  - o nó Casco soma 3 passos por rank ao timer (18, 21, 24 e 27) sem mexer no fator 0,3; a Bigorna se aplica só à origem contato;
  - a degradação graciosa de nível 3 ganha critério (TETO efetivo = mín(TETO, mínimo da linha sem I), pela mesma conversão; a função de reposição já recebe o TETO efetivo como argumento);
  - implementar a sonda, se ainda não houver, e calibrá-la no iPhone (a física real da horda custa 2 a 5× a sonda sintética do ADR-0002 §12);
  - o fps médio por Hora no painel do debug (V4).
- **Sem feature:** o campo de fluxo de S8, se o contorno simples falhar mais tarde com obstáculos de outras regiões.

## 10. O que muda em dados e documentos

**Aplicado no commit que registra este documento (`feature_list.json`):**

- F-003:
  - `pendencias_antes_de_comecar` vira uma linha só, "Resolvidas em design/decisoes-F-003.md", como na F-002;
  - o "como" dos critérios F-003.2 (vivosEq, `espera`, 1ª reposição no 1º passo, r = 1), F-003.4 (E1, com o fps literal pendente), F-003.7 (E2), F-003.8 ("≤ r <"), F-003.9 (R8) e F-003.10 (tela fora da classe);
  - evidências: `debug-300-vivos-390x844.png`, `heap-60s.json` e `desempenho-30s.json`.
- F-004 a F-010: as recomendações da §9 entram nas pendências de cada uma; na da F-004 herdada de D §9, a nota "distâncias de comportamento resolvidas pela S7 da F-003".

**A F-003 aplica ao implementar:**

- `regiao.schema.json`: peso inteiro ≥ 1;
- `inimigos.json`: sai a pendência "força de separação";
- `src/cenas/estilo.ts`: as cores da V1, com a Noviça em #8994b4;
- novos: `src/dados/cenarios/horda.json`, `horda_rotativa.json`, `sem_horda.json` e `src/dados/schemas/cenario.schema.json`; `scripts/gerar-direcoes.py` e a tabela literal das direções;
- `scripts/verify.sh`: evidência `.json` com `aprovado` só passa com `true`; o aviso do fps não conferido;
- os testes das F-001 e F-002 que dependem de não haver horda passam a usar `?cenario=sem_horda`;
- ADR-0005, com as decisões técnicas, as referências novas de determinismo e as divergências do ADR-0002: linha fora do estado; cenário como receita; cenários `horda_rotativa` e `sem_horda`; `?buffer`; camada preenchida no `create` da Vigília; contato e solidez por varredura e não pela grade; texto visível fora de `t()` no painel de debug (B §3.15; ADR-0002 §11), só no build de debug e sem exceção no lint; sonda, cache `vdc.teto` e rebaixamento do TETO fora da F-003 (T1; ADR-0002 §11.1, §13 e §15 item 2); queda automática para `image` também no build de produção (§7); obstáculos e jogador ainda em `Image`, fora das camadas GPU "mundo" e "jogador" (§7; ADR-0002 §11); roster das linhas de marco (M1; Apêndice A); o `__GAME_DEBUG__` acrescido (§8); e a regra do laço quente (§2) com o E4.

## 11. Revisão adversarial

- **Método:** um workflow com 3 lentes (fidelidade às fontes, técnica e completude), cada uma seguida de um verificador cético que tentou refutar cada achado e refez as medidas onde havia número. Notas, antes das correções: fidelidade 7, técnica 7, completude 6,5.
- **Resultado:** 61 achados (22, 15 e 24), dos quais 57 confirmados e 4 refutados:
  - A13 (o número do convertido estava certo; a frase ficou mais clara);
  - B5 (o teste do par já chama só a separação, e o dos 6 vizinhos pega o limite por tipo);
  - C23 (a lista densa está no estado e é determinística; a ordem crescente de slot vale para a física, não para as armas);
  - C24 (as duas posições do jogador no C1 já estavam ditas; a frase ficou mais clara).
- **Os que mudaram código:**

| Achado | Gravidade | Problema | O que foi feito |
|---|---|---|---|
| Técnica A1 | alta | os laços por inimigo alocavam ≈ 48 KB por passo no V8 (doubles em chamadas não inlinadas) | contas em linha e a colisão por `COLISAO` (§2, laço quente); E4 com limite de 16 B por passo (medido: 8,5 a 9,2) |
| M5, C13 | média | um tipo do roster sem tamanho só falhava no meio de um passo | validação em `criarDadosDaVigilia`, com teste; o R_MAX sai dos tipos que nascem |
| A15 | média | a Noviça (#8796b4) ficava a ΔE 13,98 da Cinza azul, abaixo da regra de 14 | Noviça em #8994b4 (ΔE 15,7; a 2 da cor antiga), com o teste das cores |
| B3, C16 | baixa | a verificação de NaN alocava e entrava no tempo da simulação | por quadro, sem alocar, fora do tempo da simulação, com a mensagem "no passo N ou antes" |
| B8 | baixa | o `--conferir` das direções aceitava 1 ulp | igualdade exata |
| C07 | média | os offsets 28 e 38 eram dados como cobertos sem teste | o F-003.11 confere 8, 28 e 38 |

- **Os que mudaram o documento** (e, onde cabia, o `feature_list.json`):
  - fidelidade A1 (alta; o verificador a deu como média): o roster das linhas de marco vinha como fato e é escolha → M1 [delegada], divergência no ADR-0005;
  - A3: o knockback de contato zero vinha como fato, com a Q-00 citada ao contrário → K3 [delegada];
  - A4, técnica M1: o gate do E1 não é o orçamento inteiro de B → "a parte que não depende da GPU", com "<";
  - técnica M2: o E1 não tinha medida da grandeza do gate nem regra de calibração → 5 rodadas no `taps-game`, sem afrouxar o limite;
  - A5, C11: R2, T1 e S1 decidiam escopo das F-004 e F-008 → só a parte da F-003 fica decidida, o resto na §9;
  - A6, C02: faltavam divergências do ADR-0002 na lista do ADR-0005 → lista completa (§10);
  - A7, C12: o painel é exceção a B §3.15, e o texto dizia o contrário → exceção assumida na V4, sem exceção no lint;
  - A8, C10: a tolerância de alocação não estava no §0 → E4;
  - A9, B2, C15: o layout do mundo omitia `garantidosPerdidos` e `removidos` → §6;
  - técnica M3: a sonda de pixel não exercitava o slot morto → `__GAME_DEBUG__.removerInimigo` no spec;
  - técnica M4, C06: a mutação do teste de heap passaria com um número → mutações com objetos;
  - C01, A18, B7: o `feature_list.json` não tinha as mudanças → aplicadas no commit deste documento;
  - C03, C04: o F-003.4 literal não tinha dono, e o `aprovado` não estava definido → dono no build de iPhone da F-006 e regra do `aprovado`;
  - C05: a calibração do heap não tinha regra → 2 × o maior Δ, de volta ao §0 para veto;
  - C08, C09, C14, A17, A22: recomendações que faltavam ou se contradiziam (campo `armas`, corpos grandes, `hpMax`, F-006.8, critério do R_MAX) → §9;
  - de redação e números (baixa): A2, B1, C20 (raio da horda: ≈ 310 px medidos); A10; A11 (anel medido no centro → R9 [delegada]); A12, B4, C21 (distâncias do anel); A14, C19 (resumos do §0); A16 (V1); A19; A20, C17 (status); A21; B6 (quadros sem passo); B9 (igualdade com GPU de hardware); C18 (convenção de passos); C22 (S3 rotulado e medido de novo: 7,2 / 7,0 / 9,7 px).
- **Achado da implementação, depois da revisão:** o anel simétrico de 7 Ocos que chega junto para a 34,7 px e não acerta; com chegadas reais, o contato vale os 5/s (§3).
