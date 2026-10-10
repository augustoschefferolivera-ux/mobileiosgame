# Mundos gerados, splats e PCG — detalhes (estado em 10/10/2026)

Fonte: nota `ativos_3d_rigging_mundos.md` (KQ4) e `ia_em_runtime_e_world_models.md` (KQ4).
worldlabs.ai e páginas secundárias de preço não puderam ser lidas na pesquisa.

## Mundos exportáveis

### World Labs Marble
- GA em **12/11/2025** (beta limitada set/2025). Cria mundos a partir de **texto, imagens,
  vídeo ou layouts 3D grosseiros**; exporta **Gaussian splats, malhas ou vídeo**. Freemium com
  **quatro tiers do grátis a US$ 95/mês ("Max")** [secundário].
- **World API** (23/01/2026): "programmable 3D worlds". **Marble 1.1 / 1.1 Plus** (início de
  abr/2026; 2 ou 8/04 conforme a fonte): 1.1 Plus detecta quando a cena precisa de mais espaço
  e adiciona **até cinco unidades espaciais extras** por geração. **Spark 2.0** (16/04/2026):
  engine de streaming para mundos 3DGS enormes.
- **Spark** (renderer three.js, **MIT**): PLY (inclusive comprimido), SPZ, SPLAT, KSPLAT, SOG;
  mira 98 %+ dos dispositivos WebGL2 e "renders fast on low-powered mobile devices"; mistura
  splats com malhas; v2.3.1 nas docs.
- **Lacunas**: colisores, qualidade/polycount da malha exportada, **licença dos mundos
  gerados**, preços dos tiers intermediários — confirme em worldlabs.ai antes de produzir.

### Tencent HunyuanWorld / HY-World — **licença territorial, evitar**
- HunyuanWorld-1.0 (26–27/07/2025): texto/imagem → panorama 360° → mundo 3D em camadas com
  objetos de primeiro plano separáveis; export de malha; **Draco**; versão Lite roda em 4090.
- HunyuanWorld-Voyager (02/09/2025): RGB-D vídeo → nuvens de pontos `.ply`; 60–80 GB VRAM.
- HunyuanWorld-Mirror/1.1 (22/10/2025, ICML 2026): vídeo/multi-view → pontos, profundidade,
  normais, câmeras, 3D Gaussians.
- **HY-World 2.0** (16/04/2026; código de inferência 18/05/2026; 2.1 anunciado jul/2026):
  mundos editáveis de texto/imagem/multi-view/vídeo; saídas **malha e 3DGS**; "importable into
  Blender/Unity/Unreal Engine/Isaac Sim".
- LICENSE de todos (lidas): **não se aplica na UE, Reino Unido e Coreia do Sul**; **saídas não
  podem ser usadas fora do Território**; >1 M MAU exige licença. Para jogo global: não usar.

### FlashWorld (ICLR 2026 oral) — Apache-2.0
- Imagem/texto → cena 3DGS em **~7 s (A100) / ~4 s (H100)**; exporta **PLY e SPZ**; VRAM
  51 GB por padrão, até 9 GB com offloading (10 min). Treino aberto (29/01/2026).

## World models interativos (sem export — só previs)
- **Genie 3 / Project Genie** (Google): até 720p/24 fps; desde ~30/01/2026 para assinantes
  **AI Ultra nos EUA, 18+**; sessões de **60 s**; "early research prototype".
- **HY-World 1.5 / WorldPlay** (17/12/2025): difusão de vídeo em streaming, teclado/mouse,
  24 fps, 480p, **28–72 GB VRAM**; WorldPlay-5B (06/01/2026). Mesma licença Tencent.

## Gaussian splats → iPhone

| Peça | Licença | O que faz | Limites |
|---|---|---|---|
| UnityGaussianSplatting (aras-p) | MIT (código) | Unity 2022.3; Windows D3D12/Vulkan, Mac Metal, Linux Vulkan | **DX11/OpenGL ES não**; mobile "may or may not work", alguns iOS (#72) e Android (#112) não; ~48 bytes de GPU por splat; autor sem planos de evolução (dez/2023); avisa que o código de treino INRIA é não comercial |
| MetalSplatter (scier) | MIT | Swift/Metal para iOS/iPadOS/macOS/visionOS; lê PLY, SPZ, .splat | docs escassas; compile Release |
| SPZ (Niantic) | MIT | formato ~10× menor que PLY; libs C++/TypeScript(WASM)/Python; usado pelo Scaniverse | — |
| Spark (World Labs) | MIT | three.js, mobile web | web apenas |
| SplatBridge / ArcGIS Maps SDK for Unity 2.4.0 | — | splats streamados + colisores em Unity 6; camadas de splat no Esri | não verificados em iOS |
| XV3DGS-UEPlugin | Apache-2.0 | UE 5.0+ (Niagara), PLY, LOD >200k pontos | sem física; mobile não mencionado |

Diagnóstico de pesquisa: Mobile-GS (ICLR 2026) aponta alpha blending/ordenação por
profundidade como o gargalo on-device. Conclusão da nota: para RealityKit/Unity em iOS a
rota mais segura é **exportar malha e assar**.

## Montagem de cena com Blender MCP
- Faz: adicionar objetos, materiais, modificadores, rearranjar, luz; "excellent for scene
  assembly, materials, lighting and repetitive work" (guia ago/2026); resultado típico:
  "geometrically correct primitive composition with properly named objects, appropriate
  materials, and correct scale relationships, ready for you to refine" (abr/2026).
- Não faz: gerar malha sozinho (chama Tripo/Rodin/Hunyuan3D).
- Fontes de assets: Poly Haven (CC0; HDRIs, texturas, modelos; sem chave), Sketchfab (chave),
  Poly Pizza (chave grátis; ~10.600 modelos low-poly; ~69 % CC-BY — crédito gravado em
  `polypizza_attribution`).

## Skybox / HDRI
- Preferência: HDRI CC0 do Poly Haven (1k–2k para mobile), importado pelo MCP; arquivo
  pequeno e iluminação coerente.
- Panorama por IA: peça "equirectangular 360 panorama, 2:1, seamless horizontally, no text";
  verifique a costura horizontal (`verificar_tiling.py --eixo horizontal`) e os polos; converta
  em cubemap no engine (Unity: Texture Shape Cube; Godot: PanoramaSkyMaterial; RealityKit:
  `EnvironmentResource`/skybox [confirmar API]). Unity AI gera cubemaps no editor consumindo
  créditos (nota de IA em runtime) — registre no `PROVENANCE.md`.
- Panorama do HunyuanWorld: mesma licença territorial — não usar.

## PCG com LLM — ponte para `geracao-procedural-com-llm`
- Convergência dos papers de 2025–26: o LLM produz **parâmetros estruturados** (grafo de
  salas, densidades, seeds) validados por geradores determinísticos; pipelines em estágios
  (mundo → NPCs → campanha → quests, arXiv 2604.25482); bancos de componentes arquitetônicos
  construídos offline (arXiv 2508.18533); benchmark PCG (arXiv 2503.21474).
- Papel desta skill: entregar o **kit modular**, o **JSON Schema** dos parâmetros e um
  **validador offline** (conectividade, alcance do spawn, orçamento de tris/frame por sala).
- Em runtime no iPhone: Apple Foundation Models `@Generable` → parâmetros → gerador local
  (detalhes na skill de IA em runtime). Nenhum exemplo mobile publicado usa saída livre do
  LLM direto no gameplay.
- Roblox Cube/4D: só dentro do Roblox; pesos research-only.
