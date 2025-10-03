#!/usr/bin/env python3
"""
Startup script for the LegalAid backend server.
This script sets up the Python path and starts the FastAPI server.
"""
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Change working directory to backend so .env file is found
os.chdir(backend_dir)

# Now we can import and run the app
if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    print("🚀 Starting LegalAid Backend Server...")
    print(f"📁 Backend directory: {backend_dir}")
    print(f"📁 Working directory: {os.getcwd()}")
    print("🌐 Server will be available at: http://localhost:8000")
    print("📚 API docs will be available at: http://localhost:8000/docs")
    print("🔍 Health checks available at: http://localhost:8000/api/v1/health")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir / "app")]
    )