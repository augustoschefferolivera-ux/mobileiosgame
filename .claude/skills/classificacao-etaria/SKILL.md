---
name: classificacao-etaria
description: >
  Responde o questionário de classificação etária da App Store (faixas 4+/9+/13+/16+/18+,
  obrigatórias desde 31/01/2026) a partir das features reais do jogo — violência, horror,
  chatbot/IA, compras, loot boxes, apostas simuladas, UGC, redes sociais (perguntas de
  09/07/2026) — calcula a faixa esperada, a tabela do Brasil (loot boxes = A18; simulated
  gambling A12/A18), o IARC para Google Play e o impacto no design e na receita, e decide
  quando usar "Override to Higher". Use quando o usuário perguntar "para que idade é meu
  jogo?", "posso ter loot box?", "o chatbot muda a classificação?", ou antes de preencher o
  App Store Connect. Não use para implementar a monetização (monetizacao-iap-e-ads) nem
  para privacidade de menores (privacidade-lgpd-e-eca-digital).
license: MIT
compatibility: "Claude Code ou Codex; App Store Connect para aplicar"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app, web]
  fase: [1, 9, 10]
argument-hint: "[simular|aplicar]"
disable-model-invocation: false
user-invocable: true
---

# Classificação etária

Entrega `design/classificacao-etaria.md` com o questionário respondido, a faixa esperada (global e Brasil), as decisões de design que a mudam, e, na fase 10, a classificação aplicada no App Store Connect com screenshot em `production/evidencias/<data>-classificacao/`.

## Quando usar / quando não usar

Use (a) na fase 1, junto do brief, para que a faixa pretendida guie o design (uma loot box transforma um jogo 9+ em A18 no Brasil); (b) na fase 9 para revisar com as features reais; (c) na fase 10 para preencher o App Store Connect (e o IARC no Google Play).

Não use para: implementar IAP/anúncios (`/monetizacao-iap-e-ads`); proteção de dados de menores (`/privacidade-lgpd-e-eca-digital`); texto de divulgação de IA (`/divulgacao-de-uso-de-ia`).

## Pré-requisitos

- `feature_list.json` e `design/brief.md` atualizados (conteúdo, monetização, chat, UGC, IA em runtime).
- Acesso ao App Store Connect (App Information > Age Rating) na fase 10.
- Tabela de descritores em `references/tabela-descritores.md` (derivada de "Age ratings values and definitions").

## Entradas

- Inventário de conteúdo: violência (cartoon/fantasia vs realista; frequência), horror/medo, conteúdo sexual/nudez, profanidade/humor adulto, drogas/álcool/tabaco, temas médicos/bem-estar, apostas simuladas, apostas reais, loot boxes, concursos, UGC, mensagens/chat, redes sociais (feed/descoberta), acesso irrestrito à web, compras in-app, controles parentais no app, chatbot/assistente de IA.
- Países de lançamento (Brasil, Austrália e outros têm mapeamentos próprios).

## Passos

1. **Inventariar** cada item da lista de entradas com "não / infrequente / frequente" e exemplos (screenshot ou referência de cena). Para IA em runtime, avalie o chatbot como **fonte de conteúdo sensível**: a Apple pede considerar como todas as features "including AI assistants and chatbot functionality" afetam a frequência de conteúdo sensível; se o modelo pode produzir violência/profanidade sem filtro robusto, conte como "infrequente" no mínimo.
2. **Calcular a faixa esperada** com a tabela (`references/tabela-descritores.md`): violência cartoon/fantasia infrequente 9+ / frequente 13+; realista infrequente 13+ / frequente 18+ ("prolonged graphic or sadistic" = Unrated, não publicável); horror 9+/13+; sexual 13+/18+; profanidade 9+/13+; simulated gambling 13+/18+; gambling real 18+; loot boxes 9+; contests 4+/13+; UGC 4+; mensagens/chat 4+; social media 13+; web irrestrita 16+. A faixa final é a maior entre os descritores.
3. **Mapear o Brasil** (autoavaliação da Apple): **loot boxes = A18**; simulated gambling infrequente = **A12**, frequente = **A18**; responder "Yes" a gambling (real) = A18 e, desde 08/05/2026, exige licença da SPA para distribuir apostas no Brasil. Austrália: social media e loot boxes = 16+. Outros países: a Apple deriva das respostas; ClassInd (Ministério da Justiça) para jogos em loja digital segue a autoavaliação [não verificado se há processo próprio; confirmar na página de classificação do App Store Connect].
4. **Perguntas de "social media capabilities"** (09/07/2026): "redistribute, amplify, or interact with user-generated content through a social feed or similar discovery method" → o app entra na Time Allowance "Social Media" mesmo na categoria Games e mostra o descritor "Social Media"; obrigatório desde setembro de 2026 para novos apps e updates. Placar global simples não é feed; galeria pública de níveis criados por jogadores provavelmente é [interpretação; confirmar na pergunta].
5. **Comparar com o brief**: se a faixa calculada é maior que a pretendida, liste o que a eleva e decida: redesenhar (remover loot boxes → recompensas determinísticas; trocar caça-níquel por minijogo sem aposta; filtro mais forte no chatbot; UGC sem feed) ou aceitar. Impacto na receita: faixa menor = público maior; A18 no Brasil exclui menores da loja; Kids Category (só 4+/9+) restringe anúncios/analytics e é irreversível após aprovação; 1.2 (UGC/chat) adiciona obrigações de moderação.
6. **Registrar** em `design/classificacao-etaria.md`: tabela de respostas, faixa global e por país, decisões, data e versão do jogo. Atualize `feature_list.json` se removeu/alterou features.
7. **Aplicar (fase 10)**: App Store Connect > App Information > Age Rating: responder exatamente como no documento (Guideline 2.3.6: honestidade); conferir a faixa calculada; usar **"Override to Higher Age Rating"** se o conteúdo real justificar faixa maior (nunca menor); garantir que screenshots/descrição sejam 4+ (2.3.8). Screenshot da tela de resultado.
8. **Google Play (se houver)**: preencher o questionário IARC no Play Console com as mesmas respostas; ele gera as classificações por órgão (inclusive ClassInd) [secundário; processo não lido]. Divergência entre lojas é sinal de resposta errada.

## Critério de pronto e evidência

Pronto quando `design/classificacao-etaria.md` tiver todas as respostas com justificativa e, após a fase 10, `production/evidencias/<data>-classificacao/age-rating-app-store-connect.png` mostrar a faixa igual à calculada (ou maior, se override). Uma faixa "chutada" no App Store Connect sem o documento não é pronto.

## Armadilhas conhecidas

- **Loot boxes**: 9+ global, **A18 no Brasil**; decida antes de implementar.
- **Chatbot sem filtro** eleva a frequência de conteúdo sensível; o questionário manda considerá-lo.
- **"Unrated"** (ex.: violência prolongada gráfica) não pode ser publicado.
- **Made for Kids** irreversível após aprovação; só 4+/9+.
- **Override só para cima**; a Apple não aceita rebaixar.
- **Dispositivos com iOS 26+** mostram as novas faixas; versões antigas mapeiam para as antigas (12+/17+).
- **Perguntas novas aparecem**: 24/07/2025 (13+/16+/18+), 09/07/2026 (social media); revise a cada update.
- **Metadados acima de 4+** (2.3.8) reprovam mesmo com faixa correta.
- **Brasil, apostas**: além de A18, licença SPA obrigatória desde 08/05/2026 — fora do escopo deste banco.

## Fontes

- Age ratings values and definitions: https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions
- Set an app age rating (Override to Higher; Made for Kids; Unrated): https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- Apple Developer News 24/07/2025 (novas faixas; chatbot): https://developer.apple.com/news/?id=ks775ehf
- Apple Developer News 09/07/2026 (social media capabilities): https://developer.apple.com/news/?id=tlur8uvi
- Apple Developer News 08/05/2026 (Brasil, apostas, SPA): https://developer.apple.com/news/?id=x4eyetnp
- App Store Review Guidelines 2.3.6, 2.3.8, 1.2, 1.3: https://developer.apple.com/app-store/review/guidelines/
- ECA Digital (contexto de menores): https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/ [secundário]
