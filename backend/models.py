
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, JSON, DateTime, Float, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = 'admin'
    MANAGER = 'manager'
    FOREMAN = 'foreman'
    SUPERVISOR = 'supervisor'

class TaskStatus(str, enum.Enum):
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    REVIEW = 'review'
    DONE = 'done'
    REWORK = 'rework'

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(Enum(UserRole), nullable=False)
    password_hash = Column(String)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    client_full_name = Column(String)
    city = Column(String)
    street = Column(String)
    phone = Column(String)
    telegram = Column(String)
    address = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    file_links = Column(JSON)
    progress = Column(Integer, default=0)
    
    comments = relationship("Comment", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String)
    description = Column(String)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    foreman_comment = Column(String)
    supervisor_comment = Column(String)
    
    evidence = relationship("TaskEvidence", back_populates="task")
    comments = relationship("Comment", back_populates="task")

class TaskEvidence(Base):
    __tablename__ = "task_evidence"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    task = relationship("Task", back_populates="evidence")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    author_name = Column(String)
    author_role = Column(Enum(UserRole))
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="comments")
    task = relationship("Task", back_populates="comments")
