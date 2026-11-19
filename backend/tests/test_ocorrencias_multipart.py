"""Criação atômica de ocorrência (multipart), idempotência, filtro geográfico e papéis.

Critério central: qualquer falha antes do commit deixa ZERO linhas; reenvio com a
mesma chave_envio deixa UMA linha.
"""

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

from backend.app import fotos
from backend.app.database import SessionLocal
from backend.app.models import HistoricoStatus, Ocorrencia
from backend.tests.conftest import enviar_ocorrencia
from backend.tests.test_admin import autenticar_admin, mudar
from backend.tests.test_ocorrencias import DADOS, autenticar, criar


@pytest.fixture
def morador(client):
    return autenticar(client)


def novos_dados(**alterado) -> dict:
    """Dados válidos com título único, para contar linhas sem interferência."""
    return {**DADOS, "titulo": f"Teste {uuid.uuid4().hex[:10]}", **alterado}


def linhas(titulo: str) -> int:
    with SessionLocal() as session:
        return session.scalar(
            select(func.count())
            .select_from(Ocorrencia)
            .where(Ocorrencia.titulo == titulo)
        )


# --- falhas: nenhuma linha ---


def test_sem_arquivo_retorna_422_e_nenhuma_linha(client, morador):
    dados = novos_dados()
    resposta = client.post(
        "/ocorrencias",
        data={
            **{k: str(v) for k, v in dados.items()},
            "chave_envio": str(uuid.uuid4()),
        },
        headers=morador,
    )

    assert resposta.status_code == 422
    assert linhas(dados["titulo"]) == 0


def test_arquivo_que_nao_e_imagem_retorna_422_e_nenhuma_linha(client, morador):
    dados = novos_dados()

    resposta = enviar_ocorrencia(client, morador, dados, foto=b"nao sou imagem")

    assert resposta.status_code == 422
    assert linhas(dados["titulo"]) == 0


def test_arquivo_grande_retorna_413_e_nenhuma_linha(client, morador, monkeypatch):
    monkeypatch.setattr(fotos, "MAX_BYTES", 10)
    dados = novos_dados()

    assert enviar_ocorrencia(client, morador, dados).status_code == 413
    assert linhas(dados["titulo"]) == 0


@pytest.mark.parametrize(
    "alteracao",
    [
        {"titulo": "ab"},
        {"latitude": 91},
        {"categoria_id": 999},
        {"cep": "123"},
        {"cep": "abcdefgh"},
        {"uf": "XX"},
        {"uf": "SPP"},
        {"numero": "9" * 21},
        {"chave_envio": "nao-e-uuid"},
    ],
)
def test_campo_invalido_retorna_422_e_nenhuma_linha(client, morador, alteracao):
    dados = novos_dados(**alteracao)

    assert enviar_ocorrencia(client, morador, dados).status_code == 422
    assert linhas(dados["titulo"]) == 0


def test_json_antigo_retorna_422_e_nenhuma_linha(client, morador):
    dados = novos_dados()

    resposta = client.post(
        "/ocorrencias",
        json={**dados, "chave_envio": str(uuid.uuid4())},
        headers=morador,
    )

    assert resposta.status_code == 422
    assert linhas(dados["titulo"]) == 0


def test_falha_no_armazenamento_retorna_502_e_nenhuma_linha(
    client, morador, monkeypatch
):
    def falha(jpeg, request):
        raise HTTPException(status_code=502, detail="Não foi possível armazenar")

    monkeypatch.setattr(fotos, "armazenar", falha)
    dados = novos_dados()

    assert enviar_ocorrencia(client, morador, dados).status_code == 502
    assert linhas(dados["titulo"]) == 0


# --- idempotência ---


def test_reenvio_com_mesma_chave_devolve_a_mesma_ocorrencia(
    client, morador, monkeypatch
):
    envios = []
    original = fotos.armazenar
    monkeypatch.setattr(
        fotos,
        "armazenar",
        lambda jpeg, request: envios.append(1) or original(jpeg, request),
    )
    dados, chave = novos_dados(), str(uuid.uuid4())

    primeira = enviar_ocorrencia(client, morador, dados, chave=chave)
    segunda = enviar_ocorrencia(client, morador, dados, chave=chave)

    assert (primeira.status_code, segunda.status_code) == (201, 200)
    assert primeira.json()["id"] == segunda.json()["id"]
    assert linhas(dados["titulo"]) == 1
    assert len(envios) == 1  # sem novo upload no reenvio


def test_mesma_chave_de_autores_diferentes_cria_duas_ocorrencias(client, morador):
    dados, chave = novos_dados(), str(uuid.uuid4())

    a = enviar_ocorrencia(client, morador, dados, chave=chave)
    b = enviar_ocorrencia(client, autenticar(client), dados, chave=chave)

    assert a.status_code == b.status_code == 201
    assert linhas(dados["titulo"]) == 2


# --- endereço opcional ---


def test_endereco_e_normalizado_e_opcional(client, morador):
    completa = criar(
        client,
        morador,
        cep="01310-100",
        logradouro="Avenida Paulista",
        numero="1000",
        complemento="Bloco B",
        bairro="Bela Vista",
        cidade="São Paulo",
        uf="sp",
    )
    sem_endereco = criar(client, morador)

    assert completa["cep"] == "01310100" and completa["uf"] == "SP"
    assert completa["complemento"] == "Bloco B"
    assert sem_endereco["cep"] is None and sem_endereco["logradouro"] is None


def test_campos_de_endereco_vazios_viram_nulo(client, morador):
    criada = criar(client, morador, cep="", logradouro="", uf="")

    assert criada["cep"] is None and criada["uf"] is None


def test_numero_e_complemento_sao_opcionais(client, morador):
    """E3-01: endereço sem número (nem complemento) é aceito e fica nulo."""
    criada = criar(
        client,
        morador,
        logradouro="Avenida Paulista",
        numero="",
        complemento="",
        bairro="Bela Vista",
        cidade="São Paulo",
        uf="SP",
    )

    assert criada["logradouro"] == "Avenida Paulista"
    assert criada["numero"] is None and criada["complemento"] is None


# --- papéis ---


def test_admin_nao_cria_ocorrencia_403(client):
    dados = novos_dados()

    assert enviar_ocorrencia(client, autenticar_admin(client), dados).status_code == 403
    assert linhas(dados["titulo"]) == 0


def test_autor_nao_confirma_a_propria_ocorrencia_403(client, morador):
    criada = criar(client, morador)

    resposta = client.post(f"/ocorrencias/{criada['id']}/confirmar", headers=morador)

    assert resposta.status_code == 403
    assert client.get(f"/ocorrencias/{criada['id']}").json()["total_confirmacoes"] == 0


def test_admin_nao_confirma_403(client, morador):
    criada = criar(client, morador)

    resposta = client.post(
        f"/ocorrencias/{criada['id']}/confirmar", headers=autenticar_admin(client)
    )

    assert resposta.status_code == 403


def test_confirmado_por_mim(client, morador):
    criada = criar(client, morador)
    outro = autenticar(client)
    url = f"/ocorrencias/{criada['id']}"

    antes = client.get(url, headers=outro).json()["confirmado_por_mim"]
    client.post(url + "/confirmar", headers=outro)
    depois = client.get(url, headers=outro).json()["confirmado_por_mim"]

    assert antes is False and depois is True
    assert client.get(url).json()["confirmado_por_mim"] is False  # visitante
    assert client.get(url, headers=morador).json()["confirmado_por_mim"] is False


# --- filtro geográfico ---


def test_filtro_bbox_combina_com_categoria(client, morador):
    dentro = criar(client, morador, latitude=-10.5, longitude=-50.5, categoria_id=2)
    fora = criar(client, morador, latitude=-11.5, longitude=-50.5, categoria_id=2)
    outra_cat = criar(client, morador, latitude=-10.5, longitude=-50.4, categoria_id=1)
    area = "min_lat=-10.9&max_lat=-10.1&min_lon=-50.9&max_lon=-50.1"

    todas = {o["id"] for o in client.get(f"/ocorrencias?{area}").json()}
    so_cat = {o["id"] for o in client.get(f"/ocorrencias?{area}&categoria_id=2").json()}

    assert dentro["id"] in todas and outra_cat["id"] in todas
    assert fora["id"] not in todas
    assert so_cat == {dentro["id"]}


@pytest.mark.parametrize(
    "consulta",
    [
        "min_lat=-10&max_lat=-9",  # só dois limites
        "min_lat=-9&max_lat=-10&min_lon=1&max_lon=2",  # mínimo > máximo
        "min_lat=-95&max_lat=-9&min_lon=1&max_lon=2",  # fora do intervalo
        "min_lat=a&max_lat=1&min_lon=1&max_lon=2",
    ],
)
def test_filtro_bbox_incoerente_retorna_422(client, consulta):
    assert client.get(f"/ocorrencias?{consulta}").status_code == 422


# --- histórico ---


def test_historico_grava_responsavel_mas_nao_o_expoe(client, morador):
    criada = criar(client, morador)
    admin = autenticar_admin(client)

    mudar(client, admin, criada["id"], "Em análise")

    with SessionLocal() as session:
        linhas_hist = session.scalars(
            select(HistoricoStatus)
            .where(HistoricoStatus.ocorrencia_id == criada["id"])
            .order_by(HistoricoStatus.id)
        ).all()
    assert [(h.status_anterior, h.status_novo) for h in linhas_hist] == [
        (None, "Reportado"),
        ("Reportado", "Em análise"),
    ]
    assert linhas_hist[1].alterado_por_id != linhas_hist[0].alterado_por_id
    detalhe = client.get(f"/ocorrencias/{criada['id']}").json()
    assert all("alterado_por_id" not in h for h in detalhe["historico"])
