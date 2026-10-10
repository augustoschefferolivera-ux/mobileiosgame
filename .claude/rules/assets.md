---
paths:
  - "assets/**"
  - "Assets/Art/**"
  - "Assets/Audio/**"
  - "PROVENANCE.md"
  - "LICENCAS.md"
---
# Regras para assets gerados

- Antes de gerar: ferramenta/modelo está na lista verde de `LICENCAS.md`? Se não, pare.
  Lista vermelha: Hunyuan3D/HunyuanWorld/HY-World (exclui UE/UK/Coreia), FLUX.1 [dev]
  servido comercialmente, Roblox Cube, MMAudio, ThinkSound, spine-animation-ai, LUFSNormalizer,
  YuE2 para empresas, AudioCraft, Suno/Udio em assets lançados, Eleven Music self-serve para games.
- Todo asset recebe linha em `PROVENANCE.md`: caminho, modelo e versão, seed, prompt, imagem de
  referência, ferramenta de pós (BiRefNet, gltfpack...), edição humana (o que foi mudado e por quem), data.
- Nomes previsíveis em kebab-case: `heroi-idle-01.png`, `ui-botao-primario-pressed.png`,
  `sfx-passo-grama-03.wav`, `prop-barril-lod1.glb`.
- 2D: PNG com alfa real (sem halo), múltiplos para @2x/@3x ou grade inteira em pixel art; atlas
  por compressão. 3D: GLB/USDZ otimizado (gltfpack/glTF-Transform), ≤ orçamento do brief, LODs.
  Áudio: WAV master arquivado fora do bundle; no bundle AAC (música) e CAF/Ogg (SFX) normalizados
  a −18 LUFS / −1 dBTP.
- Nenhum nome, logo, personagem ou música de terceiros, nem "no estilo de <artista vivo>".
- Masters e seeds são guardados: nunca dependa de regenerar para reconstruir o jogo.
