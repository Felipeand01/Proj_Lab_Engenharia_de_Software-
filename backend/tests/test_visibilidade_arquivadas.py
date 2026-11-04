"""Visibilidade das ocorrências arquivadas (TG1: RN8 p. 10, US03 p. 13, US12 p. 15).

Regra: arquivada só é visível para o administrador e para o autor. Para os demais ela
não existe (404, nunca 403), em listas, mapa, detalhe e "Confirmadas por mim".
"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from backend.app.security import ALGORITMO, JWT_SECRET
from backend.tests.test_admin import arquivar, autenticar_admin
from backend.tests.test_ocorrencias import autenticar, criar

MOTIVO = "Conteudo improprio sigiloso"


@pytest.fixture
def cenario(client):
    autor = autenticar(client)
    outro = autenticar(client)
    admin = autenticar_admin(client)
    publica = criar(client, autor, titulo="Ocorrência pública visível")
    arquivada = criar(client, autor, titulo="Ocorrência arquivada OCULTA-XYZ")
    assert arquivar(client, admin, arquivada["id"], MOTIVO).status_code == 200
    return {
        "autor": autor,
        "outro": outro,
        "admin": admin,
        "publica": publica["id"],
        "arquivada": arquivada["id"],
    }


def ids(resposta) -> list[int]:
    assert resposta.status_code == 200
    return [o["id"] for o in resposta.json()]


def token(sub: str, expira_em: timedelta, segredo: str = JWT_SECRET) -> dict:
    codigo = jwt.encode(
        {"sub": sub, "exp": datetime.now(UTC) + expira_em},
        segredo,
        algorithm=ALGORITMO,
    )
    return {"Authorization": f"Bearer {codigo}"}


# --- lista (e mapa, que usa a mesma consulta) ---


@pytest.mark.parametrize("quem", [None, "outro", "autor"])
def test_lista_publica_nao_inclui_arquivada(client, cenario, quem):
    headers = cenario[quem] if quem else {}

    lista = ids(client.get("/ocorrencias", headers=headers))

    assert cenario["publica"] in lista
    assert cenario["arquivada"] not in lista


def test_admin_ve_arquivada_na_lista(client, cenario):
    lista = ids(client.get("/ocorrencias", headers=cenario["admin"]))

    assert cenario["publica"] in lista
    assert cenario["arquivada"] in lista


@pytest.mark.parametrize("quem", [None, "outro", "autor"])
def test_filtro_por_status_arquivado_retorna_vazio_para_nao_admin(
    client, cenario, quem
):
    headers = cenario[quem] if quem else {}

    resposta = client.get("/ocorrencias?status=Arquivado", headers=headers)

    assert resposta.status_code == 200
    assert resposta.json() == []


def test_admin_filtra_por_status_arquivado(client, cenario):
    lista = ids(client.get("/ocorrencias?status=Arquivado", headers=cenario["admin"]))

    assert cenario["arquivada"] in lista
    assert cenario["publica"] not in lista


def test_filtro_por_categoria_tambem_nao_vaza_arquivada(client, cenario):
    lista = ids(client.get("/ocorrencias?categoria_id=3"))

    assert cenario["arquivada"] not in lista


# --- detalhe por ID ---


@pytest.mark.parametrize("quem", [None, "outro"])
def test_detalhe_de_arquivada_retorna_404_para_visitante_e_terceiro(
    client, cenario, quem
):
    headers = cenario[quem] if quem else {}

    resposta = client.get(f"/ocorrencias/{cenario['arquivada']}", headers=headers)

    assert resposta.status_code == 404
    assert "OCULTA" not in resposta.text
    assert MOTIVO not in resposta.text


def test_404_de_arquivada_e_igual_ao_de_inexistente(client, cenario):
    arquivada = client.get(f"/ocorrencias/{cenario['arquivada']}")
    inexistente = client.get("/ocorrencias/999999")

    assert arquivada.status_code == inexistente.status_code == 404
    assert arquivada.json() == inexistente.json()


def test_autor_consulta_a_propria_arquivada_com_motivo_e_historico(client, cenario):
    resposta = client.get(
        f"/ocorrencias/{cenario['arquivada']}", headers=cenario["autor"]
    )

    corpo = resposta.json()
    assert resposta.status_code == 200
    assert corpo["status"] == "Arquivado"
    assert corpo["motivo_arquivamento"] == MOTIVO
    assert corpo["historico"][-1]["status_novo"] == "Arquivado"


def test_admin_consulta_arquivada_com_historico(client, cenario):
    resposta = client.get(
        f"/ocorrencias/{cenario['arquivada']}", headers=cenario["admin"]
    )

    assert resposta.status_code == 200
    assert resposta.json()["motivo_arquivamento"] == MOTIVO
    assert len(resposta.json()["historico"]) == 2


def test_ocorrencia_publica_continua_acessivel_a_todos(client, cenario):
    for headers in ({}, cenario["outro"], cenario["autor"], cenario["admin"]):
        resposta = client.get(f"/ocorrencias/{cenario['publica']}", headers=headers)
        assert resposta.status_code == 200


# --- token inválido nunca derruba a consulta pública, mas também não dá privilégio ---


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": "Bearer lixo"},
        {"Authorization": "Basic abc"},
        token("1", timedelta(minutes=-1)),  # expirado
        token("1", timedelta(minutes=5), "outro-segredo-com-mais-de-32-caracteres!!"),
        token("999999", timedelta(minutes=5)),  # usuário inexistente
    ],
)
def test_token_invalido_e_tratado_como_visitante(client, cenario, headers):
    lista = client.get("/ocorrencias", headers=headers)
    detalhe = client.get(f"/ocorrencias/{cenario['arquivada']}", headers=headers)

    assert cenario["arquivada"] not in ids(lista)
    assert detalhe.status_code == 404
    publica = client.get(f"/ocorrencias/{cenario['publica']}", headers=headers)
    assert publica.status_code == 200


def test_token_de_autor_expirado_nao_da_acesso_a_arquivada(client, cenario):
    resposta = client.get("/auth/me", headers=cenario["autor"])
    autor_id = resposta.json()["id"]
    expirado = token(str(autor_id), timedelta(minutes=-1))

    detalhe = client.get(f"/ocorrencias/{cenario['arquivada']}", headers=expirado)

    assert detalhe.status_code == 404


# --- confirmar ---


def confirmar(client, ocorrencia_id, headers=None):
    return client.post(f"/ocorrencias/{ocorrencia_id}/confirmar", headers=headers or {})


def test_confirmar_arquivada_sem_token_retorna_401(client, cenario):
    assert confirmar(client, cenario["arquivada"]).status_code == 401


def test_confirmar_arquivada_por_terceiro_retorna_404_sem_registrar(client, cenario):
    resposta = confirmar(client, cenario["arquivada"], cenario["outro"])

    assert resposta.status_code == 404
    assert "OCULTA" not in resposta.text
    visto_pelo_admin = client.get(
        f"/ocorrencias/{cenario['arquivada']}", headers=cenario["admin"]
    )
    assert visto_pelo_admin.json()["total_confirmacoes"] == 0


@pytest.mark.parametrize("quem", ["autor", "admin"])
def test_confirmar_arquivada_por_autor_ou_admin_retorna_409(client, cenario, quem):
    resposta = confirmar(client, cenario["arquivada"], cenario[quem])

    assert resposta.status_code == 409


# --- minhas ocorrências ---


def test_criadas_inclui_arquivada_do_proprio_autor(client, cenario):
    corpo = client.get("/minhas-ocorrencias", headers=cenario["autor"]).json()

    criadas = [o["id"] for o in corpo["criadas"]]
    assert cenario["publica"] in criadas
    assert cenario["arquivada"] in criadas


def test_confirmadas_nao_expoe_arquivada_de_terceiro(client, cenario):
    # O morador confirma uma ocorrência que depois é arquivada pelo administrador.
    visivel = criar(client, cenario["autor"], titulo="Ocorrência confirmada depois")
    assert confirmar(client, visivel["id"], cenario["outro"]).status_code == 201
    assert arquivar(client, cenario["admin"], visivel["id"], MOTIVO).status_code == 200

    corpo = client.get("/minhas-ocorrencias", headers=cenario["outro"]).json()

    assert visivel["id"] not in [o["id"] for o in corpo["confirmadas"]]
    assert corpo["criadas"] == []


def test_confirmadas_continua_mostrando_as_nao_arquivadas(client, cenario):
    assert confirmar(client, cenario["publica"], cenario["outro"]).status_code == 201

    corpo = client.get("/minhas-ocorrencias", headers=cenario["outro"]).json()

    assert [o["id"] for o in corpo["confirmadas"]] == [cenario["publica"]]


# --- administração e indicadores continuam completos ---


def test_indicadores_continuam_contando_arquivadas(client, cenario):
    corpo = client.get("/admin/indicadores", headers=cenario["admin"]).json()

    assert corpo["por_status"]["Arquivado"] >= 1
    assert corpo["total"] == sum(corpo["por_status"].values())


@pytest.mark.parametrize("quem", [None, "outro", "autor"])
def test_indicadores_seguem_restritos_ao_admin(client, cenario, quem):
    headers = cenario[quem] if quem else {}

    resposta = client.get("/admin/indicadores", headers=headers)

    assert resposta.status_code == (401 if quem is None else 403)
