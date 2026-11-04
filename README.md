# ContinuityOS

Evidence-driven project knowledge and handover platform.

**Recorded walkthrough:** [Watch ContinuityOS](demo/ContinueOS.mp4)

**Live deployment:** Not available.

## What you can demonstrate

- Add project sources and extract candidate decisions, tasks, risks, and questions with source evidence.
- Review claims, inspect conflicts, and keep uncertain information unverified until a person confirms it.
- Create and approve a handover, then export it as a PDF.
- Use the seeded **ContinuityOS Reviewer Walkthrough** to see conflicting retention decisions, an outdated milestone, an unassigned task, and private-source filtering. All scenario content is fictional.

The local seeder also adds three portfolio sample projects. Portfolio previews are omitted because they do not depict ContinuityOS.

## Run locally

Prerequisites: Python 3.11+, Node.js 18+, and Windows PowerShell.

Start the backend from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Set-Location backend
$env:DATABASE_URL = "sqlite:///./.runtime.db"
$env:SECRET_KEY = "local-development-secret"
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In another terminal, start the frontend:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open http://localhost:5173 and register the owner account configured in `backend/scripts/seed_demo.py`. Then, from the backend directory with the same database environment, run:

```powershell
..\.venv\Scripts\python.exe -m scripts.seed_demo
```

The API health check is available at http://localhost:8000/api/v1/health.

## Tests

From `backend`:

```powershell
$env:DATABASE_URL = "sqlite:///../continuityos-tests.db"
..\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider --basetemp=../.pytest-tmp
```
