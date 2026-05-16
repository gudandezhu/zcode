name = "write_artifact"
description = "输出结构化需求文档作为制品保存"
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
            "default": "requirement_doc",
        },
    },
    "required": ["title", "content"],
}


def execute(title: str, content: str, artifact_type: str = "requirement_doc") -> str:
    return f"需求文档已保存：{title}"
