# Formatos de textura, orçamento e exportação por engine

## Bits por pixel e memória (sem mipmaps; sprites 2D normalmente não usam mipmaps)

| Formato | bpp | 1024² | 2048² | Uso |
|---|---|---|---|---|
| RGBA32 | 32 | 4 MB | 16 MB | pixel art, UI minúscula, fontes |
| RGBA16 (4444) | 16 | 2 MB | 8 MB | pixel art com poucas cores (banding em gradientes) |
| ASTC 4x4 | 8 | 1 MB | 4 MB | UI, ícones, texto-like, sprites pequenos |
| ASTC 6x6 | ≈3,56 | ≈455 KB | ≈1,8 MB | sprites de jogo HD (padrão iOS no exemplo da skill Unity) |
| ASTC 8x8 | 2 | 256 KB | 1 MB | fundos, parallax |
| PVRTC 4 bpp | 4 | 512 KB | 2 MB | só dispositivos antigos; quadrado e potência de 2 obrigatórios; 256² = 32 KB |
| ETC2 RGBA8 | 8 | 1 MB | 4 MB | Android |

`scripts/estimar_memoria_atlas.py` calcula qualquer combinação; `--pasta` soma os PNGs e estima quantos atlases 2048² ocupam.

## Orçamento por tela (modelo de `design/orcamento-texturas.md`)

| Tela | Atlases | Formato | Estimado | Medido (dispositivo) | Teto | Status |
|---|---|---|---|---|---|---|
| Floresta (gameplay) | sprites_floresta (2048²), ui_hud (1024²), bg_floresta 3 camadas (2048×1024) | ASTC 6x6 / 4x4 / 8x8 | 1,8 + 1 + 1,5 MB | ____ | ____ MB | |

Regras práticas (valide no seu dispositivo mínimo, com Xcode Memory/Metal debugger ou Unity Memory Profiler): fixe um teto por tela e um teto total; descarregue atlases ao trocar de cena; fundos de tela cheia são o maior item (um fundo @3x de iPhone em RGBA32 passa de 14 MB; em ASTC 8x8 fica abaixo de 1 MB).

## Alfa pré-multiplicado

- PNG armazena alfa **reto** (cor não multiplicada). GPUs e engines geralmente compõem com alfa **pré-multiplicado**. Se o engine não converter na importação, bordas semitransparentes escurecem (halo).
- Soluções: opção "premultiply alpha" do empacotador (TexturePacker tem; confira o `free-tex-packer`), ou garantir a conversão na importação (SpriteKit/Xcode fazem; Phaser tem `premultipliedAlpha` na config do renderer [confirmar]).
- Teste: sprite sobre xadrez e sobre preto puro; halo escuro = alfa reto desenhado como pré-multiplicado; borda clara/"brilho" = o inverso.
- Nunca "resolver" pintando a borda do PNG: isso quebra em outro engine.

## Nine-slice

- Bordas (l,t,r,b) em px @1x no `design/ui-mapa-de-nomes.md`; o meio deve ser liso (sem detalhe que estique).
- No atlas: sem rotação, sem trim para peças nine-slice.
- Engine: SpriteKit `centerRect`; Unity bordas no Sprite Editor + `Image.Type.Sliced`; Godot `NinePatchRect`/`StyleBoxTexture`; Phaser `NineSlice`.

## Exportação por engine

### SpriteKit (iOS nativo)
- Asset catalog → pasta `nome.spriteatlas` com imagens `@2x`/`@3x` (sem `@1x` para iOS moderno, se o jogo não roda em iPad antigo — confirme seus alvos); o Xcode empacota no build e faz app thinning por dispositivo.
- `SKTextureAtlas(named: "nome")`, `.preload(completionHandler:)` antes da cena; `textureNamed("sprite")`.
- Compressão: atributo "Compression" do asset catalog (há opções com perda otimizadas para GPU) [confirmar os nomes na doc do Xcode]. Pixel art: `filteringMode = .nearest`.

### Unity 6.3
- Skill oficial `manage-sprite-atlas` (prebuild, SpriteAtlas V2, override por plataforma: iOS → ASTC, `maxTextureSize` 2048, `compressionQuality`); `sprite-editor` para bordas/pivôs; `2d-pixel-perfect` para pixel art. Não copie o texto da skill; invoque-a.
- Addressables/late binding quando o jogo tem muitas cenas (a skill cobre).

### Godot 4
- Import: Compress Mode "VRAM Compressed" (HD) ou "Lossless" (pixel art); para mobile habilite ETC2/ASTC em Project Settings → Rendering → Textures → VRAM Compression [confirmar na doc da versão fixada].
- Sheets: `AtlasTexture` (região por sprite) ou `SpriteFrames` para animação; não há empacotador automático de 2D no editor — use TexturePacker/free-tex-packer e gere regiões, ou mantenha PNGs separados em cenas pequenas.
- Godot AI (MCP): `filesystem_manage.reimport` reimporta texturas após mudar presets.

### Phaser 3
- `this.load.atlas('key', 'atlas.png', 'atlas.json')` com JSON **hash** ou **array** (saída do `slice_spritesheet.py` ou do TexturePacker).
- Escala: escolha o atlas @1x/@2x/@3x por `window.devicePixelRatio` no boot (não há sufixos automáticos).
- Texturas comprimidas (ASTC/PVRTC/ETC em KTX/PVR) via loader de texturas comprimidas (3.60+) [confirmar]; sem isso a GPU guarda RGBA32.
- `pixelArt: true` para nearest.

## Formato do JSON hash (compatível com Phaser; gerado por `slice_spritesheet.py`)

```json
{
  "frames": {
    "chr_heroi_walk_00.png": {
      "frame": {"x": 0, "y": 0, "w": 64, "h": 64},
      "rotated": false, "trimmed": false,
      "spriteSourceSize": {"x": 0, "y": 0, "w": 64, "h": 64},
      "sourceSize": {"w": 64, "h": 64}
    }
  },
  "meta": {"image": "chr_heroi_walk_sheet.png", "size": {"w": 384, "h": 64}, "scale": "1"}
}
```

O formato **array** troca o objeto `frames` por uma lista com `filename` em cada item.
