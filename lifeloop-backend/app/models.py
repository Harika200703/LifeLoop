
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    raw_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(40),
        default="other",
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    person_name: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        index=True,
    )

    item_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    amount: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    location: Mapped[str | None] = mapped_column(
        String(250),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # Existing email reminder tracking; preserved.
    reminder_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    __table_args__ = (
        UniqueConstraint(
            "endpoint",
            name="uq_push_subscription_endpoint",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    endpoint: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    p256dh: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    auth: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
