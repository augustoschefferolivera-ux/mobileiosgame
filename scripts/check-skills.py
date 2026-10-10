#!/usr/bin/env python3
"""Valida o banco de skills e regenera playbook/06-indice-de-skills.md.

Uso:
  python3 scripts/check-skills.py            # valida e regenera o índice
  python3 scripts/check-skills.py --no-index # só valida
  python3 scripts/check-skills.py --help

Regras verificadas (ver playbook/CONVENCOES-DE-SKILLS.md):
  ERRO  frontmatter ausente/ilegível; `name` diferente do diretório; `description` ausente
        ou > 1536 caracteres; arquivo de `references/`/`scripts/` citado e inexistente.
  AVISO corpo > 300 linhas; seções obrigatórias ausentes; `metadata.grupo` ausente.
Sai com código 1 se houver ERRO.
"""
import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS_DIR = os.path.join(ROOT, ".claude", "skills")
INDEX = os.path.join(ROOT, "playbook", "06-indice-de-skills.md")
REQUIRED_SECTIONS = ["quando usar", "pré-requisitos", "passos", "critério de pronto", "fontes"]
GRUPOS = ["processo", "engines", "arte-2d", "3d", "audio", "ia-runtime", "publicacao", "meta"]
FASES = {0:"Preparação do ambiente",1:"Conceito e brief",2:"Engine/alvo e esqueleto",3:"Loop de verificação",
         4:"Direção de arte e áudio",5:"Produção de features",6:"Produção de assets",7:"IA em runtime e procedural",
         8:"Polimento, game feel, performance",9:"Legal, licenças, proveniência",10:"Monetização, submissão, pós-lançamento"}

def parse_frontmatter(text):
    """Parser YAML mínimo: escalares, blocos `>`/`|`, mapas aninhados de 1 nível, listas inline."""
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 4)
    if end < 0:
        return None, text
    fm_text, body = text[4:end], text[end+4:]
    data, lines, i = {}, fm_text.split("\n"), 0
    def parse_scalar(v):
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            return [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
        if v.startswith(("'", '"')) and v.endswith(("'", '"')) and len(v) >= 2:
            return v[1:-1]
        if v.lower() in ("true", "false"):
            return v.lower() == "true"
        if re.fullmatch(r"-?\d+", v):
            return int(v)
        return v
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1; continue
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if not m:
            i += 1; continue
        key, val = m.group(1), m.group(2)
        if val in (">", "|", ">-", "|-"):
            buf = []; i += 1
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or not lines[i].strip()):
                buf.append(lines[i].strip()); i += 1
            data[key] = (" " if val.startswith(">") else "\n").join(b for b in buf if b).strip()
            continue
        if val == "":
            sub = {}; items = []; i += 1
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or not lines[i].strip()):
                s = lines[i].strip()
                if s.startswith("- "):
                    items.append(parse_scalar(s[2:]))
                else:
                    mm = re.match(r"^([\w-]+):\s*(.*)$", s)
                    if mm: sub[mm.group(1)] = parse_scalar(mm.group(2))
                i += 1
            data[key] = items if items else sub
            continue
        data[key] = parse_scalar(val); i += 1
    return data, body

def check_skill(path):
    errors, warnings = [], []
    d = os.path.basename(os.path.dirname(path))
    text = open(path, encoding="utf-8").read()
    fm, body = parse_frontmatter(text)
    if fm is None:
        return {"dir": d, "errors": ["frontmatter ausente (o arquivo deve começar com ---)"], "warnings": [], "fm": {}}
    name = fm.get("name")
    if name != d:
        errors.append(f"name '{name}' difere do diretório '{d}'")
    desc = fm.get("description")
    if not desc:
        errors.append("description ausente")
    elif len(str(desc)) > 1536:
        errors.append(f"description com {len(str(desc))} caracteres (máx. 1536)")
    body_lines = body.count("\n")
    if body_lines > 300:
        warnings.append(f"corpo com {body_lines} linhas (recomendado ≤ 300; mova conteúdo para references/)")
    low = body.lower()
    for sec in REQUIRED_SECTIONS:
        if sec not in low:
            warnings.append(f"seção obrigatória ausente: '{sec}'")
    meta = fm.get("metadata") if isinstance(fm.get("metadata"), dict) else {}
    if not meta.get("grupo"):
        warnings.append("metadata.grupo ausente")
    elif meta.get("grupo") not in GRUPOS:
        warnings.append(f"metadata.grupo '{meta.get('grupo')}' fora de {GRUPOS}")
    skill_dir = os.path.dirname(path)
    for ref in set(re.findall(r"`((?:references|scripts|assets)/[\w./-]+)`", body)):
        if not os.path.exists(os.path.join(skill_dir, ref)):
            errors.append(f"arquivo citado não existe: {ref}")
    for s in glob.glob(os.path.join(skill_dir, "scripts", "*")):
        if os.path.isfile(s) and not os.access(s, os.X_OK) and not s.endswith((".md", ".txt", ".csv", ".json")):
            warnings.append(f"script sem permissão de execução: scripts/{os.path.basename(s)} (chmod +x)")
    return {"dir": d, "errors": errors, "warnings": warnings, "fm": fm, "meta": meta}

def write_index(results):
    ok = [r for r in results if not r["errors"]]
    lines = ["# Índice de skills", "",
             "Gerado por `python3 scripts/check-skills.py`. Não edite à mão. Invoque uma skill com `/nome`",
             "ou deixe o agente carregá-la quando a descrição casar com a tarefa.", "",
             f"Total: {len(ok)} skills válidas.", "", "## Por grupo", ""]
    for g in GRUPOS:
        rs = sorted([r for r in ok if r["meta"].get("grupo") == g], key=lambda r: r["dir"])
        if not rs: continue
        lines.append(f"### {g}"); lines.append("")
        lines.append("| Skill | Alvo | Fases | O que faz |"); lines.append("|---|---|---|---|")
        for r in rs:
            alvo = r["meta"].get("alvo"); alvo = ", ".join(map(str, alvo)) if isinstance(alvo, list) else (alvo or "todos")
            fase = r["meta"].get("fase"); fase = ", ".join(map(str, fase)) if isinstance(fase, list) else (str(fase) if fase not in (None, "") else "-")
            desc = str(r["fm"].get("description", "")).replace("|", "\\|").replace("\n", " ")
            if len(desc) > 220: desc = desc[:217] + "..."
            lines.append(f"| `/{r['dir']}` | {alvo} | {fase} | {desc} |")
        lines.append("")
    sem = sorted([r for r in ok if r["meta"].get("grupo") not in GRUPOS], key=lambda r: r["dir"])
    if sem:
        lines.append("### sem grupo"); lines.append("")
        for r in sem: lines.append(f"- `/{r['dir']}`")
        lines.append("")
    lines.append("## Por fase do roteiro"); lines.append("")
    for n, titulo in FASES.items():
        rs = []
        for r in ok:
            f = r["meta"].get("fase")
            fs = f if isinstance(f, list) else ([f] if f not in (None, "") else [])
            try:
                if n in [int(x) for x in fs]: rs.append(r)
            except (TypeError, ValueError):
                pass
        if rs:
            lines.append(f"- **Fase {n} — {titulo}:** " + ", ".join(f"`/{r['dir']}`" for r in sorted(rs, key=lambda r: r['dir'])))
    lines.append("")
    os.makedirs(os.path.dirname(INDEX), exist_ok=True)
    open(INDEX, "w", encoding="utf-8").write("\n".join(lines))

def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__); return 0
    paths = sorted(glob.glob(os.path.join(SKILLS_DIR, "*", "SKILL.md")))
    if not paths:
        print("Nenhuma skill encontrada em .claude/skills/"); return 1
    results = [check_skill(p) for p in paths]
    n_err = 0
    for r in results:
        for e in r["errors"]:
            print(f"ERRO  {r['dir']}: {e}"); n_err += 1
        for w in r["warnings"]:
            print(f"AVISO {r['dir']}: {w}")
    print(f"\n{len(results)} skills verificadas, {n_err} erro(s).")
    if "--no-index" not in sys.argv:
        write_index(results); print(f"Índice regenerado: {os.path.relpath(INDEX, ROOT)}")
    return 1 if n_err else 0

if __name__ == "__main__":
    sys.exit(main())
