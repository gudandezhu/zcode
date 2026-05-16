name = "advance_stage"
description = "确认需求分析完成，推进任务到下一阶段（设计阶段）"
parameters = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "需求阶段完成摘要",
        },
    },
    "required": ["summary"],
}


def execute(summary: str) -> str:
    return f"阶段推进：{summary}"
