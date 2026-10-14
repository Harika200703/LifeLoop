
import json
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, engine, get_db
from app.models import PushSubscription
from app.routers.memories import router as memories_router
from app.services.reminder_service import check_due_reminders

load_dotenv()

scheduler = BackgroundScheduler()


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionRequest(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


class PushTestRequest(BaseModel):
    title: str = "LifeLoop test notification"
    body: str = "Push notifications are connected successfully!"


def get_vapid_settings():
    public_key = os.getenv("VAPID_PUBLIC_KEY")
    private_key = os.getenv("VAPID_PRIVATE_KEY")
    subject = os.getenv("VAPID_SUBJECT")

    if not all([public_key, private_key, subject]):
        raise HTTPException(
            status_code=500,
            detail=(
                "Push notification settings are missing. "
                "Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, "
                "and VAPID_SUBJECT in the backend environment."
            ),
        )

    return public_key, private_key, subject


def send_push_notification(subscription, payload):
    _, private_key, subject = get_vapid_settings()

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        },
    }

    webpush(
        subscription_info=subscription_info,
        data=json.dumps(payload),
        vapid_private_key=private_key,
        vapid_claims={"sub": subject},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any new tables without deleting existing data.
    Base.metadata.create_all(bind=engine)

    # Preserve the existing email reminder scheduler.
    if not scheduler.running:
        scheduler.add_job(
            check_due_reminders,
            trigger="interval",
            minutes=1,
            id="lifeloop_email_reminders",
            replace_existing=True,
            max_instances=1,
        )
        scheduler.start()

    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.app_name,
    description="Backend API for LifeLoop personal memories and follow-ups.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:4174",
        "http://127.0.0.1:4174",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(memories_router)


@app.post("/api/push/subscribe", tags=["Push notifications"])
def save_push_subscription(
    request: SubscriptionRequest,
    db: Session = Depends(get_db),
):
    # Update an existing browser subscription or create a new one.
    subscription = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == request.endpoint)
        .first()
    )

    if subscription is None:
        subscription = PushSubscription(
            endpoint=request.endpoint,
            p256dh=request.keys.p256dh,
            auth=request.keys.auth,
        )
        db.add(subscription)
    else:
        subscription.p256dh = request.keys.p256dh
        subscription.auth = request.keys.auth

    db.commit()

    return {
        "message": "Push subscription saved successfully.",
    }


@app.get("/api/push/public-key", tags=["Push notifications"])
def get_push_public_key():
    public_key, _, _ = get_vapid_settings()
    return {"publicKey": public_key}


@app.post("/api/push/test", tags=["Push notifications"])
def send_test_push(db: Session = Depends(get_db)):
    subscriptions = db.query(PushSubscription).all()

    if not subscriptions:
        raise HTTPException(
            status_code=404,
            detail="No push subscriptions found. Subscribe a browser first.",
        )

    sent = 0
    failed = 0

    for subscription in subscriptions:
        try:
            send_push_notification(
                subscription,
                {
                    "title": "LifeLoop test notification",
                    "body": "Your Android push notification connection works!",
                    "url": "/",
                },
            )
            sent += 1

        except WebPushException as exc:
            failed += 1
            print(f"Push delivery failed: {exc}")

        except Exception as exc:
            failed += 1
            print(f"Unexpected push error: {exc}")

    return {
        "message": "Push test finished.",
        "sent": sent,
        "failed": failed,
    }


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Welcome to LifeLoop API",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
