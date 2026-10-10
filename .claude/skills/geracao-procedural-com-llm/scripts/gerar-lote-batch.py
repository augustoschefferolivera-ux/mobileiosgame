#!/usr/bin/env python3
"""Gera conteúdo estruturado em lote com a Message Batches API da Anthropic (50% de desconto).

Entrada: um JSONL com uma linha por pedido ({"custom_id": "...", "prompt": "..."}), um JSON Schema
(saída estruturada via output_config.format) e um arquivo de system prompt fixo (bíblia do mundo,
>= 512 tokens para entrar no cache). Saída: um JSON por custom_id em --out, já parseado.

Fluxo:
  1) python3 gerar-lote-batch.py --prompts pedidos.jsonl --schema nivel-2d.json --system biblia.txt \
         --out content/gerado/niveis/            # padrão: --dry-run, mostra pedidos e custo estimado
  2) ... --submit                                  # envia e imprime o batch_id
  3) python3 gerar-lote-batch.py --poll <batch_id> --out content/gerado/niveis/   # busca resultados
  4) python3 validar-conteudo.py nivel content/gerado/niveis/ --schema nivel-2d.json

Requisitos para --submit/--poll: `pip install anthropic` e ANTHROPIC_API_KEY no ambiente (só na
máquina de build; nunca no app). Nomes de parâmetros conferidos pela skill `claude-api` em
10/10/2026 (output_config.format, cache_control, messages.batches.*). Preços da estimativa:
https://platform.claude.com/docs/en/about-claude/pricing (Haiku 5.5 batch 0,05/0,25; Sonnet 5.5
batch 1,00/5,00 por MTok) - confira antes de rodar lotes grandes.
"""
import argparse
import json
import os
import sys
import time

PRECO_BATCH = {  # US$ por milhão de tokens (entrada, saída), lidos em 2026-10-10
    "claude-haiku-5-5": (0.05, 0.25),
    "claude-sonnet-5-5": (1.00, 5.00),
    "claude-opus-5-5": (2.00, 10.00),
}


def estimar_tokens(texto: str) -> int:
    # estimativa grosseira (~3,5 chars/token em pt-BR); use count_tokens da API para precisão
    return max(1, int(len(texto) / 3.5))


def ler_pedidos(caminho):
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if linha:
                d = json.loads(linha)
                if "custom_id" not in d or "prompt" not in d:
                    raise SystemExit(f"linha sem custom_id/prompt: {linha[:80]}")
                yield d


def montar_params(modelo, max_tokens, system_text, schema, prompt):
    return {
        "model": modelo,
        "max_tokens": max_tokens,
        "system": [{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": prompt}],
        "output_config": {"format": {"type": "json_schema", "schema": schema}},
    }


def submeter(requests_):
    import anthropic  # importado só aqui para o --dry-run funcionar sem o pacote
    client = anthropic.Anthropic()
    batch = client.messages.batches.create(requests=requests_)
    return batch.id, batch.processing_status


def buscar(batch_id, out_dir, espera):
    import anthropic
    client = anthropic.Anthropic()
    while True:
        b = client.messages.batches.retrieve(batch_id)
        print(f"status: {b.processing_status}; contagens: {b.request_counts}")
        if b.processing_status == "ended":
            break
        if not espera:
            return 2
        time.sleep(60)
    os.makedirs(out_dir, exist_ok=True)
    ok = err = 0
    uso = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}
    for r in client.messages.batches.results(batch_id):  # chega fora de ordem: indexe por custom_id
        if r.result.type == "succeeded":
            msg = r.result.message
            texto = next((b.text for b in msg.content if b.type == "text"), "")
            try:
                dados = json.loads(texto)
            except json.JSONDecodeError:
                err += 1
                print(f"{r.custom_id}: JSON inválido (stop_reason={msg.stop_reason})")
                continue
            with open(os.path.join(out_dir, f"{r.custom_id}.json"), "w", encoding="utf-8") as f:
                json.dump(dados, f, ensure_ascii=False, indent=2)
            u = msg.usage
            uso["input"] += u.input_tokens
            uso["output"] += u.output_tokens
            uso["cache_read"] += getattr(u, "cache_read_input_tokens", 0) or 0
            uso["cache_write"] += getattr(u, "cache_creation_input_tokens", 0) or 0
            ok += 1
        else:
            err += 1
            print(f"{r.custom_id}: {r.result.type}")
    print(f"{ok} salvos, {err} com erro, em {out_dir}; usage agregado: {uso}")
    return 0 if err == 0 else 1


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--prompts", help="JSONL com custom_id e prompt")
    p.add_argument("--schema", help="JSON Schema da resposta")
    p.add_argument("--system", help="arquivo de texto com o system prompt fixo (bíblia)")
    p.add_argument("--model", default="claude-haiku-5-5", help="modelo (padrão: claude-haiku-5-5)")
    p.add_argument("--max-tokens", type=int, default=2000, help="max_tokens por pedido (padrão: 2000)")
    p.add_argument("--out", default="content/gerado", help="diretório de saída")
    p.add_argument("--submit", action="store_true", help="envia o lote (sem isso é --dry-run)")
    p.add_argument("--poll", metavar="BATCH_ID", help="busca resultados de um lote já enviado")
    p.add_argument("--no-wait", action="store_true", help="com --poll, não espera terminar")
    a = p.parse_args()

    if a.poll:
        return buscar(a.poll, a.out, espera=not a.no_wait)

    if not (a.prompts and a.schema and a.system):
        p.error("--prompts, --schema e --system são obrigatórios (ou use --poll)")
    with open(a.schema, encoding="utf-8") as f:
        schema = json.load(f)
    with open(a.system, encoding="utf-8") as f:
        system_text = f.read()
    tokens_system = estimar_tokens(system_text)
    if tokens_system < 512:
        print(f"AVISO: system com ~{tokens_system} tokens (< 512): não entra no cache dos modelos 5.5.", file=sys.stderr)

    requests_, tokens_in, n = [], 0, 0
    for d in ler_pedidos(a.prompts):
        requests_.append({"custom_id": d["custom_id"], "params": montar_params(a.model, a.max_tokens, system_text, schema, d["prompt"])})
        tokens_in += tokens_system + estimar_tokens(d["prompt"])
        n += 1
    if n == 0:
        raise SystemExit("nenhum pedido no JSONL")
    if n > 100_000:
        raise SystemExit("máximo de 100.000 pedidos por lote")

    pe, ps = PRECO_BATCH.get(a.model, (None, None))
    saida_est = n * min(a.max_tokens, 600)  # saída típica de JSON de conteúdo; ajuste
    print(f"{n} pedidos; modelo {a.model}; ~{tokens_in} tokens de entrada (estimativa), ~{saida_est} de saída (estimativa)")
    if pe is not None:
        custo = tokens_in * pe / 1e6 + saida_est * ps / 1e6
        print(f"custo estimado em Batch: ~US$ {custo:.4f} (sem contar desconto extra de cache)")
    else:
        print("modelo sem preço na tabela local; confira na página de preços")

    if not a.submit:
        print("\n--dry-run: primeiro pedido:")
        print(json.dumps(requests_[0], ensure_ascii=False, indent=2)[:2000])
        print("\nUse --submit para enviar.")
        return 0

    batch_id, status = submeter(requests_)
    print(f"batch_id: {batch_id} (status {status}). Busque com: --poll {batch_id} --out {a.out}")
    with open(os.path.join(os.path.dirname(a.out.rstrip('/')) or ".", "lote.log"), "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {batch_id} modelo={a.model} pedidos={n}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
