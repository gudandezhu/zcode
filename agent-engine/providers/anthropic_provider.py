import json
import os
from anthropic import AsyncAnthropic
from providers.base import LLMProvider
from engine.constants import DEFAULT_MAX_TOKENS


class AnthropicProvider(LLMProvider):
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            kwargs = {"api_key": os.environ.get("ANTHROPIC_API_KEY", "sk-placeholder")}
            base_url = os.environ.get("ANTHROPIC_BASE_URL")
            if base_url:
                kwargs["base_url"] = base_url
            self._client = AsyncAnthropic(**kwargs)
        return self._client

    def _convert_tools(self, tools: list[dict]) -> list[dict]:
        result = []
        for t in tools:
            func = t.get("function", t)
            result.append({
                "name": func["name"],
                "description": func.get("description", ""),
                "input_schema": func.get("parameters", {"type": "object", "properties": {}}),
            })
        return result

    def _convert_messages(self, messages: list[dict]) -> tuple[str, list[dict]]:
        system = ""
        api_msgs = []
        for m in messages:
            if m["role"] == "system":
                system += m["content"] + "\n"
            elif m["role"] == "tool":
                api_msgs.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": m.get("tool_call_id", ""),
                        "content": m["content"],
                    }],
                })
            elif m["role"] == "assistant" and m.get("tool_calls"):
                content_blocks = []
                if m.get("content"):
                    content_blocks.append({"type": "text", "text": m["content"]})
                for tc in m["tool_calls"]:
                    func = tc.get("function", tc)
                    content_blocks.append({
                        "type": "tool_use",
                        "id": tc.get("id", func.get("id", "")),
                        "name": func.get("name", ""),
                        "input": json.loads(func.get("arguments", "{}")),
                    })
                api_msgs.append({"role": "assistant", "content": content_blocks})
            else:
                api_msgs.append({"role": m["role"], "content": m["content"]})
        return system.strip(), api_msgs

    async def stream(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system_prompt: str = "",
    ) -> dict:
        system_from_msgs, api_msgs = self._convert_messages(messages)
        full_system = (system_prompt + "\n" + system_from_msgs).strip()

        kwargs = {
            "model": os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            "max_tokens": DEFAULT_MAX_TOKENS,
            "messages": api_msgs,
        }
        if full_system:
            kwargs["system"] = full_system
        if tools:
            kwargs["tools"] = self._convert_tools(tools)

        tool_calls_acc = {}
        current_tool_id = None
        done_emitted = False

        async with self.client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield {"type": "text", "content": event.delta.text}
                    elif hasattr(event.delta, "partial_json") and event.delta.partial_json:
                        if current_tool_id and current_tool_id in tool_calls_acc:
                            tool_calls_acc[current_tool_id]["arguments"] += event.delta.partial_json
                elif event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        current_tool_id = event.content_block.id
                        tool_calls_acc[event.content_block.id] = {
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "arguments": "",
                        }
                    else:
                        current_tool_id = None
                elif event.type == "message_stop":
                    msg = await stream.get_final_message()
                    if msg.stop_reason == "max_tokens":
                        yield {"type": "text", "content": "[输出被截断]"}
                    # use accumulated arguments; fall back to final message if stream was interrupted
                    for tc_id, tc in tool_calls_acc.items():
                        args_str = tc["arguments"] if tc["arguments"] else None
                        if not args_str:
                            for block in msg.content:
                                if block.type == "tool_use" and block.id == tc_id:
                                    args_str = json.dumps(block.input)
                                    break
                        if not args_str:
                            args_str = "{}"
                        yield {
                            "type": "tool_call",
                            "id": tc_id,
                            "name": tc["name"],
                            "arguments": args_str,
                        }
                    if tool_calls_acc:
                        yield {"type": "tool_call_end"}
                    yield {"type": "done"}
                    done_emitted = True

        if not done_emitted:
            yield {"type": "done"}
