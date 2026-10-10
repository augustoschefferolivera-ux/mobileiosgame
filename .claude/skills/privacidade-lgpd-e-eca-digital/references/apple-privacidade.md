# Apple: mapa de dados, consentimento 5.1.2(i), ATT, privacy manifest e rótulos

## Modelo de `docs/privacidade/mapa-de-dados.md`

| Fluxo | Dado | Identifica a pessoa? | Sai do aparelho? | Destino | Retido além da requisição? | Finalidade | Base legal (LGPD) | Rótulo App Privacy | Manifest |
|---|---|---|---|---|---|---|---|---|---|
| Anúncios (LevelPlay/AdMob) | IDFA (se ATT), IP, modelo | sim (com ATT) | sim | rede de anúncios | sim (parceiro) | publicidade | consentimento | Identifiers, Usage Data; "used for tracking" se ATT | tracking domains do SDK; NSPrivacyTracking=true |
| Crash/performance (MetricKit → seu endpoint ou Sentry) | stack, modelo, versão | não (sem ID) | sim | seu servidor/Sentry | sim | diagnóstico | legítimo interesse | Diagnostics (não vinculado) | required reason APIs usadas |
| IAP (StoreKit 2) | transação | Apple | Apple | Apple | Apple | compra | execução de contrato | Purchases (se você armazena) | — |
| Diálogo com IA em nuvem | texto digitado, contexto do jogo | potencialmente | sim | provedor LLM | depende do provedor | gameplay | consentimento (5.1.2(i)) | Other User Content | domínios do provedor se tracking |
| Diálogo com IA on-device/PCC | texto | — | PCC: sim (Apple) | Apple | não | gameplay | execução de contrato | em geral não declarável (descartado) [inferência] | — |
| Salvamento em nuvem (iCloud) | progresso | Apple ID | sim | Apple | sim | continuidade | execução de contrato | Gameplay Content | — |

Regra da Apple: "collect" = transmitir para fora do aparelho de modo que você e/ou parceiros acessem "for longer than needed to service the request in real time"; "Data sent to a server and discarded immediately after servicing a request generally does not need to be declared"; práticas de "third-party partners" (SDKs, vendors) devem ser declaradas.

## Folha de consentimento 5.1.2(i) (texto-modelo)

> **Conversar com [personagem] usa IA na nuvem**
> Para responder, o jogo envia o que você digita e o contexto da partida para [provedor], que gera a resposta. Não enviamos seu nome, e-mail ou localização. [O provedor não usa suas mensagens para treinar modelos / O provedor pode usar as mensagens conforme sua política]. As mensagens ficam guardadas por [N dias] para segurança e depois são apagadas. Você pode denunciar respostas inadequadas no menu de pausa.
> [Permitir] [Agora não — usar o modo offline]

Regras: aparece antes da primeira transmissão; não é substituída pela política de privacidade; recusa leva a fallback (Foundation Models on-device ou diálogo pré-autorado); registre a escolha e permita mudar em Configurações. A HIG pede explicar "what data may be stored off-device or used for training" e lembra que apps infantis "have stricter rules".

## ATT (anúncios personalizados)

- `Info.plist`: `NSUserTrackingUsageDescription` = "Usamos seu identificador para mostrar anúncios mais relevantes e manter o jogo gratuito."
- Chamar `ATTrackingManager.requestTrackingAuthorization` após a primeira tela útil e antes de inicializar o SDK com anúncios personalizados; tratar `.denied`/`.restricted` com anúncios não personalizados.
- Em Unity, a skill `levelplay-unity-integration` inclui o passo de ATT; em Godot, use plug-in da comunidade [não verificado].

## Privacy manifest (`PrivacyInfo.xcprivacy`)

Chaves conforme a documentação da Apple [página não lida nesta pesquisa; confirmar em developer.apple.com/documentation/bundleresources/privacy-manifest-files]:
- `NSPrivacyTracking` (bool) e `NSPrivacyTrackingDomains` (domínios que só recebem tráfego com ATT autorizado);
- `NSPrivacyCollectedDataTypes` (tipo, vinculado à identidade?, usado para tracking?, finalidades);
- `NSPrivacyAccessedAPITypes` com razões aprovadas para as required reason APIs (ex.: UserDefaults, timestamps de arquivo, system boot time, espaço em disco, teclados ativos).
Gere o Privacy Report no Xcode (Archive > Generate Privacy Report) e confira contra o mapa. SDKs de terceiros "privacy-impacting" listados pela Apple precisam de manifest e assinatura próprios.

Godot 4 (export iOS) expõe `privacy/collected_data/*`, `privacy/tracking_domains` e as required-reason APIs no preset de export.

## Rótulos App Privacy

Preencha por tipo de dado, com "Linked to you"/"Used to track you" conforme o SDK. Texto livre → "Other User Content"; gravações de voz → "Audio Data". Nenhuma regra específica para IA.

## Fontes

- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/design/human-interface-guidelines/generative-ai
- https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
- https://ptkd.com/journal/rejection-guideline-5-1-2-ai-data-sharing [secundário]
