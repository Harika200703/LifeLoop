
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Category = Literal["people", "item", "money", "promise", "place", "other"]
Status = Literal["pending", "completed", "archived"]


class MemoryCreate(BaseModel):
    raw_text: str = Field(min_length=1, max_length=5000)
    title: str = Field(min_length=1, max_length=200)
    category: Category = "other"
    person_name: str | None = Field(default=None, max_length=120)
    item_name: str | None = Field(default=None, max_length=200)
    amount: float | None = Field(default=None, ge=0)
    due_at: datetime | None = None
    location: str | None = Field(default=None, max_length=250)


class MemoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    category: Category | None = None
    person_name: str | None = Field(default=None, max_length=120)
    item_name: str | None = Field(default=None, max_length=200)
    amount: float | None = Field(default=None, ge=0)
    due_at: datetime | None = None
    location: str | None = Field(default=None, max_length=250)
    status: Status | None = None


class MemoryRead(BaseModel):
    id: int
    raw_text: str
    title: str
    category: str
    person_name: str | None
    item_name: str | None
    amount: float | None
    due_at: datetime | None
    location: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    reminder_sent_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
