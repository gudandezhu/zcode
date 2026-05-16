import os
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from engine.session import SessionManager
from engine.agent_loop import AgentLoop
from engine.skill_loader import SkillLoader
from engine.constants import DEFAULT_MAX_ROUNDS, MAX_DISCUSSION_ROUNDS

app = FastAPI(title="Zcode Agent Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

AGENTS_DIR = os.environ.get("AGENTS_DIR", os.path.join(os.path.dirname(__file__), "..", "agents"))
GO_CALLBACK_URL = os.environ.get("GO_CALLBACK_URL", "http://localhost:8000")

skill_loader = SkillLoader(AGENTS_DIR)
session_mgr = SessionManager()
agent_loop = AgentLoop(session_mgr, skill_loader, GO_CALLBACK_URL)


def _task_done_callback(t):
    if not t.cancelled() and t.exception():
        print(f"[server] background task failed: {t.exception()}")


@app.on_event("startup")
async def on_startup():
    session_mgr.start_cleanup()


@app.get("/health")
async def health():
    return {"status": "ok", "agents": skill_loader.list_agents()}


@app.post("/session/create")
async def create_session(request: Request):
    body = await request.json()
    agent_name = body.get("agent_name", "")
    if not agent_name:
        return JSONResponse({"error": "agent_name is required"}, status_code=400)
    task_id = body.get("task_id", "")
    context = body.get("context", "")
    session = session_mgr.create(agent_name=agent_name, task_id=task_id, context=context, session_type="main")
    task = asyncio.create_task(agent_loop.run(session.id))
    task.add_done_callback(_task_done_callback)
    return {"session_id": session.id, "status": "running"}


@app.post("/session/discuss")
async def create_discussion(request: Request):
    body = await request.json()
    initiator = body.get("initiator", "")
    participant = body.get("participant", "")
    if not initiator or not participant:
        return JSONResponse({"error": "initiator and participant are required"}, status_code=400)
    task_id = body.get("task_id", "")
    topic = body.get("topic", "")
    max_rounds = min(body.get("max_rounds", DEFAULT_MAX_ROUNDS), MAX_DISCUSSION_ROUNDS)
    parent_session_id = body.get("parent_session_id", "")

    session = session_mgr.create(
        agent_name=initiator, task_id=task_id, context=topic, session_type="discussion",
        participants=[initiator, participant], max_rounds=max_rounds, parent_session_id=parent_session_id,
    )
    task = asyncio.create_task(agent_loop.run_discussion(session.id))
    task.add_done_callback(_task_done_callback)
    return {"session_id": session.id, "status": "running"}


@app.get("/session/{session_id}/stream")
async def stream_session(session_id: str):
    queue = session_mgr.get_event_queue(session_id)
    if not queue:
        return JSONResponse({"error": "session not found"}, status_code=404)

    async def event_generator():
        while True:
            event = await queue.get()
            if event is None:
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                break
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/session/{session_id}/input")
async def user_input(session_id: str, request: Request):
    body = await request.json()
    message = body.get("message", "")
    session = session_mgr.get(session_id)
    if not session:
        return JSONResponse({"error": "session not found"}, status_code=404)
    await session.user_input_queue.put(message)
    session.status = "running"
    return {"status": "ok"}


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    session = session_mgr.get(session_id)
    if not session:
        return JSONResponse({"error": "session not found"}, status_code=404)
    return session.to_dict()


@app.get("/agents")
async def list_agents():
    return {"agents": skill_loader.list_agents()}


if __name__ == "__main__":
    import uvicorn
    from engine.constants import DEFAULT_PORT
    uvicorn.run(app, host="0.0.0.0", port=DEFAULT_PORT)
