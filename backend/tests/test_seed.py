"""Testes do seed de categorias e do primeiro administrador."""

import uuid

import pytest
from sqlalchemy import func, select

from backend.app import seed
from backend.app.database import SessionLocal
from backend.app.models import Categoria, Usuario

SENHA = "senha-segura-123"


def novo_email() -> str:
    return f"seed-{uuid.uuid4().hex[:12]}@exemplo.com"


def buscar(email: str) -> Usuario:
    with SessionLocal() as session:
        return session.scalar(select(Usuario).where(Usuario.email == email))


def login(client, email, senha=SENHA):
    return client.post("/auth/login", json={"email": email, "senha": senha})


# --- categorias ---


def test_semear_categorias_e_idempotente():
    with SessionLocal() as session:
        seed.semear_categorias(session)
        criadas_na_segunda = seed.semear_categorias(session)
        nomes = set(session.scalars(select(Categoria.nome)))
        total = session.scalar(select(func.count()).select_from(Categoria))

    assert criadas_na_segunda == 0
    assert nomes == set(seed.CATEGORIAS_INICIAIS)
    assert total == 5


def test_semear_categorias_completa_somente_as_que_faltam(monkeypatch):
    extra = f"Extra-{uuid.uuid4().hex[:8]}"
    monkeypatch.setattr(seed, "CATEGORIAS_INICIAIS", (*seed.CATEGORIAS_INICIAIS, extra))

    with SessionLocal() as session:
        criadas = seed.semear_categorias(session)
        criada = session.scalar(select(Categoria).where(Categoria.nome == extra))
        session.delete(criada)  # remove a categoria de teste; as reais não mudam
        session.commit()

    assert criadas == 1


# --- administrador ---


def test_criar_admin_cria_usuario_com_hash_e_permite_login(client):
    email = novo_email()
    with SessionLocal() as session:
        resultado = seed.criar_admin(session, "Admin", email, SENHA)

    admin = buscar(email)
    assert resultado == "criado"
    assert admin.papel == "admin"
    assert admin.senha_hash.startswith("$argon2")
    assert SENHA not in admin.senha_hash
    assert login(client, email).status_code == 200


def test_criar_admin_e_idempotente_e_nao_troca_senha(client):
    email = novo_email()
    with SessionLocal() as session:
        seed.criar_admin(session, "Admin", email, SENHA)
        hash_original = buscar(email).senha_hash
        resultado = seed.criar_admin(session, "Admin", email, "outra-senha-456")

    assert resultado == "existente"
    assert buscar(email).senha_hash == hash_original
    assert login(client, email, "outra-senha-456").status_code == 401
    with SessionLocal() as session:
        total = session.scalar(
            select(func.count()).select_from(Usuario).where(Usuario.email == email)
        )
    assert total == 1


def test_criar_admin_promove_morador_existente_sem_trocar_senha(client):
    email = novo_email()
    client.post("/auth/cadastro", json={"nome": "Ana", "email": email, "senha": SENHA})

    with SessionLocal() as session:
        resultado = seed.criar_admin(session, "Ana", email, "outra-senha-456")

    assert resultado == "promovido"
    assert buscar(email).papel == "admin"
    assert login(client, email).status_code == 200


def test_cadastro_publico_nao_cria_admin_mesmo_com_papel_no_corpo(client):
    email = novo_email()
    resposta = client.post(
        "/auth/cadastro",
        json={"nome": "Ana", "email": email, "senha": SENHA, "papel": "admin"},
    )

    assert resposta.status_code == 201
    assert buscar(email).papel == "morador"


# --- execução por variáveis de ambiente ---


def test_main_cria_admin_a_partir_do_ambiente(monkeypatch, capsys):
    email = novo_email()
    monkeypatch.setenv("ADMIN_EMAIL", email)
    monkeypatch.setenv("ADMIN_SENHA", SENHA)
    monkeypatch.setenv("ADMIN_NOME", "Dona Maria")

    seed.main()

    assert buscar(email).papel == "admin"
    assert buscar(email).nome == "Dona Maria"
    saida = capsys.readouterr().out
    assert "criado" in saida
    assert SENHA not in saida


@pytest.mark.parametrize("faltando", ["ADMIN_EMAIL", "ADMIN_SENHA"])
def test_main_sem_variaveis_encerra_sem_criar(monkeypatch, faltando):
    monkeypatch.setenv("ADMIN_EMAIL", novo_email())
    monkeypatch.setenv("ADMIN_SENHA", SENHA)
    monkeypatch.delenv(faltando)

    with pytest.raises(SystemExit) as erro:
        seed.main()

    assert "ADMIN_EMAIL" in str(erro.value)


def test_main_com_credenciais_invalidas_nao_vaza_valores(monkeypatch):
    email = novo_email()
    monkeypatch.setenv("ADMIN_EMAIL", email)
    monkeypatch.setenv("ADMIN_SENHA", "curta")

    with pytest.raises(SystemExit) as erro:
        seed.main()

    assert "senha" in str(erro.value)
    assert "curta" not in str(erro.value)
    assert buscar(email) is None
