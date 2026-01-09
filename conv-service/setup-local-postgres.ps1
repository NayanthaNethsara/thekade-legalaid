# Local PostgreSQL + pgvector Setup for RAG Development
# Run this script to set up local database

Write-Host "🚀 Setting up local PostgreSQL with pgvector..." -ForegroundColor Cyan

# Check if Docker is available
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerAvailable) {
    Write-Host "❌ Docker not found. Please install Docker Desktop first:" -ForegroundColor Red
    Write-Host "   https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker found" -ForegroundColor Green

# Check if container already exists
$existingContainer = docker ps -a --filter "name=postgres-rag" --format "{{.Names}}"
if ($existingContainer -eq "postgres-rag") {
    Write-Host "⚠️  Container 'postgres-rag' already exists" -ForegroundColor Yellow
    $choice = Read-Host "Do you want to remove and recreate it? (y/n)"
    if ($choice -eq "y") {
        Write-Host "Stopping and removing existing container..." -ForegroundColor Yellow
        docker stop postgres-rag 2>$null
        docker rm postgres-rag 2>$null
    } else {
        Write-Host "Using existing container..." -ForegroundColor Green
        docker start postgres-rag
        Start-Sleep -Seconds 3
        Write-Host "✅ Container started" -ForegroundColor Green
        exit 0
    }
}

# Create new container
Write-Host "`n📦 Creating PostgreSQL container with pgvector..." -ForegroundColor Cyan
docker run -d `
  --name postgres-rag `
  -e POSTGRES_PASSWORD=localpassword `
  -e POSTGRES_DB=legalaid_rag_dev `
  -p 5433:5432 `
  ankane/pgvector:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create container" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Container created successfully" -ForegroundColor Green

# Wait for PostgreSQL to be ready
Write-Host "`n⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Test connection
Write-Host "`n🔍 Testing connection..." -ForegroundColor Cyan
$testResult = docker exec postgres-rag psql -U postgres -d legalaid_rag_dev -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
    Write-Host "`nConnection details:" -ForegroundColor Cyan
    Write-Host "  Host: localhost" -ForegroundColor White
    Write-Host "  Port: 5433" -ForegroundColor White
    Write-Host "  Database: legalaid_rag_dev" -ForegroundColor White
    Write-Host "  User: postgres" -ForegroundColor White
    Write-Host "  Password: localpassword" -ForegroundColor White
    Write-Host "`n📝 Connection string:" -ForegroundColor Cyan
    Write-Host "  postgresql://postgres:localpassword@localhost:5433/legalaid_rag_dev" -ForegroundColor Yellow
    
    Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Copy .env.local.example to .env" -ForegroundColor White
    Write-Host "     cp .env.local.example .env" -ForegroundColor Gray
    Write-Host "  2. Update OPENAI_API_KEY in .env" -ForegroundColor White
    Write-Host "  3. Run schema setup:" -ForegroundColor White
    Write-Host "     python run_rag_setup.py" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to connect to PostgreSQL" -ForegroundColor Red
    Write-Host "Error: $testResult" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Local PostgreSQL setup complete!" -ForegroundColor Green
