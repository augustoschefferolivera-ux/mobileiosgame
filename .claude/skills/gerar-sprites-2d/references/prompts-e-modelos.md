# Prompts e chamadas por modelo

Os nomes de parâmetros abaixo seguem a API de imagens da OpenAI e a SDK `google-genai` como documentadas para a geração anterior (gpt-image-1, Gemini 2.5 Flash Image). **Confirme na referência oficial antes de rodar** (platform.openai.com/docs ; ai.google.dev) — as páginas não foram acessíveis durante a pesquisa.

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
| Local, geral | `remove_bg.py <pasta> --saida <pasta>/recortes --aparar --margem 4` (BiRefNet via rembg, MIT) |
| Anime/estilizado | `remove_bg.py <pasta> --saida ... --backend replicate --replicate-modelo sprited/birefnet-toonout` |
| Bordas suaves (cabelo, fumaça) | adicione `--matting` (rembg) |

O `--aparar` corta à caixa de alfa com margem; mantenha a margem ≥ 2 px para o atlas não sangrar.

## Checklist de curadoria (humano)

1. Lê-se em 64 px? (reduza a folha de contato)
2. Luz vem do lado da bible?
3. Paleta dentro do limite (`verificar_paleta.py`)?
4. Alfa limpo no xadrez (sem halo, sem pedaços de fundo)?
5. Nada parece marca, logo ou personagem conhecido?
6. Anotar: qual variação, por quê, o que será retocado à mão.
