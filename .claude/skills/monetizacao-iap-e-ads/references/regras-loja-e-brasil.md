# Regras de loja e do Brasil que afetam monetização

Leia quando o jogo tiver qualquer item aleatório pago, minijogo de azar, assinatura ou anúncio. Fatos sem fonte oficial lida estão marcados "[secundário, confirmar]". Nada aqui é aconselhamento jurídico; valide com advogado antes de lançar com loot boxes, apostas simuladas ou público infantil.

## Tabela de impacto (Apple, App Store Connect, estado em 10/10/2026)

| Mecânica | Faixa global Apple | Brasil (autoavaliação Apple) | Consequência prática |
|---|---|---|---|
| Loot boxes / itens aleatórios pagos | 9+ | **A18** | Perde público <18 no Brasil; precisa divulgar probabilidades antes da compra |
| Simulated gambling infrequente | 13+ | **A12** | Minijogo de azar ocasional sem dinheiro real |
| Simulated gambling frequente | 18+ | **A18** | Caça-níquel como loop central |
| Gambling real (apostas) | 18+ | **A18** + licença SPA (08/05/2026) | Fora do escopo deste banco de skills |
| Contests (sorteios) | 4+ / 13+ | — | Regras de promoção comercial no Brasil [secundário, confirmar] |
| Compras in-app (qualquer) | pergunta do questionário | — | Declarar "in-app purchases" na ficha |

Fonte: Age ratings values and definitions (App Store Connect Help); Apple Developer News 08/05/2026. Austrália: loot boxes e social media = 16+.

## Guidelines relevantes (texto vigente 08/06/2026)

- **3.1 Payments**: bens e serviços digitais consumidos dentro do app usam in-app purchase da Apple; exceções e regras de pagamentos externos variam por região e mudaram em 2025–2026 [texto não citado nas notas; leia a seção antes de decidir]. A obrigação de divulgar probabilidades de loot boxes está na 3.1.1 [confirmar na página].
- **2.3.6**: responder o questionário etário com honestidade. **2.3.8**: metadados (screenshots, descrição) devem ser adequados a 4+ mesmo que o app seja classificado acima.
- **5.6.4 App Quality**: "excessive customer reports... negative customer reviews, and excessive refund requests" podem pesar contra o desenvolvedor. Monetização agressiva gera reembolsos.
- **Promo codes de IAP**: deixaram de ser criados a partir de 26/03/2026 (Apple Developer News 29/10/2025). Custom Product Pages subiram para 70 e ganharam keywords na mesma nota.
- **Kids Category**: anúncios de terceiros e analytics têm restrições; só 4+/9+ e irreversível após aprovação (Set an app age rating).

## Brasil

- **Apostas de quota fixa**: desde 08/05/2026 só podem ser distribuídas no Brasil com licença da Secretaria de Prêmios e Apostas (SPA/MF, Portaria 1.231/2024). Responder "Yes" a gambling no questionário define A18 no Brasil.
- **ECA Digital (Lei 15.211/2025)**, em vigor desde março de 2026 [secundário]: verificação de idade, supervisão parental, restrição de publicidade nociva e fim de "design enganoso" para crianças. Para monetização: sem contadores falsos de escassez, sem botão de fechar escondido em anúncios, sem compras "um toque" sem confirmação para menores. A ANPD suspendeu o "Go Live" do Discord por falhas de proteção a menores (ago/2026) [secundário].
- **LGPD**: SDKs de anúncio coletam identificadores; base legal, minimização e política de privacidade são tratados em `/privacidade-lgpd-e-eca-digital`.
- **ClassInd**: a classificação indicativa brasileira para jogos distribuídos em loja digital é autoavaliação via Apple/IARC; se a Apple exigir certificado específico para o Brasil, a página de classificação do App Store Connect avisa [não verificado].

## Expectativa de receita (para o brief)

| Caso | Receita reportada | Fonte |
|---|---|---|
| fly.pieter.com (Three.js, vibe coded) | US$ 1 M ARR autodeclarado (17 dias, mar/2025) → US$ 12 K MRR / US$ 144 K ARR (mai/2025); compras de aeronaves + anúncios | levels.io; Indie Hackers; 404 Media ("yours probably won't") [secundário] |
| Spell Cascade (Godot, 100% Claude Code) | US$ 4,99 em 30 dias | Medium (chierhu) [secundário] |
| Apps dedicados de vibe coding (Appfigures, set/2025) | nenhum com downloads notáveis; poucos com receita | TechCrunch/Slashdot [secundário] |

Leitura: o primeiro título valida pipeline e retenção. Modelo recomendado: grátis + recompensado opcional + 1–3 IAP não consumíveis. Evite assinatura no primeiro título (exige conteúdo recorrente e suporte).

## Fontes

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions
- https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- https://developer.apple.com/news/?id=x4eyetnp (08/05/2026)
- https://developer.apple.com/news/?id=gf6mgrs6 (29/10/2025)
- https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/ [secundário]
- https://levels.io/full-multiplayer-python-websockets-game-ai ; https://www.indiehackers.com/post/2NUIOp80SUWuPmmfKoS9 ; https://404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont [secundário]
- https://chierhu.medium.com/claude-code-for-game-development-7a88fcd19992 [secundário]
- https://tech.slashdot.org/story/25/09/23/2115212 [secundário]
