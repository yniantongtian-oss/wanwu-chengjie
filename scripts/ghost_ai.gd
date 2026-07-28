extends CharacterBody3D

@export var target_path: NodePath
@export var activation_flag := "has_basement_key"
@export var activation_distance := 30.0
@export var chase_speed := 2.8
@export var catch_distance := 1.25

@onready var target: Node3D = get_node_or_null(target_path)

func _physics_process(_delta: float) -> void:
    if target == null:
        return
    if activation_flag != "" and not GameState.has_flag(activation_flag):
        velocity = Vector3.ZERO
        return

    var offset := target.global_position - global_position
    var distance := offset.length()
    if distance > activation_distance:
        velocity = Vector3.ZERO
        return

    var direction := Vector3(offset.x, 0.0, offset.z).normalized()
    if direction.length_squared() > 0.001:
        look_at(global_position + direction, Vector3.UP)
    velocity.x = direction.x * chase_speed
    velocity.z = direction.z * chase_speed
    if not is_on_floor():
        velocity += get_gravity() * get_physics_process_delta_time()
    move_and_slide()

    if distance <= catch_distance and target.has_method("on_caught"):
        target.call("on_caught")
