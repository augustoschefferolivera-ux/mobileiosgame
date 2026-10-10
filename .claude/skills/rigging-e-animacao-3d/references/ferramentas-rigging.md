# Ferramentas de rigging e animação — detalhes e árvore de decisão (10/10/2026)

Fonte: nota `ativos_3d_rigging_mundos.md` (KQ2). Sites de fornecedores (deepmotion.com,
cascadeur.com, rokoko.com parcialmente) não puderam ser lidos; preços são [secundário].

## Árvore de decisão

```
Personagem precisa deformar?
├─ não (prop articulado: porta, baú) → sem rig; anime transform no engine ou PartCrafter + ossos manuais no Blender
└─ sim
   ├─ humanoide bípede
   │   ├─ já paga Tripo/Meshy → auto-rig do gerador (+ clipes prontos) → validar no Blender
   │   ├─ sem SaaS, tem GPU ≥14 GB → UniRig → SkinTokens (MIT)
   │   ├─ sem GPU → Mixamo (frágil; arquivar FBX) ou AccuRIG 2.0 (Windows, conta ActorCore) [fornecedor]
   │   └─ precisa de muitos NPCs → um esqueleto padrão para todos + retarget no Blender
   └─ criatura / quadrúpede / multi-pernas
       ├─ Tripo Studio (fornecedor afirma multi-pernas)
       ├─ Puppeteer (Apache-2.0; FBX; animação guiada por vídeo)
       └─ UniRig (criaturas; cuidado com cauda/asas)
Precisa de fala?
└─ Audio2Face-3D offline → bake de blendshapes (sem Unity/Metal em runtime)
```

## Auto-rigging aberto

### UniRig (SIGGRAPH 2025; Tsinghua + Tripo/VAST) — MIT
- Predição autoregressiva de esqueleto (Skeleton Tree Tokenization) + skinning por atenção
  osso-ponto. Checkpoint publicado: esqueleto+skinning treinado em Articulation-XL2.0;
  Rig-XL/VRoid "planned"; atributos de osso (rigidez) "coming soon".
- Entrada `.obj/.fbx/.glb/.vrm`; saída **FBX** (esqueleto, skin) + script de merge para GLB;
  `.vrm` via VRM-Addon-for-Blender modificado. ≥8 GB VRAM. Último push abr/2026. Nó ComfyUI
  existe (RunComfy). 14º "paper mais influente" SIGGRAPH 2025 (Paper Digest).
- Limitação declarada: skinning degrada se o esqueleto previsto omitir ossos de cauda/asa.

### SkinTokens / TokenRig (arXiv 2602.04805, 2026) — MIT
- Sucessor do UniRig: hierarquia **e** pesos por vértice numa só sequência autoregressiva;
  +98–133 % de acurácia de skinning e +17–22 % em ossos vs baselines (números dos autores).
- ≥14 GB VRAM; GLB in/out; no Blender pode ser preciso remover um nó `glTF_not_exported`.

### Puppeteer (NeurIPS 2025 Spotlight; ByteDance Seed + NTU + A*STAR) — Apache-2.0
- Esqueleto + pesos + animação guiada por vídeo (otimização diferenciável). **FBX export desde
  10/09/2025 (requer `bpy==4.2.0`)**. Dataset Articulation-XL2.0 com 59,4 K amostras rigadas.

### MagicArticulate (CVPR 2025; Seed3D) — Apache-2.0
- Só esqueleto (sem modelo de skinning dedicado); dataset Articulation-XL2.0 (>48 K modelos);
  script Blender para ler rigs de GLB (jun/2025); pesos corrigidos ago/2025.

### Hunyuan3D-Omni — controle por esqueleto na geração
- Aceita esqueleto/pose como condição para gerar a malha já na pose. **Licença Tencent
  territorial** (UE/UK/Coreia) — fora para jogo global.

## Auto-rigging comercial
- **Tripo 3.0 / Studio** (20/08/2025): auto-rig de avatares e criaturas; página de comparação
  do fornecedor afirma bípedes **e** multi-pernas e diz que o Meshy só riga bípedes.
- **Meshy**: afirma auto-rig + animação integrados; uma review de 2026 diz que riga/anima
  automaticamente, outra que não tem auto-rig embutido — **contraditório**, teste antes.
- **Mixamo (Adobe)**: "maintenance mode" (guia atualizado jul/2026); site, auto-rigger e
  downloads funcionam com conta Adobe gratuita; **só bípedes**; termos/FAQ sem mudança há ~5
  anos; backend quebrou brevemente jun/2025; threads da comunidade Adobe de **mai/2026**
  relatam falhas de autenticação persistentes em upload/download/auto-rigger; sem anúncio de
  encerramento. [tudo via fornecedores terceiros]
- Alternativas citadas nos mesmos guias (fornecedor): Reallusion **AccuRIG 2.0** (Windows,
  grátis; FBX/USD com conta ActorCore), **Cinevva Auto Rigger** (navegador, bípedes +
  quadrúpedes, GLB/FBX/OBJ), **Sorceress 3D Studio** (navegador, humanoide), Blender
  **Rigify**.

## Movimento

### Vídeo→movimento
- **Rokoko Vision 3.0** (jul/2026): solver monocular reconstruído; Video-to-Motion migrou para
  o **Rokoko Create** (web) junto com Text-to-Motion; desde **16/07/2026 Vision faz parte do
  Create** (assinaturas migram); dual-cam e webcam aposentados em **16/08/2026**; Rokoko
  Studio 2.6.2 suporta Vision 3.0. Preços/créditos/formatos de export não lidos.
- **DeepMotion**: preços inconsistentes ("Free a US$ 83/mês"; grátis 60 s/mês não comercial e
  depois US$ 15; "a partir de US$ 9") [secundário]; **SayMotion** (texto→movimento) à parte.
- **Move.ai** (Move Pro, multi-câmera sem marcadores), **Plask** (navegador, "value pick"):
  aparecem em roundups de 2026 sem novidades verificáveis.
- **Cinevva Prompt Animations**: texto→movimento 1–10 s, retarget para GLB humanoide, exporta
  **BVH ou GLB** (fornecedor).

### Keyframe assistido
- **Cascadeur**: física assistida, não texto→movimento; Indie ≈ €12/mês ou "Free a US$ 49/mês"
  [secundário, conflitante].

### Texto→movimento aberto
- (background) **MotionGPT** (NeurIPS 2023, MIT): HumanML3D/KIT-ML; saída `.npy` com 22 juntas
  ou SMPL `.ply`; **sem BVH**.
- **MotionGPT3** (arXiv 2506.24086; pesos HF 17/10/2025; MIT): bimodal (MoT); mesmos formatos;
  scripts de render no Blender. Para usar em jogo: converter juntas SMPL para o seu rig no
  Blender à mão — **nenhuma ferramenta pronta verificada**.

### Bibliotecas
- Quaternius Universal Animation Library (**CC0**); CMU mocap (>2.500 clipes, precisa
  limpeza) — ambos citados por guia de fornecedor; confirme no site de origem.

## Facial — Audio2Face-3D (NVIDIA, aberto em ~24–26/09/2025)
- Repositório: SDK, plug-in **Maya ACE v2.0**, plug-in **UE5 v2.5 (5.5/5.6) e v2.4 (5.4)** sob
  **MIT**; Training Framework **Apache**; modelos pré-treinados sob **"NVIDIA Open Model"**;
  Audio2Emotion "allowed with Audio2Face only"; container NIM sob termos NVIDIA AI Product.
- Modelos Audio2Face-3D v3.0 (difusão) e v2.3 (regressão); dirige **pesos de blendshape,
  deformações de malha e transforms de juntas**; GPU com fallback CPU; **nenhum plug-in
  Unity**; sem GitHub releases. Adotantes citados: Convai, Codemasters, GSC Game World,
  Inworld AI, NetEase, Reallusion, Perfect World, Streamlabs, UneeQ.
- Para iOS: inferir **offline** (desktop NVIDIA) e assar curvas de blendshape como animação de
  morph targets no GLB/USDZ. Compatibilidade ARKit-52: **não declarada**.

## Lacunas da pesquisa (não invente para preencher)
- Preços 2026 oficiais de DeepMotion, Kinetix, Cascadeur, Move.ai, Plask, Motorica (não
  encontrada), Anything World (site inacessível).
- Rokoko Create: preços, créditos, formatos de export.
- Benchmark independente de qualidade de rig entre ferramentas: inexistente.
- Alternativas ao Live Link Face para captura facial no iPhone: não pesquisadas.
