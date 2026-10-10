# Ferramentas pixel-native: o que cada uma faz, limites e custos reportados

Tudo abaixo vem de agregadores, READMEs e docs secundárias (as páginas oficiais estavam inacessíveis em 2026-10-10). Antes de pagar, confirme em pixellab.ai, retrodiffusion.ai, aseprite.org, spritefusion.com.

## PixelLab

- Gera em canvas 16×16, 32×32, 64×64, 128×128 (docs de esqueleto).
- Esqueleto: estimar → ajustar template → inserir; esqueletos podem ser salvos como imagem/arquivo Aseprite e reaproveitados em outros personagens. Funciona dentro do Aseprite.
- Rotações em 4 e 8 direções com suporte isométrico ("one-click").
- MCP: `pixellab-mcp` 1.1.0 no npm, ferramentas de rotação e estimativa de esqueleto. Existe um wrapper de skill ("pixellab-pip") de terceiros. Instale conforme o README do pacote; a configuração do servidor fica no `.mcp.json` do projeto (não desta skill).
- Planos reportados: trial grátis (40 gerações rápidas, sem cartão), Pixel Apprentice US$ 12/mês (até 2.000 gerações), Pixel Artisan US$ 24/mês (fila prioritária, até 400×400), Pixel Architect US$ 50/mês (10.000 gerações, 20 jobs simultâneos); anual ≈ 25% mais barato. Um agregador lista US$ 10 para o Apprentice — divergência.
- Termos comerciais das saídas: não lidos. Guia de terceiros recomenda checar antes de publicar.

## Retro Diffusion (Astropulse)

- Hospedado, pré-pago, sem assinatura, créditos não expiram; 50 créditos grátis no cadastro.
- Preços reportados: a partir de ~US$ 0,01/imagem; RD Fast ≈ US$ 0,015; RD Pro US$ 0,18; animações US$ 0,07–0,25; tilesets US$ 0,10; `estimate_inference_cost` gratuito.
- RD Pro aceita até 9 imagens de referência.
- MCP disponível (listagem em mcpservers.org).
- Extensão para Aseprite com compra única; modelo baixável de US$ 50 é "versão modificada do componente de pixel art da extensão", **não** os modelos do site.
- Termos comerciais das saídas hospedadas: não encontrados.

## Aseprite + MCP

- `pixel-mcp` (Go, willibrandon): flip/rotate/scale/crop/resize, duração de frames, tags, cels ligados.
- `pixel-plugin`: plug-in para Claude Code que traduz linguagem natural em operações do Aseprite via `pixel-mcp`.
- Extensão comunitária "skeleton2animation" é demo, sem animação suave.

## Sprite Fusion

- Editor de tilemap gratuito no navegador; autotiling, camadas, pincel/preenchimento; exporta Unity, Godot, GB Studio, PNG, JSON; desktop US$ 12 (compra única).
- Autor anunciou (ago/2026) modelo próprio de pixel art (WIP) para sprites 16/32/64 e animações curtas idle/run/attack.

## Rota aberta/self-hosted

- Stable Diffusion + LoRA "pixel-art-xl" (SDXL) é a rota open-source citada; exige requantização igual. SD 3.5: Stability AI Community License (grátis comercial < US$ 1M/ano).

## Pixel perfeito no Phaser 4 (fonte: `Config.js`, `ScaleManager.js`, changelog 4.0)

- `render: { pixelArt: true }` → `antialias = false`, `antialiasGL = false`, `roundPixels = true` (texturas com filtro nearest).
- `render: { smoothPixelArt: true }` → mantém texels nítidos ao escalar/girar com antialiasing nas bordas entre pixels; use só se os sprites giram ou escalam.
- Zoom inteiro: `scale: { mode: Phaser.Scale.NONE, zoom: Phaser.Scale.ZOOM.MAX_ZOOM, autoCenter: CENTER_BOTH, width: <largura em pixels de arte>, height: <altura> }` (`getMaxZoom` escolhe o maior inteiro que cabe no pai); ou `zoom: 2` fixo com lógica 195×422 para a tela 390×844.
- Filtro `Blocky` (novo no 4.0): pixeliza preservando a paleta — pós retrô de cena HD, não conversão de assets.
- `TilemapGPULayer` em modo NEAREST preserva bordas nítidas e elimina sangramento entre tiles (changelog 4.0).

## Regras de grade (independentes de ferramenta)

1. Um pixel do asset = um pixel da grade; nada de "pixel gordo" desigual.
2. Paleta fechada (≤ 32; ideal 16) e sem AA nas bordas (alfa 0/255).
3. Contorno de 1 px na cor escura da paleta (ou sem contorno — decisão da bible, não por asset).
4. Dithering só se a bible permitir (e então o mesmo padrão em tudo).
5. Exportação em escala inteira; filtro nearest no engine; atlas com padding/extrusão.
