# Práticas de arte 2D com IA — manual do diretor de arte (Phaser 4, iPhone em retrato, PWA)

Este é o manual de ponta a ponta para produzir a arte 2D de um jogo web mobile **com qualidade de produto, não de
protótipo**, usando IA generativa operada por agentes. Ele consolida o que as oito skills de arte fazem
(`/direcao-de-arte-e-style-card`, `/gerar-sprites-2d`, `/pixel-art-pipeline`, `/animar-sprites`,
`/consistencia-com-lora`, `/ui-hud-e-icones`, `/cenarios-e-tilesets`, `/atlas-e-exportacao-2d-mobile`) e o que o
subagente `diretor-de-arte` cobra. Fatos com fonte lida em 2026-10-10 estão nas seções "Fontes" das skills; o que
veio de blogs/agregadores está marcado [secundário]; o que não foi lido, "[confirmar]". Pesquisa-base:
`research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md`.

## 1. A tese: direção primeiro, geração depois, pós humana sempre

O que separa arte de IA "com cara de IA" de arte com direção não é o modelo: é o processo. Os relatos de estúdios e
guias de produção de 2025–2026 convergem em um fluxo [secundário]:

```
style bible (texto + 15–30 referências) → moodboard (3 direções do MESMO herói) → character sheet →
geração em lote com seeds e referência → curadoria medida (scripts) → pós humana (paintover) →
integração (atlas @2x, verify.sh) → crítica independente → registro (PROVENANCE) → divulgação honesta
```

Três fatos sustentam isso. (1) Inconsistência de estilo é a reclamação nº 1 de quem usa IA em jogos; o que a corrige é
âncora (hex literais, folha de referência, LoRA), não prompt mais longo. (2) O público pune assets de IA visíveis mesmo
em pequena quantidade: *Clair Obscur: Expedition 33* foi desclassificado do Indie Game Awards 2025 por alguns assets de
IA deixados no lançamento; *AION 2* caiu para 66 % de avaliações; a Capcom declarou não colocar assets gerados em jogos
finais; ~30 % dos lançamentos na Steam em julho/2026 declaravam IA [secundário]. (3) Acusações falsas também acontecem —
o `PROVENANCE.md` com edição humana descrita é a defesa nos dois sentidos.

Regra do repositório: **um asset é "pronto" quando passou pelos scripts de verificação, por um humano e pelo
`scripts/verify.sh` dentro de um atlas** — não quando a imagem "ficou bonita".

## 2. Decisões de estilo que facilitam a IA (decida na fase 1)

| Estilo | IA acerta | IA erra | Custo/retoque | Phaser mobile |
|---|---|---|---|---|
| Flat/vetorial | peças consistentes; SVG (Recraft V4 Vector); recorte trivial | cenários vazios; "ícone" em movimento | baixo | atlases pequenos; SVG rasterizado ou PNG @2x |
| **Pintado chapado com contorno** (padrão) | mais estável em gpt-image-1.5/Nano Banana Pro; aceita folha e LoRA | deriva de proporção/contorno; sombra "aparece" | médio (contorno, olhos, mãos) | sprites @2x; ≤ 64 MB/cena |
| Pintado realista | impressiona em 1 imagem | máximo de "AI look" e inconsistência | alto (horas) | texturas grandes; evite no 1º jogo |
| Pixel art em grade | pixel-native respeita grade; validação 100 % automática | generalistas não servem (AA, tamanho) | baixo (Aseprite) | `pixelArt: true`, zoom inteiro |
| Pré-render de 3D | consistência por construção; rotações | setup; estética "render" | alto setup, baixo depois | sprites normais |

Tabela completa, prós/contras e teste de 30 minutos: `.claude/skills/direcao-de-arte-e-style-card/references/decisoes-de-estilo-para-ia.md`.
Regras que valem para todos: uma luz, uma escala, uma paleta; hex literais no prompt; nada de texto na imagem; silhueta
antes de detalhe (teste a 1/4 e em cinza); peças isoladas; e decidir **o que é IA e o que é mão** (rosto do herói, logo,
ícone do app quase sempre são mão).

## 3. Resolução e memória para Phaser 4 no iPhone (o orçamento que governa tudo)

- Lógica 390×844 pt em retrato, `Phaser.Scale.FIT`, canvas `390*dpr × 844*dpr` com `zoom: 1/dpr`, `dpr = min(devicePixelRatio, 2)` (ADR-0001 e `engine-web-phaser`). **Assets @2x: 1 pt = 2 px.** Herói 64 pt = 128 px; botão 44 pt = 88 px; tile 32 pt = 64 px; fundo 780×1688 (1560 de largura para loop). Sem sufixos @2x/@3x no Phaser.
- Gere sempre em ≥ 2× o tamanho final (1024² para sprites até 512 px) e reduza com Lanczos; nunca amplie.
- Texturas ≤ 2048² por página (multi-atlas acima disso); **≤ 64 MB de texturas residentes por cena** (RGBA8: 2048² = 16 MB; 3 camadas de fundo de 1560×1688 ≈ 19 MB); download de imagens ≤ ~8 MB (pré-cache do PWA < 50 MB).
- Peso em disco ≠ VRAM: WebP/oxipng reduzem download; só texturas comprimidas ASTC (`this.load.texture`, PVR/KTX, eixo Y de baixo no Phaser 4) reduzem memória de GPU — use só se a medição pedir.
- Pixel art: lógica em pixels de arte (ex.: 195×422 com zoom 2) e `pixelArt: true`; `smoothPixelArt` se girar.
- Texto: `BitmapText` @2x (17 pt → 34 px; mínimo 11 pt) no HUD; `Text` com `system-ui` para dinâmico; nunca texto pintado.
- Toque: botões ≥ 44×44 pt (HIG "Designing for games"); safe areas via `env(safe-area-inset-*)`.

## 4. Pipeline por tipo de asset

| Tipo | Skill | Rota principal → alternativa | Candidatos | Verificação automática | Pós humana típica | Para o Phaser |
|---|---|---|---|---|---|---|
| Herói / folha de referência | direção + gerar-sprites | Nano Banana Pro com refs → gpt-image-1.5 → FLUX.2 [klein] edit local | 6–8, 2 rodadas | legibilidade, paleta, baseline das 3 vistas | paintover de rosto/mãos (1–3 h) | atlas do personagem |
| Inimigo / NPC | gerar-sprites | gpt-image-1.5 `medium` → klein local | 4–6 | legibilidade ≥ 3:1 vs cenário, paleta ≤ 10 % fora | contorno/acessório (15–45 min) | atlas da cena |
| Item / prop / coletável | gerar-sprites | gpt-image-1.5 alfa nativa | 4 | legibilidade `--alvo-px 24` | 0–10 min | atlas da cena |
| VFX | gerar-sprites + código | 1–3 frames + `this.add.particles`, filtros `Glow/Blur` | 2–4 | alfa limpo | — | atlas `fx`, `blendMode ADD` |
| Animação | animar-sprites | ComfyUI "Sprite Sheet Generator"/API mínima (chroma #00FF00 → `chroma_para_alfa.py`) → PixelLab (pixel) → vídeo→frames | 2–3 sheets | baseline ≤ 2 px, loop 10×, chroma residual | escolher/retocar frames | `generateFrameNames`; Spine só com licença do editor; cutout com tweens sem licença |
| UI (moldura, botão, slot, barra) | ui-hud-e-icones | gpt-image-1.5 alfa, uma peça por imagem, 3 estados | 2–4 por peça | contraste 4,5:1/3:1, toque ≥ 44 pt | alinhar cantos (nine-slice) | atlas `ui` `--sem-trim` + `scale9Borders` → `nineslice` |
| Ícones | ui-hud-e-icones | Recraft V4 Vector (SVG) → PNG @2x | conjunto | legibilidade a 24 pt | `svgo`, cor única | atlas `ui` |
| Ícone do PWA/app | ui-hud-e-icones | gpt-image-1.5/GPT Image 2 opaco 1024² | 6–8 | busca reversa | paintover (é a imagem mais vista) | `gerar_icones_pwa.py` → 192/512/maskable/180 |
| Tileset | cenarios-e-tilesets (+ pixel-art) | gpt-image-1.5 → Retro Diffusion (pixel) → klein local | 3–4 por tile | `verificar_seamless.py` h+v ≤ 12 | retoque de emenda | `extrudir_tiles.py` → Tiled JSON → `tilemapTiledJSON` |
| Background/parallax | cenarios-e-tilesets | gpt-image-1.5 (meio/frente com alfa), céu opaco | 2–3 por camada | seamless h, VRAM somada | — | `TileSprite` por camada, `tilePositionX` |
| Screenshots de loja | ui-hud-e-icones | captura real (Playwright/iPhone), nunca IA | — | tamanhos: 1179×2556/1206×2622 obrigatório (App Store Connect), sem alfa | legendas opcionais | `production/loja/` |

## 5. Ferramentas e rotas (o que cada uma faz bem; licença de saída)

| Ferramenta | Serve para | Licença/custo (ler antes) |
|---|---|---|
| gpt-image-1.5 (OpenAI) | sprites, UI, itens com `background: "transparent"` | B; 1024²: low US$ 0,009 · medium 0,034 · high 0,133 [página do modelo via busca, confirmar] |
| Nano Banana Pro / 2 (Gemini 3 Pro Image / 3.1 Flash Image) | folhas de personagem, consistência por até 14 referências, sheets 2×2 | B; ≈ US$ 0,134 (1K/2K), 0,24 (4K); NB2 0,045–0,151 [BenchLM, secundário] |
| GPT Image 2 | arte-herói opaca | B; ≈ US$ 0,21 (fal) [secundário]; alfa em preview instável |
| FLUX.2 [klein] 4B (ComfyUI, estação GPU) | variações baratas, edição com referência (`ReferenceLatent`), privacidade | **Apache 2.0**; 8,4–9,2 GB de VRAM em RTX 5090 (doc ComfyUI) → apertado na 5060 de 8 GB (fp8/GGUF) |
| FLUX.2 [dev], [klein] 9B | LoRA hospedado (fal/Replicate) | FLUX Non-Commercial para servir; saídas usáveis segundo leitura secundária [confirmar] |
| BiRefNet / ToonOut | recorte determinístico (rembg `-m birefnet-general`; ComfyUI template) | **MIT**; cuidado: modelo padrão do rembg (`bria-rmbg`) exige acordo pago comercial |
| Recraft V4 Vector | ícones/UI em SVG editável | B; ≈ US$ 0,08 [OpenRouter, secundário] |
| Ideogram 3 | texto como arte (logotipo) e endpoint de fundo transparente | B; US$ 0,03–0,09 [via busca, confirmar] |
| PixelLab / Retro Diffusion / Aseprite + pixel-mcp | pixel art em grade, esqueleto, rotações, tilesets | B; termos comerciais não lidos [confirmar]; Aseprite EULA |
| ComfyUI templates oficiais | "Sprite Sheet Generator" (Nano Banana Pro), BiRefNet, FLUX.2 klein t2i/edit, reskin por estilo | ComfyUI GPL (ferramenta), nós parceiros cobram créditos |
| free-tex-packer-core / `empacotar_atlas.py` / oxipng / cwebp | atlas JSON hash/multi-atlas, PNG/WebP | MIT / MIT / BSD; pngquant GPL ou comercial (ferramenta) |
| Spine (`@esotericsoftware/spine-phaser-v4` 4.3.13) | animação esquelética | distribuir exige licença do editor Spine (Spine Runtimes License 2025); auto-rig não existe; `spine-animation-ai` PolyForm NC: fora |
| Tiled / Sprite Fusion | mapas e autotile | Tiled GPL (editor; mapas seus); Sprite Fusion grátis, export Phaser [confirmar] |
| Midjourney, Scenario, Layer.ai, Ludo.ai | exploração/plataformas de estúdio | B; sem API confirmada (MJ); case Layer/LBC "8×" é material do fornecedor [secundário] |

Nunca: Qwen-Image-2.1 (licença de pesquisa reportada), Hunyuan (territorial), FLUX [dev] servido em produto,
`spine-animation-ai`, modelos de vídeo encerrados (Sora 2) como dependência. Tudo em `templates/LICENCAS.md`.

## 6. ComfyUI na estação GPU (RTX 5060, 8 GB): o que roda e como

- Workflows em **formato API** (File → Export Workflow (API)); envio por `.claude/skills/gerar-sprites-2d/scripts/comfyui_lote.py` (upload da referência, prompt, seeds em lote, `--validar` contra `/object_info`, download, `lote.json`) ou pelo `comfyui_api.py` da `/estacao-gpu-remota`.
- Prontos: `flux2_klein_4b_t2i_api.json` (texto→imagem), `birefnet_recorte_api.json`, `flux2_klein_4b_edit_referencia_api.json` (consistência por referência), `sprite_sheet_nano_banana_pro_api.json` (2×2 em chroma). Receitas e VRAM: `gerar-sprites-2d/references/comfyui-receitas.md`.
- Regra prática do perfil Arch + GPU remota: recorte, variações e edição com referência na estação; folhas de personagem e arte-herói nas APIs; LoRA na fal (8 GB não treina FLUX.2).

## 7. Critérios de aprovação (o que o `diretor-de-arte` mede)

Automático: contraste com o cenário ≥ 3:1, silhueta a 1/4 com IoU ≥ 0,80, detalhe sobrevivente ≥ 0,35, valor interno ≥ 0,06
(`verificar_legibilidade.py`); paleta ≤ 10 % fora (pintado) / 0 % (pixel) (`verificar_paleta.py`); texto ≥ 4,5:1, gráfico ≥ 3:1,
toque ≥ 44 pt (`verificar_contraste.py`); baseline ≤ 2 px (`slice_spritesheet.py`); costura ≤ 12 (`verificar_seamless.py`);
alfa sem halo; dimensões @2x; fps ≥ 50 no `verify.sh`. Humano: luz da bible, proporção ±10 %, contorno igual, sem
"assinaturas de IA", sem semelhança com terceiros, lê junto dos vizinhos. Vereditos OK / RETOCAR / REGENERAR / BLOQUEADO
(bible ambígua). Checklist completo: `direcao-de-arte-e-style-card/references/checklist-do-diretor-de-arte.md`.

## 8. Custos e tempo (estimativas iniciais; substitua pelos seus números após 3 lotes)

| Item | Geração | Curadoria humana | Retoque humano |
|---|---|---|---|
| Item/prop (4 candidatos, gpt-image-1.5 medium) | ≈ US$ 0,15 | 1–2 min | 0–10 min |
| Inimigo (6 candidatos, 2 rodadas) | ≈ US$ 0,40 | 3–5 min | 15–45 min |
| Herói + folha (8 candidatos × 2 rodadas, Nano Banana Pro) | ≈ US$ 2–4 | 10–20 min | 1–3 h |
| Ciclo de animação (3 sheets 2K, Nano Banana Pro) | ≈ US$ 0,40–0,70 | 5–10 min | 20–60 min |
| Lote de 50 assets variados | US$ 8–30 | 2–4 h | 8–20 h |
| Mesmo lote na estação GPU (klein 4B + BiRefNet) | ≈ energia | igual | igual |
| LoRA de personagem (fal/Replicate) | por GPU-minuto [não capturado] | dataset 1–2 h | — |

Não há estudo público com taxa de aproveitamento; uma survey acadêmica (arXiv 2503.02703) registra preferência por
muitas saídas e 1–10 min aceitáveis por asset. Registre candidatos/aprovados/minutos por lote (`lote.json` +
evidências) e recalibre.

## 9. Erros comuns (e a correção)

1. Gerar antes da bible → inconsistência irrecuperável; corrija com `/direcao-de-arte-e-style-card` em 30 min.
2. Prompt adjetivo em vez de hex literal e regra de luz → deriva; reescreva o prefixo.
3. Aceitar o que "ficou bonito" a 1× → some a 1/4 no iPhone; rode `verificar_legibilidade.py` sempre.
4. Texto na imagem → localização quebrada e placeholder; texto é do Phaser.
5. Kit de UI em uma imagem → desalinhado; peças isoladas + mapa de nomes.
6. Recorte com `rembg` no modelo padrão → licença comercial paga; `-m birefnet-general`.
7. Sheet sem validar baseline → personagem "pula"; `slice_spritesheet.py --tolerancia-baseline 2`.
8. Trim em UI/tiles → nine-slice e grade quebram; `--sem-trim`; extrusão nos tiles.
9. Fundos @2x em excesso → VRAM estourada no Safari; largura 780/1560, ≤ 3 camadas, ≤ 64 MB/cena.
10. Depender de regenerar → modelos somem (Sora 2, Veo 3); masters, prompts e seeds no Git.
11. Spine sem orçar licença → bloqueio na publicação; cutout com tweens é grátis.
12. Divulgação vaga ou ausente → backlash; registre nível gerado/assistido/humano e divulgue (`/divulgacao-de-uso-de-ia`).

## 10. Ordem de trabalho recomendada (por milestone)

1. Fase 1–4: estilo, bible, style card, folha do herói, teste de consistência medido. Gate: 3 assets passam no `diretor-de-arte`.
2. Fase 5–6, por cena: lista de assets do `feature_list.json` → lote (gerar → curar → retocar → registrar) → atlas da cena → `verify.sh` → crítico.
3. Fase 6: animações do herói e inimigos principais; UI do HUD e menus; ícones do PWA.
4. Fase 8: medir VRAM/download, WebP, ASTC se preciso; screenshots reais de loja.
5. Fase 9–10: `PROVENANCE.md` completo, `LICENCAS.md` conferido, divulgação, submissão.

## Fontes

Primárias lidas em 2026-10-10: código e changelogs do Phaser 4.2.1 (https://github.com/phaserjs/phaser); docs e templates do
ComfyUI (https://github.com/Comfy-Org/docs, https://github.com/Comfy-Org/workflow_templates); HIG da Apple ("Designing for
games", "App icons", "Images", "Layout") e App Store Connect "Screenshot specifications" (developer.apple.com); Spine Runtimes
License e README (https://github.com/EsotericSoftware/spine-runtimes); rembg, BiRefNet, oxipng, pngquant, free-tex-packer-core,
Tiled, msdf-bmfont-xml (READMEs/licenças no GitHub); MDN (formatos de imagem; ícones de PWA). Secundárias (buscas, agregadores,
blogs de 2026): preços (OpenAI via busca, BenchLM, OpenRouter, fal), processo de estúdio (Inkration, Sorceress, Althera, Layer/LBC),
backlash (isitdev, Tech Insider, GamingHQ, Plagiarism Today), legibilidade (bugnet, Wayline, sprite-ai), VRAM do klein em 8 GB
(PromptZone), survey arXiv 2503.02703. Detalhes e URLs nas seções "Fontes" de cada skill.
