#!/usr/bin/env pwsh
# Start the RAG API Server
# This provides HTTP endpoints for querying the RAG system

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Starting RAG API Server" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "❌ Virtual environment not found. Please run:" -ForegroundColor Red
    Write-Host "   python -m venv .venv" -ForegroundColor Yellow
    Write-Host "   .venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "   pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\.venv\Scripts\Activate.ps1

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "   The API will use default environment variables" -ForegroundColor Yellow
    Write-Host ""
}

# Default host and port
$apiHost = "0.0.0.0"
$port = 8000

# Run the API server
Write-Host "Starting API server on http://$($apiHost):$port" -ForegroundColor Green
Write-Host "API docs: http://localhost:$port/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

try {
    uvicorn app.api:app --host $apiHost --port $port --reload
} catch {
    Write-Host "❌ API server failed: $_" -ForegroundColor Red
    exit 1
}
