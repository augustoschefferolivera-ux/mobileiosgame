# ADR-0007 — Decisões de implementação da F-005 (XP, level up, passivas e União)

- **Status:** registrado na Sessão 5 (2026-10-11). São as decisões técnicas tomadas ao implementar `design/decisoes-F-005.md` (aqui, **D5**), aprovada pelo usuário sem vetos. Este ADR também registra as divergências do ADR-0002, das D4 e D5 e do ADR-0006 que a F-005 cria (§9), as medidas e calibrações dos testes (§8) e o crítico independente (§10).
- **Fontes:** B §3.5, §3.8, §3.9 e §4 (F-005); D5; D4; ADR-0002 §3 a §5, §9, §11, §12, §14 e §15; ADR-0005 §2; ADR-0006.

## 1. Estado v5 e determinismo

- **Layout (`VERSAO_LAYOUT` 5, 67.488 bytes):** tudo o que é novo vai depois dos 42.988 bytes do v4 (`BYTES_DO_LAYOUT_4`), que ficam no mesmo lugar:
  - `progresso` (Uint32: nível, XP no nível, níveis pendentes, baús por fechar, modais confirmados, Almas, XP total);
  - `jogador2` (Float32: `hpMax`), `atributos` (Uint8: FOR, DES, INT, FÉ, VIG), as 6 vagas de passiva (`codigo`, `nivel`) e a oferta aberta (`tipo` e `item` das 3 cartas);
  - a fila de 4 baús (20 bytes cada: itens, União, categoria, código e nível de até 5 itens) e o 2º bloco do mundo (`juncoes`, `bausSoltos`, `efeitosRecusados`);
  - o pool de pickups (512: `x`, `y`, `xAnt`, `yAnt`, `valor` e `tipo`) e o de efeitos de chão (64 ondas: origem, mira, dano, idade, arma e o bitset de 512 bits).
- **Fora do buffer:** os derivados `danoVivo` (por arma e nível) e `danoOnda` (por arma), em `Float64Array` no objeto `Estado` (P4). `sincronizarDerivados` os refaz a partir do buffer, e o teste da cópia do buffer no passo 500 continua igual.
- **Cabeçalho:** o bit `semCinzas` (4) entra na palavra 7 (flags do cenário).
- **Referências regravadas** (1.000 passos com o `ROTEIRO_REFERENCIA`): `f39dd6b4` na seed 1 e `7c1b6c0c` na 424242. Antes: `901adb6d` e `9cdc2c63` (F-004). O hash muda porque o layout mudou: os bytes novos (progressão, pickups e ondas) entram no hash; o roteiro chega ao passo 1.000 sem subir de nível. As outras referências da Playwright, na seed 1 (antes → agora): a 1ª morte da Vigília normal parada, ainda no passo 433, `86aa5388` → `51d4c5cd`; o `tres_armas` no passo 601, `5628633f` → `6acdb6e2`; o cenário horda no 1.800, `6767ce88` → `9ceef9c5`. Nos três, o que muda o hash são os bytes novos; a regressão v4 confere, nos mesmos passos, que os campos antigos são os da F-004.
- **Regressão v4** (`tests/logica/armas/regressao-v4.test.ts`, 10 casos): os campos do v4 (bytes 4 a 42.988, com o bit `semCinzas` mascarado na palavra 7) evoluem bit a bit como no código da F-004 (valores gravados com o commit `69760a8`) enquanto nenhum nível sobe: a Vigília normal, com Cinzas, pelo roteiro de referência até o passo 1.000 e parada até o 433; os cenários horda (1.800), horda_rotativa (3.600) e tres_armas (1.200); seeds 1 e 424242. A regressão v3 ganhou a mesma máscara.
- **Ordem do passo v5:** a da F-004, com 7b' (as ondas, depois dos projéteis) e 7e (os pickups, depois das armas e das mortes: voo, coleta, abertura dos baús, cruzamento de níveis e a oferta).
- **RNG:** o subfluxo `levelup` é semeado pelo nível ofertado e o `baus` pelo índice de queda (L4). Uma oferta consome sempre 7 u32, também com o Elmo forçado.
- **Laço quente:** a regra do ADR-0005 §2 e do ADR-0006 §2 vale para tudo o que é novo. A distância ao jogador (Ímã, coleta, abertura) e o centro da onda vão em linha, e o dano da onda passa por `ACERTO`.

## 2. XP, Cinzas e atributos

- **Tabela da progressão** (`src/logica/progressao/tabela.ts`, `criarTabelaDeProgressao`): o custo ⌈XP(n)⌉ em Uint16 até o nível técnico 255, as distâncias ao quadrado (Ímã 48², coleta 16², abertura 32²), o voo de 8 px por passo, os limiares inteiros do sorteio (60% = 2.576.980.378, 35% = 1.503.238.554), o relógio da ajuda (43.200) e o da União no baú (36.000), as passivas e as Uniões. Os números saem de `progressao.json`, `vigilantes.json` e `armas.json`; o schema novo é `progressao.schema.json`.
- **Cinza** (`soltarCinza`, chamada por `matarInimigo` só com causa arma): uma por morte, com a XP do tipo (o convertido vale 10). Com o pool cheio, a XP soma na Cinza mais próxima, e `juncoes` conta. Com o bit `semCinzas`, nada cai.
- **Pickups** (`rodarPickups`, fase 7e, em slot crescente): coleta se d² ≤ 16², senão voa 8 px se d² ≤ 48²; o baú abre se d² ≤ 32² e a fila tem vaga. Depois, `cruzarNiveis` e `gerarOfertaSeFor`.
- **Nível** (`cruzarNiveis`): enquanto xp ≥ custo, sobe; cada nível dá +1 FOR (até 20) e +2 de HP base; o `hpMax` = ⌊(base × (100 + Σ%) + 50) / 100⌋, e o HP atual sobe o mesmo tanto se o jogador está vivo. O evento `nivel` sai por nível.
- **Dano** (`src/logica/progressao/dano.ts`): `recalcularDano` refaz o `danoVivo` pela fórmula única da F-004 (`gravarDanoPorAcerto`), com escala = Σ grau × atributo, em inteiros, e o Poder das Luvas. Roda no início, a cada nível, a cada carta e na União. Com FOR 6 e Poder 0, é igual à tabela da F-004 bit a bit.

## 3. Level up, baú e União

- **Oferta** (`src/logica/progressao/oferta.ts`): `gerarOferta` sorteia as 3 cartas (60% melhoria, categoria vazia troca, as duas vazias dão Bolsa) e, depois das 12:00, com a Espada nv8, sem Elmo e sem União, o Elmo na 1ª carta com 35% (piso). `aplicarCarta` aplica o item e grava o evento `carta`. `completaUniao` é pura e só serve à tela.
- **Baú** (`bau.ts`): `abrirBau` testa a União primeiro (relógio ≥ 36.000 na abertura, Espada nv8 e Elmo); senão, 1, 3 ou 5 itens (70/25/5) por Fisher–Yates entre os possuídos que ainda sobem, e o que falta vira Bolsa. Eventos `bau` e `item`; a União grava `uniao`.
- **União** (`aplicarUniao`): a Lâmina do Juramento Eterno entra na vaga da Espada, com os timers em 0; o Elmo continua. A tabela das armas a compila do bloco `uniao` de `armas.json` (`compilarUniao`): base = 21, golpes do nv8 da Espada, recarga de 60 e 12 passos entre golpes.
- **Onda** (`src/logica/armas/ondas.ts`): `criarOnda` dentro do golpe, com o dano fixado (6,6 com FOR 6) e o evento `onda` com o slot; `rodarOndas` na fase 7b'. O limite somado de projéteis e ondas é o de 200/400; com ele, a onda é recusada e `efeitosRecusados` soma.
- **Modal** (`modal.ts`): a fila é baús primeiro, depois níveis. `confirmarModal(e, dados, k)` roda entre dois passos (M2): fecha o baú da frente sem usar k, ou aplica a carta k; nos dois casos gera a oferta seguinte, se houver nível pendente. `avancar` para no passo que abre o modal e devolve os passos rodados; com a fonte trazendo `escolhaDoModal(ordem)`, confirma e segue no mesmo laço.

## 4. Render, HUD e modal

- **Camada "mundo"** (`src/cenas/render/pickups.ts`): `SpriteGPULayer` de 566 membros (54 obstáculos + 512 pickups), abaixo das mortes, com o plano B `image`. A Cinza é um losango de 24 × 32 px no atlas, a 0,5 × {0,75; 1; 1,25} por faixa; o baú comum é o quadrado em bronze e o dourado tem moldura própria (`bau_ouro`, contorno já desenhado). Sem o parâmetro `armas`, os obstáculos continuam `Image` (os testes antigos de render).
- **Ondas:** no fim da camada das armas (485 membros, de 421), quadrado de 32 pt em brasa, alpha 0,4 até a idade 8 e 0 na 15; a posição interpolada não recua atrás da origem na idade 0.
- **HUD:** barra de XP de 8 pt e "Nv N" (`layoutDoHud.ts`, sem Phaser), 12 vagas de 28 pt com ícones geométricos (`render/icones.ts`). O `update` não aloca: a barra só muda com a XP, o texto só com o nível e as vagas só com os códigos.
- **Pausa:** 11 pares de `Text` (armas e depois passivas); a União sem nível; o espaçamento cai para 18 pt para caber no terço de cima com os insets do iPhone.
- **Modal** (`src/cenas/Modal.ts`, conteúdo em `conteudoDoModal.ts`): os `Text` são criados uma vez e trocados com `setText`; a seleção é estado da cena. O tradutor ganha o modo `modal`, com até 8 toques em carta por quadro, e sem joystick, botão de pausa ou gesto.
- **Painel do `?debug=1`:** desce para safe-area + 144 pt e mostra `nivel`, `xp`, `pendentes` e `cinzas`.

## 5. Cenários e debug

- **Receitas:** `nivel_tres` (XP inicial 29: nível 3 e 2 ofertas no passo 1), `bau_uniao` (relógio de 600 s, Espada nv8, Elmo nv2, baú dourado 96 px acima) e `vigilia_sem_cinzas`. O schema exige `cinzas`, `passivas`, `baus`, `xp_inicial` e `relogio_inicial_s` em todas; as antigas ficam com `cinzas: false`.
- **`__GAME_DEBUG__`:** os campos da D5 §8 (`jogador` com a progressão, `build.passivas`, `levelUp`, `bau`, `vivos.pickups`, `vivos.efeitos`, `juncoes`, `recusados.efeitosDeChao`), `pickups()` e `efeitosDeChao()` no build de debug, e `avancar(n)` devolvendo os passos rodados.
- **Telemetria local:** `level_up` (na confirmação) e `arma_uniao` (lendo o evento `uniao` do anel).

## 6. Specs antigos

- A Vigília normal parada abre o 1º modal no passo 723 (seed 1) e 795 (seed 424242). Os 8 `abrir(page)` do `f001.spec.ts` e o F-004.6 (a) a (c) passam a usar `vigilia_sem_cinzas` (`SEM_CINZAS` em `e2e/apoio.ts`; a constante equivalente em `tests/logica/apoio.ts`).
- O F-001.11 e o F-004.4 continuam na Vigília normal: o roteiro de referência anda e chega ao passo 1.000 sem modal, e a 1ª morte vem antes de qualquer XP.
- **Teste-guarda** (`xp.test.ts`): na seed 1, parado, o modal abre entre os passos 700 e 760; com `SEM_CINZAS`, 2.000 passos sem nível.

## 7. Referências para a Playwright

Gravadas pelo Vitest com `VDC_EVIDENCIAS=1` (`tests/logica/progressao/referencias.test.ts`), na seed 1:

- `.verify/referencia-f005.json`: o `nivel_tres` no passo 1 (nível 3, 2 pendentes, hash `2aa5a85f`, cartas Espada nv2, Luvas e Círculo); depois da carta 0, a 2ª oferta; depois das duas cartas 0, passo 1, Espada nv3 e hash `e776db53`;
- `.verify/referencia-uniao.json`: o roteiro (para cima até o passo 27, depois parado), o baú aberto no passo 27, o 1º golpe da Lâmina no 28 (`9e6a33ae`) e a captura no 285 (`472f3e31`: uma onda de idade 5 a 8 e ≥ 2 acertos de onda nos últimos 8 passos).

O spec pausa pelo debug antes do Continuar, porque o 1º golpe da Lâmina sai no passo seguinte ao fechamento; os toques do modal são tratados com a pausa do debug ligada.

## 8. Testes, medidas e calibrações

- **F-005.1 a F-005.3, F-005.5 e F-005.6** (Vitest, `tests/logica/progressao/`: `xp`, `oferta`, `bau` e `uniao`): a tabela literal do custo de n = 1 a 30; as frações do sorteio em 10.000 seeds e os limiares exatos por valor injetado; a União em 1.000 baús a 36.000 passos e nunca a 35.999; o 70/25/5 em 10.000 baús; a base 21 e o golpe 17,325 da Lâmina; a onda acertando cada inimigo uma vez, a 128 px sim e a 128 + 1/16 não; a 65ª onda recusada.
- **F-005.4 e F-005.7** (Playwright, `e2e/f005.spec.ts`): os passos da D5 §8. O spec confere também, no pixel, o contorno em brasa da carta selecionada e o fundo do Continuar do baú. A 1ª versão da cena deixava o `Graphics` das cartas invisível (só os textos apareciam), e só a captura da evidência mostrou; a conferência de pixel reprova esse caso.
- **E6 da F-005** (`tests/cenas/alocacao.test.ts`, sem lista branca, ≤ 16 B por passo):
  - a simulação com Cinzas (pool cheio, com junções), level ups escolhidos pela 1ª carta e a União formada pelo baú dourado aos 10:00: 10,7 a 11,5 B por passo em 4 rodadas, metade na `criarOnda`;
  - o jogador fica parado, como na E6 da F-004. Andando, os ramos frios que a subida de nível expõe desotimizam `moverHorda`, `golpear` e `rodarMaisProximo` em ciclos ("insufficient type feedback" no `--trace-deopt`): 150 a 2.000 B por passo com 9.000 a 30.000 passos de aquecimento. É o JIT do V8, não o código;
  - parado, quase nenhuma Cinza cai no Ímã, então o teste traz uma das Cinzas de longe para 40 px do jogador, com 60 XP, a cada 200 passos (coleta, voo, nível, modal e recálculo no trecho medido);
  - aquecimento de 27.000 passos: com 9.000, 109 B por passo (a aura e o caminho de nascer só ficam otimizados lá pelo passo 10.000, e a União mata mais); com 18.000, ≈ 60;
  - a `criarOnda` roda uma vez por golpe e fica no interpretador, onde cada leitura de `Float32Array` vira um HeapNumber. Lendo cada valor uma vez (eram 9 leituras por onda, agora 5), caiu de ≈ 10 para ≈ 5 B por passo, com o mesmo resultado bit a bit;
  - mutação: um `new Float32Array(2)` por passo em `rodarPickups` mede 209 B por passo e reprova.
- **E4 e E6 antigas:** horda 10,6 B por passo; as 3 armas, agora com a camada do mundo no render, 14,4; o render com 512 pickups e 20 ondas vivas, 2,1 por quadro.
- **gpu × image:** a camada do mundo põe os obstáculos no `SpriteGPULayer`, e a borda suavizada da textura é translúcida. No F-003 (horda, passo 600), 23 pixels de 2,96 milhões diferem em 1 num canal, todos na borda dos obstáculos; o spec passa a usar a tolerância dos translúcidos do ADR-0006 §8. A horda continua opaca.
- **Membros das camadas:** mundo 566, mortes 300, horda 500, status 500, armas 485 (421 + 64 ondas) e dígitos 384: 2.735, eram 2.105. A memória estimada do debug e o F-001 contam os novos.
- **Cores (R3)** (`tests/cenas/horda.test.ts`): ΔE ≥ 14 das Cinzas e dos baús contra as cores reservadas e os inimigos, ≥ 18 entre as Cinzas (≥ 17,5 em deuteranopia e protanopia), contraste ≥ 3:1 contra o fundo e os obstáculos; os pares aceitos da D5 R3 ficam no teste com o valor e o motivo. Bronze × ouro dá ΔE 8,5 (fora da regra; o dourado se distingue pelo contorno).
- **Simulação de 20 min (P6)** (`scripts/sim20.ts`, `npx --no-install tsx scripts/sim20.ts`, ≈ 34 s; saída em `.verify/sim20.json`): seeds 1 a 3, 3 comportamentos, a 1ª carta de cada oferta. Na seed 1, níveis aos 5/10/15/20 min (entre parênteses, o protótipo da D5): parado 8/8/8/9 (9/12/13/15); em círculo 3/4/13/25 (4/16/28/41); caçando 14/23/31/35 (15/26/35/46). Caçando, o pool de pickups chega a 512 e há 1.169 junções; a Espada nv8 + Elmo chegam aos 7:10 caçando, aos 17:15 em círculo e nunca parado. O DPS é o dano da janela do minuto anterior a cada marco, com overkill. Os números do protótipo não se reproduziram, e a causa não foi investigada; a D5 já os tinha como medida, sem gate. O nível segue quase só o quanto o jogador anda, como a D5 previa.
- **Desempenho:** nenhum gate de tempo novo; nada otimizado pelo contêiner.

## 9. Divergências

Do ADR-0002:

1. **§9 e §12, a escolha do level up fora do passo e dos `ComandosDoPasso`** (M2): `confirmarModal` entre dois passos, com as escolhas do replay na ordem dos modais (`escolhaDoModal`); sem o estado LEVEL_UP na máquina de estados (o `estado` do debug continua `VIGILIA`).
2. **§5, subfluxos `levelup` e `baus`** (L4), no lugar do "um gerador" de B §3.1.
3. **§15.2, o baú nunca é recusado** (B3): com a fila de 4 cheia, espera no chão.
4. **§4, pool de efeitos de chão** (64 ondas) somado ao limite de 200/400 dos projéteis, e o pool de pickups com junção (não recusa) quando cheio.
5. **§11, sexta camada GPU** ("mundo": obstáculos e pickups), abaixo das mortes.
6. **§14, cenários fora dos aprovados:** `nivel_tres`, `bau_uniao` e a receita `vigilia_sem_cinzas`.

Da D4 e do ADR-0006:

7. **D4 P2, o painel do `?debug=1` desce** para safe-area + 144 pt (R5).
8. **D4 P5, a pausa lista as passivas** e mostra a União sem nível, com 18 pt entre as linhas.
9. **D4 W3 não vale para o Ímã** (X4): 48 px de centro a centro.
10. **ADR-0006 §8, gpu × image da horda com a tolerância dos translúcidos** (§8 deste ADR).
11. **ADR-0006 §8, aquecimento de 27.000 passos** na nova variante do E6 (as antigas continuam com 3.000 e 9.000).

Da D5 (decisões tomadas na implementação):

12. **`vivos.efeitos` conta as ondas** (a chave do ADR-0002 §14, que ficava em 0), no lugar de um `vivos.efeitosDeChao` novo; `recusados.efeitosDeChao` existe como na D5.
13. **O baú dourado tem moldura própria no atlas** (`bau_ouro`, com o contorno já desenhado), em vez de um 2º membro de contorno.
14. **Os níveis do `sim20` não batem com os do protótipo** (§8); a D5 já não os tinha como gate.
15. **As lores das armas e das passivas continuam "…"** em `pt-BR.json` (texto pendente desde a F-004); a carta mostra a linha.

Do processo:

16. **Commits acima de ~300 linhas:** sete commits passaram do limite: 470, 448, 442, 381, 380, 343 e 309 linhas (o layout v5, o level up e o baú, os dados, os testes do baú e da União, a tabela da progressão e os dois da Etapa 1). Já estavam enviados, e redividi-los exigiria reescrever o histórico de uma branch publicada; ficam registrados aqui. Os commits seguintes ficaram em até ~300.

## 10. Crítico independente

⟨critico⟩
