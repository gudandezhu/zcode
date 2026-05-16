import json
import os
from openai import AsyncOpenAI
from providers.base import LLMProvider
from engine.constants import DEFAULT_MAX_TOKENS


class OpenAIProvider(LLMProvider):
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", "sk-placeholder"))
        return self._client

    async def stream(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system_prompt: str = "",
    ) -> dict:
        api_messages = []
        if system_prompt:
            api_messages.append({"role": "system", "content": system_prompt})
        api_messages.extend(messages)

        kwargs = {
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o"),
            "messages": api_messages,
            "stream": True,
        }
        if tools:
            kwargs["tools"] = tools

        response = await self.client.chat.completions.create(**kwargs)

        tool_calls_acc = {}
        done_emitted = False

        async for chunk in response:
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            delta = choice.delta

            if delta.content:
                yield {"type": "text", "content": delta.content}

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls_acc[idx]["id"] = tc.id
                    if tc.function and tc.function.name:
                        tool_calls_acc[idx]["name"] = tc.function.name
                    if tc.function and tc.function.arguments:
                        tool_calls_acc[idx]["arguments"] += tc.function.arguments

            finish = choice.finish_reason
            if finish == "tool_calls":
                for idx in sorted(tool_calls_acc.keys()):
                    tc = tool_calls_acc[idx]
                    yield {"type": "tool_call", "id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]}
                yield {"type": "tool_call_end"}
                tool_calls_acc.clear()
            elif finish in ("stop", "content_filter", "length"):
                if finish == "content_filter":
                    yield {"type": "text", "content": "[内容被过滤]"}
                elif finish == "length":
                    yield {"type": "text", "content": "[输出被截断]"}
                yield {"type": "done"}
                done_emitted = True
                break

        if not done_emitted:
            yield {"type": "done"}
