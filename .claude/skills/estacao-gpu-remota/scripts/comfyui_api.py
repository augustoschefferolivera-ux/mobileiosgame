#!/usr/bin/env python3
"""comfyui_api.py — envia um workflow (formato API) ao ComfyUI remoto, espera e baixa as imagens.

Só biblioteca padrão (urllib). Funciona com o ComfyUI na tailnet (http://gamer-pc:8188) ou via
túnel (gpu.sh tunnel 8188 -> http://localhost:8188).

Uso:
  comfyui_api.py --workflow sheet_api.json --out assets/_candidatos/ \
      [--server http://localhost:8188] [--set "6.inputs.text=um goblin verde, estilo flat"] \
      [--set "3.inputs.seed=42"] [--timeout 600] [--prefix goblin]

  --set NÓ.inputs.CAMPO=VALOR altera um campo do workflow antes de enviar (repetível). Valores
  numéricos são convertidos; use aspas para texto. Exporte o workflow no ComfyUI com
  "Save (API Format)" (modo desenvolvedor) — o JSON comum da interface não serve.

Endpoints usados (API pública do ComfyUI): POST /prompt, GET /history/<id>, GET /view.
Saída: caminhos dos arquivos baixados, um por linha. Código 0 ok; 1 uso; 2 erro do servidor/timeout.
"""
import argparse, json, sys, time, urllib.request, urllib.parse, urllib.error, uuid
from pathlib import Path


def _set_path(wf: dict, expr: str) -> None:
    key, _, val = expr.partition("=")
    parts = key.split(".")
    if len(parts) < 3 or parts[1] != "inputs":
        sys.exit(f"--set inválido: '{expr}' (esperado NÓ.inputs.CAMPO=VALOR)")
    node = wf.get(parts[0])
    if node is None:
        sys.exit(f"--set: nó '{parts[0]}' não existe no workflow")
    v: object = val
    try:
        v = int(val)
    except ValueError:
        try:
            v = float(val)
        except ValueError:
            pass
    node.setdefault("inputs", {})[parts[2]] = v


def _req(url: str, data: bytes | None = None, timeout: int = 30):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"} if data else {})
    return urllib.request.urlopen(req, timeout=timeout)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workflow", required=True, help="JSON do workflow em formato API")
    ap.add_argument("--out", required=True, help="pasta de saída no Linux")
    ap.add_argument("--server", default="http://localhost:8188")
    ap.add_argument("--set", action="append", default=[], help="NÓ.inputs.CAMPO=VALOR (repetível)")
    ap.add_argument("--timeout", type=int, default=600, help="segundos de espera pelo job")
    ap.add_argument("--prefix", default="", help="prefixo para os arquivos baixados")
    a = ap.parse_args()

    wf = json.loads(Path(a.workflow).read_text(encoding="utf-8"))
    if not isinstance(wf, dict) or not all(isinstance(v, dict) and "class_type" in v for v in wf.values()):
        sys.exit("workflow não está em formato API (cada nó precisa de class_type). Use 'Save (API Format)'.")
    for s in a.set:
        _set_path(wf, s)

    client = uuid.uuid4().hex
    try:
        with _req(f"{a.server}/prompt", json.dumps({"prompt": wf, "client_id": client}).encode()) as r:
            pid = json.load(r)["prompt_id"]
    except (urllib.error.URLError, KeyError) as e:
        print(f"erro ao enviar: {e}", file=sys.stderr); return 2
    print(f"job {pid} enviado; aguardando...", file=sys.stderr)

    t0 = time.time()
    hist = None
    while time.time() - t0 < a.timeout:
        try:
            with _req(f"{a.server}/history/{pid}") as r:
                h = json.load(r)
        except urllib.error.URLError as e:
            print(f"erro ao consultar: {e}", file=sys.stderr); return 2
        if pid in h:
            hist = h[pid]
            st = hist.get("status", {})
            if st.get("status_str") == "error":
                print("job terminou com erro:", json.dumps(st.get("messages", []))[:800], file=sys.stderr); return 2
            if hist.get("outputs"):
                break
        time.sleep(2)
    if not hist or not hist.get("outputs"):
        print("timeout sem saída", file=sys.stderr); return 2

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    n = 0
    for node_id, o in hist["outputs"].items():
        for img in o.get("images", []) + o.get("gifs", []) + o.get("audio", []):
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": img.get("type", "output")})
            dest = out / f"{a.prefix}{img['filename']}" if a.prefix else out / img["filename"]
            try:
                with _req(f"{a.server}/view?{q}", timeout=120) as r:
                    dest.write_bytes(r.read())
            except urllib.error.URLError as e:
                print(f"erro ao baixar {img['filename']}: {e}", file=sys.stderr); return 2
            print(dest); n += 1
    print(f"{n} arquivo(s) baixado(s) de {len(hist['outputs'])} nó(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
