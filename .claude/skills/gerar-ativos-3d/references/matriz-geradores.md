# Matriz detalhada de geradores 3D (estado em 10/10/2026)

Fonte primária: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md`
(KQ1, KQ5, KQ7). Sites de fornecedores (meshy.ai, tripo3d.ai, hyper3d.ai) **não puderam ser
abertos** na pesquisa; preços e features vêm de snippets/agregadores e levam
"[secundário, confirmar]". Toda licença de repositório GitHub citada foi lida na íntegra.

## Comerciais (SaaS)

### Tripo 3.0 / Tripo Studio (VAST) — lançado 20/08/2025
- Modo **Standard** (superfícies limpas, "ideal for gaming") e **Ultra** (fidelidade máxima).
- Tripo Studio: **auto-rigging** de avatares e criaturas; **"smart low-poly"** para XR/jogos;
  edição de textura ("magic brush"). Exporta **USD, FBX, OBJ, STL**.
- Preço [secundário, confirmar]: Free; Pro US$ 19,90/mês; Max US$ 89,90; Team US$ 109,90 por
  assento. **Uso comercial e modelos privados só em plano pago.** Free tier reportado como
  200 ou 300 créditos/mês (fontes conflitam). Agregador registra aumentos: topo
  US$ 83,94 → 109,90 (mai/2026) → **US$ 329,70 (24/08/2026)**, não confirmado na página oficial.
- Fornecedor afirma rig bípede **e multi-pernas** (e que o Meshy só riga bípedes).
- Base aberta da mesma empresa: TripoSG (abaixo). MCP oficial: `tripo-mcp` (alpha, MIT) — ver
  `/blender-automatizado`.
- Quando usar: personagens/criaturas que precisarão de rig; geometria limpa; equipe sem GPU.

### Meshy 7 (12/08/2026) / Meshy 7.1 (10/09/2026)
- Meshy 7: modelo **imagem-para-3D** focado em alinhamento imagem–3D; benchmark próprio
  (81,0 % proporção geral vs quatro concorrentes não nomeados — dado do fornecedor).
  Multiview (1–4 imagens), texturas **"8K"** [fornecedor], saída PBR (docs ComfyUI).
- Changelog oficial (snippet): **3D Agent (Beta)** jun/2026; **"Smart Topology"** (jul/2026)
  gera low-poly. 7.1: modo **"Ultra 4K"** (2048³ → 4096³, pago) [secundário].
- Licença (docs oficiais via snippet): **todos os planos pagos incluem uso comercial**;
  **saídas do plano gratuito são CC BY 4.0** com atribuição a Meshy; **créditos não acumulam**.
  Text-to-3D custa 20 créditos (Meshy 6) / 10 (Meshy 5) [secundário].
- Preço do Pro conflita (US$ 20/mês vs ~US$ 16 anual vs US$ 10 anual); ~1.000 créditos/mês.
- Quando usar: props e cenário texturizados; plug-ins de engine; iteração rápida.

### Hyper3D Rodin Gen-2
- Integrado ao Blender MCP (`generate_3d`). API ~US$ 0,80/requisição; planos Free /
  Education US$ 12 / Creator US$ 24 / Business US$ 120 [secundário, confiança média].
  **Termos de licença não lidos** — confirme antes de usar em produto.

### Hitem3D (Math Magic) — produto comercial do Sparc3D
- FAQ: roda Sparc3D + "Ultra3D"; pipeline com **PBR e retopologia automática**; "generated
  results still need manual inspection and post-processing". Entrada JPG/PNG/WebP ≤20 MB;
  exporta GLB, OBJ, STL. Sparc3D (repo) **sem arquivo LICENSE** e pesos não confirmados.

### Hunyuan3D 3.0 (Tencent, fechado) e Hunyuan 3D Engine (lançamento global 25/11/2025)
- Até 1536³; via plataforma/API e ComfyUI Partner Nodes. Termos de API não lidos; a família
  aberta tem a cláusula territorial abaixo — presuma o mesmo risco até ler o contrato.

## Pesos abertos

### TRELLIS.2-4B (Microsoft) — 18/12/2025 — **MIT**
- Imagem→3D, 4B parâmetros, "field-free" O-Voxel; resoluções 512³/1024³/1536³ (H100: ~3 s /
  ~17 s / ~60 s). PBR: **base color, roughness, metallic, opacity**; lida com superfícies
  abertas, não-manifold e cavidades.
- **≥24 GB VRAM, Linux**. Export GLB: `decimation_target=1.000.000` faces, textura 4096,
  remeshing ligado; **GLB exporta OPACO por padrão** (alpha precisa ser reconectado).
- Dependências nvdiffrast/nvdiffrec têm licenças próprias — leia antes de distribuir pipeline.
- Quando usar: hero assets com PBR sem assinatura; GPU em nuvem por hora.

### TripoSG (VAST) — mar/2025 — **MIT**
- 1,5B rectified-flow; **≥8 GB VRAM**; saída **.glb sem textura**; opção **`--faces`** para
  limitar faces. Quando usar: geometria base barata para texturizar depois
  (`/materiais-e-texturas-pbr`).

### PartCrafter — NeurIPS 2025, código 13/07/2025 — **MIT**
- Gera **várias peças/objetos** de uma imagem RGB (`--num_parts` manual ou sugerido por VLM);
  **≥8 GB VRAM**; treinado em renders do Objaverse (fotos reais podem exigir estilização).
- Quando usar: props desmontáveis (porta + dobradiça), kits modulares, peças a animar separadas.

### SPAR3D (Stability AI) — jan/2025 — Stability AI Community License
- Baseado no Stable Fast 3D; nuvem de pontos editável; GLB; **remesh none/triangle/quad**;
  opção de resolução de textura; ~10,5 GB VRAM (low-VRAM ~7 GB; README inconsistente).
- Licença (lida): pesquisa, não comercial e comercial grátis; **uso comercial exige registro**;
  **organizações > US$ 1 milhão/ano precisam de licença Enterprise**.

### Família Hunyuan3D (Tencent) — **licença territorial**
- 2.0 (21/01/2025), 2.1 (13/06/2025, PBR "production-ready", pesos + código de treino;
  10/21/29 GB VRAM), Omni (26/09/2025, controle por nuvem de pontos/voxel/esqueleto/bbox),
  Part (23/09/2025, P3-SAM segmentação + X-Part).
- LICENSE (lida na íntegra, idêntica em 2.0/2.1/Omni/Part): "DOES NOT APPLY IN THE EUROPEAN
  UNION, UNITED KINGDOM AND SOUTH KOREA"; **"You must not use ... Output or results ...
  outside the Territory"**; >1 M MAU exige licença separada.
- Consequência: Brasil está no Território, mas **vender o jogo a jogadores da UE/UK/Coreia
  com esses assets viola o contrato**. Para App Store global: não usar.
- (background) Hunyuan3D 1.0 era NÃO COMERCIAL e dependia de DUSt3R (CC BY-NC-SA).

### Roblox Cube 3D / CubePart — **RESEARCH-ONLY RAIL-MS**
- Licença só para "academic or research purposes", sem uso comercial, restrições obrigatórias
  repassadas. 24 GB VRAM recomendados. **Não entra em jogo comercial.**

### Outros citados sem dados suficientes
- Luma Genie (dobrado na plataforma Luma; preço/export desconhecidos), Kaedim, CSM, Sloyd
  (arena própria), Anything World (site inacessível). Confirme antes de depender.

## Checklist de avaliação de candidato (preencha por candidato)

| Critério | Como medir | Resultado |
|---|---|---|
| Triângulos LOD0 vs orçamento | `inspecionar_glb.py --max-tris N` | nº / OK / ESTOURA |
| Nº de malhas e materiais (draw calls) | `inspecionar_glb.py` | nº |
| Texturas: quantas, dimensões, formato | `inspecionar_glb.py --max-texture 2048` | lista |
| Mapas PBR presentes (baseColor, metallicRoughness, normal, occlusion, emissive) | idem | lista |
| `alphaMode` correto (OPAQUE/MASK/BLEND) | idem; TRELLIS.2 vem OPAQUE | OK / corrigir |
| UVs presentes e dentro de 0–1 | idem (`TEXCOORD_0`) | OK / NÃO AVALIADO |
| Cascas flutuantes, buracos, faces internas | Blender MCP `look` em `xray`/`wireframe` ou `get_scene_info` topology | descrição |
| Simetria e proporções vs referência | `look` em `angles` + comparação lado a lado | descrição |
| Iluminação/sombra assada no albedo | ver base color isolado (Blender: só textura, sem luz) | sim/não |
| Costuras e esticamento de textura | `look` em `material` em 4 ângulos | descrição |
| Escala real (metros) e origem no pé/centro | `get_scene_info` placement | valores |
| Licença da saída registrada | PROVENANCE.md | OK |

Regra herdada do `asset-audit` (Game Studios, MIT): o que não puder ser medido recebe
**`NÃO AVALIADO`**, nunca uma estimativa.

## Prompting para imagem→3D (práticas, não regras do fornecedor)

- Um objeto por imagem, fundo neutro liso, sem sombra projetada no chão, luz difusa frontal.
- Vista 3/4 para props; para multi-imagem (Meshy 1–4, Sparc3D 1–4 "front first"): frontal,
  lateral, traseira na mesma escala.
- Personagens: pose T/A, pernas afastadas, dedos fechados, roupa justa (cabelos/capas soltas
  geram cascas). Acessórios grandes como assets separados (PartCrafter ou gerar à parte).
- Pedir explicitamente "no text, no logo, no watermark"; o pipeline da loja (4.1(c)/5.2.1)
  varre marcas e semelhanças.
- Reaproveite a mesma imagem de referência em 2 geradores quando a licença permitir: a
  comparação lado a lado é a melhor "arena" disponível.
