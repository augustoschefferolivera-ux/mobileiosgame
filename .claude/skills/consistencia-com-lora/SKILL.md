---
name: consistencia-com-lora
description: >
  Mantém personagens e estilo consistentes ao longo de dezenas de assets de um jogo Phaser web mobile:
  decide entre as três camadas (prefixo + folha + seed fixa; referência por imagem em cada chamada —
  Nano Banana Pro, Retro Diffusion Pro, FLUX.2 [klein] 4B com ReferenceLatent na estação GPU; LoRA de
  personagem/estilo treinado na fal ou Replicate), monta o dataset (20+ imagens curadas), explica
  licenças (FLUX.2 [klein] 4B Apache 2.0; [dev] e [klein] 9B não comerciais para servir), fixa seeds e
  roda o checklist de consistência com medição de paleta e legibilidade. Use quando o usuário reclamar
  que "o personagem muda a cada imagem", quando houver personagem recorrente ou mais de ~30 assets no
  mesmo estilo. Não use para o primeiro asset de um projeto sem style card (/direcao-de-arte-e-style-card).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; conta fal ou Replicate para treinar; ComfyUI na estação GPU opcional"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [4, 6]
argument-hint: "[personagem|estilo] [--treinar|--verificar]"
disable-model-invocation: false
user-invocable: true
---

# Consistência com LoRA, referências e verificação

Entrega uma âncora de consistência (LoRA treinado com licença registrada, ou folha + workflow de referência + seeds fixas) e um relatório por lote em `production/evidencias/<data>-consistencia-<alvo>/`; a evidência é a folha lado a lado com a referência, `verificar_paleta.py` e `verificar_legibilidade.py` dentro dos limites, e a tela do jogo com 5+ assets do lote juntos.

## Quando usar / quando não usar

- **Use** (treinar LoRA) quando: personagem recorrente em > 30 assets/frames, estilo único que o prefixo não segura, produção de meses com vários modelos.
- **Use** (só referência + verificação) quando: < 30 assets, ou o modelo aceita referências (Nano Banana Pro até 14; Retro Diffusion Pro 9; FLUX.2 [klein] edit com `ReferenceLatent`, 1 imagem no 4B e 2 no 9B).
- **Não use** antes de `design/art-bible.md`, `design/paleta.txt` e `./assets/referencias/chr_<nome>_sheet.png` existirem; sem âncora humana, um LoRA só congela a inconsistência.

## Pré-requisitos

- Conta na fal (`fal-ai/flux-2-trainer`) ou Replicate (`ostris/flux-dev-lora-trainer`); ou treino local (ai-toolkit/kohya em WSL2) só com ≥ 16 GB de VRAM — a RTX 5060 de 8 GB não treina FLUX.2 com folga (`/estacao-gpu-remota`, `.claude/skills/estacao-gpu-remota/references/modelos-por-vram.md`).
- Para a camada de referência local: ComfyUI na estação com FLUX.2 [klein] 4B fp8 e `assets/flux2_klein_4b_edit_referencia_api.json` (reconstruído do template oficial `image_flux2_klein_image_edit_4b_base`).
- `python3 -m pip install Pillow` para `scripts/verificar_paleta.py`; `../gerar-sprites-2d/scripts/contact_sheet.py`; `../direcao-de-arte-e-style-card/scripts/verificar_legibilidade.py`.
- Orçamento: treino na nuvem por GPU-minuto (não capturado; veja a página do treinador); inferência FLUX via API por imagem; local ≈ zero. **Licença**: FLUX.2 [klein] 4B Apache 2.0 (pode servir); FLUX.2 [dev] e [klein] 9B = FLUX Non-Commercial License (servir exige licença da BFL; saídas usáveis comercialmente segundo leitura secundária — [confirmar no texto]); hospedado (fal/Replicate) segue os termos do serviço.

## Entradas

1. Alvo: personagem (identidade) ou estilo (toda a arte). Um LoRA por alvo.
2. Dataset-fonte: folha de referência + assets já aprovados e registrados (nada não curado, nada de terceiros).
3. Modelo-base e onde roda (API hospedada → [dev] aceitável; self-host na estação → [klein] 4B).
4. Limites da bible: tolerância de paleta, proporção em cabeças, traço, luz; cor do cenário para o teste de legibilidade.

## Passos

1. **Decidir a camada** (somam-se; comece pela mais barata):

   | Camada | Custo | Quando basta |
   |---|---|---|
   | Prefixo + folha de referência (descrição textual fixa) + seed fixa | zero | ≤ 30 assets, 1 modelo |
   | Referência por imagem em cada chamada (Nano Banana Pro; FLUX.2 [klein] edit local; RD Pro) | por imagem / zero local | personagem recorrente, poses variadas |
   | LoRA de estilo/personagem | treino + inferência | > 30 assets, meses, troca de modelo |

2. **Camada de referência local (ComfyUI)**: a folha entra em `LoadImage` → `ImageScaleToTotalPixels` (1 MP) → `VAEEncode` → `ReferenceLatent` no positivo e no negativo; o texto pede a nova pose e repete o prefixo:
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/comfyui_lote.py --workflow .claude/skills/consistencia-com-lora/assets/flux2_klein_4b_edit_referencia_api.json --server http://gamer-pc:8188 --upload assets/referencias/chr_<nome>_sheet.png --prompt-arquivo prompts/sprites/chr_<nome>_<pose>.txt --seeds 1,2,3,4 --validar --out assets/brutos/<data>/chr_<nome>_<pose>
   ```
   Fundo branco → recorte BiRefNet (`/gerar-sprites-2d`, receita B). Em 8 GB o 4B base fp8 é apertado (9,2 GB medidos em RTX 5090 pela doc do ComfyUI); teste e meça com `gpu.sh status`.
3. **Montar o dataset** (leia `references/dataset-e-treino.md`): 20+ imagens para `fal-ai/flux-2-trainer` ("dataset consistency will determine how well the LoRA performs"); 12–18 para `ostris/flux-dev-lora-trainer` (1.000–3.000 passos, palavra-gatilho). Mesmo estilo, poses e enquadramentos variados, fundo neutro, nada fora da paleta; legendas `.txt`. Salve em `./assets/referencias/lora/<alvo>/` com a origem de cada imagem (todas suas, no `PROVENANCE.md`).
4. **Treinar.** fal: `fal-ai/flux-2-trainer` (zip; parâmetros na página). Replicate: `ostris/flux-dev-lora-trainer`, gatilho único (ex.: `rpsmsg`), 1.000–3.000 passos. Guarde o `.safetensors` **fora** do bundle (`./assets/referencias/lora/<alvo>/<alvo>_v01.safetensors`) e registre em `design/lora-registry.md`: base, licença, dataset (hashes), passos, data, custo.
5. **Calibrar.** 8 imagens de teste com seeds fixas (1–8) e força 0,8–0,95; mantenha as mesmas seeds em toda comparação futura; folha de contato ao lado da folha de referência.
6. **Verificar o lote** (sempre, com ou sem LoRA):
   ```bash
   python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py assets/brutos/<data>/<lote>/recortes/*.png --paleta design/paleta.txt --tolerancia 28 --max-fora 10 --mapa production/evidencias/<data>-consistencia-<alvo>/paleta_fora.png
   python3 .claude/skills/direcao-de-arte-e-style-card/scripts/verificar_legibilidade.py assets/brutos/<data>/<lote>/recortes --fundo "#<cor do cenário>" --alvo-px <pt> --json production/evidencias/<data>-consistencia-<alvo>/legibilidade.json
   python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py assets/referencias/chr_<nome>_sheet.png assets/brutos/<data>/<lote>/recortes --colunas 5 --saida production/evidencias/<data>-consistencia-<alvo>/lado-a-lado.png
   ```
   Depois o checklist humano de `references/checklist-consistencia.md` (proporção em cabeças ±10 %, traço, luz, acessórios, paleta, silhueta). Qualquer item vermelho = regenerar ou retocar, nunca "deixa passar".
7. **Registrar.** Cada asset leva na coluna Modelo `FLUX.2 [klein] 4B + lora:<alvo>_v01` (ou `FLUX.2 [klein] 4B edit + ref:chr_<nome>_sheet.png`) e na Licença a do modelo-base; `design/lora-registry.md` ganha a versão. Mudou a bible → novo LoRA (v02).
8. **Evidência no jogo**: tela com 5+ assets do mesmo lote via atlas (`/atlas-e-exportacao-2d-mobile`) e `bash scripts/verify.sh` → `production/evidencias/<data>-consistencia-<alvo>/no-jogo.png`.

## Critério de pronto e evidência

- [ ] `design/lora-registry.md` com base, licença, dataset, passos, custo e versão (quando houver LoRA); ou `lote.json` com seeds e referência usada.
- [ ] `lado-a-lado.png`, `paleta_fora.png`, `legibilidade.json` e saídas dos scripts dentro do limite na pasta de evidências.
- [ ] Checklist de consistência preenchido pelo humano, sem itens vermelhos.
- [ ] Seeds, força e referência registrados por asset em `PROVENANCE.md`; `no-jogo.png` com 5+ assets juntos.

## Armadilhas conhecidas

- **Licença FLUX**: [dev]/[klein] 9B não podem ser servidos comercialmente sem licença da BFL; use [klein] 4B para o que roda no seu servidor. Nada disso vai para o build do jogo (é produção).
- **Dataset sujo = LoRA ruim**: imagens não curadas ou de terceiros contaminam estilo e direitos.
- **Overfitting**: força 1,0 com dataset pequeno "cola" poses; 0,8–0,95 e poses variadas.
- **Seeds não existem em todo provedor** (OpenAI não expõe; Gemini "best effort"); registre `n/a` e confie na camada de referência.
- **8 GB de VRAM**: treino local inviável; a camada de referência local (klein 4B) pode precisar de GGUF/offload [secundário].
- **IP-Adapter / Kontext**: não verificados nesta pesquisa para FLUX.2; o equivalente oficial no ComfyUI é `ReferenceLatent` dos templates klein — [confirmar alternativas].
- **Números de "93 %/95 % de consistência"** em blogs não têm fonte; use a sua medição (`verificar_paleta.py`, IoU de silhueta, checklist).

## Exportar para Phaser (web mobile)

O LoRA e os workflows nunca entram no bundle; o que vai para o jogo são os PNGs verificados, empacotados por `/atlas-e-exportacao-2d-mobile` (@2x, atlas ≤ 2048², WebP opcional) e carregados com `this.load.atlas`. Geração em runtime no jogo (fase 7) só com modelo de licença de deploy (Apache/MIT ou contrato) e divulgação (`/divulgacao-de-uso-de-ia`). **Licença de saída**: registre por asset o modelo-base + LoRA/referência e os termos do serviço de inferência.

## Fontes

- ComfyUI: template `image_flux2_klein_image_edit_4b_base` (`ReferenceLatent`, `ImageScaleToTotalPixels`), guia FLUX.2 Klein 4B (VRAM 8,4/9,2 GB em RTX 5090) — https://github.com/Comfy-Org/workflow_templates ; https://github.com/Comfy-Org/docs (lidos em 2026-10-10)
- fal: treino de LoRA FLUX.2, 20–1.000 imagens — https://blog.fal.ai/training-flux-2-loras ; https://fal.ai/models/fal-ai/flux-2-trainer
- Replicate `ostris/flux-dev-lora-trainer`: 12–18 imagens, 1.000–3.000 passos, força 0,8–0,95 — https://replicate.com/ostris/flux-dev-lora-trainer/readme
- Licenças FLUX.2 ([klein] 4B Apache 2.0; [dev]/9B não comercial) — https://vercel.com/ai-gateway/models/flux-2-klein-4b/faq ; https://canirun.ai/license/flux-non-commercial/ [secundário]
- Nano Banana Pro até 14 referências — doc do nó `GeminiImage2Node` (Comfy-Org/docs); Retro Diffusion Pro 9 — https://app.cinevva.com/guides/ai-pixel-art-generators [secundário]
- Checklist inspirado em `consistency-check` do Claude-Code-Game-Studios (MIT) — https://github.com/Donchitos/Claude-Code-Game-Studios
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ4, KQ6); manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
