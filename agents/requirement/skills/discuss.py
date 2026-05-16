name = "discuss_with_agent"
description = "与其他 agent 讨论需求相关问题（如技术可行性、架构影响等）"
parameters = {
    "type": "object",
    "properties": {
        "agent_name": {
            "type": "string",
            "description": "要讨论的 agent 名称，如 design、developer",
        },
        "topic": {
            "type": "string",
            "description": "讨论主题",
        },
        "max_rounds": {
            "type": "integer",
            "description": "最大讨论轮次，默认50",
            "default": 50,
        },
    },
    "required": ["agent_name", "topic"],
}


def execute(agent_name: str, topic: str, max_rounds: int = 50) -> str:
    return f"已发起与 {agent_name} 的讨论：{topic}"
