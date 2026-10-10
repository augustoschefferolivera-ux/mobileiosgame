---
paths:
  - "**/*.cs"
  - "Assets/**"
  - "ProjectSettings/**"
  - "Packages/manifest.json"
---
# Regras para Unity (C#)

- Unity 6.3 LTS fixado; `Asset Serialization = Force Text` para o agente ler cenas/prefabs.
- Use as skills oficiais do plug-in da Unity quando existirem (`2d-pixel-perfect`,
  `manage-sprite-atlas`, `create-2d-physics`, `implement-in-app-purchases`,
  `levelplay-unity-integration`, `optimize-audio`, ...); não reinvente o que elas cobrem.
- Sem alocações em `Update`: cache de componentes, pooling, `StringBuilder`; evite `Find*`.
- 2D: Sprite Atlas por configuração de compressão (ASTC no iOS), Pixel Perfect Camera quando pixel art.
- IAP/GameKit/Background Assets via `apple/unityplugins`; nunca chaves de API no cliente.
- Unity AI (Assistant/Generators) consome créditos rapidamente e marca assets como "AI-generated":
  registre também no `PROVENANCE.md`; a declaração nas lojas é sua responsabilidade.
- Testes: Unity Test Framework em batchmode (`-runTests -batchmode -testPlatform PlayMode`);
  `scripts/verify.sh` constrói, roda e captura screenshot.
