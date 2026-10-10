---
name: direcao-de-arte-e-style-card
description: >
  Cria a art bible curta do jogo (paleta hex, proporções, traço, iluminação, câmera, resolução-base
  390×844 @2x para Phaser, orçamento de textura, "o que nunca fazer"), o style card de 1 página que vira
  prefixo de todo prompt de imagem, a folha de referência (character sheet) de cada personagem
  recorrente, a decisão de estilo (flat / pintado com contorno / pixel art) que define ferramentas e
  custo, e o registro de aprovação humana com teste de legibilidade medido por script. Use antes de
  gerar qualquer sprite, UI, ícone, tile ou cenário, e sempre que o usuário falar em "visual", "estilo",
  "look", "paleta", "referências", "parece IA" ou pedir uma imagem sem existir design/art-bible.md
  aprovado. Não gera os assets em si: para isso use /gerar-sprites-2d, /pixel-art-pipeline,
  /ui-hud-e-icones ou /cenarios-e-tilesets depois.
license: MIT
compatibility: "Claude Code ou Codex; Python 3.10+ com Pillow para os scripts de paleta e legibilidade"
metadata:
  grupo: arte-2d
  alvo: [2d, web]
  fase: [1, 4]
argument-hint: "[nome-do-jogo] [estilo em 3 palavras]"
disable-model-invocation: false
user-invocable: true
---

# Direção de arte e style card

Entrega `design/art-bible.md`, `design/style-card.md`, `design/paleta.txt` e `./assets/referencias/chr_<nome>_sheet.png` aprovados por um humano; a evidência é a tabela "Histórico de aprovações" preenchida e o teste de consistência (3 assets gerados só com o prefixo, medidos por `verificar_legibilidade.py`) salvo em `production/evidencias/<data>-direcao-de-arte/`.

## Quando usar / quando não usar

- **Use** no início da fase 4 (ou na fase 1, em versão mínima de 30 minutos) antes de gastar créditos: estúdios que usam IA com qualidade de produto começam com o diretor de arte definindo 15–30 assets de referência e um guia escrito antes de qualquer geração em lote (guias de produção 2026, [secundário]); sem âncora, cada asset sai com visual diferente.
- **Use** quando o jogo ganhou bioma, personagem ou tela nova que a bible não cobre; a skill preenche só as seções incompletas.
- **Use** quando alguém disser "está com cara de IA": o diagnóstico (luz inconsistente, brilhos gratuitos, anatomia, texto ilegível, deriva de estilo) vira regra na seção 11 da bible.
- **Não use** para gerar assets (`/gerar-sprites-2d`, `/ui-hud-e-icones`), treinar LoRA (`/consistencia-com-lora`) ou escrever a sound bible (`/direcao-de-audio-e-sound-bible`).

## Pré-requisitos

- Templates `templates/art-bible.md` e `templates/style-card-ui.md` (adaptados do Claude-Code-Game-Studios, MIT; crédito em `THIRD_PARTY_NOTICES.md`).
- Para os moodboards: `OPENAI_API_KEY` (gpt-image-1.5, alfa nativa) ou chave Gemini (Nano Banana Pro, até 14 referências — doc do nó `GeminiImage2Node` do ComfyUI); alternativa sem custo por imagem: FLUX.2 [klein] 4B na estação GPU (`/estacao-gpu-remota`, receitas em `../gerar-sprites-2d/references/comfyui-receitas.md`).
- `python3 -m pip install Pillow` para `scripts/extrair_paleta.py` e `scripts/verificar_legibilidade.py`.
- Orçamento: 6–12 imagens de moodboard (gpt-image-1.5 `medium` ≈ US$ 0,034 cada; Nano Banana Pro ≈ US$ 0,13 [secundário]) + 1 folha por personagem (6–8 candidatos).

## Entradas

1. Brief (`design/game-brief.md`: gênero, público, tom, classificação etária) e `feature_list.json` (telas, biomas, personagens, itens).
2. ADR-0001: Phaser 4, retrato 390×844 lógico, assets @2x, DPR ≤ 2, texturas ≤ 2048², orçamento ≤ 64 MB de texturas por cena (`engine-web-phaser`).
3. 3–5 referências que o humano ama e 1 que odeia (jogos, filmes, movimentos artísticos). Nunca artistas vivos nem marcas em prompt.
4. Decisão de estilo: leia `references/decisoes-de-estilo-para-ia.md` (flat/vetor × pintado com contorno × pixel art × pré-render 3D: o que a IA acerta, custo por asset, pós humana, impacto em memória). O padrão deste repositório é "pintado chapado com contorno" (o mais estável nos modelos atuais); pixel art é a alternativa com validação 100 % automática.

## Passos

1. **Ler o que já governa.** Brief, `feature_list.json`, `CLAUDE.md`, `design/sound-bible.md` (paleta visual conversa com a sonora). Se `design/art-bible.md` existe, liste as seções com `[A definir]` e trabalhe só nelas.
2. **Perguntar só o que o humano decide** (uma rodada, ≤ 6 perguntas): estilo (tabela acima); vista de câmera; emoção central; referências amadas/odiadas; cor "do jogo" (a do ícone); o que nunca pode parecer ("nunca clone de X", "nunca brilho de IA").
3. **Gerar 3 direções como moodboard** com o mesmo herói e o mesmo cenário (`references/prompts-de-moodboard.md`), 2–4 imagens por direção, mesmo modelo nas três. Salve em `./assets/referencias/moodboard/<direcao>/`; monte a folha com `../gerar-sprites-2d/scripts/contact_sheet.py` e rode:
   ```bash
   python3 .claude/skills/direcao-de-arte-e-style-card/scripts/verificar_legibilidade.py assets/referencias/moodboard/<direcao>/heroi_*.png --fundo "#<cor do cenário>" --alvo-px 64 --folha production/evidencias/<data>-direcao-de-arte/legibilidade-<direcao>.png
   ```
   Apresente prós/contras para tela de 390 pt (legibilidade a 1/4, contraste, custo de retoque, memória). A pessoa escolhe; você recomenda.
4. **Extrair a paleta** do moodboard escolhido e deixar o humano nomear papéis:
   ```bash
   python3 .claude/skills/direcao-de-arte-e-style-card/scripts/extrair_paleta.py assets/referencias/moodboard/escolhido/*.png --cores 7 --saida design/paleta.txt --amostra design/paleta.png
   python3 .claude/skills/ui-hud-e-icones/scripts/verificar_contraste.py --texto "#<texto>,#<fundo painel>" --grafico "#<perigo>,#<fundo cena>" --grafico "#<herói>,#<fundo cena>"
   ```
   Ajuste à mão: texto ≥ 4,5:1, herói e perigo ≥ 3:1 sobre o cenário; perigo e recompensa distinguíveis por forma, não só por cor.
5. **Preencher a art bible** (`templates/art-bible.md` → `design/art-bible.md`, seções 1–14). Regras fixas: luz-chave com direção única; sombra nunca preto puro; silhueta legível a 1/4 (IoU ≥ 0,80 no script); escala só inteira em pixel art; assets @2x; nomes `snake_case` ASCII; atlas ≤ 2048² e ≤ 64 MB de textura por cena; lista negativa com "sem texto, sem marca d'água, sem fundo atrás de personagem, sem brilhos/partículas gratuitos, sem nomes de artistas/marcas/personagens de terceiros".
6. **Derivar o style card** (`templates/style-card-ui.md` → `design/style-card.md`): "Prefixo de prompt" ≤ 60 palavras com hex literais, contorno, luz, enquadramento, "peça única, isolada, fundo transparente"; negativo; tabela de tamanhos @2x; fonte bitmap do HUD. O prefixo é copiado literalmente no início de todo prompt pelas outras skills.
7. **Folha de referência por personagem recorrente** (`references/character-sheet.md`): prefixo + "character reference sheet: front, side and back views, neutral pose, same proportions, 3 expressions, color callout strip, white background". 6–8 candidatos, 2 rodadas. Nano Banana Pro e FLUX.2 [klein] edit aceitam a folha como referência depois; gpt-image-1.5 usa a descrição textual fixa. Registre com `../gerar-sprites-2d/scripts/nomear_e_registrar.py --categoria chr --destino assets/referencias --licenca <id>`. Olhos, mãos e rosto do herói recebem paintover humano (anote em `edicao_humana`).
8. **Teste de consistência (obrigatório).** Gere 3 assets de categorias diferentes (inimigo, prop, botão) só com prefixo + 1 frase; contact sheet + `verificar_legibilidade.py --fundo <cenário>` + `verificar_paleta.py --paleta design/paleta.txt`. Se o humano não disser "parece o mesmo jogo" ou os scripts reprovarem, volte ao passo 6 (mais hex literais, menos adjetivos). Salve `teste-consistencia.png` e a saída dos scripts.
9. **Aprovação humana.** Pergunte "Posso gravar `design/art-bible.md` e `design/style-card.md` como aprovados?". Só então preencha o cabeçalho (`APROVADO <data> por <nome>`) e a tabela 14. Moodboards descartados vão para `production/evidencias/<data>-direcao-de-arte/descartados/` com `decisoes.md`.

## Critério de pronto e evidência

- [ ] `design/art-bible.md` sem `[A definir]` nas seções 1–7, 11 e 13; cabeçalho `APROVADO` com data e nome; estilo decidido com a tabela de `references/decisoes-de-estilo-para-ia.md`.
- [ ] `design/style-card.md` com prefixo ≤ 60 palavras, negativo e tamanhos @2x; `design/paleta.txt` com 5–7 hex; contrastes anotados (saída de `verificar_contraste.py`).
- [ ] `./assets/referencias/chr_<nome>_sheet.png` por personagem recorrente, com seção em `PROVENANCE.md`.
- [ ] `production/evidencias/<data>-direcao-de-arte/` com moodboards, folhas de legibilidade, `teste-consistencia.png`, saída dos scripts e `decisoes.md`.
- [ ] `./assets/referencias/ORIGEM.md` com origem e licença de toda imagem de terceiros (nunca entra no build nem em prompt sem licença).

## Armadilhas conhecidas

- **Prompt longo e adjetivo não é âncora.** O que segura estilo é hex literal, regra de luz e enquadramento repetidos; o resto é referência de imagem ou LoRA (`/consistencia-com-lora`).
- **"Cara de IA" tem causas nomeáveis**: luz vinda de lados diferentes, brilhos/partículas gratuitos, gradiente fotográfico, mãos/olhos/anatomia, tipografia ilegível, deriva de estilo entre assets. Jogadores comparam assets lado a lado e o backlash pune até alguns poucos assets (Clair Obscur desclassificado no Indie Game Awards 2025; AION 2 com 66 % de avaliações; Capcom declarou não colocar assets de IA em jogos finais) [secundário]. A defesa é consistência + pós humana + divulgação honesta (`/divulgacao-de-uso-de-ia`).
- **Elo de arena não mede usabilidade de sprite.** Um modelo pixel-native ou a rota local pode servir melhor que o líder do ranking.
- **Genericidade é risco de loja e de mercado**: a direção precisa de uma decisão visual que o gênero saturado não tem.
- **Referência não é asset**: imagens de terceiros em `./assets/referencias/` nunca entram no build nem em prompts como referência sem checar licença.
- **Mudou a bible, muda tudo**: altere paleta/traço depois da fase 6 só com a versão da bible registrada em cada linha de `PROVENANCE.md`.
- **Texto em imagem**: proibido no prefixo. Texto é `BitmapText`/`Text` do Phaser (localização, tamanho mínimo 11 pt — HIG).
- **Acusação falsa de IA também acontece**: o `PROVENANCE.md` com edição humana descrita é a sua prova.

## Exportar para mobile (Phaser 4, web)

A bible fixa, na seção 7: resolução lógica 390×844 pt em retrato, assets **@2x** (1 pt = 2 px; herói 64 pt = 128 px; botão 44 pt = 88 px; fundo 780×1688 px, 1560 px de largura se fizer loop), DPR ≤ 2, grade de pixel art com zoom inteiro, peças de UI em múltiplos de 8 pt, texto mínimo 11 pt e botão ≥ 44×44 pt (HIG "Designing for games"). Na seção 13: PNG RGBA 8 bits master, WebP com alfa no build, atlases JSON hash ≤ 2048² por cena (`/atlas-e-exportacao-2d-mobile`), ≤ 64 MB de texturas residentes por cena, nomes ASCII `snake_case`, registro em `PROVENANCE.md`. **Licença de saída**: a bible obriga que cada asset registre os termos do provedor (OpenAI/Google/Recraft: "B — comercial por plano", termos não lidos nesta pesquisa → "[confirmar]"); FLUX.2 [klein] 4B e BiRefNet são Apache 2.0/MIT.

## Fontes

- Template e processo de art bible: Claude-Code-Game-Studios (MIT) — https://github.com/Donchitos/Claude-Code-Game-Studios
- HIG "Designing for games" (botão 44×44 pt padrão, 28×28 mínimo; texto 17 pt padrão, 11 pt mínimo) — https://developer.apple.com/design/human-interface-guidelines/designing-for-games (lido via JSON da HIG, 2026-10-10)
- Phaser 4: `pixelArt`/`smoothPixelArt`/`roundPixels` (Config.js), `ScaleManager#zoom`, NineSlice — https://github.com/phaserjs/phaser (fonte, 2026-10-10)
- Processo de estúdio (diretor define 15–30 referências e guia escrito antes de gerar; paintover como etapa padrão) — https://altheragames.com/en/blog/how-to-make-a-game-with-ai-2026 ; https://inkration.com/ai-art-tools-for-game-studios-in-2026-what-actually-works-for-production/ ; https://sorceress.games/blog/vet-generative-ai-for-game-development-studio-path-2026 [secundário]
- Backlash e sinais de "AI look": https://isitdev.com/ai-art-in-games-2025-policies-risks-studio-guide/ ; https://tech-insider.org/capcom-ai-backlash-resident-evil-re-engine-response-2026/ ; https://gaminghq.eu/2026/10/09/aion-2-ai-backlash-gaming-community ; https://www.plagiarismtoday.com/2026/04/07/game-developer-falsely-accused-of-using-ai/ [secundário]
- Legibilidade (silhueta, squint test, teste de cinza, 1× real) — https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly ; https://www.wayline.io/learn/pixel-art/4 ; https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art [secundário]
- Nano Banana Pro: 14 referências, seed best-effort — doc do nó `GeminiImage2Node` (Comfy-Org/docs, 2026-10-10)
- Preços: gpt-image-1.5 (página do modelo na OpenAI, via busca) ; Nano Banana — https://benchlm.ai/media-pricing/nano-banana [secundário]
- Survey sobre preferência por muitas saídas e 1–10 min por asset — https://arxiv.org/pdf/2503.02703
- App Store Review Guidelines (4.1(c), 4.3(b), 5.2.1) — https://developer.apple.com/app-store/review/guidelines/
- Nota de pesquisa: `research_notes/Criação de jogos totalmente por IA/arte_2d_sprites_ui.md`; manual: `playbook/09-praticas-de-arte-2d-com-ia.md`
