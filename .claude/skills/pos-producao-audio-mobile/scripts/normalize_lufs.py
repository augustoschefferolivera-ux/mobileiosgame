#!/usr/bin/env python3
"""normalize_lufs.py — normaliza um lote de arquivos de áudio para um alvo de loudness integrado
(LUFS, ITU-R BS.1770-4 via pyloudnorm, MIT) com teto de pico verdadeiro (dBTP), e gera relatório
antes/depois. Padrão: −18 LUFS / −1 dBTP (ASWG-R001, perfil "Game (Mobile)").

Dependências: pip install pyloudnorm soundfile numpy scipy
  (pyloudnorm é MIT. NÃO use LUFSNormalizer: licença PolyForm Noncommercial.)

O script aplica APENAS ganho estático por arquivo (sem compressão/limitação): se o teto de pico
impedir chegar ao alvo, o ganho é reduzido até o pico caber e o relatório marca "limitado_por_pico".
Nesse caso use um limitador no DAW (ou `ffmpeg -af alimiter`) antes, ou aceite o LUFS mais baixo.

Uso:
  normalize_lufs.py ENTRADA [ENTRADA...] [--target-lufs -18] [--true-peak -1] [--out-dir DIR]
  normalize_lufs.py assets/audio/sfx/ui --target-lufs -20 --true-peak -1 --out-dir assets/audio/_norm/ui
  normalize_lufs.py assets/audio/musica/*.wav --dry-run --report relatorio.csv

Entradas: arquivos ou pastas (recursivo com --recursive). Formatos lidos pelo libsndfile (WAV, FLAC,
OGG, CAF, AIFF...). Saída sempre WAV (subtipo por --subtype), nunca sobrescreve a entrada salvo --in-place.

Pico verdadeiro: estimado com sobreamostragem 4× (BS.1770-4, Anexo 2) via scipy.signal.resample_poly.
Arquivos mais curtos que o bloco de 400 ms são preenchidos com silêncio só para a medição (o
gating absoluto descarta os blocos silenciosos); para SFX muito curtos considere --mode peak.
"""
from __future__ import annotations

import argparse
import csv
import datetime as _dt
import sys
from pathlib import Path

np = sf = pyln = resample_poly = None  # carregados por _carregar_dependencias() após o parse de argumentos


def _carregar_dependencias() -> None:
    """Importa as dependências só quando há trabalho a fazer, para que --help funcione sem elas."""
    global np, sf, pyln, resample_poly
    try:
        import numpy as _np
        import soundfile as _sf
        import pyloudnorm as _pyln
        from scipy.signal import resample_poly as _resample_poly
    except ImportError as exc:  # pragma: no cover
        sys.exit(f"Dependência ausente ({exc.name}). Instale: pip install pyloudnorm soundfile numpy scipy")
    np, sf, pyln, resample_poly = _np, _sf, _pyln, _resample_poly

AUDIO_EXT = {".wav", ".flac", ".ogg", ".oga", ".caf", ".aif", ".aiff", ".aifc", ".w64", ".rf64"}


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="normalize_lufs.py",
        description="Normaliza lote de áudio para LUFS integrado alvo com teto de pico verdadeiro (pyloudnorm, BS.1770-4).",
        epilog="Detalhes e exemplos no cabeçalho do script. Alvo mobile ASWG-R001: -18 LUFS / -1 dBTP.",
    )
    p.add_argument("inputs", nargs="+", help="arquivos ou pastas de áudio")
    p.add_argument("--target-lufs", type=float, default=-18.0, help="alvo de loudness integrado em LUFS (padrão -18)")
    p.add_argument("--true-peak", type=float, default=-1.0, help="teto de pico verdadeiro em dBTP (padrão -1)")
    p.add_argument("--mode", choices=["lufs", "peak"], default="lufs",
                   help="lufs: ganho para o alvo LUFS respeitando o teto; peak: só normaliza o pico verdadeiro ao teto (SFX muito curtos)")
    p.add_argument("--out-dir", default=None, help="pasta de saída (padrão: <pasta da entrada>/_norm)")
    p.add_argument("--in-place", action="store_true", help="sobrescreve os arquivos de entrada (use só sobre cópias; masters ficam em ./masters/audio/)")
    p.add_argument("--suffix", default="", help="sufixo adicionado ao nome de saída (ex.: _norm)")
    p.add_argument("--subtype", default="PCM_16", choices=["PCM_16", "PCM_24", "FLOAT"], help="subtipo WAV de saída (padrão PCM_16)")
    p.add_argument("--recursive", action="store_true", help="desce em subpastas")
    p.add_argument("--report", default=None, help="caminho do relatório CSV (padrão: <out-dir>/relatorio_lufs_<data>.csv)")
    p.add_argument("--tolerance", type=float, default=0.5, help="tolerância em LU para considerar o alvo atingido (padrão 0,5)")
    p.add_argument("--dry-run", action="store_true", help="só mede e relata; não grava áudio")
    return p.parse_args(argv)


def collect(inputs: list[str], recursive: bool) -> list[Path]:
    files: list[Path] = []
    for item in inputs:
        pth = Path(item)
        if pth.is_dir():
            it = pth.rglob("*") if recursive else pth.iterdir()
            files += sorted(f for f in it if f.is_file() and f.suffix.lower() in AUDIO_EXT and "_norm" not in f.parts)
        elif pth.is_file():
            files.append(pth)
        else:
            print(f"Aviso: não encontrado: {item}", file=sys.stderr)
    return files


def true_peak_dbtp(data: np.ndarray, rate: int) -> float:
    """Pico verdadeiro em dBTP com sobreamostragem 4x (BS.1770-4 Anexo 2 usa 4x para 48 kHz)."""
    x = data if data.ndim == 2 else data[:, None]
    factor = 4 if rate >= 44100 else 8
    up = resample_poly(x, factor, 1, axis=0)
    peak = float(np.max(np.abs(up))) if up.size else 0.0
    return 20 * np.log10(peak) if peak > 0 else -np.inf


def integrated_lufs(data: np.ndarray, rate: int) -> float:
    meter = pyln.Meter(rate)  # K-weighting, bloco 400 ms, BS.1770-4
    min_len = int(rate * 0.4) + 1
    if len(data) < min_len:
        pad = np.zeros((min_len - len(data),) + data.shape[1:], dtype=data.dtype)
        data = np.concatenate([data, pad], axis=0)
    return float(meter.integrated_loudness(data))


def process(path: Path, args: argparse.Namespace) -> dict:
    data, rate = sf.read(path, dtype="float64", always_2d=True)
    info = sf.info(path)
    row = {
        "arquivo": path.as_posix(), "taxa_hz": rate, "canais": data.shape[1], "duracao_s": round(len(data) / rate, 3),
        "subtipo_entrada": info.subtype, "lufs_antes": None, "dbtp_antes": None, "ganho_db": 0.0,
        "lufs_depois": None, "dbtp_depois": None, "status": "", "saida": "",
    }
    if len(data) == 0:
        row["status"] = "vazio"
        return row

    lufs_in = integrated_lufs(data, rate)
    tp_in = true_peak_dbtp(data, rate)
    row["lufs_antes"] = None if not np.isfinite(lufs_in) else round(lufs_in, 2)
    row["dbtp_antes"] = None if not np.isfinite(tp_in) else round(tp_in, 2)

    if not np.isfinite(lufs_in) or not np.isfinite(tp_in):
        row["status"] = "silencio_ou_abaixo_do_gate"
        return row

    if args.mode == "peak":
        gain_db = args.true_peak - tp_in
        status = "pico_normalizado"
    else:
        gain_db = args.target_lufs - lufs_in
        status = "ok"
        if tp_in + gain_db > args.true_peak:
            gain_db = args.true_peak - tp_in
            status = "limitado_por_pico"

    out = data * (10 ** (gain_db / 20))
    lufs_out = integrated_lufs(out, rate)
    tp_out = true_peak_dbtp(out, rate)
    if args.mode == "lufs" and status == "ok" and abs(lufs_out - args.target_lufs) > args.tolerance:
        status = "fora_da_tolerancia"
    row.update({"ganho_db": round(gain_db, 2), "lufs_depois": round(lufs_out, 2), "dbtp_depois": round(tp_out, 2), "status": status})

    if args.dry_run:
        row["saida"] = "(dry-run)"
        return row

    if args.in_place:
        dest = path
    else:
        out_dir = Path(args.out_dir) if args.out_dir else path.parent / "_norm"
        out_dir.mkdir(parents=True, exist_ok=True)
        dest = out_dir / f"{path.stem}{args.suffix}.wav"
    if args.subtype != "FLOAT":
        out = np.clip(out, -1.0, 1.0)
    sf.write(dest, out.astype("float32") if args.subtype == "FLOAT" else out, rate, subtype=args.subtype)
    row["saida"] = dest.as_posix()
    return row


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    _carregar_dependencias()
    files = collect(args.inputs, args.recursive)
    if not files:
        sys.exit("Nenhum arquivo de áudio encontrado.")
    if args.in_place and args.out_dir:
        sys.exit("Use --in-place OU --out-dir, não ambos.")

    print(f"{len(files)} arquivo(s); modo={args.mode}; alvo={args.target_lufs} LUFS; teto={args.true_peak} dBTP; {'DRY-RUN' if args.dry_run else 'gravando'}")
    rows = []
    for f in files:
        try:
            r = process(f, args)
        except Exception as exc:  # noqa: BLE001
            r = {"arquivo": f.as_posix(), "status": f"erro: {exc!s:.120}"}
        rows.append(r)
        print(f"  {r.get('status',''):22} {str(r.get('lufs_antes')):>8} -> {str(r.get('lufs_depois')):>8} LUFS | "
              f"{str(r.get('dbtp_antes')):>7} -> {str(r.get('dbtp_depois')):>7} dBTP | ganho {r.get('ganho_db', 0):+.2f} dB | {f.name}")

    rep_path = Path(args.report) if args.report else (
        Path(args.out_dir) if args.out_dir else (files[0].parent / "_norm")) / f"relatorio_lufs_{_dt.date.today().isoformat()}.csv"
    rep_path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["arquivo", "taxa_hz", "canais", "duracao_s", "subtipo_entrada", "lufs_antes", "dbtp_antes", "ganho_db",
              "lufs_depois", "dbtp_depois", "status", "saida"]
    with rep_path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    bad = [r for r in rows if r.get("status") not in ("ok", "pico_normalizado")]
    print(f"Relatório: {rep_path}  |  {len(rows) - len(bad)} ok, {len(bad)} com atenção (limitado_por_pico, fora_da_tolerancia, silêncio, erro)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
