name = "advance_stage"
description = "确认当前阶段完成，推进到下一阶段"
parameters = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "阶段完成摘要",
        },
    },
    "required": ["summary"],
}


def execute(summary: str) -> str:
    return f"阶段推进：{summary}"
