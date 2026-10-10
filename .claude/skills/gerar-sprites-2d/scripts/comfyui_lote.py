#!/usr/bin/env python3
"""comfyui_lote.py — roda um workflow do ComfyUI (formato API) em lote na estação GPU: sobe a imagem de referência
(/upload/image), troca prompt e seed, valida os nomes de entrada contra /object_info, envia N variações e baixa os PNGs.
Complementa `.claude/skills/estacao-gpu-remota/scripts/comfyui_api.py` (um job por chamada) com upload, seeds e registro.

Só biblioteca padrão (urllib). Servidor: ComfyUI na tailnet (http://gamer-pc:8188) ou túnel (`gpu.sh tunnel 8188`).

Uso:
  comfyui_lote.py --workflow .claude/skills/gerar-sprites-2d/assets/flux2_klein_4b_t2i_api.json \
      --server http://gamer-pc:8188 --out assets/brutos/2026-10-10/enm_bomba_idle \
      --prompt-arquivo prompts/sprites/enm_bomba_idle.txt --seeds 1,2,3,4 --validar --registro lote.json
  comfyui_lote.py --workflow .../birefnet_recorte_api.json --upload assets/brutos/x/var_00.png --out recortes/
  --set NÓ.inputs.CAMPO=VALOR         altera um campo antes de enviar (repetível; números são convertidos)
  --upload LOCAL[:NÓ]                 sobe a imagem e grava o nome no `inputs.image` do nó (padrão: 1º LoadImage)
  --prompt-arquivo / --prompt-campo   texto do prompt; campo padrão: nó com _meta.title "Prompt", senão 1º com `text`/`prompt`
  --seeds 1,2,3 | --n 4 --seed-inicial 1    uma execução por seed; campo detectado (`seed`/`noise_seed`) ou --seed-campo
  --validar                           consulta /object_info/<class_type> e aborta se algum input não existir
Saída: caminhos baixados (um por linha), `lote.json` com seed→arquivos. Códigos: 0 ok · 1 uso · 2 servidor/timeout.
"""
import argparse
import json
import mimetypes
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path


def req(url, data=None, timeout=60, headers=None):
    r = urllib.request.Request(url, data=data, headers=headers or ({"Content-Type": "application/json"} if data else {}))
    return urllib.request.urlopen(r, timeout=timeout)


def set_path(wf, expr):
    chave, _, val = expr.partition("=")
    partes = chave.split(".", 2)
    if len(partes) != 3 or partes[1] != "inputs" or partes[0] not in wf:
        sys.exit(f"--set inválido ou nó inexistente: {expr}")
    v = val
    for conv in (int, float):
        try:
            v = conv(val); break
        except ValueError:
            continue
    wf[partes[0]]["inputs"][partes[2]] = v


def achar_no(wf, pred):
    for nid, n in wf.items():
        if pred(nid, n):
            return nid
    return None


def upload(server, caminho):
    p = Path(caminho)
    if not p.exists():
        sys.exit(f"--upload: não existe {p}")
    limite = uuid.uuid4().hex
    mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    corpo = (f"--{limite}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{p.name}\"\r\n"
             f"Content-Type: {mime}\r\n\r\n").encode() + p.read_bytes() + f"\r\n--{limite}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{limite}--\r\n".encode()
    with req(f"{server}/upload/image", corpo, headers={"Content-Type": f"multipart/form-data; boundary={limite}"}) as r:
        info = json.load(r)
    nome = info.get("name", p.name)
    sub = info.get("subfolder", "")
    return f"{sub}/{nome}" if sub else nome


def validar(server, wf):
    erros = []
    cache = {}
    for nid, n in wf.items():
        ct = n["class_type"]
        if ct not in cache:
            try:
                with req(f"{server}/object_info/{urllib.parse.quote(ct)}") as r:
                    cache[ct] = json.load(r).get(ct)
            except urllib.error.URLError as e:
                sys.exit(f"validação: não consegui ler /object_info/{ct}: {e}")
        info = cache[ct]
        if not info:
            erros.append(f"nó {nid}: class_type '{ct}' não existe no servidor (custom node faltando?)"); continue
        aceitos = set()
        for grupo in ("required", "optional"):
            aceitos |= set((info.get("input") or {}).get(grupo, {}).keys())
        for campo in n.get("inputs", {}):
            if campo not in aceitos:
                erros.append(f"nó {nid} ({ct}): input '{campo}' não existe; aceitos: {sorted(aceitos)}")
    return erros


def rodar(server, wf, timeout):
    client = uuid.uuid4().hex
    with req(f"{server}/prompt", json.dumps({"prompt": wf, "client_id": client}).encode()) as r:
        resp = json.load(r)
    pid = resp.get("prompt_id")
    if not pid:
        raise RuntimeError(f"servidor não devolveu prompt_id: {json.dumps(resp)[:500]}")
    t0 = time.time()
    while time.time() - t0 < timeout:
        with req(f"{server}/history/{pid}") as r:
            h = json.load(r)
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error":
                raise RuntimeError("job com erro: " + json.dumps(st.get("messages", []))[:800])
            if h[pid].get("outputs"):
                return pid, h[pid]["outputs"]
        time.sleep(2)
    raise RuntimeError("timeout")


def baixar(server, outputs, out, prefixo):
    arquivos = []
    for _nid, o in outputs.items():
        for img in o.get("images", []):
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": img.get("type", "output")})
            dest = out / f"{prefixo}{img['filename']}"
            with req(f"{server}/view?{q}", timeout=120) as r:
                dest.write_bytes(r.read())
            arquivos.append(dest)
    return arquivos


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workflow", required=True)
    ap.add_argument("--server", default="http://localhost:8188")
    ap.add_argument("--out", required=True)
    ap.add_argument("--set", action="append", default=[])
    ap.add_argument("--upload", action="append", default=[], help="LOCAL[:NÓ]")
    ap.add_argument("--prompt-arquivo")
    ap.add_argument("--prompt-campo", help="NÓ.inputs.CAMPO")
    ap.add_argument("--seeds", help="lista separada por vírgula")
    ap.add_argument("--n", type=int, default=1)
    ap.add_argument("--seed-inicial", type=int, default=1)
    ap.add_argument("--seed-campo", help="NÓ.inputs.CAMPO (padrão: detecta seed/noise_seed)")
    ap.add_argument("--validar", action="store_true")
    ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("--prefix", default="")
    ap.add_argument("--registro", help="JSON com seed → arquivos (padrão: <out>/lote.json)")
    ap.add_argument("--dry-run", action="store_true", help="monta o workflow e imprime sem enviar")
    a = ap.parse_args()

    wf = json.loads(Path(a.workflow).read_text(encoding="utf-8"))
    if not isinstance(wf, dict) or not all(isinstance(v, dict) and "class_type" in v for v in wf.values()):
        sys.exit("workflow não está em formato API (File → Export Workflow (API) no ComfyUI).")
    for s in a.set:
        set_path(wf, s)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

    for u in a.upload:
        local, _, no = u.partition(":")
        no = no or achar_no(wf, lambda i, n: n["class_type"] == "LoadImage")
        if not no:
            sys.exit("--upload: nenhum nó LoadImage no workflow; informe LOCAL:NÓ")
        nome = local if a.dry_run else upload(a.server, local)
        wf[no]["inputs"]["image"] = nome
        print(f"upload: {local} -> nó {no} ({nome})", file=sys.stderr)

    if a.prompt_arquivo:
        texto = Path(a.prompt_arquivo).read_text(encoding="utf-8").strip()
        if a.prompt_campo:
            set_path(wf, f"{a.prompt_campo}={texto}")
        else:
            no = achar_no(wf, lambda i, n: "prompt" in str(n.get("_meta", {}).get("title", "")).lower()) or \
                 achar_no(wf, lambda i, n: isinstance(n["inputs"].get("text"), str) and n["inputs"].get("text") != "") or \
                 achar_no(wf, lambda i, n: isinstance(n["inputs"].get("prompt"), str))
            if not no:
                sys.exit("não achei campo de prompt; use --prompt-campo NÓ.inputs.CAMPO")
            campo = "text" if "text" in wf[no]["inputs"] else "prompt"
            wf[no]["inputs"][campo] = texto
            print(f"prompt -> nó {no}.inputs.{campo}", file=sys.stderr)

    if a.seed_campo:
        sno, _, scampo = a.seed_campo.partition(".inputs.")
    else:
        sno = achar_no(wf, lambda i, n: "noise_seed" in n["inputs"]) or achar_no(wf, lambda i, n: "seed" in n["inputs"])
        scampo = "noise_seed" if sno and "noise_seed" in wf[sno]["inputs"] else "seed"
    seeds = [int(x) for x in a.seeds.split(",")] if a.seeds else list(range(a.seed_inicial, a.seed_inicial + a.n))
    if not sno and len(seeds) > 1:
        sys.exit("workflow sem campo de seed; use --seed-campo ou --n 1")

    if a.validar and not a.dry_run:
        erros = validar(a.server, wf)
        if erros:
            print("\n".join(erros), file=sys.stderr); sys.exit(2)
        print("validação ok: todos os class_type e inputs existem no servidor", file=sys.stderr)
    if a.dry_run:
        print(json.dumps(wf, indent=2, ensure_ascii=False)); return

    registro = {"workflow": a.workflow, "server": a.server, "prompt_arquivo": a.prompt_arquivo, "seed_campo": f"{sno}.inputs.{scampo}" if sno else None, "execucoes": []}
    for seed in seeds:
        if sno:
            wf[sno]["inputs"][scampo] = seed
        try:
            pid, outputs = rodar(a.server, wf, a.timeout)
            arquivos = baixar(a.server, outputs, out, f"{a.prefix}s{seed}_" if sno else a.prefix)
        except (urllib.error.URLError, RuntimeError, KeyError) as e:
            print(f"seed {seed}: erro: {e}", file=sys.stderr); sys.exit(2)
        for f in arquivos:
            print(f)
        registro["execucoes"].append({"seed": seed, "prompt_id": pid, "arquivos": [str(f) for f in arquivos]})
        print(f"seed {seed}: {len(arquivos)} arquivo(s)", file=sys.stderr)
    reg = Path(a.registro) if a.registro else out / "lote.json"
    reg.write_text(json.dumps(registro, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"registro: {reg}", file=sys.stderr)


if __name__ == "__main__":
    main()
