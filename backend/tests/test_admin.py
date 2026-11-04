"""Testes das rotas administrativas."""

import uuid

import pytest

from backend.app.database import SessionLocal
from backend.app.seed import criar_admin
from backend.tests.test_ocorrencias import SENHA, autenticar, criar, definir_status

FLUXO = ["Em análise", "Encaminhado", "Em andamento", "Resolvido"]


def autenticar_admin(client) -> dict:
    email = f"admin-{uuid.uuid4().hex[:12]}@exemplo.com"
    with SessionLocal() as session:
        criar_admin(session, "Admin", email, SENHA)
    token = client.post("/auth/login", json={"email": email, "senha": SENHA}).json()
    return {"Authorization": f"Bearer {token['access_token']}"}


@pytest.fixture
def admin(client):
    return autenticar_admin(client)


@pytest.fixture
def ocorrencia(client):
    return criar(client, autenticar(client))


def mudar(client, headers, ocorrencia_id, status):
    return client.patch(
        f"/admin/ocorrencias/{ocorrencia_id}/status",
        json={"status": status},
        headers=headers,
    )


def arquivar(client, headers, ocorrencia_id, motivo="Registro duplicado"):
    return client.post(
        f"/admin/ocorrencias/{ocorrencia_id}/arquivar",
        json={"motivo": motivo},
        headers=headers,
    )


# --- autenticação e autorização ---


def test_rotas_admin_sem_token_retornam_401(client, ocorrencia):
    i = ocorrencia["id"]

    assert client.patch(f"/admin/ocorrencias/{i}/status", json={}).status_code == 401
    assert client.post(f"/admin/ocorrencias/{i}/arquivar", json={}).status_code == 401
    assert client.get("/admin/indicadores").status_code == 401


def test_rotas_admin_com_morador_retornam_403(client, ocorrencia):
    morador = autenticar(client)
    i = ocorrencia["id"]

    assert mudar(client, morador, i, "Em análise").status_code == 403
    assert arquivar(client, morador, i).status_code == 403
    assert client.get("/admin/indicadores", headers=morador).status_code == 403
    # O status não mudou.
    assert client.get(f"/ocorrencias/{i}").json()["status"] == "Reportado"


def test_autor_da_ocorrencia_nao_pode_alterar_status(client):
    dono = autenticar(client)
    criada = criar(client, dono)

    assert mudar(client, dono, criada["id"], "Em análise").status_code == 403


# --- alterar status ---


def test_admin_percorre_fluxo_completo_com_historico(client, admin, ocorrencia):
    for status in FLUXO:
        resposta = mudar(client, admin, ocorrencia["id"], status)
        assert resposta.status_code == 200
        assert resposta.json()["status"] == status

    historico = client.get(f"/ocorrencias/{ocorrencia['id']}").json()["historico"]
    assert [h["status_novo"] for h in historico] == ["Reportado", *FLUXO]
    assert [h["status_anterior"] for h in historico] == [
        None,
        "Reportado",
        *FLUXO[:-1],
    ]


@pytest.mark.parametrize(
    ("inicial", "novo"),
    [
        ("Reportado", "Encaminhado"),
        ("Reportado", "Resolvido"),
        ("Em análise", "Reportado"),
        ("Em andamento", "Em análise"),
        ("Reportado", "Reportado"),
        ("Resolvido", "Em andamento"),
        ("Resolvido", "Reportado"),
        ("Arquivado", "Em análise"),
    ],
)
def test_transicao_invalida_retorna_409_sem_alterar(client, admin, inicial, novo):
    criada = criar(client, autenticar(client))
    definir_status(criada["id"], inicial)

    resposta = mudar(client, admin, criada["id"], novo)

    assert resposta.status_code == 409
    # Lido pelo admin: se o inicial for Arquivado, o público não enxerga o registro.
    detalhe = client.get(f"/ocorrencias/{criada['id']}", headers=admin).json()
    assert detalhe["status"] == inicial
    assert len(detalhe["historico"]) == 1


@pytest.mark.parametrize("status", ["Arquivado", "Inventado", "", None])
def test_status_nao_aceito_nesta_rota_retorna_422(client, admin, ocorrencia, status):
    assert mudar(client, admin, ocorrencia["id"], status).status_code == 422


def test_alterar_status_de_inexistente_retorna_404(client, admin):
    assert mudar(client, admin, 999999, "Em análise").status_code == 404


# --- arquivar ---


@pytest.mark.parametrize(
    "inicial", ["Reportado", "Em análise", "Encaminhado", "Em andamento"]
)
def test_arquivar_a_partir_de_status_nao_final(client, admin, inicial):
    criada = criar(client, autenticar(client))
    definir_status(criada["id"], inicial)

    resposta = arquivar(client, admin, criada["id"], "Duplicada da #12")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["status"] == "Arquivado"
    assert corpo["motivo_arquivamento"] == "Duplicada da #12"
    ultimo = corpo["historico"][-1]
    assert (ultimo["status_anterior"], ultimo["status_novo"]) == (inicial, "Arquivado")
    assert ultimo["motivo"] == "Duplicada da #12"


@pytest.mark.parametrize("estado_final", ["Resolvido", "Arquivado"])
def test_arquivar_estado_final_retorna_409(client, admin, estado_final):
    criada = criar(client, autenticar(client))
    definir_status(criada["id"], estado_final)

    assert arquivar(client, admin, criada["id"]).status_code == 409


@pytest.mark.parametrize("motivo", ["", "  ", "ab", "m" * 501, None])
def test_arquivar_sem_motivo_valido_retorna_422(client, admin, ocorrencia, motivo):
    resposta = arquivar(client, admin, ocorrencia["id"], motivo)

    assert resposta.status_code == 422
    assert (
        client.get(f"/ocorrencias/{ocorrencia['id']}").json()["status"] == "Reportado"
    )


def test_arquivar_sem_corpo_retorna_422(client, admin, ocorrencia):
    resposta = client.post(
        f"/admin/ocorrencias/{ocorrencia['id']}/arquivar", headers=admin
    )

    assert resposta.status_code == 422


def test_arquivar_inexistente_retorna_404(client, admin):
    assert arquivar(client, admin, 999999).status_code == 404


def test_ocorrencia_arquivada_nao_aceita_confirmacao(client, admin, ocorrencia):
    arquivar(client, admin, ocorrencia["id"])

    # O administrador enxerga a arquivada, mas ela não aceita confirmações (409).
    # Para terceiros ela nem existe (404): ver test_visibilidade_arquivadas.py.
    resposta = client.post(f"/ocorrencias/{ocorrencia['id']}/confirmar", headers=admin)

    assert resposta.status_code == 409


def test_confirmacao_nao_altera_status_nem_historico(client, admin, ocorrencia):
    mudar(client, admin, ocorrencia["id"], "Em análise")
    client.post(
        f"/ocorrencias/{ocorrencia['id']}/confirmar", headers=autenticar(client)
    )

    detalhe = client.get(f"/ocorrencias/{ocorrencia['id']}").json()

    assert detalhe["status"] == "Em análise"
    assert len(detalhe["historico"]) == 2


# --- indicadores ---


def test_indicadores_refletem_ocorrencias(client, admin):
    antes = client.get("/admin/indicadores", headers=admin).json()
    morador = autenticar(client)
    criar(client, morador, categoria_id=1)
    arquivada = criar(client, morador, categoria_id=1)
    arquivar(client, admin, arquivada["id"])

    depois = client.get("/admin/indicadores", headers=admin).json()

    assert depois["total"] == antes["total"] + 2
    assert depois["por_status"]["Reportado"] == antes["por_status"]["Reportado"] + 1
    assert depois["por_status"]["Arquivado"] == antes["por_status"]["Arquivado"] + 1
    assert (
        depois["por_categoria"]["Iluminação"]
        == antes["por_categoria"]["Iluminação"] + 2
    )
    assert sum(depois["por_status"].values()) == depois["total"]


def test_indicadores_incluem_status_e_categorias_sem_ocorrencias(client, admin):
    corpo = client.get("/admin/indicadores", headers=admin).json()

    assert set(corpo["por_status"]) == {
        "Reportado",
        "Em análise",
        "Encaminhado",
        "Em andamento",
        "Resolvido",
        "Arquivado",
    }
    assert set(corpo["por_categoria"]) == {
        "Iluminação",
        "Limpeza",
        "Infraestrutura",
        "Segurança",
        "Outros",
    }
