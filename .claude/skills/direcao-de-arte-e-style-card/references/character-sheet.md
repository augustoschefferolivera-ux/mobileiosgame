# Folha de referência de personagem (character sheet)

A folha é a âncora de identidade: todo sprite, pose e animação do personagem é gerado **com a folha como referência** (Nano Banana Pro, Retro Diffusion Pro, FLUX.2 multi-referência) ou com a descrição textual extraída dela (gpt-image-1.5). Sem folha, cada geração reinventa o personagem.

## Conteúdo mínimo

1. Vistas frontal, lateral e traseira na mesma escala, mesma linha de base, pose neutra (braços levemente afastados).
2. 3 expressões faciais (neutra, feliz, dor) — só para personagens com rosto visível na câmera do jogo.
3. Faixa de "color callouts": cada cor do personagem com hex literal (copie da seção 2 da art bible).
4. Um "turnaround" opcional em 3/4 se a câmera do jogo for 3/4 ou isométrica.
5. Nenhum texto gerado pela IA: nomes e hex são adicionados por você depois (Pillow/Aseprite) ou ficam só no `PROVENANCE.md`.

## Prompt-base

```
[Prefixo do style card]. Character reference sheet of [nome/descrição em 1 frase]: front view, side view and back view,
same scale and proportions ([N] heads tall), neutral standing pose, feet on the same baseline; three facial expressions
(neutral, happy, hurt) in a row; a color swatch strip of the character's exact colors. Plain white background, no text,
no labels, no watermark, evenly spaced layout.
```

Para pixel art, gere a folha com ferramenta pixel-native (PixelLab aceita canvas 16/32/64/128 px) ou requantize (`/pixel-art-pipeline`); um modelo generalista produz "pixel-styled" em grade errada.

## Checklist de aprovação humana

- [ ] As três vistas têm a mesma altura (meça com a caixa de alfa; `slice_spritesheet.py fatiar --preview` ajuda).
- [ ] Nenhuma cor fora da paleta da bible além de 10% (pintado) ou 0% (pixel) — `verificar_paleta.py`.
- [ ] Um traço distintivo visível na silhueta (orelha, chapéu, cauda) — teste em 64 px.
- [ ] Não lembra personagem de franquia conhecida (busca reversa de imagem antes de aprovar).
- [ ] Registrada em `PROVENANCE.md` com modelo, versão, prompt e o que o humano alterou.

## Uso posterior

- Nano Banana Pro: anexe a folha (e até ~13 outras referências [secundário, confirmar]) em cada prompt de pose nova.
- gpt-image-1.5: converta a folha em 3–4 frases descritivas fixas (cores em hex, proporção em cabeças, acessórios) e cole após o prefixo.
- LoRA: a folha + 20 imagens derivadas formam o dataset (`/consistencia-com-lora`).
