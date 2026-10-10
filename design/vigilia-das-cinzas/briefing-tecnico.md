# Vigília das Cinzas (Ashen Vigil) — briefing técnico

Survivor-like (Vampire Survivors) com combate soulslike (esquiva com i-frames, aparar com janela,
inimigos telegrafados), Vigílias de 20 minutos em 4 Horas, Fogueiras, Apagar/Amanhecer, hub
Santuário das Brasas com árvore de 112 nós, 12 Vigilantes, 38 armas, 18 passivas, 34 Uniões,
20 Relíquias, 32 inimigos, 13 chefes, 6 regiões, Ciclos e Pactos. iPhone, retrato, Phaser 4 + TypeScript.

O Documento de Design (GDD) fica em `design/gdd/00…14`. Este briefing diz **como programar** isso
para que um agente construa com qualidade: conteúdo em dados, simulação pura testável, cena fina,
e uma fatia vertical antes de qualquer escala.

## 1. Princípios técnicos (não negociáveis)

1. **Conteúdo é dado, não código.** As 38 armas são ~8 arquétipos de comportamento parametrizados
   por JSON; inimigos, chefes, regiões, Uniões, Relíquias, nós da árvore, Pactos e textos são
   tabelas em `src/dados/*.json` validadas por JSON Schema e por um teste de integridade
   referencial. Adicionar a arma 39 não cria uma classe.
2. **Simulação pura, determinística, em passo fixo.** `src/logica/` não importa Phaser. Um
   `Simulacao.passo(dt)` a 60 Hz com acumulador, RNG com seed (`__GAME_SEED__`), estado serializável.
   Testável no Vitest sem navegador; replays e testes de regressão por seed.
3. **Cena fina.** As cenas Phaser só leem o estado da simulação e desenham (pools de sprites,
   `BitmapText`, partículas pooladas). Nenhuma regra de jogo dentro de `update()` de cena.
4. **Orçamento de performance medido, não presumido.** 60 fps em iPhone 12; até 300 inimigos +
   200 projéteis + 100 partículas simultâneos; ≤ 150 draw calls (tudo em atlas, uma textura por
   camada); zero alocação por frame no caminho quente; `__GAME_DEBUG__` expõe fps, entidades vivas,
   draw calls estimados, passo da simulação.
5. **Fatia vertical primeiro.** "Primeira Vigília": 1 Vigilante, 1 região, 3 inimigos, 1 chefe,
   3 armas + 2 passivas + 1 União, Fogueira, Apagar, Amanhecer, Santuário com 10 nós e 1 NPC.
   Só depois escala por dados.
6. **Texto é conteúdo autoral.** Todo texto do jogo vive em `src/dados/textos/pt-BR.json` (e `en.json`)
   chaveado por id (`arma.lanterna_de_orun.lore`), vindo do roteiro escrito separadamente; o código
   nunca contém strings visíveis. Glossário oficial (Vigília, Amanhecer, Apagar, Fogueira, Oco…) é
   validado por teste: nenhuma string com "run", "checkpoint", "zumbi", "roguelike".

## 2. Arquitetura de pastas

```
src/
  main.ts, debug.ts
  dados/                    JSON de conteúdo + schemas/ (JSON Schema) + textos/{pt-BR,en}.json
  logica/                   simulação pura (sem Phaser)
    rng.ts                  mulberry32 com seed; nunca Math.random
    sim/                    Simulacao (passo fixo), Mundo (SoA: Float32Array x,y,vx,vy,hp; Int16Array tipo,estado)
    grade.ts                grade espacial uniforme (célula 64 px) para colisões círculo-círculo e separação
    jogador.ts              movimento, stamina, esquiva (i-frames), aparar (janela), Frascos
    armas/                  arquétipos: orbita, projetil, aura, arco, feixe, cadeia, armadilha, invocacao
    passivas.ts, unioes.ts, reliquias.ts
    inimigos/               IA por estado: perseguir, telegrafar, atacar, recuar; elites; Ecos
    chefes/                 máquina de estados por fases (JSON: limiares → padrões)
    diretor.ts              diretor de spawn por timeline (4 Horas, ondas, eventos, Fogueiras, segredos)
    progressao.ts           XP, nível, draft de 3 escolhas, slots (6 armas + 6 passivas)
    vigilia.ts              máquina de estados da partida: acender → Horas → Fogueira → Apagar | Amanhecer
    santuario/              árvore de 112 nós (grafo JSON, custos, efeitos), Ciclos, Pactos, Vigilantes/maldições, Cinzas
    salvar.ts               save versionado (localStorage + fallback IndexedDB), migrações
  cenas/                    Boot, Preload, Santuario, Vigilia, HUD (overlay), Pausa, Resultado, Dialogo
  render/                   pools de sprites, mapeamento SoA→sprite, câmera, parallax, partículas
  entrada/                  joystick virtual flutuante (polegar esquerdo), botões esquivar/aparar (direito), gestos
  audio/                    buses (música/SFX/UI), loops por região, ducking
tests/                      Vitest: lógica, integridade de dados, glossário, Phaser HEADLESS
```

## 3. Decisões de implementação

- **Passo fixo**: a cena acumula `delta` e chama `sim.passo(1/60)` n vezes; render interpola só o
  jogador e a câmera. Teto de 4 passos por frame (evita espiral da morte).
- **Entidades em SoA** (structure of arrays) com índices livres em pilha; sprites Phaser em pool
  do mesmo tamanho; `setVisible(false)` em vez de destruir. Inimigos têm **nome** (id de dado),
  nunca "tipo 1".
- **Colisão**: grade espacial reconstruída por passo (barata); círculo-círculo; separação entre
  inimigos limitada aos vizinhos da célula; projéteis consultam a grade; nada de Arcade/Matter
  para hordas (Arcade só para o jogador contra o cenário, se necessário).
- **Combate soulslike legível**: todo ataque inimigo tem `telegrafo_ms` (animação de aviso) →
  `ativo_ms` → `recuperacao_ms`; aparar acerta se o toque cai na janela `[ativo_inicio − 120 ms,
  ativo_inicio + 60 ms]` [ajustar em playtest]; esquiva = 300 ms de i-frames + 500 ms de recarga,
  custa stamina; Frascos curam e são devolvidos na Fogueira.
- **Armas** = `{arquetipo, parametros, evolucoes}`; nível da arma altera parâmetros via tabela;
  União = receita `{arma, passiva} → arma_evoluida` desbloqueada quando ambas no nível máximo.
- **Diretor de spawn**: timeline por região em JSON (`hora, t, onda|elite|evento|fogueira|segredo`)
  com orçamento de "pressão" (pontos por segundo) para a Hora; eventos (Procissão, Cerco, Revoada,
  Matilha, Chuva de Bigornas, Eclipse Pequeno) são padrões de spawn com aviso diegético.
- **Chefe** = fases com limiares de HP e padrões nomeados (JSON); A Fome Vestida de Vigilante
  reutiliza o kit do Vigilante escolhido com parâmetros invertidos.
- **Apagar**: deixa Cinzas (moeda da Vigília) no ponto de morte; recuperáveis na próxima Vigília
  da mesma região (mecânica de corpse-run) — confirmar em docs/02.
- **Santuário**: cena 2D com NPCs clicáveis, diálogo em balões (≤ 3, 2 linhas), árvore como grafo
  navegável por toque (zoom/pan), compra com Brasas, reembolso por deus; mudanças visuais do
  Santuário por nós comprados (tabela).
- **Save**: `{versao, perfil, arvore, vigilantes, feitos, estatisticas, ciclo, pactos}`; escrita
  atômica (string inteira), migração por versão, backup da última versão boa; nunca salvar no meio
  do passo de simulação.
- **Entrada**: joystick flutuante onde o polegar esquerdo tocar; dois botões grandes (≥ 64 pt) no
  canto inferior direito; swipe curto também esquiva; toques em `pointer*`; área de HUD fora das
  safe areas.
- **Render**: um atlas por categoria (inimigos, jogador, projéteis/VFX, UI, tiles) ≤ 2048² @2x;
  `BitmapText` no HUD; partículas de Phaser com teto; fundo em `TileSprite` parallax de 2 camadas;
  nada de filtros/pós-processamento no Safari.
- **Arte** (fase 6, depois da fatia vertical): visão 3/4 top-down; Vigilantes e chefes por
  **pré-render de 3D em 4 direções** (`/sprites-pre-renderizados-de-3d`), inimigos por geração 2D
  com style card; estilo pintado com contorno escuro, paleta cinza-azulada + brasa; UI com
  iconografia tipo Blasphemous (`/ui-hud-e-icones`).
- **Áudio**: loops por região com ACE-Step 1.5 em 2 camadas (calma/pressão), SFX ElevenLabs em
  famílias (aparar, esquiva, Oco, Fogueira, UI), ducking sob falas; `/audio-adaptativo-no-engine`.

## 4. Ordem de construção (fatia vertical "Primeira Vigília")

| ID | Feature | Critério verificável (resumo) |
|---|---|---|
| F-001 | Simulação em passo fixo + jogador + joystick virtual | teste: 600 passos determinísticos por seed; screenshot com jogador movendo após `--taps-game`; fps ≥ 55 |
| F-002 | Horda pooled + grade espacial + 1 inimigo (Oco das Lanternas) | teste: 300 inimigos, nenhuma alocação por passo (medida), separação sem sobreposição > 30%; fps ≥ 55 com 300 |
| F-003 | Arma automática (arquétipo arco) + XP + draft de 3 escolhas | teste: dano por tabela; draft respeita slots; screenshot do draft |
| F-004 | Esquiva com i-frames + aparar com janela + telegrafo inimigo | teste: aparar dentro/fora da janela; estado `aparou` no `__GAME_DEBUG__`; screenshot do telegrafo |
| F-005 | Diretor de spawn por timeline + 4 Horas + timer de 20 min | teste: pressão por Hora dentro do orçamento; evento "Procissão" dispara no t certo; aviso diegético |
| F-006 | Fogueira + Apagar + tela de Resultado + Cinzas | teste: descansar devolve Frascos; Apagar grava Cinzas no save; screenshot "Você se apaga." |
| F-007 | Chefe 1 (2 fases) + Amanhecer | teste: transição de fase no limiar; Amanhecer encerra a Vigília; screenshot |
| F-008 | Santuário mínimo: seleção de Vigilante, 1 NPC com 3 balões, árvore com 10 nós, compra e efeito | teste: nó comprado altera stat na próxima Vigília; save/reload; screenshot da árvore |
| F-009 | Textos pt-BR por id + validação de glossário + 3 armas/2 passivas/1 União por dados | teste de integridade referencial; glossário |
| F-010 | Playtest completo de 20 min no iPhone real + perf | relatório do playtester; fps e memória no Safari; crítico ≥ 7 |

Depois: regiões 2–6, inimigos 4–32, chefes 2–13, armas 4–38, Uniões, Relíquias, 112 nós, Pactos,
Ciclos, 12 Vigilantes, Feitos, temporadas — tudo por dados, uma feature por sessão.

## 5. Recursos a usar (nesta ordem)

- `node_modules/phaser/skills/`: `game-setup-and-config`, `scenes`, `scale-and-responsive`,
  `input-keyboard-mouse-touch`, `sprites-and-images`, `groups-and-containers`, `loading-assets`,
  `text-and-bitmaptext`, `tweens`, `particles`, `cameras`, `tilemaps`, `time-and-timers`,
  `audio-and-sound`, `v4-new-features`. (Arcade só para o jogador; hordas na grade própria.)
- Skills do projeto: `/ciclo-de-feature`, `/critico-independente`, `/playtest-automatizado`,
  `engine-web-phaser` (arquitetura, testes, performance, PWA), `/escopo-e-anti-padroes` a cada marco,
  `/direcao-de-arte-e-style-card` → `/gerar-sprites-2d` / `/sprites-pre-renderizados-de-3d` /
  `/ui-hud-e-icones` / `/cenarios-e-tilesets` / `/atlas-e-exportacao-2d-mobile`,
  `/direcao-de-audio-e-sound-bible` → `/gerar-musica` / `/gerar-sfx` / `/pos-producao-audio-mobile`,
  `/estacao-gpu-remota` para geração local, `/licencas-e-proveniencia`, `/classificacao-etaria` (12+).
- Manuais: `playbook/08` (produção Phaser), `09` (arte 2D), `10` (3D/pré-render).
- Ferramentas: Vitest 5 (lógica + Phaser HEADLESS), Playwright (`scripts/verify.sh --taps-game --seed`),
  `scripts/novo-modulo.sh`, JSON Schema (validação em teste), `comparar-screenshots.py`.

## 6. Riscos específicos e mitigação

- **Escopo**: o GDD descreve um jogo de anos; a fatia vertical de 10 features é a única meta até
  playtest real. `/escopo-e-anti-padroes` antes de cada expansão.
- **Performance de horda no Safari**: medir cedo (F-002) com 300 inimigos; se cair de 55 fps,
  reduzir teto de entidades por dado antes de otimizar código.
- **Legibilidade do aparar no toque**: telegrafos longos (≥ 400 ms) e janela generosa; ajustar por
  playtest, nunca por intuição.
- **Textos**: o roteiro é escrito à parte (prompt de escrita); o código só consome JSON por id.
- **Classificação 12+**: sem sangue detalhado; `/classificacao-etaria` antes da loja.
- **Art bible antes de qualquer sprite**; personagens por pré-render para consistência de direção.
