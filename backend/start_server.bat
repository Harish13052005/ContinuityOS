@echo off
cd /d C:\Users\Hp\Documents\GitHub\ContinuityOS\backend
python -m uvicorn app.main:app --reload --env-file .env