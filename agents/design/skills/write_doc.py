name = "write_artifact"
description = "输出结构化文档作为制品保存"
parameters = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "文档标题",
        },
        "content": {
            "type": "string",
            "description": "文档内容（Markdown格式）",
        },
        "artifact_type": {
            "type": "string",
            "description": "制品类型",
            "default": "document",
        },
    },
    "required": ["title", "content"],
}


def execute(title: str, content: str, artifact_type: str = "document") -> str:
    return f"制品已保存：{title}"
