import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

from backend.app import fotos
from backend.app.database import SessionLocal, engine
from backend.app.models import Categoria
from backend.app.logs import middleware_logs
from backend.app.routers import admin, auth, localizacao, ocorrencias

app = FastAPI(
    title="Amigo da Vizinhança API",
    description="API do projeto Amigo da Vizinhança",
    version="0.1.0",
)

app.include_router(auth.router)
app.include_router(ocorrencias.router)
app.include_router(localizacao.router)
app.include_router(admin.router)

# Fotos do armazenamento local (FOTO_STORAGE=local); com Cloudinary a pasta fica vazia.
app.mount("/fotos", StaticFiles(directory=fotos.PASTA), name="fotos")

# Adicionado antes do CORS, que fica como camada externa (cabeçalhos CORS em 403/429).
app.middleware("http")(middleware_logs)

# Origens liberadas via CORS_ORIGINS (separadas por vírgula). O padrão cobre só o
# Expo local; em produção informe a URL do frontend publicado.
# CORS_ORIGIN_REGEX é opcional (ex.: URLs encaminhadas do Codespaces).
cors_origins = [
    origem.strip()
    for origem in os.getenv(
        "CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
    ).split(",")
    if origem.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_credentials=False,  # a autenticação usa o cabeçalho Authorization
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Request-ID"],
)


# Teto do corpo dos envios com foto: o formulário inteiro é lido antes da autenticação.
# shortcut: confia no Content-Length; um cliente que o omita não é barrado aqui (a foto
# continua limitada a FOTO_MAX_BYTES na rota). Para blindar, limitar também no proxy.
LIMITE_CORPO = fotos.MAX_BYTES + 512 * 1024


@app.middleware("http")
async def limitar_corpo(request, call_next):
    tamanho = request.headers.get("content-length", "")
    if (
        request.method == "POST"
        and request.url.path.startswith("/ocorrencias")
        and tamanho.isdigit()
        and int(tamanho) > LIMITE_CORPO
    ):
        return JSONResponse(
            status_code=413, content={"detail": "O envio excede o tamanho máximo"}
        )
    return await call_next(request)


@app.get("/")
def inicio():
    return {"message": "API do Amigo da Vizinhança funcionando!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-health")
def db_health():
    """Confirma que o banco responde. Público: não revela nome do banco nem usuário."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {"status": "ok"}


@app.get("/categorias")
def listar_categorias():
    with SessionLocal() as session:
        categorias = session.scalars(select(Categoria).order_by(Categoria.id)).all()

        return [
            {"id": categoria.id, "nome": categoria.nome} for categoria in categorias
        ]


@app.get("/categorias/{categoria_id}")
def buscar_categoria(categoria_id: int):
    """Retorna uma categoria pelo ID informado."""

    with SessionLocal() as session:
        categoria = session.get(Categoria, categoria_id)

        if categoria is None:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")

        return {"id": categoria.id, "nome": categoria.nome}
