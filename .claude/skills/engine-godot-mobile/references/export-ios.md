# Export iOS do Godot 4.7: preset, Xcode, simulador e CI

## Preset em `export_presets.cfg` (versionado, sem segredos)

Campos relevantes da classe `EditorExportPlatformIOS` (documentação oficial):

- `application/export_project_only = true` — gera só o projeto Xcode (sem .xcarchive/.ipa), "when combining Godot with Fastlane or other build pipelines".
- `application/app_store_team_id`, `application/bundle_identifier` — obrigatórios.
- `capabilities/performance_a12 = true` — restringe a A12+; exports Metal (Forward+/Mobile) já fazem isso por padrão desde 4.5.2.
- `capabilities/performance_gaming_tier` — exige A17 Pro+ (iPhone 15 Pro em diante); só para jogos pesados.
- `shader_baker/enabled` — pré-compila shaders (só Forward+/Mobile); reduz travadas no primeiro uso.
- `privacy/collected_data/*`, `privacy/tracking_domains`, `privacy/*_access_reasons` — privacy manifest exigido pela Apple; preencha conforme SDKs (ex.: analytics) e `UserDefaults`.
- Ícones dark/tinted (iOS 18+) no preset.

Assinatura em CI via variáveis de ambiente documentadas (`GODOT_IOS_PROVISIONING_PROFILE_UUID_RELEASE` etc.) — ou deixe a assinatura para o fastlane `match` no projeto Xcode exportado.

## Comandos

```bash
# Importar recursos (necessário antes do primeiro export em máquina limpa)
godot --headless --path game --import

# Projeto Xcode (export_project_only=true no preset "iOS")
godot --headless --path game --export-release "iOS" build/ios/Game.xcodeproj

# Debug build para dispositivo (depuração remota)
godot --headless --path game --export-debug "iOS" build/ios-debug/Game.xcodeproj
```

Saída: `build/ios/Game.xcodeproj` + `Game/` (dados `.pck`, `Info.plist`, `.xcprivacy`). Scheme tem o nome do projeto.

## Simulador (renderer Compatibility)

```bash
UDID=$(xcrun simctl list devices available -j | python3 -I -c 'import json,sys; d=json.load(sys.stdin)["devices"]; print(next(x["udid"] for r,v in d.items() if "iOS" in r for x in v if x["name"]=="iPhone 17"))')
xcodebuild -project build/ios/Game.xcodeproj -scheme Game -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath build/DerivedData build
xcrun simctl boot "$UDID" || true; xcrun simctl bootstatus "$UDID" -b
APP=$(find build/DerivedData/Build/Products -name '*.app' -path '*iphonesimulator*' | head -1)
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$(plutil -extract CFBundleIdentifier raw "$APP/Info.plist")"
sleep 8 && xcrun simctl io "$UDID" screenshot production/evidencias/$(date +%F)-ios-sim/screenshot.png
```

- Exporte com `rendering/renderer/rendering_method.mobile = "gl_compatibility"` para o simulador (override por plataforma em `project.godot`), mantendo Mobile para dispositivos.
- Mac Apple silicon roda o `.ipa`/app iOS nativamente (sem limitação do simulador) — útil para testar Metal sem iPhone.

## Dispositivo e TestFlight

- Abra o `.xcodeproj` uma vez para fixar Team e capabilities (Game Center, Push se usar) ou faça pelo `project.pbxproj` com cuidado.
- Arquivar/enviar: `/ci-xcode-cloud-fastlane` (`build_app` + `pilot`). O projeto exportado é a entrada; regenere-o a cada release (não edite à mão o que o Godot sobrescreve).
- Plug-ins iOS (Game Center, IAP, haptics) são comunitários (`godot-ios-plugins` e similares); confira versão compatível com 4.7 e licença antes de incluir.

## CI (Linux headless + macOS para iOS)

- Linux: `godot --headless --path game --import` → testes (GUT/gdUnit4) → `--export-release "Web"`/Android se houver. Imagem Docker comunitária com templates (ex.: `barichello/godot-ci`) [secundário, confirmar versão 4.7].
- macOS (Xcode Cloud ou GitHub Actions `macos-*`): instale Godot 4.7.x + templates, rode o export iOS, depois `xcodebuild archive`/fastlane.
- GitHub Actions macOS custa ~US$ 0,062/min em repositórios privados (jan/2026, fonte secundária); prefira Xcode Cloud (25 h/mês incluídas) para o passo iOS.

Fontes: EditorExportPlatformIOS.xml e exporting_for_ios.rst (links no SKILL.md); fastlane App Store Connect API: https://github.com/fastlane/docs/blob/master/docs/app-store-connect-api.md
