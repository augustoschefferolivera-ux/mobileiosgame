# Dataset e treino de LoRA (FLUX)

## Composição do dataset

| Alvo | Quantidade | Conteúdo | Evite |
|---|---|---|---|
| Personagem | 20–40 (fal) · 12–18 (Replicate FLUX.1-dev) | folha de referência + poses variadas (frente, lado, costas, ação), expressões, fundo neutro, mesma luz | fundos ricos, outros personagens no quadro, imagens não curadas |
| Estilo | 30–100 | assets aprovados de categorias diferentes (personagens, props, cenários, UI) no mesmo traço/paleta | misturar pixel e HD; imagens de terceiros |

Regras:
- Só imagens suas, já em `PROVENANCE.md`. Imagens de referência de terceiros **não** entram (direitos e contaminação de estilo).
- Mesma resolução de trabalho (ex.: 1024²); recorte com sujeito centralizado; PNG.
- Legenda por imagem (`nome.txt`): `<gatilho>, <o que há na imagem em 1 frase>` — o gatilho é uma palavra inventada (ex.: `rpsmsg`), nunca um nome real.
- Diversidade de pose e enquadramento com identidade fixa é o que ensina o LoRA a separar "quem" de "como".

## Treinadores

- **fal `fal-ai/flux-2-trainer`** (FLUX.2): 20 a 1.000 imagens; a fal avisa que a consistência do dataset determina o resultado. Parâmetros (passos, learning rate) na página do modelo — confirme lá.
- **Replicate `ostris/flux-dev-lora-trainer`** (FLUX.1-dev): 12–18 imagens em alta resolução, 1.000–3.000 passos, palavra-gatilho; força 0,8–0,95 ajuda em looks estilizados; dataset pobre reduz a capacidade de aplicar outros estilos ao sujeito.
- **FluxGym** (local, GPU): tutoriais de terceiros para LoRA de personagem/estilo.

## Licenças a registrar em `design/lora-registry.md`

| Base | Licença do modelo | Pode servir no seu produto? | Saídas comerciais |
|---|---|---|---|
| FLUX.2 [klein] 4B | Apache 2.0 | sim | sim |
| FLUX.2 [klein] 9B | FLUX Non-Commercial | não sem licença BFL | leitura corrente: sim [secundário, confirmar] |
| FLUX.2 [dev] / FLUX.1 [dev] | FLUX Non-Commercial | não sem licença BFL | idem |
| FLUX.2 [pro]/[flex] | hospedado | n/a (API) | termos da BFL/serviço |
| SD 3.5 | Stability Community License | sim se receita < US$ 1M/ano | sim (condições) |

Modelo de registro:

```markdown
## lora_raposa_v01
- base: FLUX.2 [klein] 4B (Apache 2.0) · serviço: fal `fal-ai/flux-2-trainer`
- dataset: assets/referencias/lora/raposa/ (24 imagens; sha256 em dataset.txt)
- passos: ____ · gatilho: rpsmsg · data: AAAA-MM-DD · custo: US$ ____
- arquivo: assets/referencias/lora/raposa/lora_raposa_v01.safetensors (fora do bundle)
- calibração: seeds 1–8, força 0,9 → production/evidencias/AAAA-MM-DD-consistencia-raposa/
```

## Uso em inferência

- Mesmos seeds (1–8) em toda comparação; registre seed e força por asset.
- Prefixo do style card continua obrigatório: o LoRA não substitui a paleta literal.
- Combine com referência por imagem quando o modelo aceitar (FLUX.2 multi-referência).
- A cada mudança na bible: novo dataset, nova versão; não "fine-tune do fine-tune" sem registro.
