# ADR-0005 — Decisões de implementação da F-003 (hordas)

- **Status:** registrado na Sessão 3 (2026-10-11). São as decisões técnicas tomadas ao implementar `design/decisoes-F-003.md` (aqui, **D3**), cujas decisões de design foram delegadas pelo usuário e passaram por revisão adversarial (D3 §11). Este ADR também registra as divergências do ADR-0002 que a F-003 cria (§8) e as calibrações dos testes de desempenho e de heap (§7).
- **Fontes:** B §3.2, §3.3, §3.6, §3.7, §3.13 e §4 (F-003); D3; ADR-0002 §3 a §15 e Apêndice A; ADR-0003; ADR-0004.

## 1. Estado v3 e determinismo

- **Layout (`VERSAO_LAYOUT` 3, 20.232 bytes):**
  - cabeçalho de 16 palavras: versão, seed, passo, relógio, `tutoriaisVistos`, `disposicao`, `teto`, `cenario` (bit 0 = jogador invulnerável, bit 1 = diretor desligado), `linhaFixa` (0xFFFFFFFF = nenhuma), `rotacao` e 6 reservadas;
  - 6 fluxos de RNG;
  - jogador em Float32: `x`, `y`, `xAnt`, `yAnt`, `dirX`, `dirY`, `hp`; em Uint8: `promptMover`, `invulContato` e 2 reservados;
  - mundo e diretor, 8 palavras sem reserva: `intensidade10`, `espera`, `garantidosEntregues`, `spawns`, `recusados`, `semPontoLivre`, `removidos` e `garantidosPerdidos`;
  - pool de inimigos com capacidade 500: contagens, pilha de livres, lista densa, posição e geração (Uint16); campos Float32 `x`, `y`, `xAnt`, `yAnt`, `hp`, `dano` e Uint8 `tipo`, `convertido`. Os slots livres ficam zerados (`removerInimigo`), e o hash cobre o buffer inteiro.
- **Parâmetros da Vigília:** `criarEstado(seed, dados, parametros)` recebe `tutoriaisVistos`, `teto` (300 ou 500; outro valor é erro), `cenario`, `linhaFixa` e `rotacao`, que vão para o cabeçalho e entram no hash.
- **Referências** (seed 1 e 424242; 1.000 passos com o `ROTEIRO_REFERENCIA`, a Charneca completa e o diretor ligado): `e91ed119` e `6173ca75`. O Vitest trava também os fatos da horda no passo 1.000: 15 vivos e 15 spawns nas duas seeds; 1º acerto de contato nos passos 146 e 283; HP 138 e 102.
- **Testes novos de determinismo:** copiar o buffer no passo 500 para um estado novo e seguir os dois até o 1.000 dá o mesmo hash; a trilha a cada 100 passos, com o hash por seção (cabeçalho, RNG, jogador, mundo, inimigos), vai para o log de evidência. O F-001.11 (Node × Chromium) passa `&teto=300`; o cenário horda também é comparado entre os dois motores, no passo 1.800 da captura E3 (`.verify/referencia-horda.json`, gravada pelo Vitest).
- **Os fatos de movimento do roteiro** (costuras nos passos 258 e 962, o deslize) são conferidos numa Vigília sem diretor (`SEM_HORDA` no Vitest, `?cenario=sem_horda` na Playwright).

## 2. Física da horda

- **Ordem do passo** (D3 §2): relógio; jogador (intenção, bloqueio pelos inimigos, obstáculos, normalização) e prompt; horda (comportamento, grade, separação, bloqueio pelo jogador, obstáculos da célula, normalização); contato; rotação do cenário; diretor.
- **Separação:** Jacobi com ½ da penetração para cada lado, empurrão somado limitado à velocidade base do tipo, rascunhos de módulo (`Float64Array(500)`), visita em ordem crescente de slot. A grade é refeita a cada passo por counting sort, e a consulta usa o intervalo de células em px com R = rᵢ + R_MAX. A visita da grade fica em linha dentro de `separarHorda` (não chama `consultarGrade`, que o F-003.1 testa); por isso um teste compara a separação com a força bruta em 1.000 configurações aleatórias, inclusive nas costuras (diferença < 1e-9).
- **Solidez (S4):** regra simétrica `max(0, pen_depois − max(0, pen_inicio))`; o jogador é bloqueado pelos inimigos parados do passo anterior (2 passadas em ordem de slot) e nunca é empurrado.
- **Contato e solidez por varredura dos 500 slots, não pela grade:** o jogador é um só, e a varredura linear (≈ 300 testes de distância) custa menos que montar a consulta; a grade da horda é refeita depois do movimento do jogador e não serviria à fase dele.
- **Obstáculos por célula:** lista estática por célula da grade de 64 px, com alcance r_o + R_MAX + 1 px; bit a bit igual à lista inteira em 10.000 casos (a folga mínima da Charneca, 67,4 px, passa de 2·R_MAX + v). O jogador continua com a lista inteira.
- **Laço quente (técnica, achado da revisão):** nos laços por inimigo (comportamento, separação, bloqueio, colisão, contato) e por slot em `prepararHorda`, nenhuma chamada fora de linha recebe ou devolve double. O delta toroidal, a normalização, o passo de comportamento e o intervalo de células vão em linha, e a colisão lê e escreve num `Float64Array` de rascunho (`COLISAO`, com `colidirComTodos` e `colidirNaCelula`; as funções antigas com argumentos ficaram como invólucros para os testes). Medido: o 1º código alocava ≈ 48 KB de HeapNumbers por passo com 300 vivos; depois, ≈ 9 B (E4, §7). O resultado é bit a bit o mesmo: as referências do §1 não mudaram. O tint de cada tipo é empacotado uma vez na tabela de desenho (um uint32 ≥ 2³¹ viraria HeapNumber ao sair de uma função), e o intervalo de células vai em linha. O E4 é o árbitro: ele mede a alocação que de fato acontece, não as chamadas que o V8 consegue pôr em linha.
- **Comportamento provisório** (S6): perseguir mín(v, d); parar a 48 px; manter 128 px com recuo. Medido na implementação: sem o recuo da Noviça, a horda da linha 19 nunca assenta.
- **Teste de contorno (S8):** 52 casos (`tests/logica/mundo/contorno.test.ts`), todos chegam em 1.800 passos; o campo de fluxo não foi implementado. A mutação "sem desempate" reprova 17 casos, entre eles todo o C1 com deslocamento 0.
- **Anel simétrico de 7 Ocos:** um anel perfeitamente simétrico de 7 ou mais Ocos que chega junto, partindo de 33 a 40 px, para a ≈ 34,7 px e não acerta (a separação limitada anula a perseguição antes do contato). Com chegadas reais (3 a 40 Ocos, 20 seeds), o jogador parado leva os 5/s em todos os casos; o teste fixa o regime com 7 e 20 Ocos e o anel já encostado (D3 §3).

## 3. Diretor

- **Timeline compilada** uma vez nos dados da Vigília: mínimo, passos-base, marcos, roster (tipos e pesos acumulados) e garantidos por linha, em arrays tipados.
- **Tipos validados no boot (achado da revisão):** `criarDadosDaVigilia` confere que todo tipo do roster, dos garantidos e o Oco Grande (convertido) tem tamanho e comportamento de movimento; senão, o erro sai na montagem, e não num passo. O R_MAX sai desse conjunto (24 na Charneca), e só os tipos dele ficam com `existe` = 1: `nascerInimigo` recusa os outros, e nenhum corpo passa do R_MAX.
- **`vivosEquivalentes(e)`** = slots + 9 × convertidos, a mesma função na reposição e no debug; um teste trava que os convertidos contam 10 (removidos 10 comuns com 3 convertidos vivos, voltam 10 comuns e nenhum convertido).
- **Roster das linhas de marco (M1):** a timeline usa o roster da linha anterior nas linhas 5, 10 e 15, onde o Apêndice A do ADR-0002 tem `"roster": []` (§8).
- **Direções:** tabela literal de 256 vetores em (k + ½) × 360°/256, gerada por `scripts/gerar-direcoes.py` (Decimal com 50 dígitos; o 1º quadrante e as rotações exatas); `--conferir` exige igualdade exata.
- **Anel e viés:** 3 sorteios por spawn (lado, direção `u >>> 24`, raio uniforme), inversão k + 128 para o viés de 60/40 e busca alternada de ponto livre no mesmo raio.
- **Contadores no hash:** `spawns`, `recusados` (pool físico cheio; fica em 0 com TETO ≤ 500), `garantidosPerdidos`, `semPontoLivre` e `removidos`.

## 4. TETO e cenários

- **`decidirTeto({ override, cache, tela, sonda })`**, pura, com as 5 camadas do ADR-0002 §13. Na F-003 só existem o override (`?teto=300|500`, só no build de debug) e a classe de tela; cache e sonda chegam `null`, e o fallback é 300.
- **Cenários como receitas** (`src/dados/cenarios/*.json`, com `cenario.schema.json`), lidos só no build de debug por `?cenario=<id>`; um id desconhecido é erro no boot. `horda` (linha 19 fixa, jogador invulnerável, tutoriais vistos), `horda_rotativa` (a mesma com rotação de 10 a cada 60 passos, para o heap) e `sem_horda` (diretor desligado, tutoriais por ver).
- **Rotação:** dentro do passo, depois do contato, os N inimigos de menor slot são removidos a cada 60 passos e somam em `removidos`; o diretor repõe na reposição seguinte.

## 5. Render

- **`SpriteGPULayer` da horda** (capacidade 500, um membro por slot), criado no `create` da Vigília e liberado no `SHUTDOWN` (buffers, VAOs de cada programa e a textura de molduras, que o `preDestroy` do 4.2.1 não libera).
- **Escrita direta** no buffer de instâncias: stride de 42 floats (168 B) e os offsets do `getMemberData` (x 0, y 4, escala 12 e 16, alpha 20, moldura 24, tints 32 a 35); depois, `setAllSegmentsNeedUpdate`. O F-003.11 roda o `SpriteGPULayer` real do Phaser sobre um `gl` falso e lê de volta, pelo `getMember` do próprio Phaser, o que o escritor gravou; confere também 8, 28 e 38, e a limpeza. A mutação de um offset reprova.
- **`?buffer=dinamico`** (parâmetro novo, só no debug): `bufferUsage = DYNAMIC_DRAW` + `resize(500)` antes dos `addMember`.
- **Plano B `?render=image`:** 500 `Image` numa layer; moldura, escala e tint só quando o tipo do slot muda. Os dois modos consomem a mesma saída de `prepararHorda` e dão o mesmo PNG do canvas, byte a byte, no SwiftShader (Playwright, nos passos 600 e depois de remover 3 inimigos).
- **Aquecimento:** a Tela de Acender cria um layer de 1 membro, desenha uma vez e o libera; a Vigília não compila programa novo (a Playwright compara a contagem de programas do layer no cache). Se o aquecimento achar 0 unidades de textura no vertex shader ou a criação do layer falhar, a Vigília cai para `image` sozinha, também no build de produção (§8); a Playwright confere a queda com `getParameter` devolvendo 0. Uma falha ao ligar o programa só aparece no 1º desenho, dentro do render do Phaser, e não é tratada (todo iPhone com iOS 17 tem 16 unidades).
- **Paleta sem Phaser:** `src/cenas/paleta.ts` (reexportada por `estilo.ts`), para os testes da Playwright conferirem os pixels. Noviça em #8994b4 (D3 §7).

## 6. Debug

- **`__GAME_DEBUG__` acrescido:** `vivos` pelo pool, `convertidos`, `diretor` (`linha`, `espera`, `alvo`, `minEfetivo`, `vivosEq`, `spawns`, `garantidosPerdidos`, `semPontoLivre`, `removidos`), `teto`, `cenario`, `render` (`modo`, `origem`, `buffer`, `stride`, `capacidade`, `drawCalls`, `programaAquecido`, `programasDoLayer`), `webgl` (`renderer`, `software`), `cpuFrameMs`, `quadrosContados`, `jogador.hp` e `jogador.invulContato`; só no build de debug, `quadros()`, `inimigos()`, `hashPorSecao()` e `removerInimigo(slot)`.
- **Painel do `?debug=1`:** `<pre>` fora do canvas, atualizado a cada 500 ms, com as chaves do `__GAME_DEBUG__`; sem `eslint-disable` (o `vdc/textos` é sintático), mas é texto visível fora de `t()` (§8).
- **Verificação de NaN** por quadro, depois dos passos, sem alocar e fora do tempo contado como simulação; a mensagem diz "no passo N ou antes (quadro de k passos)".
- **Medidor de quadros:** `PRE_STEP` → `PRE_RENDER` → `POST_RENDER`, mais o tempo e os passos da simulação, num anel de 2.048 quadros.

## 7. Testes de desempenho, heap e alocação

- **E1 (F-003.4, `e2e/f003.spec.ts`):** 300 vivos nas 30 leituras; p95 de um passo (só quadros com passos ≥ 1) + p95 do resto até `PRE_RENDER` < 10 ms; draw calls ≤ 150; fps ≥ 55 e o quadro inteiro só com GPU de hardware. Neste contêiner o renderer é o SwiftShader: o relatório `desempenho-30s.json` sai com `fps_conferido: false`, e o `verify.sh` avisa. **Calibração** (5 rodadas no `taps-game`, CPU 4×, renderer SwiftShader): p95 de um passo de 1,70 a 1,90 ms; p95 do resto até `PRE_RENDER` de 2,1 a 2,5 ms; soma de 3,80 a 4,34 ms (limite 10; margem ≥ 57%); draw calls 4; fps de 7,8 a 8,3 (por software, não conferido). Para registro, o quadro inteiro: p50 de 7,8 a 8,5 ms e p95 de 14,2 a 15,2 ms, com o SwiftShader dentro. As 5 passaram, e o E1 vale como gate.
- **E2 (F-003.7, `e2e/f003-heap.spec.ts`):** horda_rotativa, 300 vivos, aquecimento, snapshot A, 60 s, snapshot B; Δ dos bytes ≤ 32 KiB e Δ ≤ 100 nós por grupo, fora de `(code)`, `PerformanceLongTaskTiming` e `TaskAttributionTiming`. **Calibração:** com os 30 s de aquecimento de D3, o grupo `(hidden)` cresceu 273 nós no 1º minuto (metadados do JIT do V8: `WeakArrayList`, `ProtectedFixedArray`, `SharedFunctionInfoWrapper`) e parou depois (Δ ≈ 0 no 2º e no 3º minuto). Em vez de excluir esses grupos, o aquecimento passou a 90 s (timeout de 240 s). Em 3 rodadas: Δ de 2,9 a 3,7 KB e no máximo 13 nós num grupo, abaixo da metade dos limites, que ficam. Mutações, cada uma num build próprio: um `{ slot }` retido por spawn reprova pela contagem (`Object` +590; pelos bytes, 15 KB, passaria); um `Float64Array(8)` retido por spawn reprova pelos dois (+110 KB; `Float64Array`, `ArrayBuffer` e `(array)` com +570 cada). O teste aceita 290 vivos no snapshot B (a rotação remove 10 e repõe em ≤ 21 passos).
- **E4 (`tests/cenas/alocacao.test.ts`):** HeapProfiler amostral do Node (64 B) em 6.000 passos do cenário horda e 6.000 quadros de `prepararHorda` + escritor GPU; limite de 16 B por passo; medido 8,5 a 9,2 B em 3 rodadas; a mutação de um `new Float32Array(2)` retido por passo mede ≈ 210 B e reprova. Mede o V8: no JSC (iPhone), doubles não viram objeto.
- **`verify.sh`:** uma evidência `.json` só passa com `aprovado: true`; um relatório com `fps_conferido: false` imprime um AVISO.

## 8. Divergências do ADR-0002

1. **Linha do diretor fora do estado** (§4 diz "diretor (linha, acumulador de intervalo)"): a linha sai do relógio ou da linha fixa do cenário; guardá-la poderia divergir.
2. **Roster das linhas de marco** (Apêndice A: `[]`): o da linha anterior (D3 M1).
3. **Cenário como receita** (§14: "no formato do `vigilia`", que nasce na F-008), com dois cenários a mais que os três aprovados: `horda_rotativa` e `sem_horda`.
4. **`?buffer=dinamico`**, parâmetro novo do build de debug.
5. **Camada da horda preenchida no `create` da Vigília** (§11: "no boot"): um layer é objeto de cena.
6. **Obstáculos e jogador ainda em `Image`**, fora das camadas GPU "mundo" e "jogador" (§11), até a F-005 e as seguintes.
7. **Queda automática para `image` também no build de produção** (§11 e §14 só preveem o plano B como parâmetro de debug).
8. **TETO sem sonda, sem cache `vdc.teto` e sem rebaixamento** (§11.1, §13 e §15 item 2): saem da F-003 até a 1ª feature com projéteis.
9. **Contato e solidez por varredura**, não pela grade (§6).
10. **Texto visível fora de `t()` no painel de debug** (B §3.15; §11), só no build de debug e sem exceção no lint.
11. **`__GAME_DEBUG__` acrescido** (§6 deste ADR).

## 9. Crítico independente (Q-33)

- **Nota 8** (o Pronto exige ≥ 7), sem achado bloqueante nem alto. O crítico rodou o typecheck, o lint e o Vitest, e refez as mutações citadas nos documentos ("limite 2·v", "sem desempate" com 17 casos, o E4 contra o código anterior à regra do laço quente, com 45.176 B por passo).
- **Achados médios, aplicados:**
  - M1: o "9 × convertidos" do vivosEq não tinha teste → `vivosEquivalentes(e)`, usada na reposição e no debug, e um teste que reprova a mutação "vivosEq = slots";
  - M2: o F-003.1 testa `consultarGrade`, mas a separação visita a grade em linha → teste de equivalência da separação com a força bruta (§2), que reprova a mutação do intervalo de colunas; `celulaDoPonto`, sem uso, saiu;
  - M3: a queda para `image` só cobre as unidades de textura e a criação do layer, e não tinha teste → texto corrigido (§5 e D3 §7) e um spec da Playwright com 0 unidades;
  - M4: o fps médio dividia por 30 s fixos e o recorte do anel não tinha guarda → o tempo real da janela e a guarda de quadros (`janela_s`, `janela_parcial` no relatório).
- **Achados baixos, aplicados:** o tint empacotado na tabela e o intervalo de células em linha (B1); `existe` só para os tipos que nascem (B2); `linhaCorrente` delega a `minutoDaEscala`, e `CORPO_PX` e os 4,5 corpos/s ficam só em `tipos.ts` (B3); o JSDoc solto da grade, o comentário do heap, "passo 0" nos testes do diretor, o `'/'` do painel (agora `cpuFrameMs_p50` e `cpuFrameMs_p95`) e os nomes das posições na horda (B4); o hash Node × Chromium do cenário horda no passo 1.800 (B5). B6 (commits de 301 a 341 linhas, os maiores de um arquivo de teste só) fica como está.
