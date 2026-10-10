---
name: submissao-app-store
description: >
  Conduz a submissão de um jogo feito com IA à App Store com um checklist derivado das
  App Store Review Guidelines (08/06/2026): varredura de placeholders e resíduos de IA
  (2.1(a), caso The Alters), genericidade (4.3(b)/4.2), marcas de terceiros (4.1(c)/5.2.1),
  consentimento para IA de terceiros (5.1.2(i)), chatbot (4.7/1.2), classificação etária
  13+/16+/18+, rótulos de privacidade, metadados, screenshots, TestFlight externo e
  resposta a rejeições. Use quando o usuário disser "enviar para a App Store", "submeter",
  "App Review", "TestFlight externo", "fui rejeitado" ou "preparar a ficha da loja".
  Fluxo manual: só roda quando invocada explicitamente. Não use para publicar na web/itch.io
  (publicar-jogo-web) nem para decidir a monetização (monetizacao-iap-e-ads).
license: MIT
compatibility: "Claude Code ou Codex; macOS com Xcode 27 e conta no Apple Developer Program; scripts em bash (grep ou ripgrep)"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app]
  fase: [10]
argument-hint: "[versao] [--dry-run]"
disable-model-invocation: true
user-invocable: true
---

# Submissão à App Store

Entrega um checklist preenchido em `production/releases/checklist-submissao-<versao>.md`, a saída da varredura de placeholders sem ocorrências e o build em "Waiting for Review" no App Store Connect, com evidências em `production/evidencias/<data>-submissao/`.

## Quando usar / quando não usar

Use na fase 10, depois que `/classificacao-etaria`, `/privacidade-lgpd-e-eca-digital`, `/monetizacao-iap-e-ads`, `/licencas-e-proveniencia` e `/divulgacao-de-uso-de-ia` já rodaram, e a cada nova versão enviada. Use também para analisar uma rejeição.

Não use para: publicar na web ou itch.io (`/publicar-jogo-web`); corrigir bugs encontrados (`/ciclo-de-feature`); telemetria após aprovação (`/pos-lancamento-e-telemetria`).

Lição que organiza esta skill: no hackathon interno da RevenueCat sobre apps "vibe coded", "building the app is the actual easy part" e quase nenhum passou na primeira submissão. Trate a submissão como a feature mais difícil do projeto.

## Pré-requisitos

- Apple Developer Program ativo; Agreements, Tax and Banking assinados; App Store Connect com o app criado (bundle ID, SKU).
- Xcode 27 (macOS 26.6+, Apple silicon) ou Xcode Cloud (25 h/mês incluídas na membership) para arquivar e enviar.
- Opcional: `fastlane deliver` com App Store Connect API Key do tipo Team (sem 2FA) para metadados e screenshots.
- `bash` com `grep` (macOS) ou `rg` para `scripts/scan_placeholders.sh`.
- Saídas das skills vizinhas: faixa etária decidida, rótulos de privacidade e URL da política, IDs de IAP, `LICENCAS.md`, `PROVENANCE.md`, texto de divulgação de IA.

## Entradas

- `design/brief.md` (diferencial do jogo; necessário para 4.3(b)).
- `feature_list.json` (nenhuma feature em estado diferente de `verificado` deve estar visível no build).
- `templates/checklist-submissao-app-store.md` (copiado para `production/releases/`).
- Build candidato (`.xcarchive` ou build no Xcode Cloud) com número de versão e build definidos.

## Passos

1. **Abrir o checklist**: copie `templates/checklist-submissao-app-store.md` para `production/releases/checklist-submissao-<versao>.md`. Com `--dry-run`, apenas gere o checklist sem gravar evidências.
2. **Varrer placeholders e resíduos de IA** (Guideline 2.1(a): "placeholder text, empty websites, and other temporary content should be scrubbed"; The Alters lançou com um prompt/resposta de IA esquecido):
   ```bash
   bash .claude/skills/submissao-app-store/scripts/scan_placeholders.sh --root . \
     | tee production/evidencias/$(date +%Y-%m-%d)-submissao/scan_placeholders.log
   ```
   O script lê `scripts/placeholder-patterns.txt` (lorem, "as an AI", nomes de modelos, "negative prompt", chaves de API, localhost), ignora `node_modules`/`.git`/`Library`/`DerivedData` e retorna código ≠ 0 se achar algo. Corrija cada ocorrência ou justifique no checklist (ex.: "Gemini" como signo do zodíaco). Repita até sair 0. Para o binário final, rode `strings` no executável do `.app` e procure os mesmos termos.
3. **Revisar as guidelines de maior risco para jogos feitos com IA** (tabela com citações em `references/guidelines-relevantes.md`):
   - 4.3(b) e 4.2: escreva em uma frase o que o jogo faz que os similares não fazem; se não conseguir, volte ao brief. Categorias saturadas (ex.: "simple timers", "fortune telling") não aceitam novas submissões sem diferença significativa.
   - 4.1(c) e 5.2.1: busque o nome e o ícone na App Store e no INPI [busca de marca não verificada neste banco]; passe de semelhança em todos os assets gerados (personagens famosos, logos, fontes licenciadas).
   - 5.1.2(i): se qualquer dado pessoal vai para "third-party AI", a folha de consentimento aparece antes da primeira transmissão (ver `/privacidade-lgpd-e-eca-digital`). Foundation Models on-device/PCC não são terceiros.
   - 4.7, 4.7.1, 4.7.5 e 1.2: chatbot ou diálogo gerado em runtime visível a outros jogadores exige filtro, denúncia, bloqueio e contato publicado; chat anônimo cai em 1.2 (06/02/2026).
   - 2.5.2: o app não baixa nem executa código que mude sua funcionalidade (caso Replit/Vibecode, mar/2026 [secundário]).
   - 2.3.6 e 2.3.8: questionário etário honesto; metadados adequados a 4+.
4. **Classificação etária**: confirme a saída de `/classificacao-etaria` no App Store Connect (faixas 4+/9+/13+/16+/18+, obrigatório desde 31/01/2026; chatbot conta; perguntas de "social media capabilities" obrigatórias desde setembro de 2026 para apps novos e updates). Em dúvida, "Override to Higher Age Rating".
5. **Privacidade**: rótulos (App Privacy) coerentes com SDKs e com o privacy manifest; URL pública da política de privacidade em pt-BR; ATT se houver anúncios personalizados.
6. **IAP**: cada produto "Ready to Submit" e anexado à versão; screenshot de revisão de cada produto; botão de restaurar visível.
7. **Metadados e mídia**: nome, subtítulo, keywords, descrição e "What's New" em pt-BR e en-US; categoria Games + subcategorias; URLs de suporte e marketing funcionando (sem "empty websites"); screenshots nos tamanhos exigidos para cada família de dispositivo e pré-visualização opcional, seguindo as especificações vigentes do App Store Connect Help [página não lida nesta pesquisa]. Arte de loja retocada por humano (capsule art "cara de IA" é lida como baixo esforço). Parágrafo de divulgação de IA conforme `/divulgacao-de-uso-de-ia` (a Apple não exige, a HIG recomenda transparência).
8. **TestFlight**: build interno → convidar ≥ 5 testadores externos (passa pelo Beta App Review) → corrigir crashes do TestFlight antes de submeter. Grave screenshot da lista de testadores e do relatório de crashes.
9. **Notas para o App Review**: conta demo se houver login; como alcançar as telas de IA/chat; onde está a folha de consentimento 5.1.2(i); explicação do diferencial (4.3(b)); contato do App Review com telefone válido.
10. **Enviar**: anexar build, responder "Export Compliance", "Content Rights" (você tem licença para todo conteúdo: consulte `LICENCAS.md`) e "Advertising Identifier" (IDFA) conforme os SDKs. Itens como achievements/leaderboards podem ser submetidos separadamente desde 29/10/2025.
11. **Se rejeitado**: copie a mensagem para `production/releases/rejeicoes.md` com guideline, data e resposta; corrija ou conteste no Resolution Center com fatos (não há regra contra "vibe coding": a Apple declarou não ter regras específicas [secundário]). Não reenvie o mesmo binário sem mudança quando a guideline for 2.1(a) ou 4.3(b): "Repeated submissions of this kind may lead to removal from the Apple Developer Program".
12. **Após aprovação**: liberar manualmente ou em lançamento gradual (Phased Release) e abrir `/pos-lancamento-e-telemetria`.

## Critério de pronto e evidência

Pronto quando existirem:
- `production/releases/checklist-submissao-<versao>.md` sem itens `[ ]`; itens `[?]` (não avaliáveis) listados com motivo;
- `production/evidencias/<data>-submissao/scan_placeholders.log` terminando em "0 ocorrências";
- `testflight-externo.png` (testadores externos ativos) e `waiting-for-review.png`;
- `production/releases/rejeicoes.md` atualizado (mesmo que vazio).
Um parse check do projeto não é uma execução: o build enviado precisa ter sido instalado via TestFlight em pelo menos um iPhone real.

## Armadilhas conhecidas

- **Prompt esquecido no build** (The Alters, 2025): a varredura textual é obrigatória a cada envio, não só no primeiro.
- **Capsule art e ícone gerados sem retoque** sinalizam baixo esforço (PC Gamer, 2026) e alimentam 4.3(b).
- **5.1.2(i)**: relatos de onda de rejeições em 2026 por consentimento enterrado na política de privacidade [secundário]; a folha precisa ser explícita e anterior ao envio de dados.
- **Nome/ícone parecidos com outro app** agora têm regra própria (4.1(c), 13/11/2025).
- **App "Unrated"** não pode ser publicado; Made for Kids só 4+/9+ e irreversível após aprovação.
- **Metadados acima de 4+** (2.3.8) causam rejeição mesmo com jogo 13+.
- **Taxas de rejeição de apps feitos por IA**: nenhuma publicada pela Apple; qualquer percentual na web é inventado [secundário].
- **fastlane `precheck`** não aceita API key para IAP; `produce`/`pem` também não (docs fastlane).
- **Export Compliance**: jogos com HTTPS padrão geralmente usam isenção; se adicionar criptografia própria, prepare a documentação [não verificado].

## Fontes

- App Store Review Guidelines (Last Updated: June 8, 2026): https://developer.apple.com/app-store/review/guidelines/
- Apple Developer News 13/11/2025 (4.1(c), 4.7, 4.7.5, 5.1.2(i)): https://developer.apple.com/news/?id=ey6d8onl
- Apple Developer News 06/02/2026 (chat anônimo → 1.2): https://developer.apple.com/news/?id=d75yllv4
- Apple Developer News 08/06/2026 (4.3(a)/(b) com exemplos, 1.2): https://developer.apple.com/news/?id=a233fmpw
- Apple Developer News 29/10/2025 (submissão separada de itens; Custom Product Pages): https://developer.apple.com/news/?id=gf6mgrs6
- Apple Developer News 24/07/2025 (faixas 13+/16+/18+, prazo 31/01/2026): https://developer.apple.com/news/?id=ks775ehf
- Apple Developer News 09/07/2026 (social media capabilities): https://developer.apple.com/news/?id=tlur8uvi
- Set an app age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating
- App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- HIG Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Xcode Cloud (25 h/mês): https://developer.apple.com/xcode-cloud/
- fastlane App Store Connect API: https://github.com/fastlane/docs/blob/master/docs/app-store-connect-api.md
- RevenueCat, vibe coding apps: https://www.revenuecat.com/blog/company/revenuecat-vibe-coding-apps
- The Alters: https://www.screenhub.com.au/news/games/the-alters-ai-2671396/ [secundário]
- Replit/Vibecode e 2.5.2: https://modall.ca/blog/apple-rejecting-vibe-coded-apps [secundário]
- Rejeições 4.3(a)/4.2 em apps de IA: https://ptkd.com/journal/app-store-rejection-4-3-a-ai-slop-design-spam [secundário]
- Capsule art gerada por IA: https://pcgamer.com/gaming-industry/steam-week-in-review-spammy-ai-generated-capsule-art-is-a-pox-and-it-makes-browsing-steam-less-fun/ [secundário]
- Estrutura do checklist adaptada de Claude-Code-Game-Studios (MIT, © 2026 Donchitos): https://github.com/Donchitos/Claude-Code-Game-Studios
