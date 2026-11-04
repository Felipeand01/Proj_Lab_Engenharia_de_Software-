"""Testes de cadastro, login e /auth/me."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select

from backend.app.database import SessionLocal
from backend.app.models import Usuario
from backend.app.security import ALGORITMO, JWT_SECRET

SENHA = "senha-segura-123"


def novo_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@exemplo.com"


def cadastrar(client, email=None, **extra):
    dados = {"nome": "Maria Silva", "email": email or novo_email(), "senha": SENHA}
    return client.post("/auth/cadastro", json={**dados, **extra})


def token_de(client, email):
    resposta = client.post("/auth/login", json={"email": email, "senha": SENHA})
    return resposta.json()["access_token"]


# --- cadastro ---


def test_cadastro_cria_morador_sem_expor_senha(client):
    email = novo_email()
    resposta = cadastrar(client, email)

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == email
    assert corpo["papel"] == "morador"
    assert "senha" not in corpo and "senha_hash" not in corpo
    assert SENHA not in resposta.text


def test_cadastro_armazena_somente_hash_argon2(client):
    email = novo_email()
    cadastrar(client, email)

    with SessionLocal() as session:
        usuario = session.scalar(select(Usuario).where(Usuario.email == email))

    assert usuario.senha_hash.startswith("$argon2")
    assert SENHA not in usuario.senha_hash


def test_cadastro_ignora_papel_enviado_pelo_cliente(client):
    for extra in ({"papel": "admin"}, {"role": "admin", "is_admin": True}):
        resposta = cadastrar(client, **extra)

        assert resposta.status_code == 201
        assert resposta.json()["papel"] == "morador"


def test_cadastro_email_duplicado_retorna_409(client):
    email = novo_email()
    assert cadastrar(client, email).status_code == 201

    assert cadastrar(client, email).status_code == 409
    # Mesmo e-mail com maiúsculas também é duplicado.
    assert cadastrar(client, email.upper()).status_code == 409


def test_cadastro_com_dados_invalidos_retorna_422(client):
    base = {"nome": "Maria", "email": novo_email(), "senha": SENHA}
    invalidos = [
        {**base, "email": "sem-arroba"},
        {**base, "senha": "curta"},
        {**base, "senha": "x" * 129},
        {**base, "nome": "M"},
        {**base, "nome": "M" * 101},
        {"email": base["email"], "senha": SENHA},  # sem nome
    ]
    for dados in invalidos:
        assert client.post("/auth/cadastro", json=dados).status_code == 422


# --- login ---


def test_login_valido_retorna_token(client):
    email = novo_email()
    cadastrar(client, email)

    resposta = client.post("/auth/login", json={"email": email, "senha": SENHA})

    assert resposta.status_code == 200
    assert resposta.json()["token_type"] == "bearer"
    assert resposta.json()["access_token"]


def test_login_nao_revela_se_email_existe(client):
    email = novo_email()
    cadastrar(client, email)

    senha_errada = client.post(
        "/auth/login", json={"email": email, "senha": "errada!!"}
    )
    email_inexistente = client.post(
        "/auth/login", json={"email": novo_email(), "senha": SENHA}
    )

    assert senha_errada.status_code == email_inexistente.status_code == 401
    assert senha_errada.json() == email_inexistente.json()


def test_login_sem_campos_retorna_422(client):
    assert client.post("/auth/login", json={"email": novo_email()}).status_code == 422


# --- /auth/me ---


def test_me_com_token_valido(client):
    email = novo_email()
    cadastrar(client, email)
    token = token_de(client, email)

    resposta = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert resposta.status_code == 200
    assert resposta.json()["email"] == email
    assert "senha_hash" not in resposta.json()


def test_me_sem_token_retorna_401(client):
    assert client.get("/auth/me").status_code == 401


def test_me_com_token_invalido_retorna_401(client):
    for cabecalho in ("Bearer lixo", "Bearer ", "Basic abc", "abc"):
        resposta = client.get("/auth/me", headers={"Authorization": cabecalho})
        assert resposta.status_code == 401


def test_me_com_token_expirado_retorna_401(client):
    expirado = jwt.encode(
        {"sub": "1", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        JWT_SECRET,
        algorithm=ALGORITMO,
    )

    resposta = client.get("/auth/me", headers={"Authorization": f"Bearer {expirado}"})

    assert resposta.status_code == 401


def test_me_com_token_de_outro_segredo_retorna_401(client):
    falso = jwt.encode(
        {"sub": "1", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "outro-segredo-qualquer-com-mais-de-32-caracteres",
        algorithm=ALGORITMO,
    )

    resposta = client.get("/auth/me", headers={"Authorization": f"Bearer {falso}"})

    assert resposta.status_code == 401


def test_me_com_token_de_usuario_inexistente_retorna_401(client):
    token = jwt.encode(
        {"sub": "999999", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        JWT_SECRET,
        algorithm=ALGORITMO,
    )

    resposta = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert resposta.status_code == 401
