from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.database import engine

app = FastAPI(
    title="Amigo da Vizinhança API",
    description="API do projeto Amigo da Vizinhança",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def inicio():
    return {
        "message": "API do Amigo da Vizinhança funcionando!"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.get("/db-health")
def db_health():
    with engine.connect() as connection:
        resultado = connection.execute(
            text("SELECT current_database(), current_user")
        ).one()

    return {
        "status": "ok",
        "database": resultado[0],
        "user": resultado[1]
    }
