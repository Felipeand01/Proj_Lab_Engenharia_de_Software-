import io
import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.tests.guarda import validar_url_teste

TEST_DB_PATH = Path(__file__).parent / "test.db"

# Padrão: SQLite descartável. Com TEST_DATABASE_URL a suíte roda em outro banco, mas
# só se for dedicado a testes (ver guarda.py): os testes APAGAM as tabelas dele.
# Nunca herda DATABASE_URL.
_url_teste = os.getenv(
    "TEST_DATABASE_URL", f"sqlite:///{TEST_DB_PATH}?check_same_thread=false"
)
_motivo = validar_url_teste(_url_teste)
if _motivo:
    pytest.exit(f"TEST_DATABASE_URL recusada, nada foi apagado: {_motivo}", 2)
os.environ["DATABASE_URL"] = _url_teste
# Rate limit desligado nos testes; os testes de 429 o religam explicitamente.
os.environ["RATE_LIMIT"] = "0"
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


def foto_png(tamanho=(40, 30)) -> bytes:
    """PNG válido e pequeno para os testes de envio de foto."""
    from PIL import Image

    saida = io.BytesIO()
    Image.new("RGB", tamanho, "red").save(saida, format="PNG")
    return saida.getvalue()


def enviar_ocorrencia(client, headers, dados, foto=None, chave=None):
    """POST multipart /ocorrencias; `dados` são os campos do formulário.

    `foto=None` usa um PNG válido; `chave=None` gera uma chave_envio nova.
    """
    import uuid

    campos = {"chave_envio": chave or str(uuid.uuid4()), **dados}
    return client.post(
        "/ocorrencias",
        data={k: str(v) for k, v in campos.items()},
        files={"arquivo": ("foto.png", foto or foto_png(), "image/png")},
        headers=headers,
    )
