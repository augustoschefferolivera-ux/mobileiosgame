# Direções, câmera e orçamento de frames para sprites pré-renderizados

Convenções usadas por `scripts/render_sprites.py`, `scripts/montar_atlas_phaser.py` e pelo código
Phaser do jogo. Mude-as só se o brief exigir, e mude nos três lugares.

## Convenção de direções

- O modelo fica parado na origem; o **rig câmera+luz gira** em torno do eixo vertical que passa
  pelo pivot (`--pivo origem` = pés do modelo). Assim o pivot projeta no **mesmo ponto** da
  imagem em todas as direções e todas as ações, e o sprite não "anda" ao trocar de direção.
- Direção `d0` = personagem **de frente para a câmera** (sul, "S"); as seguintes giram no sentido
  **horário vistas de cima** (`--sentido horario`). Rótulos no `manifest.json`:

| N | índices → rótulos | azimute por passo |
|---|---|---|
| 4 | d0 S, d1 W, d2 N, d3 E | 90° |
| 8 | d0 S, d1 SW, d2 W, d3 NW, d4 N, d5 NE, d6 E, d7 SE | 45° |
| 16 | S, SSW, SW, WSW, W, … | 22,5° |

- Frente do modelo: o importador glTF do Blender converte +Z (frente no glTF) para **-Y** do
  Blender (`--frente -y`, padrão). FBX do Mixamo costuma chegar também de frente para -Y
  [confirmar no seu arquivo: `--direcoes 1 --frames 1 --dry-run` e um render de teste].
- No jogo (Phaser), escolha a direção pelo vetor de movimento:

```ts
// 8 direções, d0 = S (y+ na tela), horário: S, SW, W, NW, N, NE, E, SE
export function direcao8(vx: number, vy: number): number {
  const ang = Math.atan2(vy, vx);                 // 0 = E, +π/2 = S (y cresce para baixo)
  const passo = Math.round((ang - Math.PI / 2) / (Math.PI / 4)); // 0 = S
  return ((-passo % 8) + 8) % 8;                  // horário visto de cima = anti-horário na tela
}
sprite.play(`walk-d${direcao8(vx, vy)}`, true);
```

Teste a função com os quatro eixos antes de confiar (S → 0, W → 2, N → 4, E → 6).

- **Espelhar para economizar**: renderizar 5 direções (S, SW, W, NW, N) e espelhar SE/E/NE
  com `flipX` corta ~37 % dos frames, **mas só é correto se a luz for simétrica** (frontal ou
  zenital, `--luz-azimute 0`) e o personagem for simétrico (sem espada numa mão só). Com luz
  padrão alto-esquerda (`--luz-azimute -35`) o espelho inverte o sombreado e o olho percebe.

## Elevação da câmera

A câmera é ortográfica; `--elevacao` é o ângulo acima do chão. Com azimute fixo, um quadrado
de 1 m no chão aparece com largura 1 (ao longo do X da câmera) e altura `sin(elevação)`; a
altura do personagem é escalada por `cos(elevação)`.

| Estilo | `--elevacao` | `--azimute-inicial` | Proporção do tile de chão | Uso |
|---|---|---|---|---|
| Lateral (platformer, beat 'em up) | 0 (ou 5–10 com leve chão) | 0 | — | Dead Cells, Metroidvania; normalmente 1 direção + `flipX` |
| Top-down 3/4 (JRPG, Zelda-like, twin-stick) | 45–60 | 0 | 1 : 0,71–0,87 | 4 ou 8 direções; mais chão visível |
| Isométrico verdadeiro | 35,264 (= atan(1/√2)) | 45 | √3 : 1 ≈ 1,73 : 1 | Tiles não casam com pixels inteiros |
| "Pixel-iso" 2 : 1 (dimétrico) | 30 | 45 | 2 : 1 | Diablo II, Age of Empires II, tiles 64×32 / 128×64 |
| Dimétrico 4 : 3 | 41,8 | 45 | 1,5 : 1 | Alguns RTS clássicos |

Com azimute 45° a diagonal do tile (√2 m) ocupa a largura; então **largura do tile em px =
ppm × √2** e **altura = largura × sin(elevação)**. Para um tile 2 : 1 de 64×32 px:
ppm = 64/√2 ≈ 45,25 px/m → `--ppm 45.25`. Fixe `--ppm` no projeto inteiro (personagens,
props, tiles) para a escala bater; o `manifest.json` grava `pixels_por_metro`.

## Tamanho do frame e orçamento de memória

Phaser sobe texturas para a GPU como RGBA8 sem compressão (4 bytes/pixel; +33 % com mipmaps).
A página de atlas recomendada neste repositório é ≤ 2048² (= 16 MB cada). Contas:

| Frame | Frames por personagem (8 dir × 8 fr × 4 ações = 256) | Páginas 2048² | GPU |
|---|---|---|---|
| 64×64 | 256 × 16 KB | 1 (cabem 1.024) | 16 MB (página inteira) ou ~4 MB em página 1024² |
| 96×96 | 256 × 36 KB | 1 | 16 MB |
| 128×128 | 256 × 64 KB | 1 (cabem 256 sem trim) | 16 MB |
| 192×192 | 256 × 144 KB | 3 | 48 MB |
| 256×256 | 256 × 256 KB | 4 | 64 MB |

Regras práticas (inferência a partir das contas; não há número oficial do Safari iOS):

- Resolução lógica 390×844 com DPR 2 (`CLAUDE.md`): um personagem de ~1,8 m que ocupa 1/8 da
  altura da tela tem ~105 pt = **~210 px** em @2x. Renderize o herói em **192–256 px** e inimigos
  e NPCs em **128 px**; props isométricos em 128–256 px; ícones de prop em 64 px.
- O **trim** (`montar_atlas_phaser.py` faz por padrão) reduz muito: um humanoide ocupa ~30–45 %
  da célula quadrada. O frame conta pelo tamanho recortado no atlas.
- Orçamento de referência para um jogo mobile web: **≤ 4 páginas 2048² (64 MB) carregadas por
  cena**, somando personagens, tiles e UI. Acima disso, divida por fase e descarregue
  (`this.textures.remove(key)`).
- Menos frames, não menos resolução: `walk` com 6 frames a 10–12 fps lê bem em sprites
  pequenos; 8 frames a 12 fps em 192 px+. `idle` com 4–6 frames a 6–8 fps. Ações sem loop
  (`attack`, `hit`, `death`) com `--incluir-ultimo` e 6–10 frames.
- 16 direções só para veículos/naves (giram devagar e não deformam); personagens ficam em 8.

## Pixel art a partir de 3D

Duas rotas:

1. **Renderizar já pequeno**: `--tamanho 64 --sem-aa --engine workbench --toon` e depois
   `--paleta N` no atlas. Rápido, mas o Blender não "pensa em pixels": detalhes finos viram
   ruído. É o espírito do pipeline de Dead Cells (3D → ferramenta própria de pixelização)
   [secundário].
2. **Renderizar 4× e reduzir com NEAREST** (`--tamanho 256` → `montar_atlas_phaser.py
   --pixelizar 4 --paleta 32 --paleta-de style-card.png`). Mais controle, contornos mais limpos.

Em ambos: `--ppm` múltiplo inteiro, elevação 30° (2 : 1) para casar com tiles, luz sem sombra
suave (`--sem-sombra`), e **sem** AgX/Filmic (o script força `view_transform = Standard`).
Depois, se quiser limpar à mão, abra os frames no Aseprite (`/pixel-art-pipeline`).

## Pivot e ordenação em profundidade

- `pivot` no JSON do atlas é lido pelo parser do Phaser (`frame.customPivot`); ao aplicar o
  frame, o sprite usa esse pivot como origem (`setOriginFromFrame`). Com `--pivo origem` o
  pivot fica nos pés: posicione o sprite na coordenada do chão e ordene por `y`
  (`sprite.setDepth(sprite.y)`), como em qualquer jogo top-down.
- Sombra: renderize sem sombra projetada e desenhe uma elipse no jogo (barata, consistente,
  independente da direção), ou renderize a sombra como ação separada se o estilo pedir.

## Checklist de aceite visual

- [ ] As 8 direções giram na ordem esperada no jogo (teste com um loop que troca `d` a cada 0,5 s).
- [ ] Nenhum frame cortado (silhueta encostando na borda da célula → aumente `--margem`).
- [ ] Pivot não "pula" entre ações (`idle` → `walk` → `attack` no mesmo ponto).
- [ ] Luz consistente entre direções (camera-fixa) ou coerente com o cenário (mundo-fixa).
- [ ] Sem halo escuro em fundo claro (ative `--bleed`; confira o `preview`).
- [ ] Memória: páginas × 16 MB dentro do orçamento da cena.
