#!/usr/bin/env python3
"""check_provenance.py — audita PROVENANCE.md e LICENCAS.md de um projeto de jogo.

Verifica:
  1. todo asset em --assets (por extensão) tem uma seção ### em PROVENANCE.md;
  2. toda seção tem os campos obrigatórios (tipo, ferramenta, versao, edicao_humana, master, data, licenca);
  3. o master referenciado existe (exceto "n/a ...");
  4. a licença referenciada existe na tabela de LICENCAS.md e não é de classe C ou F
     (D é erro para lançamento global; --allow-territorial rebaixa para aviso);
  5. seções cujo asset não existe mais (órfãs) e assets sem edição humana geram aviso.

Saída legível; código de saída 0 = OK, 1 = erros, 2 = uso inválido. Com --strict, avisos viram erros.
Só biblioteca padrão (Python 3.9+).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

REQUIRED = ("tipo", "ferramenta", "versao", "edicao_humana", "master", "data", "licenca")
DEFAULT_EXTS = (
    "png jpg jpeg webp gif svg ktx2 astc pvr tga psd aseprite "
    "wav mp3 aac m4a caf ogg flac "
    "glb gltf fbx usdz usdc obj blend "
    "ttf otf woff woff2 "
    "txt md json csv"  # texto/diálogo gerado exportado para o build
).split()
BAD_CLASSES = {"C": "não comercial/pesquisa", "F": "litígio em curso"}
TERRITORIAL = "D"
HEADING_RE = re.compile(r"^###\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^-\s+([a-zA-Z_]+)\s*:\s*(.*)$")


def parse_provenance(path: Path) -> dict[str, dict[str, str]]:
    entries: dict[str, dict[str, str]] = {}
    current: str | None = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        m = HEADING_RE.match(line)
        if m:
            current = m.group(1).strip().strip("`")
            entries[current] = {}
            continue
        if current is None:
            continue
        if line.startswith("## "):  # saiu da seção de assets
            current = None
            continue
        f = FIELD_RE.match(line)
        if f:
            entries[current][f.group(1).lower()] = f.group(2).strip()
    return entries


def parse_licenses(path: Path) -> dict[str, str]:
    """Retorna {id: classe} lendo todas as tabelas markdown cujo cabeçalho começa por 'id'."""
    ids: dict[str, str] = {}
    header: list[str] | None = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line.startswith("|"):
            header = None
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if header is None:
            if cells and cells[0].lower() == "id":
                header = [c.lower() for c in cells]
            continue
        if all(set(c) <= set("-: ") for c in cells):  # linha separadora
            continue
        row = dict(zip(header, cells))
        ident = row.get("id", "").strip("`")
        if not ident:
            continue
        classe = row.get("classe", "").strip().upper()
        ids[ident] = classe[:1] if classe else ""
    return ids


def license_id(value: str) -> str:
    v = value.strip().strip("`")
    if "#" in v:
        v = v.split("#", 1)[1]
    return v.strip()


def collect_assets(root: Path, dirs: list[str], exts: set[str], ignore: list[str]) -> list[str]:
    found: list[str] = []
    for d in dirs:
        base = (root / d)
        if not base.exists():
            print(f"aviso: diretório de assets não existe: {base}")
            continue
        for p in sorted(base.rglob("*")):
            if not p.is_file():
                continue
            if p.suffix.lower().lstrip(".") not in exts:
                continue
            rel = p.relative_to(root).as_posix()
            if any(Path(rel).match(g) or re.search(g, rel) for g in ignore):
                continue
            found.append(rel)
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".", help="raiz do projeto (padrão: diretório atual)")
    ap.add_argument("--provenance", default="PROVENANCE.md", help="caminho do PROVENANCE.md (relativo à raiz)")
    ap.add_argument("--licenses", default="LICENCAS.md", help="caminho do LICENCAS.md (relativo à raiz)")
    ap.add_argument("--assets", action="append", default=[], help="diretório de assets do build (repetível)")
    ap.add_argument("--masters", default=None, help="diretório de masters; se dado, exige que cada master esteja dentro dele")
    ap.add_argument("--ext", action="append", default=[], help="extensão extra a considerar asset (repetível)")
    ap.add_argument("--ignore", action="append", default=[], help="glob/regex de caminhos a ignorar (repetível)")
    ap.add_argument("--allow-territorial", action="store_true", help="classe D vira aviso (lançamento só em países dentro do Territory)")
    ap.add_argument("--strict", action="store_true", help="avisos contam como erro")
    ap.add_argument("-q", "--quiet", action="store_true", help="só o resumo")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    prov_path = root / args.provenance
    lic_path = root / args.licenses
    if not prov_path.is_file():
        print(f"erro: PROVENANCE não encontrado: {prov_path}", file=sys.stderr)
        return 2
    if not lic_path.is_file():
        print(f"erro: LICENCAS não encontrado: {lic_path}", file=sys.stderr)
        return 2

    exts = set(DEFAULT_EXTS) | {e.lower().lstrip(".") for e in args.ext}
    entries = parse_provenance(prov_path)
    licenses = parse_licenses(lic_path)
    assets = collect_assets(root, args.assets or ["assets"], exts, args.ignore)

    errors: list[str] = []
    warnings: list[str] = []

    # 1. assets sem entrada
    for a in assets:
        if a not in entries:
            errors.append(f"sem entrada em PROVENANCE: {a}")

    # 2–5. entradas
    for name, fields in entries.items():
        missing = [k for k in REQUIRED if not fields.get(k)]
        if missing:
            errors.append(f"{name}: campos obrigatórios ausentes: {', '.join(missing)}")
        asset_path = root / name
        if not asset_path.exists():
            warnings.append(f"{name}: entrada órfã (arquivo não existe no projeto)")
        master = fields.get("master", "")
        if master and not master.lower().startswith("n/a"):
            mpath = root / master
            if not mpath.is_file():
                errors.append(f"{name}: master não encontrado: {master}")
            elif args.masters and not mpath.resolve().is_relative_to((root / args.masters).resolve()):
                warnings.append(f"{name}: master fora de {args.masters}/: {master}")
        elif master.lower().startswith("n/a") and not fields.get("tipo", "").lower().startswith("c"):
            warnings.append(f"{name}: sem master (n/a); regeneração não é garantia")
        edit = fields.get("edicao_humana", "").strip().lower()
        if edit in ("", "nenhuma", "n/a", "nao", "não", "none"):
            warnings.append(f"{name}: sem intervenção humana registrada (proteção autoral improvável; nível 'gerado')")
        lic = fields.get("licenca", "")
        if lic:
            lid = license_id(lic)
            if lid not in licenses:
                errors.append(f"{name}: licença '{lid}' não existe na tabela de {args.licenses}")
            else:
                cls = licenses[lid]
                if cls in BAD_CLASSES:
                    errors.append(f"{name}: licença '{lid}' é classe {cls} ({BAD_CLASSES[cls]}) — fora do build")
                elif cls == TERRITORIAL:
                    msg = f"{name}: licença '{lid}' é classe D (territorial: saída proibida em UE/UK/Coreia ou similar)"
                    (warnings if args.allow_territorial else errors).append(msg)
                elif cls == "E":
                    warnings.append(f"{name}: licença '{lid}' exige atribuição/aviso (classe E) — confira os créditos")
                elif cls == "":
                    warnings.append(f"{name}: licença '{lid}' sem classe na tabela")

    if args.strict:
        errors.extend(warnings)
        warnings = []

    if not args.quiet:
        for e in errors:
            print(f"ERRO   {e}")
        for w in warnings:
            print(f"AVISO  {w}")
        if errors or warnings:
            print("----")
    print(
        f"Resumo: {len(assets)} asset(s) em {args.assets or ['assets']}, {len(entries)} entrada(s) em {args.provenance}, "
        f"{len(licenses)} licença(s) em {args.licenses}; {len(errors)} erro(s), {len(warnings)} aviso(s)."
    )
    if errors:
        print("Resultado: FALHOU")
        return 1
    print("Resultado: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
