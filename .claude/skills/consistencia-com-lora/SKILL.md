---
name: consistencia-com-lora
description: >
  Mantém personagens e estilo consistentes ao longo de dezenas de assets: decide quando treinar
  um LoRA (FLUX.2 na fal; FLUX.1-dev na Replicate), monta o dataset (20+ imagens consistentes),
  explica licenças (FLUX.2 [klein] 4B Apache 2.0; [dev] e [klein] 9B não comerciais para servir),
  fixa seeds, usa referência por imagem (Nano Banana Pro, Retro Diffusion Pro) e roda o checklist de
  consistência com medição de paleta. Use quando o usuário reclamar que "o personagem muda a cada
  imagem", quando houver personagem recorrente ou mais de ~30 assets no mesmo estilo. Não use para
  o primeiro asset de um projeto sem style card (/direcao-de-arte-e-style-card).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; conta fal ou Replicate para treinar"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [4, 6]
argument-hint: "[personagem|estilo] [--treinar|--verificar]"
disable-model-invocation: false
user-invocable: true
---

# Consistência com LoRA, referências e verificação

Entrega uma âncora de consistência (LoRA treinado com licença registrada, ou folha + seeds fixos) e um relatório de consistência por lote em `production/evidencias/<data>-consistencia-<alvo>/`; a evidência é a folha de contato lado a lado com a folha de referência e o `verificar_paleta.py` dentro do limite.

## Quando usar / quando não usar

- **Use** (treinar LoRA) quando: personagem recorrente em > 30 assets/frames, estilo único que o prefixo não segura, ou produção que dura meses com vários modelos.
- **Use** (só referência + verificação) quando: < 30 assets, ou o modelo aceita referências (Nano Banana Pro ~14; Retro Diffusion Pro 9; FLUX.2 multi-referência).
- **Não use** antes de `design/art-bible.md`, `design/paleta.txt` e `assets/referencias/chr_<nome>_sheet.png` existirem; sem âncora humana, um LoRA só congela a inconsistência.

## Pré-requisitos

- Conta na fal (`fal-ai/flux-2-trainer`) ou Replicate (`ostris/flux-dev-lora-trainer`); ou FluxGym local com GPU. Chaves em variáveis de ambiente; nunca no repositório.
- `python3 -m pip install Pillow` para `scripts/verificar_paleta.py`; `../gerar-sprites-2d/scripts/contact_sheet.py` para folhas lado a lado.
- Orçamento: treino na nuvem custa por passo/GPU-minuto (não capturado; veja a página do treinador antes); inferência FLUX via API por imagem. **Licença**: FLUX.2 [klein] 4B = Apache 2.0 (uso comercial irrestrito, pode servir); FLUX.2 [dev] e [klein] 9B = FLUX Non-Commercial License (servir exige licença da BFL; a leitura corrente diz que as **saídas** podem ser usadas comercialmente — [secundário, confirmar no texto da licença]); FLUX.1 [dev] idem. Treinar/gerar em serviço hospedado (fal/Replicate) segue os termos do serviço.

## Entradas

1. Alvo: personagem (identidade) ou estilo (toda a arte). Um LoRA por alvo.
2. Dataset-fonte: folha de referência + imagens já aprovadas e registradas (nada não curado).
3. Modelo-base e onde vai rodar (só API hospedada → [dev] aceitável; self-host/on-device → [klein] 4B ou outro Apache/MIT).
4. Limites de consistência da bible: tolerância de paleta (`--tolerancia`), proporção em cabeças, traço.

## Passos

1. **Decidir a camada** (tabela). As três se somam; comece pela mais barata:

   | Camada | Custo | Quando basta |
   |---|---|---|
   | Prefixo + folha de referência + seed fixo | zero | ≤ 30 assets, 1 modelo |
   | Referência por imagem em cada chamada (Nano Banana Pro, RD Pro, FLUX.2 edit) | por imagem | personagem recorrente, poses variadas |
   | LoRA de estilo/personagem | treino + inferência | > 30 assets, vários meses, troca de modelo |

2. **Montar o dataset** (leia `references/dataset-e-treino.md`): 20+ imagens para o treinador FLUX.2 da fal (20–1.000; "dataset consistency will determine how well the LoRA performs"); 12–18 imagens em alta resolução para `ostris/flux-dev-lora-trainer` (1.000–3.000 passos, palavra-gatilho). Mesmo estilo, poses e enquadramentos variados, fundo neutro, nada fora da paleta. Legende cada imagem (`.txt` ao lado) com a palavra-gatilho + descrição curta. Salve em `assets/referencias/lora/<alvo>/` e liste origem de cada imagem (todas suas, registradas em `PROVENANCE.md`).
3. **Treinar.** fal: `fal-ai/flux-2-trainer` (envie o zip; parâmetros na página do modelo). Replicate: `ostris/flux-dev-lora-trainer` com palavra-gatilho única (ex.: `rpsmsg`), 1.000–3.000 passos. Guarde o `.safetensors` **fora** do bundle do app, em `assets/referencias/lora/<alvo>/<alvo>_v01.safetensors` (ou no storage do serviço) e registre em `design/lora-registry.md`: base, licença, dataset (hashes), passos, data, custo.
4. **Calibrar.** Gere 8 imagens de teste com seeds fixos (ex.: 1–8) e força 0,8–0,95 (dica do treinador da Replicate para looks estilizados); mantenha os mesmos seeds em toda comparação futura. Monte folha de contato ao lado da folha de referência.
5. **Verificar** o lote (sempre, com ou sem LoRA):
   ```bash
   python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py assets/brutos/<data>/<lote>/recortes/*.png --paleta design/paleta.txt --tolerancia 28 --max-fora 10 --mapa production/evidencias/<data>-consistencia-<alvo>/paleta_fora.png
   python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py assets/referencias/chr_<nome>_sheet.png assets/brutos/<data>/<lote>/recortes --colunas 5 --saida production/evidencias/<data>-consistencia-<alvo>/lado-a-lado.png
   ```
   Depois o checklist humano de `references/checklist-consistencia.md` (adaptado da ideia "registro + comparação por item" do `consistency-check` do Claude-Code-Game-Studios, MIT): proporção, traço, luz, acessórios, paleta, silhueta. Qualquer item vermelho = regenerar ou retocar, nunca "deixa passar".
6. **Registrar.** Cada asset gerado com LoRA leva na coluna Modelo `FLUX.2 [klein] 4B + lora:<alvo>_v01` e na coluna Licença a do modelo-base; o `design/lora-registry.md` ganha a versão. Mudou a bible → novo LoRA (v02), nunca "ajuste" silencioso.
7. **Evidência no jogo**: o teste final é a tela com 5+ assets do mesmo lote juntos; screenshot em `production/evidencias/<data>-consistencia-<alvo>/no-jogo.png`.

## Critério de pronto e evidência

- [ ] `design/lora-registry.md` com base, licença, dataset, passos, custo e versão (quando houver LoRA).
- [ ] `lado-a-lado.png` + `paleta_fora.png` + saída do `verificar_paleta.py` (dentro do limite) na pasta de evidências.
- [ ] Checklist de consistência preenchido pelo humano, sem itens vermelhos.
- [ ] Seeds e força registrados por asset em `PROVENANCE.md`.

## Armadilhas conhecidas

- **Licença FLUX**: [dev]/[klein] 9B não podem ser servidos comercialmente sem licença da BFL; um blog chama [dev] de "commercial safe" (OpenRAIL-M) — tratado como não confiável. Use [klein] 4B para qualquer coisa que rode no seu servidor ou no app.
- **Dataset sujo = LoRA ruim**: imagens não curadas ou de terceiros no dataset contaminam estilo e direitos.
- **Overfitting**: força 1,0 com dataset pequeno "cola" poses; reduza para 0,8–0,95 e varie poses no dataset.
- **Seeds não existem em todo provedor** (OpenAI não expõe); registre `n/a` e confie na camada de referência.
- **Qwen-Image 2.0 / Seedream 5**: só API; Qwen Apache 2.0 vale até a linha de dez/2025; "Qwen-Image-2.1" sob licença de pesquisa não comercial é fonte única, não verificada.
- **Números de "93%/95% de consistência"** em blogs de Nano Banana Pro não têm fonte; use a sua medição.

## Exportar para mobile

O LoRA nunca entra no bundle do app (é ferramenta de produção; e [dev] não pode ser servido). O que vai para o jogo são os PNGs verificados, empacotados por `/atlas-e-exportacao-2d-mobile` (@2x/@3x, ASTC, ≤ 2048²). Se o jogo gerar imagens em runtime (fase 7), só modelos com licença de deploy (Apache/MIT ou contrato) e com a divulgação exigida (`/divulgacao-de-uso-de-ia`). **Licença de saída**: registre por asset o modelo-base + LoRA e os termos do serviço de inferência.

## Fontes

- fal: treino de LoRA FLUX.2, 20–1.000 imagens, consistência do dataset — https://blog.fal.ai/training-flux-2-loras ; https://fal.ai/models/fal-ai/flux-2-trainer
- Replicate `ostris/flux-dev-lora-trainer`: 12–18 imagens, 1.000–3.000 passos, força 0,8–0,95 — https://replicate.com/ostris/flux-dev-lora-trainer/readme
- FluxGym local — https://learn.thinkdiffusion.com/make-your-character-style-lora-stand-out-easy-lora-training-with-fluxgym/ [secundário]
- Licenças FLUX.2 ([klein] 4B Apache 2.0; [dev]/9B não comercial; saídas) — https://vercel.com/ai-gateway/models/flux-2-klein-4b/faq ; https://canirun.ai/license/flux-non-commercial/ ; https://invideo.io/blog/flux-ai-image-generator/ ; https://venturebeat.com/ai/black-forest-labs-launches-flux-2-ai-image-models-to-challenge-nano-banana [secundário]
- Referências: Nano Banana Pro ~14 — https://www.cometapi.com/pt/tag/gemini-3-pro-image/ ; Retro Diffusion Pro 9 — https://app.cinevva.com/guides/ai-pixel-art-generators [secundário]
- Checklist inspirado em `consistency-check` do Claude-Code-Game-Studios (MIT) — https://github.com/Donchitos/Claude-Code-Game-Studios
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md` (KQ4, KQ6).
