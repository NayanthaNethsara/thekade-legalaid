from fastapi import FastAPI
from app.api.routes import auth
from app.db.postgres import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
