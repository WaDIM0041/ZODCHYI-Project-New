
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from .models import Task, TaskEvidence, UserRole, TaskStatus
from .schemas import StatusUpdate, TaskRead

router = APIRouter()

def get_db():
    # Placeholder for DB session
    pass

@router.patch("/tasks/{task_id}/status", response_model=TaskRead)
def update_task_status(
    task_id: int, 
    update: StatusUpdate, 
    current_user: dict, # Mocked user from Auth (contains 'role')
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    new_status = update.new_status
    user_role = current_user['role']

    # Администратор может менять любой статус без ограничений флоу
    if user_role == UserRole.ADMIN:
        task.status = new_status
        if update.comment:
            task.supervisor_comment = update.comment
        db.commit()
        db.refresh(task)
        return task

    # --- STATE MACHINE LOGIC FOR OTHER ROLES ---
    
    # 1. TODO -> IN_PROGRESS (Foreman only)
    if old_status == TaskStatus.TODO and new_status == TaskStatus.IN_PROGRESS:
        if user_role != UserRole.FOREMAN:
            raise HTTPException(status_code=403, detail="Только прораб может начать задачу")
    
    # 2. IN_PROGRESS -> REVIEW (Foreman only, requires Evidence)
    elif old_status == TaskStatus.IN_PROGRESS and new_status == TaskStatus.REVIEW:
        if user_role != UserRole.FOREMAN:
            raise HTTPException(status_code=403, detail="Только прораб может отправить на проверку")
        evidence_count = db.query(TaskEvidence).filter(TaskEvidence.task_id == task_id).count()
        if evidence_count == 0 and not update.evidence_added:
            raise HTTPException(status_code=400, detail="Для завершения требуется фотоотчет")

    # 3. REVIEW -> DONE (Supervisor only)
    elif old_status == TaskStatus.REVIEW and new_status == TaskStatus.DONE:
        if user_role != UserRole.SUPERVISOR:
            raise HTTPException(status_code=403, detail="Только технадзор может принять работу")

    # 4. REVIEW -> REWORK (Supervisor only, requires Comment)
    elif old_status == TaskStatus.REVIEW and new_status == TaskStatus.REWORK:
        if user_role != UserRole.SUPERVISOR:
            raise HTTPException(status_code=403, detail="Только технадзор может вернуть на доработку")
        if not update.comment:
            raise HTTPException(status_code=400, detail="Необходим комментарий для доработки")
        task.supervisor_comment = update.comment

    # 5. REWORK -> REVIEW (Foreman only, requires new photo)
    elif old_status == TaskStatus.REWORK and new_status == TaskStatus.REVIEW:
        if user_role != UserRole.FOREMAN:
            raise HTTPException(status_code=403, detail="Только прораб может отправить на повторную проверку")
        if not update.evidence_added:
             raise HTTPException(status_code=400, detail="Необходимо новое фото после исправления")

    else:
        raise HTTPException(status_code=400, detail=f"Недопустимый переход из {old_status} в {new_status}")

    # Применение изменений
    task.status = new_status
    if user_role == UserRole.FOREMAN and update.comment:
        task.foreman_comment = update.comment
    
    db.commit()
    db.refresh(task)
    return task
