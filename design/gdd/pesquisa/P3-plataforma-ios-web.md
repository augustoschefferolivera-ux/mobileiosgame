# P3 · Pesquisa: jogo web mobile (HTML5/PWA) survivor-like para iPhone — estado em 2025-2026

> Relatório de pesquisa (outubro de 2026). Fontes no documento 16. Recomenda-se confirmar o post oficial "WebKit Features in Safari 26.0" e os termos de receita dos portais antes de decisões contratuais.

## Resumo executivo

Construir um survivor-like (centenas de inimigos) como jogo web para iPhone é viável em 2025-2026, mas o Safari/WebKit impõe restrições que precisam estar no design desde o início. O cenário mudou favoravelmente: WebGPU chegou ao iOS 26 (set/2025), toda página adicionada à Tela de Início abre como web app, Web Push/Badging existem desde o iOS 16.4, e a cota de armazenamento foi ampliada no Safari 17. Permanecem sem solução: Fullscreen API no iPhone, Vibration API, orientation lock, rAF travado em 60 fps e o risco de o processo ser morto por memória (jetsam) sem aviso.

Engine recomendada para 2D com milhares de sprites: PixiJS 8 (renderer puro, batching eficiente, WebGL2 padrão com WebGPU opcional) ou Phaser 4 (framework completo, lançado em abril/2026). Godot 4 web e Unity Web funcionam no iOS mas com custo de memória e tamanho alto demais. A arquitetura (pools, SoA, spatial hash, timestep fixo) importa mais que a engine: o projeto open-source swarmr (PixiJS + TS) reporta ~2 ms de lógica por frame com 2.000+ inimigos.

Distribuição: portais (Poki, CrazyGames) + canais embutidos (Telegram Mini Apps, Discord Activities, YouTube Playables) para audiência; anúncios rewarded/interstitial via SDK do portal ou H5 Games Ads; PWA próprio com pagamentos web (Stripe/Apple Pay JS) fora da App Store. Empacotar com Capacitor para a App Store é possível, mas sujeito a rejeição por 4.2.

## 1. Capacidades e limites do Safari/WebKit

**Gráficos.** WebGL2 desde o iOS 15. WebGPU ligado por padrão no Safari 26 (iPhone 11+), com bugs iniciais nas versões 26.0.1 e 26.2. PixiJS 8 suporta WebGPU mas usa WebGL por padrão. Recomendação: WebGL2 principal, WebGPU opt-in por aparelho. MAX_TEXTURE_SIZE em iPhones ≥ 4096; devs relatam micro-stutters com atlases 4096 em aparelhos antigos e preferem 2048.

**Memória (jetsam), o risco número 1.** O processo WebContent é morto quando cruza um soft limit sob pressão; o Safari recarrega e, se repetir, mostra "ocorreu um problema repetidamente". Bug WebKit de 2025 descreve páginas WebGL pesadas em loop de reload e confirma que nenhum erro OOM é exposto ao JS. Limites de fórum: 256 a 400 MB em iPhones antigos; não documentados. Unity relata que o heap WASM não cresce no iOS. Redimensionar canvas repetidamente vaza memória.

**Áudio.** Web Audio só desbloqueia em gesto (touchend confiável). A chave de silêncio muta a sessão "ambient" e não há API para detectar; hack (lib unmute): tocar um `<audio>` em loop silencioso no primeiro gesto muda para sessão "playback". Ligações colocam o contexto em "interrupted".

**Viewport, fullscreen, safe areas.** Sem Fullscreen API no iPhone; usar viewport-fit=cover + safe-area-inset e 100dvh. overscroll-behavior não desabilita pull-to-refresh no iOS (bugs abertos); solução: touchmove com preventDefault em listener não passivo + touch-action: none. Pull-to-refresh não ocorre em standalone. Bugs de supressão de touchmove após double-tap.

**Frame rate, bateria, térmico.** rAF em 60 fps mesmo em ProMotion (flag de usuário; sem API para 120 Hz). Low Power Mode derruba para 30 fps. Throttling térmico invisível na web: medir dt real e reduzir carga.

**PWA / Home Screen (iOS 26).** Toda página adicionada abre como web app standalone por padrão. Web Push + Badging desde 16.4, só para instalados e após gesto. Armazenamento: Safari 17 removeu o teto de 1 GB; cota até 60% do disco; web apps da Tela de Início recebem a mesma cota. ITP apaga storage de abas sem interação por 7 dias; web apps têm contador próprio. Screen Wake Lock não funciona em standalone (fallback: vídeo loop invisível). Orientation lock não suportado. Gamepad API desde 10.3, sem haptics. Haptics: truque do checkbox switch (iOS 18+), pode sumir. OffscreenCanvas WebGL desde Safari 17. SharedArrayBuffer exige COOP/COEP, incompatível com iframes de anúncios (por isso Godot 4.3 adotou single-thread).

## 2. Engines

| Engine | Fortes | Fracos |
|---|---|---|
| PixiJS 8 | Renderer puro; batching até 16 texturas; Bunnymark 100k sprites ~15 ms CPU (desktop); WebGPU opcional; bundle pequeno; swarmr prova 2.500 inimigos | Sem física/áudio/cena |
| Phaser 4 (abr/2026) | Framework completo; renderer Beam; SpriteGPULayer desenha 1 M sprites estáticos em um draw call (bom para cenário, não para inimigos); VS nasceu em Phaser 3 | Mais overhead por objeto; ~2× menos throughput que Pixi em benchmarks de terceiros |
| Babylon/Three | InstancedMesh | Engines 3D |
| PlayCanvas | WebGPU maduro | Foco 3D |
| Godot 4 web | Completa; single-thread roda em iOS/portais | WASM pesado; "export nativo sempre performa melhor"; Safari com problemas WebGL2 |
| Unity Web | Suporte oficial iOS 15+ | Heap fixo; crashes no iOS 18; build grande |
| Construct 3 / Defold / Kaplay / Excalibur | Builds pequenas, SDKs de portal | Menos controle / comunidade menor |

Recomendação: PixiJS 8 + simulação própria (ECS/SoA) para máximo de sprites com GC previsível; Phaser 4 se o time preferir velocidade de desenvolvimento. Em ambos: atlas 2048, pools pré-alocados, zero alocação por frame, antialias off, resolution ≤ 2.

## 3. Distribuição e monetização

**App Store (Capacitor/PWABuilder).** Guideline 4.2: rejeições recorrentes para "WKWebView carregando URL remota", mesmo com plugins nativos. Mitigação: empacotar o jogo no binário, Game Center, haptics nativos, IAP via StoreKit. Guideline 4.7 (2024) permite mini games HTML5 dentro de apps. Epic v. Apple (2025): sem comissão em links externos nos EUA para apps nativos; um PWA puro fica fora disso.

**Pagamentos web.** Apple Pay JS e Payment Request API funcionam no Safari para bens digitais no seu site; Stripe suporta. Um PWA pode vender sem comissão da Apple.

**Anúncios HTML5.** Google H5 Games Ads (interstitial e rewarded via Ad Placement API, acesso por aplicação). Poki SDK: commercialBreak() antes de cada gameplay, sem timers internos; rewardedBreak(); 100% da receita em tráfego próprio, 50/50 em tráfego do Poki; 625 M jogadores em 2025. CrazyGames: ads midgame e rewarded; módulo de dados 1 MB por usuário com sync. Outros: AdInPlay, GameMonetize, Playgama. Referências (vendor): rewarded iOS eCPM US$ 10 a 20, conclusão 80 a 90%; cadência inicial sugerida 3 a 4 interstitials e 2 a 3 rewarded por usuário/dia. "Os melhores estúdios no Poki ganham até €1 M/ano; a mediana é muito menor."

**Canais embutidos.** Telegram Mini Apps (1 bi MAU em 2025; Stars; saque via TON; Hamster Kombat 239 M usuários autodeclarados). Discord Activities (aberto a todos desde set/2024; IAP via SKUs). YouTube Playables (early access; Phaser/PixiJS aceitos; 50+ mercados). Facebook Web Games encerram em set/2026. TikTok em testes. itch.io/Newgrounds para validação.

## 4. Saves

IndexedDB + snapshot em localStorage; nunca confiar na persistência de 7 dias em aba; incentivar instalação. Nuvem: Supabase (RLS por usuário), Firebase (offline embutido), PlayFab, Nakama. Sign in with Apple JS exige Services ID e validação de JWT no backend. Game Center não existe na web. Anti-cheat: HMAC só com chave no servidor; servidor assina o estado; leaderboards server-authoritative com seed + replay.

## 5. UX mobile

VS mobile abre em retrato por padrão ("perfeito para um polegar"). Brotato mobile: uma mão, auto-aim. Thumb zone: 49% usam uma mão; zona verde centro-inferior. Joystick flutuante: aparece onde toca, deadzone 0,1 a 0,2, base ~120 a 140 px em 1080p. Sessão: runs de 20 a 30 min em VS; para web/portal preferir runs mais curtas com interstitial só em pausas naturais. Mobile-web: botão "toque para iniciar" (áudio), overlay de orientação, convite a instalar.

## 6. Performance

swarmr: 2.500 inimigos, ~2 ms de lógica/frame com timestep fixo, pools SoA, spatial hash. PixiJS v8 Bunnymark 100k sprites ~15 ms CPU (desktop). Alvo realista para iPhone 12 a 15 em WebGL2: 1.000 a 3.000 sprites animados + projéteis a 60 fps com CPU < 8 ms e sem alocações por frame. Colisão: grade uniforme sofre com aglomeração; alternativa é hash de coordenadas em array 1D. Limitar efeitos por hit. Workers com postMessage de TypedArrays transferíveis (sem SAB). Memória: atlases 2048, canvas fixo, resolution ≤ 2.

**Lição Vampire Survivors:** feito em Phaser 3 (2020-21); migrou para Unity em 2023 por suporte multiplataforma, performance (primeira versão nova "~10× mais rápida"), multi-core e correções de WebGL; Galante segue recomendando Phaser para prototipar rápido. Megabonk é Unity, PC-only.
