extends AnimatableBody3D

@export var required_flag := "has_basement_key"
@export var locked := true
@export var open_degrees := -95.0
@export var open_speed := 4.0

var opened := false
var closed_rotation_y := 0.0
var target_rotation_y := 0.0

func _ready() -> void:
    closed_rotation_y = rotation.y
    target_rotation_y = closed_rotation_y

func _physics_process(delta: float) -> void:
    rotation.y = lerp_angle(rotation.y, target_rotation_y, clamp(open_speed * delta, 0.0, 1.0))

func get_prompt() -> String:
    if locked:
        if GameState.has_flag(required_flag):
            return "E：使用钥匙解锁"
        return "门被锁住了"
    return "E：关门" if opened else "E：开门"

func interact(_player: Node) -> void:
    if locked:
        if not GameState.has_flag(required_flag):
            return
        locked = false
        GameState.save_game()

    opened = not opened
    target_rotation_y = closed_rotation_y + deg_to_rad(open_degrees if opened else 0.0)
