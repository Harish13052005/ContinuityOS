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

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\activate
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

```powershell
cd backend
$env:DATABASE_URL = "sqlite:///../continuityos-tests.db"
..\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider --basetemp=../.pytest-tmp
```

## Docker

```bash
copy .env.example .env
# Set unique SECRET_KEY and POSTGRES_PASSWORD values in .env
docker compose up --build
```

## Product workflow

ContinuityOS stores project sources, extracts candidate claims with source excerpts, supports reviewer status decisions, reconstructs a cautious project view, and builds draft handovers from supported claims. A project owner or reviewer can approve a report; an approved report can be shared with an active ContinuityOS account and downloaded as PDF. Recipient access is checked by the backend.

Supported uploads are TXT, Markdown, CSV, JSON, PDF, and DOCX, up to 10 MB. PDF page locations are preserved when text extraction succeeds. Scanned-image OCR, password-protected PDFs, documents over 500 PDF pages, and DOCX archives expanding beyond 50 MB are unsupported. Sources are stored outside the public web directory; preview and extraction use authenticated APIs.

When no provider is configured, text extraction uses a clearly limited rule-based candidate finder. It is not presented as an LLM. OpenAI and Anthropic adapters validate structured output, require exact source excerpts, treat document text as untrusted, and leave generated claims unverified until human review. Configure keys only in an untracked backend `.env`; real provider calls have not been verified without your provider credentials.

## Environment and migrations

Copy `.env.example` to `backend/.env` for the API and to `frontend/.env` for local Vite development. Replace all example secrets before production. The Docker frontend reads `VITE_API_BASE_URL` at build time, so set it to the browser-reachable API URL before building. The backend refuses placeholder secrets when `ENVIRONMENT=production`.

Run schema migrations before starting a manually managed backend:

```powershell
cd backend
..\.venv\Scripts\alembic.exe upgrade head
```

The migration chain is in `backend/alembic/versions`. Docker Compose runs migrations before starting the API. PostgreSQL is the intended shared database; SQLite is used for local tests and the current local showcase.

## Showcase data

After registering the portfolio owner account, run this idempotent local seeder:

```powershell
cd backend
$env:DATABASE_URL = "sqlite:///./.runtime.db"
..\.venv\Scripts\python.exe -m scripts.seed_demo
```

It adds the three public portfolio projects and a fictional **ContinuityOS Reviewer Walkthrough** workspace. The synthetic workspace contains two contradictory decisions, an outdated sample milestone, an unassigned task, and a private synthetic source to demonstrate review and access filtering. It does not contain real customer information. Seeded collaborators are project membership examples; their passwords are generated and are not demo sign-in accounts. Use the owner account you registered to walk through review, approval, sharing, and PDF export.

## Screenshots

Below are screenshots of the three public portfolio projects demonstrating the ContinuityOS knowledge handover platform capabilities:

### CareerGraph AI
![CareerGraph AI Dashboard](/portfolio/careergraph/dashboard.jpeg)
*Career exploration platform with interactive career graph*

![CareerGraph AI Graph](/portfolio/careergraph/graph.jpeg)
*Interactive career relationship graph*

![CareerGraph AI Career Paths](/portfolio/careergraph/career-path.jpeg)
*Career path recommendations*

### AI Money Mentor
![AI Money Mentor Dashboard](/portfolio/money-mentor/dashboard.jpeg)
*Personal finance planning dashboard*

![AI Money Mentor Financial Plan](/portfolio/money-mentor/financial-plan.jpeg)
*Example financial plan view*

![AI Money Mentor Explanation](/portfolio/money-mentor/explanation.jpeg)
*Example financial explanation view*

### ParkSense
![ParkSense Admin Dashboard](/portfolio/parksense/admin-dashboard.jpg)
*Operations dashboard with bay occupancy map*

![ParkSense Bay Manager](/portfolio/parksense/bay-manager.jpg)
*Parking bay management view*

![ParkSense Customer Dashboard](/portfolio/parksense/customer-dashboard.jpg)
*Customer view with bay allocation*

---

## Docker Compose

The Compose frontend is a built static app served by Nginx, with SPA routing and a health check. The API and PostgreSQL have health checks, and uploaded source files use a persistent local Docker volume. Compose is a self-hosted starting point, not a completed cloud deployment: put it behind HTTPS, configure a durable private object store for uploaded files, set the public API URL and CORS origins, and use managed PostgreSQL before production use.

## Verified behavior and limitations

- Authenticated project APIs, persistent logout revocation, project-member access, source upload/preview/deletion, document text extraction, reviewer decisions, evidence retrieval, project reconstruction, draft handovers, approval, registered-recipient access, and approved PDF export have backend integration coverage.
- Reconstruction reports potential text conflicts and review states. Conflict detection is heuristic and must be confirmed by a person; it does not infer that the latest statement is correct.
- There is no email delivery, password reset, invitation flow, OCR, asynchronous job queue, LLM provider credential, managed object storage, HTTPS endpoint, or production hosting configured in this checkout.
- Frontend production assets build successfully. Docker is not installed in the current development environment, so the Compose image build and container health checks have not been run here.

See [the Round 2 audit](docs/ROUND2_AUDIT.md) for a phase-by-phase implementation matrix and remaining deployment blockers.
