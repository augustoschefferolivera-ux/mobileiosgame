#!/bin/sh
# ci_post_clone.sh — modelo para Xcode Cloud (copie para ci_scripts/ na raiz do repositório e dê chmod +x).
# Roda logo após o clone, antes de resolver dependências. Nomes de script e variáveis CI_* conforme a
# documentação "Writing custom build scripts" da Apple [confirme na doc]. Mantenha idempotente e rápido.
set -eu

echo "[ci_post_clone] workspace=${CI_WORKSPACE:-?} build=${CI_BUILD_NUMBER:-?} action=${CI_XCODEBUILD_ACTION:-?}"

# Capacitor (jogo web empacotado): instala dependências e sincroniza o projeto iOS
if [ -f "${CI_WORKSPACE:-.}/package.json" ] && [ -d "${CI_WORKSPACE:-.}/ios" ]; then
  cd "${CI_WORKSPACE:-.}"
  command -v node >/dev/null 2>&1 || brew install node
  npm ci
  npm run build
  npx cap sync ios
fi

# CocoaPods (se o projeto usar Podfile)
if [ -f "${CI_WORKSPACE:-.}/ios/App/Podfile" ]; then
  cd "${CI_WORKSPACE:-.}/ios/App"
  command -v pod >/dev/null 2>&1 || brew install cocoapods
  pod install
fi

# Nativo SwiftUI/SpriteKit/RealityKit: nada a fazer (SwiftPM resolve no xcodebuild).
# Godot/Unity: gere o projeto Xcode aqui ou publique-o como artefato de outro job (ver references/fastlane-exemplos.md).
echo "[ci_post_clone] concluído"
