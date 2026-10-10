---
paths:
  - "**/*.gd"
  - "**/*.tscn"
  - "**/*.tres"
  - "**/project.godot"
---
# Regras para Godot (GDScript e cenas em texto)

- Versão fixada em `docs/decisoes/` (ex.: Godot 4.7.x); use só APIs dessa versão e consulte a
  documentação da versão, não a mais recente. 4.6→4.7 teve mais de 1.200 mudanças.
- GDScript tipado (`var x: int`, `-> void`); C# é experimental no iOS e "text-only" no Godot AI.
- Cenas e recursos em texto (`.tscn`/`.tres`) e pequenos: o agente precisa ler diffs legíveis.
- Sem `print` de depuração permanente: use um `DebugLog` que escreve estado em
  `user://debug.log` para o canal de depuração do agente.
- Mobile: renderer Mobile ou Compatibility (simulador iOS só Compatibility); texturas em atlas,
  compressão ASTC no export iOS; `Input` por toque com áreas ≥ 44 px lógicos.
- Testes com GUT ou gdUnit4 rodando em `godot --headless`; `scripts/verify.sh` deve rodar o
  jogo, capturar screenshot (Godot AI `editor_screenshot` ou `--write-movie`) e ler o log.
- Não contribua código gerado por IA ao repositório do engine (regra da Godot Foundation, 30/06/2026).
