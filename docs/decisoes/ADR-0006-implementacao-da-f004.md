# ADR-0006 — Decisões de implementação da F-004 (armas automáticas)

- **Status:** registrado na Sessão 4 (2026-10-11). São as decisões técnicas tomadas ao implementar `design/decisoes-F-004.md` (aqui, **D4**). As decisões de design foram delegadas pelo usuário e passaram por revisão adversarial (D4 §11). Este ADR também registra as divergências do ADR-0002, da D3 e do ADR-0005 que a F-004 cria (§9) e as medidas e calibrações dos testes (§8).
- **Fontes:** B §3.1, §3.4, §3.13 e §4 (F-004); brief §5.6 e §5.12; D4; D3; ADR-0002 §4, §7, §9, §11 a §15; ADR-0005.

## 1. Estado v4 e determinismo

- **Layout (`VERSAO_LAYOUT` 4, 42.988 bytes):**
  - o jogador ganha a build, 5 vagas de arma em ordem de aquisição: `recarga` e `esperaPulso` (Uint16); `codigo`, `nivel`, `golpe` (posição na sequência) e `esperaGolpe` (Uint8). `equiparArma`, `esvaziarBuild` e `validarBuild` são as únicas portas de escrita fora do passo;
  - o mundo ganha `mortes` (8) e `projeteisRecusados` (9);
  - os inimigos ganham Uint8 `salPct` (redução da velocidade em %), `salPassos` e `kbPassos`;
  - o pool de projéteis (400) tem Float32 `x`, `y`, `xAnt`, `yAnt`, `vx`, `vy` e `dano`; Uint32 `ultimoAlvo`; Uint16 `vida`; Uint8 `tipo`, `arma`, `perfuracoes`, `salPct` e `salPassos`. O `dono` fica para quando houver projétil de inimigo (F-006);
  - `LAYOUT` é exportado (offsets das seções), para o hash por seção e os testes.
- **Ordem do passo** (D4 §4): 1. relógio; 2. jogador; 3. horda, com o Sal e o knockback; 4 a 6. grade, separação e obstáculos; 7. armas: 7a refaz a grade com as posições do passo, 7b move os projéteis e resolve os acertos deles, 7c roda as vagas em ordem (em cada vaga, a sequência pendente anda antes da recarga) e 7d varre as mortes em slot crescente; 8. contato; 9. rotação; 10. diretor.
- **Referências** (1.000 passos com o `ROTEIRO_REFERENCIA`, a Charneca completa, o diretor ligado e a Espada nv1 da build inicial): `901adb6d` na seed 1 e `9cdc2c63` na 424242. Os fatos da horda da F-003 seguem travados numa Vigília sem armas (`SEM_ARMAS` nos testes antigos).
- **Regressão v3** (`tests/logica/armas/regressao-v3.test.ts`): com `armas: []`, o hash dos campos que já existiam no v3 é igual ao do código da F-003 na Vigília normal (passo 1.000), no cenário horda (1.800) e no horda_rotativa (3.600), nas seeds 1 e 424242. O layout v4 e o caminho de nascer reescrito (§2) não mudam a dinâmica.
- **Referências para a Playwright, gravadas pelo Vitest:** `.verify/referencia-f004.json` (o passo e o hash da 1ª morte da Vigília normal: passo 433 na seed 1) e `.verify/referencia-tres-armas.json` (o 1º passo ≥ 600 com golpe de até 2 passos, faca em voo e número vivo: 601 na seed 1).

## 2. Armas

- **Tabela no boot** (`src/logica/armas/tabela.ts`): `criarTabelaDeArmas` compila `armas.json` em arrays tipados por (arma, nível): arquétipo, golpes e formas da sequência, alcance, recarga, velocidade e vida das facas, raio e tick do Círculo, Sal, pulso. Os bônus de nível somam sobre a base do nv1 (DN2).
- **Dano no boot** (DN1): `danoPorAcerto` é a função única da fórmula (numerador inteiro e uma divisão em double); `gravarDanoPorAcerto` a aplica a cada (arma, nível) e grava `danoDoNivel`. A simulação só lê a tabela, e `hp = fround(hp − dano)`. `calcularDano(dados, vaga, i)` aplica `multStatus × multStamina`, os dois em 100% na F-004 (DN3).
- **Espada** (`golpear`): setor de 120° com vértice no jogador e raio de 64 px (76,8 do nv5), ou o retângulo da estocada; acerto até a hitbox (W3), com ≤ e sem ε; todos os acertos no passo do golpe; a mira é o (dirX, dirY) do estado no passo de cada golpe.
- **Facas** (`rodarMaisProximo` e `moverProjeteis`): candidatos com o centro a ≤ 192 px, ordenados por d² e slot, no máximo `MAX_CANDIDATOS`; a faca k vai ao candidato k mod M, com o deslocamento lateral da W11. Cada faca acerta no máximo 1 inimigo por passo, o mais próximo pelo centro, e guarda o `ultimoAlvo` para a perfuração do nv7. O limite somado de projéteis é 200 com TETO 300 e 400 com TETO 500 (`limiteDeProjeteis`); acima dele, a faca é recusada e soma em `projeteisRecusados`.
- **Círculo** (`rodarAura`): tick global a cada 30 passos, com metade do dano por segundo; o pulso do nv7, a cada 300 passos, dá `kbPassos` = mín(12, ⌈(R + r − d)/8⌉), e o afastamento radial de 8 px por passo substitui o passo de comportamento (K1).
- **Sal:** o acerto grava o maior `salPct` e a maior `salPassos`, campo a campo (S1); a horda multiplica a velocidade por (100 − salPct)/100 enquanto `salPassos` > 0.
- **Morte:** o acerto que leva o HP a ≤ 0 marca o slot e grava o evento; os mortos ficam fora de todo acerto e escolha seguintes; a varredura 7d os remove em slot crescente, soma `mortes` e grava o evento `morte`. O overkill se perde.
- **Laço quente** (a regra do ADR-0005 §2, estendida): nas armas e no caminho de nascer, nenhuma chamada fora de linha recebe ou devolve double nem u32 ≥ 2³⁰. Entradas e saídas passam por rascunhos `Float64Array` (`COLISAO`, `CONSULTA`, `FLOATS_DO_EVENTO`, `SORTEADO`, `ENTRADA_DO_SPAWN`, `NASCIMENTO`, `ACERTO`, `DANO`). Uma função chamada poucas vezes fica no interpretador do V8 e aloca HeapNumber mesmo sendo curta; por isso a regra vale também para o que roda uma vez por golpe ou por spawn.

## 3. Anel de eventos

- `src/logica/nucleo/eventos.ts`: 1.024 entradas de 4 Uint32 (passo; tipo, arma e forma; handle do alvo; tipo do inimigo, flags e causa) e 4 Float32, num `ArrayBuffer` próprio no objeto `Estado`, fora do buffer, do hash e do save. O contador `escritos` só cresce.
- **A simulação só escreve:** `gravarEvento` recebe inteiros pequenos (o handle é montado lá dentro a partir do slot e da geração) e lê os floats de `FLOATS_DO_EVENTO`. Duas guardas:
  - um teste de `tests/lint.test.ts` confere que, em `src/logica`, o anel só aparece em `gravarEvento` e `esvaziarAnel`, e que nada importa as leituras;
  - uma regra `no-restricted-syntax` barra, em `src/logica`, o apelido (`const a = e.eventos`), a desestruturação (`const { eventos } = e`) e o acesso às views (`e.eventos.u32`). A regra entrou depois do crítico, porque o grep sozinho deixava passar a desestruturação.
- **Leitores:** `LeitorDeEventos` (o render, pelo contador; conta os eventos perdidos quando o anel dá a volta) e o `__GAME_DEBUG__`.

## 4. Render

- **5 camadas GPU** (D4 §6), todas `SpriteGPULayer` com a configuração da horda, criadas no `create` da Vigília. Em ordem de desenho: mortes (300) < horda (500) < status (500, o marcador de Sal) < armas (400 facas + 5 anéis de aura + 16 efeitos = 421) < jogador (`Image`) < dígitos (96 números × 4 = 384) < Hud. Cada camada tem uma função pura de preparo (`prepararMortes`, `prepararStatus`, `prepararArmas`, `prepararNumeros`, sem Phaser) e dois escritores (`CamadaPorGPU` e `CamadaPorImagem`); um modo só por Vigília, em `render.modo`.
- **Atlas:** molduras novas (faca, losango, anel, cunha, quadrado, os dígitos d0 a d9 com contorno, massa) no atlas de 512². A faca e o losango ficam fora do círculo (y 244 a 436), em (364, 344) e (376, 344): dentro dele saíam quadrados.
- **Efeitos fora da simulação** (`EfeitosDaVigilia`): pools de 96 números, 300 mortes e 16 efeitos, alimentados pelo anel. Cheio, o novo é recusado (`recusados.numeros`, `recusados.mortes`). A agregação N7 soma num número vivo do mesmo handle com até 12 passos. `criarEfeito` e `criarMorte` ficam em linha no consumidor, pela regra do laço quente (§8, E6).
- **Glifos:** fonte pixel 5 × 7 escrita no código, com contorno de 1 pt em #0b0e14 (glifo bicolor, N4), tint osso ou #ffd166 ×1,5 no crítico.
- **Cores:** golpe em brasa a 0,5 → 0; faca, marcador de Sal e anel da aura em sal (o anel a 60%, só traço); morte na cor do tipo. `tests/cenas/horda.test.ts` registra sal × branco (ΔE 6,5) e crítico × brasa (ΔE 9,8) como pares aceitos abaixo de 14, cada um com o motivo (V6).

## 5. Pausa e entrada

- **Onde mora** (P4): dois flags no contexto, o do jogador e o do debug; `rodarFrameComPausas` não roda passo com qualquer um deles ligado, e o acumulador não soma o tempo pausado. Nada disso entra no estado, no hash ou nos `ComandosDoPasso`.
- **Botão** (P1): alvo de 72 pt no canto superior esquerdo, dentro da safe-area (`alvoDaPausa`); aciona ao soltar dentro, se o toque começou dentro.
- **Gesto** (P3): o tradutor avalia os dedos parados (≤ 10 pt) com ≥ 500 ms no agora de cada quadro e no `timeStamp` de cada fim de dedo, antes de soltá-lo; o dono do joystick e o dedo do botão não contam; borda travada.
- **Tela** (P5, P6): cena Modal sobre a Vigília e a Hud, com os `Text` criados uma vez; os toques vêm do tradutor no modo `pausa` (`alvosDaTelaDePausa`: a opção de números e o Continuar). Ao pausar, todos os dedos são soltos; depois do Continuar, só um toque novo cria o joystick (P8; `joystick.criados` conta os donos).
- **Opção de números** (N8): em memória, fora da simulação; desligar apaga os números vivos.

## 6. TETO, sonda e cenários

- **Sonda** (ADR-0002 §13): `montarEstadoDaSonda` (`src/logica/nucleo/sonda.ts`, puro) monta a carga do TETO 500 (500 Ocos numa malha fixa e 400 projéteis sintéticos com perfuração infinita, dano 0); `SondaDoTeto` (`src/plataforma/sonda.ts`) mede na Tela de Acender, uma etapa por quadro: 120 passos de aquecimento e 8 lotes de 30; mediana ≤ 2 ms por passo → 500, senão 300; orçamento de 800 ms. O resultado vai para o cache `vdc.teto`, por build, versão do Safari e classe de tela. O rebaixamento em jogo fica para a F-010 (E2).
- **`?sonda=0`** (parâmetro novo, só no debug): desliga a sonda; o `abrir()` da Playwright o passa por padrão, e só o spec da sonda a liga.
- **Cenários:** o campo `armas` é obrigatório (vazio em `horda`, `horda_rotativa` e `sem_horda`); o novo `tres_armas` (linha 6 fixa, Espada, Facas e Círculo no nv8, jogador invulnerável) serve à E7, ao F-004.5 e ao E6.

## 7. Debug

- **`__GAME_DEBUG__` acrescido:** `build` (armas na ordem das vagas, com nível e recarga), `numerosDeDano`, `ultimosEventos` (os últimos 1.024, em ordem), `eventosPerdidos`, `mortes`, `pausa` (`ativa`, `origem`), `opcoes`, `recusados.numeros` e `recusados.mortes`, `vivos.projeteis`, `entrada.joystick.criados`; só no build de debug, `inimigos()` com HP, Sal e knockback, e `projeteis()`. A memória estimada soma o anel e as 5 camadas (membros × 168 B, na CPU e na GPU).
- **Painel do `?debug=1`:** desce para safe-area + 76 pt, para não cobrir o botão de pausa (P2), e mostra `numerosDeDano`, `mortes` e `projeteis`.

## 8. Testes, medidas e calibrações

- **F-004.1 e a evidência `tabela-de-dano.md`:** o dano de cada (arma, nível) é medido pelo evento `acerto` contra a tabela literal da D4 §3, escrita no próprio teste (±1%; valor = fround(esperado) com erro ≤ 1e-6). O Círculo é medido pelo tick × 2. Com `VDC_EVIDENCIAS=1`, o teste grava a tabela com `aprovado: true`, e o `verify.sh` só aceita um `.md` com linha `aprovado:` se ela for `aprovado: true`.
- **F-004.4 (Playwright):** sem toques, a 1ª morte da Vigília normal sai no passo 433, igual ao Node, e o hash nesse passo é o da referência. Neste contêiner (≈ 8 fps), o passo 433 chega em ≈ 10 s reais; o limite é de 1.800 passos de jogo e 120 s reais (E3).
- **F-004.6 (Playwright):** (a) botão por CDP; (b) gesto por CDP com 2 `touchPoints`. O teste de 300 ms desconta da espera a ida do toque ao navegador (até um quadro a 8 fps) e confere, pelo `timeStamp` dos eventos que a página recebeu, que o 2º dedo ficou menos de 500 ms. Na 1ª versão, a espera contava depois da ida e o 2º dedo passava de 500 ms. (c, d) usa `TouchEvent` sintético no canvas, porque no CDP do Chromium o `touchEnd` solta todos os dedos, e um dedo fora da lista de um `touchMove` continua na tela; os testes precisam soltar só o dedo do botão, com o do joystick parado.
- **gpu × image das armas:** os pixels opacos saem iguais byte a byte; nos membros translúcidos (os dígitos no fade, a estocada e as facas), a mistura de alpha arredonda diferente no `SpriteGPULayer` e no `Image`. Medido no `tres_armas`, passo 601, SwiftShader: 14.888 pixels (0,5%) com diferença de 1 num canal, nenhum maior. O spec aceita ≤ 1 por canal em ≤ 1% dos pixels também por software (`esperarIguais(..., translucidos)`); a horda da F-003, opaca, continua byte a byte.
- **E5** (horda depois do pulso, linha 19, build esvaziada): volta à S5 em 11 passos (seed 1) e 5 (seed 2) depois do 12º passo de empurrão, estável até 1.500 passos; limite fixo de 120 passos.
- **E6** (`tests/cenas/alocacao.test.ts`, as 3 armas no nv8 matando na linha 19, com o render das armas): ≤ 16 B por passo somando todas as funções de `src/`, sem lista branca. Com 3.000 passos de aquecimento, o 1º código media ≈ 260 a 280 B por passo, a maior parte da aura e da salva ainda no interpretador. Depois do dano no boot, dos rascunhos no caminho de nascer, das mortes e efeitos em linha no consumidor e de 9.000 passos de aquecimento: ≈ 13 B por passo em 3 rodadas.
- **Outras medidas:** 1º acerto do `tres_armas` nos passos 158 a 190 (seeds 1, 2, 3 e 424242); 1ª morte da Vigília normal parada no passo 433 nas seeds 1 a 20; queda do HP em Float32 até 2,9e-6 relativo do valor do evento.
- **Lint novo:** `no-restricted-syntax` contra a leitura de `.ativos` (membro, membro calculado e desestruturação) em `src/logica`, fora de `pool.ts`, e contra a leitura do anel (§3), com casos em `tests/lint.test.ts`.
- **Desenho das armas:** os testes de pixel da D4 §6 (V1 a V4) foram trocados por testes da saída de `prepararArmas` e `prepararStatus`: visível, moldura, cor, alpha, posição e o tamanho na tela (anel com 2R, faca de 4 × 16 pt, cunha com raio R, estocada com L × 2w, marcador de 8 pt). Os escritores são cobertos pelo gpu × image, e o conjunto pela evidência E7. A caixa da opção (P9) é lida no pixel pelo F-004.5: osso quando ligada; a geometria dela fica em `caixaDaOpcao` (`src/entrada/alvos.ts`), sem Phaser.
- **Consulta das armas à grade:** `consultarGradeDoRascunho` roda em todos os casos do F-003.1 (os 1.000 aleatórios e os fixos nas costuras) e tem de achar os mesmos ids que `consultarGrade`.
- **Desempenho:** nenhum gate de tempo novo; o usuário pediu para não otimizar pelo contêiner, que roda o WebGL por software.

## 9. Divergências

Do ADR-0002:

1. **§7, acerto até a hitbox** (W3): toda forma de ataque do jogador acerta ao tocar a hitbox (aura: d ≤ R + r), no lugar de "d ≤ r".
2. **§7, golpes por nível 1, 1, 2, 2, 2, 2, 3, 4** (W5), no lugar de "golpes extras (nv3 e nv8)".
3. **§7, facas em ciclo pelos candidatos** (W10), no lugar de "repete o mais próximo".
4. **§7 e brief §5.6, ordem dos multiplicadores adiada** para as F-006 e F-009 (DN3); na F-004 só existe a estrutura.
5. **§4, campos novos e trocados:** `kbPassos` nos inimigos; `ultimoAlvo`, `arma`, `salPct` e `salPassos` nos projéteis; `salPct` (redução em %) no lugar de `salFator`; `mortes` e `projeteisRecusados` no mundo; `dono` adiado; o limite de projéteis de 200 ou 400 ligado ao TETO, pela leitura de B §3.13.
6. **§4, anel de eventos no objeto `Estado`**, fora do buffer, com o formato do §3 deste ADR.
7. **§4, pool de render "mortes"** (300, recusa em `recusados.mortes`), fora da tabela de pools.
8. **§9 e §12, pausa fora do estado e dos `ComandosDoPasso`** (P4); `estado` continua `VIGILIA` com a pausa aberta.
9. **§11, camadas GPU com nomes, conteúdo e ordem próprios** (mortes, status, armas, dígitos), dentro dos "4 a 5"; glifo bicolor (N4) no lugar de "tudo em branco".
10. **§13, rebaixamento do TETO adiado para a F-010** (E2), estendendo a divergência 8 do ADR-0005; parâmetro novo `?sonda=0`.
11. **§14, quarto cenário fora dos aprovados:** `tres_armas`.

Da D3 e do ADR-0005:

12. **D3 §2 e ADR-0005 §2, ordem do passo v4** (§1), com as armas por vaga e os projéteis e as mortes por slot (a D3 §11 deixava aberta).
13. **D3 V4, o painel do debug desce** para safe-area + 76 pt (P2).
14. **D3 §9, o knockback substitui o comportamento**, em vez de somar (K1).
15. **ADR-0005 §2, o caminho de nascer da F-003 adequado à regra do laço quente** (E6), sem mudar as referências; a regressão v3 o confere.
16. **ADR-0005 §5, gpu × image** com tolerância de ±1 nos membros translúcidos (§8), também por software.

## 10. Crítico independente (Q-33)

- **Nota 7** (o Pronto exige ≥ 7), sem bug no código e sem achado bloqueante. O crítico rodou o typecheck, o lint e o Vitest. Também:
  - refez a regressão v3 com o código da F-003 extraído à parte (os 6 hashes batem);
  - refez as medidas deste ADR (a 1ª morte no passo 433 nas seeds 1 a 20; o 1º acerto do `tres_armas`);
  - fez 43 mutações: 30 reprovaram, 3 eram equivalentes e 10 sobreviveram.
- **As 10 mutações sobreviventes** viraram os achados A1 a A7. Os testes novos reprovam cada uma:
  - A1 (alto): o teste de S1 aplicava o Sal à mão, e a mutação "sobrescreve" passava → S1 testado por `acertar`, no mesmo passo nas duas ordens e no t / t + 100;
  - A2: M1 sem teste na aura e na salva → um Oco de 1 HP morto pela Espada dentro da aura leva 1 acerto e nenhum tick; com o mais próximo morto, as facas vão ao 2º candidato;
  - A3: a borda exata da W3 sem caso na estocada e na faca → a borda de trás da estocada a 16 px exatos e a faca parada a 24 px exatos (e + 1/16, não);
  - A4: `consultarGradeDoRascunho` sem equivalência com a força bruta → §8, e a aura cruzando a costura em y;
  - A5: o preparo do desenho das armas sem teste → §8;
  - A6: W11 com divisão desigual → o "3 + 2" confere os deslocamentos (−8, 0, +8 e −4, +4);
  - A7: o anel lido por desestruturação passava no grep → regra de lint (§3).
- **Achados baixos, também aplicados:**
  - A8: o F-004.5 pausava mesmo sem acerto até o passo 400, e o "60 passos" aceitava a 1ª leitura depois → agora espera o 1º acerto e confere o passo em que o número novo aparece;
  - A9: `recusados.efeitos` fixo em 0 → lê a recusa do pool de 16 efeitos; a Noviça salgada ganhou teste próprio (aproxima e recua com metade da velocidade); o F-004.1 confere o HP acerto a acerto, hpDepois = fround(hpAntes − valor).
- **Equivalentes, sem mudança:**
  - a recarga 1 no equip (a recarga decrementa antes de testar);
  - M1 no pulso (`removerInimigo` zera `kbPassos`);
  - `mudarModo` sem soltar os dedos (o app solta no quadro seguinte, e a Playwright (c, d) cobre).
- **Commits:** três commits passavam de ~300 linhas e foram redivididos (a árvore final é a mesma). Ficam os de 302 a 308 linhas, os maiores sendo um arquivo só cada: o teste das Facas e o spec da F-004.
