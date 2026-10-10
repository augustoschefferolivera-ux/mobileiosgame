# Avisos de terceiros — gerar-ativos-3d

Esta skill adapta estrutura e regras de três arquivos do template
**Donchitos/Claude-Code-Game-Studios** (licença MIT):

- `.claude/skills/asset-spec/SKILL.md` — fluxo "Identificar → Confirmar → Gerar → Revisar →
  Aprovar → Escrever", formato `ASSET-NNN`, IDs sequenciais no manifesto, protocolo de asset
  compartilhado.
- `.claude/skills/asset-audit/SKILL.md` — regra "se não puder medir, escreva `NOT ASSESSED`,
  nunca estime" (aqui: `NÃO AVALIADO`), aplicada ao checklist de avaliação e ao
  `inspecionar_glb.py`.
- `.claude/agents/technical-artist.md` — orçamentos por categoria e a regra de nunca
  substituir os números do projeto por números próprios.

Texto reescrito em português e adaptado para mobile/iOS; nenhum trecho foi copiado
literalmente. O arquivo `THIRD_PARTY_NOTICES.md` na raiz do repositório deve listar esta
adaptação (manutenção do coordenador do banco de skills).

A skill `asset-transformer-toolkit` do **Unity-Technologies/unity-agent-plugin** (Unity
Companion License) é apenas citada pelo nome em `/otimizar-3d-para-mobile`; nenhum conteúdo
dela foi copiado.
