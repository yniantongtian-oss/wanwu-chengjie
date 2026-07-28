extends "res://scripts/proto_controller.gd"

@onready var flashlight: SpotLight3D = $Head/Camera3D/Flashlight
@onready var interaction_ray: RayCast3D = $Head/Camera3D/InteractionRay
@onready var prompt_label: Label = $HUD/Prompt
@onready var status_label: Label = $HUD/Status

var caught := false

func _ready() -> void:
    _ensure_input_actions()
    super._ready()
    capture_mouse()
    interaction_ray.enabled = true
    _update_status()

func _unhandled_input(event: InputEvent) -> void:
    super._unhandled_input(event)
    if Input.is_action_just_pressed("interact"):
        _try_interact()
    if Input.is_action_just_pressed("flashlight"):
        flashlight.visible = not flashlight.visible

func _process(_delta: float) -> void:
    prompt_label.text = ""
    if interaction_ray.is_colliding():
        var target := interaction_ray.get_collider()
        if target != null and target.has_method("get_prompt"):
            prompt_label.text = str(target.call("get_prompt"))
    _update_status()

func _try_interact() -> void:
    if not interaction_ray.is_colliding():
        return
    var target := interaction_ray.get_collider()
    if target != null and target.has_method("interact"):
        target.call("interact", self)

func _update_status() -> void:
    var key_text := "已获得地下室钥匙" if GameState.has_flag("has_basement_key") else "尚未找到钥匙"
    var light_text := "手电：开" if flashlight.visible else "手电：关"
    status_label.text = key_text + "\n" + light_text

func on_caught() -> void:
    if caught:
        return
    caught = true
    can_move = false
    status_label.text = "你被抓住了……"
    release_mouse()
    await get_tree().create_timer(1.0).timeout
    get_tree().reload_current_scene()

func _ensure_input_actions() -> void:
    _add_key_action("move_left", KEY_A)
    _add_key_action("move_right", KEY_D)
    _add_key_action("move_forward", KEY_W)
    _add_key_action("move_back", KEY_S)
    _add_key_action("jump", KEY_SPACE)
    _add_key_action("sprint", KEY_SHIFT)
    _add_key_action("interact", KEY_E)
    _add_key_action("flashlight", KEY_F)

func _add_key_action(action_name: StringName, physical_key: Key) -> void:
    if InputMap.has_action(action_name):
        return
    InputMap.add_action(action_name)
    var event := InputEventKey.new()
    event.physical_keycode = physical_key
    InputMap.action_add_event(action_name, event)
