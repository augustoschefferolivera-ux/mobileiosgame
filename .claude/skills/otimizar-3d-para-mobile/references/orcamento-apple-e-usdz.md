# Orçamento da Apple, USDZ/RealityKit e exportação por engine

## O que a Apple disse (e o que não disse)

| Data | Fonte | Afirmação |
|---|---|---|
| WWDC 2018 (sessão 603), reafirmado nov/2021 por engenheiro da Apple | Forum 693867 | Para **AR Quick Look**: até **100 mil polígonos**, **um conjunto de texturas 2048×2048**, até **10 s de animação**, para funcionar bem até o **iPhone 7**. "Still what we recommend." |
| nov/2021 | Forum 693867 | Apps **RealityKit** têm "a bit more wiggle room"; gere **várias versões do modelo** e escolha pela potência do dispositivo. Não disse se 100K é por modelo ou por cena, nem limite de arquivo. |
| mai/2024 (DTS, visionOS/RealityKit) | Forum 751764 | Recusou números; recomenda ciclo iterativo: comece low-poly/texturas baixas → verifique → adicione detalhe só com folga. Aponta WWDC24 "Optimize your 3D assets for spatial computing" (10186), cujos números estão numa imagem não lida. |
| jun/2024 | Forum 757297 | Pergunta sobre **LOD em Reality Composer Pro/USDZ** (3 malhas por distância) **sem resposta**. Suporte nativo a LOD em USDZ: não confirmado. |

Divisão por asset (**inferência do relatório**, não número da Apple): herói 30–50K tris,
props 5–10K, frame ≤~100K no device mais antigo suportado, 1 atlas ≤2048² por asset, 2–3 LODs
a 0,5/0,25/0,1 — e **perfil no dispositivo** como a Apple insiste.

## USDZ e RealityKit

- Caminho: GLB otimizado (**sem KTX2**, PNG/JPEG) → **Reality Converter** (macOS; converte
  OBJ/FBX/glTF/USD → USDZ; `UsdPreviewSurface` como material base) ou `usdzconvert` das
  ferramentas USD Python da Apple [confirmar nome/versão em developer.apple.com].
- Compressão de textura (ASTC) acontece na importação pelo sistema, não no arquivo.
- Sem LOD nativo confirmado: implemente troca por distância em código ou versões por classe de
  dispositivo (recomendação da Apple de 2021).
- SceneKit foi **deprecado no Xcode 26** em todas as plataformas (relatório, seção de engines);
  projetos novos usam RealityKit.
- Animação: ≤10 s por clipe para AR Quick Look; esqueleto e blendshapes viajam dentro do USDZ.

## Unity (iOS)

- Importe GLB/FBX conforme o pipeline do projeto; monte `LOD Group` com LOD0/1/2(/3).
- Texturas: compressão iOS **ASTC** (regra `.claude/rules/unity-csharp.md`); mipmaps ligados;
  um Sprite/Texture atlas por configuração de compressão.
- Streaming: **Addressables** para carregar assets sob demanda e reduzir memória residente.
- **Asset Transformer Toolkit** (ex-Pixyz; pacote `com.unity.industry.toolkit` ≥4.0, com
  direito de uso pelo plano Unity): use a skill oficial `asset-transformer-toolkit` do
  `unity-agent-plugin` para importar CAD/nuvens de pontos e gerar LODs por regra
  (`LODGeneratorComponent`). Quando usar: malhas industriais/CAD ou lotes grandes com RuleSets.
  Quando não usar: assets de jogo comuns — o GLB já otimizado por gltfpack/glTF-Transform entra
  direto. **Não instale o pacote por conta própria**; a skill oficial para se ele faltar.
- Mesh LOD automático do Unity 6.x: não verificado; não dependa dele.

## Godot 4.x

- Importador GLB nativo; LODs: o importador gera LODs automáticos para malhas importadas
  [confirmar opções exatas da versão fixada]. Texturas: escolha compressão para mobile no import.
- Renderer: fixe **Mobile** (Forward Mobile) no device e **Compatibility** no simulador
  (relatório, seção de engines) e teste os materiais nos dois.

## Web mobile (three.js/Babylon)

- GLB com KTX2 (`KHR_texture_basisu`) + `EXT_meshopt_compression`; loaders: three.js r122+,
  Babylon 5.0+. Spark (World Labs, MIT) se misturar splats e malhas.

## Medição no dispositivo (evidência mínima)

1. Build e execução da cena com o asset (simulador aceito para screenshot; **frame time só
   vale no dispositivo**).
2. Screenshot de cada LOD à distância de uso.
3. Frame time/FPS: Xcode Instruments (Metal System Trace) ou MetricKit (relatório cita frame
   rate Metal no iOS 27), Unity Profiler conectado ao device, monitor de performance do Godot.
4. Memória de texturas: some os KB dos KTX2/ASTC carregados; compare com o teto do brief.
5. Grave tudo em `production/evidencias/<data>-<asset>-otimizacao/` com o relatório do script.
