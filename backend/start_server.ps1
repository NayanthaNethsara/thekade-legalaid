#!/usr/bin/env pwsh

# Navigate to backend directory
Set-Location "F:\thekade-legalaid\backend"

# Activate virtual environment
& ".\\.venv\\Scripts\\Activate.ps1"

# Start the FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload