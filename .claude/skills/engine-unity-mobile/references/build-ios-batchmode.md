# Build iOS em batchmode e testes do Unity Test Framework

## Caminho do Editor

- macOS (Hub): `/Applications/Unity/Hub/Editor/<versão>/Unity.app/Contents/MacOS/Unity`
- `verify.sh` aceita `--unity <caminho>` ou `UNITY_PATH`; sem isso procura a versão mais nova do Hub.

## Testes (Unity Test Framework)

```bash
"$UNITY" -batchmode -projectPath "$PROJECT" -runTests -testPlatform EditMode \
  -testResults "$OUT/editmode.xml" -logFile "$OUT/unity-tests-editmode.log"
"$UNITY" -batchmode -projectPath "$PROJECT" -runTests -testPlatform PlayMode \
  -testResults "$OUT/playmode.xml" -logFile "$OUT/unity-tests-playmode.log"
```

- Não combine `-quit` com `-runTests` (o Editor fecha sozinho ao terminar).
- O XML é NUnit 3; `verify.sh` conta `failed="N"` no nó raiz.
- Testes PlayMode em batchmode rodam sem gráficos reais; mantenha-os para lógica de componentes, não para aparência.

## Build do projeto Xcode

```bash
"$UNITY" -batchmode -nographics -quit -projectPath "$PROJECT" \
  -executeMethod BuildScripts.BuildIOS -simulator -buildOutput "$OUT/ios-xcode" \
  -logFile "$OUT/unity-build.log"
```

- `assets/BuildScripts.cs` lê `-simulator` (define `PlayerSettings.iOS.sdkVersion = iOSSdkVersion.SimulatorSDK`) e `-buildOutput`; sem `-simulator` usa `DeviceSDK`.
- Saída: `ios-xcode/Unity-iPhone.xcodeproj` (scheme `Unity-iPhone`). Em Unity 6 o projeto também pode ter `Unity-iPhone.xcworkspace` quando há pods; o `verify.sh` prefere o workspace se existir.
- Erros de compilação C# aparecem como `error CS` em `unity-build.log`; `verify.sh` falha se encontrar.

## Compilar e rodar no simulador

```bash
xcodebuild -project ios-xcode/Unity-iPhone.xcodeproj -scheme Unity-iPhone \
  -configuration Debug -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath "$OUT/DerivedData" build
xcrun simctl install "$UDID" "<…>/Unity-iPhone.app"   # nome real vem do Info.plist/Products
xcrun simctl launch "$UDID" "$BUNDLE_ID"
xcrun simctl io "$UDID" screenshot "$OUT/screenshot.png"
```

- Unity gera o `.app` com o `Product Name` do Player Settings; o script localiza por `find … -name '*.app'`.
- Logs do Unity player no simulador: `xcrun simctl spawn "$UDID" log show --predicate 'process == "<ProductName>"' --last 2m`.
- Arquivo de depuração: `Application.persistentDataPath` no iOS é `<container>/Documents`; recupere com `xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data`.

## Dispositivo e TestFlight

- Build com `--device-sdk`; abra o `.xcodeproj` para assinar (Team) ou use `xcodebuild archive` + `/ci-xcode-cloud-fastlane`.
- `apple/unityplugins` coloca os `.dSYM` no `.xcarchive` — mantenha para símbolos de crash no Organizer.

Fontes: argumentos de linha de comando do Editor e Unity Test Framework em https://docs.unity3d.com/Manual/EditorCommandLineArguments.html e https://docs.unity3d.com/Packages/com.unity.test-framework@latest [páginas não lidas nesta pesquisa; confirme flags na versão 6.3]; `xcodebuild`/`simctl` em https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line
