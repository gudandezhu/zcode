name = "decompose"
description = "将需求拆分为子任务列表"
parameters = {
    "type": "object",
    "properties": {
        "subtasks": {
            "type": "array",
            "items": {"type": "string"},
            "description": "拆分后的子任务列表",
        },
    },
    "required": ["subtasks"],
}


def execute(subtasks: list[str]) -> str:
    result = "需求已拆分为以下子任务：\n"
    for i, task in enumerate(subtasks, 1):
        result += f"  {i}. {task}\n"
    return result
