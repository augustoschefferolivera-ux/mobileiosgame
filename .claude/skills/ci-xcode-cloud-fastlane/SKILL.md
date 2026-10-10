---
name: ci-xcode-cloud-fastlane
description: >
  Configura integração e distribuição contínuas do jogo iOS: Xcode Cloud (25 h/mês incluídas
  na membership, TestFlight integrado, scripts ci_scripts), fastlane com App Store Connect API
  Key (pilot, deliver, match, screenshots), GitHub Actions macOS como alternativa, versionamento
  e build numbers, Apple-Hosted Background Assets (200 GB). Use sempre que o usuário pedir
  TestFlight, CI, build automática, assinatura, upload de metadados/screenshots ou pipeline de
  release. Não use para submeter à revisão da App Store (skill de submissão, fase 10) nem para
  o loop local de verificação (skills engine-* e xcode-agentico).
license: MIT
compatibility: "Apple Developer Program ativo; repositório Git (GitHub/GitLab/Bitbucket) para Xcode Cloud; macOS para fastlane local; Ruby 3 para fastlane"
metadata:
  grupo: engines
  alvo: [2d, 3d, app]
  fase: [0, 3, 10]
argument-hint: "[scheme] [testflight|metadados|screenshots]"
disable-model-invocation: false
user-invocable: true
---

# CI e distribuição: Xcode Cloud + TestFlight + fastlane

Entrega um pipeline em que cada push em `main` (ou tag) compila, testa, arquiva e envia o build ao TestFlight interno, com metadados e screenshots versionados em `fastlane/` e enviados por API Key. Evidência: link/número do build no TestFlight e logs do workflow salvos em `production/evidencias/<data>-ci/`.

## Quando usar / quando não usar

- **Use** a partir da fase 3 (um build TestFlight por feature fechada vale como playtest em dispositivo) e na fase 10 para metadados/screenshots.
- **Xcode Cloud** é o padrão para um solo dev Apple-only: 25 horas de computação/mês incluídas na Apple Developer Program membership; tiers de US$ 49,99 (100 h), 99,99 (250 h), 399,99 (1.000 h) e 3.999,99 (10.000 h) por mês; integração direta com TestFlight; WWDC26: "up to twice as fast" e suporte a apps Metal em Apple silicon.
- **GitHub Actions macOS** só se o monorepo já vive no GitHub e o volume é baixo: ~US$ 0,062/min em repositórios privados (jan/2026, fonte secundária; multiplicador 10× sobre Linux).
- **Não use** esta skill para apertar "Submit for Review": `deliver`/`pilot` aqui param no TestFlight e em metadados salvos; a submissão é decisão humana na skill da fase 10.

## Pré-requisitos

- App criado em App Store Connect (bundle id, SKU); Team ID.
- **App Store Connect API Key** (Users and Access → Integrations → Team Keys; baixe o `.p8` uma vez): fastlane recomenda API Key ("No 2FA needed, better performance, documented API"), suportada em `pilot`, `deliver`, `sigh`, `cert`, `match`, `precheck` (exceto IAP), `download_dsyms`, `app_store_build_number`; não em `produce`/`pem`. Use **Team Key** (Individual Key não acessa Provisioning).
- fastlane (`brew install fastlane` ou `gem install fastlane`); segredos em variáveis de ambiente/CI, nunca no repositório.
- Projeto Xcode: nativo, `ios/App/App.xcworkspace` (Capacitor), `Unity-iPhone.xcodeproj` (Unity, gerado por `engine-unity-mobile`) ou export do Godot (`export_project_only`, pensado "when combining Godot with Fastlane").

## Entradas

- Scheme e configuração Release; bundle id; estratégia de versão (`MARKETING_VERSION` semântica; `CURRENT_PROJECT_VERSION` crescente); lista de testers internos; textos e screenshots por idioma (`pt-BR`, `en-US`).

## Passos

1. **Versionamento** (fase 0): versão em `MARKETING_VERSION` (ex.: 1.0.0) e build number inteiro crescente em `CURRENT_PROJECT_VERSION`. Xcode Cloud fornece `CI_BUILD_NUMBER`; fastlane tem `increment_build_number` e `app_store_build_number` (API Key) para consultar o último build. Nunca reutilize número de build na mesma versão (upload rejeitado). Comando Apple: `xcrun agvtool new-version -all <n>` [confirme na doc do agvtool].
2. **Xcode Cloud** (fase 3): Xcode → Product → Xcode Cloud → Create Workflow: start condition `branch main` (e `tag v*` para release), ação Archive para iOS, pós-ação TestFlight Internal Testing; ambiente com a versão do Xcode do projeto. Passos custom em `ci_scripts/` na raiz do repositório: `ci_post_clone.sh` (dependências: `npm ci && npx cap sync ios` para Capacitor; templates do Godot; nada para nativo), `ci_pre_xcodebuild.sh`, `ci_post_xcodebuild.sh` (coletar `xcresult`). Modelo em `assets/ci_scripts/ci_post_clone.sh` [nomes dos scripts/variáveis `CI_*` conforme doc da Apple — página não lida nesta pesquisa; confirme].
3. **Testes no CI**: ação Test no workflow com o plano de testes do scheme; falha bloqueia o arquivo. Xcode Cloud mostra cobertura nos relatórios (desde 06/2025).
4. **fastlane** (fase 3/10): `fastlane init` → `Fastfile` com lanes `beta` (TestFlight), `metadata` (textos) e `screenshots` (upload). Exemplo completo em `references/fastlane-exemplos.md` e `assets/Fastfile.exemplo`. Lane `beta`: `app_store_connect_api_key` → `sync_code_signing(type: "appstore")` (match) → `build_app(scheme:)` → `upload_to_testflight(skip_waiting_for_build_processing: true)`.
5. **Assinatura**: `match` com repositório Git privado ou S3 criptografado; em Xcode Cloud a assinatura é gerida pela Apple (cloud signing), então use `match` só para GitHub Actions/local.
6. **Screenshots** (fase 10): jogos não têm árvore de acessibilidade para `snapshot`; gere com `xcrun simctl io <udid> screenshot` nos tamanhos exigidos (6,9" e 6,5", iPad 13" se suportar) via `/playtest-automatizado`, organize em `fastlane/screenshots/<locale>/` e envie com `deliver --skip_binary_upload --skip_metadata false --force`. Enquadre com `frameit` se quiser molduras.
7. **Background Assets** (fase 6/10, jogos com muitos assets): Apple-Hosted Background Assets — até 200 GB por app incluídos na membership desde o iOS 26; packs localizados no iOS 27; empacote com `xcrun ba-package`; Xcode 27 inicia o mock server automaticamente; Unity tem plug-in oficial (`apple/unityplugins`, exige Xcode 27). Reduz o IPA e evita rejeição por tamanho.
8. **GitHub Actions** (alternativa): runner macOS, `xcodebuild -resolvePackageDependencies`, `fastlane beta` com segredos (`APP_STORE_CONNECT_API_KEY_*`, `MATCH_PASSWORD`); cache de DerivedData; mantenha minutos baixos (uma build por merge). Exemplo em `references/fastlane-exemplos.md`.
9. **Evidência**: salve o log do workflow (Xcode Cloud → Report Navigator → Export) ou `fastlane` em `production/evidencias/<data>-ci/` com o número do build do TestFlight.

## Critério de pronto e evidência

- Um build chegou ao TestFlight interno a partir do CI (não do Xcode local) e está instalado em um iPhone de teste; `production/evidencias/<data>-ci/` contém log do workflow + `build_number.txt` + screenshot do TestFlight.
- `fastlane metadata` subiu textos em `pt-BR`/`en-US` sem erro (`deliver` em modo sem submissão).
- Build local no Xcode não é CI.

## Verificar no simulador/dispositivo

- Instale o build do TestFlight no iPhone e rode o roteiro de `/playtest-automatizado`; crashes aparecem no Organizer (e via MCP do Xcode 27) em até ~1 dia.
- Para builds de simulador no CI (sem assinatura): `xcodebuild build-for-testing` + `test-without-building` com `.xctestrun` (Xcode 26 inclui configurações desabilitadas no `.xctestrun`, executáveis com `-only-test-configuration`).

## Armadilhas conhecidas

- **Horas**: 25 h/mês somem rápido com arquivos de 15–20 min; use `--no-run` local antes de dar push e condicione workflows a branches.
- **Dois lugares assinando**: Xcode Cloud (cloud signing) e `match` em paralelo geram perfis conflitantes; escolha um por pipeline.
- **API Key individual** não acessa Provisioning (fastlane): crie Team Key.
- **Build number repetido** → upload rejeitado; **versão de export** com known issue no Xcode 26.2 (development distribution) nas notas do Xcode Cloud.
- **Unity/Godot**: regenere o projeto Xcode a cada release no CI (não commite o gerado); `.dSYM` dos plug-ins da Apple vão para o `.xcarchive`.
- **TestFlight externo** exige Beta App Review (parcial) e metadados; interno é imediato até 100 testers.
- **Preços**: Xcode Cloud (oficial) vs GitHub Actions (secundário, confirme em github.com/pricing).
- **Segredos**: `.p8` e `MATCH_PASSWORD` só em secrets do CI; `git-secrets`/hook de pré-commit.

## Fontes

- Xcode Cloud (horas incluídas, tiers, TestFlight): https://developer.apple.com/xcode-cloud/ ; release notes: https://developer.apple.com/xcode-cloud/release-notes/
- WWDC26 Platforms State of the Union (Xcode Cloud 2× mais rápido, Metal): https://developer.apple.com/videos/play/wwdc2026/102/
- fastlane — App Store Connect API: https://github.com/fastlane/docs/blob/master/docs/app-store-connect-api.md ; iOS beta deployment: https://github.com/fastlane/docs/blob/master/docs/getting-started/ios/beta-deployment.md
- GitHub Actions macOS ~US$ 0,062/min [secundário]: https://cicdcost.com/github-actions-pricing
- WWDC26 sessão 378 (Apple-Hosted Background Assets 200 GB, packs localizados, `ba-package`, plug-ins Unity): https://developer.apple.com/videos/play/wwdc2026/378/
- Godot `export_project_only` + fastlane: https://github.com/godotengine/godot/blob/master/platform/ios/doc_classes/EditorExportPlatformIOS.xml
- Xcode 26 Release Notes (`.xctestrun`, runtime issues via xcodebuild): https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes
- Xcode Cloud custom build scripts (`ci_scripts/ci_post_clone.sh`, variáveis `CI_*`) [não lida nesta pesquisa; confirme]: https://developer.apple.com/documentation/xcode/writing-custom-build-scripts
