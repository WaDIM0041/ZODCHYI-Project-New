
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from enum import Enum
from datetime import datetime

class TaskStatus(str, Enum):
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    REVIEW = 'review'
    DONE = 'done'
    REWORK = 'rework'

class UserRole(str, Enum):
    ADMIN = 'admin'
    MANAGER = 'manager'
    FOREMAN = 'foreman'
    SUPERVISOR = 'supervisor'

class CommentBase(BaseModel):
    text: str

class CommentCreate(CommentBase):
    project_id: Optional[int] = None
    task_id: Optional[int] = None

class CommentRead(CommentBase):
    id: int
    author_name: str
    author_role: UserRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StatusUpdate(BaseModel):
    new_status: TaskStatus
    comment: Optional[str] = None
    evidence_added: bool = False 

class TaskRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: str
    status: TaskStatus
    foreman_comment: Optional[str] = None
    supervisor_comment: Optional[str] = None
    evidence_count: int = 0
    comments: List[CommentRead] = []

    model_config = ConfigDict(from_attributes=True)

class ProjectRead(BaseModel):
    id: int
    name: str
    client_full_name: str
    city: str
    street: str
    phone: str
    telegram: str
    address: str
    progress: int
    file_links: List[str]
    comments: List[CommentRead] = []

    model_config = ConfigDict(from_attributes=True)
