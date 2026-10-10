# Prompts e chamadas por modelo

Os nomes de parâmetros abaixo seguem a API de imagens da OpenAI e a SDK `google-genai` como documentadas para a geração anterior (gpt-image-1, Gemini 2.5 Flash Image). **Confirme na referência oficial antes de rodar** (developers.openai.com/api/docs ; ai.google.dev) — as páginas não foram acessíveis diretamente durante a pesquisa (2026-10-10).

## Preços por imagem (para o orçamento do lote; fontes em "Fontes" da SKILL.md)

| Modelo | Preço por imagem | Fonte / confiança |
|---|---|---|
| gpt-image-1.5 1024² | low US$ 0,009 · medium 0,034 · high 0,133; 1024×1536: medium 0,05 · high 0,20 | página do modelo na OpenAI, lida via resumo de busca [confirmar] |
| Nano Banana Pro (`gemini-3-pro-image-preview`) | ≈ US$ 0,134 (1K/2K) · 0,24 (4K) | BenchLM (agregador) [secundário] |
| Nano Banana 2 (`gemini-3.1-flash-image`) | ≈ US$ 0,045 (0,5K) · 0,067 (1K) · 0,101 (2K) · 0,151 (4K) | BenchLM [secundário] |
| GPT Image 2 1024² high | ≈ US$ 0,21 (fal) | fal [secundário] |
| Recraft V4 Vector (SVG) | ≈ US$ 0,08 | OpenRouter [secundário]; blog cita V4.1 a 0,035 — divergente |
| Ideogram 3.0 | US$ 0,03 (Flash/Turbo) · 0,06 (Default) · 0,09 (Quality); +Character Reference 0,15 | página de preços da Ideogram via busca [confirmar] |
| FLUX.2 [klein] 4B local (ComfyUI na estação) | energia + tempo; ≈ 1–20 s por imagem | doc do ComfyUI (tempos em RTX 5090) |
| BiRefNet (recorte) local | zero | MIT |

Regra de bolso: um asset HD com 4 candidatos em `medium` custa ≈ US$ 0,15 (gpt-image-1.5) ou ≈ US$ 0,55 (Nano Banana Pro); um lote de 50 assets fica entre US$ 8 e US$ 30 em geração, mais 2–4 h de curadoria humana.

## Estrutura do prompt

```
<PREFIXO DO STYLE CARD, literal>
Asset: <categoria> "<nome>": <1–2 frases funcionais: o que o jogador reconhece de relance>.
Framing: single subject, full body, centered, facing <left|right|camera>, neutral ground contact,
isolated on transparent background, no ground shadow, no scene, no text, no watermark.
Scale: subject fills ~80% of the canvas height.
<NEGATIVO DO STYLE CARD>
```

Variantes: mude **só** a frase do asset ("hurt pose, flinching", "level 2: armored"). Prefixo e framing ficam fixos — é isso que mantém o conjunto coeso.

## gpt-image-1.5 (rota principal — alfa nativa)

```python
import base64, json, pathlib
from openai import OpenAI
client = OpenAI()  # OPENAI_API_KEY
prompt = pathlib.Path("prompts/enm_bomba_idle.txt").read_text()
r = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    background="transparent",   # exige png ou webp
    output_format="png",
    size="1024x1024",           # confirme os tamanhos aceitos na referência
    quality="high",             # low | medium | high
    n=4,
)
out = pathlib.Path("assets/brutos/2026-10-10/enm_bomba_idle"); out.mkdir(parents=True, exist_ok=True)
for i, d in enumerate(r.data):
    (out / f"var_{i:02d}.png").write_bytes(base64.b64decode(d.b64_json))
(out / "resposta.json").write_text(json.dumps({"model": "gpt-image-1.5", "size": "1024x1024", "quality": "high",
                                                "background": "transparent", "n": 4, "created": r.created}, indent=2))
```

Sem seed exposto: registre `--seed n/a`. Se quiser `webp`, troque `output_format`.

## Nano Banana Pro (Gemini 3 Pro Image) — consistência por referência

```python
import pathlib
from google import genai
from google.genai import types
client = genai.Client()  # GEMINI_API_KEY (confirme o nome da variável na doc)
folha = pathlib.Path("assets/referencias/chr_raposa_sheet.png").read_bytes()
prompt = pathlib.Path("prompts/chr_raposa_dano.txt").read_text()
resp = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt, types.Part.from_bytes(data=folha, mime_type="image/png")],
    # config com proporção/tamanho (2K/4K) existe; confirme os campos em ai.google.dev
)
for i, part in enumerate(p for p in resp.candidates[0].content.parts if p.inline_data):
    pathlib.Path(f"assets/brutos/2026-10-10/chr_raposa_dano/var_{i:02d}.png").write_bytes(part.inline_data.data)
```

Anexe a folha de referência e até ~13 imagens adicionais [secundário; alguns relatos falam em 8]. Peça fundo **branco liso** ("plain white background") — recorta melhor que fundo colorido. Depois: `remove_bg.py`.

## GPT Image 2

Mesma chamada da OpenAI com `model="gpt-image-2"` (snapshot `gpt-image-2-2026-04-21`). Transparência em preview desde 20/08/2026 ("may be unstable") — gere com fundo branco e recorte, ou teste `background="transparent"` e inspecione o canal alfa de cada saída. Preço por imagem na fal: US$ 0,211 (1024², alta) [secundário].

## Midjourney V8.1 (manual)

`/imagine <prefixo> <asset> --hd` (2K nativo), fundo branco liso, sem `--tile`. Baixe o PNG, rode `remove_bg.py`, registre manualmente em `PROVENANCE.md` (`--ferramenta "Midjourney V8.1 (web)" --versao "V8.1, <data>" --seed <seed do job se visível> --licenca midjourney` — adicione o id à tabela de `LICENCAS.md`). Sem rota de API confirmada; não use em lotes automatizados.

## Recorte

| Caso | Comando |
|---|---|
| Local, geral | `remove_bg.py <pasta> --saida <pasta>/recortes --aparar --margem 4 --modelo birefnet-general` (BiRefNet via rembg, MIT; **o modelo padrão atual do rembg, `bria-rmbg`, exige acordo pago para uso comercial** — nunca omita `--modelo`) |
| Estação GPU (ComfyUI) | `comfyui_lote.py --workflow assets/birefnet_recorte_api.json --upload <png> --server http://gamer-pc:8188 --out <pasta>/recortes --n 1` (template oficial BiRefNet; ver `references/comfyui-receitas.md`) |
| Anime/estilizado | `remove_bg.py <pasta> --saida ... --backend replicate --replicate-modelo sprited/birefnet-toonout` |
| Bordas suaves (cabelo, fumaça) | adicione `--matting` (rembg) |

O `--aparar` corta à caixa de alfa com margem; mantenha a margem ≥ 2 px para o atlas não sangrar.

## FLUX.2 [klein] 4B local (ComfyUI na estação GPU)

Rota sem custo por imagem e com licença Apache 2.0: `comfyui_lote.py --workflow assets/flux2_klein_4b_t2i_api.json --server http://gamer-pc:8188 --prompt-arquivo prompts/sprites/<asset>.txt --seeds 1,2,3,4 --validar`. Fundo branco liso + recorte BiRefNet. Receitas, VRAM e variantes em `references/comfyui-receitas.md`.

## Checklist de curadoria (humano)

1. Lê-se em 1/4 e em cinza? (`verificar_legibilidade.py --fundo <cor do cenário> --alvo-px <pt no jogo>`)
2. Luz vem do lado da bible?
3. Paleta dentro do limite (`verificar_paleta.py`)?
4. Alfa limpo no xadrez (sem halo, sem pedaços de fundo)?
5. Nada parece marca, logo ou personagem conhecido?
6. Anotar: qual variação, por quê, o que será retocado à mão.
