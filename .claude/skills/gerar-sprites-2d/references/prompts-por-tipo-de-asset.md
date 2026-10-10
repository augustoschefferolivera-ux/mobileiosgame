# Prompts-modelo por tipo de asset (Phaser mobile, retrato 390×844, assets @2x)

Todo prompt = **prefixo literal do style card** + bloco do tipo abaixo + **negativo do style card**. Troque só o
que está entre `<>`. Gere sempre em ≥ 2× o tamanho final (ex.: 1024² para um sprite de 128–256 px) e reduza com
Lanczos; nunca amplie. "@2x" aqui significa pixels = 2 × pontos CSS (DPR 2 fixado no ADR-0001).

| Tipo | Tamanho final @2x típico | Bloco de prompt (após o prefixo) | Observações |
|---|---|---|---|
| Herói (sprite-base) | 128–256 px de altura (64–128 pt) | `single character "<nome>": <1 frase do que o jogador reconhece>. Full body, standing neutral pose, feet on the same baseline, facing <right/camera>, centered, isolated on <transparent|plain white> background, no ground shadow, no scene, no text.` | anexe a folha de referência (Nano Banana Pro/FLUX.2 edit) ou cole a descrição fixa da folha |
| Inimigo | 96–192 px | `single enemy "<nome>": <função: lento e explode / rápido e frágil>, silhouette clearly different from the hero (<forma: pontudo/redondo/alto>), one accent color <#hex de perigo>, same lighting as the hero (<direção>). Full body, centered, isolated, transparent background, no text.` | o traço funcional (pavio, espinhos) tem de ler em 1/4 |
| Chefe | 256–512 px | igual ao inimigo + `imposing scale, 2–3x the hero height, readable in 3 parts (head, body, weak point), <cor de perigo> on the weak point.` | gere opaco 1024–1536 e recorte; sprite grande fica fora do atlas de sprites pequenos |
| Item / coletável | 48–96 px | `single game item icon "<nome>": <forma>, strong value contrast, one highlight, no background, no text, reads at 24 px.` | gpt-image-1.5 `background: "transparent"`; teste `--alvo-px 24` |
| Prop / decoração de cena | 64–256 px | `single environment prop "<nome>" for a 2D side-view game, same light direction (<direção>), bottom-anchored (sits on the ground line), isolated on transparent background, no shadow on ground.` | 2–3 variações para quebrar repetição |
| Projétil / VFX em 1 frame | 32–96 px | `single visual effect sprite "<nome>": <forma de energia>, additive-friendly (bright core, dark edges fading to transparent), centered, transparent background, no text.` | no Phaser use `blendMode: ADD` e partículas (`this.add.particles`) em vez de muitos frames |
| Peça de UI (botão, moldura, slot) | botão 160×96 px (80×48 pt), moldura 400×300 px | `single UI element "<peça>" for a mobile game HUD: <forma>, corner radius <r> px, stroke <s> px <#hex>, flat center area suitable for nine-slice stretching, no text, no icons inside, isolated, transparent background.` | cantos fixos + centro liso = nine-slice; 3 estados em 3 chamadas com a mesma seed quando houver |
| Ícone (SVG) | 48/64 px rasterizado (24/32 pt) | Recraft V4 Vector: `single flat icon of <conceito>, centered, <traço>, one accent color <#hex>, no text, no background, consistent stroke weight with the set.` | gere o conjunto na mesma sessão; `svgo`; rasterize @2x para o atlas |
| Ícone do app / PWA | 1024² master | `app icon: one bold central symbol "<símbolo>", <cor do jogo #hex> background, no text, no small details, readable at 60 px, flat lighting, square canvas edge to edge.` | sem cantos arredondados; `gerar_icones_pwa.py` deriva 192/512/180 |
| Tile-base | 64 px (32 pt) ou 128 px | `seamless tileable <chão/parede> texture tile, orthographic, flat even lighting, no shadows, no perspective, edges match exactly, square tile, no border, no text.` | `verificar_seamless.py`; luz plana porque o tile repete |
| Camada de fundo (parallax) | 1560×1688 px (2× a largura @2x) | `wide <céu|meio|frente> background layer for a 2D portrait game, horizontally seamless (left and right edges match exactly), <opaco | isolated on transparent background, bottom-anchored>, muted <ou> saturated colors, no characters, no text.` | céu opaco; meio/frente com alfa; ≤ 2048 px de largura |
| Screenshot de loja | captura real do jogo | não gere com IA; capture no Playwright/iPhone (App Store 2.3.3: screenshots mostram o app em uso) | molduras/legendas opcionais |

## Variações sem perder a identidade

- Mude **uma** frase por variação ("hurt pose, flinching", "level 2: armored", "holding a lantern"); prefixo e
  enquadramento ficam idênticos.
- Com seed exposto (ComfyUI, Gemini `seed` "best effort"), fixe seeds 1–8 e compare as mesmas seeds a cada rodada.
- Negativo mínimo para todo tipo: `no text, no letters, no watermark, no logo, no frame, no multiple subjects,
  no photographic gradients, no extra particles, no artist names, no brand or franchise references`.

## Prompt de edição local (FLUX.2 [klein] 4B, ComfyUI, com referência)

```
Same character as the reference image: identical design, colors (#...), proportions and outline thickness.
New pose: <ação>. <PREFIXO DO STYLE CARD>. Plain white background, no text, no shadow on ground.
```
Workflow pronto: `.claude/skills/consistencia-com-lora/assets/flux2_klein_4b_edit_referencia_api.json`.
