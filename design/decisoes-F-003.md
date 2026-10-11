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
| E2 | Heap de 60 s (F-003.7) | no cenário `horda_rotativa`, 30 s de aquecimento; Δ dos bytes ≤ 32 KiB no total e Δ ≤ 100 objetos em cada construtor, fora uma lista fechada de exclusões (código do JIT e entradas de desempenho do navegador, listadas no relatório); limites provisórios, a confirmar em 3 rodadas de calibração no `horda_rotativa` (ADR-0005) |
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

