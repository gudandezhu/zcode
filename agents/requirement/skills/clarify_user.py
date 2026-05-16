name = "clarify_user"
description = "向用户提问以澄清需求细节"
parameters = {
    "type": "object",
    "properties": {
        "question": {
            "type": "string",
            "description": "要问用户的问题",
        },
    },
    "required": ["question"],
}


def execute(question: str) -> str:
    return f"已向用户提问：{question}"
