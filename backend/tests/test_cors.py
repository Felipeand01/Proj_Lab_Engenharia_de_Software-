"""Testes do CORS (configuração padrão, sem CORS_ORIGINS definido)."""

PREFLIGHT = {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization,content-type",
}


def test_origem_local_do_expo_e_permitida(client):
    resposta = client.options(
        "/auth/login", headers={"Origin": "http://localhost:8081", **PREFLIGHT}
    )

    assert resposta.status_code == 200
    assert resposta.headers["access-control-allow-origin"] == "http://localhost:8081"
    assert "access-control-allow-credentials" not in resposta.headers


def test_origem_desconhecida_nao_e_permitida(client):
    resposta = client.options(
        "/auth/login", headers={"Origin": "https://site-malicioso.example", **PREFLIGHT}
    )

    assert "access-control-allow-origin" not in resposta.headers
    assert resposta.status_code == 400


def test_resposta_normal_de_origem_desconhecida_sem_cabecalho_cors(client):
    resposta = client.get(
        "/health", headers={"Origin": "https://site-malicioso.example"}
    )

    assert "access-control-allow-origin" not in resposta.headers
