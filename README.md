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
# Replace SECRET_KEY and configure DATABASE_URL before starting
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
copy .env.example .env
# Set unique SECRET_KEY and POSTGRES_PASSWORD values in .env
docker compose up --build
```

## Current behavior

- The API supports accounts, authenticated project management, source uploads, rule-based text extraction, and project knowledge reconstruction.
- Source uploads are limited to 10 MB. TXT, Markdown, CSV, and JSON can be extracted; PDF and DOCX files can be stored but require a document parser before extraction.
- LLM extraction is optional and requires a provider SDK, API key, and `LLM_PROVIDER` setting. Every saved extracted item must include an excerpt found verbatim in its source.
- The Compose frontend runs Vite for development. Use a separately configured static frontend host and HTTPS reverse proxy for deployment.
