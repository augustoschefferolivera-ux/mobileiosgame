# 10 — Práticas de 3D para um jogo web (Phaser por pré-render; Three.js em tempo real)

Este capítulo responde a uma pergunta recorrente em projetos 2D feitos por agentes: **"vale usar
3D gerado por IA?"** A resposta curta: quase sempre vale como **fonte de sprites** (pré-render),
raramente vale como **3D em tempo real** no Safari do iPhone. Datas e versões conferidas em
10/10/2026; o que veio de snippet de busca está marcado [secundário].

## 1. Por que 3D num jogo 2D

Geradores de imagem não mantêm o mesmo personagem igual em 8 direções × 5 ações × 8 frames:
cada prompt reinterpreta proporções, paleta e luz (relatório, seção de arte 2D; a rota
sprite-sheet do ComfyUI exige "align all frames on the same baseline" e fatiamento verificado).
Um modelo 3D rigado resolve isso por construção: **consistência de ângulo, escala, ritmo e luz**
vem da câmera, não do prompt. É a técnica de Donkey Kong Country, Diablo II, Fallout e Age of
Empires II [background] e, em 2D moderno, de Dead Cells (3D → ferramenta própria de pixelização,
2018 [secundário]) e Factorio (Blender → render layers → sprites, FFF-146 [secundário]).

Sinais de que o 3D compensa (qualquer um basta):

| Sinal | Rota |
|---|---|
| Personagem em 4/8 direções, ou visto de vários ângulos (isométrico, top-down 3/4) | pré-render |
| Muitas ações do mesmo personagem (≥ 4) e vários personagens na mesma família | pré-render |
| Props/paredes isométricas com sombra e perspectiva coerentes | pré-render (`--acoes static`) |
| Já existe um modelo (CC0 ou gerado) e falta arte 2D | pré-render |
| Câmera livre, perspectiva real, física 3D, centenas de objetos dinâmicos | Three.js (ADR-0002) |
| Mundo gerado (Marble) como fundo explorável | Three.js + Spark, com teste de memória |

Sinais de que **não** compensa: sprite único sem direções; pixel art 16–32 px autoral; estilo
pintado à mão como pilar; equipe sem Blender/GPU e sem orçamento de gerador.

## 2. Árvore de decisão (ADR-0001 é Phaser 2D)

1. Brief é 2D? → **Phaser**. 3D entra só como fonte de sprites (seção 3). Fim.
2. Brief exige 3D real (câmera livre/perspectiva/física)? → `/escolher-engine-e-alvo` escreve
   **ADR-0002: Three.js + TypeScript + Vite** (mesma verificação Playwright). Seção 4.
3. 3D "pesado" (mundo aberto, muitos NPCs animados, física complexa)? → `/escopo-e-anti-padroes`:
   é o caso em que agentes mais falham (relatório); corte ou pré-renderize.

## 3. Pipeline A — pré-render de ponta a ponta (Phaser)

| Etapa | Skill / ferramenta | Saída | Orçamento / custo (inferência salvo indicação) |
|---|---|---|---|
| 1. Spec do sprite | `/sprites-pre-renderizados-de-3d` (entrada 1) | `design/assets/specs/<nome>-sprites.md` | direções, ações×frames, tamanho, `ppm`, páginas 2048² |
| 2. Modelo | `/gerar-ativos-3d`: Tripo 3.0 / Meshy 7 (pago ≈ US$ 20/mês [secundário]) ou TRELLIS.2/TripoSG (MIT, GPU) ou CC0 (Kenney/Quaternius [secundário]) | GLB bruto | 3–5 candidatos por asset; topologia importa pouco, silhueta/textura importam |
| 3. Rig + clipes | `/rigging-e-animacao-3d`: auto-rig Tripo/Meshy, UniRig (MIT), Mixamo (royalty-free [secundário]), Quaternius CC0 | GLB com clipes nomeados | clipes ≤ 2 s em loop; mesmo esqueleto por família |
| 4. Preparo | `/blender-automatizado` | origem nos pés, frente -Y, luzes removidas, `.blend` | decimar a ~50–100 K tris só por velocidade |
| 5. Render | `render_sprites.py` (Blender headless, Arch ou estação GPU) | PNGs + `manifest.json` | herói 192–256 px, inimigo 128 px, 8 dir × 6–8 fr; EEVEE/Workbench; toon opcional |
| 6. Atlas | `montar_atlas_phaser.py` (Pillow) | `.png` ≤ 2048², `.json` hash, `.anims.json`, preview | ≤ 4 páginas (64 MB GPU) por cena |
| 7. Jogo | `engine-web-phaser` + `verify.sh` | screenshot/`state.json` com a anim tocando | `play(\`walk-d${dir}\`)`, `setDepth(y)` |
| 8. Registro | `PROVENANCE.md`, `/critico-independente` | linha por modelo/clipe; nota do crítico | humano escolhe ângulo, luz, frames: é a intervenção que gera direito autoral |

Orçamentos numéricos (contas em `references/direcoes-e-camera.md` da skill):

- **Frames**: herói 8 dir × (idle 6 + walk 8 + attack 8 + hit 4 + death 8) = 272; inimigo 8 × 22
  = 176; prop 1–4. Veículo: 16 direções × 1–2 frames.
- **Resolução**: lógica 390×844 @2x → herói ~200 px de altura na tela; renderize 192–256 px e
  deixe o trim reduzir o atlas. Pixel art: renderize 4× e reduza com NEAREST + paleta fixa.
- **Memória**: Phaser sobe RGBA8 (4 bytes/px): página 2048² = 16 MB (+33 % mipmaps). Um herói
  em 256 px com trim cabe em 2–4 páginas; inimigos em 128 px em 1. Teto sugerido por cena: 64 MB
  de atlases. ASTC via contêiner PVR/KTX (`this.load.texture`) reduz 4× [validar no Phaser 4.2].
- **Download**: PNG otimizado ≈ 0,5–2 MB por página; carregue por fase.
- **Tempo**: sem medição neste repositório; 200 frames em EEVEE com GPU = minutos (inferência);
  Workbench é bem mais rápido. Meça e anote.

Decisões que mais mudam o resultado: elevação (30° 2:1 iso, 35,26° iso, 45–60° top-down),
luz presa à câmera (sombreado igual em toda direção) vs ao mundo, toon (esconde malha e textura
de gerador) vs PBR, `--ppm` fixo para toda a família.

## 4. Pipeline B — Three.js em tempo real (ADR-0002)

| Etapa | Ferramenta | Orçamento |
|---|---|---|
| Engine | `three` **0.186.1** (r186, 24/09/2026, MIT) · `@babylonjs/core` **9.30.0** (Apache-2.0) · `@sparkjsdev/spark` 2.3.1 (MIT) | versões fixadas no `package.json` |
| Renderer | `WebGLRenderer` (WebGL2 em todo iOS ≥ 15) ou `WebGPURenderer` (`three/webgpu`) com fallback automático para WebGL2; WebGPU no iOS Safari **26.0+** (caniuse; 17.4–18.x só por flag) | DPR ≤ 2, `antialias: false` |
| Malha | `/otimizar-3d-para-mobile --target web`: `gltf-transform`/`gltfpack` → meshopt (`EXT_meshopt_compression`, decoder 29 KB) | ≤ 100 K tris por modelo (regra Apple reutilizada); < 500 K visíveis por cena |
| Texturas | KTX2 (`KHR_texture_basisu`): UASTC normais/hero, ETC1S albedo; `KTX2Loader.detectSupport` → ASTC/PVRTC/ETC2 no iPhone | ≤ 2048² por asset; < 256 MB descomprimidos por cena; transcoder 0,6 MB |
| LOD / instancing | `THREE.LOD.addLevel(mesh, dist, histerese)`; `InstancedMesh`, `BatchedMesh`, `EXT_mesh_gpu_instancing` (`gltfpack -mi`) | < 100 draw calls |
| Materiais | Lambert/Phong em props, Standard só em hero, `MeshToonMaterial` + contorno para esconder imperfeições de malha gerada | sem `MeshPhysicalMaterial`, sem pós multi-pass |
| Animação | `AnimationMixer`; retarget `SkeletonUtils.retargetClip` | clipes ≤ 10 s a 24–30 Hz |
| Splats | Spark `SplatMesh` (PLY/SPZ/SOG); Marble exporta SPZ | só com teste de memória no iPhone real |
| Download | < 10 MB antes do primeiro frame; `import()` por fase | `dispose()` ao sair da fase |
| Verificação | `verify.sh` (Playwright WebKit: canvas WebGL, `renderer.info`, screenshot) + iPhone real por milestone | tela preta com build verde = falha |

Quando o 3D em tempo real compensa num jogo mobile web: poucos objetos, câmera controlada,
estilo chapado (toon) que tolera malhas de gerador, e um ganho real de jogabilidade (parallax
verdadeiro, rotação livre, física). Caso contrário o custo (memória do Safari, térmica, bundle
dos decoders, WebGPU desigual) supera o ganho, e o pré-render entrega o mesmo visual.

## 5. Ferramentas e licenças (resumo)

| Ferramenta | Licença | Uso aqui | Atenção |
|---|---|---|---|
| Tripo 3.0 / Studio, Meshy 7/7.1 | comercial só em plano pago; Meshy grátis = CC BY 4.0 | modelo + auto-rig + animação | preços de agregadores [secundário]; reajustes da Tripo em 2026 |
| TRELLIS.2-4B, TripoSG, PartCrafter | MIT | modelo (GPU ≥ 24 / ≥ 8 GB) | TRELLIS.2 exporta 1 M faces, GLB opaco |
| UniRig / SkinTokens, Puppeteer | MIT / Apache-2.0 | rig aberto | SkinTokens ≥ 14 GB VRAM |
| Mixamo | grátis com Adobe ID; royalty-free em jogos [secundário] | rig + clipes humanoides | "maintenance mode", falhas de login 2026 [secundário]; arquive FBX |
| Kenney, Quaternius, Poly Haven | CC0 ([secundário] para os dois primeiros; ToS da API da Poly Haven lido) | bases, props, HDRI | confira a página de cada pack |
| Blender 4.2/4.5 LTS, 5.0 | GPL (não alcança renders) | render headless, limpeza | IDs do EEVEE mudam no 5.0 |
| three.js, meshoptimizer, glTF-Transform, Spark | MIT | runtime e pipeline web | — |
| Babylon.js | Apache-2.0 | runtime alternativo | bundle maior |
| KTX-Software (`toktx`) | Apache-2.0 | KTX2 via glTF-Transform | gltfpack do npm não tem BasisU |
| Phaser 4.2.1 | MIT | jogo 2D | lê atlas JSON hash/array, PVR/KTX com ASTC |
| **Lista vermelha** | Hunyuan3D / HY-World (saída proibida fora do Território: UE/UK/Coreia), Roblox Cube (research-only) | — | vale também para sprites renderizados a partir deles |

## 6. Casos reais e o que ensinam

- **fly.pieter.com** (Three.js/WebGL2, fev/2025): o único jogo "vibe-coded" com receita
  documentada (de US$ 1 M ARR declarado a US$ 144 K ARR no Indie Hackers) — 3D leve,
  multiplayer simples, iteração pública. Lição: 3D web funciona quando a cena é pequena e o
  loop é viciante, não quando é bonita.
- **FPS de Shumer** (Claude Opus 5, jul/2026, ~55 mil linhas): crítico automatizado subiu de
  3,59 para ~5/10 e parou — 3D "nível Call of Duty" é o escopo errado para agente, mesmo com
  Gauntlet Loop. Lição: o teto de qualidade em 3D realista por agente é visível; estilize.
- **Vibe Jam 2025** (Pieter Levels; 1.170 inscritos; ≥ 80 % de código por IA; web, sem login,
  gratuito; vencedores The Great Taxi Assignment, Vibeware, Vector Tango) [secundário]: os
  jogos que se destacaram eram pequenos, jogáveis em segundos e com uma ideia clara.
- **Dead Cells** (Motion Twin, 2018 [secundário]): 3DS Max → animação → ferramenta própria que
  renderiza em pixel art; um artista só no primeiro ano. Lição: 3D é o atalho para animar muito
  com pouca gente — exatamente a situação de um agente.
- **Factorio** (FFF-146 [secundário]): Blender com cenas MODEL/RENDER, render layers via
  compositor, retoque em Photoshop. Lição: separe fonte (`.blend`) de saída (sprites), e espere
  uma passada humana de retoque nos sprites de destaque.
- **Relato Tripo → Mixamo → Blender sprite sheet** (r/aigamedev, set/2026 [secundário]): a
  cadeia desta skill já é usada por indies; o gargalo relatado é o passo de rig/animação, não o
  render.

## 7. Erros comuns

1. Renderizar com AgX/Filmic e estranhar a paleta → `view_transform = Standard` (o script força).
2. Textura com sombra assada que não gira → toon/flat ou retexturizar; pedir ao gerador "flat, even lighting".
3. Espelhar direções com luz lateral → sombreado invertido; só espelhe com luz frontal/zenital.
4. Pivot no centro da caixa → sprite "flutua" ao trocar de ação; use a origem nos pés e o eixo de rotação no pivot.
5. 256 px × 8 dir × 40 frames por personagem → 5 páginas 2048² por personagem; corte frames, não resolução.
6. `blender -b modelo.glb` sem importar → cena vazia; o script importa pelo argumento ou `--input`.
7. Reimportar no Blender um GLB já com KTX2 → sem textura; guarde o GLB com PNG como fonte.
8. Usar `WebGPURenderer` sem `await renderer.init()` nem fallback → tela preta em iOS < 26.
9. Draco e meshopt no mesmo arquivo, ou decoders fora de `public/` → erro de carregamento.
10. Malha de gerador em PBR realista no iPhone → "render de 2005" + fill-rate; use toon e luz única.
11. Confiar em benchmark de fornecedor (Meshy, Sloyd) para escolher gerador → gere 3–5 candidatos e julgue com o crítico.
12. Esquecer que a restrição territorial da Tencent vale para a **saída**, inclusive sprites.

## 8. Fontes

- Skills: `.claude/skills/sprites-pre-renderizados-de-3d/` (scripts e referências), `engine-web-threejs`, `otimizar-3d-para-mobile`, `gerar-ativos-3d`, `rigging-e-animacao-3d`, `blender-automatizado`, `materiais-e-texturas-pbr`, `ambientes-e-mundos-3d`.
- Relatório e notas: `reports/Criação de jogos totalmente por IA.md` (casos fly.pieter.com, Shumer; seção "Ativos 3D"); `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md`.
- Versões (npm, 10/10/2026): https://registry.npmjs.org/three/latest ; https://registry.npmjs.org/@babylonjs/core/latest ; https://registry.npmjs.org/@sparkjsdev/spark/latest ; https://registry.npmjs.org/phaser/latest
- Código lido: three.js r186 (`WebGPURenderer.js`, `KTX2Loader.js`, `GLTFLoader.js`, `LOD.js`, `SkeletonUtils.js`, `MeshToonMaterial.js`) https://github.com/mrdoob/three.js ; Phaser 4.2.1 (parsers de atlas, `CompressedTextureFile.js`, `AnimationManager.js`) https://github.com/phaserjs/phaser ; Blender (`rna_*.cc`, `DNA_scene_types.h`) https://github.com/blender/blender ; glTF-Blender-IO (`animation_utils.py`) https://github.com/KhronosGroup/glTF-Blender-IO
- Suporte WebGPU/WebGL2 por versão (caniuse, lido): https://github.com/Fyrd/caniuse/blob/main/features-json/webgpu.json ; https://github.com/Fyrd/caniuse/blob/main/features-json/webgl2.json ; WebKit "Safari 26 beta" [secundário]: https://webkit.org/blog/
- Casos [secundário]: Vibe Jam 2025 https://www.indiehackers.com/post/Uz0wHG4pI3KBOiFhP5YR , https://vibej.am/2026/press ; Dead Cells https://80.lv/articles/case-study-dead-cells-character-art-pipeline/ ; Factorio https://factorio.com/blog/post/fff-146 ; Tripo→Mixamo→Blender https://red.applefritter.com/r/aigamedev/s/ZjZbUwPkVL ; Shumer https://decrypt.co/374560/dumbest-ai-prompt-claude-beat-careful-game-design
- Licenças: Hunyuan3D https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE ; Poly Haven ToS https://github.com/Poly-Haven/Public-API/blob/master/ToS.md ; Mixamo FAQ [secundário] https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html ; Kenney/Quaternius CC0 [secundário] https://gamefromscratch.com/?p=27165
- Add-ons de sprite no Blender: https://github.com/Mattline1/SpriteAtlasAddon ; https://github.com/RubielGames/BlenderSpriteGenerator ; https://github.com/chronicleroflegends/DirectionalSpriteBatchRender
