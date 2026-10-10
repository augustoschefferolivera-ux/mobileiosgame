# Regras de divulgação por canal e resposta a backlash

| Canal | Exigência | Formato | Fonte |
|---|---|---|---|
| App Store | Nenhuma regra de rótulo; HIG: "Clearly identify when and where you use AI"; "Never trick someone into thinking they're interacting with or viewing content authored by a human if they're actually interacting with AI"; "Ensure your approach to disclosure aligns with any regulations in the regions where you offer your app" | parágrafo na descrição + créditos + aviso na interação com IA em runtime | HIG; Guidelines 08/06/2026 |
| itch.io | Campo "Generative AI Disclosure"; tag "AI Generated" com subtags Graphics, Sound, Text & Dialog, Code; "No AI" quando não há; assets não marcados saem do browse | tags + texto na descrição | itch.io posts [secundário] |
| Steam | Content survey obrigatório para IA que o jogador vê/ouve; campo separado para IA ao vivo; 16/01/2026: ferramentas de código e arte conceitual não embarcada isentas | texto específico por categoria | Hitmarker/Tech Anusutra [secundário]; página oficial bloqueada |
| Google Play | apps de IA generativa devem cumprir políticas e, em certos casos, ter denúncia/sinalização in-app (aviso de 30/10/2025) | botão de denúncia + política | Play Console announcements [secundário] |
| UE (AI Act Art. 50) | provedores marcam saídas (duas técnicas legíveis por máquina); deployers rotulam deepfakes e textos informativos; taxonomia "fully AI-generated" / "AI-assisted"; ícone "AI" comum | manter metadados; usar a taxonomia nos textos | Bird & Bird / Paul, Weiss [secundário] |
| Brasil | PL 2338/2023 parado na Câmara; sem exigência vigente de rótulo em jogos localizada | seguir HIG e lojas | LCF Consulting [secundário] |

## Vocabulário

- **gerado** / "AI-generated": saída usada como veio (seleção entre candidatos ainda é curadoria; diga isso).
- **assistido** / "AI-assisted": geração + edição humana substancial (repintura, remix, reescrita, refatoração revisada).
- **humano** / "human-made": IA, no máximo, como referência ou pesquisa.
- **IA em runtime** / "live AI": conteúdo gerado durante o jogo (diálogo, níveis); dizer provedor e se é on-device.

## Resposta a backlash (modelo)

1. Em até 24 h: reconhecer publicamente, sem defensiva; linkar a divulgação específica.
2. Se houver inconsistência real (prompt esquecido, voz "flat", arte com dedos errados): dizer o que será corrigido e quando; corrigir no próximo patch (`/pos-lancamento-e-telemetria`).
3. Se a crítica for ao uso em si: explicar o que a IA fez e o que humanos fizeram, com exemplos; não prometer remover o que não vai remover.
4. Atualizar `docs/divulgacao-de-ia.md` e a ficha; registrar no post-mortem.

Casos: The Alters (11 bit) admitiu GenAI para traduções e removeu o texto em update; Embark regravou vozes com atores; Activision respondeu com texto genérico e o backlash persistiu; Jurassic World Evolution 3 removeu retratos gerados após feedback [secundário].

## Fontes

- https://developer.apple.com/design/human-interface-guidelines/generative-ai
- https://developer.apple.com/app-store/review/guidelines/
- https://itch.io/post/16187566 ; https://itch.io/post/16081169 [secundário]
- https://hitmarker.net/news/valve-has-relaxed-its-rules-for-disclosing-generative-ai-use-in-steam-games-1623888 ; https://tech.anusutra.in/ai-generated-assets-steam-disclosure-policy-explained [secundário]
- https://support.google.com/googleplay/android-developer/announcements/13412212?hl=en [secundário, não verificado na página]
- https://www.twobirds.com/en/insights/2026/taking-the-eu-ai-act-to-practice-the-final-transparency-code-of-practice ; https://www.paulweiss.com/insights/client-memos/eu-finalises-transparency-rules-for-ai-generated-content [secundário]
- https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ ; https://www.pcgamesn.com/arc-raiders/ai-voices-replaced ; https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7 ; https://wnhub.io/news/Generative_AI/item-48139 [secundário]
