
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, engine
from app.routers.memories import router as memories_router
from app.services.reminder_service import check_due_reminders

load_dotenv()

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables when the application starts.
    Base.metadata.create_all(bind=engine)

    # Run the email reminder checker every minute.
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
    version="0.3.0",
    lifespan=lifespan,
)

frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

allowed_origins = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:4174",
    "http://127.0.0.1:4174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(memories_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Welcome to LifeLoop API",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
