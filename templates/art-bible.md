# Art Bible: [Título de trabalho do jogo]

> **Status**: Rascunho | Em revisão | Aprovado
> **Dono (quem aprova)**: [nome humano]
> **Última atualização**: [AAAA-MM-DD]
> **Aprovação humana**: [Não revisado | APROVADO AAAA-MM-DD por <nome> | REVISADO AAAA-MM-DD]
> **Style card derivado**: `design/style-card.md` (prefixo de prompt; obrigatório antes de gerar qualquer imagem)
> **Referências aprovadas**: `assets/referencias/` (cada imagem com origem e licença em `assets/referencias/ORIGEM.md`)
>
> Adaptado do template `.claude/docs/templates/art-bible.md` do projeto Claude-Code-Game-Studios
> (Donchitos, licença MIT; crédito em `THIRD_PARTY_NOTICES.md`). Esta é a versão **curta** para um
> jogo mobile 2D feito com IA: cada seção cabe em poucas linhas e vira restrição de prompt ou regra
> de verificação. Uma seção ainda com `[A definir]` está incompleta; a skill
> `/direcao-de-arte-e-style-card` preenche só as seções incompletas em execuções posteriores.

## 1. Identidade visual em uma frase

[A definir] — uma regra que resolve qualquer ambiguidade visual ("quando em dúvida, escolha X"),
mais 2–3 princípios de apoio, cada um com um teste ("se A e B parecem iguais, prefira o que ...").

## 2. Paleta (hex)

[A definir] — 5–7 cores com papel e significado. Nenhuma cor fora desta tabela entra em asset final
sem registrar aqui. A skill `/consistencia-com-lora` usa esta tabela para medir desvio de paleta.

| Papel | Hex | Onde usar | Nunca usar em | Reserva para daltonismo (forma/ícone/som) |
|---|---|---|---|---|
| Base (fundo dominante) | `#RRGGBB` | cenário, painéis | personagens | — |
| Herói / destaque | `#RRGGBB` | protagonista, item-chave | inimigos, UI de perigo | contorno distinto |
| Perigo | `#RRGGBB` | inimigos, dano, aviso | recompensa | ícone + som |
| Recompensa | `#RRGGBB` | moedas, loot, acerto | perigo | brilho/forma |
| Neutro claro | `#RRGGBB` | texto, realces | — | — |
| Neutro escuro | `#RRGGBB` | contorno, sombra | — | — |
| Acento UI | `#RRGGBB` | botões primários | mundo do jogo | — |

Contraste mínimo texto/fundo: 4,5:1 (WCAG AA). Temperatura por área/bioma: [A definir].

## 3. Proporções e silhueta

[A definir] — altura do herói em "cabeças" (ex.: 3 cabeças, chibi; 6, semirrealista), relação
herói/inimigo/chefe, vocabulário de formas (herói = formas arredondadas; inimigos = agudas; cenário =
retangular), silhueta legível em miniatura de 64 px. Um traço distintivo por arquétipo.

## 4. Traço e acabamento

[A definir] — contorno (sim/não; espessura em px na resolução-base; cor do contorno: preta, escura
da própria cor, nenhuma), preenchimento (chapado, cel-shading com N tons, pintura com textura),
anti-aliasing (proibido em pixel art; permitido em HD), granulação/textura de papel (sim/não).

## 5. Iluminação e sombra

[A definir] — direção da luz-chave (ex.: superior-esquerda 45°), cor da luz e da sombra (sombra
nunca é preto puro: use `#` da paleta), sombra projetada no chão (sim/não; forma; opacidade),
iluminação de borda (rim light) sim/não. Vale para TODOS os sprites: luz inconsistente é o primeiro
sinal de "colagem de IA".

## 6. Câmera e perspectiva

[A definir] — vista (lateral, top-down, 3/4 a 30°, isométrica 2:1), ângulo dos personagens em
relação ao cenário, ponto de fuga (nenhum em 2D puro), escala pixel/metro (ex.: 32 px = 1 m).

## 7. Resolução-base e grade

[A definir] — resolução lógica de referência em pontos (iPhone), fator de geração (@2x/@3x),
tamanho-base dos sprites (ex.: herói 128×128 px @1x; tiles 32 px), grade de pixel art (16/32/64),
fator inteiro de escala permitido (1×, 2×, 3× — nunca 1,5×). Peças de UI em múltiplos de 8 pt.

## 8. Personagens

[A definir] — arquétipo do herói, como diferenciar inimigo/NPC/aliado de relance, estilo de
expressão e pose (rígido, expressivo, exagerado), nível de detalhe que sobrevive à distância da
câmera. Cada personagem recorrente tem folha de referência em `assets/referencias/chr_<nome>_sheet.png`.

## 9. Cenários e biomas

[A definir] — lista de biomas; para cada um: temperatura de cor, densidade de props (esparsa/densa),
3 elementos que contam história sem texto, camadas de parallax (céu/meio/frente) e o que muda entre
biomas mantendo a identidade (seção 1).

## 10. UI/HUD

[A definir] — HUD diegético ou em tela; a UI ecoa o mundo ou é linguagem própria; tipografia
(fonte, pesos, tamanho mínimo em pt), estilo de ícones (flat, contorno, ilustrado), sensação de
animação de UI. O detalhe operacional fica em `design/style-card.md` (template `templates/style-card-ui.md`).

## 11. O que nunca fazer

[A definir] — lista negativa que entra em todo prompt. Exemplos: "sem texto renderizado na imagem",
"sem marca d'água", "sem fundo/cenário atrás de personagem", "sem sombra projetada", "sem gradientes
fotográficos", "sem anti-aliasing", "sem nomes de artistas vivos, estúdios, marcas ou personagens de
terceiros" (risco App Store 4.1(c)/5.2.1), "sem estilo de franquia X".

## 12. Referências (3–5)

[A definir] — para cada referência (jogo, filme, movimento artístico): o elemento específico a
extrair (uma técnica, uma escolha de cor, uma regra de composição) e o que evitar para não virar
cópia. Referências são para olhos humanos: **não** as use como imagem de referência em prompts sem
checar licença, e nunca como asset.

## 13. Padrões de asset

[A definir] — formato (PNG RGBA 8 bits; SVG para ícones vetoriais), nomes (`snake_case` ASCII:
`<categoria>_<nome>_<variante>_<frame>.png`; categorias `chr`, `enm`, `itm`, `prp`, `ui`, `icn`,
`tile`, `bg`, `fx`), pastas (`assets/brutos/` para saídas não curadas, `assets/sprites/`, `assets/ui/`,
`assets/tiles/`, `assets/backgrounds/`, `assets/atlas/`), limites do engine (atlas ≤ 2048², ASTC em
iOS), registro obrigatório em `PROVENANCE.md`.

## 14. Histórico de aprovações

| Data | Seções | Decisão | Quem | Evidência (`production/evidencias/...`) |
|---|---|---|---|---|
| AAAA-MM-DD | 1–7 | Aprovado | nome | `production/evidencias/AAAA-MM-DD-direcao-de-arte/moodboard-escolhido.png` |
