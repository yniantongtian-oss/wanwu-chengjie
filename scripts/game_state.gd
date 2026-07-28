extends Node

const SAVE_PATH := "user://campus_horror_save.json"
var flags: Dictionary = {}

func _ready() -> void:
    load_game()

func set_flag(flag_name: String, value: bool = true) -> void:
    flags[flag_name] = value

func has_flag(flag_name: String) -> bool:
    return bool(flags.get(flag_name, false))

func save_game() -> void:
    var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if file == null:
        push_error("无法写入存档：" + SAVE_PATH)
        return
    file.store_string(JSON.stringify({"flags": flags}))

func load_game() -> void:
    if not FileAccess.file_exists(SAVE_PATH):
        return
    var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
    if file == null:
        return
    var parsed = JSON.parse_string(file.get_as_text())
    if typeof(parsed) == TYPE_DICTIONARY and parsed.has("flags"):
        flags = parsed["flags"]

func reset_game() -> void:
    flags.clear()
    if FileAccess.file_exists(SAVE_PATH):
        DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
