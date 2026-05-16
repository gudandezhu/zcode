import json
import asyncio
from engine.session import Session, SessionManager
from engine.skill_loader import SkillLoader
from providers.registry import get_provider


class DiscussionRunner:
    def __init__(self, session_mgr: SessionManager, skill_loader: SkillLoader, go_callback_url: str):
        self.session_mgr = session_mgr
        self.skill_loader = skill_loader
        self.go_callback_url = go_callback_url

    async def run(self, session_id: str) -> str:
        session = self.session_mgr.get(session_id)
        if not session or len(session.participants) < 2:
            return ""

        initiator = session.participants[0]
        participant = session.participants[1]
        topic = session.context
        max_rounds = session.max_rounds

        # inject topic as first message from initiator
        await session.add_message("user", topic)
        session.current_speaker = initiator

        await session.emit({
            "type": "discussion_started",
            "participants": session.participants,
            "topic": topic,
            "max_rounds": max_rounds,
        })

        discussion_summary = ""

        for round_num in range(1, max_rounds + 1):
            session.current_round = round_num

            # initiator's turn
            msg_i = await self._agent_turn(session, initiator, round_num, "initiator")
            if msg_i is None:
                discussion_summary = f"讨论在第 {round_num} 轮由 {initiator} 结束"
                break

            # check if initiator wants to end
            ended = self._wants_end(msg_i)
            if ended is not None:
                discussion_summary = ended
                break

            # participant's turn
            msg_p = await self._agent_turn(session, participant, round_num, "participant")
            if msg_p is None:
                discussion_summary = f"讨论在第 {round_num} 轮由 {participant} 结束"
                break

            # check if participant wants to end
            ended = self._wants_end(msg_p)
            if ended is not None:
                discussion_summary = ended
                break

        else:
            discussion_summary = f"讨论达到 {max_rounds} 轮上限，自动结束"

        session.status = "completed"
        await session.emit({
            "type": "discussion_completed",
            "summary": discussion_summary,
            "rounds": session.current_round,
        })

        # write conclusion back to parent session
        if session.parent_session_id:
            parent = self.session_mgr.get(session.parent_session_id)
            if parent:
                await parent.add_message("tool", f"[讨论结论 - {topic}]\n{discussion_summary}")

        return discussion_summary

    async def _agent_turn(self, session: Session, agent_name: str, round_num: int, role: str) -> str | None:
        agent_cfg = self.skill_loader.get_agent_config(agent_name)
        if not agent_cfg:
            return None

        system_prompt = self.skill_loader.get_system_prompt(agent_name)
        system_prompt += (
            f"\n\n你正在参与一场讨论。主题：{session.context}\n"
            f"你是 {agent_name}，这是第 {round_num} 轮。\n"
            f"规则：请先阅读对方的观点，然后发表你的看法。\n"
            f"如果你认为讨论已经达成共识，请在回复开头写 [DISCUSSION_END] 然后给出最终结论。\n"
            f"如果需要继续讨论，直接发表你的观点即可。"
        )

        model = self.skill_loader.get_model(agent_name)
        provider = get_provider(model)

        full_text = ""
        async for chunk in provider.stream(
            messages=session.messages,
            system_prompt=system_prompt,
        ):
            if chunk["type"] == "text":
                full_text += chunk["content"]
                await session.emit({
                    "type": "discussion_text",
                    "content": chunk["content"],
                    "agent": agent_name,
                    "round": round_num,
                    "role": role,
                })
            elif chunk["type"] == "done":
                break

        if not full_text.strip():
            # LLM returned empty — skip this turn but don't end discussion
            await session.emit({
                "type": "discussion_text",
                "content": f"[{agent_name} 无回复]",
                "agent": agent_name,
                "round": round_num,
                "role": role,
            })
            return f"[{agent_name} 无响应，跳过]"

        # save as assistant message for next agent to read
        await session.add_message("assistant", full_text, agent=agent_name)
        await session.emit({
            "type": "discussion_turn_end",
            "agent": agent_name,
            "round": round_num,
        })
        return full_text

    def _wants_end(self, message: str) -> str | None:
        if "[DISCUSSION_END]" in message:
            return message.replace("[DISCUSSION_END]", "").strip()
        return None
