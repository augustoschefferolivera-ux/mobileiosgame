# Guidelines da App Store com maior risco para jogos feitos com IA

Texto vigente verificado em developer.apple.com em 10/10/2026 ("Last Updated: June 8, 2026"). As Guidelines **não contêm** os termos "artificial intelligence", "generative", "machine learning" ou "LLM"; a única menção a IA é 5.1.2(i). Não existe exigência de rótulo "AI-generated" na ficha. O risco está nas regras abaixo.

| Guideline | Texto (trecho) | Por que pega jogo feito com IA | Mitigação e evidência |
|---|---|---|---|
| **2.1(a)** Completude | "placeholder text, empty websites, and other temporary content should be scrubbed"; "We will reject incomplete app bundles and binaries that crash or exhibit obvious technical problems" | Protótipos agênticos deixam telas vazias, textos "lorem", prompts esquecidos (The Alters) | `scan_placeholders.log` com 0 ocorrências; passe visual de todas as telas; `feature_list.json` só com features `verificado` |
| **4.2** Funcionalidade mínima | "If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store" | Jogo de jam sem profundidade; wrapper web | Frase de diferencial no brief; sessão de 10 min gravada mostrando progressão |
| **4.3(b)** Spam | "Don't submit apps that are indistinguishable from what's already widely available... Certain kinds of apps, such as dating, flashlight, sound effects, wallpaper, simple timers, and fortune telling... we will not accept new submissions unless they offer a meaningfully different or improved experience... Repeated submissions of this kind may lead to removal from the Apple Developer Program" | Variante genérica de gênero saturado gerada por prompt; arte de loja "cara de IA" | Mecânica própria documentada; arte de loja curada por humano; não reenviar sem mudança |
| **4.3(a)** Design spam | esclarecida em 08/06/2026 com exemplos | Binário/metadados parecidos com dezenas de submissões recentes [secundário] | Nome, ícone e descrição próprios; sem template de loja compartilhado |
| **4.1(a)/(c)** Copycats | (c) "You cannot use another developer's icon, brand, or product name in your app's icon or name, without approval" (nova em 13/11/2025) | Geradores reproduzem ícones e nomes conhecidos | Busca de nome na App Store; passe de semelhança no ícone; registrar em `PROVENANCE.md` |
| **5.2 / 5.2.1** PI | "Make sure your app only includes content that you created or that you have a license to use"; "Don't use protected third-party material such as trademarks, copyrighted works, or patented ideas" | Personagens famosos, logos e fontes em assets gerados; música Suno/Udio em litígio | Passe de marca/semelhança por asset; `LICENCAS.md`; evitar modelos em litígio |
| **5.1.2(i)** Dados pessoais | "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so" (redação de 13/11/2025) | Diálogo de NPC em LLM de nuvem com texto do jogador | Folha de consentimento antes da primeira transmissão; preferir Foundation Models on-device/PCC |
| **1.2** UGC | filtro de material objetável, denúncia com resposta tempestiva, bloqueio de usuários abusivos, contato publicado; chat anônimo incluído (06/02/2026); parágrafo sobre responsabilidade do desenvolvedor (08/06/2026) | Conteúdo gerado em runtime visível a outros jogadores | Filtro, botão de denúncia, bloqueio, e-mail de contato na ficha |
| **4.7 / 4.7.1 / 4.7.5** Software não embutido | mini apps HTML5/JS, streaming games, chatbots, plug-ins; 4.7.5 exige restrição por idade verificada ou declarada | Chatbot como feature; wrapper de mini game HTML5 | Restrição por idade; regras de conteúdo; declarar no questionário etário |
| **2.5.2** Código executável | app não pode baixar/executar código que mude sua funcionalidade | Caso Replit/Vibecode (mar/2026) [secundário]; jogos com scripts baixados | Conteúdo via Background Assets (dados), não código |
| **2.3.6** | "Answer the age rating questions in App Store Connect honestly" | Chatbot e loot boxes omitidos | Saída de `/classificacao-etaria` anexada |
| **2.3.8** | metadados adequados a 4+ mesmo que o app seja classificado acima | Screenshots com violência/apostas | Revisar screenshots e descrição |
| **5.6.4** App Quality | "excessive customer reports... negative customer reviews, and excessive refund requests" podem indicar violação do Developer Code of Conduct | Backlash de IA e monetização agressiva | Monitorar reviews (`/pos-lancamento-e-telemetria`); divulgação específica |

## Cronologia útil

- 24/07/2025: faixas 13+, 16+, 18+; prazo 31/01/2026; questionário considera "AI assistants and chatbot functionality".
- 29/10/2025: itens submetidos separadamente (ex.: achievements); Custom Product Pages até 70; promo codes de IAP até 26/03/2026.
- 13/11/2025: 1.2.1(a) creator apps; 2.5.10 removida; 4.1(c) nova; 4.7 esclarecida; 4.7.5; 5.1.2(i) "third-party AI".
- 06/02/2026: chat aleatório/anônimo sujeito à 1.2.
- 08/05/2026: Brasil — apostas exigem licença SPA; "Yes" a gambling = A18.
- 08/06/2026: Introdução sobre segurança de crianças/adolescentes; 1.2 responsabilidade; 4.3(a)/(b) com exemplos; 4.5.3 Live Activities; DPLA atualizado.
- 09/07/2026: perguntas de "social media capabilities" (obrigatórias a partir de setembro de 2026 para novos apps/updates).

## O que a Apple NÃO exige (e o que recomenda)

- Não há campo de divulgação de IA na ficha da App Store (diferente de Steam e itch.io) [ausência não confirmada em página oficial; nenhuma busca encontrou o campo].
- A HIG "Generative AI" pede: "Clearly identify when and where you use AI"; "Never trick someone into thinking they're interacting with or viewing content authored by a human if they're actually interacting with AI"; "Ensure your approach to disclosure aligns with any regulations in the regions where you offer your app".
- A Apple declarou não ter regras específicas contra "vibe coding apps" após o episódio Replit/Vibecode [secundário, via 9to5Mac não lido].

## Fontes

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/news/?id=ks775ehf (24/07/2025)
- https://developer.apple.com/news/?id=gf6mgrs6 (29/10/2025)
- https://developer.apple.com/news/?id=ey6d8onl (13/11/2025)
- https://developer.apple.com/news/?id=d75yllv4 (06/02/2026)
- https://developer.apple.com/news/?id=x4eyetnp (08/05/2026)
- https://developer.apple.com/news/?id=a233fmpw (08/06/2026)
- https://developer.apple.com/news/?id=tlur8uvi (09/07/2026)
- https://developer.apple.com/design/human-interface-guidelines/generative-ai
- https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ [secundário]
- https://modall.ca/blog/apple-rejecting-vibe-coded-apps [secundário]
- https://ptkd.com/journal/app-store-rejection-4-3-a-ai-slop-design-spam [secundário]
- https://vmobify.com/blog/why-ai-built-app-got-rejected [secundário]
