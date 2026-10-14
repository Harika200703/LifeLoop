# LifeLoop Backend — Starter MVP

This starter backend provides a running FastAPI API and CRUD endpoints for LifeLoop memories. SQLite is the default for the first local run so you can test immediately; PostgreSQL is supported by changing `DATABASE_URL` in `.env`.

## Windows PowerShell setup

```powershell
cd path\to\lifeloop-backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8001/docs` to test the API.

## Endpoints

- `GET /health` — health check
- `POST /api/memories` — create a memory
- `GET /api/memories` — list memories; optional `status`, `category`, `search` query parameters
- `GET /api/memories/{id}` — get one memory
- `PATCH /api/memories/{id}` — update fields/status
- `DELETE /api/memories/{id}` — delete a memory

Example request for `POST /api/memories`:

```json
{
  "raw_text": "I lent Rahul my calculator and he will return it tomorrow.",
  "title": "Calculator lent to Rahul",
  "category": "item",
  "person_name": "Rahul",
  "item_name": "Calculator",
  "due_at": "2026-10-10T09:00:00+05:30"
}
```

## PostgreSQL configuration

Create a PostgreSQL database and set this in `.env`:

```env
DATABASE_URL=postgresql+psycopg://lifeloop_user:your_password@localhost:5432/lifeloop
FRONTEND_ORIGIN=http://localhost:5173
```

## Current scope

This is the first backend milestone: memory CRUD and API docs. Authentication, AI extraction, relationships, scheduled reminders, and push notifications are intentionally next milestones, not yet implemented. The current schema is a development MVP and should be migrated with Alembic before production.
