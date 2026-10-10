#!/usr/bin/env python3
"""Inspeciona um arquivo glTF 2.0 (.glb ou .gltf) e mede o que importa para mobile.

Sem dependências externas. Mede, por malha e instanciado na cena: triângulos, vértices,
materiais e mapas PBR, texturas (formato, dimensões, bytes), alphaMode, UVs (TEXCOORD_0 e
faixa 0–1 quando decodificável), esqueletos, animações (duração) e extensões.

Regra herdada do asset-audit (Claude-Code-Game-Studios, MIT): o que não puder ser medido
sai como "NAO AVALIADO", nunca como estimativa.

Uso:
  inspecionar_glb.py modelo.glb
  inspecionar_glb.py modelo.glb --max-tris 50000 --max-texture 2048 --max-anim-seconds 10 --json

Código de saída: 0 ok; 1 algum orçamento estourado; 2 erro de leitura/argumentos.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import struct
import sys

GLB_MAGIC = 0x46546C67  # 'glTF'
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942

COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16}
NAO_AVALIADO = "NAO AVALIADO"


def ler_arquivo(caminho: str):
    """Retorna (json_dict, lista_de_buffers_bytes_ou_None)."""
    with open(caminho, "rb") as f:
        dados = f.read()
    base = os.path.dirname(os.path.abspath(caminho))
    if len(dados) >= 12 and struct.unpack_from("<I", dados, 0)[0] == GLB_MAGIC:
        versao, tamanho = struct.unpack_from("<II", dados, 4)
        if versao != 2:
            raise ValueError(f"GLB versão {versao} não suportada (esperado 2)")
        pos, gltf, binario = 12, None, None
        while pos + 8 <= min(tamanho, len(dados)):
            clen, ctype = struct.unpack_from("<II", dados, pos)
            corpo = dados[pos + 8 : pos + 8 + clen]
            if ctype == CHUNK_JSON:
                gltf = json.loads(corpo.decode("utf-8"))
            elif ctype == CHUNK_BIN and binario is None:
                binario = corpo
            pos += 8 + clen
        if gltf is None:
            raise ValueError("GLB sem chunk JSON")
    else:
        gltf = json.loads(dados.decode("utf-8"))
        binario = None

    buffers = []
    for i, b in enumerate(gltf.get("buffers", [])):
        uri = b.get("uri")
        if uri is None:
            buffers.append(binario if i == 0 else None)
        elif uri.startswith("data:"):
            buffers.append(base64.b64decode(uri.split(",", 1)[1]))
        else:
            p = os.path.join(base, uri)
            buffers.append(open(p, "rb").read() if os.path.exists(p) else None)
    return gltf, buffers


def bytes_da_bufferview(gltf, buffers, idx):
    bv = gltf["bufferViews"][idx]
    buf = buffers[bv["buffer"]] if bv["buffer"] < len(buffers) else None
    if buf is None:
        return None, bv.get("byteStride")
    ini = bv.get("byteOffset", 0)
    return buf[ini : ini + bv["byteLength"]], bv.get("byteStride")


def dimensoes_imagem(dados: bytes):
    """Retorna (formato, largura, altura) ou (formato, None, None) a partir dos bytes."""
    if dados[:8] == b"\x89PNG\r\n\x1a\n" and len(dados) >= 24:
        w, h = struct.unpack(">II", dados[16:24])
        return "png", w, h
    if dados[:2] == b"\xff\xd8":
        pos = 2
        while pos + 9 < len(dados):
            if dados[pos] != 0xFF:
                pos += 1
                continue
            marcador = dados[pos + 1]
            if marcador in (0xD8, 0x01) or 0xD0 <= marcador <= 0xD7:
                pos += 2
                continue
            seg = struct.unpack(">H", dados[pos + 2 : pos + 4])[0]
            if marcador in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h, w = struct.unpack(">HH", dados[pos + 5 : pos + 9])
                return "jpeg", w, h
            pos += 2 + seg
        return "jpeg", None, None
    if dados[:12] == b"\xabKTX 20\xbb\r\n\x1a\n" and len(dados) >= 28:
        w, h = struct.unpack("<II", dados[20:28])
        return "ktx2", w, h
    if dados[:4] == b"RIFF" and dados[8:12] == b"WEBP" and len(dados) >= 30:
        sub = dados[12:16]
        if sub == b"VP8X":
            w = 1 + int.from_bytes(dados[24:27], "little")
            h = 1 + int.from_bytes(dados[27:30], "little")
            return "webp", w, h
        if sub == b"VP8L":
            b = dados[21:25]
            w = 1 + (((b[1] & 0x3F) << 8) | b[0])
            h = 1 + (((b[3] & 0x0F) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6))
            return "webp", w, h
        if sub == b"VP8 ":
            w = struct.unpack("<H", dados[26:28])[0] & 0x3FFF
            h = struct.unpack("<H", dados[28:30])[0] & 0x3FFF
            return "webp", w, h
        return "webp", None, None
    return "desconhecido", None, None


def info_imagens(gltf, buffers, base):
    saida = []
    for i, img in enumerate(gltf.get("images", [])):
        item = {"indice": i, "nome": img.get("name"), "mimeType": img.get("mimeType"),
                "bytes": None, "formato": NAO_AVALIADO, "largura": None, "altura": None}
        dados = None
        if "bufferView" in img:
            dados, _ = bytes_da_bufferview(gltf, buffers, img["bufferView"])
            item["origem"] = "embutida"
        elif "uri" in img:
            uri = img["uri"]
            if uri.startswith("data:"):
                dados = base64.b64decode(uri.split(",", 1)[1])
                item["origem"] = "data-uri"
            else:
                p = os.path.join(base, uri)
                item["origem"] = uri
                if os.path.exists(p):
                    dados = open(p, "rb").read()
        if dados:
            item["bytes"] = len(dados)
            fmt, w, h = dimensoes_imagem(dados)
            item["formato"], item["largura"], item["altura"] = fmt, w, h
            if w and h:
                item["potencia_de_2"] = (w & (w - 1) == 0) and (h & (h - 1) == 0)
        saida.append(item)
    return saida


def decodificar_vec2_float(gltf, buffers, acc_idx):
    acc = gltf["accessors"][acc_idx]
    if acc.get("componentType") != 5126 or acc.get("type") != "VEC2" or "bufferView" not in acc or "sparse" in acc:
        return None
    dados, stride = bytes_da_bufferview(gltf, buffers, acc["bufferView"])
    if dados is None:
        return None
    stride = stride or 8
    ini = acc.get("byteOffset", 0)
    n = acc["count"]
    if ini + (n - 1) * stride + 8 > len(dados):
        return None
    us, vs = [], []
    for k in range(n):
        u, v = struct.unpack_from("<ff", dados, ini + k * stride)
        us.append(u)
        vs.append(v)
    return min(us), max(us), min(vs), max(vs)


def triangulos_da_primitiva(gltf, prim):
    modo = prim.get("mode", 4)
    if "indices" in prim:
        n = gltf["accessors"][prim["indices"]]["count"]
    else:
        pos = prim.get("attributes", {}).get("POSITION")
        if pos is None:
            return 0
        n = gltf["accessors"][pos]["count"]
    if modo == 4:
        return n // 3
    if modo in (5, 6):
        return max(n - 2, 0)
    return 0  # pontos e linhas não contam como triângulos


def inspecionar(caminho: str):
    gltf, buffers = ler_arquivo(caminho)
    base = os.path.dirname(os.path.abspath(caminho))
    acessores = gltf.get("accessors", [])
    materiais = gltf.get("materials", [])
    texturas = gltf.get("textures", [])
    imagens = info_imagens(gltf, buffers, base)

    malhas = []
    for mi, m in enumerate(gltf.get("meshes", [])):
        tris, verts, prims, mats, uv_ok, uv_faixa = 0, 0, 0, set(), True, []
        for prim in m.get("primitives", []):
            prims += 1
            tris += triangulos_da_primitiva(gltf, prim)
            attrs = prim.get("attributes", {})
            if "POSITION" in attrs:
                verts += acessores[attrs["POSITION"]]["count"]
            if "material" in prim:
                mats.add(prim["material"])
            if "TEXCOORD_0" not in attrs:
                uv_ok = False
            else:
                faixa = decodificar_vec2_float(gltf, buffers, attrs["TEXCOORD_0"])
                uv_faixa.append(faixa)
        uv_dentro = NAO_AVALIADO
        faixas = [f for f in uv_faixa if f]
        if uv_ok and faixas:
            uv_dentro = all(f[0] >= -1e-4 and f[1] <= 1 + 1e-4 and f[2] >= -1e-4 and f[3] <= 1 + 1e-4 for f in faixas)
        malhas.append({"indice": mi, "nome": m.get("name"), "primitivas": prims, "triangulos": tris,
                       "vertices": verts, "materiais": sorted(mats), "tem_TEXCOORD_0": uv_ok,
                       "uv_dentro_de_0_1": uv_dentro})

    # instâncias na cena (nós que referenciam malhas)
    instancias = {}
    for no in gltf.get("nodes", []):
        if "mesh" in no:
            instancias[no["mesh"]] = instancias.get(no["mesh"], 0) + 1
    tris_cena = sum(malhas[mi]["triangulos"] * n for mi, n in instancias.items() if mi < len(malhas))
    tris_unicos = sum(m["triangulos"] for m in malhas)

    def tex_para_imagem(idx):
        if idx is None or idx >= len(texturas):
            return None
        return texturas[idx].get("source")

    mats_info = []
    for i, mt in enumerate(materiais):
        pbr = mt.get("pbrMetallicRoughness", {})
        mapas = {
            "baseColor": tex_para_imagem(pbr.get("baseColorTexture", {}).get("index")),
            "metallicRoughness": tex_para_imagem(pbr.get("metallicRoughnessTexture", {}).get("index")),
            "normal": tex_para_imagem(mt.get("normalTexture", {}).get("index")),
            "occlusion": tex_para_imagem(mt.get("occlusionTexture", {}).get("index")),
            "emissive": tex_para_imagem(mt.get("emissiveTexture", {}).get("index")),
        }
        mats_info.append({"indice": i, "nome": mt.get("name"), "alphaMode": mt.get("alphaMode", "OPAQUE"),
                          "doubleSided": mt.get("doubleSided", False),
                          "metallicFactor": pbr.get("metallicFactor", 1.0),
                          "roughnessFactor": pbr.get("roughnessFactor", 1.0),
                          "mapas_presentes": [k for k, v in mapas.items() if v is not None],
                          "imagem_por_mapa": mapas,
                          "extensoes": sorted(mt.get("extensions", {}).keys())})

    animacoes = []
    for ai, an in enumerate(gltf.get("animations", [])):
        dur = NAO_AVALIADO
        tempos = []
        for s in an.get("samplers", []):
            acc = acessores[s["input"]]
            if "max" in acc and "min" in acc:
                tempos.append(acc["max"][0] - acc["min"][0])
        if tempos:
            dur = round(max(tempos), 3)
        animacoes.append({"indice": ai, "nome": an.get("name"), "canais": len(an.get("channels", [])),
                          "duracao_s": dur})

    esqueletos = [{"indice": i, "ossos": len(s.get("joints", []))} for i, s in enumerate(gltf.get("skins", []))]

    total_bytes_tex = sum(im["bytes"] or 0 for im in imagens)
    maior_tex = max([max(im["largura"] or 0, im["altura"] or 0) for im in imagens] or [0])

    return {
        "arquivo": caminho,
        "tamanho_arquivo_bytes": os.path.getsize(caminho),
        "generator": gltf.get("asset", {}).get("generator"),
        "extensionsUsed": gltf.get("extensionsUsed", []),
        "extensionsRequired": gltf.get("extensionsRequired", []),
        "resumo": {
            "malhas": len(malhas), "primitivas": sum(m["primitivas"] for m in malhas),
            "triangulos_unicos": tris_unicos, "triangulos_na_cena": tris_cena,
            "vertices_unicos": sum(m["vertices"] for m in malhas),
            "materiais": len(materiais), "texturas": len(texturas), "imagens": len(imagens),
            "bytes_de_imagens": total_bytes_tex, "maior_lado_textura": maior_tex if maior_tex else NAO_AVALIADO,
            "esqueletos": len(esqueletos), "animacoes": len(animacoes),
        },
        "malhas": malhas, "materiais": mats_info, "imagens": imagens,
        "esqueletos": esqueletos, "animacoes": animacoes,
    }


def avaliar_orcamento(rel, max_tris, max_tex, max_anim):
    viol = []
    r = rel["resumo"]
    if max_tris is not None and r["triangulos_na_cena"] > max_tris:
        viol.append(f"triangulos_na_cena {r['triangulos_na_cena']} > {max_tris}")
    if max_tex is not None:
        if r["maior_lado_textura"] == NAO_AVALIADO:
            viol.append("textura: dimensões NAO AVALIADO (formato não reconhecido ou buffer externo ausente)")
        elif r["maior_lado_textura"] > max_tex:
            viol.append(f"maior_lado_textura {r['maior_lado_textura']} > {max_tex}")
    if max_anim is not None:
        for a in rel["animacoes"]:
            if a["duracao_s"] != NAO_AVALIADO and a["duracao_s"] > max_anim:
                viol.append(f"animacao '{a['nome']}' {a['duracao_s']}s > {max_anim}s")
    return viol


def imprimir_texto(rel, viol):
    r = rel["resumo"]
    print(f"Arquivo: {rel['arquivo']} ({rel['tamanho_arquivo_bytes']/1024:.1f} KB)  generator={rel['generator']}")
    print(f"Malhas {r['malhas']}  primitivas {r['primitivas']}  tris únicos {r['triangulos_unicos']}  "
          f"tris na cena {r['triangulos_na_cena']}  vértices {r['vertices_unicos']}")
    print(f"Materiais {r['materiais']}  texturas {r['texturas']}  imagens {r['imagens']} "
          f"({r['bytes_de_imagens']/1024/1024:.2f} MB)  maior lado {r['maior_lado_textura']}")
    print(f"Esqueletos {r['esqueletos']}  animações {r['animacoes']}  extensões: "
          f"{', '.join(rel['extensionsUsed']) or '-'}")
    for m in rel["malhas"]:
        print(f"  malha[{m['indice']}] {m['nome']}: {m['triangulos']} tris, {m['vertices']} verts, "
              f"materiais {m['materiais']}, TEXCOORD_0={m['tem_TEXCOORD_0']}, uv 0-1={m['uv_dentro_de_0_1']}")
    for mt in rel["materiais"]:
        print(f"  material[{mt['indice']}] {mt['nome']}: alphaMode={mt['alphaMode']} doubleSided={mt['doubleSided']} "
              f"mapas={mt['mapas_presentes']} ext={mt['extensoes']}")
    for im in rel["imagens"]:
        print(f"  imagem[{im['indice']}] {im['formato']} {im['largura']}x{im['altura']} "
              f"{(im['bytes'] or 0)/1024:.0f} KB pot2={im.get('potencia_de_2', NAO_AVALIADO)}")
    for a in rel["animacoes"]:
        print(f"  animação[{a['indice']}] {a['nome']}: {a['canais']} canais, {a['duracao_s']} s")
    for e in rel["esqueletos"]:
        print(f"  esqueleto[{e['indice']}]: {e['ossos']} ossos")
    if viol:
        print("ORÇAMENTO ESTOURADO:")
        for v in viol:
            print("  - " + v)
    else:
        print("Orçamento: OK (ou nenhum limite informado)")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("arquivo", help="caminho do .glb ou .gltf")
    ap.add_argument("--max-tris", type=int, help="teto de triângulos instanciados na cena (ex.: 50000)")
    ap.add_argument("--max-texture", type=int, help="maior lado de textura permitido em px (ex.: 2048)")
    ap.add_argument("--max-anim-seconds", type=float, help="duração máxima por animação (Apple AR Quick Look: 10)")
    ap.add_argument("--json", action="store_true", help="imprime o relatório completo em JSON")
    args = ap.parse_args(argv)
    try:
        rel = inspecionar(args.arquivo)
    except (OSError, ValueError, KeyError, json.JSONDecodeError, struct.error) as e:
        print(f"erro ao ler {args.arquivo}: {e}", file=sys.stderr)
        return 2
    viol = avaliar_orcamento(rel, args.max_tris, args.max_texture, args.max_anim_seconds)
    rel["violacoes"] = viol
    if args.json:
        print(json.dumps(rel, ensure_ascii=False, indent=2))
    else:
        imprimir_texto(rel, viol)
    return 1 if viol else 0


if __name__ == "__main__":
    sys.exit(main())
