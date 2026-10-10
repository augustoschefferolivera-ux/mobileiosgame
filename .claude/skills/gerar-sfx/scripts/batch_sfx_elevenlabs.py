#!/usr/bin/env python3
"""batch_sfx_elevenlabs.py — gera efeitos sonoros em lote com o SDK oficial da ElevenLabs
(modelo `eleven_text_to_sound_v2`), salva com nomes previsíveis e registra PROVENANCE.md.

Dependências: `pip install elevenlabs` (SDK oficial; testado com 2.71.0). Para `--output-format pcm_*`
também `pip install soundfile numpy` (embrulha o PCM em WAV).
Chave: variável de ambiente ELEVENLABS_API_KEY (nunca passe a chave por argumento ou código).

CSV de entrada (cabeçalho obrigatório; colunas extras são ignoradas):
  nome_arquivo,prompt,duration_seconds,loop,prompt_influence,variacoes,categoria
  - nome_arquivo: base do nome final sem extensão (ex.: sfx_jogador_pulo). Siga o naming da sound bible.
  - prompt: texto em inglês ou português descrevendo o som (sem nomes de marcas/jogos reais).
  - duration_seconds: 0.5 a 30 (vazio = o modelo escolhe).
  - loop: sim/nao (true/false). Só o eleven_text_to_sound_v2 aceita loop.
  - prompt_influence: 0.0 a 1.0 (vazio = padrão 0.3 da API). Mais alto = mais literal, menos variado.
  - variacoes: quantas gerações por linha (ex.: 8 para curar depois). Padrão 1.
  - categoria: subpasta de saída (ui, jogador, inimigo, feedback, ambiente...).

Saída: <out-dir>/<categoria>/<nome_arquivo>_cNN.<mp3|wav> (c = candidato) e linhas em <provenance>.

Exemplos:
  ELEVENLABS_API_KEY=... python3 batch_sfx_elevenlabs.py prompts.csv --out-dir assets/audio/_candidatos/sfx
  python3 batch_sfx_elevenlabs.py prompts.csv --dry-run          # lista o que seria gerado, sem chamar a API
  python3 batch_sfx_elevenlabs.py prompts.csv --only sfx_jogador_pulo --variacoes 12

Referência da API: https://github.com/elevenlabs/elevenlabs-python/blob/main/src/elevenlabs/text_to_sound_effects/client.py
"""
from __future__ import annotations

import argparse
import csv
import datetime as _dt
import os
import sys
import time
from pathlib import Path

MODEL_ID = "eleven_text_to_sound_v2"
TRUE_SET = {"sim", "s", "true", "1", "yes", "y"}


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="batch_sfx_elevenlabs.py",
        description=__doc__.split("\n\n")[0],
        epilog="Documentação completa no cabeçalho do arquivo (abra o script).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("csv", help="CSV de prompts (ver cabeçalho do script)")
    p.add_argument("--out-dir", default="assets/audio/_candidatos/sfx", help="pasta raiz de saída (padrão: assets/audio/_candidatos/sfx)")
    p.add_argument("--provenance", default="PROVENANCE.md", help="arquivo PROVENANCE.md a anexar (padrão: ./PROVENANCE.md)")
    p.add_argument("--output-format", default="mp3_44100_128",
                   help="formato da API, codec_taxa_bitrate (padrão mp3_44100_128; mp3_44100_192 exige Creator+; pcm_44100 exige Pro+ [SDK])")
    p.add_argument("--pcm-channels", type=int, default=1, help="canais ao embrulhar PCM em WAV (padrão 1; confirme na doc da API)")
    p.add_argument("--variacoes", type=int, default=None, help="sobrescreve a coluna variacoes para todas as linhas")
    p.add_argument("--only", action="append", default=[], help="processa só estas nome_arquivo (repetível)")
    p.add_argument("--start-index", type=int, default=1, help="número do primeiro candidato (padrão 1; use p/ continuar lote)")
    p.add_argument("--sleep", type=float, default=0.5, help="pausa em segundos entre chamadas (padrão 0,5)")
    p.add_argument("--retries", type=int, default=2, help="novas tentativas por chamada em caso de erro (padrão 2)")
    p.add_argument("--dry-run", action="store_true", help="não chama a API; mostra o plano e o custo em chamadas")
    p.add_argument("--overwrite", action="store_true", help="regrava arquivos existentes (padrão: pula)")
    return p.parse_args(argv)


def to_bool(v: str | None) -> bool:
    return (v or "").strip().lower() in TRUE_SET


def to_float(v: str | None, lo: float, hi: float, campo: str, linha: int) -> float | None:
    v = (v or "").strip().replace(",", ".")
    if not v:
        return None
    try:
        f = float(v)
    except ValueError:
        sys.exit(f"Linha {linha}: {campo}='{v}' não é número.")
    if not (lo <= f <= hi):
        sys.exit(f"Linha {linha}: {campo}={f} fora do intervalo [{lo}, {hi}] aceito pela API.")
    return f


def read_rows(path: Path, args: argparse.Namespace) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        required = {"nome_arquivo", "prompt"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            sys.exit(f"CSV sem colunas obrigatórias: {sorted(missing)}. Cabeçalho lido: {reader.fieldnames}")
        rows = []
        for i, r in enumerate(reader, start=2):
            nome = (r.get("nome_arquivo") or "").strip()
            prompt = (r.get("prompt") or "").strip()
            if not nome or not prompt:
                print(f"Linha {i}: nome_arquivo ou prompt vazio; pulando.", file=sys.stderr)
                continue
            if args.only and nome not in args.only:
                continue
            n_var = args.variacoes or int((r.get("variacoes") or "1").strip() or 1)
            rows.append({
                "linha": i,
                "nome": nome,
                "prompt": prompt,
                "duration": to_float(r.get("duration_seconds"), 0.5, 30.0, "duration_seconds", i),
                "loop": to_bool(r.get("loop")),
                "influence": to_float(r.get("prompt_influence"), 0.0, 1.0, "prompt_influence", i),
                "variacoes": max(1, n_var),
                "categoria": (r.get("categoria") or "geral").strip() or "geral",
            })
        return rows


def ext_for(fmt: str) -> str:
    if fmt.startswith("mp3"):
        return "mp3"
    if fmt.startswith("pcm"):
        return "wav"
    if fmt.startswith("opus"):
        return "opus"
    return "bin"


def write_audio(dest: Path, data: bytes, fmt: str, pcm_channels: int) -> None:
    if fmt.startswith("pcm"):
        try:
            import numpy as np
            import soundfile as sf
        except ImportError:
            sys.exit("Para --output-format pcm_* instale: pip install soundfile numpy")
        rate = int(fmt.split("_")[1])
        samples = np.frombuffer(data, dtype="<i2")
        if pcm_channels > 1:
            samples = samples.reshape(-1, pcm_channels)
        sf.write(dest, samples, rate, subtype="PCM_16")
    else:
        dest.write_bytes(data)


def provenance_header(path: Path) -> None:
    """Cria um PROVENANCE.md mínimo no formato por seção de templates/PROVENANCE.md (auditado por
    .claude/skills/licencas-e-proveniencia/scripts/check_provenance.py). Não toca em arquivo existente."""
    if path.exists() and path.stat().st_size > 0:
        return
    path.write_text(
        "# PROVENANCE — [Nome do jogo]\n\n"
        "Registro de proveniência por asset (ver templates/PROVENANCE.md para as convenções).\n\n"
        "## Assets\n",
        encoding="utf-8",
    )


def provenance_line(dest: Path, row: dict, fmt: str, sdk_version: str) -> str:
    """Uma seção `### <caminho>` por candidato gerado, com os campos obrigatórios do template
    (tipo, ferramenta, versao, edicao_humana, master, data, licenca) e os opcionais úteis."""
    params = f"model={MODEL_ID} output_format={fmt} loop={str(row['loop']).lower()}"
    if row["duration"] is not None:
        params += f" duration_seconds={row['duration']}"
    if row["influence"] is not None:
        params += f" prompt_influence={row['influence']}"
    prompt = row["prompt"].replace("\n", " ").strip()
    tipo = "ambiente em loop" if row["loop"] else ("SFX de UI" if row["categoria"] == "ui" else "SFX")
    return (
        f"\n### {dest.as_posix()}\n"
        f"- tipo: {tipo} (candidato gerado; {fmt})\n"
        f"- ferramenta: ElevenLabs Sound Effects v2 (API; modelo {MODEL_ID})\n"
        f"- versao: SDK elevenlabs {sdk_version}\n"
        f"- data: {_dt.date.today().isoformat()}\n"
        f"- seed: n/a (a API não expõe seed)\n"
        f"- prompt: \"{prompt}\"\n"
        f"- parametros: {params}\n"
        f"- referencia: nenhuma\n"
        f"- master: pendente — copie o candidato aprovado para masters/audio/sfx/ e atualize este campo\n"
        f"- edicao_humana: pendente — registre a curadoria (quem escolheu entre os candidatos, quando) e edições (aparar, normalizar)\n"
        f"- licenca: LICENCAS.md#elevenlabs-sfx-v2\n"
        f"- c2pa: nao\n"
        f"- selecao: pendente\n"
    )


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    csv_path = Path(args.csv)
    if not csv_path.is_file():
        sys.exit(f"CSV não encontrado: {csv_path}")
    rows = read_rows(csv_path, args)
    if not rows:
        sys.exit("Nenhuma linha válida no CSV (ou filtro --only não casou).")

    total_calls = sum(r["variacoes"] for r in rows)
    out_root = Path(args.out_dir)
    ext = ext_for(args.output_format)

    print(f"Plano: {len(rows)} prompts, {total_calls} chamadas à API, formato {args.output_format}, saída em {out_root}/")
    for r in rows:
        flags = []
        if r["loop"]:
            flags.append("loop")
        if r["duration"] is not None:
            flags.append(f"{r['duration']}s")
        if r["influence"] is not None:
            flags.append(f"infl={r['influence']}")
        print(f"  - {r['categoria']}/{r['nome']}_c01..c{r['variacoes']:02d}.{ext}  [{' '.join(flags) or 'padrões da API'}]  \"{r['prompt'][:70]}\"")
    if args.dry_run:
        print("Dry-run: nada foi gerado. Custo em créditos por chamada não confirmado nesta pesquisa; consulte o painel da ElevenLabs.")
        return 0

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("ELEVENLABS_API_KEY não definida. Ex.: export ELEVENLABS_API_KEY=...  (nunca coloque a chave em arquivo versionado)")
    try:
        import elevenlabs
        from elevenlabs.client import ElevenLabs
    except ImportError:
        sys.exit("SDK ausente: pip install elevenlabs")
    client = ElevenLabs(api_key=api_key)
    sdk_version = getattr(elevenlabs, "__version__", "?")

    prov_path = Path(args.provenance)
    provenance_header(prov_path)

    done = skipped = failed = 0
    with prov_path.open("a", encoding="utf-8") as prov:
        for r in rows:
            dest_dir = out_root / r["categoria"]
            dest_dir.mkdir(parents=True, exist_ok=True)
            for k in range(args.start_index, args.start_index + r["variacoes"]):
                dest = dest_dir / f"{r['nome']}_c{k:02d}.{ext}"
                if dest.exists() and not args.overwrite:
                    skipped += 1
                    continue
                kwargs = {"text": r["prompt"], "model_id": MODEL_ID, "output_format": args.output_format}
                if r["loop"]:
                    kwargs["loop"] = True
                if r["duration"] is not None:
                    kwargs["duration_seconds"] = r["duration"]
                if r["influence"] is not None:
                    kwargs["prompt_influence"] = r["influence"]
                for attempt in range(args.retries + 1):
                    try:
                        data = b"".join(client.text_to_sound_effects.convert(**kwargs))
                        write_audio(dest, data, args.output_format, args.pcm_channels)
                        prov.write(provenance_line(dest, r, args.output_format, sdk_version))
                        prov.flush()
                        done += 1
                        print(f"ok  {dest} ({len(data)/1024:.0f} KB)")
                        break
                    except Exception as exc:  # noqa: BLE001 — qualquer erro da API/rede
                        if attempt < args.retries:
                            wait = 2.0 * (attempt + 1)
                            print(f"erro em {dest.name}: {exc!s:.200} — tentando de novo em {wait:.0f}s", file=sys.stderr)
                            time.sleep(wait)
                        else:
                            failed += 1
                            print(f"FALHOU {dest.name}: {exc!s:.300}", file=sys.stderr)
                time.sleep(args.sleep)

    print(f"Concluído: {done} gerados, {skipped} pulados (já existiam), {failed} falhas. PROVENANCE: {prov_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
