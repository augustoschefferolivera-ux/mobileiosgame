---
name: gerar-ativos-3d
description: >
  Gera malhas 3D (personagens, props, cenário) com IA a partir de um brief e de uma imagem
  de referência, escolhendo o gerador pela licença de saída e pelo orçamento mobile, e
  registra proveniência. Use sempre que o usuário pedir um modelo, personagem, objeto,
  arma, veículo ou qualquer asset 3D para o jogo, mesmo sem dizer "3D" ou "malha" — inclusive
  quando o destino final é um sprite 2D pré-renderizado para Phaser.
  Não use para otimizar/decimar um GLB já existente (/otimizar-3d-para-mobile), para
  rigar/animar (/rigging-e-animacao-3d) nem para mundos inteiros (/ambientes-e-mundos-3d).
license: MIT
compatibility: "Claude Code ou Codex; modelos abertos exigem GPU NVIDIA (Linux, 8–24 GB VRAM) local ou em nuvem"
metadata:
  grupo: 3d
  alvo: [3d, app, web]
  fase: [4, 6]
argument-hint: "[nome-do-asset] [heroi|inimigo|prop|cenario] [--gerador tripo|meshy|trellis2|triposg|partcrafter|spar3d]"
disable-model-invocation: false
user-invocable: true
---

# Gerar ativos 3D

Entrega um GLB bruto escolhido entre 3–5 candidatos, com `PROVENANCE.md`, relatório de
`scripts/inspecionar_glb.py` e screenshots em `production/evidencias/<data>-<asset>/`.

## Quando usar / quando não usar

- Use para criar um asset 3D novo (herói, inimigo, prop, peça modular de cenário, ícone 3D).
- Use para re-gerar um asset cujo candidato anterior falhou na avaliação.
- Não use para: reduzir polígonos, LODs, KTX2/USDZ (`/otimizar-3d-para-mobile`); esqueleto e
  animação (`/rigging-e-animacao-3d`); ambientes inteiros, splats, skybox
  (`/ambientes-e-mundos-3d`); só textura/material (`/materiais-e-texturas-pbr`).

## Pré-requisitos

- `python3` (sem dependências) para `scripts/inspecionar_glb.py`.
- Gerador na **lista verde de `LICENCAS.md`** do projeto (`/licencas-e-proveniencia`; regra
  `.claude/rules/assets.md`); se não estiver, pare e peça decisão. Chaves/planos:
  - Tripo: plano pago (uso comercial só pago). Meshy: plano pago (grátis = CC BY 4.0).
  - TRELLIS.2-4B / TripoSG / PartCrafter / SPAR3D: GPU NVIDIA Linux (≥24 GB VRAM para
    TRELLIS.2; ≥8 GB para TripoSG e PartCrafter; ~10,5 GB para SPAR3D) local ou alugada.
- Opcional: Blender com `/blender-automatizado` (MCP) para inspeção visual (`look` em
  `wireframe`/`angles`) e `generate_3d` via Tripo/Rodin.
- Style card / art bible do projeto (`/direcao-de-arte-e-style-card`). Sem ele, use a linha
  de direção de arte do brief e diga isso no spec. Ferramentas ausentes: `/instalar-ferramentas`.

## Entradas

- Brief do jogo e lista de features (quais assets o loop precisa agora).
- Style card: paleta, linguagem de forma, nível de realismo, referências visuais.
- Destino (ADR-0001 / `CLAUDE.md`): **Phaser via sprites pré-renderizados** (padrão 2D) ou
  **Three.js** (tempo real, ADR-0002). Unity/Godot/USDZ só se outro ADR mandar.
- Orçamento por asset. Se o projeto não fixou, use a divisão abaixo e marque como inferência.

| Categoria | Triângulos (LOD0) | Texturas | LODs | Observação |
|---|---|---|---|---|
| Herói / personagem jogável | 30–50K | 1 conjunto PBR 2048² | 3 (0,5/0,25/0,1) | Inferência do relatório a partir do teto Apple |
| Inimigo / NPC | 10–30K | 1 conjunto 1024–2048² | 3 | Inferência |
| Prop | 5–10K | 512–1024² ou atlas compartilhado | 2 | Inferência |
| Cenário modular (peça) | 2–10K | atlas 2048² por kit | 2 | Inferência |
| **Teto por frame no device mais antigo** | **≤100K** | **1 conjunto 2048²** | — | Apple (AR Quick Look, 2018, reafirmado 2021); reutilizado para o Safari do iPhone por falta de número oficial |

A tabela vale para **Three.js**. Para **pré-render** (Phaser) tris e texturas só pesam no
tempo de render; o que conta é silhueta, textura sem luz assada e simetria — e o orçamento
passa a ser o do atlas de sprites (`/sprites-pre-renderizados-de-3d`).

## Matriz de geradores (resumo; detalhes em `references/matriz-geradores.md`)

| Gerador | Licença da saída | Formatos | Low-poly / topologia | Rig | Veredito para jogo global na App Store |
|---|---|---|---|---|---|
| **Tripo 3.0 / Tripo Studio** (20/08/2025) | Comercial **só em plano pago**; Pro ~US$ 19,90/mês [secundário, confirmar]; aumentos reportados em 2026 [secundário] | USD, FBX, OBJ, STL | Modo Standard "ideal for gaming"; "smart low-poly" | Auto-rig avatares e criaturas (fornecedor: bípedes e multi-pernas) | **Principal (pago)**; melhor em geometria/rig segundo reviews |
| **Meshy 7** (12/08/2026) / **7.1** (10/09/2026) | Planos pagos = comercial; **grátis = CC BY 4.0** (atribuição a Meshy); créditos não acumulam | FBX, GLB, USD (planos pagos) | "Smart Topology" low-poly (jul/2026); 3D Agent beta (jun/2026); "Ultra 4K" no 7.1 [secundário] | Auto-rig (fontes contraditórias; fornecedor: bípedes) | **Principal (pago)**; melhor em texturização/plug-ins segundo reviews |
| **TRELLIS.2-4B** (Microsoft, dez/2025) | **MIT** (deps nvdiffrast/nvdiffrec com licenças próprias) | GLB com PBR (base color, roughness, metallic, opacity) | Denso: `decimation_target` padrão **1.000.000 faces**, textura 4096; GLB exporta OPACO por padrão | Não | Alternativa aberta; exige ≥24 GB VRAM Linux |
| **TripoSG** (VAST, mar/2025) | **MIT** | GLB **sem textura** | `--faces` limita faces | Não | Geometria aberta barata (≥8 GB VRAM); texturizar depois |
| **PartCrafter** (NeurIPS 2025) | **MIT** | GLB por peças (`--num_parts`) | Treinado em renders Objaverse | Não | Props modulares/segmentados |
| **SPAR3D** (Stability, jan/2025) | Stability AI Community License: grátis **< US$ 1 M receita/ano**; registro comercial | GLB; `remesh none/triangle/quad` | Quad remesh opcional | Não | OK para indie abaixo do limiar |
| **Hunyuan3D 2.0/2.1/Omni/Part** (Tencent) | Tencent Community License: **não vale na UE, Reino Unido e Coreia do Sul**; **"must not use... Output... outside the Territory"**; >1 M MAU exige licença | GLB/OBJ, PBR (2.1) | Denso | Omni aceita esqueleto como controle | **Bloqueio** para distribuição global; só com licença negociada ou geo-restrição |
| Hunyuan3D 3.0 (API fechada) | Termos não lidos | — | — | — | Confirmar antes de usar |
| Hyper3D Rodin Gen-2 | Termos não lidos; ~US$ 0,80/req [secundário] | via Blender MCP `generate_3d` | — | — | Confirmar antes de usar |
| Sparc3D / Hitem3D | Sparc3D **sem LICENSE** no repo; Hitem3D comercial, "automatic retopology" | GLB, OBJ, STL (Hitem3D) | Retopo automática (fornecedor) | — | Confirmar termos |
| Roblox Cube 3D / CubePart | **RESEARCH-ONLY RAIL-MS**: sem uso comercial | — | — | — | **Não usar** |

Nenhum gerador, pago ou aberto, emite topologia quad limpa por padrão; o fluxo real é
gerar → retopo/low-poly → decimar/LODs → bake PBR → exportar (relatório, seção "Ativos 3D").

## Passos

1. **Brief do asset** (adaptado do `asset-spec` do Claude-Code-Game-Studios, MIT). Escreva
   `design/assets/specs/<asset>-3d.md` com: ID (`ASSET-NNN`, sequencial no manifesto),
   categoria, função no jogo, distância típica da câmera, orçamento (tabela acima), estilo
   (citar regras do style card), formato final (GLB) e destino (sprites Phaser ou Three.js). Confirme a lista com
   o usuário antes de gastar créditos. Resultado observável: arquivo de spec no disco.
2. **Imagem de referência**. Geradores de 2026 são imagem→3D (Meshy 7 é explicitamente um
   modelo imagem-para-3D). Gere a referência com `/gerar-sprites-2d` (fundo transparente)
   a partir do style card: vista 3/4 (ou frontal + lateral para multi-imagem), fundo neutro, iluminação
   plana, objeto único, silhueta fechada; personagens em **pose T/A com membros separados**
   (facilita rig). Prompts proíbem nomes, logos e personagens reais (Guidelines 4.1(c)/5.2.1).
   Salve em `assets/3d/src/<asset>/ref/`.
3. **Escolher gerador** pela matriz: licença da saída → formato que o engine lê → orçamento.
   Regra: jogo distribuído globalmente **não usa Hunyuan3D nem Cube**. Registre a decisão no
   spec.
4. **Gerar 3–5 candidatos** variando seed e modo (ex.: Tripo Standard vs Ultra; Meshy com
   Smart Topology; TRELLIS.2 em 512³ vs 1024³). Para abertos, fixe o limite de faces na
   geração (TripoSG `--faces`, TRELLIS.2 `decimation_target`). Salve cada candidato em
   `assets/3d/src/<asset>/cand-NN.glb` e anote seed/job id.
5. **Avaliar** cada candidato:
   ```bash
   python3 .claude/skills/gerar-ativos-3d/scripts/inspecionar_glb.py assets/3d/src/<asset>/cand-01.glb \
     --max-tris 50000 --max-texture 2048 --json > production/evidencias/<data>-<asset>/cand-01.json
   ```
   O script mede triângulos (por malha e instanciados), texturas (formato, dimensões, MB),
   mapas PBR presentes, `alphaMode`, UVs, esqueleto/animações e extensões. Em seguida,
   inspeção visual (Blender MCP `look` em `angles` e `wireframe`, ou screenshots do viewer):
   cascas flutuantes, buracos, simetria, proporções vs referência, iluminação assada no albedo
   (ruim), costuras de textura. Preencha o checklist em `references/matriz-geradores.md`
   ("Checklist de avaliação"). Se nada for mensurável, escreva `NÃO AVALIADO`, nunca estime.
6. **Escolher e registrar**. Copie o vencedor para `assets/3d/src/<asset>/<asset>-raw.glb`
   (nomes em kebab-case, regra `.claude/rules/assets.md`). Adicione a **linha do asset ao
   `PROVENANCE.md` do projeto** e guarde o bloco detalhado em
   `assets/3d/src/<asset>/PROVENANCE.md` a partir de `assets/PROVENANCE.template.md`
   (gerador, versão, modo, prompt, hash da imagem de referência, seed/job id, plano e licença
   da saída, atribuição exigida, o que o humano escolheu/alterou). Atualize o manifesto.
7. **Encaminhar** conforme o destino: **sprites** → `/rigging-e-animacao-3d` (se animado) →
   `/sprites-pre-renderizados-de-3d` (decimar antes é opcional, só acelera o render);
   **Three.js** → `/otimizar-3d-para-mobile --target web` (obrigatório: a saída bruta estoura o
   orçamento) e, se for personagem, `/rigging-e-animacao-3d`.

## Critério de pronto e evidência

- `assets/3d/src/<asset>/<asset>-raw.glb` + `PROVENANCE.md` + `ref/`.
- `production/evidencias/<data>-<asset>/` com: JSON do `inspecionar_glb.py` de cada candidato,
  pelo menos 2 screenshots (sombreado e wireframe) do escolhido, e `decisao.md` (por que
  este candidato, o que falhou nos outros).
- Spec em `design/assets/specs/<asset>-3d.md` com status `Gerado — aguardando otimização`.
- "Gerado" não é "pronto no jogo": a importação no engine e o screenshot no simulador são
  critérios da skill de otimização.

## Armadilhas conhecidas

- **Licença territorial da Tencent** (LICENSE lido na íntegra): exclui UE/UK/Coreia e proíbe
  uso das saídas fora do Território. Bloqueio contratual para App Store global.
- **Meshy grátis = CC BY 4.0**: exige atribuição a Meshy no jogo; planos pagos liberam.
  Créditos não acumulam. Preço do Pro conflita entre agregadores [secundário].
- **Tripo**: uso comercial e modelos privados só em plano pago; agregadores reportam reajustes
  em maio e agosto de 2026 (topo a US$ 329,70) — confirme na página oficial.
- **TRELLIS.2** exporta GLB opaco por padrão (reconectar alpha manualmente) e com alvo de 1 M
  faces; sem retopo, não entra em iPhone.
- **Hardware**: TRELLIS.2 ≥24 GB VRAM, Linux; Hunyuan3D 2.1 ~29 GB para forma+textura.
- **Benchmarks** (Sloyd arena, Meshy, Pixazo) são de fornecedor ou editoriais; Hi3DEval é o
  único com metodologia documentada, mas o placar não foi lido. Decida com seus 3–5
  candidatos, não com ranking.
- **Cadência trimestral**: Meshy lançou três versões entre jun e set/2026; revalide a matriz
  a cada ~3 meses.
- **Direito autoral**: saída pura de IA não tem proteção (EUA e Brasil); o `PROVENANCE.md`
  com seleção e edição humana é a prova de intervenção.
- **Custo**: cada candidato consome créditos (Meshy: 20 créditos por text-to-3D no Meshy 6
  [secundário]). Gere 3–5, não 20.

## Exportar para web

Esta skill entrega o **bruto** (GLB com PNG, guardado como fonte). Para Three.js a exportação
final é de `/otimizar-3d-para-mobile --target web`: LODs 0,5/0,25/0,1, texturas ≤2048² em
**KTX2** (UASTC/ETC1S) + **meshopt**, GLB lido por `GLTFLoader` + `KTX2Loader` + `MeshoptDecoder`
(three.js r186); tamanhos típicos: prop 100–300 KB, herói ≤2 MB com texturas. USDZ/FBX só se
um ADR pedir app nativo ou Unity/Godot. **Licença de saída**: Tripo/Meshy pagos = comercial
global sem atribuição (confirme no plano); Meshy grátis = CC BY 4.0; TRELLIS.2/TripoSG/
PartCrafter = MIT (saída sua); SPAR3D = grátis abaixo de US$ 1 M; Hunyuan3D/Cube = **não** para
jogo global — e a restrição vale igualmente para sprites renderizados a partir deles.

## Pré-render para Phaser

Quando o jogo é 2D (ADR-0001), o GLB desta skill vira frames: `/rigging-e-animacao-3d` (clipes
nomeados) → `/sprites-pre-renderizados-de-3d` (`render_sprites.py`: câmera ortográfica, 4/8
direções, luz fixa, toon opcional → `montar_atlas_phaser.py`: atlas JSON hash ≤2048²). Prefira
geradores com auto-rig + animação (Tripo Studio, Meshy) ou bases CC0 já animadas (Quaternius)
para encurtar a cadeia; peça ao gerador textura **sem luz assada** (ela não gira com o sprite).

## Fontes

- Relatório: `reports/Criação de jogos totalmente por IA.md` (seção "Ativos 3D", "Stack recomendado").
- Nota: `research_notes/Criação de jogos totalmente por IA/ativos_3d_rigging_mundos.md` (KQ1, KQ5, KQ7).
- Tripo 3.0: https://www.businesswire.com/news/home/20250820723593/en/Tripo-the-Frontrunner-of-3D-AI-Boom-Supercharges-New-Era-in-Content-Creation-with-3.0-Upgrade ; preços https://costbench.com/software/ai-3d-generation/tripo-ai/ [secundário]
- Meshy: https://docs.meshy.ai/en/webapp/pricing ; https://docs.meshy.ai/en/webapp/changelog ; https://www.aap.com.au/aapreleases/cision20260812ae24698/
- TRELLIS.2: https://github.com/microsoft/TRELLIS.2
- TripoSG: https://github.com/VAST-AI-Research/TripoSG ; PartCrafter: https://github.com/wgsxm/PartCrafter
- SPAR3D: https://github.com/Stability-AI/stable-point-aware-3d ; licença https://raw.githubusercontent.com/Stability-AI/stable-point-aware-3d/main/LICENSE.md
- Hunyuan3D 2.1 e LICENSE: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 ; https://raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE
- Roblox Cube LICENSE: https://github.com/Roblox/cube/blob/main/LICENSE
- Orçamento Apple: https://developer.apple.com/forums/thread/693867 ; https://developer.apple.com/forums/thread/751764
- Hi3DEval: https://github.com/3DTopia/Hi3DEval ; Sloyd arena (fornecedor): https://www.sloyd.ai/blog/ai-3d-model-generator-rankings
- Template adaptado: `asset-spec`, `asset-audit` e `technical-artist` de Donchitos/Claude-Code-Game-Studios (MIT) — ver `THIRD_PARTY_NOTICES.md` nesta pasta.
- Destinos web: `playbook/10-praticas-de-3d-para-jogo-web.md`; three.js 0.186.1 e Phaser 4.2.1 conferidos no npm em 10/10/2026.
