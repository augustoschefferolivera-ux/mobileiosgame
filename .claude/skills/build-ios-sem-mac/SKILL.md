---
name: build-ios-sem-mac
description: >
  Compila, assina e envia ao TestFlight/App Store um jogo iOS a partir de um PC Linux (Arch) sem
  Mac local, usando macOS remoto: Xcode Cloud (25 h/mês incluídas na membership), runner macOS do
  GitHub Actions ou Mac alugado na nuvem, com exportação do projeto Xcode (Godot, Unity, Capacitor)
  feita no próprio runner e upload por fastlane com App Store Connect API Key. Explica o que nunca
  roda em Linux (Xcode, simulador, assinatura, Foundation Models), por que não usar macOS em VM em
  hardware não Apple e como testar em iPhone físico via TestFlight. Use sempre que o usuário disser
  "não tenho Mac", "estou no Linux/Arch", "como gero o .ipa", "TestFlight sem Xcode" ou quando
  `/instalar-ferramentas` reportar macOS ausente com alvo app. Não use para configurar o CI quando
  já existe um Mac local (/ci-xcode-cloud-fastlane cobre o detalhe de fastlane e Xcode Cloud).
license: MIT
compatibility: "PC Linux com git e ssh; conta Apple Developer Program; repositório GitHub (para Actions) ou App Store Connect com Xcode Cloud"
metadata:
  grupo: engines
  alvo: [2d, 3d, app]
  fase: [0, 3, 10]
argument-hint: "[xcode-cloud | github-actions | mac-nuvem]"
disable-model-invocation: false
user-invocable: true
---

# Build iOS sem Mac local

Entrega um `.ipa` assinado chegando ao TestFlight a partir de um `git push` feito no Linux, com o
log do runner macOS e o número do build gravados em `production/evidencias/<data>-build-ios/`.

## Quando usar / quando não usar

- **Use** quando o desenvolvimento acontece em Linux (Arch) e o alvo inclui App Store.
- **Use** para decidir entre Xcode Cloud, GitHub Actions macOS e Mac na nuvem.
- **Não use** para o loop diário de verificação: no Linux ele roda com Godot/Phaser localmente
  (`/montar-loop-de-verificacao`); o build iOS é um evento por milestone, não por feature.
- **Não use** para submissão à revisão (`/submissao-app-store`) nem para metadados (`/ci-xcode-cloud-fastlane`).

## Pré-requisitos

- Engine cujo export iOS pode ser feito no runner: Godot (`--headless --export-release`), Unity
  (módulo iOS Build Support gera o projeto Xcode; compilar exige macOS), Capacitor (`npx cap sync ios`).
  Jogos nativos SwiftUI/SpriteKit/RealityKit exigem escrever Swift sem compilar localmente: evite esse
  caminho no Linux ou use um Mac na nuvem por hora.
- Apple Developer Program ativo; App Store Connect API Key (Issuer ID, Key ID, arquivo `.p8`) para
  fastlane; certificados via `match` (repositório privado) ou assinatura automática com
  `xcodebuild -allowProvisioningUpdates -authenticationKeyPath ...` [confirmar flags na doc da Apple].
- Repositório no GitHub (Actions) ou conectado ao Xcode Cloud.

## Entradas

- `production/engine.txt`, `docs/decisoes/ADR-0001-engine-e-alvo.md`, bundle id, Team ID,
  versão/build number, o preset de export (Godot) ou o script de build (Unity).
- Segredos (nunca no repositório): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` (base64 do `.p8`),
  `MATCH_PASSWORD`/`MATCH_GIT_URL` se usar match.

## Passos

1. **Escolha o caminho** com `references/opcoes-de-mac-remoto.md`:
   - **Xcode Cloud** se quiser zero manutenção e já tiver um projeto Xcode no repositório (Capacitor
     ou export commitado); 25 h/mês incluídas. Se a criação do primeiro workflow exigir abrir o Xcode
     uma vez [confirmar], faça isso num Mac emprestado ou na nuvem por hora.
   - **GitHub Actions `macos-15`** se precisar exportar com Godot/Unity no próprio runner e controlar
     tudo por YAML. Custo por minuto com multiplicador em repositório privado (~US$ 0,062/min [secundário]).
   - **Mac na nuvem por hora** (MacStadium, Scaleway Mac mini, MacinCloud) para depurar assinatura ou
     rodar o simulador uma vez; depois volte ao CI.
2. **Export no runner, não no Linux.** Copie `assets/github-actions-ios.yml` para
   `.github/workflows/ios.yml` e ajuste os blocos marcados `# AJUSTE`: versão do Godot e dos export
   templates (fixadas, com checksum), nome do preset, scheme, bundle id. O Godot exporta o projeto
   Xcode no macOS (`godot --headless --export-release "iOS" build/ios/jogo.xcodeproj`
   [confirmar sintaxe na doc 4.7]); o `xcodebuild archive` e o `fastlane pilot` fazem o resto.
3. **Segredos** em Settings → Secrets do repositório; no YAML eles viram variáveis de ambiente lidas
   pelo fastlane (`app_store_connect_api_key`). Nunca imprima o `.p8` no log.
4. **Primeiro build**: faça `git tag v0.1.0 && git push --tags`; acompanhe o job; baixe o log como
   evidência. Erros típicos: Team ID ausente no preset, ícone com alfa, privacy manifest faltando,
   versão de Godot diferente dos templates.
5. **Teste em iPhone físico** via TestFlight interno (sem revisão). O loop de verificação visual no
   Linux continua sendo o do engine (Godot/Playwright); o iPhone fecha o que o simulador faria.
6. **Registre**: número do build, commit, duração e custo em `production/evidencias/<data>-build-ios/`
   e no `progress.md`.

## Critério de pronto e evidência

- Job verde no CI; `.ipa` aceito pelo TestFlight (e-mail/painel) e instalado em um iPhone real.
- Log do runner e `xcodebuild` salvos como evidência; `feature_list.json` da milestone com `evidencia`.
- Custo e tempo do build anotados para dimensionar minutos de CI.

## Armadilhas conhecidas

- **macOS em VM/Hackintosh em hardware não Apple viola o EULA da Apple**: não é caminho para produto comercial.
- O export iOS do Godot e a compilação exigem macOS com Xcode segundo a documentação; fazer tudo no
  runner evita depender do que o Godot em Linux consegue ou não gerar.
- Unity: o módulo iOS em Linux gera projeto Xcode mas não compila [confirmar]; licença de assento e
  ativação no runner precisam de `UNITY_LICENSE`/serial como segredo.
- Xcode Cloud: `ci_scripts/ci_post_clone.sh` instala dependências (ver `/ci-xcode-cloud-fastlane`);
  horas acima das 25 incluídas são cobradas.
- Não é possível rodar o simulador iOS, o MCP do Xcode ou MobileBuildMCP no Linux; os MCPs
  correspondentes foram removidos deste repositório (sem Mac local).
- Foundation Models, GameKit, StoreKit só compilam no macOS: escreva o código no Linux, compile no CI,
  e teste no iPhone; mantenha diffs pequenos para não acumular erros de compilação.

## Fontes

- Relatório `reports/Criação de jogos totalmente por IA.md` (seção "Testes e publicação": Xcode Cloud 25 h/mês, tiers, GitHub Actions macOS, fastlane com API Key).
- Xcode Cloud: https://developer.apple.com/xcode-cloud/
- fastlane App Store Connect API: https://github.com/fastlane/docs/blob/master/docs/app-store-connect-api.md
- Godot, Exporting for iOS: https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_ios.rst
- GitHub Actions preços macOS [secundário]: https://cicdcost.com/github-actions-pricing
