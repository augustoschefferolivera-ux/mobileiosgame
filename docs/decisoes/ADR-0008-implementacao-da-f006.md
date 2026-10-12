# ADR-0008 — Decisões de implementação da F-006 (stamina, esquiva e aparo)

- **Status:** registrado na Sessão 6 (2026-10-12). São as decisões técnicas tomadas ao implementar `design/decisoes-F-006.md` (aqui, **D6**), aprovada pelo usuário sem vetos. Este ADR também registra as divergências do ADR-0002, das D3, D4 e D5, dos documentos e do `feature_list.json` que a F-006 cria (§9), as medidas e calibrações dos testes (§8) e o espaço do crítico independente (§10).
- **Fontes:** B §3.3 a §3.6 e §4 (F-006); D6; D3 a D5; ADR-0002 §3 a §7, §14 e §15; ADR-0005 §2; ADR-0006; ADR-0007.

## 1. Estado v6 e determinismo

- **Layout (`VERSAO_LAYOUT` 6, 74.636 bytes):** tudo o que é novo vai depois dos 67.488 bytes do v5 (`BYTES_DO_LAYOUT_5`), que ficam no mesmo lugar, em seções de tamanho múltiplo de 4:
  - `jogador3`: Float32 (`stamina`, `esquivaDirX`, `esquivaDirY`), 14 campos Uint8 (`esperaRegen`, `esquivaPasso`, `esquivaPerfeitaDada`, `poderPassos`, `aparoJanela`, `aparoLimite`, `aparoFalho`, `congelamento`, `facaExtra`, `promptEsquiva`, `promptAparo`, `falhasDeAparo`, `salPct`, `salPassos`) e 3 Uint16 (`alvoAparadoSlot`, `alvoAparadoGeracao`, `ameacasAparaveis`);
  - por vaga, `caSeq` e `caEspera` (Uint8);
  - por inimigo, `quebradaPassos`, `ataqueFase`, `ataqueTimer` (Uint8) e `miraX`, `miraY` (Float32);
  - por projétil, `donoSlot` e `donoGeracao` (Uint16); o projétil de Sal é o tipo 2 do mesmo pool.
  - Nada nos 2 bytes reservados de `JOGADOR_U8` nem nas palavras 10 a 15 do cabeçalho; não há `mundo3`. `hashPorSecao.efeitos` termina em `BYTES_DO_LAYOUT_5` e a chave nova `combate` cobre o resto.
- **Referências regravadas** (antes → agora; seed 1, salvo onde diz):

| Referência | F-005 | F-006 |
|---|---|---|
| `determinismo.test.ts`, passo 1.000, seeds 1 e 424242 (sem ataques) | `f39dd6b4`, `7c1b6c0c` | `c052c6c9`, `6ddd6d39` |
| `nivel_tres` no passo 1 e depois das cartas 0 | `2aa5a85f`, `e776db53` | `ca1c0824`, `286ca680` |
| 1ª morte da Vigília normal parada, passo 433 | `51d4c5cd` | `741c1990` só pelo layout; `3b6ee2e8` com os ataques da produção (o que a Playwright confere) |
| F-001.11, passo 1.000 da Vigília de produção (`referencia-f001.json`) | `f39dd6b4` | `fa024a61` |
| `horda`, passo 1.800 | `9ceef9c5` | `1b64832e` |
| `tres_armas`, passo 601 | `6acdb6e2` | `82e929e9` |
| `bau_uniao`, golpe da Lâmina (28) e captura (285) | `9e6a33ae`, `472f3e31` | `32848ffd`, `369426c6` |

  O hash muda nas sete linhas porque a palavra 0 (versão) e a stamina inicial 100 entram nele. Nas receitas antigas e em `criarEstado(seed, D)` os ataques seguem desligados, então o que muda é só o layout. Nova: `.verify/referencia-f006.json` (roteiro do vídeo, cinco marcas Node × Chromium por (passo, congelamento) e os passos da captura dos telegrafos).
- **Regressão v5** (`tests/logica/combate/regressao-v5.test.ts`): os bytes 4 a 67.488 evoluem bit a bit como no código de `bc999b3` (a F-005, extraído à parte antes de qualquer edição) nos casos da v4 e da v5, mais a `horda_com_ataques` até o passo 117 (o 1º telegrafo é no 118, igual nas seeds 1 e 424242). Máscaras: palavra 0 fora; palavra 4 com `& 1`; no caso com ataques, também o bit 8 da palavra 7. O commit do layout veio sozinho, antes de qualquer comportamento.
- **Ordem do passo v6** (estende a v5 do ADR-0007 §1): **0.** congelamento (se `congelamento > 0`, decrementa e encerra o passo; `passo` e `relogio` ficam parados); **1.** `passo` e `relogio` andam; **2.** jogador (timers; comandos, aparo antes de esquiva; regeneração só se não houve gasto nem decisão de falho; deslocamento; prompt de mover); **3.** horda (o atordoado e os médios em ataque ficam enraizados); **4.** armas, com as salvas do Contra-ataque, e logo depois o decremento de `poderPassos`; **5.** pickups; **6.** ataques dos inimigos e projéteis de Sal, com a resolução única do acerto no jogador (aparo > i-frames > dano) e, depois do laço, o aparo concluído e a Postura em área; **7.** contato; **8.** `quebradaPassos` decrementa 1 (o único decremento) e a rotação do cenário; **9.** diretor.
- **RNG:** nenhum fluxo novo. O `ia` segue semeado e sem consumidor; um fluxo novo deslocaria o buffer inteiro.
- **Replay:** o replay de 1 passo por quadro e o de 5 dão o mesmo hash com ataques ligados. Congelado, o passo é um passo comum do acumulador; `avancar(n)` conta os passos congelados nos `n` pedidos, e nenhum teste espera `início + n`.
- **Laço quente:** a regra do ADR-0005 §2 vale para tudo o que é novo (§8): nenhum double nem u32 ≥ 2³⁰ atravessa chamada fora de linha, nem nas funções frias.

## 2. Stamina, esquiva e gestos

- **Dados** (`src/dados/combate.json` e schema): só o que nenhum JSON tinha (custos, durações, distâncias, regeneração, janela e falho, congelamento, Poder, Postura, Contra-ataque, swipe e toque duplo). Mais três números que entraram na implementação: `alcance_de_tiro_novica_corpos` (6, em `ataques_dos_inimigos`), `postura_quebrada.dano_pct` (200) e `contra_ataque_fator` (2). `criarTabelaDeCombate` (em `dados.ts`) compila tudo em `DadosDaVigilia`; o resto continua em `vigilantes.json`, `armas.json` e `inimigos.json` (que fecha `alcance_corpos`, `raio_corpos`, `vida_s` e ganha `postura_quebrada`). `aparoLimite` é 11 e `aparoLimiteEstendido` 17; o passo grava `aparoJanela` = limite + 1.
- **Esquiva:** 80 px em 21 passos, constante, direção fixa; i-frames nos passos 2 a 13; custo 25 e atraso de regeneração `max(esperaRegen, 30)`. Ação negada por stamina: evento 19, nada muda. A esquiva perfeita vale só a 1ª por esquiva (`esquivaPerfeitaDada`) e vem pelo contato, pelo golpe e pelo projétil (`ORIGEM_DO_DANO`). O Poder +15% (120 passos) não chama `recalcularDano`: há duas tabelas, `derivados.danoVivoPoder` e `danoOndaPoder`, refeitas junto de `recalcularDano` nos mesmos eventos raros (início, nível, carta, baú, União, cópia do buffer e `sincronizarDerivados`). A faca extra é sempre 1 (o campo de `armas.json` não é lido) e só se consome se ao menos uma faca da salva nascer.
- **Comandos:** `ComandosDoPasso` ganha `acoes` (bits `ACAO`) e `mira`. O roteiro tem uma lista paralela `AcaoDeRoteiro` (passo exato). A borda é consumida na fonte: `fonteConstante` zera `acoes` e `mira` ao entregá-las, então a ação entra uma vez só e um quadro de 0 passos não a perde.
- **Tradutor de gestos:** swipe do dedo do joystick (anel de 16 amostras, janela de 100 ms inclusiva, > 400 pt/s, Δt ≥ 16 ms, ≥ 24 pt) e toque duplo (200 ms e 10 pt; o 2º começa em até 250 ms e 40 pt). O tradutor guarda a última `out` de `traduzir` (campo `saida`) para `mudarModo` zerar a ação pendente e para o toque duplo ligar o bit no `touchstart`. Espaço do teclado de debug: `pedirEsquivaDoTeclado()`. Os arrastos dos specs antigos passam a `arrastarDevagar` (6 pt a cada 40 ms, 150 pt/s) para ficar abaixo de 400 pt/s.
- **Botão Aparo:** é um alvo (`alvoDoAparo`) com papel de botão no tradutor (`botaoDaPausa`, `botaoDoAparo`, `qualBotao`); joystick e Aparo segurados por 0,5 s não abrem a pausa.

## 3. Aparo, Postura Quebrada e Contra-ataque

- **Aparo** (`mundo/aparo.ts`): `aparar` por atacante e `concluirAparos` depois do laço da fase 6 (zera a janela, arma `caSeq`/`caEspera` em toda vaga ocupada, evento 18 com o número de vagas, Postura em área de 64 px + raio e no atacante, mesmo fora do raio). O gancho não está dentro de `resolverAcertoNoJogador`: `ataques.ts` testa `janelaAtiva && aparavel` antes de chamá-lo (mesma precedência; o contato nunca passa pelo aparo). A janela é lida uma vez num local antes do laço. `alvoAparadoSlot` = 0xFFFF é "sem aparado"; vale o menor slot entre os atacantes. Aparo e esquiva no mesmo passo: o aparo (aceito ou negado) vence.
- **Falho e vazio:** `ameacasAparaveis` é recalculado a cada passo, mas lido no passo seguinte (o desfecho em `c+12`). `falhasDeAparo` conta (a) aparo falho e (b) golpe ou projétil com dano, não contato, com `promptAparo` visível, saturando em 255; com 2 falhas e o prompt na tela, a janela vai a 17.
- **Postura Quebrada:** `quebradaPassos` grava 121 na fase 6 e o único decremento é o da fase 8 (`decrementarPostura`); todos os leitores veem > 0 de h+1 a h+120. O atordoado: Oco Grande volta a livre; a Noviça fica em recuperação com timer = intervalo (180), refeito a cada passo atordoado. No passo do sucesso o contato já lê 121 (o Oco encostado não fere em h também). O fator por alvo está em `acertar` (`ACERTO` é `Float64Array([dano, fator])`, `flagsExtra` traz `FLAG.contra`) e o `pqFator` por (arma, nível) sai de `dano_pct_vs_postura_quebrada` em produto com o 200; a Lâmina copia o do nível de origem; facas e ondas leem o fator no nível 1 da arma.
- **Contra-ataque:** `caSeq`/`caEspera` por vaga. Espada e Lâmina: a sequência inteira, mirada no aparado, pelo `golpear`; Facas: `salvaDeFacas(e, dados, v, contra)`, todas no aparado num passo; Círculo: um tick extra, dentro de `rodarAura` (§8). `criarOnda(e, codigo, fatorContra = 0)`: com fator > 0 a mira vem de `MIRA` (preenchida por `golpear`) e o dano fixado leva o fator. As ondas e facas do Contra-ataque não levam `FLAG.contra` nos acertos (só os golpes e os ticks): a flag não está no projétil nem na onda.

## 4. Ataques dos inimigos

- **`rodarAtaques`** (`mundo/ataques.ts`, exportada para os testes de fronteira): uma função só, com o telegrafo, o golpe e o lançamento como ramos, lendo cada Float32 uma vez. `ataqueTimer` conta o que falta da fase (telegrafo 36 e 30; recuperação do Oco 90 a partir do passo do golpe; espera da Noviça = 180 − 30 = 150 a partir do lançamento). Gatilho do Oco Grande a 80 px, enraizado do telegrafo a T+125; a Noviça a até 192 px, enraizada de T a T+29, e o gatilho confere a capacidade do pool (NV5). O enraizamento é lido em `moverHorda`.
- **Projétil de Sal:** tipo 2 de `TIPO_DE_PROJETIL` no mesmo pool (limite 200/400), `arma` = 0 e `perfuracoes` = 0; o evento 12 do projétil leva x, y do projétil e o handle do dono só se a geração confere (senão `SEM_ALVO`); o prazo da ameaça (36) é o telegrafo do Oco Grande. `moverProjeteis` ignora o tipo 2 (uma só vez por passo, pela fase 6).
- **Sal no jogador:** `max` por campo, só no desfecho 1 (acertou) sem `jogadorInvulneravel`, ativo em h+1 a h+180 e só na caminhada.
- **Resolução do acerto no jogador** (`contato.ts`): `danoAoJogador(e, origem)` lê o dano bruto de `BRUTO[0]`; `resolverAcertoNoJogador` devolve `DESFECHO` (1 acertou, 2 esquivado, 3 aparado) e `aplicarContato` devolve −1 quando o contato é evitado. `danoAoJogador` segue o único caminho do HP.
- **Escala no spawn:** `gravarHpNoSpawn` e `gravarDanoNoSpawn` foram para o módulo folha `mundo/escala.ts` (reexportados por `inimigos.ts`); um teste confere que as duas vias dão os mesmos bytes. Os `inimigos` iniciais das receitas nascem em `postarInimigoInicial` (`estado.ts`): importar `mundo/inimigos` de `estado.ts` cria ciclo de valores.

## 5. Render, HUD, pausa e áudio

- **Médios em 2ª camada:** tipo "medio" é `moldura === 'quadrado'` na tabela de desenho (inclui o `elite` da F-008); a camada da horda zera a escala deles (GPU e image) e `prepararMedios` escreve compacto e zera a cauda do quadro anterior. São 500 membros novos, mais telegrafos (`prepararTelegrafos`) e projéteis inimigos (`prepararProjeteisInimigos`, 2 membros por projétil, 128 membros = 64 projéteis).
- **Atlas:** duas molduras novas, `estrela` (24 × 24 px em 0,472) e `anel_pequeno` (48 × 48 px em 240,444): o `anel` escalado a 24 pt dava traço de 0,4 pt, então o anel do projétil (RE6) tem moldura própria com traço de 2 pt. A `SaidaDeSprites` ganha `blend` (tintBlend por membro, padrão 1); o plano B calcula `mix(branco, cor, blend)` em inteiros (`tintDoBlend`).
- **Indício da cunha** (RE7/AP12): sólida = alfa 1 com `ataqueTimer ≤ 11` (≤ 17 com `promptAparo` visível e `falhasDeAparo ≥ 2`), incondicional (não confere se o jogador está no arco). O "0,40 no último passo" da RE5 vale para a faixa da Noviça; na cunha vale até `ataqueTimer = 12` (≈ 0,306), porque os últimos 11 passos são sólidos (divergência 15). O teste de pixel da RE5 é tirado antes do passo T+25.
- **Congelamento:** o render usa alfa 1 também com `congelamento > 0` (`Vigilia.update`) e não reescreve `xAnt`/`yAnt`.
- **Feedback:** o consumidor do anel é `EfeitosDaVigilia.feedback` (contadores de aparo, esquiva perfeita e ação negada), lido por `FeedbackDaInterface` (`cenas/feedback.ts`) no `Hud.update`, com `performance.now()` como tempo de render; o flash é um `Graphics` branco cheio com `setAlpha` por quadro (alfa 0,35, 2 quadros, até 3 por segundo; `?flash=segurar` o mantém). Sons sintetizados saem pelo `sound.destination` (masterMuteNode) e só tocam com o contexto `running`; o limite de vozes não usa `onended` (a voz acaba pelo relógio). A pausa faz `setMute(true)` e o Continuar `setMute(!opcoes.som)`.
- **HUD:** barra de stamina de 119 × 10 pt abaixo da barra de XP, à direita (laranja abaixo de 25, marca a cada 25), e o botão Aparo. Som e Flashes ficam lado a lado numa linha acima de "números" e encolhem juntos em área segura estreita (`(util − 16) / 2`, mínimo 72). Com topo 59 e baixo 34 (Dynamic Island) a linha fica em y 546 e o corte de 65% é 547,15: 1,15 pt abaixo (divergência 16); com 47/34 (o caso da D6) sobram 3 pt.
- **Câmera lenta do tutorial** (`nucleo/cameraLenta.ts`): escala do `deltaMs` por 500 ms de tempo real, disparada em `Vigilia.aoStep` na transição aguardando → visível do prompt de esquiva; não dispara sob o `avancar` do debug.

## 6. Tutoriais, cenários e debug

- **Tutoriais:** `TUTORIAL` = { mover 1, esquiva 2, aparo 4 }, `TODOS_OS_TUTORIAIS` = 7; cada prompt nasce `cumprido` se o bit está em `tutoriaisVistos`. Os prompts nascem em `ataques.ts` (1º telegrafo de Oco Grande ou de Noviça), cumprem em `jogador.ts` (esquiva aceita) e `aparo.ts` (sucesso).
- **Cenários:** o bit `CENARIO.ataques` (8) é **desligado por padrão**; a Vigília de produção o liga (`Vigilia.ts` sem `?cenario`) e `PRODUCAO` (`tests/logica/apoio.ts`) o repete nas referências que a Playwright confere. Receitas novas: `oco_grande_sozinho`, `novica_sozinha`, `horda_com_ataques` e `telegrafos`; as sete antigas não mudaram. A `telegrafos` (Oco Grande, 2 Noviças, Facas nv1, jogador invulnerável) existe só para a captura `telegrafos-390x844.png`: a D6 pedia "novica_sozinha + Grande + Facas por parâmetros", que a URL não alcança (divergência 13). O Vitest acha o passo (cunha a ≤ 6 passos do golpe, faixa, projétil de Sal e faca a ≥ 40 px do jogador) e o grava em `referencia-f006.json`.
- **Debug:** `?inicio=MM:SS` e `?visto=`; `__GAME_DEBUG__` completo (stamina, esquiva, aparo, prompts, `flash`, `entrada.roteiro(lista, acoes?)`, telemetria local de esquiva). `NOMES_DOS_EVENTOS` é exportado de `debug.ts` e `EventoDebug` ganha `contra` e `extra` (4º float: desfecho do `golpeInimigo`). Eventos 11 a 21, `FORMA` 7 e 8 e `FLAG.contra` = 8 só crescem no fim.
- **Importação de JSON:** `tabela.ts` importa `combate.json` com o atributo `with { type: 'json' }`: o `f001.spec.ts` importa `estado.ts` pelo Node (Playwright) e o ESM do Node exige o atributo.

## 7. Referências para a Playwright

Gravadas pelo Vitest com `VDC_EVIDENCIAS=1`, na seed 1: `.verify/referencia-f001.json`, `-horda.json`, `-f004.json`, `-tres-armas.json`, `-f005.json`, `-uniao.json` (tabela do §1) e a nova `-f006.json`, com o roteiro do vídeo (esquiva no passo 302, aparo no 417, fim no 490) e as marcas Node × Chromium por (passo, congelamento), não por total de passos. A referência da 1ª morte (`tests/logica/armas/referencias.test.ts`) passou a rodar com `PRODUCAO`, para bater com a Vigília que a Playwright abre.

## 8. Testes, medidas e calibrações

- **Vitest:** 1.312 testes em 69 arquivos (eram 917 no ADR-0007). `tests/logica/combate/` (esquiva, aparo, Contra-ataque, congelamento, stamina, telegrafo, janelas, regressão v5, estado v6, referências), `tests/entrada/tradutor.test.ts` e os de render e HUD.
- **Alocação** (`tests/cenas/alocacao.test.ts`, HeapProfiler a 64 B, ≤ 16 B por passo, sem lista branca):
  - E4 e E6 antigos, agora com o escritor da 2ª camada de médios e as camadas novas: horda 14,9 B por passo; 3 armas 13,9 a 14,2 (o ADR-0007 deixou 14,4); render do mundo com 512 pickups e 20 ondas, 3,0 por quadro; União da F-005, 8,2; render dos ataques com 30 telegrafos e 19 projéteis vivos, 2,8 por quadro.
  - **E7a** (`horda_com_ataques` com a build do `tres_armas`, jogador **vulnerável** e parado, render dos ataques): 0 a 8,7 B por passo em 3 rodadas.
  - **E7b** (a mesma com a União aos 10:00, Lâmina e roteiro cíclico de aparo a cada 40 passos e esquiva 20 passos depois, a mira girando): 1,5 a 2,5 B por passo; a variante com `tutoriaisVistos` = 0 (prompt de aparo visível, `falhasDeAparo` e janela de 17), 6,2 a 6,4.
  - **1.000 Contra-ataques** em sequência (`caSeq` posto à mão, Vigília sem horda), depois de 10.000 de aquecimento: 0 B no total (limite 64). Com 3.000 de aquecimento, 376 a 1.120 B, de getters de import do Vitest.
  - **Cobertura afirmada pelo anel de eventos** (o leitor roda dentro do laço medido): E7a ≥ 1 `telegrafo`, `golpeInimigo` e `projetilLancado`; E7b mais `esquiva`, `esquivaPerfeita`, `aparo` e `contraAtaque` (e, na variante com tutorial, `aparoFalho` ou `aparoVazio`); `perdidos` = 0.
  - **Aquecimento: 63.000 passos** (começou em 9.000). Com 9.000 a 36.000 o E7a mede 17 a 22 B (o caminho de nascer ainda no interpretador) e o E7b, com a esquiva movendo o jogador, 1.400 a 5.500 B (`moverHorda`, `golpear`, `salvaDeFacas` e `rodarAtaques` desotimizadas por ramos novos: "insufficient type feedback" no `--trace-deopt`, e o V8 leva milhares de passos para reotimizar). Com 54.000 o E7b ainda perdeu uma janela; com 63.000 e 72.000, duas rodadas iguais passaram. É o JIT do V8, não o código (mesmo diagnóstico do ADR-0007 §8). A medida é determinística no contêiner, mas qualquer mudança em função quente pode pedir novo aquecimento.
  - **O que o HeapProfiler achou, e foi para dentro de linha:** `tickExtraDaAura`, a função que o Contra-ataque chamava uma vez por aparo, nunca esquentava e guardava cada double como objeto: 58 B por passo no E7b. O tick extra passou para dentro de `rodarAura`, em **duas passadas pelo mesmo laço** (a 0 é o tick natural, a 1 o extra com dano × 2 e `FLAG.contra`); um 2º laço copiado deixava `rodarAura` grande demais para o V8 inlinar em `rodarArmas` e fazia o E6 antigo medir 84 B por passo (a tier-up da função só vinha lá pelo passo 15.000). A ordem passou a ser tick, extra, pulso (era tick, pulso, extra): só difere no passo em que o pulso do nv7 coincide com o Contra-ataque, e nenhum teste ou referência passa por ele. Sem lista branca nem gate novo.
  - **Mutação:** um `new Float32Array(2)` no Contra-ataque mede 208 B por Contra-ataque e reprova o teste de 1.000.
- **Simulação de 20 min** (`scripts/sim20.ts`, agora com ataques ligados; rodada pelo Vitest com config externo, porque o `tsx` não está instalado: `vitest run -c <config>` com `globals`, um teste que importa `simular`; ≈ 195 s; só medida, sem gate). Níveis aos 5/10/15/20 min (entre parênteses, o ADR-0007 §8, seed 1) e o DPS da janela de cada marco:
  - seed 1, parado 9/12/12/12 (8/8/8/9), DPS 73/280/450/625; em círculo 2/6/18/27 (3/4/13/25), DPS 1/133/575/1.509; caçando 14/25/32/37 (14/23/31/35), DPS 162/542/912/1.552;
  - seeds 2 e 3 na mesma faixa: parado 14 e 13 ao final (DPS 590 e 574), círculo 27 e 27 (1.453 e 1.275), caçando 36 e 37 (1.548 e 1.558);
  - Espada nv8 + Elmo: caçando aos 6:53, 9:28 e 7:32 (seeds 1 a 3); em círculo aos 14:44, 16:51 e 16:29; parado nunca;
  - caçando, o pool de Cinzas chega a 512; parado, 1.531 a 1.790 junções.
  Os médios atacando ficam em telegrafo e recuperação e deixam de perseguir, então a horda assenta e o jogador parado sobe mais de nível do que na F-005 (12 contra 9 aos 20 min). O nível segue quase só o quanto o jogador anda.
- **Volume de eventos** (`horda_com_ataques`, jogador parado, sem armas, janelas de 3.000 passos): 0,81, 0,79 e 0,74 por passo (≈ 45 por segundo): ≈ 0,29 `telegrafo`, 0,21 `projetilLancado` e 0,29 `golpeInimigo`. Ao vivo o anel (1.024 entradas) é lido a cada quadro (no máximo 5 passos) e não transborda. Com `avancar(n)` acima de ≈ 1.300 passos num cenário com médios o anel é sobrescrito: os specs e testes que procuram `aparo` ou `telegrafo` leem em passos curtos, e nenhum deduz contagem de eventos de uma janela longa.
- **Playwright** (`e2e/f006.spec.ts`: F-006.5, .6 e .8; Node × Chromium) e as seis evidências olhadas. Nos specs antigos: `f002-evidencias` lê o deslize antes da captura (no contêiner a captura leva quase 1 s de jogo, ≈ 100 px a mais depois das camadas novas); `f003` desconta o botão Aparo e trata os médios como acima de qualquer Oco das Lanternas (a 2ª camada); os arrastos de f002, f002-evidencias e f005 em passos lentos (§2).
- **Desempenho:** nenhum gate de tempo novo; nada otimizado pelo contêiner. O F-003.4 (E1) continua na `horda` sem ataques e o `desempenho-30s.json` foi regravado pelo verify. O custo da fase 6 e do 2º escritor com `horda_com_ataques` (E1 e E2) não ganhou limite.
- **verify.sh, seed 1:** F-006 a F-001, um por vez, todos verdes (typecheck, lint, Vitest, builds, Playwright e as evidências); as evidências de cada feature foram regravadas pelo verify da própria feature e commitadas.

## 9. Divergências

Do ADR-0002:

1. **§3, câmera lenta do tutorial:** escala do `deltaMs` por 500 ms de tempo real (15 passos de jogo), não "1 passo a cada k quadros" (daria 0,25 a 30 fps); e o congelamento lê-se com `passo` parado (FB1, FB5).
2. **§4, nomes dos campos de ataque:** `estado`/`timerEstado` viram `ataqueFase`/`ataqueTimer`; `alvoAtaque` não é usado (o alvo é sempre o jogador; guarda-se a mira); não há `mundo3`; o registro do jogador fica em duas partes (`jogador3`, como o `JOGADOR2` da F-005).
3. **§14 (estende):** o bit `ataques`, desligado por padrão e ligado só na produção e nas receitas novas, com as receitas antigas inalteradas e `PRODUCAO` nas referências da Vigília de produção; a guarda de `relogio_inicial` só vale para `?inicio` (também D5 §5 e §7).

Das D3, D4 e D5:

4. **D3 §3, resolução do acerto no jogador antes de `danoAoJogador`**, que segue o único caminho do HP.
5. **D3 §9, enraizamento durante os ataques** (Oco Grande e Noviça) e o bloqueio S4 pelo jogador mantido na fase da horda durante os i-frames; a esquiva atravessa a horda só nos i-frames (passos 2 a 13), não "nas duas fases".
6. **D4 §4, ADR-0006 §1 e ADR-0007 §1, a ordem do passo:** fase 0 de congelamento, fase 6 de ataques entre os pickups e o contato, e o decremento do Poder depois das armas.
7. **D4 P5 e P6 e `e2e/f004.spec.ts:210`, a pausa com Som e Flashes** lado a lado.
8. **D5 §9, as duas tabelas de dano vivo** (sem e com o Poder) no lugar do recálculo na entrada e na saída; refeitas nos mesmos eventos raros, inclusive a cópia do buffer e `sincronizarDerivados` (na carga do save da F-008).

De B, do brief e das perguntas:

9. **B §3.6 e Q-15:** gatilho do Oco Grande a 80 px e enraizado; alcance de tiro da Noviça (192 px); contato do atordoado (o Oco atordoado não fere); uma esquiva perfeita por esquiva; prompts por evento (1º telegrafo), não por relógio; a seta de telegrafo fora da vista fica fora da F-006 (brief §5.12).
10. **B §3.4:** a stamina tem teto 100 também na devolução do aparo (`min(100, antes − 15 + 30)`).
11. **Documentos 11, 13, 02 e 03:** o branco de tela inteira e o som no lugar do rastro de brasas e do "sopro" (doc 11 §1, §4 e §5; doc 13 §2.2); sem aperto de câmera; cunha com alfa de 0,10 a 0,40 e não branco puro (doc 13 §1.3); o "inspirar" do telegrafo fora (doc 02 §5.4); Contra-ataque sem os "1,5 s" (doc 03 §2.3).
12. **`feature_list.json`:** o "como" dos 12 critérios F-006.1 a F-006.12 foi reescrito; a descrição e o critério de B ficam. As seis evidências no lugar das duas de B.

Da implementação, sem decisão prévia (notas das Etapas 2a a 2g):

13. **Receita `telegrafos`** (nova, só para a captura), em vez de "novica_sozinha + Grande + Facas por parâmetros".
14. **`criarOnda(e, codigo, fatorContra = 0)`:** parâmetro novo com padrão 0, para os testes antigos chamarem sem o fator.
15. **Conflito RE5 × RE7 da cunha:** o indício sólido dos últimos 11 passos faz o "0,40 no último passo" da RE5 valer só até `ataqueTimer = 12` na cunha (§5).
16. **Pausa com a Dynamic Island:** a linha de Som e Flashes fica a 1,15 pt abaixo do corte de 65% (topo 59 e baixo 34); com 47/34 sobram 3 pt. Se a medida no iPhone pedir, vale o plano da D6 (3 alvos na linha de "números").
17. **`ORIGEM_DO_DANO` e `DESFECHO`** como constantes de `contato.ts`; o campo `forma` dos eventos 14 e 19 não é `FORMA` (origem e ação).
18. **Alcance de tiro da Noviça** (`alcance_de_tiro_novica_corpos`), `postura_quebrada.dano_pct` e `contra_ataque_fator` entram em `combate.json`: números que nenhum JSON tinha.
19. **`inimigo.schema.json`:** `pendencias` deixa de ser obrigatório (o Coroado ainda tem `pendentes` da F-008) e `postura_quebrada` é obrigatório (Coroado `false`, provisório).
20. **Aquecimento de 63.000 passos** nos E7 (a D6 pedia começar em 9.000 e subir) e tick extra da aura dentro de `rodarAura`, na ordem tick, extra, pulso (§8).
21. **Duas molduras no atlas** (`estrela`, `anel_pequeno`) e `blend` por membro na `SaidaDeSprites`.
22. **Os médios são "camada medio" por `moldura === 'quadrado'`**, o que inclui o `elite` da F-008.

Do processo:

23. **Quatro commits da Etapa 2e** (`a00706b`, `8d10198`, `c1d799a` e `2b93b17`) saíram com um trailer de atribuição diferente do dos demais da branch. Já estavam enviados e reescrevê-los exigiria reescrever o histórico de uma branch publicada; ficam registrados aqui.
24. **Commits acima de ~300 linhas** (inserções + remoções, na Etapa 2): `ee2291f` 475, `4f7a207` 514, `af4e1d3` 395, `75c3e04` 1.067, `1ee87e8` 517, `c744719` 955, `643cf19` 1.608, `a00706b` 510, `8d10198` 984, `1e2de7e` 680, `5556d15` 386 e `64caeb2` 538. A maior parte é teste e dado gerado; os commits da Etapa 2g ficaram em até ~160.
25. **Desvio de formato:** o ADR-0008 não repete as tabelas de `design/decisoes-F-006.md` §0.A; os identificadores (ST, ES, GE, EP, FB, AP, PQ, CA, OG, NV, RE, TU, ET, VT) remetem a ela.

## 10. Crítico independente

Nota **8,0**, sem achado bloqueante (na F-005 foi 7, com 3 bloqueantes). Foram 81 mutações no código da simulação e do tradutor, cada uma aplicada, com os testes afetados rodados e desfeita em seguida. Achados (nenhum bloqueante ou alto), todos aplicados como testes abaixo: três médios — o golpe poderia ligar `invulContato` sem teste que notasse (mutação 74), nenhum teste provava que o aparo é ignorado durante o aparo falho (24) e a ameaça do Oco Grande fora do arco não era testada (29); baixos — o limite exato de 400 pt/s e o rearme do swipe (59, 60), o swipe fora do modo vigília (65), o `max` do atraso no aparo (09, 10) e um laço de teste sem teto (33).

- **Reprovadas pelos testes que já existiam:** a maior parte das 81.
- **Sobreviventes, todas viradas em teste** (cada teste novo reprova com a mutação aplicada e passa sem ela, conferido aplicando e desfazendo):
  - **74** (o golpe ou o projétil ligando `invulContato`): golpe e projétil com `invulContato` = 0 antes deixam 0 depois (OG7), em `ataques.test.ts`;
  - **24** (aparo aceito durante o aparo falho): `aparoEm(P0 + 10)` não muda a stamina nem a janela (AP8);
  - **29** (ameaça do Oco Grande sem o teste do arco): jogador a 60 px atrás do eixo da mira, dentro do alcance, toque = vazio;
  - **31** (Noviça em telegrafo contando como ameaça): Noviça em telegrafo colada no jogador e nenhum projétil, toque = vazio;
  - **59** (limite de 400 pt/s com ms inteiros dentro da janela de 100 ms: 32 pt em 80 ms, 30 em 75 e 40 em 100 não disparam; 33 em 80 e 41 em 100 disparam), **60** (rearme quando a velocidade cai a 400 pt/s ou menos com amostras ainda na janela, em 250 e em 400 pt/s exatos), **65** (swipe do dono que já existe com o modo trocado direto para pausa ou modal não gera ação) e **E2** (a amostra a 101 ms já saiu da janela: 50 pt não disparam; a 99 e a 100 ms disparam), em `tradutor.test.ts`;
  - **09** e **10** (`max` do atraso de regeneração no aparo falho e no gasto do aparo): com `esperaRegen` = 100 injetado antes, o falho e o gasto o deixam em 100 (D6 ST2);
  - **33** (travou a suíte): `avancar` parado deixava laços `while` sem teto nos testes de combate (e no `ateOPasso`). Foi criado `laco()` em `tests/logica/combate/apoio.ts`, que lança passado um teto de 20.000 voltas, e aplicado a todos os `while` sem guarda (tutoriais, congelamento, referências, aparo, ataques). Com `avancar` retornando 0 sempre, 184 testes reprovam em segundos com "laço sem fim", em vez de travar.
- **Equivalentes** (nenhum teste pode distinguir):
  - **18** (Postura Quebrada sem o `cancelarAtaque` em `aparo.ts`): o laço de `rodarAtaques` (`ataques.ts`, `quebradaPassos > 0`) repete o cancelamento no passo seguinte, antes de qualquer leitura da fase do ataque;
  - **27** (regeneração sem o `Math.min` do teto): a regeneração só roda com `stamina < 100`, e a stamina vive numa grade de 0,5 (custos 15 e 25, devolução 30, regeneração 0,5), então `stamina + 0,5` nunca passa de 100;
  - **69** (esquiva com o aparo no mesmo passo): o crítico a deu como equivalente; **não é**. Com stamina 14,5 o aparo é negado e, sem a trava, a esquiva também seria negada e gravaria um 2º evento 19. Virou o teste "os dois bits com stamina 14,5" (`aparo.test.ts`), que reprova a mutação. Com o aparo aceito a trava é de fato redundante (`aparoJanela` > 0 já bloqueia a esquiva);
  - **73** (`ameacasAparaveis` zerado no início de `rodarAtaques`): o contador é reescrito no fim da mesma função, sem retorno antecipado e sem leitura entre os dois pontos; a decisão do falho (fase 2 do passo seguinte) lê o valor final.
- **Inconclusivas:** **E7** (Oco atordoado continuando a perseguir) e **71** (Espada com intervalo −1, que a rodada não conseguiu aplicar ao código). Ficam registradas, sem teste novo.
- **Vitest ao final:** 1.322 testes em 69 arquivos (eram 1.312 antes do crítico; +10: 3 em `ataques.test.ts`, 3 em `aparo.test.ts` e 4 em `tradutor.test.ts`). Os 5 commits do crítico ficaram em até ~300 linhas.

## Divergência da D2 §4: suavização da direção do joystick (2026-10-12)

Pedido do usuário depois do teste no iPhone ("andando reto, uma virada pequena do dedo vira o personagem bruscamente"). Perto da zona morta radial (0,15) a curva linear faz um desvio pequeno do dedo girar muito o ângulo, e a direção mudava num único quadro (o mesmo `dirX`/`dirY` mira as armas). O `TradutorDeGestos` passa a limitar o giro da direção do vetor de movimento a 540°/s do relógio do quadro (`GIRO_MAX_GRAUS_S`), mantendo o módulo da curva da D2 §4. Vale de imediato: partindo do repouso (vetor nulo, inclusive ao voltar da zona morta), sem relógio (`agora` NaN) e na reversão acima de 150° (`REVERSAO_IMEDIATA_GRAUS`), porque uma inversão quase total é intenção (esquivar, reagir), e esperar 1/3 s custaria a ação. Quadro de 0 ms não gira. A mudança é só no tradutor: a simulação, os ComandosDoPasso (formato) e o replay não mudam; o swipe da F-006 também não. O teclado de debug não é suavizado. Constantes junto do joystick, não em `combate.json`, para não mexer nos dados da simulação.
