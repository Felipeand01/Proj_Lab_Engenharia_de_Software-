"""Logout, política de senha, rate limit (429) e logs de requisição (RNF05)."""

import logging
import uuid

import pytest

from backend.app import limite
from backend.tests.conftest import enviar_ocorrencia
from backend.tests.test_ocorrencias import DADOS, SENHA, autenticar


def email_novo() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@exemplo.com"


# --- logout ---


def test_logout_revoga_o_token(client):
    headers = autenticar(client)
    assert client.get("/auth/me", headers=headers).status_code == 200

    assert client.post("/auth/logout", headers=headers).status_code == 204

    assert client.get("/auth/me", headers=headers).status_code == 401
    # Rota pública trata o token revogado como visitante, sem privilégio.
    assert client.get("/ocorrencias", headers=headers).status_code == 200
    # Segundo logout com o mesmo token: já não autenticado.
    assert client.post("/auth/logout", headers=headers).status_code == 401


def test_logout_sem_token_retorna_401(client):
    assert client.post("/auth/logout").status_code == 401


def test_logout_nao_revoga_outros_tokens_do_mesmo_usuario(client):
    email = email_novo()
    client.post("/auth/cadastro", json={"nome": "Ana", "email": email, "senha": SENHA})

    def entrar():
        t = client.post("/auth/login", json={"email": email, "senha": SENHA}).json()
        return {"Authorization": f"Bearer {t['access_token']}"}

    a, b = entrar(), entrar()
    client.post("/auth/logout", headers=a)

    assert client.get("/auth/me", headers=a).status_code == 401
    assert client.get("/auth/me", headers=b).status_code == 200


# --- política de senha ---


@pytest.mark.parametrize(
    "senha", ["12345678", "Password123", "senha123", "x" * 7, "x" * 129]
)
def test_cadastro_rejeita_senha_comum_curta_ou_longa(client, senha):
    corpo = {"nome": "Ana", "email": email_novo(), "senha": senha}

    assert client.post("/auth/cadastro", json=corpo).status_code == 422


def test_cadastro_rejeita_senha_igual_ao_email(client):
    email = email_novo()

    resposta = client.post(
        "/auth/cadastro", json={"nome": "Ana", "email": email, "senha": email}
    )

    assert resposta.status_code == 422


def test_cadastro_aceita_senha_frase_longa(client):
    corpo = {
        "nome": "Ana",
        "email": email_novo(),
        "senha": "minha rua tem muitos buracos",
    }

    assert client.post("/auth/cadastro", json=corpo).status_code == 201


# --- rate limit ---


@pytest.fixture
def limite_ligado(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT", "1")
    limite.limpar()
    yield
    limite.limpar()


def test_login_excedendo_limite_retorna_429(client, limite_ligado, monkeypatch):
    monkeypatch.setenv("LIMITE_LOGIN", "3/60")
    corpo = {"email": email_novo(), "senha": "qualquer-coisa"}

    codigos = [client.post("/auth/login", json=corpo).status_code for _ in range(5)]

    assert codigos == [401, 401, 401, 429, 429]
    resposta = client.post("/auth/login", json=corpo)
    assert "Muitas tentativas" in resposta.json()["detail"]
    assert "Retry-After" in resposta.headers


def test_cadastro_e_criacao_tambem_tem_limite(client, limite_ligado, monkeypatch):
    monkeypatch.setenv("LIMITE_CADASTRO", "1/60")
    monkeypatch.setenv("LIMITE_CRIAR_OCORRENCIA", "1/60")
    corpo = {"nome": "Ana", "email": email_novo(), "senha": SENHA}
    client.post("/auth/cadastro", json=corpo)
    assert client.post("/auth/cadastro", json=corpo).status_code == 429

    # O limite de criação conta mesmo quando a requisição é rejeitada depois.
    limite.limpar()
    monkeypatch.setenv("RATE_LIMIT", "0")
    headers = autenticar(client)
    monkeypatch.setenv("RATE_LIMIT", "1")
    assert enviar_ocorrencia(client, headers, DADOS).status_code == 201
    assert enviar_ocorrencia(client, headers, DADOS).status_code == 429


def test_xff_forjado_nao_burla_o_limite_por_padrao(client, limite_ligado, monkeypatch):
    monkeypatch.setenv("LIMITE_LOGIN", "2/60")
    monkeypatch.delenv("CONFIAR_PROXY", raising=False)
    corpo = {"email": email_novo(), "senha": "qualquer-coisa"}

    codigos = [
        client.post(
            "/auth/login", json=corpo, headers={"X-Forwarded-For": f"10.0.0.{i}"}
        ).status_code
        for i in range(4)
    ]

    assert codigos == [401, 401, 429, 429]


def test_com_confiar_proxy_usa_so_a_entrada_mais_a_direita(
    client, limite_ligado, monkeypatch
):
    monkeypatch.setenv("LIMITE_LOGIN", "2/60")
    monkeypatch.setenv("CONFIAR_PROXY", "1")
    corpo = {"email": email_novo(), "senha": "qualquer-coisa"}

    def tentar(xff):
        return client.post(
            "/auth/login", json=corpo, headers={"X-Forwarded-For": xff}
        ).status_code

    # O cliente forja a esquerda; o proxy acrescenta o IP real (1.1.1.1) à direita.
    assert [tentar(f"9.9.9.{i}, 1.1.1.1") for i in range(3)] == [401, 401, 429]
    # Outro IP real à direita tem contador próprio.
    assert tentar("9.9.9.9, 2.2.2.2") == 401


def test_rate_limit_desligado_nos_testes(client):
    corpo = {"email": email_novo(), "senha": "qualquer-coisa"}

    assert all(
        client.post("/auth/login", json=corpo).status_code == 401 for _ in range(30)
    )


# --- logs e X-Request-ID ---


def test_resposta_traz_x_request_id_unico(client):
    a = client.get("/health").headers["X-Request-ID"]
    b = client.get("/health").headers["X-Request-ID"]

    assert a and a != b


def test_log_usa_rota_modelo_e_nao_vaza_dados_sensiveis(client, caplog):
    caplog.set_level(logging.INFO, logger="amigo.requisicoes")
    email = email_novo()
    senha = "senha-secreta-do-teste-xyz"
    client.post("/auth/cadastro", json={"nome": "Ana", "email": email, "senha": senha})
    token = client.post("/auth/login", json={"email": email, "senha": senha}).json()[
        "access_token"
    ]
    client.get(
        "/ocorrencias/123456?lat=-23.55&lon=-46.63",
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post("/auth/login", json={"email": email, "senha": "errada-errada"})

    log = caplog.text
    assert "rota=/ocorrencias/{ocorrencia_id}" in log
    assert "metodo=GET" in log and "duracao_ms=" in log and "request_id=" in log
    assert "evento=login_falho" in log
    for segredo in (senha, token, email, "errada-errada", "-23.55", "123456"):
        assert segredo not in log


def test_eventos_403_e_429_sao_registrados(client, caplog, limite_ligado, monkeypatch):
    caplog.set_level(logging.INFO, logger="amigo.requisicoes")
    client.get("/admin/indicadores", headers=autenticar(client))
    monkeypatch.setenv("LIMITE_LOGIN", "1/60")
    corpo = {"email": email_novo(), "senha": "qualquer-coisa"}
    client.post("/auth/login", json=corpo)
    client.post("/auth/login", json=corpo)

    assert "evento=acesso_negado" in caplog.text
    assert "evento=limite_excedido" in caplog.text


def test_corpo_gigante_em_ocorrencias_recebe_413(client):
    """Content-Length acima do teto é barrado antes de ler o formulário (B1)."""
    r = client.post(
        "/ocorrencias",
        content=b"x",
        headers={"Content-Length": str(50 * 1024 * 1024), "Content-Type": "text/plain"},
    )
    assert r.status_code == 413


def test_trava_do_nominatim_ocupada_responde_503(monkeypatch):
    """Quem não obtém a trava em ESPERA_TRAVA segundos recebe 503, sem ficar preso (M2)."""
    from fastapi import HTTPException

    from backend.app.routers import localizacao

    monkeypatch.setattr(localizacao, "ESPERA_TRAVA", 0.05)
    assert localizacao._trava.acquire(timeout=1)
    try:
        try:
            localizacao._nominatim({"q": "rua x"})
        except HTTPException as erro:
            assert erro.status_code == 503
        else:
            raise AssertionError("esperava 503")
    finally:
        localizacao._trava.release()
