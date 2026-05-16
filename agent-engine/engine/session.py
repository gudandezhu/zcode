import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from engine.constants import SESSION_TTL_SECONDS, CLEANUP_INTERVAL_SECONDS, DEFAULT_MAX_ROUNDS


@dataclass
class Session:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    session_type: str = "main"
    agent_name: str = ""
    task_id: str = ""
    context: str = ""
    participants: list[str] = field(default_factory=list)
    status: str = "running"
    parent_session_id: str = ""
    max_rounds: int = DEFAULT_MAX_ROUNDS
    current_round: int = 0
    artifacts: list[dict] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    current_speaker: str = ""
    # async resources initialized in __post_init__
    user_input_queue: asyncio.Queue = field(default=None, init=False)
    event_queue: asyncio.Queue = field(default=None, init=False)
    _messages: list[dict] = field(default_factory=list, init=False)
    _lock: asyncio.Lock = field(default=None, init=False)

    def __post_init__(self):
        self.user_input_queue = asyncio.Queue()
        self.event_queue = asyncio.Queue()
        self._lock = asyncio.Lock()

    @property
    def messages(self) -> list[dict]:
        return list(self._messages)

    async def add_message(self, role: str, content: str, **extra):
        msg = {"role": role, "content": content}
        msg.update(extra)
        async with self._lock:
            self._messages.append(msg)
            self.updated_at = time.time()

    def is_expired(self) -> bool:
        if self.status in ("running", "waiting_user"):
            return False
        return (time.time() - self.updated_at) > SESSION_TTL_SECONDS

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.session_type,
            "agent_name": self.agent_name,
            "task_id": self.task_id,
            "participants": self.participants,
            "status": self.status,
            "parent_session_id": self.parent_session_id,
            "max_rounds": self.max_rounds,
            "current_round": self.current_round,
            "artifacts": self.artifacts,
            "current_speaker": self.current_speaker,
            "messages": self._messages,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    async def emit(self, event: dict):
        await self.event_queue.put(event)

    async def emit_done(self):
        await self.event_queue.put(None)


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._cleanup_task: asyncio.Task | None = None

    def start_cleanup(self):
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

    async def _periodic_cleanup(self):
        while True:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            self._cleanup_expired()

    def create(
        self,
        agent_name: str,
        task_id: str = "",
        context: str = "",
        session_type: str = "main",
        participants: list[str] | None = None,
        max_rounds: int = DEFAULT_MAX_ROUNDS,
        parent_session_id: str = "",
    ) -> Session:
        session = Session(
            session_type=session_type,
            agent_name=agent_name,
            task_id=task_id,
            context=context,
            participants=participants or [],
            max_rounds=max_rounds,
            parent_session_id=parent_session_id,
        )
        self._sessions[session.id] = session
        self._cleanup_expired()
        return session

    def get(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def get_event_queue(self, session_id: str) -> asyncio.Queue | None:
        s = self._sessions.get(session_id)
        return s.event_queue if s else None

    def list_by_task(self, task_id: str) -> list[Session]:
        return [s for s in self._sessions.values() if s.task_id == task_id]

    def list_discussions(self, parent_session_id: str) -> list[Session]:
        return [s for s in self._sessions.values() if s.parent_session_id == parent_session_id]

    def _cleanup_expired(self):
        expired = [sid for sid, s in self._sessions.items() if s.is_expired()]
        for sid in expired:
            del self._sessions[sid]
