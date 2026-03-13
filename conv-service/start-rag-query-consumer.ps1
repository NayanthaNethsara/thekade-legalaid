#!/usr/bin/env pwsh
# Start the RAG Query Consumer
# This worker consumes RAG queries from NATS JetStream and responds with answers

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Starting RAG Query Consumer" -ForegroundColor Cyan
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
    Write-Host "   The worker will use default environment variables" -ForegroundColor Yellow
    Write-Host ""
}

# Run the RAG query consumer
Write-Host "Starting RAG query consumer..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

try {
    python rag_query_consumer.py
} catch {
    Write-Host "❌ RAG query consumer failed: $_" -ForegroundColor Red
    exit 1
}
