# Portais, itch.io, Steam e monetização web vs App Store

## itch.io (verificado em fontes secundárias; política de nov/2024, vigente)

- Campo obrigatório "Generative AI Disclosure" no projeto. "Sim" → tag **AI Generated** com subtags **Graphics**, **Sound**, **Text & Dialog**, **Code**; "não" → **No AI**.
- "Assets comprised of generative AI (even if modified afterward) that are not tagged will no longer be eligible for indexing on our browse pages".
- Algoritmos autocontidos sem grandes datasets externos (pathfinding, geração procedural) não exigem tag. Fontes divergem se a regra cobre jogos ou só assets; marque sempre.
- Prática: cole na descrição o texto específico de `templates/divulgacao-de-ia.md` (o que foi gerado, o que foi revisado).

## Poki, CrazyGames, Newgrounds

- Cada portal fornece SDK (anúncios recompensados/intersticiais, eventos de gameplay para pausar anúncios, save em nuvem) e faz curadoria antes de publicar; a receita vem de anúncios do portal, com divisão definida por contrato.
- **Políticas sobre conteúdo gerado por IA**: não verificadas neste banco. Antes de integrar o SDK, leia a página de submissão do portal, procure "AI" / "generative" nos termos e, se houver campo, declare. Registre o resultado em `production/releases/web.md` como "verificado em <data>" ou "não verificado".
- Newgrounds historicamente exige que o conteúdo seja do autor e tem campo de "AI generated" em uploads de arte [secundário, confirmar]; para jogos, confirme.

## Steam (só se houver build desktop)

- Content survey com divulgação obrigatória de IA generativa que o jogador vê/ouve (pré-gerada e ao vivo), separada para "live-generated"; regra estreitada em **16/01/2026**: isenta ferramentas de código (Copilot etc.) e arte conceitual não embarcada [secundário; página oficial `partner.steamgames.com/doc/gettingstarted/contentsurvey` bloqueada nesta pesquisa].
- Números (correlação, não causalidade): 10,9% dos lançamentos de 2024 com divulgação → 19,9% em 2025 → **30,8% em 2026** (até julho, censo de ~53.600 jogos); jogos comparáveis com divulgação recebem **~52,6% menos reviews** e nota média **84,6% vs 88,3%** (Game Oracle, 9.879 jogos de 2025); 28% dos lançamentos do 1º tri de 2026 com divulgação representaram ~17% das vendas estimadas.
- Lições: divulgação vaga (Activision, "help develop some in game assets") + arte identificável como IA amplifica o backlash; explicação específica e correção rápida (Embark/ARC Raiders regravou vozes; 11 bit removeu o prompt esquecido em The Alters) reduzem o dano.
- Texto específico, por categoria, em `templates/divulgacao-de-ia.md`.

## Monetização: web vs App Store

| Canal | Como cobra | Comissão | Restrições |
|---|---|---|---|
| Site próprio / PWA | Stripe (venda direta, assinatura) ou anúncios de rede própria | taxas do processador | sem loja, sem descoberta; LGPD para dados de pagamento |
| itch.io | preço fixo/pague o que quiser; parcela configurável para o itch.io | definida pelo criador [confirmar] | tag de IA obrigatória |
| Portais | anúncios do portal via SDK | divisão contratual | aprovação editorial; política de IA não verificada |
| Steam | venda + DLC | padrão Steamworks [confirmar] | content survey de IA |
| App Store (nativo) | IAP da Apple para bens digitais (seção 3.1 das Guidelines) | comissão da Apple; Small Business Program [confirmar percentuais vigentes] | pagamentos externos dependem de regras regionais que mudaram em 2025–2026 [confirmar texto vigente] |

Unity IAP v5.4+ oferece D2C via Stripe/Coda (skill oficial `implement-in-app-purchases`), mas isso não libera bens digitais no iOS fora do IAP da Apple: use D2C só na versão web/desktop ou onde as Guidelines permitirem.

## Fontes

- itch.io: https://itch.io/post/16187566 ; https://itch.io/post/16081169 ; https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/ ; https://www.pcgamesinsider.biz/news/74828/devs-need-to-disclose-if-game-uses-genai-on-itchio/ [secundário]
- Steam, 16/01/2026: https://hitmarker.net/news/valve-has-relaxed-its-rules-for-disclosing-generative-ai-use-in-steam-games-1623888 [secundário]; https://tech.anusutra.in/ai-generated-assets-steam-disclosure-policy-explained [secundário]
- Censo Steam: https://games.gg/news/steam-ai-disclosure-games-2028-trend/ ; https://pccentral.net/steam-next-fest-june-2026-generative-ai-disclosure-stats-reveal/ ; https://www.shanethegamer.com/research/ai-game-development-report/ [secundário]
- Penalidade de reviews: https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/ ; https://www.notebookcheck.net/Study-suggests-AI-is-hurting-video-game-sales.1328725.0.html ; dataset acadêmico https://data.mendeley.com/datasets/zd77888mxw/1 [secundário]
- Backlash e correções: https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7 ; https://www.pcgamesn.com/arc-raiders/ai-voices-replaced ; https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ [secundário]
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Unity Agent Plugin: https://github.com/Unity-Technologies/unity-agent-plugin
