# Decisões de estilo que facilitam (ou atrapalham) a produção com IA em Phaser mobile

A escolha de estilo é a decisão de maior alavancagem do projeto: define quais modelos servem, quanto custa cada
asset, quanto retoque humano é necessário e quanta memória o jogo gasta em um iPhone. Decida na fase 1 e grave na
seção 1 e 7 da art bible. Fontes: Cinevva (generalistas em pixel art), guias de produção 2026 (Inkration, Sorceress,
Gamine) e a doc do Phaser 4 (`pixelArt`, `smoothPixelArt`, NineSlice, filtros) — ver "Fontes" na SKILL.md.

| Estilo | Por que a IA acerta | Onde a IA erra | Ferramentas | Custo/asset e pós humana | Phaser/mobile |
|---|---|---|---|---|---|
| **Flat / vetorial geométrico** (sem contorno ou contorno uniforme, 5–7 cores chapadas, formas simples) | prompts curtos geram peças consistentes; Recraft V4 Vector emite SVG editável; recorte trivial; paleta fechada é fácil de verificar | cenários ficam vazios; personagens "de ícone" perdem charme em movimento; qualquer gradiente fotográfico denuncia IA | gpt-image-1.5 (alfa nativa), Recraft V4 Vector (SVG), FLUX.2 [klein] 4B local | US$ 0,03–0,13 por candidato; retoque: ajustar paleta e simplificar formas (minutos) | atlases pequenos; SVG rasterizado no load (`this.load.svg` com `scale`) ou PNG @2x; nine-slice limpo |
| **Pintado chapado com contorno** ("cartoon mobile": contorno 2–3 px, cel-shading 2 tons, luz única) | é o estilo em que gpt-image-1.5/Nano Banana Pro são mais estáveis; folha de referência segura o herói; aceita LoRA bem | deriva de proporção entre poses; contorno muda de espessura entre assets; sombra projetada "aparece" sem pedir | gpt-image-1.5, Nano Banana Pro (até 14 refs), FLUX.2 [klein] 4B + ReferenceLatent (local), LoRA via fal | US$ 0,05–0,25 por candidato; 4–6 candidatos por asset; retoque: contorno/olhos/mãos no Krita/Aseprite (15–60 min por herói) | sprites @2x 2–4× maiores que pixel art; ASTC só com texturas comprimidas (`this.load.texture`); padrão deste repositório |
| **Pintado realista / "AAA mobile"** (textura, luz dramática, muitos detalhes) | visual de capa impressiona em 1 imagem | é o estilo com mais "cara de IA" (brilhos, partículas soltas, anatomia); inconsistência entre assets é máxima; detalhe some em 1/4 | GPT Image 2 opaco + recorte; Midjourney + BiRefNet | caro em retoque (horas por asset); exige LoRA + paintover | texturas grandes; fundos @2x RGBA32 de 1,5–5 MB cada; evite para o primeiro jogo |
| **Pixel art em grade** (16/32/64 px, ≤ 32 cores, sem AA) | ferramentas pixel-native (PixelLab, Retro Diffusion) respeitam grade; validação 100% automática (paleta, alfa binário, dimensão) | generalistas produzem "pixel-styled" em tamanho errado com AA (requantizar nunca recupera a leitura); animação pede disciplina | PixelLab (esqueleto, rotações, MCP), Retro Diffusion (pay-per-asset), Aseprite + pixel-mcp | US$ 0,01–0,18 por candidato; retoque: redesenhar silhueta/contorno no Aseprite (10–30 min) | atlas minúsculo; `pixelArt: true`; zoom inteiro (`Scale.ZOOM.MAX_ZOOM`) ou `smoothPixelArt` para rotação; filtro `Blocky` para pós retrô |
| **Pré-renderizado de 3D** (modelo gerado → Blender → sprites) | consistência de personagem garantida por construção; rotações e ciclos "de graça" | custo de setup (rig, luz, render); estética "render" se não houver pós de shading | Tripo/Meshy Pro → Blender (ver `/sprites-pre-renderizados-de-3d` se existir no projeto) | horas de setup; depois centavos por frame | mesma exportação de sprites; frames muitos = memória; prefira 8 direções × poucas poses |

## Regras que valem para qualquer estilo

1. **Uma luz, uma escala, uma paleta.** O que mais denuncia "colagem de IA" é luz vinda de lados diferentes em
   assets vizinhos. Fixe a direção na bible e peça literalmente em todo prompt.
2. **Paleta em hex literal no prompt** segura mais que adjetivos; meça com `verificar_paleta.py`.
3. **Nada de texto na imagem** (o Phaser renderiza texto; localização, Dynamic Type não existe na web mas tamanho
   mínimo sim).
4. **Silhueta antes de detalhe**: teste a 1/4 e em cinza (`scripts/verificar_legibilidade.py`). Detalhe que some a
   1/4 é custo sem retorno em tela de 390 pt.
5. **Prefira peças isoladas**: um asset por imagem, fundo transparente ou branco liso. "Kits completos" saem
   desalinhados.
6. **Decida o que é IA e o que é mão**: olhos, mãos, rosto do herói, logo e ícone do app quase sempre recebem
   paintover humano. Isso é a intervenção que gera direito autoral e evita o "AI slop" visível.

## Teste de 30 minutos antes de fechar o estilo

Gere o mesmo herói e o mesmo cenário nas 2–3 direções candidatas (`references/prompts-de-moodboard.md`), monte a
folha de contato, rode `verificar_legibilidade.py --fundo <cor do cenário> --alvo-px <altura do herói em pt>` e
peça ao humano: "qual destas você aguenta olhar por 6 meses e consegue retocar?". A resposta decide.
