---
name: gerar-sprites-2d
description: >
  Gera sprites 2D (personagens, inimigos, itens, props, efeitos) com fundo transparente e estilo
  consistente a partir do style card, para um jogo Phaser 4 web mobile (assets @2x): gpt-image-1.5 com
  background transparente como rota principal, Nano Banana Pro com referências, FLUX.2 [klein] 4B em
  ComfyUI na estação GPU (sem custo por imagem) e GPT Image 2/Midjourney com recorte BiRefNet. Faz
  variações em lote com seeds, curadoria em folha de contato, verificação de legibilidade a 1/4,
  recorte determinístico, nome previsível, registro em PROVENANCE.md e exportação para atlas Phaser.
  Use sempre que o usuário pedir qualquer imagem 2D para o jogo, mesmo sem dizer "sprite". Não use para
  pixel art em grade (/pixel-art-pipeline), animação (/animar-sprites), UI/ícones (/ui-hud-e-icones)
  nem cenários/tiles (/cenarios-e-tilesets).
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow; rembg opcional; ComfyUI na estação GPU opcional"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [4, 6]
argument-hint: "[categoria] [nome-do-asset] [variante]"
disable-model-invocation: false
user-invocable: true
---

# Gerar sprites 2D

Entrega PNGs RGBA @2x nomeados (`./assets/sprites/<cat>_<nome>_<variante>.png`), uma folha de contato e a folha de legibilidade aprovadas por humano em `production/evidencias/<data>-sprites-<nome>/`, e uma seção por arquivo em `PROVENANCE.md`; o asset só é "pronto" quando aparece no screenshot do `bash scripts/verify.sh` (raiz do projeto) dentro de um atlas (`/atlas-e-exportacao-2d-mobile`).

## Quando usar / quando não usar

- **Use** para qualquer sprite estático pintado/HD/flat: herói em pose, inimigo, chefe, item, prop, projétil, efeito em um frame.
- **Use** quando o usuário diz "preciso de uma imagem de X", "desenha um inimigo", "gera o ícone do item" (ícone de UI → `/ui-hud-e-icones`).
- **Não use** sem `design/style-card.md` aprovado: rode `/direcao-de-arte-e-style-card` primeiro (versão mínima em 30 min).
- **Não use** para pixel art em grade (`/pixel-art-pipeline`), frames de animação (`/animar-sprites`), cenários (`/cenarios-e-tilesets`).

## Pré-requisitos

- `design/style-card.md`, `design/art-bible.md`, `design/paleta.txt` e, para personagens, `./assets/referencias/chr_<nome>_sheet.png`.
- Chaves: `OPENAI_API_KEY` (gpt-image-1.5; GPT Image 2) e/ou chave Gemini (Nano Banana Pro = `gemini-3-pro-image-preview`). Midjourney só via app/web.
- Rota local: estação GPU configurada (`/estacao-gpu-remota`, `scripts/gpu.sh status` mostra a RTX) com ComfyUI e os modelos de `references/comfyui-receitas.md` (FLUX.2 [klein] 4B fp8 + `qwen_3_4b` + `flux2-vae`; BiRefNet).
- Python: `python3 -m pip install Pillow openai google-genai`; recorte local `python3 -m pip install "rembg[cpu]"` (modelo baixado na 1ª execução; `scripts/remove_bg.py` exige `--permitir-download`). **Sempre `--modelo birefnet-general`**: o padrão atual do rembg (`bria-rmbg`) exige acordo pago para uso comercial (README do rembg).
- Orçamento por asset (tabela de preços em `references/prompts-e-modelos.md`): 4 candidatos em gpt-image-1.5 `medium` ≈ US$ 0,15; em Nano Banana Pro ≈ US$ 0,55; FLUX.2 [klein] local ≈ zero. Regra: 4 candidatos por item/prop, 4–6 por inimigo, 6–8 por herói (`../direcao-de-arte-e-style-card/references/checklist-do-diretor-de-arte.md`).
- **Licença de saída**: termos comerciais de OpenAI/Google/Midjourney para assets de jogo não foram lidos — classe B em `LICENCAS.md` com "[confirmar]"; FLUX.2 [klein] 4B Apache 2.0 e BiRefNet MIT (classe A).

## Entradas

1. Categoria (`chr`, `enm`, `itm`, `prp`, `fx`), nome, variante (ex.: `idle`, `dano`, `nivel2`) e tamanho-alvo em px @2x (seção 7 da bible: herói 128–256 px, inimigo 96–192, item 48–96).
2. Descrição funcional em 1–2 frases: o que o jogador reconhece de relance ("inimigo lento que explode: corpo redondo, pavio aceso").
3. Rota e número de candidatos:

| Situação | Rota | Por quê |
|---|---|---|
| Padrão (itens, props, inimigos, iteração rápida) | **gpt-image-1.5**, `background: "transparent"`, PNG | alfa nativa; preço baixo em `medium` |
| Personagem recorrente com folha de referência | **Nano Banana Pro** (`gemini-3-pro-image-preview`) com a folha + até 14 refs | consistência por referência; sem alfa → recorte |
| Lotes grandes, variações baratas, sem enviar dados a terceiros | **FLUX.2 [klein] 4B** em ComfyUI na estação (`assets/flux2_klein_4b_t2i_api.json`), ou edição com referência (`../consistencia-com-lora/assets/flux2_klein_4b_edit_referencia_api.json`) | Apache 2.0; 8 GB de VRAM apertado (fp8 ou GGUF); fundo branco + BiRefNet |
| Arte-herói/opaca de alta fidelidade | **GPT Image 2** (`gpt-image-2`) opaco + recorte | topo da arena; transparência em preview "instável" [secundário] |
| Exploração estética manual | **Midjourney V8.1** + recorte | sem API; registrar à mão |

## Passos

1. **Montar o prompt** = prefixo literal do style card + bloco do tipo (`references/prompts-por-tipo-de-asset.md`) + negativo. Salve em `prompts/sprites/<cat>_<nome>_<variante>.txt` (um arquivo por asset). Código por modelo em `references/prompts-e-modelos.md`.
2. **Gerar candidatos** em `./assets/brutos/<data>/<cat>_<nome>_<variante>/`, sempre em ≥ 2× o tamanho final (1024² para sprites de até 512 px). API: guarde `resposta.json` (modelo, snapshot, `n`, `size`, `quality`). Estação GPU:
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/comfyui_lote.py --workflow .claude/skills/gerar-sprites-2d/assets/flux2_klein_4b_t2i_api.json --server http://gamer-pc:8188 --out assets/brutos/<data>/<asset> --prompt-arquivo prompts/sprites/<asset>.txt --seeds 1,2,3,4 --validar --prefix <asset>_
   ```
   `--validar` confere os nós contra `/object_info` antes de enviar; `lote.json` guarda seed → arquivo.
3. **Recortar** quando a rota não dá alfa (Nano Banana Pro, GPT Image 2 opaco, Midjourney, FLUX.2):
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/remove_bg.py assets/brutos/<data>/<asset> --saida assets/brutos/<data>/<asset>/recortes --aparar --margem 4 --modelo birefnet-general --relatorio assets/brutos/<data>/<asset>/recortes/relatorio.json
   ```
   Na estação: `comfyui_lote.py --workflow assets/birefnet_recorte_api.json --upload <png> --out .../recortes --n 1` (BiRefNet, MIT). Arte estilizada: `--modelo isnet-anime` ou Replicate `sprited/birefnet-toonout` [licença do fine-tune: confirmar].
4. **Reduzir para o alvo @2x** com Lanczos (Pillow) — nunca ampliar; se faltar resolução, regenere em 2K/4K (Nano Banana Pro) ou use upscaler aberto registrado na coluna Pós.
5. **Curadoria medida**: folha de contato sobre xadrez (halos) e sobre a cor do cenário, mais a folha de legibilidade:
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py assets/brutos/<data>/<asset>/recortes --colunas 4 --celula 256 --saida production/evidencias/<data>-sprites-<nome>/contact-sheet.png
   python3 .claude/skills/gerar-sprites-2d/scripts/contact_sheet.py assets/brutos/<data>/<asset>/recortes --fundo "#<cor do cenário>" --saida production/evidencias/<data>-sprites-<nome>/contact-sheet-cenario.png
   python3 .claude/skills/direcao-de-arte-e-style-card/scripts/verificar_legibilidade.py assets/brutos/<data>/<asset>/recortes --fundo "#<cor do cenário>" --alvo-px <altura em pt no jogo> --folha production/evidencias/<data>-sprites-<nome>/legibilidade.png --json production/evidencias/<data>-sprites-<nome>/legibilidade.json
   python3 .claude/skills/consistencia-com-lora/scripts/verificar_paleta.py assets/brutos/<data>/<asset>/recortes/*.png --paleta design/paleta.txt --tolerancia 28 --max-fora 10
   ```
   Apresente as folhas; o humano escolhe 1 ou pede nova rodada com o prompt ajustado (mude uma frase, mantenha seeds). Anote escolha e motivo. Critérios de aceite: contraste com o cenário ≥ 3:1, silhueta a 1/4 IoU ≥ 0,80, ≤ 10 % fora da paleta, alfa sem halo, luz do lado da bible, nada que lembre marca/personagem de terceiros.
6. **Retoque humano** (olhos, mãos, contorno, acessório trocado) no Aseprite/Krita; master em `masters/sprites/<nome>.<ext>`; descreva em `edicao_humana` (é o que gera direito autoral e evita o "AI look").
7. **Nomear e registrar**:
   ```bash
   python3 .claude/skills/gerar-sprites-2d/scripts/nomear_e_registrar.py <escolhido>.png --categoria enm --nome bomba --variante idle --ferramenta "gpt-image-1.5 (API OpenAI)" --versao "gpt-image-1.5, chamada em <data>" --seed n/a --prompt-arquivo prompts/sprites/enm_bomba_idle.txt --referencia "style card v1" --selecao "1 de 4 candidatos" --edicao-humana "curadoria e aparo; contorno retocado (<nome>, <data>)" --master masters/sprites/enm_bomba_idle.aseprite --licenca gpt-image-1-5 --pos "alfa nativo; Lanczos 192 px" --aprovado-por "<nome>"
   ```
   Para a rota local: `--ferramenta "FLUX.2 [klein] 4B fp8 (ComfyUI, estação GPU)" --seed <seed do lote.json> --licenca flux2-klein-4b --pos "BiRefNet (ComfyUI)"`. Audite com `python3 .claude/skills/licencas-e-proveniencia/scripts/check_provenance.py`.
8. **Ver no jogo**: inclua o PNG no atlas da cena (`/atlas-e-exportacao-2d-mobile`), rode `bash scripts/verify.sh --feature <id>` e copie `screenshot.png` para `production/evidencias/<data>-sprites-<nome>/no-jogo.png`. Sem isso, o asset não está pronto.

## Critério de pronto e evidência

- [ ] PNG RGBA em `./assets/sprites/` com nome `snake_case` ASCII, tamanho @2x da bible (múltiplo de 2), alfa limpo (sem halo no xadrez nem sobre preto).
- [ ] `production/evidencias/<data>-sprites-<nome>/` com `contact-sheet*.png`, `legibilidade.png/.json` (todas as métricas OK ou motivo anotado), decisão humana e `no-jogo.png`.
- [ ] Seção em `PROVENANCE.md` com ferramenta, versão/snapshot, seed (ou `n/a`), prompt (arquivo), seleção, pós-processo, edição humana, master, aprovador e `licenca: LICENCAS.md#<id>`.
- [ ] `./assets/brutos/<data>/<asset>/` preservado com `lote.json`/`resposta.json`: é a prova da curadoria e a origem dos números de aproveitamento.

## Armadilhas conhecidas

- **Alfa "transparente" com xadrez pintado**: alguns modelos desenham o xadrez; confira o canal A (bbox no relatório do `remove_bg.py`) antes de aceitar.
- **GPT Image 2 e transparência**: preview "may be unstable" [secundário]; gere opaco e recorte.
- **rembg com modelo padrão** (`bria-rmbg`): licença comercial paga; use `birefnet-general`/`isnet-anime` (MIT) ou o ComfyUI da estação.
- **FLUX.2 [klein] 4B em 8 GB**: a doc do ComfyUI mede 8,4 GB (distilled) e 9,2 GB (base) em RTX 5090; na 5060 use fp8 com offload ou GGUF Q4 [secundário] e meça com `gpu.sh status`; se travar, API.
- **Halo escuro ao compor**: PNG já pré-multiplicado por outra ferramenta ou recorte sujo; o Phaser espera alfa reto (`premultipliedAlpha: true` na config faz a conversão). Corrija na origem.
- **Marcas e personagens de terceiros**: nunca cite franquias no prompt; busca reversa nos heróis antes de publicar (risco de marca vale também na web).
- **Dependência de regeneração**: modelos somem (Sora 2, Veo 3 em 2026); guarde PNGs finais, prompts e seeds no Git.
- **Custo**: 50 assets × 6 candidatos em modelo de fronteira passam de US$ 40; rascunhe na estação GPU ou em `low`, finalize em `medium/high`.

## Exportar para Phaser (web mobile)

PNG RGBA 8 bits @2x (1 pt = 2 px; DPR ≤ 2 fixado no ADR-0001) → atlas JSON hash por cena com `python3 .claude/skills/atlas-e-exportacao-2d-mobile/scripts/empacotar_atlas.py assets/sprites --nome cena_<x> --saida public/assets/atlas --padding 2 --extrude 1` (multi-atlas automático acima de 2048²) → `this.load.atlas('cena_x', 'assets/atlas/cena_x.png', 'assets/atlas/cena_x.json')` → `this.add.sprite(x, y, 'cena_x', 'enm_bomba_idle')`. Sprites grandes (chefe > 512 px) ficam fora do atlas de sprites pequenos. `otimizar_imagens.py --webp` reduz o download (não a VRAM: 2048² RGBA8 = 16 MB; ≤ 64 MB por cena). Sem sufixos @2x/@3x no Phaser: a escala é a do canvas (`zoom: 1/dpr`). **Licença de saída**: coluna obrigatória em `PROVENANCE.md`; "[confirmar]" até ler os termos do provedor.

## Fontes

- ComfyUI: formato API, rotas (`/prompt`, `/history`, `/view`, `/upload/image`, `/object_info`), guia FLUX.2 Klein 4B (arquivos, VRAM), nó `GeminiImage2Node` (14 refs), template BiRefNet — https://github.com/Comfy-Org/docs ; https://github.com/Comfy-Org/workflow_templates (lidos em 2026-10-10)
- rembg (modelo padrão `bria-rmbg` com licença paga para uso comercial; `birefnet-general`) — https://github.com/danielgatis/rembg ; BiRefNet MIT — https://github.com/ZhengPeng7/BiRefNet
- gpt-image-1.5: `background: "transparent"`, preços por qualidade — página do modelo na OpenAI (via busca, [confirmar]) ; https://docs.apiyi.com/en/api-capabilities/gpt-image-1-5 [secundário]
- GPT Image 2 transparência em preview; preço fal — https://fal.ai/learn/tools/gpt-image-2-vs-gpt-image-1-5 ; https://ecorpit.com/gpt-image-2-transparent-background-preview-no-token-table-2026/ [secundário]
- Nano Banana Pro/2 preços — https://benchlm.ai/media-pricing/nano-banana [secundário]
- FLUX.2 [klein] 4B em 8 GB (GGUF Q4, ComfyUI-GGUF) — https://www.promptzone.com/tara_suzuki/how-to-run-flux-on-8gb-vram-in-2026-the-gguf-low-vram-guide-46k8 [secundário] ; licença Apache 2.0 — https://vercel.com/ai-gateway/models/flux-2-klein-4b/faq [secundário]
- Phaser 4: `this.load.atlas`, JSONHash (`trimmed`, `pivot`, `scale9Borders`), `premultipliedAlpha` — https://github.com/phaserjs/phaser (fonte, 2026-10-10)
- Peças separadas + mapa de nomes — https://sorceress.games/blog/nest-an-ai-ui-generator-hud-panel-pack-2026 [secundário]
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md`; manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
