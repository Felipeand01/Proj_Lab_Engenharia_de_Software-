import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB_PATH = Path(__file__).parent / "test.db"

os.environ["DATABASE_URL"] = (
    f"sqlite:///{TEST_DB_PATH}?check_same_thread=false"
)

from backend.app.database import SessionLocal, engine
from backend.app.main import app
from backend.app.models import Base, Categoria


@pytest.fixture(scope="session", autouse=True)
def preparar_banco():
    """Cria um banco isolado para os testes."""

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        session.add_all(
            [
                Categoria(id=1, nome="Iluminação"),
                Categoria(id=2, nome="Limpeza"),
                Categoria(id=3, nome="Infraestrutura"),
                Categoria(id=4, nome="Segurança"),
                Categoria(id=5, nome="Outros"),
            ]
        )
        session.commit()

    yield

    Base.metadata.drop_all(bind=engine)

    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture
def client():
    """Disponibiliza um cliente HTTP para testar a API."""

    return TestClient(app)