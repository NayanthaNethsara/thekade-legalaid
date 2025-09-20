from fastapi import FastAPI
from app.api.routes import hello

app = FastAPI(title="TheKade LegalAid API")

# Include routes
app.include_router(hello.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to TheKade LegalAid API!"}
