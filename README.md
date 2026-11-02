# ContinuityOS

Evidence-driven AI knowledge handover platform.

## Structure

- `frontend/` - React + TypeScript + Vite + Tailwind CSS
- `backend/` - FastAPI + SQLAlchemy + Alembic
- `docker-compose.yml` - local development stack (PostgreSQL, backend, frontend)

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (or Docker)

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env
# edit .env as needed
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000. API docs at http://localhost:8000/docs.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

## Tests

```bash
cd backend
pytest -q
```

## Docker

```bash
docker compose up --build
```

## Notes

- Step 1 scaffolding only. Document processing, AI extraction, reporting and advanced authz come in later phases.
- Never invent information absent from source documents; every extracted claim must retain its source reference (enforced in later phases).
