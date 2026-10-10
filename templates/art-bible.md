# Art Bible: [Título de trabalho do jogo]

> **Status**: Rascunho | Em revisão | Aprovado
> **Dono (quem aprova)**: [nome humano]
> **Última atualização**: [AAAA-MM-DD] · **Versão da bible**: v1 (cada asset registra a versão em `PROVENANCE.md`)
> **Aprovação humana**: [Não revisado | APROVADO AAAA-MM-DD por <nome> | REVISADO AAAA-MM-DD]
> **Style card derivado**: `design/style-card.md` (prefixo de prompt; obrigatório antes de gerar qualquer imagem)
> **Referências aprovadas**: `assets/referencias/` (cada imagem com origem e licença em `assets/referencias/ORIGEM.md`)
> **Engine e alvo**: Phaser 4 web, retrato 390×844 pt, assets @2x, DPR ≤ 2 (ADR-0001)
>
> Adaptado do template `.claude/docs/templates/art-bible.md` do projeto Claude-Code-Game-Studios
> (Donchitos, licença MIT; crédito em `THIRD_PARTY_NOTICES.md`). Versão **curta** para um jogo mobile 2D
> feito com IA: cada seção cabe em poucas linhas e vira restrição de prompt ou regra de verificação. Uma
> seção com `[A definir]` está incompleta; `/direcao-de-arte-e-style-card` preenche só as incompletas.

## 1. Identidade visual em uma frase e decisão de estilo

[A definir] — uma regra que resolve qualquer ambiguidade ("quando em dúvida, escolha X"), mais 2–3 princípios
de apoio, cada um com um teste ("se A e B parecem iguais, prefira o que ...").

**Estilo escolhido** (tabela em `.claude/skills/direcao-de-arte-e-style-card/references/decisoes-de-estilo-para-ia.md`):
[flat/vetorial | pintado chapado com contorno | pintado realista | pixel art <grade> | pré-render 3D]. **Por quê** (custo por
asset, pós humana, memória): [A definir]. **Ferramentas principais**: [gpt-image-1.5 / Nano Banana Pro / FLUX.2 [klein] 4B local /
PixelLab / Recraft V4 Vector]. **O que sempre recebe paintover humano**: [rosto/olhos/mãos do herói, logo, ícone do app, ...].

## 2. Paleta (hex)

[A definir] — 5–7 cores com papel e significado. Nenhuma cor fora desta tabela entra em asset final sem registrar
aqui (`design/paleta.txt` é a cópia que `verificar_paleta.py` lê).

| Papel | Hex | Onde usar | Nunca usar em | Contraste medido (`verificar_contraste.py`) | Reserva para daltonismo (forma/ícone/som) |
|---|---|---|---|---|---|
| Base (fundo dominante) | `#RRGGBB` | cenário, painéis | personagens | — | — |
| Herói / destaque | `#RRGGBB` | protagonista, item-chave | inimigos, UI de perigo | ≥ 3:1 sobre Base | contorno distinto |
| Perigo | `#RRGGBB` | inimigos, dano, aviso | recompensa | ≥ 3:1 sobre Base | ícone + som |
| Recompensa | `#RRGGBB` | moedas, loot, acerto | perigo | ≥ 3:1 sobre Base | brilho/forma |
| Neutro claro | `#RRGGBB` | texto, realces | — | ≥ 4,5:1 sobre painel | — |
| Neutro escuro | `#RRGGBB` | contorno, sombra | — | — | — |
| Acento UI | `#RRGGBB` | botões primários | mundo do jogo | ≥ 3:1 sobre painel | — |

Temperatura por área/bioma: [A definir].

## 3. Proporções e silhueta

[A definir] — altura do herói em "cabeças" (3 = chibi; 6 = semirrealista), relação herói/inimigo/chefe (ex.: 1 : 0,8 : 2,5),
vocabulário de formas (herói = arredondado; inimigos = agudos; cenário = retangular), um traço distintivo por arquétipo.
**Critério:** silhueta sobrevive a 1/4 (IoU ≥ 0,80 em `verificar_legibilidade.py`) e ao teste de cinza.

## 4. Traço e acabamento

[A definir] — contorno (sim/não; espessura em px @2x; cor: preta, escura da própria cor, nenhuma), preenchimento
(chapado, cel-shading com N tons, pintura com textura), anti-aliasing (proibido em pixel art), textura de papel (sim/não).
Mesma espessura de contorno em todo o conjunto (é o 2º sinal mais comum de "colagem de IA").

## 5. Iluminação e sombra

[A definir] — direção da luz-chave (ex.: superior-esquerda 45°), cor da luz e da sombra (nunca preto puro: `#` da paleta),
sombra projetada (sim/não; forma; opacidade), rim light (sim/não). Vale para TODOS os sprites: luz inconsistente é o 1º sinal
de "colagem de IA" e não se retoca barato — regenerar.

## 6. Câmera e perspectiva

[A definir] — vista (lateral, top-down, 3/4 a 30°, isométrica 2:1), ângulo dos personagens em relação ao cenário, escala
pixel/metro (ex.: 64 px @2x = 1 m), direção padrão dos sprites (direita; o Phaser espelha com `flipX`).

## 7. Resolução-base, grade e orçamento de textura (Phaser 4)

- Resolução lógica: **390×844 pt** retrato (`Phaser.Scale.FIT`); canvas `390*dpr × 844*dpr`, `dpr = min(devicePixelRatio, 2)`.
- Assets **@2x**: 1 pt = 2 px. Herói [64] pt = [128] px; inimigo [48] pt = [96] px; item [24–32] pt = [48–64] px; tile [32] pt = [64] px;
  botão [44] pt = [88] px; fundo [780×1688] px ([1560] px de largura se fizer loop). Gere em ≥ 2× e reduza; nunca amplie.
- Pixel art: grade [16/32] px de arte, lógica em pixels de arte ([195×422]) com zoom inteiro, `pixelArt: true`; escala só inteira.
- Peças de UI em múltiplos de 8 pt; safe areas lidas de `env(safe-area-inset-*)` ([topo ~59] pt / [base ~34] pt — confirmar por aparelho).
- Orçamento: texturas ≤ 2048² por página; **≤ 64 MB de texturas residentes por cena** (RGBA8: 2048² = 16 MB); download de imagens
  ≤ [8] MB; fps ≥ 50 no `verify.sh`. Planilha: `design/orcamento-texturas.md`.

## 8. Personagens

[A definir] — arquétipo do herói, como diferenciar inimigo/NPC/aliado de relance, estilo de expressão e pose, nível de detalhe
que sobrevive a 1/4. Cada personagem recorrente tem folha de referência em `assets/referencias/chr_<nome>_sheet.png`
(frente/lado/costas, 3 expressões, faixa de cores) e camada de consistência decidida (`/consistencia-com-lora`).

## 9. Cenários e biomas

[A definir] — lista de biomas; para cada um: temperatura de cor, densidade de props, 3 elementos que contam história sem
texto, camadas de parallax (céu/meio/frente com fatores 0,1–0,2 / 0,4–0,6 / 0,8–1,0) e o que muda entre biomas mantendo
a identidade (seção 1). Tiles com luz plana (repetem); luz direcional só nos sprites.

## 10. UI/HUD

[A definir] — HUD diegético ou em tela; a UI ecoa o mundo ou é linguagem própria; fonte do HUD (bitmap @2x gerada de um `.ttf`
com licença embutível; tamanhos 17 pt padrão / 11 pt mínimo) e fonte de texto dinâmico (`system-ui`); estilo de ícones (flat,
contorno, ilustrado); nine-slice. Detalhe operacional em `design/style-card.md` (template `templates/style-card-ui.md`).

## 11. O que nunca fazer (lista negativa; entra em todo prompt)

[A definir] — ex.: "sem texto renderizado na imagem", "sem marca d'água", "sem fundo/cenário atrás de personagem", "sem sombra
projetada", "sem gradientes fotográficos", "sem brilhos/partículas/lens flare gratuitos", "sem anti-aliasing" (pixel art), "sem
múltiplos sujeitos", "sem nomes de artistas vivos, estúdios, marcas ou personagens de terceiros", "sem estilo de franquia X".
Sinais de "cara de IA" a vetar neste projeto: [A definir].

## 12. Referências (3–5)

[A definir] — para cada referência (jogo, filme, movimento artístico): o elemento específico a extrair e o que evitar para não
virar cópia. Referências são para olhos humanos: **não** entram como imagem de referência em prompt sem licença, nunca como asset.

## 13. Padrões de asset e exportação

[A definir] — PNG RGBA 8 bits master (SVG para ícones), WebP com alfa no build (não em pixel art), nomes `snake_case` ASCII
(`<categoria>_<nome>_<variante>_<frame>.png`; categorias `chr`, `enm`, `itm`, `prp`, `ui`, `icn`, `tile`, `bg`, `fx`), pastas
(`assets/brutos/` não curado, `assets/sprites/`, `assets/ui/`, `assets/tiles/`, `assets/backgrounds/`, `masters/`, `public/assets/atlas/`),
atlas JSON hash/multi-atlas ≤ 2048² por cena e tipo (UI separada; pixel art separada), fundos como texturas próprias, registro
obrigatório em `PROVENANCE.md` (modelo, seed, prompt, seleção, edição humana, licença).

## 14. Divulgação e proveniência

- Nível de intervenção humana esperado por categoria (gerado / assistido / humano) e o que isso implica na divulgação
  (`/divulgacao-de-uso-de-ia`): [A definir].
- Ferramentas na lista verde/amarela de `LICENCAS.md` para este projeto: [A definir].

## 15. Histórico de aprovações

| Data | Seções | Decisão | Quem | Evidência (`production/evidencias/...`) |
|---|---|---|---|---|
| AAAA-MM-DD | 1–7 | Aprovado | nome | `production/evidencias/AAAA-MM-DD-direcao-de-arte/moodboard-escolhido.png`, `legibilidade-*.png`, `teste-consistencia.png` |
