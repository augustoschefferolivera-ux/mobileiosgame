# progress.md

## Sessão 9 — F-008 "Horas, marcos e Fogueira", F-009 "O Lanterneiro, Amanhecer e A Fome" e F-010 "Santuário mínimo e PWA"

### Estado: F-008, F-009 e F-010 prontas (aguardam a revisão do usuário); F-010.5 pendente de aparelho (roteiro em `docs/roteiro-iphone.md`)

Branch `claude/clever-galileo-26bjed`, a partir de `origin/claude/f006-esquiva-weodg1` (fim da F-007, `e2ee1e5`). A sessão da arte (Sessão 8, F-011) trabalhou ao mesmo tempo na mesma branch: cada envio foi feito depois de `git pull --rebase`, sem force-push, e nenhum arquivo da arte foi editado aqui. Pedido do usuário: as três features em ordem, com economia máxima de tokens (subagentes com esforço médio, briefs curtos, um crítico por feature com nota mínima 7, `verify.sh` completo uma vez por feature).

- [x] **Etapa 1, decisões das três features:** `design/decisoes-F-008.md` (D8, 39 decisões, 7 divergências), `design/decisoes-F-009.md` (D9, 39 decisões, 5 divergências) e `design/decisoes-F-010.md` (D10, 54 decisões, 4 divergências), cada uma escrita por um subagente, com uma revisão curta das três (21 achados, todos aplicados: contas, divergências sem marca, negrito de ênfase, coerência do layout v8 → v9 → v10 e do meta). Aprovadas pelo usuário sem veto em 2026-10-12 ("Aprovo tudo, pode seguir com a F-008").

### F-008 (pronta)
- [x] **Etapa 2** em três partes: 2a, estado v8 (76.788 B, o v7 intacto nos primeiros 74.680), Coroado (Patada, Grito, ciclo fixo, convocação, HP de marco, baú e Cinza), corpos grandes, arena, marcos e marco vencido pelo relógio; 2b, Fogueira (Descansar, Forjar, Partir, sair do raio, ignorada, Hora III às 20:00, cópia-sombra) e save `vigilia` versionado com migrações, autosave na Fogueira e a cada 60 s e FIM atômico; 2c, menu da Fogueira, retomada no Acender com Recusar em 2 toques, relógio no HUD, cenário `fogueira_hora1`, `e2e/f008.spec.ts` e as evidências. Decisões técnicas e 35 divergências em `docs/decisoes/ADR-0010-implementacao-da-f008.md`.
- [x] **Crítico independente:** nota **8,0**, sem bloqueante; 107 mutações, 69 mortas, 38 sobreviventes (6 lacunas médias e as baixas viraram teste; correções no save: o `vigilia` só é apagado com o meta gravado de fato, e o resumo do envelope vem do mesmo passo da sombra). ADR-0010 §10.
- [x] **Correções da verificação:** o hash do estado conta `idVigilia` como zero (o navegador reserva o id no meta e o Node usa 0; os hashes do Node não mudaram; ADR-0010 §9, itens 34 e 35); specs F-002.3 e do tutorial da F-006 sem depender do save nem da lentidão do WebGL por software; o teste de determinismo do `sim20` com prazo explícito de 60 s (não é gate); a conta de memória do F-001 com os membros das estruturas e do chefe; textos do resumo da retomada e do Partir.
- [x] `scripts/verify.sh --feature F-008 --taps-game --seed 1` verde (typecheck, lint, Vitest 2.068, builds, Playwright 71 e as evidências), já com o código da F-009 na árvore; F-001 a F-007 e F-011 verdes na mesma rodada. Evidências em `production/evidencias/F-008/` (retomada.webm, save.json, acender-retomada, fogueira, coroado-arena, coroado-grito e u7.log), conferidas a olho.
- Determinismo (layout novo, então hashes novos; ADR-0010 §1): passo 1.000 seed 1 `54256399`, seed 424242 `6d4078d9`; regressão v7 nos bytes do layout anterior.

### F-009 (pronta)
- [x] **Etapa 2** em três partes: 2a, estado v9 (76.868 B, o v8 intacto nos primeiros 76.788), o Lanterneiro (HP por nível, Postura com Quebra de 3 s e Postura Firme −40%, 3 fases com transição invulnerável em 60% e 25%, os 7 ataques brancos e vermelhos, Fúria aos 5 min, arena com névoa), migração do save 8 → 9; 2b, A Fome (dreno de HP a cada 10 passos a partir das 23:00, fim `a_fome` sem APAGANDO), Amanhecer (600 passos, Almas ×1,5 e 1 Brasa), Resultado com "Chefe mais longe" e "Brasas", meta v2 com migração 1 → 2; 2c, barras de HP e Postura, telegrafos e zonas do chefe, véu de A Fome e céu do Amanhecer em formas simples, cenário `lanterneiro`, `e2e/f009.spec.ts` e as evidências. Decisões técnicas e divergências em `docs/decisoes/ADR-0011-implementacao-da-f009.md`.
- [x] **Crítico independente:** nota **7,8**, sem bloqueante; 114 mutações, 85 mortas, 29 sobreviventes (10 equivalentes, 19 lacunas; as relevantes viraram 11 testes). `bruto` e `tickNoJogador` sem double por argumento; `Math.floor` da salva de facas trocado por divisão exata (deopt por "lost precision"). ADR-0011 §14.
- [x] `scripts/verify.sh --feature F-009 --taps-game --seed 1` verde (Vitest 2.228, Playwright 79 e as evidências), com o código da F-010 já na árvore; F-001 a F-008 e F-011 verdes na mesma rodada. Evidências em `production/evidencias/F-009/` conferidas a olho (chefe, A Fome, Amanhecer e os dois Resultados).
- Determinismo: passo 1.000 seed 1 `115fd0ca`, seed 424242 `3b1e2566`; regressão v8.
- **Para o usuário decidir:** o Abandonar da pausa também vale em A Fome e no Amanhecer (ADR-0011 §9, item 8); a luta corpo a corpo mata o chefe em 77 s contra o alvo de 120 a 180 s do doc 06 (balanceamento, `u9.log`).
- **Fica registrado:** a alocação da luta fica em 7,5 B/passo com o aquecimento usual de 150.000 passos, mas sobe com aquecimentos maiores (90 B com 250.000), por desotimizações do V8 em caminhos que só rodam tarde na luta (`salvaDeFacas`, `golpear`, `limitarPelaArena`); medir no aparelho (ADR-0011 §14). Quatro commits da 2a passaram de 300 linhas (549, 653, 508 e 526), já enviados.

### F-010 (pronta; F-010.5 pendente de aparelho)
- [x] **Etapa 2** em três partes: 2a, Fundação (8 nós, custo pela fórmula, compra e reembolso puros, recusas sem débito), estado v10 (76.872 B, o v9 intacto nos primeiros 76.868: os 4 ranks que a simulação lê), meta v3 com migrações 1 → 2 → 3 e a garantia de 300 Almas, degradação no `ComandosDoPasso` (vai para o replay); 2b, cena do Santuário (Iselda, árvore 2 × 4, compra e reembolso em 2 toques, convite "Adicionar à Tela de Início"), fluxo Acender → Santuário → Vigília → Resultado → Santuário, balão das Cinzas, pausa automática (visibilitychange, pagehide, blur, áudio interrompido, paisagem) com o APAGANDO concluindo com o mesmo hash, overlay de paisagem, manifest e service worker, `persist()` em standalone, degradação no render, lint de strings com `lint.txt`; 2c, `e2e/f010.spec.ts`, as capturas, `ritmo.txt`, o `verify.sh` aceitando de forma explícita só as 3 evidências do iPhone como pendentes e `docs/roteiro-iphone.md`. Decisões técnicas e divergências em `docs/decisoes/ADR-0012-implementacao-da-f010.md`.
- [x] **Crítico independente:** nota **7,0**; 90 mutações, 70 mortas, 20 sobreviventes (4 equivalentes). O bloqueante (o `verify.sh` chamava `npm run`, palavra do glossário) foi corrigido; os médios viraram código e teste (overlay de fps por Hora e `recargas` no debug, que faltavam; o `verify.sh` aceita o vídeo do iPhone gravado fora; testes da degradação ao vivo, da pausa automática gravando o `andamento` e do Fôlego no level-up). ADR-0012 §10.
- [x] `scripts/verify.sh --feature F-010 --taps-game --seed 1` verde (Vitest 2.247, Playwright 79, 3 evidências PEND do iPhone); F-001 a F-009 e F-011 verdes na mesma rodada. Capturas em `production/evidencias/F-010/` conferidas a olho.
- Determinismo: passo de referência seed 1 `29725375`, seed 424242 `1776801d`; regressão v9; o `nivel_tres` da F-005 regravado (`03aa58dd`/`fbf64c69`, só o layout).
- **Corrigido na implementação:** HP com Fôlego 182 (rank 5) e 156 (rank 1), e a árvore inteira custa 7.852 Almas; a D10 dizia 188, 158 e 7.851 e foi alinhada (ADR-0012 §9).
- **Para o usuário avaliar:** o balão das Cinzas aparece no primeiro Apagar mesmo com 0 Almas, quando não há mancha (o texto fala da mancha); a fala de Iselda, o balão e o convite são textos provisórios até o roteiro.

### Pendente de aparelho / para revisar
- F-010.5: o roteiro de 6 passos em `docs/roteiro-iphone.md` (iPhone 11 ou 12 e 14+, Hora IV com ≥ 55 fps, 3 Vigílias sem recarga da aba, memória no Web Inspector); os vídeos e a captura entram em `production/evidencias/F-010/` com os nomes do `feature_list.json`.
- F-009: a luta do chefe e o véu de A Fome no OLED; a alocação da luta em sessões longas no JavaScriptCore.
- Gravação no Safari real (cota do `localStorage` com o `vigilia` em base64), retomada depois de jetsam de verdade, botões da Fogueira de 72 pt e o véu do escurecimento em OLED.

## Sessão 8 — F-011 "Arte do jogo (até a F-007)"

### Estado: F-011 pronta (aguarda o teste no iPhone, itens A1 a A12 do roteiro); style card aprovado ("Aprovo o style card, pode seguir para a etapa 2") e produção aprovada ao pedir as etapas 3 e 4 ("Faça a etapa 3 e 4 por favor"), 2026-10-12

Branch `claude/clever-galileo-26bjed`, criada de `origin/claude/f006-esquiva-weodg1`. Pedido do usuário (2026-10-12): arte 100% por código (grade de índices da paleta do doc 13 e efeitos procedurais), personagem 24 × 24, o resto do menor tamanho que funcione, muitos detalhes de efeitos e de armas, só apresentação, em 4 etapas com parada para aprovação ao fim da 1 e da 2.

- [x] **Etapa 1, pesquisa e style card:** `design/arte/style-card.md` (pesquisa com fontes, paleta de 32, luz, contorno, escala de cada coisa, efeitos, animação, checagem automática e as decisões E1 a E8 para aprovar) e as 3 amostras em PNG (`design/arte/amostra-1-paleta-e-aldric.png`, `amostra-2-modelos.png`, `amostra-3-cena-390x844.png`). F-011 registrada no `feature_list.json` (11 critérios e 7 evidências).
- [x] **Base de código da arte:** `src/arte/` (paleta, rasterizador, procedurais e os modelos: Aldric, Oco das Lanternas, Oco Grande, Noviça de Sal, Alma, baús, ícone da espada), `scripts/arte/` (amostras e prévia, rodando o TypeScript pelo Vite: `node scripts/arte/rodar.mjs amostras`) e `tests/arte/arte.test.ts` (paleta, contorno fechado, tamanhos, cor quente nos inimigos). A checagem já pegou um defeito real: o pomo da espada sem contorno.
- [x] **Etapa 2, produção da arte de tudo até a F-007** (só apresentação: simulação, layout do estado e hashes intactos):
  - **modelos em grade:** Aldric 24 × 24 (parado, andar, agachado, rolando, aparo, Frasco, ajoelhado no Apagar), Oco das Lanternas 16 × 16, Oco Grande e Noviça de Sal 24 × 24 (andar, telegrafo, ataque e acerto), Oco Grande Coroado 32 × 32 (o elite da F-008, que chegou à branch durante a produção e quebrava a cena sem desenho), Alma, baús, cristais, rochas, chão em ladrilho e os 9 ícones das armas e passivas;
  - **efeitos:** faca em 16 direções, arco do golpe (ida, volta e forte, 2 quadros), estocada, onda, grãos e pulso do Círculo, cunha do telegrafo com silhueta branca, projéteis de Sal, marcadores de Atordoado e de Sal, cinza das mortes em 3 quadros, partículas (faíscas do acerto, cinza da morte, anel do aparo, brasas do Frasco e do Apagar) num pool fixo de 256, rastro da esquiva e a luz da brasa;
  - **render:** `src/arte/catalogo.ts` → atlas 1024 (NEAREST depois do `refresh`), quadro por passo da simulação (pausado, a imagem só depende do estado), inimigos virados para o jogador, GPU e Image idênticos no pixel; HUD em pixel (joystick, Aparo, Frasco, pausa), Aldric respirando no Acender e a mancha com anel, Alma e seta;
  - **testes:** `tests/arte/` (paleta, contorno fechado, tamanhos, linha dos pés, cor quente, cor de identidade no centro, atlas) e `tests/cenas/` (465 verdes, alocação ≤ 16 B por passo); `e2e/f011.spec.ts` grava as 6 capturas 390 × 844 em `production/evidencias/F-011/`, e `tests/arte/folhas.test.ts` a folha de todas as molduras.
  - **branch compartilhada:** outra sessão faz a F-008 na mesma branch; cada envio foi rebaseado sobre o dela, e os conflitos em `src/cenas/render/horda.ts` mantiveram o `COR_DOS_ELITES` e o molde provisório dela, com a arte do Coroado por cima. Decisões da produção no style card §11.
- [x] **Etapa 3, revisão de consistência:** subagente independente (só leitura) comparou as molduras com o style card pela folha, pelas capturas e pelas grades; 8 divergências, cada uma conferida antes de corrigir. Aplicadas 7: o passo do Aldric (o corpo desce 1 px nos quadros de contato), as dobras contínuas do Oco das Lanternas, o fio Y do golpe, rachaduras em D e o musgo em capa nas rochas, a luz da brasa mais forte (alfa 18 a 110) e as vagas e as Almas legíveis sobre a horda. Não aplicada: baixar o alfa da cunha sólida do telegrafo (é o sinal da janela do aparo, decisoes-F-006 RE5); vai para o iPhone. Registro em `design/arte/revisao-F-011.md`.
- [x] **Etapa 4, teste em jogo:** as 6 capturas 390 × 844 regeradas e conferidas uma a uma (resultado no mesmo registro); itens A1 a A12 da arte no `docs/roteiro-iphone.md`; o teste do `feature_list.json` passou a aceitar features de fora do B §4 (a F-011 quebrava os 4 testes dele desde a etapa 1, pego só agora pelo Vitest completo); `scripts/verify.sh --feature F-011 --taps-game --seed 1` **verde** (Vitest 2.014/2.014, Playwright 67/67, as 7 evidências da F-011). Foram 3 rodadas: a 1ª pegou a divergência Node × Chromium do `idVigilia` (da F-008, corrigida pela outra sessão); a 2ª, três defeitos da arte, corrigidos e registrados em `design/arte/revisao-F-011.md` (o aviso do telegrafo sumia sob acerto, a faísca do acerto cobria o centro do corpo, e as camadas da GPU desenhavam a capacidade inteira: a horda no WebGL por software caiu a 29 passos/s, e o heap da F-003, o gesto da F-004 e o arrasto da F-002 falhavam por tempo; agora 46 passos/s, acima dos 42 de antes da arte).
- [x] **Depois do Pronto (2026-10-13):** a espada do Aldric saiu de todos os quadros, a pedido do usuário ("na arte do personagem principal tem uma espada parece, pode tirar ela?"); no aparo, os punhos erguidos em guarda ao lado do visor. Checagem da arte, testes do render e as capturas da F-011 regerados e verdes; o ícone da Espada Longa do Juramento (a arma) continua.

## Sessão 7 — F-007 "HP, Frascos, armadura, Apagar e Cinzas Perdidas"

### Estado: F-007 pronta (aguarda a revisão do usuário); F-008 não começada

- [x] **Etapa 1, decisões:** `design/decisoes-F-007.md` (D7), com revisão adversarial (12 achados, nota 8 antes das correções). Aprovada pelo usuário sem veto em 2026-10-12 ("Concordo com tudo que me trouxe").
- [x] **Etapa 2, implementação:** estado v7 (74.680 B, o v6 intacto nos primeiros 74.636), dano líquido com armadura e Brasa Firme, Frasco (3 cargas, 40% em 120 passos, interrompível), Apagar (APAGANDO de 30 passos, câmera lenta, tela de Resultado), Abandonar em 2 toques (Almas ×0,5, sem mancha), mancha das Cinzas Perdidas (30% das Almas, posição e Hora, reaparece e devolve), save meta mínimo (`vdc.meta`), telemetria `frasco` e `dano_recebido`, HUD de HP e de Almas, pausa com estatísticas. Decisões técnicas e 20 divergências em `docs/decisoes/ADR-0009-implementacao-da-f007.md`.
- [x] **Crítico independente:** nota **8,0**, sem bloqueante; 88 mutações, 77 reprovadas, 11 sobreviventes (4 equivalentes e 7 lacunas, todas viraram teste). Aplicados: pausa legível (Hud escondida, painel opaco, "Mortes causadas"), critério F-007.6 e AG8 alinhados ao código, `f002-evidencias` robusto, `pontoLivreMaisProximo` sem doubles e E7c com a mancha. Não aplicado: o Abandonar pelo fluxo de comandos (B3). Detalhes no ADR-0009 §10.
- [x] `scripts/verify.sh --feature F-007 --taps-game --seed 1` verde (typecheck, lint, Vitest, builds, Playwright e evidências); F-001 a F-006 intactas. Evidências em `production/evidencias/F-007/`.

## Backlog do usuário (teste no iPhone, 2026-10-12)

- "Tá muito bom o resultado até agora."
- **Bug de movimento no joystick:** andando reto, uma virada pequena do dedo vira o personagem bruscamente. Investigar o vetor do joystick (zona morta radial 0,15, curva linear, sem suavização; D2 §4) e a mira das armas pela última direção.
- **Bug de movimento no joystick: feito.** Causa: perto da zona morta (0,15) um desvio pequeno do dedo gira muito o ângulo do vetor, e a direção (que também mira as armas) mudava num único quadro. O tradutor agora limita o giro da direção a 540°/s de tempo real do quadro (`GIRO_MAX_GRAUS_S`, `src/entrada/joystick.ts`), com o módulo intacto; vale de imediato partindo do repouso e na reversão acima de 150°. Fora da simulação (replay e hashes não mudam).
- **Esquiva por movimento rápido do joystick (swipe): removida (2026-10-13).** "Muito ruim de controlar"; a esquiva fica no toque duplo (e Espaço no debug), texto do tutorial atualizado. ADR-0012 §9.
- **Passar por cima dos mobs:** em aberto. Hoje o jogador é bloqueado pelos inimigos (D3 S4) e só os atravessa nos i-frames da esquiva (D6 ES7). O usuário ainda vai decidir.
- **Gráficos:** plano em `design/arte/plano-de-arte.md` (100% por IA em código; personagem 24×24, os outros do menor ao maior que der; sessão própria com pesquisa, style card, produção, revisão de consistência e teste no iPhone).

## Sessão 6 — F-006 "Stamina, esquiva e aparo"

### Estado: F-006 pronta (aguarda a revisão do usuário); F-007 não começada

- [x] Leitura: este arquivo (Sessão 5 e Retomada), ADR-0007, `design/decisoes-F-005.md` §9 e a entrada da F-006. Branch `claude/f006-esquiva-weodg1`, a partir do fim da F-005 (`bc999b3`); `verify.sh --feature F-005 --taps-game --seed 1` verde no início.
- [x] **Etapa 1, decisões:** `design/decisoes-F-006.md` (aqui, D6). Levantamento com 4 pesquisadores, cada um com verificador cético, e um crítico de completude (99 perguntas mais 49 dos verificadores; 17 conflitos entre áreas resolvidos); revisão adversarial com 3 lentes, cada uma com verificador (65 achados: 32 confirmados, 31 ajustados e 2 refutados; aplicados, D6 §12). Todos os agentes em Sonnet com esforço médio. D6 aprovada sem veto (2026-10-12, "Aprovo, mas precisamos economizar tokens"). `feature_list.json` recebeu o "como" dos F-006.1 a F-006.12, as seis evidências e as pendências resolvidas.
- [x] **Etapa 2, implementação** (`bc999b3..HEAD`):
  - **simulação:** estado v6 (74.636 B, o v5 intacto nos primeiros 67.488): stamina (custos, regeneração com atraso, teto 100), esquiva de 80 px em 21 passos com i-frames nos passos 2 a 13 e esquiva perfeita (congelamento de 5 passos, Poder +15% por 120 passos, faca extra); aparo (janela de 11 passos, +6 com o prompt e 2 falhas, falho de 24 passos, vazio, Postura Quebrada em área, Contra-ataque por arma); ataques dos inimigos (golpe em arco do Oco Grande, projétil de Sal da Noviça, Sal no jogador); resolução única do acerto no jogador (aparo > i-frames > dano); ordem do passo v6 com o congelamento na fase 0 e os ataques na fase 6;
  - **entrada:** `ComandosDoPasso` com `acoes` e `mira`; swipe do dedo do joystick e toque duplo no tradutor; botão Aparo; Espaço no teclado de debug; borda consumida na fonte ao vivo;
  - **render:** médios em 2ª camada, telegrafos (cunha e faixa), projéteis de Sal, flash branco de 2 quadros, barra de stamina, botão Aparo, Som e Flashes lado a lado, câmera lenta do tutorial, prompts de esquiva e aparo, sons sintetizados;
  - **dados:** `combate.json` e schema; receitas `oco_grande_sozinho`, `novica_sozinha`, `horda_com_ataques` e `telegrafos`; atlas com `estrela` e `anel_pequeno`;
  - **testes:** 1.322 no Vitest (eram 917; esquiva, aparo, Contra-ataque, congelamento, telegrafo, estado v6, regressão v5, referências, tradutor, alocação E7a/E7b e as mutações do crítico) e 52 na Playwright (`e2e/f006.spec.ts`: F-006.5, .6 e .8, Node × Chromium);
  - **decisões técnicas** em `docs/decisoes/ADR-0008-implementacao-da-f006.md`, com as divergências (§9).
- [x] `scripts/verify.sh --feature F-006 --taps-game --seed 1` verde (typecheck, lint, Vitest, builds, Playwright e as evidências); F-001 a F-005 também verdes, uma por vez, com as evidências regravadas pelo verify da própria feature.
- [x] Evidências em `production/evidencias/F-006/`: `esquiva-e-aparo.webm` (vídeo de 10 s, esquiva no passo 302, aparo no 417), `janelas.log`, `esquiva-perfeita-390x844.png`, `telegrafos-390x844.png`, `tutorial-esquiva-390x844.png` e `tutorial-aparo-390x844.png`.
- [x] Determinismo (seed 1; o layout mudou, então os hashes mudaram; ADR-0008 §1): passo 1.000 `f39dd6b4` → `c052c6c9` (seed 424242: `7c1b6c0c` → `6ddd6d39`); `nivel_tres` `2aa5a85f`/`e776db53` → `ca1c0824`/`286ca680`; 1ª morte parada `51d4c5cd` → `741c1990` (só o layout; com os ataques da produção, `3b6ee2e8`); F-001.11 `f39dd6b4` → `fa024a61`; `horda` 1.800 `9ceef9c5` → `1b64832e`; `tres_armas` 601 `6acdb6e2` → `82e929e9`; `bau_uniao` `9e6a33ae`/`472f3e31` → `32848ffd`/`369426c6`. A regressão v5 confere os bytes 4 a 67.488 bit a bit contra o código de `bc999b3`. Replay de 1 passo e de 5 por quadro dá o mesmo hash com ataques ligados. Node e Chromium batem nas 5 marcas do vídeo.
- [x] Crítico independente: nota **8,0**, sem bloqueante (a F-005 teve 7, com 3 bloqueantes). 81 mutações; os 3 achados médios e os baixos aplicados; as sobreviventes (74, 24, 29, 31, 59, 60, 65, 09, 10, E2) viraram testes que as reprovam, a 33 travava a suíte (laços `while` sem teto nos testes de combate; agora `laco()` em `tests/logica/combate/apoio.ts`), a 69 virou teste (o crítico a dera como equivalente), 18, 27 e 73 são equivalentes e E7 e 71 ficaram inconclusivas (ADR-0008 §10). Vitest: 1.322 testes.

### Decidido nesta sessão (técnico; detalhes no ADR-0008)
- **Estado v6** cresce no fim do buffer (nada nos bytes reservados nem nas palavras do cabeçalho); nenhum fluxo novo de RNG; ordem do passo com o congelamento na fase 0 e os ataques na fase 6 (ADR-0008 §1).
- **Bit `CENARIO.ataques`** desligado por padrão: só a Vigília de produção e as receitas novas o ligam, e as receitas antigas ficam intactas; `PRODUCAO` nas referências que a Playwright confere.
- **Alocação:** tudo dentro de linha; o tick extra do Contra-ataque foi para dentro de `rodarAura` (duas passadas pelo mesmo laço); aquecimento de 63.000 passos nos testes E7 (é o JIT do V8, não o código); nenhum gate de tempo novo.
- **Commits acima de ~300 linhas na Etapa 2** (inserções + remoções; a maior parte é teste e dado gerado): `ee2291f` 475, `4f7a207` 514, `af4e1d3` 395, `75c3e04` 1.067, `1ee87e8` 517, `c744719` 955, `643cf19` 1.608, `a00706b` 510, `8d10198` 984, `1e2de7e` 680, `5556d15` 386 e `64caeb2` 538 (12 no total, já enviados).
- **Trailer de atribuição:** quatro commits da Etapa 2e (`a00706b`, `8d10198`, `c1d799a` e `2b93b17`) saíram com um trailer diferente do dos demais; já estavam enviados e reescrevê-los exigiria reescrever o histórico de uma branch publicada (ADR-0008 §9, item 23).
- **Divergências** do ADR-0002, das D3 a D5 e do `feature_list.json` em ADR-0008 §9 (25 itens).

### Pendente de aparelho / para revisar
- Os mesmos itens de aparelho da Sessão 5, mais os sons sintetizados da F-006 e o corte do Som e Flashes com Dynamic Island (1,15 pt abaixo do corte de 65%; ADR-0008 §9, item 16).
- O determinismo só foi medido no V8; o JavaScriptCore será conferido no aparelho.

## Sessão 5 — F-005 "XP, level up, passivas e União"

### Estado: F-005 pronta (aguarda a revisão do usuário); F-006 não começada

- [x] Leitura: este arquivo (Sessão 4 e Retomada), ADR-0006, `design/decisoes-F-004.md` (§9) e a entrada da F-005. Branch `claude/f005-xp-h2tbzf`, a partir do fim da F-004 (`9271b10`); `verify.sh --feature F-004` verde no início.
- [x] **Etapa 1, decisões:** `design/decisoes-F-005.md` (aqui, D5), com levantamento (4 pesquisadores, cada um com verificador cético, e um crítico de completude), revisão adversarial (fidelidade, técnica e completude, cada uma com verificador; achados aplicados na §11) e a §0 para veto. O usuário aprovou tudo sem veto ("Aprovo todas as sugestões").
- [x] **Etapa 2, implementação** (`9271b10..HEAD`):
  - **simulação:** estado v5 (67.488 B, o v4 intacto nos primeiros 42.988): progressão, hpMax, atributos, 6 passivas, oferta, fila de 4 baús, pool de 512 pickups e de 64 ondas; Cinzas com Ímã, voo, coleta e junção; curva ⌈XP(n)⌉, +1 FOR (teto 20) e +2 HP por nível; dano vivo recalculado (FOR e Poder); oferta de 3 cartas (60%, Elmo com 35% de piso depois das 12:00, Bolsa); baú 1/3/5 e a União depois das 10:00; Lâmina com onda de chão; fila de modais com `confirmarModal` fora do passo e `avancar` parando no modal;
  - **cenas:** cena Modal (3 cartas, seleção e confirmação por dois toques, baú com Continuar), tradutor no modo `modal`, HUD com barra de XP, nível e 12 vagas com ícones, pausa com as passivas, camada GPU "mundo" (obstáculos, Cinzas e baús), ondas na camada das armas, `__GAME_DEBUG__` da D5 §8, telemetria `level_up` e `arma_uniao`;
  - **dados:** `progressao.json` e schema, Aldric com HP por nível e teto de FOR, receitas `nivel_tres`, `bau_uniao` e `vigilia_sem_cinzas`;
  - **testes:** 917 no Vitest (XP, oferta, baú, União e onda, regressão v4, referências, E6 com Cinzas e União, HUD, camada do mundo, cores R3, `sim20`) e 40 na Playwright (2 da F-005);
  - **`scripts/sim20.ts`:** a simulação de 20 min como medida, sem gate;
  - **decisões técnicas** em `docs/decisoes/ADR-0007-implementacao-da-f005.md`, com as divergências (§9).
- [x] `scripts/verify.sh --feature F-005 --taps-game --seed 1` verde: typecheck, lint, Vitest (917), builds, Playwright (40) e as evidências; F-001 a F-004 também verdes, com as evidências regeradas.
- [x] Evidências em `production/evidencias/F-005/`: `modal-390x844.png` (a 1ª oferta do `nivel_tres` com a carta do meio selecionada) e `uniao-390x844.png` (o `bau_uniao` no passo 285, com a Lâmina, a onda e os números). As das F-001 a F-004 foram regeradas (HUD novo, painel descido e camada do mundo).
- [x] Determinismo: a seed 1 dá `f39dd6b4` no passo 1.000 e a 424242 `7c1b6c0c` (eram `901adb6d` e `9cdc2c63`; o layout mudou). No Node e no Chromium também batem o `nivel_tres` depois das duas cartas (`e776db53`), o 1º golpe da Lâmina (passo 28, `9e6a33ae`) e a captura da União (passo 285, `472f3e31`). A regressão v4 confere os campos antigos bit a bit.
- [x] Crítico independente (Q-33): nota **7**, condicionada a 3 achados bloqueantes, todos aplicados; sem bug de código confirmado. Das 87 mutações, 24 sobreviveram; todas viraram testes que agora as reprovam (ADR-0007 §10). O maior: a seleção e a confirmação do modal saíram da cena para `src/cenas/escolhaDoModal.ts`, testável sem Phaser. Vitest: 917 testes.

### Decidido nesta sessão (técnico; detalhes no ADR-0007)
- **E6 com Cinzas e União parado, com XP trazida pelo teste:** andando, a subida de nível desotimiza funções antigas em ciclos (é o JIT); parado, com 27.000 passos de aquecimento, 10,7 a 11,5 B por passo. A `criarOnda` lê cada Float32 uma vez (de ≈ 10 para ≈ 5 B por passo).
- **Specs antigos:** a Vigília normal parada abre o modal no passo 723; os que passam de 600 passos usam `vigilia_sem_cinzas`. O gpu × image da horda aceita ±1 na borda dos obstáculos, que agora vão pela camada do mundo.
- **Commits:** sete commits passaram de ~300 linhas (309 a 470) e já estavam enviados; ficam registrados no ADR-0007 §9. Os seguintes ficaram em até ~300.
- **Lint ignora `.claude/`:** as worktrees dos agentes quebravam o parser do TypeScript.
- **Desempenho:** nenhum gate de tempo novo.

## Sessão 4 — F-004 "Armas automáticas"

### Estado: F-004 pronta (aguarda a revisão do usuário); F-005 não começada

- [x] Leitura: este arquivo, ADR-0005, `design/decisoes-F-003.md` (§9) e a entrada da F-004 no `feature_list.json`. Branch `claude/f004-armas`, a partir do fim da F-003 (`aad3094`).
- [x] **Etapa 1, decisões:** `design/decisoes-F-004.md` (aqui, D4).
  - Levantamento: 4 pesquisadores (armas, alvos e geometria; dano, níveis, Sal, knockback e morte; feedback, números, pausa e debug; estado, ordem do passo, projéteis, TETO, cenários, desempenho e testes), cada um com um verificador cético, e um crítico de completude: 148 perguntas, 13 já respondidas pelos documentos; 8 contradições resolvidas no lugar de cada uma.
  - Revisão adversarial: 55 achados, 52 confirmados e aplicados, 3 refutados com o motivo (D4 §11).
  - A §0 lista para veto rápido as decisões delegadas (W1 a W18, DN1 a DN3, S1, K1, M1 a M4, N1 a N8, V1 a V7, P1 a P9, E1 a E7). O que é de outras features ficou como recomendação (§9), registrada nas pendências das F-005 a F-010.
- [x] **Etapa 2, implementação** (`aad3094..HEAD`, 46 commits de até ~300 linhas; os maiores, de 302 a 308, são um arquivo só cada: o teste das Facas e o spec da F-004):
  - **simulação:** estado v4 (42.988 B: build de 5 vagas, `mortes`, `projeteisRecusados`, Sal e knockback nos inimigos, pool de 400 projéteis), tabela de armas e dano por (arma, nível) no boot, Espada (setor, ida e volta, estocada), Facas (salva em ciclo pelos candidatos, voo, perfuração, limite 200/400 pelo TETO), Círculo (tick de 30 passos, pulso com knockback), Sal (maior fator e maior duração), mortes em slot crescente, anel de eventos de 1.024 fora do buffer e só escrito pela simulação; o caminho de nascer da F-003 adequado à regra do laço quente, bit a bit igual (regressão v3);
  - **render:** 5 camadas GPU (mortes, horda, status, armas, dígitos), cada uma com preparo puro e plano B `image`; números de dano com fonte pixel 5 × 7 bicolor, agregação e pool de 96 com recusa; golpe em brasa, facas, anel da aura e marcador de Sal em sal; morte com a forma do tipo;
  - **pausa:** botão de 72 pt, gesto de dois dedos parados por 500 ms, tela de pausa (build, opção de números, Continuar), fora do estado e dos `ComandosDoPasso`; o joystick só volta com um toque novo;
  - **plataforma:** sonda do TETO na Tela de Acender e cache `vdc.teto`; `?sonda=0`; cenário `tres_armas`; painel do debug a safe-area + 76 pt;
  - **`__GAME_DEBUG__`:** build, números de dano, últimos eventos, eventos perdidos, mortes, pausa, opções, recusados de números e mortes; só no debug, `projeteis()` e `inimigos()` com HP, Sal e knockback;
  - **testes:** 735 no Vitest (tabela de dano, Espada, Facas, Círculo, estado, F-004.1 com a tabela de evidência, regressão v3, referências, render e preparo do desenho das armas, alocação E6, sonda, tradutor e alvos da pausa, lint de `.ativos` e do anel, pares de cor da V6) e 38 na Playwright (8 da F-004);
  - **decisões técnicas** em `docs/decisoes/ADR-0006-implementacao-da-f004.md`, com as 16 divergências (§9).
- [x] `scripts/verify.sh --feature F-004 --taps-game --seed 1` verde:
  - typecheck, lint, Vitest (735 testes), builds de produção e de debug;
  - Playwright `taps-game` (38 testes: 10 da F-001, 12 da F-002, 8 da F-003 e 8 da F-004);
  - evidências conferidas; a regra nova aceita o `.md` só com `aprovado: true`.
- [x] Evidências em `production/evidencias/F-004/`: `tres-armas-390x844.png` (cenário `tres_armas`, passo 601, com a estocada, as facas em voo, o anel da aura, o Sal e os números) e `tabela-de-dano.md` (as três armas, níveis 1 a 8, esperado × obtido, `aprovado: true`). As evidências das F-002 e F-003 foram regeradas, agora com o botão de pausa na tela.
- [x] Determinismo: a seed 1 dá `901adb6d` no passo 1.000 (com a Espada da build inicial), no Node e no Chromium; a 424242 dá `9cdc2c63`. Também iguais nos dois motores: a 1ª morte da Vigília normal parada (passo 433, `86aa5388`), o `tres_armas` no passo 601 (`5628633f`) e o cenário horda no 1.800 (`6767ce88`).
- [x] Crítico independente (Q-33): nota **7**, sem bug no código e sem bloqueante. Das 43 mutações que ele fez, 10 sobreviveram; todas viraram testes que agora as reprovam (ADR-0006 §10):
  - S1 testado pelo `acertar`, e não à mão (o achado alto);
  - M1 na aura e na salva; bordas exatas da W3 na estocada e na faca; W11 com divisão desigual;
  - a consulta das armas à grade contra a força bruta, e a aura na costura em y;
  - o preparo do desenho das armas (anel, faca, cunha, estocada, pulso, marcador de Sal) e a caixa da opção da pausa lida no pixel;
  - regra de lint contra ler o anel por apelido, desestruturação ou views;
  - os baixos: o F-004.5 mais estrito, `recusados.efeitos` no debug, a Noviça salgada e o HP acerto a acerto no F-004.1.

### Decidido nesta sessão (técnico; detalhes no ADR-0006)
- **Laço quente também no que roda pouco:** uma função chamada uma vez por golpe ou por spawn fica no interpretador do V8 e aloca HeapNumber. Entradas e saídas por rascunhos `Float64Array`, dano no boot e 9.000 passos de aquecimento no E6: de ≈ 270 para ≈ 13 B por passo, com o mesmo hash.
- **gpu × image das armas:** os membros translúcidos (dígitos no fade, estocada, facas) diferem em ±1 num canal entre o `SpriteGPULayer` e o `Image`, também por software (0,5% dos pixels); o spec aceita ≤ 1 em ≤ 1%. A horda opaca continua byte a byte.
- **F-004.6 na Playwright:** o CDP do Chromium não solta um dedo só; os testes que precisam disso usam `TouchEvent` sintético no canvas, o mesmo caminho da camada de toque. O teste de 300 ms confere o tempo que a página viu.
- **Desempenho:** nenhum gate de tempo novo (pedido do usuário).

### Ratificado pelo usuário (2026-10-11: "Por mim, concordo com tudo que decidi até agora [...] as outras decisões que você escolheu, eu concordo")
- As decisões delegadas da §0 de D4 e as recomendações da §9 para as F-005 a F-010.
- Desempenho: não otimizar pelo contêiner, que roda o WebGL por software; a medida que vale é a do aparelho.

## Sessão 3 — F-003 "Hordas"

### Estado: F-003 pronta

- [x] Leitura: este arquivo, ADR-0004, `design/decisoes-F-002.md` (sobretudo a §9) e a entrada da F-003 no `feature_list.json`. Antes de começar, `scripts/verify.sh --feature F-002 --taps-game --seed 1` verde. Branch `claude/f003-hordas`, a partir de `claude/clever-galileo-26bjed`.
- [x] **Etapa 1, decisões:** `design/decisoes-F-003.md` (aqui, D3).
  - Levantamento: 4 pesquisadores (física da horda; diretor e spawn; contato, jogador e estado; render, debug e desempenho), cada um com um verificador cético, e um crítico de completude: 127 perguntas, 20 já respondidas pelos documentos.
  - Revisão adversarial: 3 lentes, cada uma com um verificador (notas 7, 7 e 6,5 antes das correções); 61 achados, 57 confirmados e aplicados (D3 §11), entre eles um que mudou o código: os laços por inimigo alocavam ≈ 48 KB por passo no V8.
  - A §0 lista para veto rápido as decisões delegadas (S1 a S8, K1 a K3, R1 a R9, M1, T1 a T3, V1 a V4, E1 a E4). O que é de outras features ficou como recomendação (§9), registrada nas pendências das F-004 a F-010 no `feature_list.json`.
- [x] **Etapa 2, implementação** (`96ab615..HEAD`, ≈ 30 commits de até ~300 linhas; os maiores: 341 linhas, que são um arquivo de teste só, o do diretor, e 318, o spec da F-003):
  - **simulação:** estado v3 (TETO, cenário, linha fixa, rotação, HP e timer de contato, pool de 500 SoA), grade de 64 px, pool com pilha de livres e lista densa, tipos de inimigo, timeline compilada, diretor (reposição até o mínimo, conversão de excedente, janela antes dos marcos, garantidos, anel com viés de 60% e busca de ponto livre), separação Jacobi limitada pela velocidade, inimigos sólidos para o jogador (regra simétrica), obstáculos por célula, contato com 18 passos de invulnerabilidade, rotação do cenário, verificação de NaN no `?debug=1`;
  - **plataforma:** `decidirTeto` com as 5 camadas, receitas de cenário (`horda`, `horda_rotativa`, `sem_horda`), parâmetros `?teto`, `?render`, `?buffer`, `?cenario`, `?debug`, painel do debug;
  - **render:** `SpriteGPULayer` com escrita direta no buffer de instâncias (stride 42), plano B `?render=image`, `?buffer=dinamico`, aquecimento na Acender, limpeza do que o `preDestroy` não libera, cores dos inimigos (Noviça em #8994b4);
  - **`__GAME_DEBUG__`:** vivos pelo pool, convertidos, diretor, teto, cenário, render, webgl, `quadrosContados`, HP; só no debug, `quadros()`, `inimigos()`, `hashPorSecao()` e `removerInimigo()`;
  - **testes:** 563 no Vitest (contorno S8, contato, diretor, anel, horda, F-003.11 com o `SpriteGPULayer` real, cores, alocação E4, determinismo com a horda) e 30 na Playwright (8 da F-003; as F-001 e F-002 passam a usar `?cenario=sem_horda`);
  - **decisões técnicas** em `docs/decisoes/ADR-0005-implementacao-da-f003.md`, com as 11 divergências do ADR-0002 (§8).
- [x] `scripts/verify.sh --feature F-003 --taps-game --seed 1` verde:
  - typecheck, lint, Vitest (563 testes), builds de produção e de debug;
  - Playwright `taps-game` (30 testes: 10 da F-001, 12 da F-002 e 8 da F-003);
  - evidências conferidas, com o aviso "fps não conferido: WebGL por software".
- [x] `scripts/verify.sh --feature F-002 --taps-game --seed 1` continua verde.
- [x] Evidências em `production/evidencias/F-003/`: `debug-300-vivos-390x844.png` (passo 1.800 do cenário horda, pausado), `heap-60s.json` (Δ de 2,8 KB e no máximo 13 nós por grupo em 60 s, com 570 liberações; limites de 32 KiB e 100) e `desempenho-30s.json` (300 vivos nas 30 leituras; p95 de um passo + p95 do resto até `PRE_RENDER` = 4,3 ms com CPU 4×; 4 draw calls; fps não conferido).
- [x] Determinismo: a seed 1 dá `e91ed119` no passo 1.000 com a horda e o diretor, no Node e no Chromium (`&teto=300`); a 424242 dá `6173ca75`. O cenário horda (300 vivos) também dá o mesmo hash nos dois motores no passo 1.800.
- [x] Crítico independente (Q-33): nota **8**, sem bloqueante nem alto. Os 4 achados médios e os baixos (menos o tamanho de 4 commits, de 301 a 341 linhas) foram aplicados (ADR-0005 §9):
  - teste de que os convertidos contam 10 em vivosEq;
  - teste da separação contra a força bruta (a visita da grade fica em linha);
  - spec da queda para `image` sem unidade de textura no vertex shader, e o texto corrigido (uma falha ao ligar o programa não é tratada);
  - fps médio pelo tempo real da janela;
  - hash Node × Chromium também no cenário horda, no passo 1.800.

### Decidido nesta sessão (técnico; detalhes no ADR-0005)
- **Laço quente:** nenhum double atravessa uma chamada fora de linha nos laços por inimigo; a colisão lê e escreve num `Float64Array` (`COLISAO`). De ≈ 48 KB para ≈ 9 B por passo no V8, com o mesmo hash.
- **Aquecimento do teste de heap: 90 s** (os 30 s de D3 não bastavam no contêiner: os metadados do JIT do V8 ainda cresciam ≈ 270 nós no minuto seguinte). Limites mantidos depois de 3 rodadas.
- **F-003.4 neste contêiner:** o WebGL é o SwiftShader; o teste confere sempre a CPU (p95 de um passo + p95 do resto até `PRE_RENDER` < 10 ms, com 300 vivos e CPU 4×) e registra "fps não conferido". O F-003.4 literal (fps ≥ 55) fica pendente de um desktop com GPU ou do build de teste do iPhone (F-006, Q-29).
- **Teste de contorno:** os 52 casos chegam; o campo de fluxo não foi implementado.

### Ratificado pelo usuário (2026-10-11: "Por mim, concordo com tudo que decidi até agora")
- As decisões delegadas da §0 de D3 e as 11 divergências do ADR-0002 (ADR-0005 §8).
- O F-003.4 literal (fps ≥ 55) fica como medida pendente do build de teste no aparelho (F-006, Q-29); o usuário espera que o iPhone seja mais fluido que o contêiner, que só tem WebGL por software. A parte de CPU que dá para medir aqui usa ≈ 4 de 10 ms por quadro com CPU 4×.

## Sessão 2 — F-002 "Movimento e mapa"

### Estado: F-002 pronta

- [x] Leitura: este arquivo, ADR-0003, `design/decisoes-F-002.md` (D) e a entrada da F-002 no `feature_list.json`. Antes de começar, `scripts/verify.sh --feature F-001 --taps-game` verde.
- [x] Implementação, em commits de até ~300 linhas (`1b93b8d..HEAD`):
  - **dados:** schema da região (só círculo, 64/80/96, centro no toro, `inicio_jogador`), 54 obstáculos na Charneca (6/7/5, 8/4/6, 5/7/6; a tela do início com 4), início em (585, 1.266); saíram as pendências "se os obstáculos bloqueiam" de `armas.json` e `inimigos.json`;
  - **simulação** (`src/logica`): toro (normalização Float32, delta, interpolação, cópia mais próxima), colisão de um círculo contra os obstáculos com deslize e desempate, estado v2 (registro do jogador, tutoriais vistos e impressão da disposição no cabeçalho), `ComandosDoPasso` com fonte ao vivo e roteiro por passo absoluto, movimento a 2,4 px por passo e o prompt de mover;
  - **entrada** (`src/entrada`): vetor do joystick (zona morta radial 0,15, raio 60 pt, curva linear), área do joystick na tabela de alvos, fila de toques em Float64Array, TradutorDeGestos (5 dedos, dono até soltar, reconciliação por `e.touches`), caixa do canvas em cache, mouse e teclado só no debug;
  - **cenas** (`src/cenas`): atlas no Boot, render do mundo por `Image` atrás da interface do `SpriteGPULayer` (F-003), câmera no jogador arredondada a 0,5 pt, cena Hud com o joystick e o prompt "Deslize para mover", `?tutorial=0`, só WebGL;
  - **`__GAME_DEBUG__`:** `jogador`, `camera`, `entrada.joystick`, `toquesPerdidos` e, só no debug, `entrada.injetar` e `entrada.roteiro`;
  - **decisões técnicas** em `docs/decisoes/ADR-0004-implementacao-da-f002.md`; o gerador da disposição em `scripts/gerar-disposicao.py` (`--conferir` reproduz o JSON).
- [x] `scripts/verify.sh --feature F-002 --taps-game --seed 1` verde:
  - typecheck, lint, Vitest (362 testes), builds de produção e de debug;
  - Playwright `taps-game` (22 testes: 10 da F-001 e 12 da F-002);
  - evidências conferidas.
- [x] Evidências em `production/evidencias/F-002/`:
  - `movimento.webm` (≈ 18 s, 390 × 844, roteiro de D §8);
  - `movimento-1/2/3-390x844.png`;
  - `mapa-585x1266.png`, o mapa 3 × 3 para revisão, que entrou na lista de evidências da F-002.
- [x] Determinismo: o teste passa a rodar o roteiro `ROTEIRO_REFERENCIA` (movimento, deslize e as duas costuras). A seed 1 dá `3510977e` no passo 1.000, no Node e no Chromium; a evidência da F-001 foi regenerada com esse hash.
- [x] Revisão independente (Q-33):
  - 1ª rodada, 3 lentes: simulação **8**, entrada e render **8**, fidelidade e cobertura **9**. Os achados foram conferidos e aplicados:
    - desempate com tolerância (corpos presos numa reta 2:1);
    - colisão também parado, infinito como parada;
    - testes da costura em y e do passo 0;
    - reconciliação no `touchstart`;
    - jogador no pixel da câmera, só WebGL;
    - mouse de debug pela janela;
    - gerador versionado e documentação;
  - crítico final, sobre o estado corrigido: nota **8,5**, sem bloqueante. Os achados dele também foram aplicados: testes que travam a zona morta radial, o arredondamento da câmera, a cópia mais próxima no render e os números T1, mais a reconciliação exata no `touchstart`.

### Decidido nesta sessão (técnico; detalhes no ADR-0004)
- **Leituras de D que precisaram de detalhe:**
  - a tangente "nula" do desempate vale até 1e-3 × |mov|;
  - o corredor da regra 6 é a faixa varrida pelo corpo do jogador;
  - restrição a mais na disposição: o 1º obstáculo depois da costura é o do deslize, em (230, 1.278);
  - o "anel de 64 eventos" é uma fila linear esvaziada a cada frame.
- **O mapa 3 × 3 virou a 5ª evidência da F-002:** assim o `verify.sh` confere que ele é regenerado.
- **`?render=gpu|image` fica para a F-003,** junto com a 2ª implementação do render.

### Decididos por delegação do usuário (2026-10-11: "Pode resolver o que listou acima da melhor maneira que encontrar")
- **Ratificados como estão:**
  - a tolerância do desempate (1e-3 × |mov|);
  - a restrição a mais na disposição (o 1º obstáculo depois da costura é o do deslize);
  - o mapa 3 × 3 como 5ª evidência da F-002.
- **Commit de 317 linhas (`0b4cc0b`):** o histórico fica como está, sem reescrita, como na F-001. Os demais commits têm até 296.
- **Só WebGL:** fica, porque o tint é só WebGL e o WebGL 1 e 2 existe em todo hardware iOS desde o Safari 15 (wiki da Khronos). Sem contexto, agora aparece o aviso `A8.SISTEMA.SEM_WEBGL` no lugar do canvas, em vez de uma página vazia. É um texto novo no `pt-BR.json`, coberto por teste da Playwright com `--disable-webgl`.
- **Riscos do iPhone** (detalhes e fontes no ADR-0004 §9):
  - **5 dedos:** é o limite do iPhone (o iPad tem 11), e um 6º dedo cancela os outros, o que o `touchcancel` já trata. `__GAME_DEBUG__.entrada.maxToques` confirma no aparelho em uma leitura;
  - **fim de toque engolido:** coberto pelo `touchcancel`, por `visibilitychange`/`pagehide`/`blur` e pela reconciliação no toque seguinte. Fica para medir se a Central de Controle dispara `blur`;
  - **joystick perto da borda e zona morta sem histerese:** ficam como B e D mandam, para reavaliar no build de teste do iPhone (Q-29). Perto da borda esquerda, o movimento para a esquerda é mais lento (com o dedo a 30 pt da borda, 41%);
  - **caixa do canvas mudando no meio de um arrasto:** não acontece na Vigília: as barras do Safari só encolhem com rolagem, que está bloqueada, e a rotação pausa (F-010).

## Sessão 1 — brief, arquitetura e lista de features

### Estado: F-001 pronta

- [x] GDD copiado de `docs/` (branch `claude/ecstatic-sagan-g9k3x6`, commit `62872cc`) para `design/gdd/`, sem alterações.
- [x] Leitura na ordem pedida: 18, 00, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13 §1.2; 01, 14 e 17 §4 para nomes e IDs. Os docs 09, 15 e 16 não foram lidos.
- [x] `design/game-brief.md` (v2) escrito e revisado: 5 revisores independentes (números, escopo, glossário, lacunas, features), cada um com um verificador cético; os achados confirmados foram aplicados.
- [x] Brief aprovado pelo usuário em 2026-10-10, com todas as recomendações da §11 (Q-00 a Q-35). Os itens da §11.3 continuam em aberto, por feature.
- [x] Etapa 2: `docs/decisoes/ADR-0001-stack.md` (registra a decisão já tomada) e `docs/decisoes/ADR-0002-arquitetura-da-simulacao.md` (v2). Antes, pesquisa técnica (4 investigações: render da horda, loop e escala, input e áudio, Worker/TETO/determinismo) e revisão adversarial (3 lentes + verificadores; 48 achados confirmados e aplicados).
- [x] ADR-0002 aprovado pelo usuário em 2026-10-10, com todas as recomendações da §15 (item 10: opção A).
- [x] Etapa 3: `feature_list.json` (escopo, critério e evidência literais de B §4 + 99 critérios verificáveis), `src/dados/schemas/` (10 schemas), dados do MVP em `src/dados/` (com `pendentes`/`pendencias` para cada número em aberto), `src/dados/textos/pt-BR.json` (147 textos) e `tests/dados.test.ts` (40 testes; verificado por mutação). Antes, revisão adversarial (3 lentes + verificadores; 39 achados confirmados e aplicados).
- [x] Etapa 3 aprovada pelo usuário em 2026-10-11, inclusive as [proposta de teste] e [proposta a aprovar] do feature_list.
- [x] Etapa 4: F-001 "Esqueleto e loop".
  - `scripts/verify.sh --feature F-001 --seed 1 --taps-game` verde, com estas etapas:
    - typecheck do projeto e de `src/logica` sem DOM nem Node;
    - lint;
    - Vitest (198 testes);
    - builds de produção e de debug;
    - Playwright no projeto taps-game (10 testes);
    - conferência do conteúdo das evidências.
  - Evidências em `production/evidencias/F-001/`: `screenshot-390x844.png` e `determinismo.log`. A seed 1 dá o hash `faad4a1f` no passo 1.000, no Node e no Chromium.
  - Crítico independente (subagente, Q-33):
    - 1ª rodada: nota **7,5**, com revisão adversarial (4 lentes, cada uma com um verificador cético; 28 achados confirmados e 16 refutados);
    - 2ª rodada, sobre o estado corrigido: nota **8,2**, sem bloqueante. Os ajustes que ela apontou também foram aplicados (touchend, teto de 6 passos, import dinâmico, `100dvh`, `bitmapText`, caixa do toque);
    - os achados confirmados da 1ª rodada foram aplicados em 8 commits pequenos, entre eles:
    - o nosso desbloqueio de áudio passou a ser o único caminho;
    - lint de textos mais forte;
    - `tsconfig.logica.json`;
    - driver testável;
    - contexto WebGL sem MSAA;
    - Playwright mais forte (safe-area emulada via CDP, contrato do `__GAME_DEBUG__`).
  - Decisões técnicas em `docs/decisoes/ADR-0003-implementacao-da-f001.md`.
  - Skills do Phaser lidas de novo para a F-001: game-setup-and-config, scale-and-responsive, scenes, audio-and-sound, além de trechos de time-and-timers, text-and-bitmaptext, cameras e input-keyboard-mouse-touch. Também o código-fonte de Game.js, TimeStep.js, WebAudioSoundManager.js, BaseSoundManager.js, Config.js e WebGLRenderer.js.

### Decididos por delegação do usuário (2026-10-11: "Deixo a decisão por você")
- **Commits acima de ~300 linhas:** o histórico fica como está, sem reescrita. O limite vale daqui em diante.
- **Flag de autoplay:** fica `--autoplay-policy=document-user-activation-required`, como no ADR-0002 §12 e no F-001.4 corrigidos.
- **`A8.SISTEMA.TITULO` e o layout provisório do botão de Acender (288 × 72 pt):** ficam até a arte, depois da F-010.
- **As pendências da F-002:** decididas em `design/decisoes-F-002.md`.
  - Antes, um levantamento: 4 pesquisadores, 4 verificadores e um crítico de completude; 71 perguntas, 17 já respondidas pelos documentos.
  - Depois, uma revisão adversarial do documento: 29 achados confirmados e aplicados.
  - A §0 do documento lista, para veto rápido, as decisões de design e de número tomadas por delegação ([delegada]).
  - O que pertence a outras features ficou como recomendação (§9), registrada nas pendências de cada feature no `feature_list.json`.

### Itens que estavam para ratificar (F-001; decididos acima)
- **Commits acima de ~300 linhas:** 5 dos primeiros commits da F-001 (bfbfddc, a390393, bb83f78, b3b4fc3, cc8f097) têm de 443 a 595 linhas, sem contar o lockfile. Os commits de correção ficaram dentro do limite. O histórico já foi enviado e não foi reescrito; das próximas features em diante, um commit por módulo + teste.
- **Artefatos aprovados alterados:**
  - ADR-0002 §12 e o "como" da F-001.4: a flag do Chromium passou a `--autoplay-policy=document-user-activation-required`. Medido: com `user-gesture-required`, o AudioContext já nasce `running`. O critério passou a descrever o teste mais forte.
  - Texto novo no `pt-BR.json`: `A8.SISTEMA.TITULO`.
- **Layout provisório da Tela de Acender:** botão de 288 × 72 pt, centrado na área segura. Não é número de simulação.
- **Riscos para o iPhone real (F-010):**
  - `audioSession = 'playback'` interrompe a música de outros apps e ignora a chave de silêncio; é o comportamento que o doc 12 §2.3 busca, mas vale confirmar;
  - o fallback do `<audio>` silencioso não roda no iOS 17+;
  - o efeito do MSAA desligado na arte final;
  - o desbloqueio dentro do `touchend` com `preventDefault`;
  - o desbloqueio roda uma vez só: se o `resume()` falhar, a Vigília começa sem som até recarregar (pesa a partir dos sons da F-006);
  - o `onGameVisible` do Phaser ao voltar do segundo plano (ADR-0003 §1);
  - os 72 pt são lógicos: na aba do Safari o FIT encolhe o botão (≈ 57 pt físicos em 390 × 664);
  - o determinismo só foi medido no V8; o JavaScriptCore será conferido no aparelho.

### Como rodar
- `npm install`.
- `scripts/verify.sh --feature F-00N [--seed N] [--taps-game]` (o Pronto; F-001 a F-006 verdes; ≈ 15 min, dos quais ≈ 4 nos specs de desempenho e de heap da F-003).
- Avulsos: `npm test` (Vitest), `npm run typecheck`, `npm run lint`, `npm run build:debug` e depois `npm run e2e`, `npm run dev`.
- Módulo novo: `scripts/novo-modulo.sh <area>/<nome> [--cena NomeDaCena]`.
- Disposição dos obstáculos: `scripts/gerar-disposicao.py --conferir`; direções do anel: `scripts/gerar-direcoes.py --conferir` (Python 3).
- Simulação de 20 min (medida): `npx --no-install tsx scripts/sim20.ts` (saída em `.verify/sim20.json`).
- Cenários do build de debug: `?cenario=horda|horda_rotativa|sem_horda|tres_armas|nivel_tres|bau_uniao|vigilia_sem_cinzas|oco_grande_sozinho|novica_sozinha|horda_com_ataques|telegrafos`, `?inicio=MM:SS` (relógio inicial com a linha livre, 00:00 a 22:59), `?visto=mover,esquiva,aparo` (tutoriais já vistos; `?tutorial=0` vence), `?flash=segurar` (o flash não decai, para a captura), `?teto=300|500`, `?sonda=0` (desliga a sonda do TETO), `?render=gpu|image`, `?buffer=dinamico`, `?debug=1` (painel e verificação de NaN).

### Ambiente
- Não existem: `CLAUDE.md`, `playbook/` e os comandos `/brief-do-jogo`, `/checkpoint-e-retomada`, `/ciclo-de-feature` e `/critico-independente`. O crítico é um subagente (Q-33). `scripts/` e o ADR-0001 foram criados nesta sessão.
- Playwright 1.56.1 usa o Chromium 1194 já instalado em `/opt/pw-browsers` (sem download). O site dos autores do xoshiro está bloqueado pelo proxy; os vetores vieram do crate `rand_xoshiro` (ADR-0003 §2).
- Há um Stop hook do ambiente que exige commit e push; não há o hook de verify/evidência/crítico do doc 19.
- **Agentes (preferência do usuário, Sessão 5):** todo subagente roda em Sonnet com esforço médio. O modelo vem de `.claude/settings.json` (`CLAUDE_CODE_SUBAGENT_MODEL`); o esforço não tem configuração própria e é passado em cada chamada (`effort: 'medium'`).
- Versões conferidas no npm em 2026-10-10: phaser 4.2.1, vite 8.x, typescript 5.9.x; Node 22.22.
- As skills oficiais do Phaser existem (`node_modules/phaser/skills/`, 28 assuntos). Para a etapa 2 foram lidas: game-setup-and-config, scale-and-responsive, scenes, time-and-timers, v4-new-features, v3-to-v4-migration, sprites-and-images, graphics-and-shapes, groups-and-containers, render-textures, particles, game-object-components, text-and-bitmaptext, cameras, input-keyboard-mouse-touch, audio-and-sound, geometry-and-math.

### Retomada
- **Sessão 1:** fechou na F-001.
- **Sessão 2:** fechou na F-002.
- **Sessão 3:** fechou na F-003.
- **Sessão 4:** fechou na F-004.
- **Sessão 5:** fechou na F-005.
- **Sessão 6:** fechou na F-006.
- **Sessão 7:** fecha na F-007, que aguarda a revisão do usuário. A F-008 não foi começada.
- **Sessão 8 (F-011, arte):** fecha na F-011 pronta, à espera do teste no iPhone (itens A1 a A12 do roteiro). Para mexer na arte: `design/arte/style-card.md` (§10 e §11), `design/arte/revisao-F-011.md`, `src/arte/` e `node scripts/arte/rodar.mjs previa|folhas|amostras`.
- **Próxima sessão (F-008), com o mesmo método:**
  - ler este arquivo, o ADR-0009, `design/decisoes-F-007.md` (sobretudo a §13, as recomendações para as F-008 a F-010) e a entrada da F-008 no `feature_list.json`;
  - antes de implementar, fechar as pendências da F-008 (levantamento, revisão adversarial e §0 para veto), e só então a Etapa 2;
  - rodar `scripts/verify.sh --feature F-007 --taps-game --seed 1` para conferir que o Apagar e a mancha continuam verdes.
