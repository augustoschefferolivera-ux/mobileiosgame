---
name: divulgacao-de-uso-de-ia
description: >
  Redige e posiciona a divulgação de uso de IA do jogo (texto-modelo em pt-BR e en, por
  categoria: gráficos, som, texto/diálogo, código, IA em runtime) seguindo a HIG
  "Generative AI" da Apple ("Clearly identify when and where you use AI"), as tags do
  itch.io, o content survey da Steam (específico: o que foi gerado, o que foi revisado) e
  o EU AI Act Art. 50 ("fully AI-generated" vs "AI-assisted"), e decide onde colocar
  (ficha da loja, créditos no jogo, site, política de privacidade, diálogo de NPC).
  Use quando o usuário perguntar "preciso dizer que usei IA?", "como escrever a
  disclosure", "tag AI Generated", ou antes de qualquer publicação. Não use para o
  registro de licenças e proveniência em si (licencas-e-proveniencia), que é a
  fonte dos fatos desta skill.
license: MIT
compatibility: "Claude Code ou Codex"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app, web]
  fase: [9, 10]
argument-hint: "[canal: app-store|itch|steam|site|creditos|todos]"
disable-model-invocation: false
user-invocable: true
---

# Divulgação de uso de IA

Entrega `docs/divulgacao-de-ia.md` preenchido a partir de `templates/divulgacao-de-ia.md` (pt-BR e en, por categoria e por canal), inserido nos créditos do jogo, na ficha de cada loja e no site, com screenshots em `production/evidencias/<data>-divulgacao/`.

## Quando usar / quando não usar

Use na fase 9 (depois de `PROVENANCE.md` estar completo) e na fase 10 ao preencher cada loja; use de novo sempre que a proporção de IA mudar (ex.: trocou vozes TTS por atores) e quando houver reclamação de jogadores sobre IA.

Não use para: decidir licenças (`/licencas-e-proveniencia`); consentimento de dados para IA de terceiros (`/privacidade-lgpd-e-eca-digital`, Guideline 5.1.2(i)); responder o questionário etário (`/classificacao-etaria`).

## Pré-requisitos

- `PROVENANCE.md` com o "Resumo por categoria" preenchido (gerado / assistido / humano).
- Lista de canais de publicação (App Store, itch.io, portais, Steam, site).
- Se houver IA em runtime (diálogo de NPC via LLM): nome do provedor e se roda on-device, PCC ou nuvem de terceiros.

## Entradas

- `PROVENANCE.md` (fatos), `LICENCAS.md` (atribuições obrigatórias, ex.: "Built with Llama", Meshy free CC BY).
- `design/brief.md` (tom de voz do estúdio; países).
- Reclamações/reviews existentes, se for revisão pós-lançamento.

## Passos

1. **Levantar os fatos**: para cada categoria (gráficos, modelos 3D, som, texto/diálogo, código, IA em runtime) copie do `PROVENANCE.md` o nível predominante e os exemplos concretos ("sprites gerados com gpt-image-1.5 e repintados à mão"; "SFX gerados com ElevenLabs e selecionados entre 16 candidatos"; "código escrito com Claude Code e revisado linha a linha"). Divulgação específica é a lição dos casos: Activision ("help develop some in game assets") sofreu backlash; Embark (ARC Raiders) e 11 bit (The Alters), que explicaram e corrigiram, saíram menos arranhadas.
2. **Escolher o nível por categoria** com a taxonomia do EU AI Act (Código de Prática, jun/2026 [secundário]): "fully AI-generated" (usado como saiu) vs "AI-assisted" (edição humana substancial). Não chame de "AI-assisted" o que não foi editado: a divulgação precisa bater com `PROVENANCE.md`.
3. **Preencher `templates/divulgacao-de-ia.md`** → `docs/divulgacao-de-ia.md`: versão curta (2–3 frases, loja), versão longa (créditos/site), versão itch.io (tags + texto), versão Steam (content survey, com campo separado para IA ao vivo), versão runtime (aviso no jogo). Regras de cada canal em `references/regras-por-canal.md`.
4. **Posicionar por canal**:
   - **App Store**: não há campo nem exigência de rótulo (Guidelines de 08/06/2026 não mencionam IA generativa). Coloque o parágrafo curto na descrição ("Sobre a produção") e a versão longa nos créditos; a HIG pede "Clearly identify when and where you use AI" e proíbe fingir conteúdo humano. Nas Notas para o App Review, diga onde está a IA em runtime.
   - **No jogo**: tela de créditos com ferramentas e licenças; se há diálogo gerado ao vivo, identifique na primeira interação ("Este personagem responde com IA") — a HIG cita exatamente "interact with a character in a game that uses AI-generated dialog".
   - **itch.io**: campo "Generative AI Disclosure" = sim → subtags Graphics / Sound / Text & Dialog / Code conforme as categorias; texto específico na descrição. Sem tag, o projeto sai do browse.
   - **Steam**: content survey, texto específico; regra estreitada em 16/01/2026 isenta ferramentas de código e arte conceitual não embarcada, e exige divulgação separada para IA ao vivo [secundário].
   - **Site/política de privacidade**: versão longa; se IA em runtime envia dados a terceiros, a política descreve provedor, finalidade e retenção (`/privacidade-lgpd-e-eca-digital`).
   - **UE**: se distribuir na UE, mantenha metadados/C2PA dos assets (não remova) e use os termos "AI-generated"/"AI-assisted" nos textos [secundário; Art. 50 não lido].
5. **Revisar coerência**: o mesmo fato em todos os canais; nenhuma frase genérica ("alguns assets usaram IA"); nenhuma omissão de categoria presente no `PROVENANCE.md`.
6. **Planejar a resposta a backlash** (texto em `references/regras-por-canal.md`): reconhecer rápido, apontar a divulgação específica, corrigir o que for inconsistente (prompt esquecido, voz "flat"), publicar patch notes.
7. **Gravar evidência**: screenshots da ficha (loja), dos créditos no jogo rodando no iPhone, da página do itch.io com tags e do content survey da Steam.

## Critério de pronto e evidência

Pronto quando `docs/divulgacao-de-ia.md` existir nas duas línguas, cada canal ativo tiver screenshot em `production/evidencias/<data>-divulgacao/` (`ficha-app-store.png`, `creditos-iphone.png`, `itch-tags.png`, `steam-survey.png`) e um diff entre `PROVENANCE.md` (resumo) e o texto não mostrar categoria omitida. Texto escrito mas não publicado não é pronto.

## Armadilhas conhecidas

- **Divulgação vaga** amplifica o dano quando a IA é visível (zombie Santa e calling cards do Call of Duty).
- **Penalidade correlacional na Steam**: ~52,6% menos reviews e nota 84,6% vs 88,3% para jogos com divulgação; mistura aversão com baixo esforço. Não omita para escapar: a omissão descoberta custa mais (The Alters).
- **App Store não exige rótulo**, mas 4.3(b)/4.2 punem genericidade; a divulgação não substitui diferencial.
- **Vozes TTS** são o ponto mais sensível (ARC Raiders regravou com atores); divulgue e use atores nas linhas centrais.
- **"AI-assisted" sem edição real** é afirmação falsa; alinhe com `PROVENANCE.md`.
- **Atribuições obrigatórias** (Llama "Built with Llama"; Meshy free CC BY) vão nos créditos, não só no `LICENCAS.md`.
- **Chatbot/diálogo gerado** também aciona classificação etária (questionário considera "AI assistants and chatbot functionality") e 1.2/4.7.1.

## Fontes

- HIG Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- App Store Review Guidelines (08/06/2026): https://developer.apple.com/app-store/review/guidelines/
- itch.io: https://itch.io/post/16187566 ; https://80.lv/articles/asset-creators-on-itch-io-now-have-to-disclose-the-use-of-generative-ai/ [secundário]
- Steam 16/01/2026: https://hitmarker.net/news/valve-has-relaxed-its-rules-for-disclosing-generative-ai-use-in-steam-games-1623888 [secundário]; survey: https://partner.steamgames.com/doc/gettingstarted/contentsurvey [bloqueado]
- Penalidade de reviews: https://www.digitalcitizen.life/steam-games-that-disclose-ai-use-may-sell-far-less-new-study-finds/ [secundário]
- Call of Duty: https://mp1st.com/news/activision-responds-to-ai-claims-in-black-ops-7 ; ARC Raiders: https://www.pcgamesn.com/arc-raiders/ai-voices-replaced ; The Alters: https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ ; https://aftermath.site/the-alters-ai-controversy/ [secundário]
- EU AI Act Art. 50 / Código de Prática: https://www.twobirds.com/en/insights/2026/taking-the-eu-ai-act-to-practice-the-final-transparency-code-of-practice ; https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content [secundário]
- Apple Developer News 24/07/2025 (chatbot no questionário etário): https://developer.apple.com/news/?id=ks775ehf
