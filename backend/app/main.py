from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from backend.app.database import SessionLocal, engine
from backend.app.models import Categoria

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


@app.get("/categorias")
def listar_categorias():
    with SessionLocal() as session:
        categorias = session.scalars(
            select(Categoria).order_by(Categoria.id)
        ).all()

        return [
            {
                "id": categoria.id,
                "nome": categoria.nome
            }
            for categoria in categorias
        ]
@app.get("/categorias/{categoria_id}")
def buscar_categoria(categoria_id: int):
    """Retorna uma categoria pelo ID informado."""

    with SessionLocal() as session:
        categoria = session.get(Categoria, categoria_id)

        if categoria is None:
            raise HTTPException(
                status_code=404,
                detail="Categoria não encontrada"
            )

        return {
            "id": categoria.id,
            "nome": categoria.nome
        }