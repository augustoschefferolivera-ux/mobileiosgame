# PROVENANCE — <nome-do-asset>

> Copie este arquivo para `assets/3d/src/<asset>/PROVENANCE.md` e preencha tudo. Campos sem
> informação recebem `desconhecido` (nunca deixe em branco). Este registro é a prova de
> seleção e edição humana exigida para direito autoral (EUA e Brasil) e para o rótulo
> "AI-generated/AI-assisted" (EU AI Act art. 50, se distribuir na Europa).

| Campo | Valor |
|---|---|
| Asset ID / nome | ASSET-NNN / <nome> |
| Categoria | herói / inimigo / prop / cenário |
| Spec | `design/assets/specs/<asset>-3d.md` |
| Data de geração | AAAA-MM-DD |
| Gerador | Tripo 3.0 / Meshy 7.1 / TRELLIS.2-4B / TripoSG / PartCrafter / SPAR3D / outro |
| Versão / modo | ex.: "Tripo 3.0 Standard", "Meshy 7.1 Smart Topology", "TRELLIS.2 1024³" |
| Plano / conta | ex.: "Meshy Pro (mensal)", "GPU alugada <provedor>" |
| **Licença da saída** | ex.: "comercial, sem atribuição (plano pago)" / "CC BY 4.0 — atribuir a Meshy" / "MIT (modelo); saída própria" |
| Restrição territorial? | não / **sim: UE, UK, Coreia do Sul (Tencent)** |
| Atribuição exigida? | não / sim: texto exato a exibir |
| Prompt de texto | texto completo |
| Imagem(ns) de referência | caminho + SHA-256; gerada por <modelo de imagem, versão, prompt> |
| Seed / job id | valor |
| Candidatos gerados | cand-01 … cand-NN (quantos, quais parâmetros) |
| Candidato escolhido | cand-NN — motivo em `production/evidencias/<data>-<asset>/decisao.md` |
| Medições (bruto) | tris LOD0, nº texturas, resolução, mapas PBR (do `inspecionar_glb.py`) |
| Edição humana | o que foi alterado à mão (retopo, correção de UV, repintura, escolha de pose, etc.) |
| Pipeline posterior | `/otimizar-3d-para-mobile` (params), `/rigging-e-animacao-3d` (ferramenta), `/materiais-e-texturas-pbr` |
| Arquivos finais | caminhos dos GLB/FBX/USDZ e LODs exportados |
| Ferramentas e versões | gltfpack x.y, @gltf-transform/cli x.y, Blender x.y, Reality Converter x.y |
| Revisor humano | nome / data |
