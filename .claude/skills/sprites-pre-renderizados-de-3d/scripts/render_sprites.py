#!/usr/bin/env python3
"""Renderiza sprites 2D a partir de um modelo 3D no Blender headless: câmera ortográfica
(top-down 3/4, isométrica ou lateral), N direções, M frames por ação, iluminação fixa em
relação à câmera, fundo transparente, toon opcional (Workbench flat + contorno, ou EEVEE
cel-shading por nós + Freestyle). Grava PNGs nomeados `<nome>_<acao>_d<dir>_f<frame>.png`
e um `manifest.json` que `montar_atlas_phaser.py` lê para gerar o atlas JSON hash do Phaser.

Uso (os argumentos do script vêm depois de `--`):
  blender -b modelo.glb --python render_sprites.py -- --acoes idle,walk --direcoes 8 --frames 8 \
      --tamanho 256 --saida out/
  blender -b cena.blend --python render_sprites.py -- --acoes all --direcoes 4 --frames 6 --saida out/
  blender -b --python render_sprites.py -- --input modelo.glb --lista          # só lista as ações

Fora do Blender, `python3 render_sprites.py --help` só mostra esta ajuda.

Notas:
- `blender -b modelo.glb` NÃO abre GLB (o Blender só abre .blend pela linha de comando; ele avisa
  "not a blend file" e segue). Este script procura o .glb/.gltf/.fbx/.obj na própria linha de
  comando do Blender e o importa; `--input` tem prioridade. Um `.blend` aberto é usado como está.
- Convenções: origem do modelo nos pés (0,0,0), escala em metros, frente voltada para -Y
  (padrão do importador glTF do Blender: +Z do glTF vira -Y). Direção 0 = personagem de frente
  para a câmera; as direções seguem no sentido horário vistas de cima (ver
  references/direcoes-e-camera.md).
- Nomes de propriedades/operadores `bpy` foram conferidos no código-fonte do Blender (branches
  4.2, 4.5, 5.0 e main em 10/10/2026), mas ESTE SCRIPT NÃO FOI EXECUTADO em um Blender real no
  ambiente em que foi escrito. Valide num modelo pequeno antes do lote e registre a versão do
  Blender no PROVENANCE.md.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time

MESH_EXT = (".glb", ".gltf", ".fbx", ".obj")
ROTULOS = {
    1: ["S"],
    4: ["S", "W", "N", "E"],
    8: ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
    16: ["S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE"],
}


def parse_args(argv=None):
    if argv is None:
        argv = sys.argv
        if "--" in argv:
            argv = argv[argv.index("--") + 1:]
        elif argv and argv[0].endswith(".py"):
            argv = argv[1:]
        else:
            argv = []
    ap = argparse.ArgumentParser(
        prog="blender -b [modelo.glb|cena.blend] --python render_sprites.py --",
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", help="modelo .glb/.gltf/.fbx/.obj (padrão: o arquivo passado ao Blender antes de --python)")
    ap.add_argument("--nome", help="nome base em kebab-case (padrão: nome do arquivo)")
    ap.add_argument("--saida", default="out", help="pasta de saída (cria <saida>/<nome>/)")
    ap.add_argument("--acoes", default="all",
                    help="ações separadas por vírgula (nomes dos clipes/NLA tracks, sem distinguir maiúsculas), "
                         "'all' para todas ou 'static' para um frame parado (padrão: all; sem animação = static)")
    ap.add_argument("--direcoes", type=int, default=8, help="número de direções: 1, 4, 8 ou 16 (padrão 8)")
    ap.add_argument("--frames", type=int, default=8, help="frames por ação, amostrados uniformemente (padrão 8)")
    ap.add_argument("--incluir-ultimo", action="store_true",
                    help="inclui o último frame do clipe (ações sem loop, ex.: attack/death); padrão exclui, para loops")
    ap.add_argument("--tamanho", type=int, default=256, help="lado do frame em px (quadrado; padrão 256)")
    ap.add_argument("--ppm", type=float, default=0.0,
                    help="pixels por metro; fixa a escala entre personagens da mesma família (0 = ajuste automático)")
    ap.add_argument("--margem", type=float, default=0.08, help="folga do ajuste automático (fração; padrão 0.08)")
    ap.add_argument("--elevacao", type=float, default=35.264,
                    help="elevação da câmera em graus: 35.264 = isométrica, 30 = 2:1 pixel-iso, 45–60 = top-down 3/4, 0 = lateral")
    ap.add_argument("--azimute-inicial", type=float, default=0.0, help="azimute da câmera para a direção 0 (graus)")
    ap.add_argument("--sentido", choices=["horario", "anti-horario"], default="horario",
                    help="ordem das direções vista de cima (padrão horário)")
    ap.add_argument("--frente", choices=["-y", "+y", "+x", "-x"], default="-y", help="eixo para onde o modelo olha (padrão -y)")
    ap.add_argument("--pivo", choices=["origem", "centro"], default="origem",
                    help="eixo de rotação e pivot do sprite: origem do modelo (pés) ou centro da caixa envolvente")
    ap.add_argument("--engine", choices=["eevee", "workbench", "cycles"], default="eevee")
    ap.add_argument("--amostras", type=int, default=16, help="amostras do EEVEE/Cycles (padrão 16)")
    ap.add_argument("--sem-aa", action="store_true", help="desliga anti-aliasing e filtro (pixel art)")
    ap.add_argument("--toon", action="store_true",
                    help="look chapado: Workbench flat + contorno; no EEVEE insere Shader to RGB + Color Ramp em cada material")
    ap.add_argument("--toon-degraus", type=int, default=3, help="degraus de luz do cel-shading (padrão 3)")
    ap.add_argument("--contorno", type=float, default=0.0,
                    help="espessura da linha de contorno em px (Freestyle no EEVEE/Cycles; outline do Workbench)")
    ap.add_argument("--luz-azimute", type=float, default=-35.0, help="azimute da luz em relação à câmera (graus; padrão -35 = alto-esquerda)")
    ap.add_argument("--luz-elevacao", type=float, default=50.0, help="elevação da luz (graus; padrão 50)")
    ap.add_argument("--luz-energia", type=float, default=3.0, help="energia da luz solar (padrão 3.0)")
    ap.add_argument("--luz-fixa", choices=["camera", "mundo"], default="camera",
                    help="luz gira com a câmera (sombreado igual em toda direção) ou fica fixa no mundo")
    ap.add_argument("--ambiente", type=float, default=0.3, help="força da luz ambiente do mundo (padrão 0.3)")
    ap.add_argument("--sem-sombra", action="store_true", help="desliga sombras projetadas")
    ap.add_argument("--lista", action="store_true", help="só lista ações/objetos e sai")
    ap.add_argument("--dry-run", action="store_true", help="monta a cena e o manifesto sem renderizar")
    return ap.parse_args(argv)


def kebab(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "sprite"


def arquivo_da_linha_de_comando():
    """Procura um modelo (.glb/.gltf/.fbx/.obj) entre os argumentos que o Blender recebeu antes de `--python`."""
    argv = sys.argv
    fim = argv.index("--python") if "--python" in argv else len(argv)
    for a in argv[:fim]:
        if a.lower().endswith(MESH_EXT) and os.path.exists(a):
            return a
    return None


def main():
    args = parse_args()
    try:
        import bpy  # noqa: F401
    except ImportError:
        print("Este script precisa rodar dentro do Blender:\n"
              "  blender -b modelo.glb --python render_sprites.py -- --acoes idle,walk --direcoes 8 --frames 8 --saida out/",
              file=sys.stderr)
        return 2

    import bpy
    from mathutils import Vector

    t0 = time.time()
    ver = bpy.app.version
    scene_aberta = bool(bpy.data.filepath)
    entrada = args.input or (None if scene_aberta else arquivo_da_linha_de_comando())

    def log(msg):
        print(f"[render_sprites] {msg}")

    # ---------------------------------------------------------------- 1. cena e importação
    if not scene_aberta:
        bpy.ops.wm.read_factory_settings(use_empty=True)
    if entrada:
        ext = os.path.splitext(entrada)[1].lower()
        if ext in (".glb", ".gltf"):
            bpy.ops.import_scene.gltf(filepath=entrada)
        elif ext == ".fbx":
            bpy.ops.import_scene.fbx(filepath=entrada)
        elif ext == ".obj":
            bpy.ops.wm.obj_import(filepath=entrada)
        else:
            print(f"extensão não suportada: {ext}", file=sys.stderr)
            return 2
        log(f"importado {entrada}")
    elif not scene_aberta:
        print("nenhum modelo: passe --input modelo.glb (ou abra um .blend)", file=sys.stderr)
        return 2

    scene = bpy.context.scene
    view_layer = bpy.context.view_layer
    nome = kebab(args.nome or os.path.splitext(os.path.basename(entrada or bpy.data.filepath))[0])
    outdir = os.path.join(os.path.abspath(args.saida), nome)
    os.makedirs(outdir, exist_ok=True)

    meshes = [o for o in scene.objects if o.type == "MESH"]
    animados = [o for o in scene.objects if o.animation_data]
    if not meshes:
        print("a cena não tem malhas", file=sys.stderr)
        return 2

    # ---------------------------------------------------------------- 2. inventário de ações
    # O importador glTF do Blender guarda cada animação como uma NLA track (muda) com o nome da
    # animação do glTF; com uma só animação ela pode ficar como ação ativa. Cobrimos os dois casos.
    tracks_por_nome: dict[str, list] = {}
    for o in animados:
        for tr in o.animation_data.nla_tracks:
            tracks_por_nome.setdefault(tr.name, []).append((o, tr))
    acoes_por_nome = {a.name: a for a in bpy.data.actions}
    disponiveis = list(tracks_por_nome) or list(acoes_por_nome)

    if args.lista:
        log(f"Blender {bpy.app.version_string}; malhas: {[m.name for m in meshes]}")
        log(f"ações (NLA tracks): {list(tracks_por_nome)}; actions: {list(acoes_por_nome)}")
        return 0

    pedido = [a.strip() for a in args.acoes.split(",") if a.strip()]
    if not disponiveis or pedido == ["static"]:
        plano = [("static", None)]
    elif pedido == ["all"]:
        plano = [(n, n) for n in disponiveis]
    else:
        plano = []
        for p in pedido:
            cand = [n for n in disponiveis if n.lower() == p.lower()] or [n for n in disponiveis if p.lower() in n.lower()]
            if not cand:
                print(f"ação '{p}' não encontrada; disponíveis: {disponiveis}", file=sys.stderr)
                return 2
            plano.append((p, cand[0]))

    def intervalo(nome_interno):
        """(frame_start, frame_end) da ação, pela NLA strip ou pela action."""
        if nome_interno in tracks_por_nome:
            ini, fim = None, None
            for _, tr in tracks_por_nome[nome_interno]:
                for st in tr.strips:
                    ini = st.frame_start if ini is None else min(ini, st.frame_start)
                    fim = st.frame_end if fim is None else max(fim, st.frame_end)
            return ini, fim
        a = acoes_por_nome[nome_interno]
        return a.frame_range[0], a.frame_range[1]

    def ativar(nome_interno):
        """Deixa só a animação pedida tocando (NLA: desmuta a track; action: atribui como ativa)."""
        if nome_interno is None:
            return
        if nome_interno in tracks_por_nome:
            for o in animados:
                ad = o.animation_data
                ad.action = None  # a ação ativa sobrepõe a NLA; limpa para a track mandar
                for tr in ad.nla_tracks:
                    tr.mute = tr.name != nome_interno
            return
        act = acoes_por_nome[nome_interno]
        for o in animados:
            ad = o.animation_data
            for tr in ad.nla_tracks:
                tr.mute = True
            ad.action = act
            if hasattr(ad, "action_slot") and getattr(act, "slots", None):  # Blender ≥ 4.4 (ações com slots)
                try:
                    ad.action_slot = act.slots[0]
                except Exception as e:  # noqa: BLE001
                    log(f"AVISO: não definiu action_slot em {o.name}: {e}")

    # ---------------------------------------------------------------- 3. câmera, luz, mundo
    direcoes = max(1, args.direcoes)
    rotulos = ROTULOS.get(direcoes) or [f"d{i}" for i in range(direcoes)]
    frente_az = {"-y": 0.0, "+x": 90.0, "+y": 180.0, "-x": 270.0}[args.frente]
    sinal = -1.0 if args.sentido == "horario" else 1.0

    # caixa envolvente no primeiro frame (para centro e pivot)
    def caixa_mundo():
        dg = bpy.context.evaluated_depsgraph_get()
        pts = []
        for m in meshes:
            ev = m.evaluated_get(dg)
            pts += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
        mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        return mn, mx

    scene.frame_set(scene.frame_start)
    mn, mx = caixa_mundo()
    centro = (mn + mx) / 2
    altura = mx.z - mn.z
    pivo_mundo = Vector((0.0, 0.0, 0.0)) if args.pivo == "origem" else centro
    alvo = Vector((pivo_mundo.x, pivo_mundo.y, centro.z))  # eixo de rotação vertical passa pelo pivot

    rig = bpy.data.objects.new("SpriteRig", None)
    scene.collection.objects.link(rig)
    rig.location = alvo

    cam_data = bpy.data.cameras.new("SpriteCam")
    cam_data.type = "ORTHO"
    cam_data.clip_start = 0.01
    cam_data.clip_end = 1000.0
    cam = bpy.data.objects.new("SpriteCam", cam_data)
    scene.collection.objects.link(cam)
    cam.parent = rig
    dist = max(10.0, 4.0 * max(altura, (mx - mn).length))
    el = math.radians(args.elevacao)
    # em coordenadas do rig: câmera em -Y, inclinada para baixo; rotação X = 90° - elevação olha ao longo de +Y
    cam.location = (0.0, -dist * math.cos(el), dist * math.sin(el))
    cam.rotation_euler = (math.radians(90.0) - el, 0.0, 0.0)
    scene.camera = cam

    luz_data = bpy.data.lights.new("SpriteSun", "SUN")
    luz_data.energy = args.luz_energia
    if hasattr(luz_data, "use_shadow"):
        luz_data.use_shadow = not args.sem_sombra
    luz = bpy.data.objects.new("SpriteSun", luz_data)
    scene.collection.objects.link(luz)
    if args.luz_fixa == "camera":
        luz.parent = rig
    luz.location = alvo if args.luz_fixa == "mundo" else (0.0, 0.0, 0.0)
    # luz solar: só a rotação importa. Elevação e azimute em relação à câmera (-Y do rig = frente da câmera)
    luz.rotation_euler = (math.radians(90.0 - args.luz_elevacao), 0.0, math.radians(args.luz_azimute))

    mundo = bpy.data.worlds.new("SpriteWorld")
    mundo.use_nodes = True
    bg = mundo.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (1.0, 1.0, 1.0, 1.0)
        bg.inputs[1].default_value = args.ambiente
    scene.world = mundo

    # ---------------------------------------------------------------- 4. render settings
    r = scene.render
    r.resolution_x = r.resolution_y = args.tamanho
    r.resolution_percentage = 100
    r.film_transparent = True
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 50
    r.filter_size = 0.0 if args.sem_aa else 1.5
    r.use_motion_blur = False
    scene.view_settings.view_transform = "Standard"   # evita o AgX/Filmic alterar a paleta do style card
    scene.view_settings.look = "None"

    if args.engine == "workbench":
        r.engine = "BLENDER_WORKBENCH"
        sh = scene.display.shading
        sh.light = "FLAT" if args.toon else "STUDIO"
        sh.color_type = "TEXTURE"
        sh.show_shadows = (not args.sem_sombra) and not args.toon
        sh.show_cavity = False
        sh.show_object_outline = args.contorno > 0 or args.toon
        sh.object_outline_color = (0.0, 0.0, 0.0)
        scene.display.render_aa = "OFF" if args.sem_aa else "8"
    elif args.engine == "cycles":
        r.engine = "CYCLES"
        scene.cycles.samples = args.amostras
    else:
        # EEVEE: id 'BLENDER_EEVEE_NEXT' entre 4.2 e 4.5; 'BLENDER_EEVEE' no 5.0+ (e no 4.1-, legado)
        r.engine = "BLENDER_EEVEE_NEXT" if (4, 2, 0) <= ver < (5, 0, 0) else "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = 1 if args.sem_aa else args.amostras
        if hasattr(scene.eevee, "use_raytracing"):
            scene.eevee.use_raytracing = False

    if args.contorno > 0 and args.engine != "workbench":
        r.use_freestyle = True
        r.line_thickness_mode = "ABSOLUTE"
        r.line_thickness = args.contorno
        fs = view_layer.freestyle_settings
        ls = fs.linesets.new("contorno") if not fs.linesets else fs.linesets[0]
        ls.select_silhouette = True
        ls.select_border = True
        ls.select_crease = True
        if ls.linestyle:
            ls.linestyle.color = (0.0, 0.0, 0.0)
            ls.linestyle.thickness = args.contorno

    if args.toon and args.engine == "eevee":
        # cel-shading por nós: Diffuse branco → Shader to RGB → Color Ramp (degraus) × base color → Emission
        for mat in bpy.data.materials:
            if not mat.use_nodes or not mat.node_tree:
                continue
            nt = mat.node_tree
            out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
            if not out or not out.inputs["Surface"].links:
                continue
            bsdf = out.inputs["Surface"].links[0].from_node
            base = bsdf.inputs.get("Base Color") if hasattr(bsdf, "inputs") else None
            dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
            s2rgb = nt.nodes.new("ShaderNodeShaderToRGB")
            ramp = nt.nodes.new("ShaderNodeValToRGB")
            ramp.color_ramp.interpolation = "CONSTANT"
            n = max(2, args.toon_degraus)
            while len(ramp.color_ramp.elements) < n:
                ramp.color_ramp.elements.new(0.5)
            for i, e in enumerate(ramp.color_ramp.elements):
                e.position = i / n
                v = 0.35 + 0.65 * i / (n - 1)
                e.color = (v, v, v, 1.0)
            mult = nt.nodes.new("ShaderNodeVectorMath")
            mult.operation = "MULTIPLY"
            emi = nt.nodes.new("ShaderNodeEmission")
            nt.links.new(dif.outputs["BSDF"], s2rgb.inputs["Shader"])
            nt.links.new(s2rgb.outputs["Color"], ramp.inputs["Fac"])
            nt.links.new(ramp.outputs["Color"], mult.inputs[0])
            if base is not None and base.links:
                nt.links.new(base.links[0].from_socket, mult.inputs[1])
            elif base is not None:
                mult.inputs[1].default_value = base.default_value[:3]
            else:
                mult.inputs[1].default_value = (0.8, 0.8, 0.8)
            nt.links.new(mult.outputs["Vector"], emi.inputs["Color"])
            nt.links.new(emi.outputs["Emission"], out.inputs["Surface"])

    # ---------------------------------------------------------------- 5. enquadramento (ortho_scale) e pivot
    def set_direcao(i):
        rig.rotation_euler = (0.0, 0.0, math.radians(frente_az + args.azimute_inicial + sinal * 360.0 * i / direcoes))
        view_layer.update()

    def amostras_de(nome_interno):
        if nome_interno is None:
            return [float(scene.frame_current)]
        ini, fim = intervalo(nome_interno)
        n = max(1, args.frames)
        if n == 1:
            return [ini]
        div = (n - 1) if args.incluir_ultimo else n
        return [ini + (fim - ini) * k / div for k in range(n)]

    def ir_para(t):
        f = math.floor(t)
        scene.frame_set(int(f), subframe=float(t - f))
        view_layer.update()

    def extensao_projetada():
        """Extensão (largura, altura) da malha no plano da câmera e posição do pivot, em metros."""
        inv = cam.matrix_world.inverted()
        dg = bpy.context.evaluated_depsgraph_get()
        xs, ys = [], []
        for m in meshes:
            ev = m.evaluated_get(dg)
            for c in ev.bound_box:
                p = inv @ (ev.matrix_world @ Vector(c))
                xs.append(p.x)
                ys.append(p.y)
        pv = inv @ pivo_mundo
        return min(xs), max(xs), min(ys), max(ys), pv.x, pv.y

    x0, x1, y0, y1 = math.inf, -math.inf, math.inf, -math.inf
    for _, interno in plano:
        ativar(interno)
        ts = amostras_de(interno)
        for t in (ts[0], ts[len(ts) // 2], ts[-1]):
            ir_para(t)
            for i in range(direcoes):
                set_direcao(i)
                a, b, c, d, _, _ = extensao_projetada()
                x0, x1, y0, y1 = min(x0, a), max(x1, b), min(y0, c), max(y1, d)
    extensao = max(x1 - x0, y1 - y0, 1e-3)
    if args.ppm > 0:
        ortho = args.tamanho / args.ppm
        if extensao > ortho:
            log(f"AVISO: com --ppm {args.ppm} a malha ({extensao:.2f} m) não cabe em {ortho:.2f} m; use --tamanho maior ou --ppm menor")
    else:
        ortho = extensao * (1.0 + args.margem)
    cam_data.ortho_scale = ortho
    ppm = args.tamanho / ortho
    # a câmera já olha para o alvo (centro vertical da caixa no eixo do pivot); o pivot projeta num ponto fixo
    set_direcao(0)
    _, _, _, _, px, py = extensao_projetada()
    pivot = {"x": round(0.5 + px / ortho, 4), "y": round(0.5 - py / ortho, 4)}
    log(f"ortho_scale={ortho:.3f} m, {ppm:.1f} px/m, pivot={pivot}")

    # ---------------------------------------------------------------- 6. render
    manifest = {
        "nome": nome, "blender": bpy.app.version_string, "engine": r.engine, "entrada": entrada or bpy.data.filepath,
        "tamanho": args.tamanho, "ortho_scale": round(ortho, 5), "pixels_por_metro": round(ppm, 2),
        "elevacao": args.elevacao, "pivot": pivot, "fps_cena": scene.render.fps,
        "direcoes": [{"indice": i, "rotulo": rotulos[i], "azimute": round((args.azimute_inicial + sinal * 360.0 * i / direcoes) % 360, 2)}
                     for i in range(direcoes)],
        "acoes": [], "args": vars(args), "padrao_arquivo": "{nome}_{acao}_d{dir}_f{frame:02d}.png",
    }
    total = 0
    for rotulo, interno in plano:
        acao = kebab(rotulo)
        ativar(interno)
        ts = amostras_de(interno)
        ini, fim = (intervalo(interno) if interno else (scene.frame_current, scene.frame_current))
        manifest["acoes"].append({
            "nome": acao, "origem": interno, "frames": len(ts), "frame_inicial": ini, "frame_final": fim,
            "duracao_s": round((fim - ini) / scene.render.fps, 3) if interno else 0.0,
            "loop": not args.incluir_ultimo,
        })
        for d in range(direcoes):
            set_direcao(d)
            for k, t in enumerate(ts):
                ir_para(t)
                r.filepath = os.path.join(outdir, f"{nome}_{acao}_d{d}_f{k:02d}.png")
                if not args.dry_run:
                    bpy.ops.render.render(write_still=True)
                total += 1
        log(f"{acao}: {len(ts)} frames × {direcoes} direções")

    manifest["total_frames"] = total
    manifest["segundos"] = round(time.time() - t0, 1)
    with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    log(f"{'(dry-run) ' if args.dry_run else ''}{total} frames em {outdir} ({manifest['segundos']} s); manifest.json gravado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
