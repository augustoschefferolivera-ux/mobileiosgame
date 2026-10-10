---
name: privacidade-lgpd-e-eca-digital
description: >
  Mapeia os fluxos de dados do jogo (SDKs de anúncio, analytics, crash, IAP, LLM em nuvem,
  texto digitado pelo jogador) e produz o que a LGPD, o ECA Digital (Lei 15.211/2025) e a
  Apple exigem: base legal e minimização, logs de LLM sem dados pessoais, contato do
  encarregado, política de privacidade em pt-BR, folha de consentimento para IA de
  terceiros (Guideline 5.1.2(i)), rótulos App Privacy, privacy manifest
  (PrivacyInfo.xcprivacy, required reason APIs, tracking domains), ATT quando houver
  anúncios, restrições da Kids Category e o equivalente no Google Play (denúncia em apps
  de IA generativa). Use quando o usuário falar em privacidade, LGPD, dados de menores,
  consentimento, ATT/IDFA, "privacy labels", "privacy manifest" ou antes de qualquer
  submissão. Não use para a classificação etária (classificacao-etaria) nem para a
  divulgação de IA ao jogador (divulgacao-de-uso-de-ia).
license: MIT
compatibility: "Claude Code ou Codex; Xcode 27 para o privacy manifest e teste de ATT no simulador"
metadata:
  grupo: publicacao
  alvo: [2d, 3d, app, web]
  fase: [5, 9, 10]
argument-hint: "[mapear|consentimento|manifest|politica|auditar]"
disable-model-invocation: false
user-invocable: true
---

# Privacidade: LGPD, ECA Digital e Apple

Entrega `docs/privacidade/mapa-de-dados.md`, `PrivacyInfo.xcprivacy` no target, rótulos App Privacy coerentes com os SDKs, política de privacidade publicada em pt-BR, folha de consentimento 5.1.2(i) (se houver IA de terceiros) e ATT (se houver anúncios), com screenshots do iPhone em `production/evidencias/<data>-privacidade/`.

## Quando usar / quando não usar

Use (a) na fase 5 ao adicionar qualquer SDK ou LLM em nuvem; (b) na fase 9 para a política e o mapa de dados; (c) na fase 10 para rótulos e manifest. Use sempre que o público incluir menores de 18 (ECA Digital) ou o jogo for distribuído na UE (GDPR, fora do escopo detalhado aqui).

Não use para: faixa etária (`/classificacao-etaria`); texto de divulgação de IA (`/divulgacao-de-uso-de-ia`); implementação de anúncios/IAP em si (`/monetizacao-iap-e-ads`). Nada aqui é aconselhamento jurídico; valide a política e as bases legais com advogado, especialmente para menores.

## Pré-requisitos

- Lista de SDKs e provedores com versão (`LICENCAS.md`).
- Decisão sobre IA em runtime: on-device (Foundation Models), PCC ou nuvem de terceiros (Claude, Gemini etc.).
- Xcode 27 para editar `PrivacyInfo.xcprivacy` e testar ATT no simulador; para Godot, os campos `privacy/collected_data/*` e `privacy/tracking_domains` do export iOS; para Unity, o template de manifest do SDK de anúncios (a skill `levelplay-unity-integration` cobre ATT e GDPR).
- Domínio para hospedar a política (pode ser GitHub Pages/Cloudflare Pages, ver `/publicar-jogo-web`).

## Entradas

- `design/brief.md` (público, idade mínima, países).
- `feature_list.json` (features que coletam ou transmitem dados).
- Documentação de cada SDK sobre dados coletados e domínios de tracking (não lida nesta pesquisa; leia a do fornecedor).

## Passos

1. **Mapear dados** em `docs/privacidade/mapa-de-dados.md` (modelo em `references/apple-privacidade.md`): para cada fluxo — SDK de anúncios, analytics, crash (MetricKit/Sentry), IAP, LLM, salvamento em nuvem, texto/áudio do jogador — registre dado, finalidade, destino, retenção, se identifica a pessoa, se sai do aparelho e se é retido "for longer than needed to service the request in real time" (definição de "collect" da Apple).
2. **Minimizar**: remover identificadores desnecessários; preferir on-device (Foundation Models: "On-device models keep people's information on their device"); não enviar texto do jogador a LLM de nuvem sem necessidade; truncar e anonimizar logs de LLM (sem nome, e-mail, Apple ID, localização); definir retenção curta.
3. **LGPD** (Lei 13.709/2018) — detalhes em `references/lgpd-e-eca-digital.md`: escolher a base legal por fluxo (consentimento para anúncios personalizados; execução de contrato para IAP/salvamento; legítimo interesse para crash/analytics agregados, documentado); princípios de finalidade, necessidade e transparência; nomear o encarregado (contato público); atender direitos do titular (acesso, exclusão); dados de crianças exigem consentimento específico de um dos pais ou responsável [art. 14; confirmar texto vigente]. ANPD prioriza crianças e adolescentes no Mapa de Temas Prioritários 2026–2027 (Resolução CD/ANPD nº 30/2025) [secundário].
4. **ECA Digital (Lei 15.211/2025, em vigor desde março de 2026 [secundário])**: se o jogo pode ser usado por menores — verificação ou declaração confiável de idade coerente com a faixa (`/classificacao-etaria`), supervisão parental onde houver chat/compras, nenhuma publicidade nociva, nenhum "design enganoso" (timers falsos, botões escondidos, loops de recompensa manipulativos). Caso Discord (ago/2026): ANPD suspendeu o "Go Live" por falhas de proteção a menores [secundário].
5. **Apple — consentimento 5.1.2(i)**: se dados pessoais (inclusive texto livre do jogador) vão para "third-party AI", mostre uma folha explícita antes da primeira transmissão: o que é enviado, para quem, para quê, se é usado em treinamento, como recusar (fallback on-device/pré-autorado). Texto-modelo na referência. Foundation Models on-device/PCC não são terceiros (inferência do relatório; a Apple não lista exceções).
6. **Apple — ATT**: se qualquer SDK rastreia entre apps (anúncios personalizados): `NSUserTrackingUsageDescription` em pt-BR e `ATTrackingManager.requestTrackingAuthorization` antes de carregar o SDK; sem autorização, anúncios não personalizados. Kids Category: anúncios e analytics de terceiros restritos [confirmar regras vigentes na seção 1.3 das Guidelines].
7. **Apple — privacy manifest**: criar `PrivacyInfo.xcprivacy` no target com `NSPrivacyTracking`, `NSPrivacyTrackingDomains`, `NSPrivacyCollectedDataTypes` e `NSPrivacyAccessedAPITypes` (required reason APIs: UserDefaults, timestamps de arquivo, boot time, espaço em disco, teclados ativos) [nomes de chave conforme documentação Apple; página não lida nesta pesquisa — confirme em developer.apple.com/documentation/bundleresources/privacy-manifest-files]; SDKs de terceiros listados pela Apple precisam de manifest e assinatura próprios. Godot: preencher os campos `privacy/*` do export iOS.
8. **Apple — rótulos App Privacy**: declarar cada tipo (ex.: "Other User Content" para texto livre, "Audio Data" para voz, identificadores de anúncio, diagnósticos) e as práticas dos parceiros/SDKs; dados enviados e descartados imediatamente após atender a requisição "generally does not need to be declared"; nenhuma regra específica para IA.
9. **Política de privacidade** em pt-BR (e en): estrutura em `references/lgpd-e-eca-digital.md`; publicar em URL pública; linkar no App Store Connect, no app (Configurações) e no site. Se há IA em runtime, seção "IA e seus dados" com provedor, finalidade, retenção e como denunciar.
10. **Google Play (se houver)**: Data safety form coerente; apps de IA generativa precisam de denúncia/sinalização in-app (aviso de 30/10/2025 [secundário]); políticas de famílias se público infantil.
11. **Auditar**: comparar `mapa-de-dados.md` × rótulos × manifest × política × SDKs; qualquer dado que aparece em um e não nos outros é erro. Gravar `auditoria-privacidade.md` com a tabela.

## Verificar no simulador/dispositivo

- Folha de consentimento aparece antes da primeira chamada de rede ao provedor de IA (verifique com log de rede ou breakpoint); recusar leva ao fallback sem erro.
- Prompt do ATT aparece uma vez, com texto em pt-BR; negar não quebra o jogo.
- Configurações > Privacidade do iOS mostram o app com as permissões esperadas; o Privacy Report do app (Xcode > Product > Archive > Generate Privacy Report) lista os domínios e APIs declarados.

## Critério de pronto e evidência

Pronto quando `production/evidencias/<data>-privacidade/` contiver: `consentimento-ia.png` (se aplicável), `att.png` (se aplicável), `privacy-report.pdf` (gerado pelo Xcode), `rotulos-app-privacy.png`, `politica-url.txt` e `auditoria-privacidade.md` sem divergências. Um `PrivacyInfo.xcprivacy` sem o Privacy Report gerado não é evidência.

## Armadilhas conhecidas

- **5.1.2(i)**: relatos de onda de rejeições em 2026 por consentimento enterrado na política [secundário]; a folha precisa ser explícita e anterior.
- **Texto livre do jogador** enviado a LLM é dado pessoal potencial; declare como "Other User Content" ou evite com on-device.
- **Rótulos incoerentes com SDKs** (anúncio declarado como "não coleta") são causa comum de rejeição e de reclamação à ANPD.
- **Menores**: ECA Digital + LGPD art. 14; sem verificação de idade coerente, não ofereça chat nem compras a quem declarou ser menor.
- **Logs de LLM** com prompts completos viram banco de dados pessoais; trunque, anonimize, defina retenção.
- **Kids Category** é irreversível após aprovação e restringe analytics/anúncios.
- **Godot/Unity**: o manifest do SDK de anúncios precisa estar no build final, não só no editor.
- **Licença/termos do provedor de IA** podem permitir treinamento com seus dados; a HIG pede explicar isso ao usuário.

## Fontes

- App Store Review Guidelines (1.2, 1.3, 5.1.2(i)): https://developer.apple.com/app-store/review/guidelines/
- Apple Developer News 13/11/2025 (5.1.2(i) "third-party AI"): https://developer.apple.com/news/?id=ey6d8onl
- App privacy details (definição de "collect"; dados descartados): https://developer.apple.com/app-store/app-privacy-details/
- HIG Generative AI (dados ao servidor, treinamento, apps infantis): https://developer.apple.com/design/human-interface-guidelines/generative-ai
- WWDC26 SOTU (Foundation Models on-device/PCC): https://developer.apple.com/videos/play/wwdc2026/102/
- Godot export iOS (campos de privacy manifest): https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
- Relatos de rejeição 5.1.2(i): https://ptkd.com/journal/rejection-guideline-5-1-2-ai-data-sharing [secundário]
- ECA Digital / ANPD / Discord: https://abes.org.br/o-eca-digital-e-a-nova-fronteira-da-fiscalizacao-das-plataformas-no-brasil/ ; https://confidata.com.br/blog/lgpd-2026-o-que-anpd-espera ; https://cesconbarrieu.com.br/seis-anos-da-lgpd-consolidacao-regulatoria-novas-competencias-e-os-desafios-da-inteligencia-artificial/ [secundário]
- Google Play (30/10/2025): https://support.google.com/googleplay/android-developer/announcements/13412212?hl=en [secundário, não verificado]; https://www.sume.com/blog/google-play-ai-generated-content-policy-in-app-report-button-ai-video-app [secundário]
- Unity Agent Plugin (`levelplay-unity-integration`: ATT/GDPR): https://github.com/Unity-Technologies/unity-agent-plugin
