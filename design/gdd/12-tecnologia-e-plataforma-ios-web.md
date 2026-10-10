# 12 · Tecnologia e Plataforma — Jogo Web para iOS

> Documento de planejamento técnico (sem código). Define o que o Safari/WebKit do iPhone permite, as restrições que precisam estar no design desde o dia 1, a recomendação de engine e a estratégia de distribuição. Baseado em pesquisa feita em outubro de 2026 (fontes no documento 16).

---

## 1. Decisão de plataforma

| Decisão | Escolha | Por quê |
|---|---|---|
| Alvo primário | **iPhone, Safari (iOS 17+), instalado na Tela de Início como web app** | No iOS 26 toda página adicionada à Tela de Início abre como app standalone por padrão, sem manifest obrigatório. Isso resolve barra de endereço, pull-to-refresh e dá cota de armazenamento própria. |
| Alvo secundário | Android Chrome, desktop (Poki / CrazyGames / itch.io) | Mesma build; só muda a camada de input e anúncios. |
| Orientação | **Retrato, uma mão** | Vampire Survivors mobile abre em retrato por padrão e foi elogiado como "perfeito para jogar com um polegar". O iPhone não tem orientation lock na web, então projetar para retrato elimina o problema. |
| Renderização | **WebGL2 como caminho principal, WebGPU opt-in por aparelho** | WebGPU está ligado no Safari 26 (iOS 26, iPhone 11+), mas teve bugs nas versões 26.0 e 26.2. WebGL2 existe desde o iOS 15. |
| Frame rate alvo | **60 fps**, simulação em timestep fixo | `requestAnimationFrame` no iPhone é travado em 60 fps mesmo em telas ProMotion; em Low Power Mode cai para 30. A lógica do jogo não pode depender do rAF. |
| Save | **IndexedDB local + sincronização em nuvem** | O Safari apaga storage de abas sem interação por 7 dias (ITP). Web apps instalados têm contador próprio, mas o save local é tratado como cache. |

## 2. Restrições do iOS que moldam o design (lista obrigatória)

Cada item desta lista tem um dono no design, não só na engenharia.

### 2.1 Tela e viewport
- **Sem Fullscreen API no iPhone.** Solução: web app na Tela de Início + `viewport-fit=cover`. A UI respeita `safe-area-inset` (notch, Dynamic Island, barra inferior). O joystick e os botões ficam acima do home indicator.
- **Altura de tela instável** (barra de endereço aparece/some). Usa-se `100dvh`, nunca `100vh`. O HUD é ancorado nos cantos, nunca em pixels absolutos.
- **Pull-to-refresh não é desativável por CSS** no Safari. Precisa de interceptação de `touchmove` em listener não passivo + `touch-action: none` + `-webkit-touch-callout: none` + `user-select: none`. Em modo standalone o problema some.
- **Tamanho de canvas fixo.** Redimensionar o canvas repetidamente vaza memória no iOS Safari. O jogo renderiza em resolução interna fixa e escala.
- **Resolução interna limitada a 2× (devicePixelRatio ≤ 2).** iPhones têm DPR 3; renderizar em 3× triplica o fill rate sem ganho visível em pixel art.

### 2.2 Memória (o risco número 1)
- O processo da aba é **morto sem aviso** (jetsam) quando passa do limite de memória sob pressão. Não há evento em JavaScript. Depois disso o Safari recarrega a página; se repetir, mostra "ocorreu um problema repetidamente".
- Limites não são documentados pela Apple; relatos comunitários ficam entre 256 e 400 MB em iPhones antigos.
- **Orçamento do projeto:** máximo de **150 MB** de uso total de memória em iPhone 11/12, medido no Safari Web Inspector. Atlases de **2048×2048** (não 4096), no máximo 6 atlases carregados por mapa. Zero alocação por frame no loop de simulação (pools pré-alocados para inimigos, projéteis, partículas, números de dano).
- **Autosave a cada 60 s e ao abrir cada Fogueira**, porque a aba pode morrer a qualquer momento. O design de Vigília precisa tolerar "voltar da última Fogueira" como estado válido.

### 2.3 Áudio
- Web Audio só desbloqueia após um gesto do usuário (`touchend` é o evento confiável). Toda sessão começa com tela **"Toque para acender a Chama"**, que serve como desbloqueio de áudio e tema.
- A **chave física de silêncio** muta o áudio e não há API para detectar. Truque conhecido: tocar um `<audio>` em loop silencioso no primeiro gesto muda a sessão para "playback", ignorando a chave. É um hack não documentado: precisa de teste em aparelho real a cada versão do iOS.
- Ligações telefônicas colocam o contexto em "interrupted": o jogo deve **pausar automaticamente** e retomar o áudio quando o estado voltar.

### 2.4 Haptics
- **Não existe Vibration API no iOS.** Existe um truque (checkbox `switch` dentro de `label` disparando `click()`) que gera um tique háptico em iOS 18+, com relatos de que pode ser removido. O design trata haptics como **bônus opcional**, nunca como feedback principal. Aparo, esquiva perfeita e quebra de postura precisam de feedback visual e sonoro suficientes sem vibração.

### 2.5 Persistência e PWA
- Cota de storage por origem no Safari 17+: até 60% do disco em apps-navegador. Web apps da Tela de Início recebem a mesma cota. Mais que suficiente.
- **Web Push e Badge** existem desde o iOS 16.4, mas **só para web apps instalados**. O jogo pede instalação após a primeira Vigília concluída, com o argumento "para guardar sua Brasa e receber o desafio diário".
- **Screen Wake Lock não funciona em modo standalone** no iOS. Fallback: vídeo invisível em loop (`playsinline`). Sem isso a tela apaga no meio da Vigília se o jogador parar de tocar (improvável no gênero, mas acontece em menus de level up longos).
- **SharedArrayBuffer exige isolamento cross-origin**, incompatível com iframes de anúncios de portais. Portanto: **simulação em Web Worker com `postMessage` de TypedArrays transferíveis**, sem memória compartilhada. Godot adotou single-thread por esse mesmo motivo.

### 2.6 Input
- Gamepad API funciona (Backbone, Kishi) desde o iOS 10.3, sem haptics. Suporte a controle é um "nice to have" para a versão de desktop/portal.
- Bugs documentados de supressão de `touchmove` após double-tap rápido: o joystick precisa tolerar perda de eventos (reposicionar no próximo `touchstart`).

## 3. Engine recomendada

### 3.1 Comparativo resumido

| Engine | Vantagens para este jogo | Desvantagens |
|---|---|---|
| **PixiJS 8** | Renderer puro, batching até 16 texturas por batch; Bunnymark 100k sprites ~15 ms CPU (desktop); WebGPU opcional com fallback WebGL2; bundle pequeno. Projeto open-source *swarmr* prova 2.500 inimigos com ~2 ms de lógica por frame usando pools SoA e spatial hash. | Não traz cena, áudio, input, física: é preciso escrever ou agregar. |
| **Phaser 4 "Caladan"** (abril/2026) | Framework completo; renderer Beam; `SpriteGPULayer` desenha um milhão de sprites estáticos em um draw call (ótimo para cenário e decals, não para inimigos que mudam a cada frame). Vampire Survivors nasceu em Phaser 3. | Mais overhead por objeto; benchmarks de terceiros dão ~2× de vantagem ao Pixi em cenas com muitos sprites. |
| Godot 4 web | Engine completa; export single-thread roda em iOS e portais. | WASM pesado, heap fixo, documentação admite que "export nativo sempre performa melhor por margem significativa", Safari com problemas em WebGL2. |
| Unity Web | Suporte oficial a iOS Safari 15+. | Heap não cresce no iOS, crashes aleatórios no iOS 18, build enorme. Péssimo custo/benefício para jogo web casual em iPhone. |
| Babylon / Three / PlayCanvas | Fortes em 3D e instancing. | Só se o jogo fosse 2.5D. Não é o caso. |
| Construct 3 / Defold / Kaplay / Excalibur | Builds pequenas (Defold ~1,1 MB), SDKs de portal prontos. | Menos controle de alocação (Construct), comunidade menor (Defold), sem dados de performance em escala (Kaplay/Excalibur). |

### 3.2 Recomendação
**PixiJS 8 + simulação própria em TypeScript (ECS/SoA) rodando em Web Worker.** Phaser 4 é a alternativa aceitável se a equipe priorizar velocidade de desenvolvimento e aceitar um teto um pouco menor de inimigos.

Lição direta de Vampire Survivors: foi feito em Phaser 3, e migrou para Unity em 2023 por performance e suporte multiplataforma, com a primeira versão nova rodando ~10× mais rápido. Como este projeto é **web por definição**, a resposta não é trocar de engine, e sim limitar a escala desde o design: ver orçamentos abaixo.

## 4. Orçamentos de performance (metas de design, não de engenharia)

| Métrica | Alvo iPhone 11/12 | Alvo iPhone 14+ |
|---|---|---|
| Inimigos simultâneos na tela | **300** | **500** |
| Inimigos simulados (incluindo fora da tela) | 600 | 1.000 |
| Projéteis/efeitos simultâneos | 400 | 800 |
| Partículas | 300 | 600 |
| Tempo de CPU por frame (sim + render) | < 10 ms | < 8 ms |
| Memória total | < 150 MB | < 200 MB |
| Tamanho do download inicial | < 15 MB (um mapa, 4 personagens) | — |
| Tamanho total com todos os assets | < 60 MB, carregado por mapa | — |

Esses números são deliberadamente abaixo de Vampire Survivors em PC. O design compensa com inimigos maiores e mais lentos que no VS, com Uniões que convertem quantidade em efeitos de área (menos objetos, mais impacto) e com a camada soulslike (aparo, esquiva, chefes) que dá intensidade sem contagem de sprites.

### 4.1 Regras de design derivadas
1. **Toda habilidade tem teto de efeitos por acerto.** Uma União que atinge 300 inimigos não pode criar 300 partículas. Máximo: 12 partículas por evento, com fusão ("um impacto grande" em vez de muitos pequenos).
2. **Inimigos "massa" compartilham uma única animação de 4 frames.** Variedade visual vem de paleta e silhueta, não de frames.
3. **Degradação graciosa automática:** se o frame time passar de 16 ms por 2 s, o jogo reduz partículas → reduz sombras → reduz inimigos visíveis convertendo-os em "névoa" com dano agregado (mecânica narrativa: "a Fome engrossa").
4. **Nenhum mapa infinito real.** Mapas têm 3×3 telas com wrap visual (como VS), reduzindo custo de tiles.

## 5. Distribuição e monetização (resumo técnico; estratégia completa no documento 09)

| Canal | Como | Observação técnica |
|---|---|---|
| **PWA próprio (vigiliadascinzas.app)** | Safari → Tela de Início | Pagamentos via **Stripe + Apple Pay na web** (Apple Pay JS funciona em Safari para bens digitais no seu site, sem comissão da App Store). Sign in with Apple JS para conta. |
| **Poki / CrazyGames** | SDK do portal | Poki exige `commercialBreak()` antes de cada início de gameplay e proíbe timers internos de anúncio; rewarded via `rewardedBreak()`. CrazyGames tem módulo de dados de 1 MB por usuário com sync entre dispositivos. |
| **Telegram Mini App** | HTML5 puro | Telegram passou de 1 bi de usuários mensais em 2025. Pagamentos em Stars, saque em TON. Alcance enorme, monetização fraca. |
| **Discord Activities** | Embedded App SDK | IAP via SKUs/entitlements; aberto a todos os devs desde setembro de 2024. |
| **YouTube Playables** | Formulário de interesse (early access) | Aceita Phaser/PixiJS. 50+ mercados. |
| **App Store via Capacitor** (fase 2, opcional) | Empacotar o jogo inteiro no binário | Risco real de rejeição pela diretriz 4.2 (funcionalidade mínima) se parecer "site embrulhado". Mitigação: Game Center, haptics nativos, StoreKit, assets locais. Só vale a pena depois que a versão web provar retenção. |

Anúncios: **Google H5 Games Ads** (interstitial e rewarded via Ad Placement API, acesso por aplicação) ou SDK do portal. eCPM de rewarded em iOS fica entre US$ 10 e 20 segundo vendedores, com 80 a 90% de conclusão. Cadência inicial sugerida pela indústria: 3 a 4 interstitials e 2 a 3 rewarded por usuário por dia. Para este jogo: **nenhum interstitial dentro da Vigília**; só rewarded (reviver, dobrar Almas, reroll extra) e um interstitial opcional ao voltar ao Santuário após Apagar.

## 6. Saves e contas

- **Local:** IndexedDB com snapshot em localStorage; versão de schema no save; migração automática.
- **Nuvem:** Supabase (Postgres com RLS por usuário) ou PlayFab. Firebase é alternativa com offline embutido. Decisão final na pré-produção; o design só exige: login opcional, merge de saves por "maior progresso vence por campo", e nunca bloquear o jogo por falta de rede.
- **Login:** Sign in with Apple (web) + e-mail mágico. Sem Game Center (não existe na web).
- **Anti-cheat:** save assinado pelo servidor (HMAC com chave do servidor), validação de plausibilidade (Almas ganhas ≤ máximo possível por minuto × duração), rankings server-authoritative com seed + replay de inputs para desafios diários. Checksum local serve só contra corrupção.

## 7. Pipeline de assets (restrições para arte e áudio)

| Asset | Formato | Limite |
|---|---|---|
| Sprites | PNG em atlas 2048², pixel art 32×32 (massa) / 48×48 (elites) / 96 a 160 px (chefes) | 6 atlases por mapa |
| Tiles de mapa | Tileset 16×16 em atlas próprio | 1 atlase por mapa |
| UI | SVG para ícones estáticos, atlas para animados | 1 atlas |
| Música | OGG/Opus + fallback AAC (Safari) | 2 a 3 min em loop, < 2 MB por faixa |
| SFX | AAC/MP3 curto, sprite de áudio único por mapa | < 1,5 MB por mapa |
| Fontes | 1 fonte pixel (latim completo com acentos) + 1 fonte de leitura | WOFF2 |

## 8. Riscos técnicos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Jetsam mata a aba em iPhones antigos | Alta | Alto | Orçamento de 150 MB, autosave em Fogueira, degradação graciosa |
| Chave de silêncio muta o jogo e o jogador acha que está quebrado | Alta | Médio | Hack de "unmute" + ícone visível de áudio + aviso na primeira tela |
| WebGPU com bugs em versões específicas do iOS | Média | Médio | WebGL2 padrão, WebGPU por lista de permissão |
| Save local apagado após 7 dias (aba do Safari) | Média | Alto | Pedir instalação na Tela de Início + sync em nuvem |
| Rejeição na App Store (fase 2) | Alta | Baixo (é opcional) | Só tentar com features nativas reais |
| Portais exigirem mudanças no fluxo de anúncios | Média | Baixo | Camada de "AdProvider" abstrata no design: todo ponto de anúncio é um evento nomeado |
