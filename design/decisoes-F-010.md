# Decisões da F-010 "Santuário mínimo e PWA"

- Status: proposta, aguarda aprovação do usuário (Etapa 1; nenhum código escrito). Depende da D8 (`design/decisoes-F-008.md`, layout v8, `vdc.vigilia`/`vdc.andamento` em `localStorage`) e da D9 (`design/decisoes-F-009.md`, layout v9, meta v2 com `brasas`), ambas ainda não aprovadas: o layout v10 cresce depois do v9 e o meta v3 depois do v2.
- Fontes: B §3.5, §3.12, §3.14, §4 e §11.3 (F-010); Q-16 a Q-20, Q-29, Q-31, Q-34; ADR-0002 §10 a §14; D2 a D9 (§9/§10/§13); GDD 08 §3 e §4.1, 11 §3.1, §3.13 e §4, 12 §2; `feature_list.json` (F-010); código lido por `grep` (`meta.ts`, `armazenamento.ts`, `arvore.json`, `contato.ts`, `atributos.ts`, `estado.ts`, `Resultado.ts`, `eslint.config.js`, `index.html`, `pages-teste.yml`).
- Nomes: B = game-brief; D2 a D9 = `design/decisoes-F-002.md` a `-F-009.md`. IDs por área: SN Santuário e fluxo, FD Fundação, GA Almas garantidas e Iselda, MT meta, ST armazenamento, LT lint, PW PWA, PS pausa e paisagem, DG degradação, IP iPhone, LY layout, TX textos, CN cenário.

## 0. O que foi decidido (para vetar de relance)

### 0.A Decisões de design e divergências (para vetar)

Em negrito, o que diverge de documento aprovado. "Alternativa" é o que vale se você vetar. As oito que mais pedem seu olhar: ST1 (sem IndexedDB), FD6 (Bigorna multiplica e passa de 80%), PS4 (Apagar termina sozinho se a aba some), IP1 (a feature fica pronta sem o iPhone), DG3 (o TETO cai no nível 3), GA1 (as 300 Almas completam o saldo), SN4 (atalho de teste que pula o Santuário) e FD2 (compra em dois toques).

| # | Decisão | Valor |
|---|---|---|
| SN1 | Cena | Cena nova `Santuario`, formas simples (arte é a F-011): barra superior com Almas e Brasas (só contadas, D9 AN3); Iselda (círculo de brasa clara de 56 pt com o rótulo `A9.SANTUARIO.ISELDA`; tocar abre a árvore); botão **Vigília** (`A9.SANTUARIO.VIGILIA`, ≥ 72 pt, base da tela, acima do inset). Sem Aldric nem outros NPCs. Todos os alvos entram na tabela de hit-test (≥ 72 pt, fora dos insets) |
| SN2 | Fluxo | Acender (Tela de Acender, Q-34) → Santuário, sempre → botão Vigília → Vigília → Apagar/Amanhecer → Resultado → **Voltar ao Santuário** (agora leva ao Santuário; a D7 RS6 deixou o Acender de provisório) → comprar → Vigília. Repetir Vigília abre a Vigília direto (D7 RS6). Abandonar volta ao Santuário pelo mesmo Voltar |
| SN3 | Retomada | A oferta Continuar/Recusar da D8 SV5 continua na Tela de Acender, antes do Santuário; Continuar vai direto à Vigília na pausa |
| SN4 | Atalho de teste | No build de debug, `?cenario` e `?inicio` seguem indo direto da Tela de Acender à Vigília (os specs da F-001 a F-009 não mudam); `?santuario=1` força a passagem pelo Santuário. Sem esses parâmetros, e no build de produção, o Santuário é sempre a próxima cena. Alternativa: sempre pelo Santuário (reescrever o `tocarAcender` e os specs) |
| SN5 | Iniciar a Vigília | Botão Vigília: seed nova pela mesma origem do Repetir (D7), `proximaIdVigilia` (D8 SV4), parâmetros da Fundação lidos do meta (FD4 a FD7) |
| FD1 | Os 8 nós | Os de `arvore.json` (já existe, `fundacao`, ordem do doc 08 §4.1), numa **grade 2 × 4 sem regra de revelação** (Q-17 (3)); linhas de 96 pt; abaixo da grade um painel fixo de detalhe (nome-frase, efeito numérico, custo, rank, linha de lore `G2.*`); rodapé com Reembolsar e Voltar (72 pt). Cabe em 390 × 844 com insets 47/34 (a medir na implementação) |
| FD2 | Compra | 1º toque seleciona e mostra o detalhe; o 2º toque no mesmo nó compra (B §5.13). Recusas sem débito e sem gravação: nó bloqueado, rank máximo, Almas < custo (`A9.SANTUARIO.SEM_ALMAS`). A recusa mora na função pura `comprar`, não só na tela. Compra grava o meta na hora (seq + 1). Alternativa: botão "Pesquisar" no painel |
| FD3 | Custo | `300 × 1,12^(rank−1) × (1 + 0,015 × G)` com `rank` o rank que se compra (1 a máx.) e `G` = soma dos ranks da árvore antes da compra. Float32: `p = 1`, multiplicado por `fround(1,12)` `rank−1` vezes (ADR-0002 §5); inteiro mais próximo, meio para cima (`⌊v + 0,5⌋`, Q-19). Base 300 de `arvore.json`. `G` não é gravado: é a soma dos ranks |
| FD4 | O que a simulação lê | Quatro ranks u8 no estado (LY1): Pele (Armadura +2 por rank), Fôlego (+5% de HP máximo por rank), Casco e Bigorna. Lidos por funções puras de tabela, sem double: `armadura()` soma `2 × rankPele`; o Σ% do hpMax (D5 P3) soma `5 × rankFolego`; o resto em FD5 e FD6. Mãos de aprendiz entra só pelos parâmetros (FD7). Começa a valer no passo 0 e **nunca muda dentro da Vigília**; `sincronizarDerivados` (D8 SV1) refaz o hpMax ao carregar |
| FD5 | Casco | Invulnerabilidade pós-acerto de contato = `18 + 3 × rankCasco` passos (18, 21, 24, 27; 0,05 s = 3 passos). O fator 0,3 do acerto não muda (D3). Só o contato |
| FD6 | Bigorna × armadura | **Multiplicativa, só na origem contato, entre a armadura e a Brasa Firme:** `dano = bruto × 20/(A+20) × m × (Brasa Firme ? 0,8 : 1)`, `m` = 1; 0,97; 0,94; 0,91 (tabela Float32, rank 0 a 3). Responde a pergunta do brief §11.3. **O máximo combinado no contato passa de 80% para 81,8% (0,25 × 0,91 × 0,8 = 0,182); diverge da D7 DM1 ("máximo combinado 80%"). Projétil, golpe, fome e Agarrar não recebem a Bigorna.** Alternativa: aditiva dentro do teto (`min(0,75, A/(A+20) + 0,03 r)`; nunca passa de 80%) |
| FD7 | Mãos de aprendiz | Rank `r` (0 a 3): a Espada Longa começa no nível `1 + r` (máx. 4); `r = 0` deixa `armas = null` (hash de hoje); `r > 0` põe `armas = [{ espada, 1 + r }]` nos parâmetros (D4 §9). Os limiares da União não mudam (Q-18). Cenários ignoram a Fundação (FD12) |
| FD8 | Nós sem efeito | O peso do martelo do seu pai, Pés plantados e Ferro frio aparecem, com `A9.SANTUARIO.BLOQUEADO` e sem preço; a compra é recusada na função pura (`no_mvp: "bloqueado"` do JSON; Q-16 e Q-17). Não entram em `G` |
| FD9 | Reembolsar | Dois toques (arma/confirma, como PE4 da D7, com `A9.SANTUARIO.REEMBOLSAR_CONFIRMA`); devolve 100% do `gasto` (soma do que foi pago, no meta), zera os 8 ranks (logo `G` = 0) e `gasto`. Sem custo. Desabilitado com `gasto` = 0. Só no Santuário |
| FD10 | Preço × Almas | A fórmula de B não muda. Comprar os 19 ranks ativos custa **7.852 Almas** na ordem mais barata primeiro (um só nó de 5 ranks: 1.969; de 3: 1.029). Com os alvos de B §5.14 líquidos (400 / 1.100 / 1.600) são 5 a 20 Vigílias; a medida da F-009 (CN3) vira uma tabela de ritmo em `ritmo.txt`, informativa. Se o ritmo parecer errado é balanceamento, depois da F-010 |
| GA1 | 300 Almas | No FIM do primeiro Apagar ou A Fome (`primeiroApagarFeito` passa de falso a verdadeiro; D9 FM3), o saldo é **completado até 300** só se estiver abaixo (Q-20), na mesma gravação do crédito (D8 SV4). Amanhecer e Abandonar não garantem nada. Saldo ≥ 300 não muda. Resultado mostra as Almas da Vigília como hoje; o Santuário mostra o saldo. Alternativa: +300 de bônus |
| GA2 | Iselda apresenta | Na primeira chegada ao Santuário depois do primeiro FIM que não seja Abandonar (bit `iselda` de `marcos`): a árvore abre sozinha com *Fôlego de forja* selecionado e com anel de brasa, e a fala `A9.SANTUARIO.ISELDA_FALA_01`. Qualquer nó pode ser comprado. Se o 1º FIM foi Amanhecer, igual, sem a garantia (Q-20). O bit liga ao fechar a árvore ou ao comprar |
| GA3 | Balão das Cinzas | `A2.TUTORIAL.05` aparece no Resultado do primeiro Apagar ou A Fome (bit `balaoCinzas`), com ou sem mancha, até o toque. Fecha o RS8 da D7. O texto de hoje é "…": entra um rascunho provisório (TX1) |
| MT1 | Meta v3 | Soma ao v2 (D9): `fundacao { ranks: 8 × u8 (ordem de arvore.json), gasto }`, `marcos` (máscara: 1 `balaoCinzas`, 2 `iselda`) e `conviteRecusadoEm` (`vigiliasConcluidas` da recusa, ou null). Tutoriais e opções já estão no meta desde a D7 |
| MT2 | Migração | `migracoes.ts` (D8 SV7) ganha `meta v1 → v2` (D9: `brasas` 0) e `v2 → v3` (ranks 0, `gasto` 0, `marcos` 0, convite null). Antes de gravar o 1º meta migrado, a cópia do texto antigo vai para `vdc.meta.anterior` (uma geração). Versão maior que a do código, soma errada ou NaN: padrões, como hoje. Um teste por versão |
| ST1 | Armazenamento | **Fica em `localStorage` (`vdc.meta`, `vdc.vigilia`, `vdc.andamento`); o IndexedDB não entra. Diverge do ADR-0002 §10 (IndexedDB primário + snapshot) e cancela o adiamento "IndexedDB entra na F-010" das D7 SV2 e D8 SV2.** Motivos: (1) `visibilitychange` e `pagehide` precisam gravar o `andamento` e o `vigilia` de forma síncrona, e o IndexedDB não garante terminar nesses eventos no Safari; (2) a expulsão por ITP e por pressão de disco leva `localStorage` e IndexedDB juntos, então o espelho não aumenta a durabilidade; (3) o meta tem < 1 KB e o `vigilia` ≈ 103 KB em base64, longe da cota de 5 MB; (4) a atomicidade do FIM já vale pela ordem da D8 SV4. Alternativa: espelho assíncrono do meta no IndexedDB, lido só se o `localStorage` vier vazio (≈ 150 linhas e `fake-indexeddb`) |
| ST2 | `persist()` | Em standalone (`navigator.standalone` ou `display-mode: standalone`), no boot e depois de cada compra, `navigator.storage.persist()`; o resultado vai para `__GAME_DEBUG__.persistido` (true, false ou null se não houver a API). Falha não bloqueia nada |
| LT1 | Lint de strings | A regra `vdc/textos` já cobre `src/cenas`, `src/entrada`, `src/plataforma` e `src/*.ts`. Entram: um teste que lê `index.html` e falha com qualquer texto visível ou atributo `aria-label`/`title`/`alt` preenchido; o `manifest` gerado no build com `name` e `short_name` = `t('A8.SISTEMA.TITULO')`; e o `<title>` e o overlay de paisagem preenchidos pelo código com `t(id)` |
| LT2 | Palavras proibidas | Script `scripts/glossario-dados.mjs`: as 11 palavras de B §3.15 bloqueiam (palavra inteira, sem acento, sem caixa) em `*.json`, `*.html`, `*.webmanifest`, `*.yml` e `*.sh` fora de `node_modules`, `design/`, `docs/` e `production/`; as extras da Q-31 (vitória, morte, menu, partida, save, ouro, moeda...) só avisam e só em `pt-BR.json` ("mortes causadas" fica, Q-31). O eslint segue para `.ts/.js` |
| LT3 | Relatório | `npm run lint:relatorio` junta eslint e o script em `production/evidencias/F-010/lint.txt`: arquivos verificados por regra, erros (0) e a lista de avisos |
| PW1 | Manifest | `manifest.webmanifest` gerado no build a partir de `pt-BR.json`: `display: standalone`, `orientation: portrait`, `start_url` e `scope` `./`, `lang: pt-BR`, cores `#1a1f2b`, ícones 192 e 512 (+ maskable). `<link rel="manifest">` e `apple-touch-icon` 180 no `index.html` |
| PW2 | Service worker | `sw.js` na raiz do build, escopo `./`. Precache versionado `vdc-<build>` (o mesmo id de build do cache `vdc.teto`), lista de arquivos gerada pelo Vite. Cache primeiro, rede de reserva; navegação cai em `index.html` com `ignoreSearch` (`?seed=` funciona offline). **Sem `skipWaiting` e sem `clients.claim`:** a versão nova só assume no próximo boot, nunca no meio de uma Vigília (ADR-0002 §12). `activate` apaga os caches de outros builds. Registrado depois do `load`, nos builds de produção e de debug; não no `vite dev` |
| PW3 | Convite | Fora do standalone, ao chegar ao Santuário com `vigiliasConcluidas ≥ 1` e (`conviteRecusadoEm` null ou `vigiliasConcluidas − conviteRecusadoEm ≥ 5`): painel com `A8.SISTEMA.CONVITE_PWA`, as instruções do iOS (`A8.SISTEMA.CONVITE_PASSOS`, novo) e o botão `A8.SISTEMA.AGORA_NAO`, que grava `conviteRecusadoEm`. O iOS não tem `beforeinstallprompt`: o convite só explica o Compartilhar. Uma vez por chegada; some se já instalado |
| PW4 | Ícones | PNG provisórios (brasa sobre `#1a1f2b`) gerados por `scripts/gerar-icones.py` e versionados; o ícone final é da F-011 |
| PS1 | Pausa automática | Gatilhos: `visibilitychange` com `document.hidden`, `pagehide`, `Phaser.Core.Events.HIDDEN`/`BLUR` (por `addEventListener`, nunca `window.onblur`), `statechange` do `AudioContext` em `interrupted` e a paisagem (PS3). Grava o `andamento` (D8 SV3) e abre a Pausa com `origem: 'automatica'`, que mostra `A6.PAUSA.TOQUE_PARA_CONTINUAR` e **continua com um toque em qualquer lugar** (a pausa do botão segue só pelo Continuar, D4 P7). Som por `setMute`, nunca `ctx.suspend()`. A retomada nunca é automática. Também em FOGUEIRA (onde o passo roda) |
| PS2 | Efeitos da pausa | Ao abrir (qualquer origem, inclusive a automática e a paisagem): solta todos os slots de dedos e esconde o joystick; só um toque novo o recria (D2 §9). O toque que retoma não vira esquiva nem aparo: o primeiro `touchstart` depois da retomada é descartado. Modal de level up ou baú aberto: não abre pausa, só solta os dedos e silencia. Pausa do botão já aberta: só silencia. A pausa automática não passa por `ACAO` e não entra no replay (como a pausa de hoje) |
| PS3 | Paisagem | Overlay DOM `#gire` fora do canvas, por `matchMedia('(orientation: landscape)')` (largura > altura), opaco `#0b0e14`, acima de tudo, com `t('A8.SISTEMA.GIRE')` escrito pelo código no boot. Aparece também na Tela de Acender e no Santuário. Na Vigília pausa como PS1, e voltar ao retrato mostra a pausa automática (um toque a mais) |
| PS4 | APAGANDO | **Se a aba sai de cena durante APAGANDO (≤ 30 passos), o jogo executa de uma vez os passos que faltam e grava o FIM (meta, depois remove `vigilia` e `andamento`, D8 SV4); o Resultado já está pronto na volta. Não abre a tela de pausa. Diverge do ADR-0002 §12 ("pausa automática") só nesta fase.** Os passos são fixos e independem do relógio, então o hash é o mesmo que o da câmera lenta; evita fechar a aba com HP 0 para fugir da morte (e a retomada não oferece uma Vigília já apagada). Em FIM não há nada a fazer. AMANHECER segue a pausa normal. Alternativa: pausa inerte (a aba morta com HP 0 oferece Retomar) |
| PS5 | `timeStamp` do Safari | O listener compara `TouchEvent.timeStamp` com `performance.now()` no 1º toque; se a diferença passar de 60.000 ms, passa a gravar `performance.now()` no lugar (saída que a D6 §10 deixou para esta feature). Sem depender do aparelho para existir; o roteiro só confirma `__GAME_DEBUG__.entrada.relogioDeToque` (`timeStamp` ou `performance`) |
| DG1 | Medida | CPU do frame = `performance.now()` de `PRE_STEP` a `POST_RENDER` (ADR-0002 §14, não o intervalo entre rAFs: o Low Power Mode não dispara a degradação). Média em janela de 2 s; `> 16 ms` sobe um nível; desce um nível após 10 s com média `< 10 ms`; um nível por vez. Função pura `degradacao.ts` com o relógio injetado |
| DG2 | Níveis 1 e 2 | Só render, fora do hash. 1: o teto do anel de partículas cai pela metade e o pool de mortes vai a 150 (D4). 2: luz e gradientes aditivos desligados |
| DG3 | Nível 3 | Muda a simulação, então chega como campo `degradacao` (u8, 0 a 3) de `ComandosDoPasso`, gravado no replay: **TETO efetivo = mín(TETO, mínimo da linha corrente sem o fator `I`)** (ADR-0002 §15 item 10, opção A, aprovada; D3 §9). A reposição já recebe o TETO efetivo como argumento. A massa acima do TETO efetivo vira Ocos Grandes pela regra existente, sem sorteio novo. Nenhum fluxo de RNG novo |
| DG4 | Rebaixamento do TETO | Nível 3 numa Vigília com TETO 500 grava `vdc.teto` = 300 (D4 E2; ADR-0002 §13). A Vigília em curso mantém o TETO que tem; vale na próxima |
| IP1 | O que é "pronta" | **A F-010 é declarada pronta quando todos os critérios que não pedem aparelho passam, o crítico dá nota ≥ 7, o build do Pages está publicável e o roteiro (IP2) está escrito. F-010.5 e as quatro evidências de iPhone ficam "pendente de aparelho" (campo `pendente_de_aparelho: true`) e não bloqueiam. Diverge de B §4 (F-010 só fecha com o vídeo no iPhone).** O MVP só é chamado de "validado em aparelho" quando você entregar o que falta; a lista vai para o topo do `progress.md`. Alternativa: a feature fica aberta até o vídeo |
| IP2 | Roteiro | `docs/roteiro-iphone.md` ganha a seção F-010 (ver §5, com os passos exatos). Hospedagem: o `pages-teste.yml` existente (manual, build de debug) passa a publicar também `manifest`, `sw.js` e ícones; o Pages precisa estar ativado com fonte "GitHub Actions" (ação sua) e a URL é HTTPS (Q-29). Despublicar depois do teste |
| IP3 | Medida no aparelho | Com `?debug=1`: overlay DOM de fps instantâneo e **fps médio da Hora corrente** (ADR-0002 §14), a mesma linha no painel do debug (D3 V4), `recargas` (boots na mesma sessão da aba: `sessionStorage`) e `memoriaEstimadaMB`. O evento `sessao` grava o fps médio por Hora e `erro_recuperacao` marca a recarga |
| IP4 | Sonda do TETO | O limiar de 2 ms fica como está. No roteiro, 5 sondas no iPhone 12 e 5 no 14 anotam `sondaMs`. Regra para mudar: se o 12 ou o 11 abre com TETO 500 e a Hora IV (CN1) fica abaixo de 55 fps, o limiar passa a 0,9 × o menor `sondaMs` medido nesse aparelho, arredondado a 0,1 ms; senão não muda. É uma decisão sua depois do aparelho, não da feature |
| CN1 | Cenário `hora4_armas` | Receita nova: a de `tres_armas`, linha 19 fixa, relógio 16:00 (57.600), jogador invulnerável (D3 §5), TETO pelo `?teto=`. Serve ao roteiro do iPhone (carga real de armas e projéteis na Hora IV) e a um teste de 30 s no Chromium |
| TX1 | Textos novos | `A9.SANTUARIO.ALMAS`, `.BRASAS`, `.SEM_ALMAS`, `.ISELDA_FALA_01`, `A8.SISTEMA.CONVITE_PASSOS` e o texto de `A2.TUTORIAL.05`, com rascunho provisório (o roteiro final é da etapa 3; passam pelo glossário). Os ids de Santuário, árvore, convite, `GIRE` e pausa automática já existem |
| LY1 | Layout v10 | **+4 B no fim do buffer, depois do v9** (alinhado, a confirmar): `fundacaoPele`, `fundacaoFolego`, `fundacaoCasco`, `fundacaoBigorna` (u8). Seção `fundacao` em `hashPorSecao`. O hash muda uma vez; regressão v9 com máscara em `CAB.versao` e nos 4 B finais (ranks 0 não mudam nada) |

### 0.B Decisões técnicas (informativo)

| # | Decisão | Valor |
|---|---|---|
| FD11 | Módulos | `src/logica/progressao/fundacao.ts` (puro: `custoDoRank`, `comprar`, `reembolsar`, `parametrosDaFundacao(meta)`); `arvore.json` já traz custos e efeitos; os dados passam pelo schema `no-arvore.schema.json` |
| FD12 | Debug | `?fundacao=a,f,c,b,m` (5 ranks na ordem Pele, Fôlego, Casco, Bigorna, Mãos) só no build de debug: entra nos parâmetros e no hash, não grava no meta; cenários usam 0,0,0,0,0 |
| LY2 | Laço quente | Nenhum double nem u32 ≥ 2³⁰ atravessa chamada: tabela `Float32Array` da Bigorna lida em `BRUTO[0]`; Casco soma u8; o custo da árvore roda fora do laço; alocação por passo inalterada (≤ 16 B); nenhum gate de tempo novo |
| LY3 | RNG | Nenhum fluxo novo. Santuário, compra e Iselda não usam a simulação; `degradacao` é comando, não sorteio |
| LY4 | Códigos | `EVENTO` e `FORMA` não mudam. Telemetria `sessao` ganha `fpsPorHora` (fora do hash) |
| MT3 | Módulos do meta | `meta.ts` (puro) e `migracoes.ts`; I/O em `armazenamento.ts`; `pwa.ts` e `orientacao.ts` em `src/plataforma` |
| SN6 | Estado da cena | `__GAME_DEBUG__.cena` ('Acender' \| 'Santuario' \| ...), `.santuario { almas, brasas, selecionado, gasto, ranks }` para os testes |

## 1. O que os documentos já respondem

- Nós, ranks, efeitos, reembolso e custo: B §5.13 e doc 08 §3 e §4.1 (3º rank com 40 globais = 602, confere com FD3); Q-16 a Q-20, Q-29, Q-31, Q-34.
- Convite depois da 1ª Vigília e repetição após 5: doc 11 §4, ADR-0002 §12. HP no Σ%: D5 P3. Casco e Bigorna no contato: D3. TETO do nível 3: ADR-0002 §15 item 10.
- Meta v1 já tem `tutoriais`, `opcoes`, `primeiroApagarFeito`, `vigiliasConcluidas`, `proximaIdVigilia` e `ultimaEncerrada` (D7, `meta.ts`); o v2 acrescenta `brasas` (D9 AN3).

## 2. Santuário e fluxo (SN, GA)

Cenas: `Boot → Acender → Santuario → Vigilia → Resultado → Santuario`. Na chegada ao Santuário: o convite PWA (PW3) e a apresentação de Iselda (GA2) nunca na mesma chegada (Iselda primeiro). O botão Vigília lê o meta no clique, monta `ParametrosDaVigilia` (FD4, FD7, `mancha`, `tutoriaisVistos`) e grava `proximaIdVigilia` antes de abrir.

## 3. Fundação (FD, GA1)

**Compra (função pura):** `comprar(meta, idx)` devolve o meta novo ou `{ recusa: 'bloqueado' | 'maximo' | 'sem_almas' }`. Custo `c = custoDoRank(base, rank+1, G)`; `almas −= c`, `ranks[idx] += 1`, `gasto += c`, `seq += 1`. `reembolsar(meta)`: `almas += gasto`, ranks e `gasto` a 0.

**Valores de referência (Float32, calculados fora do repositório; refazer no teste):** `custoDoRank(300, 1, 0)` = 300; `(300, 1, 1)` = 305 (304,5, meio para cima); `(300, 2, 1)` = 341 (341,04); `(300, 1, 2)` = 309; `(300, 3, 40)` = 602 (602,11); `(300, 5, 18)` = 600 (599,51); `(300, 5, 0)` = 472 (472,06). Um só nó de 5 ranks: 300, 341, 388, 440, 500 → 1.969 no total (ranks seguidos, `G` = rank − 1; conferir os parciais no teste).

**Números (FD4 a FD6):** hpMax `⌊(150 × (100 + 5r) + 50)/100⌋` = 150, 158, 165, 173, 180, 188 (r = 0 a 5); armadura de r = 5: A = 10, multiplicador 0,667; contato com tudo no máximo e sem Elmo: `0,667 × 0,91 × 0,8` = 0,485.

**Garantia (GA1):** em `creditarFim(meta, resultado)`: se `!primeiroApagarFeito` e `causa ∈ {apagar, a_fome}`: `primeiroApagarFeito = true`, `almas = max(almas, 300)` depois do crédito normal. Idempotente pelo guarda `fimCreditado` (D7 SV7).

## 4. Meta, lint, PWA, pausa e degradação (MT, ST, LT, PW, PS, DG)

**Meta v3 (JSON, `soma` FNV-1a em duas metades de 16 bits, hex de 8):** os campos do v1/v2 mais `fundacao { ranks[8], gasto }`, `marcos`, `conviteRecusadoEm`. Validação: ranks inteiros de 0 ao máximo do nó, 0 nos bloqueados; `gasto` em [0, 2³⁰); ranks > 0 com `gasto` 0 é inválido (padrões). `seq` cresce a cada gravação lógica. Boot: `vdc.meta` válido → migra → usa; inválido → `vdc.meta.anterior` → padrões. A pausa automática grava só o `andamento` (D8 SV3).

**Lint:** o relatório termina com "11 palavras: 0 violações; extras: N avisos" e lista os avisos. `<title>` e `#gire` ficam vazios no HTML e são preenchidos no 1º módulo de `main.ts`, antes do Phaser.

**Ordem no `visibilitychange` (hidden):** (1) APAGANDO → PS4 e para; (2) grava o `andamento`; (3) abre a pausa automática se a fase for VIVA ou FOGUEIRA e não houver modal; (4) `setMute(true)`. Ao voltar só aparece a pausa; o descarte do acumulador já existe (D4 P7). Paisagem na Tela de Acender e no Santuário: só o overlay. `pwa.ts` expõe `ehStandalone()`, `convitePendente(meta)` e `pedirPersistencia()`, injetáveis para o Vitest.

**Degradação:** `degradacao.ts` (`proximoNivel`, acumulador de janela) puro; o driver mede e escreve `ComandosDoPasso.degradacao`. A Vigília de TETO 300 não muda (já está no mínimo da linha 19). Nível em `__GAME_DEBUG__.degradacao`.

## 5. iPhone real, pendente de aparelho (IP1 a IP4, CN1)

Roteiro exato (vai para `docs/roteiro-iphone.md`; Low Power Mode desligado em todos os passos; Safari atualizado):

1. **Instalar.** No Mac, rodar o workflow "Pages de teste". No iPhone, abrir `<URL>/?debug=1`, anotar `sondaMs` e o `teto` do overlay (5 aberturas por aparelho: reabrir a aba). Compartilhar → Adicionar à Tela de Início; abrir pelo ícone; conferir que o convite não aparece instalado.
2. **Fluxo.** Acender → Santuário → Vigília → jogar até o Apagar → Resultado (balão, 300 Almas) → Voltar → Iselda apresenta → comprar *Fôlego de forja* → Vigília. Girar o aparelho em cada tela (overlay e pausa) e mandar o app para o segundo plano durante a Vigília e durante o Apagar.
3. **fps da Hora IV (F-010.5).** Abrir `<URL>/?debug=1&cenario=hora4_armas`, aguardar 15 s, **gravar a tela (Central de Controle) com o overlay de fps visível por 60 s**, parar de gravar. Registrar o fps médio da Hora IV: critério ≥ 55 (iPhone 11 ou 12 e iPhone 14 ou mais novo, um vídeo por aparelho).
4. **Três Vigílias seguidas sem recarga (F-010.5).** Abrir `<URL>/?debug=1&inicio=15:00` e jogar três Vigílias seguidas (Vigília → Apagar → Resultado → Voltar → Vigília), sem fechar nem recarregar a aba; ao fim, o overlay deve mostrar `recargas 0`. Gravar a tela inteira.
5. **Memória.** Mac + Safari → Desenvolvedor → o iPhone → a aba → Linha do Tempo → Memória, durante o passo 4: captura da maior leitura, critério < 150 MB (`memoria-safari.png`).
6. **Calibrações (anotar, não bloqueiam):** `entrada.relogioDeToque`; swipe, toque duplo, segurar (18 passos), janela do aparo, cor/vinheta do HP, câmera lenta a 30 fps (se o aparelho cair em Low Power), brilho do telegrafo, menu da Fogueira, borda da arena, véu da fome, cegueira; perguntas "esquiva sem querer" e "esquiva com uma mão".

Arquivos: `production/evidencias/F-010/iphone-11-ou-12.mp4`, `iphone-14.mp4` (cada um com os passos 3 e 4 do aparelho), `memoria-safari.png`, mais `lint.txt` (esta sim, feita aqui).

## Pendências resolvidas

Numeração = ordem de `pendencias_antes_de_comecar`.

1. Bigorna × armadura: FD6.
2. Hospedagem HTTPS (Pages): IP2 (o workflow já existe; falta você ativar o Pages).
3. Limiar da sonda no iPhone 12 e 14: IP4 (a regra está pronta; o número só sai do aparelho, pendente de aparelho).
4. Recomendação da F-002 (pausa automática e paisagem soltam os dedos e escondem o joystick): PS2, PS3.
5. Recomendações da F-003: Casco e Bigorna FD5 e FD6; critério do nível 3: DG3 e F-010.12; sonda no iPhone: IP4; fps médio por Hora no painel: IP3.
6. Mãos de aprendiz pela lista `armas`: FD7.
7. Rebaixamento do TETO com o nível 3: DG4.
8. Pausa automática reusa a tela e o flag, motivo `automatica`, `A6.PAUSA.TOQUE_PARA_CONTINUAR`: PS1.
9. Nível 1 corta o pool de mortes para 150: DG2.
10. F-005 §9: pausa automática com o modal aberto: PS2; nó de HP no Σ%: FD4; Mãos de aprendiz: FD7. **Para outra feature:** toque único e swipe do level up (doc 11 §3.7) dependem de uma tela de Opções que o MVP não tem (B §2): sem feature, entram no backlog pós-MVP; som do level up só se B §2 mudar: sem feature; animação da União e faísca da barra: F-011 (arte).
11. Balanceamento (Facas e Círculo em 3, níveis-alvo do doc 10, 1ª União): **rodada de balanceamento depois da F-010**, com os números do iPhone e a telemetria local; esta feature só entrega o `fpsPorHora`, o ritmo de Almas (FD10) e o cenário `hora4_armas`. Não se decide aqui porque pede jogo real em aparelho.
12. Calibrar swipe, toque duplo, aparo, esquiva 80/21 contra 80/18, trava do falho e buffer: IP2 passo 6 (pendente de aparelho). Mudar um valor é decisão sua com o resultado na mão.
13. `TouchEvent.timeStamp` do Safari: PS5 (o fallback existe no código); câmera lenta a 30 fps, brilho, cunha, 2ª camada, 64 membros, anel sólido: IP2 passo 6.
14. Esquiva com uma mão, botão de esquiva, aparo por 2º dedo: IP2 passo 6 (perguntas); o botão e o aparo dedicados dependem da tela de Opções: pós-MVP. Margem de 24 pt e área de 80 pt: IP2 passo 6.
15. Bits de tutorial e opções no meta: **já feito na D7** (`meta.ts`; conferir no teste de migração); pausa automática com `setMute`: PS1; workflow do Pages: IP2.
16. Janela do aparo como constante única: F-010.14 (teste que a lê de um só lugar); o modo acessível não entra no MVP (B §2).
17. Arte e áudio finais (rastro, contorno da esquiva, sopro, som do aparo, inspirar, câmera, flash, reflexão, 4º estado): **F-011** e a rodada de áudio; o brief pôs arte e áudio finais depois da F-010.
18. a 21. Balanceamento (Noviça 5 a 14%, Oco Grande sem telegrafo, dano dos médios, aparo falho): **rodada de balanceamento depois da F-010**, mesma razão do item 11.
22. IndexedDB e `persist()` com migração: ST1 (IndexedDB **não** entra, motivos ali), ST2 e MT2.
23. 300 Almas e o balão `A2.TUTORIAL.05`: GA1, GA3.
24. Custos de passivas em múltiplo de 0,5 e "+stamina máxima" por Vigor: nenhum nó da Fundação mexe em stamina, então não há Vigor no MVP; F-010.13 prova por teste que os custos de stamina das passivas são múltiplos de 0,5 (Passo Leve −30% = 17,5) e que o limiar da Brasa Firme lê `staminaMax` do `vigilantes.json` (com 120, limiar 60); "+stamina máxima por Vigor" vai para a feature que criar o Vigor (pós-MVP).
25. Teto de cargas do Frasco até 6: nenhum nó da Fundação soma cargas; `cargas` fica em 3 e o clamp 6 vira validação de carga (F-010.13). O nó que sobe cargas é de outra árvore (pós-MVP).
26. Calibrar "segurar", swipe e cor/vinheta do HP no iPhone: IP2 passo 6.
27. `visibilitychange` em APAGANDO: PS4. Preço da árvore pela medida de Almas: FD10.

## Critérios (o "como" para o `feature_list.json`)

- **F-010.1 (vitest):** os vetores de §3 (300; 305; 341; 309; 602; 600; 472) em Float32 com potência iterativa; `custoDoRank` nunca usa `Math.pow` nem `**` (o lint já bloqueia); rank 1 com `G` = 0 vale 300; um nó de 5 ranks comprado em sequência soma 1.969.
- **F-010.2 (vitest):** comprar Fôlego ×3 e Casco ×1 com 3.000 Almas; reembolsar: ranks todos 0, `gasto` 0, Almas de volta aos 3.000, `G` 0, `seq` + 1; reembolsar de novo é recusado; o custo da próxima compra volta a 300.
- **F-010.3 (lint):** `npm run lint:relatorio` com 0 erros de `vdc/textos`; teste de `index.html` sem texto nem atributo de texto; `manifest.name` = `t('A8.SISTEMA.TITULO')`; relatório salvo em `production/evidencias/F-010/lint.txt`.
- **F-010.4 (playwright):** `--taps-game --seed`, URL `?inicio=19:00&santuario=1`, storage limpo: Acender → `cena` 'Santuario' → Vigília → Apagar (`FIM(apagar)`) → Resultado com o balão `A2.TUTORIAL.05` → Voltar → Santuario com Iselda apresentando → `meta.almas` = `max(300, almas líquidas)` (300 com poucas Almas) → 2 toques em *Fôlego de forja* (Almas − 300, rank 1) → Vigília → `jogador.hpMax` = 158. Um segundo Apagar não repete a garantia (`almas` só soma o líquido). Capturas 390 × 844.
- **F-010.5 (iphone_real, pendente de aparelho):** o roteiro de §5, passos 3 e 4: Hora IV com fps médio ≥ 55 e `recargas` 0 em 3 Vigílias seguidas, nos dois aparelhos.
- **F-010.6 (playwright):** manifest baixado e válido (`display` standalone, ícones 192 e 512 existem e abrem); `navigator.serviceWorker.getRegistration()` ativo depois do 2º `load`; offline (contexto sem rede) a página abre; convite aparece ao chegar ao Santuário depois da 1ª Vigília, `Agora não` grava `conviteRecusadoEm` e ele só volta com `vigiliasConcluidas` + 5; com `display-mode: standalone` emulado não aparece e `persist` é chamado. `visibilitychange` (hidden): `pausa.ativa` e `origem` 'automatica', `passo` e `relogio` não andam por 1 s, joystick e slots soltos; um toque retoma e esse toque não vira esquiva. Em APAGANDO (passo 10) hidden: `faseDoFim` = FIM no retorno, `apagandoPassos` 30, meta creditado uma vez, `vdc.vigilia` removido, hash igual ao de um Apagar sem interrupção da mesma seed. Viewport 844 × 390: `#gire` visível com `t('A8.SISTEMA.GIRE')`, simulação parada; voltar a 390 × 844 mostra a pausa automática.
- **F-010.7 (vitest):** os 3 nós `bloqueado` recusam a compra com Almas de sobra, não somam em `G` e a recusa não grava; `ranks` inválidos nesses nós invalidam o meta.
- **F-010.8 (vitest):** Mãos r = 0, 1, 2, 3: `armas` null; Espada nv 2, 3, 4; r = 3 não passa de 4; os limiares da União (Espada nv 8 + passiva) iguais aos de r = 0.
- **F-010.9 (vitest):** meta v3 com `versao`, `seq` e `soma`; migrações v1 → v2 → v3 e v2 → v3, cada uma com um meta gravado do código antigo como entrada; `vdc.meta.anterior` guarda o texto antigo; soma errada, NaN, `gasto` incoerente e versão futura caem nos padrões; falha de `setItem` mantém a memória.
- **F-010.10 (lint):** as 11 palavras bloqueiam em um arquivo de teste de cada tipo (`.ts`, `.json`, `.html`, `.webmanifest`) e passam no repositório; as extras avisam só em `pt-BR.json`; `lint.txt` traz a linha de resumo.
- **F-010.11 (vitest, novo, Fundação na simulação):** com ranks 0, 5, 3, 3, 0 (FD12): `armadura` = 10; `hpMax` inicial 188; `invulContato` 27 no contato; contato bruto 100 sem Brasa Firme dá `100 × 0,6667 × 0,91` = 60,67 e o mesmo golpe como projétil dá 66,67; Bigorna 0 dá exatamente o dano da D7; layout v10 = v9 + 4 B, `fundacao` na seção de hash, regressão v9 com máscara; 3 chamadas de `passo` com e sem Fundação alocam ≤ 16 B.
- **F-010.12 (vitest, novo, degradação):** `proximoNivel` com médias injetadas: 16,1 ms por 2 s sobe 1; 15,9 não sobe; um nível por janela; 9,9 ms por 10 s desce 1; nível 1 com pool de mortes 150; nível 3 com TETO 500 e linha 19: TETO efetivo 300 (mínimo da linha sem `I`), `vdc.teto` = 300 depois, e a Vigília de TETO 300 inalterada; replay com `degradacao` 3 no passo 600 reproduz o hash.
- **F-010.13 (vitest, novo, dados):** custos de stamina das passivas múltiplos de 0,5; Brasa Firme com `staminaMax` 120 lê limiar 60; `cargas` do JSON ≤ 6.
- **F-010.14 (vitest, novo):** a janela do aparo é lida de uma só constante (grep no teste); `PS5`: com `timeStamp` 90.000 ms à frente de `performance.now()` o tradutor passa a usar `performance.now()` e o swipe de teste continua reconhecido.

## Evidências (`production/evidencias/F-010/`, capturas 390 × 844)

- `lint.txt` (aqui); `santuario.png`, `arvore.png` (grade com tooltip), `iselda-apresenta.png`, `convite.png`, `paisagem-844x390.png`, `pausa-automatica.png`, `resultado-balao.png` (aqui, Playwright); `ritmo.txt` (FD10).
- `iphone-11-ou-12.mp4`, `iphone-14.mp4`, `memoria-safari.png`: **pendente de aparelho** (IP1).

## Recomendações para as features seguintes (não decididas aqui)

- **F-011 (arte e áudio):** Iselda, Santuário, ícone final (PW4), arte da grade da árvore, animação da compra, som real do aparo, contagem de Almas animada.
- **Balanceamento (depois do iPhone):** ritmo de Almas × preço da árvore (FD10), cadência de Vigílias, os itens 11 e 18 a 20 das pendências; limiar da sonda (IP4).
- **Pós-MVP:** tela de Opções (toque único, esquiva por botão, modo acessível do aparo), árvores com Frasco e Vigor, IndexedDB espelho se a perda de save aparecer nos relatos, `beforeinstallprompt` fora do iOS.

## O que muda em dados e documentos

- `pt-BR.json`: ids de TX1; `arvore.json` sem mudança de números; `combate.json` não muda; novo `src/dados/cenarios/hora4_armas.json` e seu schema (campos já existentes).
- Código: `estado.ts` (v10, 4 u8, `ParametrosDaVigilia.fundacao`), `contato.ts` (Casco, Bigorna), `dano.ts` (armadura), `atributos.ts` (Σ%), `comandos.ts` (`degradacao`), `diretor` (TETO efetivo), `meta.ts` e `migracoes.ts` (v3), `armazenamento.ts`, `src/logica/progressao/fundacao.ts`, `src/logica/save/` (nenhum IndexedDB), `src/plataforma/{pwa,orientacao,degradacao}.ts`, cenas `Santuario` (nova), `Acender`, `Resultado`, `Pausa`, `Vigilia`; `index.html` (manifest, `#gire`, ícone); `vite.config.ts` (manifest, `sw.js`); `scripts/{glossario-dados.mjs,gerar-icones.py}`; `e2e/f010.spec.ts`.
- Documentos: `feature_list.json` (os "como" acima, F-010.11 a F-010.14, `pendente_de_aparelho`, evidências, pendências resolvidas), `docs/decisoes/ADR-0011-implementacao-da-f010.md` (divergências e medidas), ADR-0002 §10 (sem IndexedDB) e §12 (APAGANDO), `docs/roteiro-iphone.md`, `progress.md`.
- Divergências a registrar: da D7 DM1 (FD6), do ADR-0002 §10 (ST1) e §12 (PS4) e de B §4 (IP1). Nenhuma divergência da D8 ou da D9.
