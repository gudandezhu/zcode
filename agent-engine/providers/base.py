from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system_prompt: str = "",
    ) -> AsyncIterator[dict]:
        """Yield chunks. Each chunk is one of:
        {"type": "text", "content": "..."}
        {"type": "tool_call", "id": "...", "name": "...", "arguments": "..."}
        {"type": "tool_call_end"}
        {"type": "done"}
        """
        ...
