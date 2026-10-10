---
name: direcao-de-arte-e-style-card
description: >
  Cria a art bible curta do jogo (paleta hex, proporções, traço, iluminação, câmera,
  resolução-base, "o que nunca fazer"), o style card de 1 página que vira prefixo de todo
  prompt de imagem, a folha de referência (character sheet) de cada personagem recorrente e o
  registro de aprovação humana. Use antes de gerar qualquer sprite, UI, ícone, tile ou cenário,
  e sempre que o usuário falar em "visual", "estilo", "look", "paleta", "referências" ou pedir
  uma imagem sem existir design/art-bible.md aprovado. Não gera os assets em si: para isso use
  /gerar-sprites-2d, /pixel-art-pipeline, /ui-hud-e-icones ou /cenarios-e-tilesets depois.
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow para o script de paleta"
metadata:
  grupo: arte-2d
  alvo: [2d, app, web]
  fase: [1, 4]
argument-hint: "[nome-do-jogo] [estilo em 3 palavras]"
disable-model-invocation: false
user-invocable: true
---

# Direção de arte e style card

Entrega `design/art-bible.md`, `design/style-card.md` e `assets/referencias/chr_<nome>_sheet.png` aprovados por um humano; a evidência é a tabela "Histórico de aprovações" preenchida e o teste de consistência (3 assets gerados só com o prefixo) salvo em `production/evidencias/<data>-direcao-de-arte/`.

## Quando usar / quando não usar

- **Use** no início da fase 4 (ou já na fase 1, em versão mínima de 30 minutos) antes de gastar créditos em imagem: sem âncora de estilo, cada asset sai com um visual diferente — "style inconsistency" é a reclamação nº 1 de quem usa IA em jogos (fonte secundária, vendor).
- **Use** quando o jogo ganhou bioma, personagem ou tela nova e a bible não cobre; a skill preenche só as seções incompletas.
- **Não use** para gerar assets (`/gerar-sprites-2d`, `/ui-hud-e-icones`), treinar LoRA (`/consistencia-com-lora`) ou escrever a sound bible (`/direcao-de-audio-e-sound-bible`).

## Pré-requisitos

- Templates `templates/art-bible.md` e `templates/style-card-ui.md` deste repositório (adaptados do Claude-Code-Game-Studios, MIT; crédito em `THIRD_PARTY_NOTICES.md`).
- Para os moodboards: uma chave de imagem, de preferência `OPENAI_API_KEY` (gpt-image-1.5, alfa nativa) ou Gemini (Nano Banana Pro, até ~14 referências [secundário, confirmar]). Instalação em `/instalar-ferramentas`.
- `python3 -m pip install Pillow` para `scripts/extrair_paleta.py`.
- Orçamento: 6–12 imagens de moodboard (≈ US$ 0,10–0,25 cada em modelos de fronteira, preços de revendedores [secundário, confirmar]) + 1 folha por personagem.

## Entradas

1. Brief do jogo (gênero, público, plataforma iOS/web, tom emocional, classificação etária) e `feature_list.json` se existir (telas, biomas, personagens, itens).
2. Engine escolhido na fase 2 (SpriteKit, Unity, Godot, Phaser): define resolução-base e limites de atlas (seção 7 e 13 da bible).
3. 3–5 referências que o humano ama e 1 que odeia (jogos, filmes, movimentos artísticos). Nunca artistas vivos nem marcas: isso não entra em prompt (App Store 4.1(c)/5.2.1 e risco de semelhança).
4. Decisão pixel art × HD pintado × flat/vetor: muda ferramenta, grade e tudo que vem depois.

## Passos

1. **Ler o que já governa.** Brief, `feature_list.json`, `CLAUDE.md`, `design/sound-bible.md` (se houver — a paleta visual deve conversar com a sonora). Se `design/art-bible.md` já existe, liste as seções com `[A definir]` e trabalhe só nelas.
2. **Perguntar só o que o humano decide** (uma rodada, ≤ 6 perguntas): pixel art ou HD; vista de câmera; emoção central; referências amadas/odiadas; cor "do jogo" (a que aparece no ícone); o que nunca pode parecer (ex.: "nunca parecer clone de X").
3. **Gerar 3 direções como moodboard.** Para cada direção, um prompt de ≤ 60 palavras descrevendo o mesmo herói e o mesmo cenário (leia `references/prompts-de-moodboard.md`). Gere 2–4 imagens por direção com gpt-image-1.5 (`background: "transparent"` para o herói; fundo opaco para o cenário) ou Nano Banana Pro. Salve em `assets/referencias/moodboard/<direcao>/`. Monte uma folha com `../gerar-sprites-2d/scripts/contact_sheet.py` e apresente ao humano com prós/contras para tela pequena. A pessoa escolhe; você recomenda.
4. **Extrair a paleta do moodboard escolhido** e deixar o humano nomear papéis:
   ```bash
   python3 .claude/skills/direcao-de-arte-e-style-card/scripts/extrair_paleta.py assets/referencias/moodboard/escolhido/*.png --cores 7 --saida design/paleta.txt --amostra design/paleta.png
   ```
   Ajuste à mão (contraste texto/fundo ≥ 4,5:1; uma cor de perigo e uma de recompensa distinguíveis sem cor, por forma). `design/paleta.txt` é o que `/consistencia-com-lora` usa para medir desvio.
5. **Preencher a art bible.** Copie `templates/art-bible.md` para `design/art-bible.md` e complete as seções 1–13. Regras que não dependem de gosto: luz-chave com direção única; sombra nunca preta pura; silhueta legível em 64 px; escala só inteira; nomes `snake_case` ASCII; atlas ≤ 2048² em iOS; lista negativa (seção 11) sempre com "sem texto na imagem, sem marca d'água, sem fundo atrás de personagem, sem nomes de artistas/marcas/personagens de terceiros".
6. **Derivar o style card.** Copie `templates/style-card-ui.md` para `design/style-card.md`. Escreva o "Prefixo de prompt" (≤ 60 palavras, paleta hex literal, contorno, luz, enquadramento, "peça única, isolada, fundo transparente") e o negativo. Esse bloco é copiado literalmente no começo de todo prompt pelas outras skills.
7. **Folha de referência por personagem recorrente.** Prompt = prefixo + "character reference sheet: front, side and back views, neutral pose, same proportions, plus 3 facial expressions and a color callout strip, white background" (leia `references/character-sheet.md`). Nano Banana Pro aceita a folha depois como referência em cada novo prompt; gpt-image-1.5 funciona com descrição textual detalhada. Salve `assets/referencias/chr_<nome>_sheet.png`, registre em `PROVENANCE.md` (`../gerar-sprites-2d/scripts/nomear_e_registrar.py`).
8. **Teste de consistência (obrigatório).** Gere 3 assets de categorias diferentes (um inimigo, um prop, um botão) usando apenas prefixo + 1 frase. Monte contact sheet. Se o humano não disser "parece o mesmo jogo", volte ao passo 6 e aperte o prefixo (mais hex literais, menos adjetivos). Salve a folha em `production/evidencias/<data>-direcao-de-arte/teste-consistencia.png`.
9. **Aprovação humana.** Pergunte "Posso gravar `design/art-bible.md` e `design/style-card.md` como aprovados?". Só então preencha o cabeçalho (`APROVADO <data> por <nome>`) e a tabela 14. Guarde moodboards descartados em `production/evidencias/<data>-direcao-de-arte/descartados/` com `decisoes.md` (por que não).

## Critério de pronto e evidência

- [ ] `design/art-bible.md` sem `[A definir]` nas seções 1–7, 11 e 13; cabeçalho `APROVADO` com data e nome.
- [ ] `design/style-card.md` com prefixo de prompt ≤ 60 palavras e negativo; `design/paleta.txt` com 5–7 hex.
- [ ] `assets/referencias/chr_<nome>_sheet.png` para cada personagem recorrente, com linha em `PROVENANCE.md`.
- [ ] `production/evidencias/<data>-direcao-de-arte/` contém moodboards, `teste-consistencia.png` e `decisoes.md`.
- [ ] `assets/referencias/ORIGEM.md` lista origem e licença de toda imagem de terceiros (referência é para olhos humanos; não vai para o bundle).

## Armadilhas conhecidas

- **Prompt longo e adjetivo não é âncora.** O que segura estilo é hex literal, regra de luz e enquadramento repetidos; o resto é consistência por referência de imagem ou LoRA (`/consistencia-com-lora`).
- **Elo não mede usabilidade de sprite.** Rankings de arena medem gosto em prompts genéricos; um modelo pixel-native pode servir melhor que o líder da arena (nota de pesquisa, KQ1).
- **Genericidade é risco de loja.** App Store 4.3(b) pune apps "indistinguíveis"; a direção precisa de uma decisão visual que o gênero saturado não tem (relatório, checklist de riscos).
- **Referência não é asset.** Imagens de terceiros em `assets/referencias/` nunca entram no build nem como imagem de referência em API sem checar licença.
- **Mudou a bible, muda tudo.** Qualquer alteração em paleta/traço depois da fase 6 invalida assets prontos; registre a versão da bible em cada linha de `PROVENANCE.md` (coluna Notas).
- **Texto em imagem:** proíba no prefixo. Texto é renderizado pelo engine (localização, Dynamic Type).

## Exportar para mobile

A bible fixa, na seção 7: resolução lógica de referência em pontos do iPhone-alvo (confirme as dimensões dos dispositivos em developer.apple.com), fator de geração @3x com redução para @2x/@1x (nunca ampliar), tamanho-base por categoria (herói, inimigo, tile, botão em múltiplos de 8 pt), grade de pixel art (16/32/64) e escala inteira. Na seção 13: PNG RGBA 8 bits para raster, SVG para ícones, atlas ≤ 2048² com compressão ASTC em iOS (ver `/atlas-e-exportacao-2d-mobile`), nomes ASCII `snake_case`, registro obrigatório em `PROVENANCE.md`. **Licença de saída**: a bible é texto do projeto; ela obriga que cada asset registre os termos comerciais do provedor (OpenAI/Google/Midjourney não foram lidos nesta pesquisa — "[confirmar]").

## Fontes

- Template e processo de art bible: Claude-Code-Game-Studios (MIT) — https://github.com/Donchitos/Claude-Code-Game-Studios
- Padrão "style card + peças separadas + mapa de nomes" para HUD com IA — https://sorceress.games/blog/nest-an-ai-ui-generator-hud-panel-pack-2026 [secundário]
- "Style inconsistency is the #1 complaint" (vendor) — https://www.sprite-ai.art/blog/sprite-animation-frames [secundário]
- Nano Banana Pro: até ~14 referências, folha de referência reutilizada — https://www.cometapi.com/pt/tag/gemini-3-pro-image/ ; https://selfielabstudio.com/blog/nano-banana-pro-ultimate-character-sheets-tutorial-20260221 [secundário]
- gpt-image-1.5 com `background: "transparent"` — https://docs.apiyi.com/en/api-capabilities/gpt-image-1-5 [secundário]
- Arena Elo vs. usabilidade de sprite — https://artificialanalysis.ai/text-to-image/arena/leaderboard-text ; https://app.cinevva.com/guides/ai-pixel-art-generators [secundário]
- App Store Review Guidelines (4.1(c), 4.3(b), 5.2.1) — https://developer.apple.com/app-store/review/guidelines/
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md`
