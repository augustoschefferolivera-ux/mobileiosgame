# screenshot_probe.gd — roda como main loop: godot --path <proj> -s <este arquivo> -- --out=<png> --frames=120
# Carrega a cena principal do projeto, espera N frames e salva um PNG do viewport raiz.
# Exige janela (não funciona com --headless); em Linux use xvfb-run.
extends SceneTree

var _out_path: String = "screenshot.png"
var _frames_to_wait: int = 120
var _frames: int = 0
var _done: bool = false

func _initialize() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--out="):
			_out_path = arg.trim_prefix("--out=")
		elif arg.begins_with("--frames="):
			_frames_to_wait = int(arg.trim_prefix("--frames="))
	var main_scene: String = ProjectSettings.get_setting("application/run/main_scene", "")
	if main_scene.is_empty():
		push_error("[probe] application/run/main_scene não definido")
		quit(2)
		return
	var packed: PackedScene = load(main_scene)
	if packed == null:
		push_error("[probe] não carregou %s" % main_scene)
		quit(2)
		return
	var instance: Node = packed.instantiate()
	get_root().add_child(instance)
	print("[probe] cena %s carregada; aguardando %d frames" % [main_scene, _frames_to_wait])

func _process(_delta: float) -> bool:
	if _done:
		return false
	_frames += 1
	if _frames < _frames_to_wait:
		return false
	_done = true
	var image: Image = get_root().get_texture().get_image()
	var dir: String = _out_path.get_base_dir()
	if not dir.is_empty():
		DirAccess.make_dir_recursive_absolute(dir)
	var err: int = image.save_png(_out_path)
	if err != OK:
		push_error("[probe] falha ao salvar %s (erro %d)" % [_out_path, err])
		quit(2)
		return true
	print("[probe] screenshot salvo em %s (%dx%d), fps=%d" % [_out_path, image.get_width(), image.get_height(), Engine.get_frames_per_second()])
	quit(0)
	return true
