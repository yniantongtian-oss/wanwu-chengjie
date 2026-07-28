extends Area3D

@export var flag_name := "has_basement_key"
@export var item_name := "地下室钥匙"

func _ready() -> void:
    if GameState.has_flag(flag_name):
        queue_free()

func _process(delta: float) -> void:
    rotate_y(delta * 1.5)

func get_prompt() -> String:
    return "E：拾取" + item_name

func interact(_player: Node) -> void:
    GameState.set_flag(flag_name, true)
    GameState.save_game()
    queue_free()
