---
name: monetizacao-iap-e-ads
description: >
  Implementa e testa a monetização de um jogo mobile feito com IA: compras in-app
  (StoreKit 2 nativo, apple/unityplugins ou RevenueCat), anúncios (LevelPlay via skill
  oficial da Unity, AdMob no nativo) e a escolha do modelo para o primeiro título
  (grátis + anúncios recompensados + IAP leve), respeitando as regras da App Store e do
  Brasil (loot boxes = A18, apostas exigem licença da SPA). Use sempre que o usuário
  falar em cobrar, vender moedas, remover anúncios, assinatura, vídeo recompensado,
  "ganhar dinheiro com o jogo", preço por país ou restaurar compras. Não use para
  responder o questionário etário (classificacao-etaria) nem para preencher a ficha
  da loja (submissao-app-store).
license: MIT
compatibility: "Claude Code ou Codex; macOS + Xcode 27 para testar StoreKit no simulador; Unity 6 para as skills oficiais"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app, web]
  fase: [5, 10]
argument-hint: "[modelo: ads|iap|hibrido] [engine: swift|unity|godot|capacitor]"
disable-model-invocation: false
user-invocable: true
---

# Monetização: IAP e anúncios

Entrega um fluxo de compra/anúncio funcionando no simulador ou dispositivo, com restauração de compras, preços por região configurados e evidência gravada em `production/evidencias/<data>-monetizacao/` (screenshots da compra em sandbox, log de transação, vídeo do anúncio recompensado).

## Quando usar / quando não usar

Use quando o brief (fase 1) ou `feature_list.json` tiver uma feature de receita: "remover anúncios", "pacote de moedas", "passe", "assinatura", "vídeo por vida extra". Use também antes da submissão (fase 10) para revisar se cada produto existe no App Store Connect e foi testado em sandbox.

Não use para: classificação etária (`/classificacao-etaria`), rótulos de privacidade e ATT (`/privacidade-lgpd-e-eca-digital`), ficha da loja (`/submissao-app-store`), monetização de versão web/PWA fora da App Store (`/publicar-jogo-web`).

## Pré-requisitos

- Conta no Apple Developer Program com Agreements, Tax and Banking preenchidos (sem isso os produtos IAP não ficam "Ready to Submit").
- Engine definida (fase 2). Para Unity: plug-in oficial `Unity-Technologies/unity-agent-plugin` instalado (ver `/instalar-ferramentas`), que traz as skills `implement-in-app-purchases` e `levelplay-unity-integration`.
- Para Swift nativo: Xcode 27 (macOS 26.6+, Apple silicon) com arquivo de configuração StoreKit (`.storekit`) para teste local.
- Opcional: conta RevenueCat (SDKs iOS, Unity e Capacitor); conta AdMob ou LevelPlay (ironSource). Preços e tiers gratuitos mudam: verifique em `revenuecat.com/pricing` e nas páginas oficiais antes de prometer custo zero [não lidos nesta pesquisa].

## Entradas

- `design/brief.md`: público, faixa etária pretendida, países de lançamento.
- `feature_list.json`: features de monetização com ID e estado.
- `design/economia.md` (se existir): moedas, sinks, preços pretendidos em BRL e USD.
- Resposta de `/classificacao-etaria` se o jogo tiver loot boxes ou apostas simuladas (muda a faixa no Brasil).

## Passos

1. **Escolher o modelo** (gravar em `design/monetizacao.md`). Para o primeiro título recomendamos: jogo grátis + anúncio recompensado opcional (vida extra, dobrar moedas) + 1 a 3 IAP não consumíveis ("remover anúncios", pacote cosmético). Expectativa realista, com fonte: fly.pieter.com (vibe coded) foi de US$ 1 M ARR autodeclarado em março/2025 para US$ 144 K ARR em maio/2025, com receita de compras de aeronaves e anúncios; "Spell Cascade" (100% código por Claude Code) faturou US$ 4,99 em 30 dias; a Appfigures (set/2025) não achou app "vibe coded" com downloads notáveis e poucos com receita. Trate o primeiro título como validação, não como renda.
2. **Checar as regras que mudam o design** (detalhes em `references/regras-loja-e-brasil.md`):
   - Loot boxes/itens aleatórios pagos: a tabela da Apple fixa **A18 no Brasil** (9+ global). Se o público-alvo é menor de 18, remova a aleatoriedade paga ou aceite A18. Divulgue probabilidades antes da compra (exigência da seção 3.1.1 das Guidelines [texto não citado nas notas; confirmar na página]).
   - Apostas simuladas (caça-níquel, roleta como minijogo): A12 se infrequente, A18 se frequente, no Brasil.
   - Apostas com dinheiro real: desde 08/05/2026 só com licença da Secretaria de Prêmios e Apostas (Portaria 1.231/2024); responder "Yes" a gambling define A18 no Brasil. Para este banco de skills: **não implemente**.
   - Bens digitais consumidos no app passam pelo IAP da Apple (seção 3.1 das Guidelines). Pagamento externo (Stripe) só na versão web ou onde as regras regionais permitirem [confirmar texto vigente].
   - Promo codes de IAP deixaram de ser criados a partir de 26/03/2026 (Apple Developer News, 29/10/2025); planeje promoções com ofertas (introductory/promotional offers) ou preços regionais.
3. **Criar os produtos no App Store Connect**: um Product ID por item (`com.estudio.jogo.remover_anuncios`), tipo correto (consumível, não consumível, assinatura), nome e descrição localizados em pt-BR e en-US, screenshot de revisão. Defina o preço pelo país-base e revise a equalização automática para BRL em "Pricing and Availability". Anote os IDs em `design/monetizacao.md`.
4. **Implementar por engine** (código e passos completos em `references/implementacao-por-engine.md`):
   - **Swift/SpriteKit/RealityKit**: StoreKit 2 (`Product.products(for:)`, `product.purchase()`, listener de `Transaction.updates`, `Transaction.currentEntitlements`, `AppStore.sync()` para o botão "Restaurar compras"). Nomes de API conforme a documentação StoreKit 2 [página não lida nesta pesquisa; confirme em developer.apple.com/documentation/storekit].
   - **Unity**: invoque a skill oficial `implement-in-app-purchases` (Unity IAP v5: fluxo Pending → Confirm, restauração, migração de RevenueCat/StoreKit nativo, D2C via Stripe/Coda). Alternativa Apple-only: plug-in StoreKit de `apple/unityplugins` (Apache-2.0; os plug-ins novos exigem Xcode 27, Python 3 e Unity 2022 LTS+; mínimo iOS 15.6).
   - **Godot**: não há skill oficial; use um plug-in iOS de in-app purchase da comunidade e marque como "não verificado" na `LICENCAS.md`.
   - **Capacitor/web wrapper**: RevenueCat Capacitor SDK [não lido; confirmar pacote e versão em revenuecat.com/docs].
   - **RevenueCat** (qualquer engine): centraliza entitlements e recibos e evita servidor próprio. Hackathon interno da RevenueCat sobre apps "vibe coded": "building the app is the actual easy part"; quase nenhum passou na primeira submissão.
5. **Anúncios**:
   - **Unity**: invoque `levelplay-unity-integration` (pergunta objetivo revenue/UX/balanced, instala "Ads Mediation", configura rewarded/interstitial/banner, ATT e GDPR, Test Suite). Não descreva mediadores concorrentes dentro dela.
   - **Swift nativo**: Google Mobile Ads SDK (AdMob) [documentação não lida; confirme em developers.google.com/admob/ios]. Use apenas o formato recompensado + um interstitial em transição natural; nada em cima do gameplay.
   - Qualquer SDK de anúncio: pedir ATT antes de carregar anúncios personalizados, declarar coleta nos rótulos de privacidade e no privacy manifest (`/privacidade-lgpd-e-eca-digital`). Apps na Kids Category têm restrições adicionais a anúncios de terceiros.
6. **Restauração e casos de borda**: botão "Restaurar compras" visível nas Configurações; tratar compra interrompida, Ask to Buy (deferred: não entregue até aprovar), reembolso (revogar entitlement), troca de Apple Account, offline.
7. **Testar em sandbox** (roteiro em `references/implementacao-por-engine.md`): (a) arquivo `.storekit` no simulador: compra, cancelamento, falha de rede, "Ask to Buy", reembolso simulado; (b) Sandbox Apple Account em dispositivo real; (c) TestFlight (usa sandbox). Para anúncios, use IDs de teste e a Test Suite do LevelPlay. Salve screenshots e o log de transações.
8. **Registrar**: atualizar `feature_list.json` (estado `verificado`), `design/monetizacao.md` (IDs, preços, decisões A18) e `LICENCAS.md` (SDKs de anúncio/IAP e suas licenças).

## Verificar no simulador/dispositivo

- Simulador com `.storekit`: fluxo completo de compra e restauração, com `Transaction.updates` disparando após "Ask to Buy" aprovado no Transaction Manager do Xcode.
- Dispositivo real com Sandbox Apple Account: compra real em sandbox, restauração após reinstalar o app.
- Anúncio recompensado: vídeo de teste tocando até o fim e recompensa concedida uma única vez (sem duplicidade ao reabrir o app).

## Critério de pronto e evidência

Pronto quando existirem em `production/evidencias/<data>-monetizacao/`:
- `compra-sandbox.png`, `restaurar.png`, `ask-to-buy.png` (ou `.mov`), `anuncio-recompensado.mov`;
- `transacoes.log` com IDs de produto e estados;
- `design/monetizacao.md` com modelo, IDs, preços BRL/USD e a decisão sobre loot boxes/A18.
Um parse check do código de compra não é uma execução: a compra precisa ter acontecido em sandbox.

## Armadilhas conhecidas

- **Loot boxes = A18 no Brasil**; simulated gambling A12/A18 (tabela oficial da Apple). Muda público e receita.
- **Apostas** exigem licença SPA desde 08/05/2026; responder "Yes" a gambling → A18 no Brasil.
- **Promo codes de IAP** não são mais criados desde 26/03/2026.
- **Ask to Buy/deferred**: não conceder conteúdo até `OnPurchasePending`/transação verificada (Unity IAP v5 documenta isso na skill oficial).
- **Consumíveis não voltam na restauração**: persista a concessão (iCloud/Cloud Save) ou o jogador perde moedas ao trocar de aparelho.
- **Orçamento de receita**: a comissão da App Store e o App Store Small Business Program alteram o líquido; confirme percentuais vigentes em developer.apple.com [não lidos nesta pesquisa].
- **Anúncio + menores**: ECA Digital (Lei 15.211/2025) veda "design enganoso" e publicidade nociva para crianças [secundário]; não use timers falsos nem botões de fechar escondidos.
- **LevelPlay skill**: segue um fluxo passo a passo e não aceita atalhos; rode-a inteira em vez de copiar trechos.
- **Licença de saída**: SDKs são comerciais, mas verifique a licença do plug-in da comunidade (Godot) antes de publicar.

## Fontes

- App Store Review Guidelines (08/06/2026): https://developer.apple.com/app-store/review/guidelines/
- Age ratings values and definitions (Brasil: loot boxes A18; simulated gambling A12/A18): https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions
- Apple Developer News 08/05/2026 (apostas no Brasil, licença SPA): https://developer.apple.com/news/?id=x4eyetnp
- Apple Developer News 29/10/2025 (promo codes de IAP até 26/03/2026): https://developer.apple.com/news/?id=gf6mgrs6
- WWDC26 sessão 378 (plug-ins StoreKit/Background Assets para Unity): https://developer.apple.com/videos/play/wwdc2026/378/
- apple/unityplugins (Apache-2.0): https://github.com/apple/unityplugins
- Unity Agent Plugin (skills `implement-in-app-purchases`, `levelplay-unity-integration`; Unity Companion License): https://github.com/Unity-Technologies/unity-agent-plugin
- RevenueCat, hackathon de apps vibe coded: https://www.revenuecat.com/blog/company/revenuecat-vibe-coding-apps
- fly.pieter.com: https://levels.io/full-multiplayer-python-websockets-game-ai ; https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9 ; https://404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont [secundário]
- Spell Cascade (US$ 4,99 em 30 dias): https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992 [secundário]
- Appfigures/TechCrunch sobre apps vibe coded: https://tech.slashdot.org/story/25/09/23/2115212 [secundário]
- ECA Digital (Lei 15.211/2025): https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/ [secundário]
