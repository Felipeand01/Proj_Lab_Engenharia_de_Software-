import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB_PATH = Path(__file__).parent / "test.db"

# Padrão: SQLite descartável. Com TEST_DATABASE_URL a suíte roda em outro banco
# (ex.: PostgreSQL). Atenção: os testes APAGAM as tabelas desse banco.
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL", f"sqlite:///{TEST_DB_PATH}?check_same_thread=false"
)
# Segredo apenas para testes; em produção vem do ambiente.
os.environ["JWT_SECRET"] = "segredo-somente-para-testes-automatizados-0123456789"
# Fotos dos testes vão para uma pasta temporária, removida ao final da sessão.
FOTO_DIR_TESTE = tempfile.mkdtemp(prefix="fotos-teste-")
os.environ["FOTO_DIR"] = FOTO_DIR_TESTE
os.environ["FOTO_STORAGE"] = "local"

from backend.app.database import SessionLocal, engine
from backend.app.main import app
from backend.app.models import Base
from backend.app.seed import semear_categorias


@pytest.fixture(scope="session", autouse=True)
def preparar_banco():
    """Cria um banco isolado para os testes."""

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Usa o seed real: ids 1..5 na ordem e sequência do PostgreSQL consistente.
    with SessionLocal() as session:
        semear_categorias(session)

    yield

    Base.metadata.drop_all(bind=engine)

    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    shutil.rmtree(FOTO_DIR_TESTE, ignore_errors=True)


@pytest.fixture
def client():
    """Disponibiliza um cliente HTTP para testar a API."""

    return TestClient(app)
