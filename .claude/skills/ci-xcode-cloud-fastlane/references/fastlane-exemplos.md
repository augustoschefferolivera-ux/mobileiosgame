# fastlane: lanes de referência para jogos iOS

Fonte das ações e do suporte a API Key: docs do fastlane (links no SKILL.md). Confira nomes de parâmetros na versão instalada (`fastlane action upload_to_testflight`).

## Autenticação (API Key, sem 2FA)

```ruby
# fastlane/Fastfile
default_platform(:ios)

def api_key
  app_store_connect_api_key(
    key_id: ENV.fetch("ASC_KEY_ID"),
    issuer_id: ENV.fetch("ASC_ISSUER_ID"),
    key_content: ENV.fetch("ASC_KEY_P8"),   # conteúdo do .p8 em secret (ou key_filepath:)
    in_house: false
  )
end
```

## Lane `beta` (TestFlight interno)

```ruby
platform :ios do
  desc "Arquiva e envia ao TestFlight interno"
  lane :beta do
    key = api_key
    sync_code_signing(type: "appstore", readonly: true, api_key: key)   # match
    build_number = latest_testflight_build_number(api_key: key) + 1
    increment_build_number(build_number: build_number)
    build_app(scheme: ENV.fetch("SCHEME", "MeuJogo"), export_method: "app-store", configuration: "Release")
    upload_to_testflight(api_key: key, skip_waiting_for_build_processing: true, distribute_external: false)
    File.write("../production/evidencias/#{Time.now.strftime('%Y-%m-%d')}-ci/build_number.txt", build_number.to_s) rescue nil
  end
```

## Lane `metadata` e `screenshots` (sem submissão)

```ruby
  desc "Sobe textos (fastlane/metadata/<locale>/) sem enviar binário nem submeter"
  lane :metadata do
    deliver(api_key: api_key, skip_binary_upload: true, skip_screenshots: true,
            submit_for_review: false, force: true)
  end

  desc "Sobe screenshots de fastlane/screenshots/<locale>/ (gerados por simctl no playtest)"
  lane :screenshots do
    deliver(api_key: api_key, skip_binary_upload: true, skip_metadata: true,
            submit_for_review: false, overwrite_screenshots: true, force: true)
  end
end
```

- `submit_for_review: false` sempre nesta skill; a submissão é humana (skill da fase 10).
- Estrutura: `fastlane/metadata/pt-BR/{name,subtitle,description,keywords,release_notes}.txt`; `fastlane/screenshots/pt-BR/*.png` nos tamanhos exigidos pelo App Store Connect (6,9" iPhone obrigatório; confira a tabela atual).
- `precheck` (API Key, exceto IAP) antes de `deliver` pega metadados com termos proibidos.

## Screenshots de jogo sem `snapshot`

`snapshot` depende de XCUITest e acessibilidade; cenas de jogo não expõem. Use:

```bash
xcrun simctl boot "iPhone 17 Pro Max"   # [confirmar nome do dispositivo no runner]
# … lance o app e navegue até a tela (playtest-automatizado)
xcrun simctl io booted screenshot fastlane/screenshots/pt-BR/01_gameplay.png
```

Repita por tamanho de dispositivo; `frameit` adiciona moldura/texto opcionalmente.

## GitHub Actions (alternativa)

```yaml
name: ios-beta
on: { push: { branches: [main] } }
jobs:
  beta:
    runs-on: macos-latest        # confirme a imagem/versão do Xcode disponível no runner
    steps:
      - uses: actions/checkout@v4
      - run: sudo xcode-select -s /Applications/Xcode.app
      - run: gem install fastlane
      - run: fastlane beta
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_P8: ${{ secrets.ASC_KEY_P8 }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
```

Custo macOS ~US$ 0,062/min em repositórios privados (jan/2026, secundário); uma build de 20 min ≈ US$ 1,24.

## Xcode Cloud: `ci_scripts/`

- `ci_post_clone.sh` roda após o clone (instalar Node/CocoaPods/templates); `ci_pre_xcodebuild.sh` antes do build; `ci_post_xcodebuild.sh` depois (ex.: copiar `xcresult`, notificar). Os scripts precisam ser executáveis e estar em `ci_scripts/` na raiz do repositório. Variáveis como `CI_WORKSPACE`, `CI_BUILD_NUMBER`, `CI_XCODEBUILD_ACTION` [confirme na doc da Apple].
- Modelo: `assets/ci_scripts/ci_post_clone.sh`.

## Godot e Unity

- Godot: `godot --headless --path game --export-release "iOS" build/ios/Game.xcodeproj` no `ci_post_clone.sh` (precisa do binário + templates 4.7.x no runner); depois o workflow arquiva o `.xcodeproj` exportado.
- Unity: gere `Unity-iPhone.xcodeproj` em um runner com Unity (licença de build) e commite/arquive o projeto como artefato; o Xcode Cloud só arquiva.

Fontes: https://github.com/fastlane/docs/blob/master/docs/app-store-connect-api.md ; https://github.com/fastlane/docs/blob/master/docs/getting-started/ios/beta-deployment.md ; https://developer.apple.com/xcode-cloud/
