# PROVENANCE — [Nome do jogo]

Registro de proveniência por asset. É a prova de intervenção humana (US Copyright Office, Parte 2, 29/01/2025: "assistive uses of AI... do not affect the availability of copyright protection"; Brasil, Lei 9.610/98 art. 11, doutrina: "intervenção criativa humana mínima") e a base da divulgação de IA nas lojas. Validado por `python3 .claude/skills/licencas-e-proveniencia/scripts/check_provenance.py`.

## Convenções

- Uma seção `### <caminho/relativo/do/asset>` por arquivo que entra no build (sprites, atlas, modelos, áudio, fontes, texto gerado, shaders). Código gerado por IA é registrado por módulo (ex.: `### Sources/Game/Inventory.swift`).
- Campos obrigatórios: `tipo`, `ferramenta`, `versao`, `edicao_humana`, `master`, `data`, `licenca`. Opcionais: `seed`, `prompt`, `referencia`, `c2pa`, `selecao`, `observacoes`.
- `licenca` aponta para o `id` da tabela em `LICENCAS.md` (`LICENCAS.md#<id>`).
- `edicao_humana` descreve o que uma pessoa fez, quando e quem. "nenhuma" é permitido, mas o script avisa: um asset sem intervenção tende a não ter proteção autoral.
- `master` é o arquivo editável sem perda em `masters/` (PSD, Aseprite, WAV, Blend, GLB fonte). Nunca dependa de regenerar.
- Prompts ficam em `prompts/<tipo>/<nome>.txt` (um arquivo por asset, com parâmetros).
- Níveis para a divulgação (`/divulgacao-de-uso-de-ia`): `gerado` (saída usada como veio), `assistido` (gerado + edição humana substancial), `humano` (feito à mão; IA só como referência).

## Resumo por categoria (preencher antes de publicar)

| Categoria | gerado | assistido | humano | Observação |
|---|---|---|---|---|
| Gráficos (sprites, UI, ícone, loja) | 0 | 0 | 0 | |
| Modelos 3D / texturas | 0 | 0 | 0 | |
| Som (SFX, música, voz) | 0 | 0 | 0 | |
| Texto e diálogo | 0 | 0 | 0 | |
| Código | 0 | 0 | 0 | |
| IA em runtime (diálogo gerado ao vivo) | — | — | — | sim/não; provedor |

## Assets

### assets/sprites/heroi_idle.png
- tipo: sprite 2D (folha 8 quadros, 64×64 @3x)
- ferramenta: gpt-image-1.5 (API OpenAI)
- versao: gpt-image-1.5, chamada em 2026-10-03
- seed: n/a (API não expõe)
- prompt: prompts/sprites/heroi_idle.txt
- referencia: art/referencias/heroi_sheet.png (esboço à mão, 2026-09-28)
- selecao: 1 de 12 candidatos gerados
- edicao_humana: recorte e limpeza de alfa no Aseprite; paleta requantizada para 32 cores da art bible; contorno e mãos redesenhados; 3 quadros de antecipação pintados do zero (Augusto, 2026-10-03)
- master: masters/sprites/heroi_idle.aseprite
- data: 2026-10-03
- licenca: LICENCAS.md#gpt-image-1-5
- c2pa: nao
- nivel: assistido

### assets/audio/sfx/pulo.caf
- tipo: SFX one-shot, 48 kHz → CAF IMA4
- ferramenta: ElevenLabs Sound Effects v2 (API)
- versao: eleven_text_to_sound_v2, 2026-10-02
- seed: n/a
- prompt: prompts/audio/pulo.txt
- referencia: nenhuma
- selecao: 1 de 16 candidatos
- edicao_humana: trim, fade de 5 ms, normalização a −18 LUFS/−1 dBTP com pyloudnorm (Augusto, 2026-10-02)
- master: masters/audio/sfx/pulo.wav
- data: 2026-10-02
- licenca: LICENCAS.md#elevenlabs-sfx-v2
- c2pa: nao
- nivel: assistido

### Sources/Game/Inventory.swift
- tipo: código (módulo de inventário)
- ferramenta: Claude Code (Opus 5.5)
- versao: sessão 2026-10-01, transcrição em production/sessoes/2026-10-01-inventario.md
- edicao_humana: revisão de diff, renomeação de tipos, testes adicionais escritos à mão (Augusto, 2026-10-01)
- master: n/a (código versionado em Git)
- data: 2026-10-01
- licenca: LICENCAS.md#claude-api
- nivel: assistido
