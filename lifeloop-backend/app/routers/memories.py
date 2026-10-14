from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.services.memory_extractor import extract_memory
from app.database import get_db
from app.models import Memory
from app.schemas import MemoryCreate, MemoryRead, MemoryUpdate

router = APIRouter(prefix="/api/memories", tags=["Memories"])


@router.post("", response_model=MemoryRead, status_code=status.HTTP_201_CREATED)
def create_memory(payload: MemoryCreate, db: Session = Depends(get_db)):
    memory = Memory(**payload.model_dump())
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@router.get("", response_model=list[MemoryRead])
def list_memories(
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Memory).order_by(Memory.created_at.desc())
    if status_filter:
        query = query.where(Memory.status == status_filter)
    if category:
        query = query.where(Memory.category == category)
    if search:
        pattern = f"%{search}%"
        query = query.where((Memory.raw_text.ilike(pattern)) | (Memory.title.ilike(pattern)) | (Memory.person_name.ilike(pattern)))
    return list(db.scalars(query).all())


@router.get("/{memory_id}", response_model=MemoryRead)
def get_memory(memory_id: int, db: Session = Depends(get_db)):
    memory = db.get(Memory, memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.patch("/{memory_id}", response_model=MemoryRead)
def update_memory(memory_id: int, payload: MemoryUpdate, db: Session = Depends(get_db)):
    memory = db.get(Memory, memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(memory, key, value)
    db.commit()
    db.refresh(memory)
    return memory


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    memory = db.get(Memory, memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(memory)
    db.commit()

from fastapi import Body


@router.post(
    "/capture",
    response_model=MemoryRead,
    status_code=status.HTTP_201_CREATED,
)
def capture_memory(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    raw_text = payload.get("text")

    if not isinstance(raw_text, str) or not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Please provide a non-empty 'text' field.",
        )

    if len(raw_text) > 5000:
        raise HTTPException(
            status_code=422,
            detail="Memory text must not exceed 5000 characters.",
        )

    extracted = extract_memory(raw_text)
    memory = Memory(**extracted)

    db.add(memory)
    db.commit()
    db.refresh(memory)

    return memory
