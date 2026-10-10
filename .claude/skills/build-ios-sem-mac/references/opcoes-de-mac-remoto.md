# Opções de macOS remoto para quem desenvolve em Linux

| Opção | Custo | Melhor para | Limites |
|---|---|---|---|
| **Xcode Cloud** | 25 h/mês incluídas na membership (US$ 99/ano [s]); tiers de US$ 49,99 (100 h) a US$ 3.999,99 (10.000 h) | Projeto Xcode já no repositório (Capacitor, export commitado); TestFlight integrado; zero manutenção | Primeiro workflow pode exigir Xcode [confirmar]; menos controle sobre ferramentas; horas extras cobradas |
| **GitHub Actions `macos-15`** | ~US$ 0,062/min [s]; multiplicador 10× em repositório privado; grátis dentro da cota de repositórios públicos | Exportar com Godot/Unity no runner; YAML versionado; segredos nativos | Minutos de macOS caros; runner frio reinstala tudo (cache ajuda) |
| **Mac na nuvem por hora** (MacStadium, Scaleway Mac mini, MacinCloud) | por hora/mês, varia | Depurar assinatura, rodar simulador, abrir Xcode uma vez para o Xcode Cloud | Precisa de disciplina para desligar; latência de tela |
| **Mac mini usado** | compra única | Volume alto de builds; simulador sempre disponível | Custo inicial; manutenção |
| macOS em VM em PC/Linux | — | — | **Viola o EULA da Apple em hardware não Apple**; não use para produto comercial |

## Fluxo recomendado para Arch + GPU Windows

1. Desenvolva e verifique localmente com Godot ou Phaser (`scripts/verify.sh` em Linux; Godot com
   `xvfb-run` para screenshot).
2. Assets gerados na estação GPU (`/estacao-gpu-remota`) ou em APIs.
3. A cada milestone: `git tag` → GitHub Actions macOS exporta, compila, assina e envia ao TestFlight.
4. Teste no iPhone físico; crashes voltam pelo MetricKit/Sentry (`/pos-lancamento-e-telemetria`).
5. Quando o volume de builds justificar, migre para Xcode Cloud ou um Mac mini.

## O que só existe em macOS (não adianta procurar alternativa em Linux)

Xcode e `xcodebuild`, simulador iOS, `xcrun mcpbridge` (MCP do Xcode), MobileBuildMCP,
ios-simulator-mcp, assinatura de código e upload oficial (`altool`/Transporter), compilação de
Swift para iOS (SpriteKit, RealityKit, Metal, Foundation Models), Reality Composer Pro, Instruments.
