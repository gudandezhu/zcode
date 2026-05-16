import json
import asyncio
import traceback
import httpx
from engine.session import Session, SessionManager
from engine.skill_loader import SkillLoader
from engine.discussion import DiscussionRunner
from engine.constants import MAX_ITERATIONS, CALLBACK_TIMEOUT, SSE_CHANNEL_BUFFER, DEFAULT_MAX_ROUNDS
from providers.registry import get_provider


class AgentLoop:
    def __init__(self, session_mgr: SessionManager, skill_loader: SkillLoader, go_callback_url: str):
        self.session_mgr = session_mgr
        self.skill_loader = skill_loader
        self.go_callback_url = go_callback_url
        self.discussion_runner = DiscussionRunner(session_mgr, skill_loader, go_callback_url)

    async def run(self, session_id: str):
        session = self.session_mgr.get(session_id)
        if not session:
            return
        try:
            await self._run_inner(session)
        except Exception as e:
            traceback.print_exc()
            session.status = "failed"
            await session.emit({"type": "error", "content": str(e)})
            await session.emit_done()
            await self._notify_go(session)

    async def _notify_go(self, session: Session, advance: bool = False):
        payload = {
            "session_id": session.id,
            "task_id": session.task_id,
            "agent_name": session.agent_name,
            "status": session.status,
            "artifacts": session.artifacts,
            "advance": advance,
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.go_callback_url}/api/sessions/callback",
                    json=payload,
                    timeout=CALLBACK_TIMEOUT,
                )
                if resp.status_code != 200:
                    print(f"[agent_loop] callback non-200: {resp.status_code}")
        except Exception as e:
            print(f"[agent_loop] callback failed: {e}")

    async def _finish_session(self, session: Session, advance: bool = False):
        if session.status in ("completed", "failed"):
            await session.emit({"type": "session_completed", "agent": session.agent_name})
            await session.emit_done()
        else:
            await session.emit({"type": "session_state_changed", "status": session.status, "agent": session.agent_name})
        await self._notify_go(session, advance=advance)

    async def _run_inner(self, session: Session):
        agent_cfg = self.skill_loader.get_agent_config(session.agent_name)
        if not agent_cfg:
            await session.emit({"type": "error", "content": f"Agent {session.agent_name} not found"})
            await session.emit_done()
            return

        system_prompt = self.skill_loader.get_system_prompt(session.agent_name)
        if session.context:
            system_prompt += f"\n\n## 任务上下文\n{session.context}"

        skills = self.skill_loader.get_skills(session.agent_name)
        tools = [s.to_tool_schema() for s in skills]
        model = self.skill_loader.get_model(session.agent_name)
        provider = get_provider(model)

        await session.add_message("user", f"请开始工作。任务：{session.context}" if session.context else "请开始工作。")

        for _ in range(MAX_ITERATIONS):
            if session.status != "running":
                break

            full_text, tool_calls = await self._stream_llm(provider, session, tools, system_prompt)

            if full_text or tool_calls:
                msg = {"role": "assistant", "content": full_text}
                if tool_calls:
                    msg["tool_calls"] = tool_calls
                await session.add_message("assistant", full_text, tool_calls=tool_calls)

            if not tool_calls:
                if session.status == "running":
                    session.status = "completed"
                await self._finish_session(session)
                return

            for tc in tool_calls:
                await session.emit({"type": "tool_call", "name": tc["name"], "arguments": tc["arguments"], "agent": session.agent_name})

                result = await self._execute_tool(session, tc, skills)
                await session.add_message("tool", result, tool_call_id=tc["id"], name=tc["name"])

                await session.emit({"type": "tool_result", "name": tc["name"], "content": result, "agent": session.agent_name})

                advance = session.status == "completed" and any(a.get("type") == "stage_advance" for a in session.artifacts)
                if session.status in ("completed", "waiting_user"):
                    await self._finish_session(session, advance=advance)
                    return

        session.status = "completed"
        await self._finish_session(session)

    async def _stream_llm(self, provider, session: Session, tools: list, system_prompt: str) -> tuple[str, list[dict]]:
        full_text = ""
        tool_calls = []
        current_tc = None

        async for chunk in provider.stream(messages=session.messages, tools=tools or None, system_prompt=system_prompt):
            if chunk["type"] == "text":
                full_text += chunk["content"]
                await session.emit({"type": "text", "content": chunk["content"], "agent": session.agent_name})
            elif chunk["type"] == "tool_call":
                if current_tc and current_tc not in tool_calls:
                    tool_calls.append(current_tc)
                current_tc = {"id": chunk["id"], "name": chunk["name"], "arguments": chunk["arguments"]}
            elif chunk["type"] == "tool_call_end":
                if current_tc:
                    tool_calls.append(current_tc)
                    current_tc = None
            elif chunk["type"] == "done":
                if current_tc:
                    tool_calls.append(current_tc)
                    current_tc = None

        return full_text, tool_calls

    async def _execute_tool(self, session: Session, tool_call: dict, skills: list) -> str:
        name = tool_call["name"]
        try:
            args = json.loads(tool_call.get("arguments", "{}"))
        except json.JSONDecodeError:
            args = {}

        if name == "advance_stage":
            session.status = "completed"
            session.artifacts.append({"type": "stage_advance", "task_id": session.task_id})
            return "阶段已推进"

        if name == "clarify_user":
            question = args.get("question", "")
            session.status = "waiting_user"
            await session.emit({"type": "clarify_user", "question": question, "agent": session.agent_name})
            await self._notify_go(session)
            user_response = await session.user_input_queue.get()
            await session.add_message("user", user_response)
            session.status = "running"
            return f"用户回复：{user_response}"

        if name == "discuss_with_agent":
            target = args.get("agent_name", "")
            topic = args.get("topic", "")
            max_rounds = args.get("max_rounds", DEFAULT_MAX_ROUNDS)
            discussion_session = self.session_mgr.create(
                agent_name=session.agent_name, task_id=session.task_id, context=topic,
                session_type="discussion", participants=[session.agent_name, target],
                max_rounds=max_rounds, parent_session_id=session.id,
            )
            result = await self.discussion_runner.run(discussion_session.id)
            return f"讨论结论：{result}"

        if name == "write_artifact":
            artifact = {"type": args.get("artifact_type", "document"), "title": args.get("title", ""), "content": args.get("content", "")}
            session.artifacts.append(artifact)
            return "制品已保存"

        skill = self.skill_loader.get_skill(session.agent_name, name)
        if skill:
            try:
                return await skill.execute(**args) if asyncio.iscoroutinefunction(skill.execute) else skill.execute(**args)
            except Exception as e:
                return f"工具执行失败: {e}"

        return f"未知工具: {name}"

    async def run_discussion(self, session_id: str):
        await self.discussion_runner.run(session_id)
