# Roteiro passo a passo: do zero ao jogo publicado, 100% com IA

Este roteiro cobre jogos **2D ou 3D**, para **app iOS ou web (PWA/Capacitor)**. Cada fase tem
objetivo, entradas, passos (com as skills a invocar), saídas, um **gate** que impede avançar
sem evidência, as variações por alvo e as armadilhas documentadas. As fases 0–3 são curtas
e obrigatórias; são elas que fazem a diferença entre "protótipo que o agente diz que funciona"
e "jogo que o agente viu funcionar".

```text
 0 Ambiente ─► 1 Brief ─► 2 Engine/alvo + esqueleto ─► 3 Loop de verificação
                                                              │
      ┌───────────────────────────────────────────────────────┘
      ▼
 4 Direção de arte e áudio ─► 5 Features (uma por sessão) ◄──► 6 Assets ◄──► 7 IA em runtime
                                        │
                                        ▼
                     8 Polimento, game feel, performance ─► 9 Legal/licenças/proveniência
                                                                      │
                                                                      ▼
                                                 10 Monetização, submissão, pós-lançamento
```

Tempo de referência para um solo dev com agente: fases 0–3 em 1–2 dias; 4 em 1–3 dias;
5–7 em semanas (uma feature por sessão, 2–4 sessões por dia); 8–10 em 1–2 semanas. Trate a
submissão à loja como a feature mais difícil do projeto (hackathon da RevenueCat: "building
the app is the actual easy part").

---

## Fase 0 — Preparação do ambiente

**Objetivo.** Máquina pronta para o agente construir, rodar, observar e gerar assets.

**Entradas.** Um Mac local **ou** macOS remoto para o build iOS (`/build-ios-sem-mac`); em Linux,
opcionalmente uma estação GPU por SSH (`/estacao-gpu-remota`, perfil em `07-perfil-arch-linux-e-gpu-remota.md`);
contas nas ferramentas escolhidas; este repositório.

**Passos.**
1. Instale Claude Code (ou Codex) e abra-o na raiz deste repositório. Os hooks em
   `.claude/settings.json` e os MCPs em `.mcp.json` passam a valer.
2. `/instalar-ferramentas`: detecta o sistema e instala o necessário — Xcode 26.3+ (27 para o
   loop de agente no simulador), Node, `uv`, Python; MCPs (Xcode `xcrun mcpbridge`,
   MobileBuildMCP, ios-simulator-mcp, Blender MCP, ElevenLabs); plug-ins oficiais conforme a
   engine (`/plugin marketplace add Unity-Technologies/unity-agent-plugin`,
   `/plugin marketplace add apple/game-porting-toolkit`); ferramentas MIT (gltfpack,
   glTF-Transform, pyloudnorm, PyMusicLooper, rembg/BiRefNet). Cada item com smoke test.
3. Chaves de API em variáveis de ambiente (nunca no repositório): ver
   `04-ferramentas-e-mcps.md`. Decida já quais fornecedores pagos usar (Tripo/Meshy, PixelLab,
   ElevenLabs, fal) e abra `templates/LICENCAS.md` para registrar cada um.
4. Configure o Git (branch por feature se houver mais de uma pessoa) e confirme que
   `scripts/check-skills.py` roda.
5. *Perfil Linux:* prepare a estação GPU (`/estacao-gpu-remota`: `gpu.sh status` mostrando a placa)
   e o CI macOS (`/build-ios-sem-mac`: workflow com segredos da App Store Connect API).

**Saídas.** `production/ambiente.md` (o que está instalado, versões, o que falta).

**Gate.** `.claude/skills/instalar-ferramentas/scripts/verificar-ambiente.sh` sem itens
obrigatórios faltando; `claude mcp list` mostra os servidores conectados.

**Armadilhas.** Negar acesso do agente a um projeto no Xcode 26.3 é irreversível sem Ajustes
do Sistema. Blender MCP e o MCP first-party do Unreal 5.8 não têm autenticação: só loopback.
Unity AI consome os créditos do trial em horas.

---

## Fase 1 — Conceito e brief de uma página

**Objetivo.** Um brief que cabe em uma página e que descreve um jogo que agentes conseguem
construir com qualidade hoje.

**Passos.**
1. `/brief-do-jogo`. A skill entrevista e escreve `design/game-brief.md` a partir de
   `templates/game-brief.md`: fantasia central, loop de 30 segundos, 3 pilares, público,
   dispositivo mínimo, orientação, sessão média, referência visual e sonora, intenção de
   monetização e classificação etária.
2. `/escopo-e-anti-padroes` sobre o brief. Corte o que a evidência diz que IA faz mal em
   2026: multiplayer em tempo real como MVP, 3D pesado com muitos personagens animados,
   Unreal (arquivos `.uasset` opacos ao agente), narrativa longa gerada em runtime.
   Prefira: 2D ou 3D leve, lógica definida em texto/código, testável headless, sessão curta.
3. Decida a classificação etária agora: loot boxes = 18+ no Brasil; apostas simuladas 12+/18+;
   chatbot conta no questionário. Isso muda o design, não só a ficha.

**Saídas.** `design/game-brief.md` aprovado por você.

**Gate.** O brief responde "por que um jogador abriria isto uma segunda vez?" em uma frase e
lista o que NÃO está no jogo. Rigor `minimal` por padrão: não escreva GDD de 30 páginas — o
teste cego do Game Studios mostrou que isso compra rastreabilidade, não um jogo melhor.

---

## Fase 2 — Engine, alvo e esqueleto do projeto

**Objetivo.** Escolher a pilha pelo critério certo e criar o esqueleto que o agente usará
em todas as sessões.

**Passos.**
1. `/escolher-engine-e-alvo` → `docs/decisoes/ADR-0001-engine-e-alvo.md`. Critérios, em
   ordem: (a) o agente fecha sozinho o ciclo construir → rodar → ver → ler log?; (b) cenas e
   assets são texto legível (diff)?; (c) export iOS/web maduro?; (d) IAP/ads/GameKit prontos?;
   (e) licença e custo. Matriz completa em `03-stack-por-alvo.md`.
2. `/iniciar-projeto` (se ainda não rodou) cria o esqueleto do harness da Anthropic adaptado:
   - `feature_list.json`: lista de features em **JSON** (id, título, critério de aceite
     verificável, evidência exigida, status `todo|in_progress|blocked|done`, `motivo`);
   - `progress.md`: memória entre sessões;
   - `init.sh`: sobe o ambiente do zero (instala dependências, abre simulador, etc.);
   - `production/evidencias/`, `production/criticas/`, `production/playtests/`;
   - `PROVENANCE.md` e `LICENCAS.md` a partir de `templates/`.
3. Fixe versões: engine, linguagem, pacotes. Baixe/aponte a documentação **daquela versão**
   para o agente (Godot 4.6 → 4.7 teve mais de 1.200 mudanças; o agente alucina API de
   versão errada).
4. Instale o plug-in oficial da engine e anote em `CLAUDE.md` ("Stack deste projeto") quais
   skills oficiais usar (Unity: `2d-pixel-perfect`, `manage-sprite-atlas`,
   `implement-in-app-purchases`, `levelplay-unity-integration`, `optimize-audio`…;
   Metal: skills do Game Porting Toolkit).

**Variações.**
- *2D app iOS:* SwiftUI + SpriteKit (nativo, verificável pelo MCP do Xcode; SceneKit está
  deprecado) ou Godot 4.7 GDScript (texto-first) ou Unity 6.3 LTS (quando IAP/ads/cross-platform pesam).
- *3D app iOS:* RealityKit (Apple recomenda após deprecar SceneKit) ou Unity 6.3; Metal 4
  direto só com as skills da Apple.
- *2D web:* Phaser ou PixiJS + TypeScript + Vite; PWA; Capacitor só se a loja fizer sentido (4.2/4.7).
- *3D web:* Three.js ou Babylon.js; glTF + KTX2; cuidado com memória no Safari.

**Saídas.** ADR, esqueleto, primeiro commit ("projeto inicializado").

**Gate.** `init.sh` sobe o ambiente em uma máquina limpa; `feature_list.json` tem ao menos
5 features com critério de aceite verificável; `progress.md` existe.

---

## Fase 3 — Loop de verificação (antes de qualquer gameplay)

**Objetivo.** Dar olhos ao agente: `scripts/verify.sh` constrói, roda, tira screenshot e lê o
log; o Stop hook não deixa encerrar sem evidência.

**Passos.**
1. `/montar-loop-de-verificacao`. Ela escreve/ajusta `scripts/verify.sh` (despachante) e o
   `verify.sh` da engine escolhida (`.claude/skills/engine-*/scripts/verify.sh`):
   - iOS nativo: `xcodebuild` → `xcrun simctl boot/install/launch` → `xcrun simctl io
     screenshot` → log do app; ou as ferramentas do MCP do Xcode 27 / MobileBuildMCP.
   - Godot: `godot --headless` para testes (GUT/gdUnit4) + Godot AI `project_run`,
     `editor_screenshot`, `logs_read`.
   - Unity: `-batchmode -runTests` + build iOS; MCP for Unity para screenshot/console.
   - Web: `vite preview` + Playwright com viewport de iPhone + screenshot.
2. Crie o **canal de depuração**: o jogo escreve estado relevante (cena atual, pontuação,
   posição, FPS) em log ou arquivo que o agente lê (`devicectl device copy from`, logs do
   MobileBuildMCP, `user://debug.log` no Godot). Cenas de jogo não expõem árvore de
   acessibilidade; sem esse canal, o agente só tem a imagem.
3. Rode `/playtest-automatizado` numa cena vazia para validar toques por coordenada,
   screenshot e leitura de log de ponta a ponta.
4. Conecte o CI mínimo (`/ci-xcode-cloud-fastlane`): Xcode Cloud (25 h/mês incluídas) ou
   GitHub Actions rodando `scripts/verify.sh`. *Perfil Linux:* o loop local é Godot (`xvfb-run`)
   ou Playwright; o build iOS é um job macOS por milestone (`/build-ios-sem-mac`), não por feature.

**Saídas.** `scripts/verify.sh` verde numa cena vazia; primeira pasta em
`production/evidencias/` com screenshot; CI configurado.

**Gate.** `scripts/verify.sh` sai 0 e produz screenshot + log em menos de 10 minutos.
Este gate é inegociável: todas as fases seguintes dependem dele.

---

## Fase 4 — Direção de arte e áudio

**Objetivo.** Fixar identidade antes de gerar qualquer asset, para que consistência venha de
âncoras (style card, LoRA, seeds, referências), não de prompts soltos.

**Passos.**
1. `/direcao-de-arte-e-style-card` → `design/art-bible.md` (paleta hex, traço, iluminação,
   câmera, resolução-base, proibições), `design/style-card.md` (1 página que vira prefixo de
   todo prompt), `assets/referencias/` (folhas de personagem geradas e aprovadas por você).
2. Se houver personagem recorrente ou muitos assets, `/consistencia-com-lora`: 20+ imagens
   consistentes, treino em FLUX.2 [klein] 4B (Apache 2.0) via fal, seeds fixos.
3. `/direcao-de-audio-e-sound-bible` → `design/sound-bible.md` (paleta sonora, BPM/tom por
   área, hierarquia de mix, alvo −18 LUFS / −1 dBTP, formatos).
4. `/licencas-e-proveniencia`: registre em `LICENCAS.md` cada modelo/ferramenta que será
   usado, com classe de licença; confirme por escrito o que estiver "[confirmar]"
   (ex.: PixelLab hosted, Retro Diffusion, Eleven Music "Studio Games").

**Variações.** Pixel art → `/pixel-art-pipeline` decide ferramenta (PixelLab/Retro Diffusion)
já aqui. 3D → art bible inclui orçamento de triângulos e texturas por classe de asset.

**Saídas.** Art bible, style card, sound bible, referências aprovadas, `LICENCAS.md` inicial.

**Gate.** Três assets de teste gerados com o style card passam no subagente `diretor-de-arte`
(consistência, transparência, legibilidade a 1/4 do tamanho); um loop de música e três SFX
passam no `diretor-de-audio`.

---

## Fase 5 — Produção iterativa de features (uma por sessão)

Manual específico de Phaser: `08-praticas-de-producao-web-phaser.md`; antes de escrever código de um
subsistema, leia a skill oficial correspondente em `node_modules/phaser/skills/` (28 skills do Phaser 4).

**Objetivo.** Transformar `feature_list.json` em jogo, uma feature por vez, com evidência e
crítico independente.

**Passos (por sessão).**
1. `/checkpoint-e-retomada`: lê `progress.md`, escolhe a próxima feature `todo`, marca
   `in_progress`.
2. `/ciclo-de-feature`: escreve o teste/critério → implementa com diff pequeno → roda
   `scripts/verify.sh` → grava evidência em `production/evidencias/<data>-<id>/`.
3. `/critico-independente`: o subagente `critico` (contexto limpo) nota 0–10 por critério;
   abaixo de 7, corrija e repita (limite de 3 rodadas por sessão; registre em `production/criticas/`).
4. Subagente `revisor-de-codigo` sobre o diff; corrija o que "bloqueia".
5. Marque `done` **só com evidência**; atualize `progress.md`; commit descritivo. O Stop hook
   bloqueia encerrar com `in_progress` sem evidência: se precisar pausar, marque `blocked` com `motivo`.

**Regras.** Nunca duas features na mesma sessão. Nunca "deveria funcionar". Se o diff passa de
~300 linhas ou você não consegue explicar o módulo, pare: `/escopo-e-anti-padroes`.

**Saídas.** Features `done` com evidência; histórico de críticas; commits pequenos.

**Gate (por milestone).** Vertical slice jogável do loop de 30 segundos, verificado por
`/playtest-automatizado` em dispositivo real, com nota do crítico ≥ 7 em todos os critérios.

---

## Fase 6 — Produção de assets (2D, 3D, áudio, voz)

**Objetivo.** Substituir placeholders por assets finais, com licença limpa e proveniência,
exportados para mobile.

**Passos.**
1. Derive a lista de assets das features (`asset-spec` em cada skill de domínio) e priorize o
   que aparece na primeira tela.
2. 2D (manual: `09-praticas-de-arte-2d-com-ia.md`): `/gerar-sprites-2d` (gpt-image-1.5 com
   `background: "transparent"`; Nano Banana Pro para folhas com referência; recorte BiRefNet, nunca
   o modelo padrão do rembg), `/animar-sprites` (template oficial do ComfyUI "Sprite Sheet Generator",
   PixelLab, vídeo→frames ou **pré-render de 3D** com `/sprites-pre-renderizados-de-3d` para 4/8
   direções consistentes), `/ui-hud-e-icones` (Recraft V4 Vector; nine-slice sem trim no Phaser 4),
   `/cenarios-e-tilesets`, `/atlas-e-exportacao-2d-mobile` (atlas JSON hash @2x, ≤ 64 MB por cena).
3. 3D (manual: `10-praticas-de-3d-para-jogo-web.md`): no jogo 2D, 3D serve ao **pré-render**
   (`/gerar-ativos-3d` → `/rigging-e-animacao-3d` → `/sprites-pre-renderizados-de-3d` → atlas);
   se o brief for 3D (Three.js), `/otimizar-3d-para-mobile` (glTF + KTX2 + meshopt),
   `/materiais-e-texturas-pbr`, `/ambientes-e-mundos-3d`. **Nunca Hunyuan3D** em jogo global.
4. Áudio: `/gerar-musica` (ACE-Step 1.5 com BPM/tom explícitos; Stable Audio 3; loops com
   PyMusicLooper), `/gerar-sfx` (ElevenLabs SFX v2 com `loop`; Stable Audio Small-SFX; 8–16
   candidatos por prompt), `/voz-e-dialogo` (Eleven v3/Fish S2 para falas fixas; Kokoro-82M
   on-device para texto dinâmico; consentimento escrito para voz real),
   `/pos-producao-audio-mobile` (−18 LUFS / −1 dBTP; AAC e CAF).
5. Para cada lote: subagente `diretor-de-arte` ou `diretor-de-audio` aprova; linha no
   `PROVENANCE.md` com modelo, versão, seed, prompt e **edição humana**; masters arquivados.
6. Integre e rode `scripts/verify.sh`; o crítico avalia a tela com assets reais.

**Saídas.** `assets/` final, `PROVENANCE.md` completo, atlases/LODs/áudio exportados.

**Gate.** Nenhum placeholder visível (`scan_placeholders.sh` limpo); todo asset com linha no
`PROVENANCE.md`; nenhum item da lista vermelha de `LICENCAS.md`; tamanho do bundle dentro do brief.

---

## Fase 7 — IA em runtime e conteúdo procedural (se o brief pedir)

**Objetivo.** Usar IA dentro do jogo só onde agrega, com custo zero ou previsível e sem violar
a loja.

**Passos.**
1. `/ia-runtime-nuvem-claude`: no stack web não há modelo on-device da Apple; a rota é um backend
   mínimo (Cloudflare Worker/Vercel) → Claude Haiku 5.5 com prompt caching (prefixo ≥ 512 tokens),
   saída estruturada por JSON Schema, rate limit, fallback offline com respostas pré-geradas e
   **consentimento antes da primeira transmissão**; se houver chat visível, filtro, denúncia e bloqueio.
2. Conteúdo: `/geracao-procedural-com-llm` — o LLM gera **parâmetros estruturados** validados por
   schema (Batch API em lote, −50%) que alimentam geradores determinísticos; nunca texto livre
   direto na jogabilidade.
3. NPCs: `/npc-e-dialogo-dinamico` com ficha estruturada, memória curta, fallback escrito e
   conjunto fixo de testes.
4. Custo e latência por interação medidos e registrados; a maior parte do conteúdo deve ser gerada
   offline e embarcada como JSON, não pedida em runtime.

**O que não fazer.** World models (Genie 3, Oasis, WHAMM) e NVIDIA ACE não rodam no iPhone;
middleware de NPC encolheu (Inworld virou voz; Convai sem SDK iOS). Não dependa.

**Gate.** Latência e custo por interação medidos e dentro do brief; comportamento offline
definido; consentimento e moderação implementados quando houver provedor externo.

---

## Fase 8 — Polimento, game feel, performance e acessibilidade

**Objetivo.** Levar de "funciona" para "gostoso de jogar" com medição, não impressão.

**Passos.**
1. Passe de game feel por feature visível: resposta ao toque < 100 ms, feedback (som, partícula,
   haptics via CoreHaptics), tweens, transições, tela de pausa/retomada, interrupções
   (chamada, background).
2. Subagente `engenheiro-de-performance`: MetricKit (iOS 27, frame rate Metal), Instruments,
   logs de FPS; alvo 60 fps no dispositivo mínimo; atlases ASTC; zero alocação no update;
   áudio em cache.
3. Acessibilidade mínima: toque ≥ 44pt, contraste, texto escalável, modo sem flashes, opções
   de controle; Game Controller se o brief pedir.
4. `/playtest-automatizado` com roteiro completo em 2–3 dispositivos; crítico com comparação
   cega contra o jogo de referência do brief.
5. Localização pt-BR e en em `Localizable.xcstrings` (ou equivalente); nenhum texto gerado sem revisão.

**Gate.** Crítico ≥ 8 em game feel e legibilidade; FPS e memória dentro do orçamento em
dispositivo real; zero crash em 30 min de playtest.

---

## Fase 9 — Legal, licenças, proveniência e divulgação

**Objetivo.** Garantir que o jogo pode existir em todos os países onde será vendido e que a
intervenção humana está documentada.

**Passos.**
1. `/licencas-e-proveniencia`: `LICENCAS.md` cobre toda ferramenta/modelo/versão; nenhum
   item vermelho; `PROVENANCE.md` completo (é a prova de seleção/edição humana que gera
   direito autoral nos EUA — Copyright Office Parte 2, Thaler — e no Brasil — Lei 9.610 art. 11).
2. `/divulgacao-de-uso-de-ia`: texto específico (o que foi gerado, o que foi revisado) para
   loja, créditos e site; HIG da Apple ("Clearly identify when and where you use AI"); EU AI
   Act Art. 50 se distribuir na Europa.
3. `/privacidade-lgpd-e-eca-digital`: fluxos de dados mapeados; `PrivacyInfo.xcprivacy`;
   labels; LGPD e ECA Digital (menores, design enganoso); ATT se houver ads.
4. `/classificacao-etaria`: questionário coerente (loot boxes, apostas simuladas, chatbot,
   redes sociais); Brasil: loot box = A18.
5. Varredura de marcas/semelhanças em todos os assets (4.1(c), 5.2.1).

**Gate.** Subagente `revisor-de-loja-e-legal` devolve "Pronto para enviar" com evidência por item.

---

## Fase 10 — Monetização, submissão e pós-lançamento

**Objetivo.** Publicar e manter.

**Passos.**
1. `/monetizacao-iap-e-ads`: StoreKit 2 (ou `apple/unityplugins`, RevenueCat), ads (LevelPlay
   via skill oficial da Unity, AdMob); sandbox; restauração; expectativa realista (o único
   jogo 100% IA com receita documentada caiu de US$ 1M para US$ 144K ARR; vários faturaram
   centavos).
2. App: em Linux, primeiro `/build-ios-sem-mac` (export, assinatura e upload no runner macOS);
   depois `/submissao-app-store` (skill manual): metadados, screenshots, pré-visualização,
   TestFlight externo, checklist 4.3(b)/4.2/2.1(a)/4.1(c)/5.2.1/5.1.2(i)/4.7, idade,
   privacidade. Web: `/publicar-jogo-web` (PWA, itch.io com tags de IA, portais, Steam com
   disclosure específica).
3. Pós-lançamento: `/pos-lancamento-e-telemetria` — MetricKit/Organizer/Sentry → crash vira
   feature em `feature_list.json` → `/ciclo-de-feature`; day-one patch; monitorar reviews e
   reação à divulgação; retrospectiva em `production/post-mortem.md`.

**Gate final.** Build aprovado na loja (ou publicado na web), telemetria recebendo dados,
checklist de release arquivado em `production/releases/<versao>/`.

---

## Cadência recomendada

- **Sessão (1–3 h):** uma feature, evidência, crítico, commit, checkpoint.
- **Dia:** 2–4 sessões; a última atualiza `progress.md` e revisa `feature_list.json`.
- **Semana:** playtest em dispositivo real; passe do `engenheiro-de-performance`; revisão de
  `LICENCAS.md` (ferramentas mudam); poda de escopo.
- **Milestone:** vertical slice → alpha (todas as features) → beta (assets finais, TestFlight
  externo) → release.
