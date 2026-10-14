
import os
import smtplib

from datetime import datetime
from zoneinfo import ZoneInfo
from email.message import EmailMessage

from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Memory

load_dotenv()

LOCAL_TZ = ZoneInfo("Asia/Kolkata")


def as_indian_time(value: datetime) -> datetime:
    """Interpret naive database datetimes as Indian local time."""
    if value.tzinfo is None:
        return value.replace(tzinfo=LOCAL_TZ)

    return value.astimezone(LOCAL_TZ)


def send_reminder_email(memory: Memory) -> None:
    """Send an email reminder for a due memory."""

    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_APP_PASSWORD")
    recipient = os.getenv("REMINDER_RECIPIENT")

    if not all([smtp_email, smtp_password, recipient]):
        raise RuntimeError(
            "Set SMTP_EMAIL, SMTP_APP_PASSWORD, and "
            "REMINDER_RECIPIENT in your .env file."
        )

    message = EmailMessage()
    message["Subject"] = f"LifeLoop reminder: {memory.title}"
    message["From"] = smtp_email
    message["To"] = recipient

    message.set_content(
        f"""Hello!

LifeLoop found a memory that is due.

Memory: {memory.title}
Person: {memory.person_name or 'Not specified'}
Item: {memory.item_name or 'Not specified'}
Due date: {as_indian_time(memory.due_at) if memory.due_at else 'Not specified'}
Original note: {memory.raw_text}

Open LifeLoop to review this memory.
"""
    )

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(message)


def check_due_reminders() -> None:
    """Send emails for due pending memories, once per memory."""

    now = datetime.now(LOCAL_TZ)

    with Session(engine) as db:
        memories = db.scalars(
            select(Memory).where(
                Memory.status == "pending",
                Memory.due_at.is_not(None),
                Memory.reminder_sent_at.is_(None),
            )
        ).all()

        for memory in memories:
            try:
                due_at = as_indian_time(memory.due_at)

                if due_at > now:
                    continue

                send_reminder_email(memory)

                memory.reminder_sent_at = datetime.now(LOCAL_TZ)
                db.commit()

                print(
                    f"Reminder email sent for memory {memory.id}"
                )

            except Exception as exc:
                db.rollback()
                print(
                    f"Reminder email failed for memory "
                    f"{memory.id}: {exc}"
                )
