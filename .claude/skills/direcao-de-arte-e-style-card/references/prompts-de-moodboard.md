# Prompts de moodboard (3 direções do mesmo herói e cenário)

Objetivo: comparar direções **com o mesmo sujeito**, para que a diferença seja só o estilo. Gere 2–4 imagens por direção (6–12 no total). Use o mesmo modelo nas três direções; mudar de modelo entre direções confunde a comparação.

## Estrutura de cada prompt (≤ 60 palavras)

```
[Direção em 1 frase]. [Herói: 1 frase fixa, igual nas 3 direções]. [Cenário: 1 frase fixa].
Paleta sugerida: #..., #..., #... . Luz vinda de [direção]. [Traço: contorno/sem contorno; chapado/pintado/pixel].
Vista [lateral | top-down | 3/4]. Estilo de jogo mobile 2D, legível em tela pequena. Sem texto, sem marca d'água, sem logos.
```

## Exemplo (jogo de plataforma com uma raposa mensageira)

Sujeito fixo: "a small fox courier with a satchel, standing on a mossy stone ledge above a misty valley".

| Direção | Prompt de estilo (prefixo) | Prós para mobile | Contras |
|---|---|---|---|
| A — pixel art 32 px, paleta de 16 cores | "16-color pixel art, 32px character grid, no anti-aliasing, 1px dark outline, flat shading with 2 tones" | atlas minúsculo; leitura clara; ferramentas pixel-native (PixelLab, Retro Diffusion); validação 100 % automática; `pixelArt: true` + zoom inteiro no Phaser | animação exige disciplina; pouco espaço para expressão facial |
| B — pintado chapado com contorno | "flat-shaded hand-painted cartoon, thick 3px rounded outline, soft top-left light, 2-tone cel shading, no gradients" | ótimo para gpt-image-1.5 com alfa nativa; UI combina fácil | mais memória por sprite; precisa de LoRA ou folha de referência para manter o herói |
| C — vetor/flat geométrico | "geometric flat vector illustration, no outlines, long shadows, 6-color limited palette, crisp edges" | Recraft V4 Vector (SVG) para UI; escala sem perda | cenários ficam vazios; personagens perdem charme em movimento |

## O que observar na folha de contato

- Legibilidade a 1/4 e em cinza: `scripts/verificar_legibilidade.py <herois> --fundo "#<cor do cenário>" --alvo-px 64 --folha ...` (contraste ≥ 3:1, silhueta IoU ≥ 0,80); a folha mostra 1×, 1/2, 1/4, cinza e silhueta.
- Contraste herói/cenário: o herói usa uma cor que o cenário não usa?
- Luz: as três imagens da mesma direção têm a luz vindo do mesmo lado? Se não, a direção é frágil.
- Quanto de "IA genérica" sobra (brilhos, partículas, gradientes fotográficos)? Entra na seção 11 da bible como proibição.

## Modelos

- gpt-image-1.5: `background: "transparent"` + PNG para o herói isolado; fundo opaco para o cenário. Parâmetros `quality` e `size`: confirme na referência da API da OpenAI.
- Nano Banana Pro (`gemini-3-pro-image-preview`): sem alfa nativa confirmada; recorte depois com `remove_bg.py`. Útil quando já existe uma imagem de referência humana.
- Não use Midjourney para moodboard se o pipeline final for API: o estilo não se transfere entre modelos.
- Rota sem custo por imagem: FLUX.2 [klein] 4B na estação GPU (`../gerar-sprites-2d/references/comfyui-receitas.md`), fundo branco + recorte BiRefNet; bom para explorar 3 direções antes de gastar créditos.
