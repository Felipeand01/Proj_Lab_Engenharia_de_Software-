"""Testes de ocorrências: criação, consulta, confirmação e listas do usuário."""

import uuid

import pytest

from backend.app.database import SessionLocal
from backend.app.models import Ocorrencia

SENHA = "senha-segura-123"
DADOS = {
    "categoria_id": 3,
    "titulo": "Buraco na Rua das Flores",
    "descricao": "Buraco grande no meio da pista, perto do número 120.",
    "latitude": -23.55,
    "longitude": -46.63,
}


def autenticar(client) -> dict:
    """Cria um morador novo e devolve o cabeçalho Authorization."""
    email = f"user-{uuid.uuid4().hex[:12]}@exemplo.com"
    client.post(
        "/auth/cadastro", json={"nome": "Morador", "email": email, "senha": SENHA}
    )
    token = client.post("/auth/login", json={"email": email, "senha": SENHA}).json()
    return {"Authorization": f"Bearer {token['access_token']}"}


def criar(client, headers, **alterado) -> dict:
    resposta = client.post("/ocorrencias", json={**DADOS, **alterado}, headers=headers)
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def definir_status(ocorrencia_id: int, status: str) -> None:
    with SessionLocal() as session:
        session.get(Ocorrencia, ocorrencia_id).status = status
        session.commit()


@pytest.fixture
def morador(client):
    return autenticar(client)


# --- criar ---


def test_criar_ocorrencia_inicia_reportada_com_historico(client, morador):
    criada = criar(client, morador)

    assert criada["status"] == "Reportado"
    assert criada["categoria"] == {"id": 3, "nome": "Infraestrutura"}
    assert criada["autor_nome"] == "Morador"
    assert criada["total_confirmacoes"] == 0
    assert criada["foto_url"] is None  # a foto entra por POST /ocorrencias/{id}/foto
    assert len(criada["historico"]) == 1
    assert criada["historico"][0]["status_anterior"] is None
    assert criada["historico"][0]["status_novo"] == "Reportado"


def test_criar_ignora_status_e_autor_enviados_pelo_cliente(client, morador):
    criada = criar(client, morador, status="Resolvido", autor_id=999, autor_nome="X")

    assert criada["status"] == "Reportado"
    assert criada["autor_nome"] == "Morador"


def test_criar_sem_token_retorna_401(client):
    assert client.post("/ocorrencias", json=DADOS).status_code == 401


@pytest.mark.parametrize(
    "alteracao",
    [
        {"latitude": 91},
        {"latitude": -91},
        {"longitude": 181},
        {"longitude": -181},
        {"titulo": ""},
        {"titulo": "ab"},
        {"titulo": "t" * 121},
        {"descricao": "curta"},
        {"descricao": "d" * 2001},
        {"categoria_id": "abc"},
        {"latitude": "norte"},
    ],
)
def test_criar_com_dados_invalidos_retorna_422(client, morador, alteracao):
    resposta = client.post("/ocorrencias", json={**DADOS, **alteracao}, headers=morador)

    assert resposta.status_code == 422


def test_criar_sem_campo_obrigatorio_retorna_422(client, morador):
    sem_titulo = {k: v for k, v in DADOS.items() if k != "titulo"}

    assert (
        client.post("/ocorrencias", json=sem_titulo, headers=morador).status_code == 422
    )


def test_criar_com_categoria_inexistente_retorna_422(client, morador):
    resposta = client.post(
        "/ocorrencias", json={**DADOS, "categoria_id": 999}, headers=morador
    )

    assert resposta.status_code == 422


# --- listar e consultar (público) ---


def test_listar_e_consultar_sem_token(client, morador):
    criada = criar(client, morador)

    lista = client.get("/ocorrencias")
    detalhe = client.get(f"/ocorrencias/{criada['id']}")

    assert lista.status_code == detalhe.status_code == 200
    assert criada["id"] in [o["id"] for o in lista.json()]
    assert detalhe.json()["titulo"] == DADOS["titulo"]
    assert "email" not in detalhe.text


def test_listar_filtra_por_categoria_e_status(client, morador):
    iluminacao = criar(client, morador, categoria_id=1)
    outra = criar(client, morador, categoria_id=2)
    definir_status(outra["id"], "Em análise")

    por_categoria = client.get("/ocorrencias?categoria_id=1").json()
    por_status = client.get("/ocorrencias?status=Em análise").json()

    assert iluminacao["id"] in [o["id"] for o in por_categoria]
    assert all(o["categoria"]["id"] == 1 for o in por_categoria)
    assert outra["id"] in [o["id"] for o in por_status]
    assert all(o["status"] == "Em análise" for o in por_status)
    assert outra["id"] not in [o["id"] for o in por_categoria]


def test_listar_com_status_invalido_retorna_422(client):
    assert client.get("/ocorrencias?status=Inventado").status_code == 422


def test_consultar_inexistente_retorna_404(client):
    assert client.get("/ocorrencias/999999").status_code == 404


# --- confirmar ---


def test_confirmar_incrementa_contagem_sem_alterar_status(client, morador):
    criada = criar(client, morador)
    outro = autenticar(client)

    resposta = client.post(f"/ocorrencias/{criada['id']}/confirmar", headers=outro)

    assert resposta.status_code == 201
    assert resposta.json()["total_confirmacoes"] == 1
    assert resposta.json()["status"] == "Reportado"
    detalhe = client.get(f"/ocorrencias/{criada['id']}").json()
    assert len(detalhe["historico"]) == 1


def test_confirmar_duas_vezes_retorna_409(client, morador):
    criada = criar(client, morador)
    outro = autenticar(client)
    url = f"/ocorrencias/{criada['id']}/confirmar"

    assert client.post(url, headers=outro).status_code == 201
    assert client.post(url, headers=outro).status_code == 409
    assert client.get(f"/ocorrencias/{criada['id']}").json()["total_confirmacoes"] == 1


def test_usuarios_diferentes_somam_confirmacoes(client, morador):
    criada = criar(client, morador)
    url = f"/ocorrencias/{criada['id']}/confirmar"

    client.post(url, headers=autenticar(client))
    client.post(url, headers=autenticar(client))

    assert client.get(f"/ocorrencias/{criada['id']}").json()["total_confirmacoes"] == 2


def test_confirmar_sem_token_retorna_401(client, morador):
    criada = criar(client, morador)

    assert client.post(f"/ocorrencias/{criada['id']}/confirmar").status_code == 401


def test_confirmar_inexistente_retorna_404(client, morador):
    assert (
        client.post("/ocorrencias/999999/confirmar", headers=morador).status_code == 404
    )


def test_confirmar_arquivada_retorna_409_para_o_autor(client, morador):
    criada = criar(client, morador)
    definir_status(criada["id"], "Arquivado")

    resposta = client.post(f"/ocorrencias/{criada['id']}/confirmar", headers=morador)

    assert resposta.status_code == 409


def test_confirmar_arquivada_de_outro_autor_retorna_404(client, morador):
    criada = criar(client, morador)
    definir_status(criada["id"], "Arquivado")

    resposta = client.post(
        f"/ocorrencias/{criada['id']}/confirmar", headers=autenticar(client)
    )

    assert resposta.status_code == 404


# --- minhas ocorrências ---


def test_minhas_ocorrencias_separa_criadas_e_confirmadas(client, morador):
    outro = autenticar(client)
    minha = criar(client, morador)
    do_outro = criar(client, outro)
    client.post(f"/ocorrencias/{do_outro['id']}/confirmar", headers=morador)

    corpo = client.get("/minhas-ocorrencias", headers=morador).json()

    assert [o["id"] for o in corpo["criadas"]] == [minha["id"]]
    assert [o["id"] for o in corpo["confirmadas"]] == [do_outro["id"]]


def test_minhas_ocorrencias_nao_mostra_dados_de_outro_usuario(client, morador):
    criar(client, autenticar(client))

    corpo = client.get("/minhas-ocorrencias", headers=morador).json()

    assert corpo == {"criadas": [], "confirmadas": []}


def test_minhas_ocorrencias_sem_token_retorna_401(client):
    assert client.get("/minhas-ocorrencias").status_code == 401
