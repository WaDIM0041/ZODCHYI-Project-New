from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

app = FastAPI()

# Разрешаем CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskStatus(str, Enum):
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    REVIEW = 'review'
    DONE = 'done'
    REWORK = 'rework'

class StatusUpdate(BaseModel):
    new_status: TaskStatus
    comment: Optional[str] = None
    evidence_added: bool = False

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Zodchiy Construction API"}

@app.patch("/api/tasks/{task_id}/status")
async def update_status(task_id: int, update: StatusUpdate):
    # Логика State Machine (в демо возвращаем успех)
    return {
        "id": task_id,
        "status": update.new_status,
        "updated_at": "2024-05-20T12:00:00Z"
    }

@app.get("/api/{path:path}")
async def catch_all(path: str):
    return {"error": "Endpoint not found", "path": path}
