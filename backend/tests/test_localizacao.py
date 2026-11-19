"""Busca de localização (ViaCEP + Nominatim) com serviços externos simulados.

Critérios: cache evita nova chamada; chamadas ao Nominatim respeitam >= 1 s entre si;
falha externa vira 503 com orientação; entradas inválidas 422; limite por IP 429.
Nenhum teste acessa a rede.
"""

import httpx
import pytest

from backend.app import limite
from backend.app.routers import localizacao

VIACEP_OK = {
    "cep": "01310-100",
    "logradouro": "Avenida Paulista",
    "bairro": "Bela Vista",
    "localidade": "São Paulo",
    "uf": "SP",
}
NOMINATIM_ITEM = {
    "lat": "-23.5614",
    "lon": "-46.6559",
    "display_name": "Avenida Paulista, Bela Vista, São Paulo, SP, Brasil",
    "address": {
        "road": "Avenida Paulista",
        "suburb": "Bela Vista",
        "city": "São Paulo",
        "ISO3166-2-lvl4": "BR-SP",
        "postcode": "01310-100",
    },
}


NOMINATIM_REVERSO_OK = {
    "lat": "-23.5614",
    "lon": "-46.6559",
    "display_name": "Avenida Paulista, Bela Vista, São Paulo, SP, 01310-100, Brasil",
    "address": {
        "road": "Avenida Paulista",
        "suburb": "Bela Vista",
        "city": "São Paulo",
        "ISO3166-2-lvl4": "BR-SP",
        "postcode": "01310-100",
        "country_code": "br",
    },
}


class Externo:
    """Substitui `_http_get` registrando as chamadas e o instante de cada uma."""

    def __init__(self, relogio):
        self.chamadas = []
        self.viacep = VIACEP_OK
        self.nominatim = [NOMINATIM_ITEM]
        self.reverso = NOMINATIM_REVERSO_OK
        self.erro = None
        self.relogio = relogio

    def __call__(self, url, params=None):
        self.chamadas.append((url, params, self.relogio.t))
        if self.erro:
            raise self.erro
        if "viacep" in url:
            return self.viacep
        return self.reverso if url.endswith("/reverse") else self.nominatim

    def nominatim_chamadas(self):
        return [c for c in self.chamadas if "nominatim" in c[0]]


class Relogio:
    """Relógio falso: `dormir` avança o tempo sem esperar de verdade."""

    def __init__(self):
        self.t = 1000.0

    def agora(self):
        return self.t

    def dormir(self, s):
        self.t += s


@pytest.fixture
def externo(monkeypatch):
    relogio = Relogio()
    falso = Externo(relogio)
    monkeypatch.setattr(localizacao, "_http_get", falso)
    monkeypatch.setattr(localizacao, "_agora", relogio.agora)
    monkeypatch.setattr(localizacao, "_dormir", relogio.dormir)
    monkeypatch.setattr(localizacao, "_ultima_chamada", float("-inf"))
    localizacao._cache.clear()
    return falso


def test_busca_por_cep_devolve_candidatos_com_dados_do_viacep(client, externo):
    resposta = client.get("/localizacao/buscar?cep=01310-100")

    assert resposta.status_code == 200
    [candidato] = resposta.json()
    assert candidato["logradouro"] == "Avenida Paulista"
    assert candidato["cep"] == "01310100"
    assert candidato["uf"] == "SP"
    assert candidato["latitude"] == pytest.approx(-23.5614)
    assert "Brasil" in candidato["rotulo"]


def test_busca_por_endereco_devolve_ate_5_candidatos(client, externo):
    externo.nominatim = [NOMINATIM_ITEM] * 5

    resposta = client.get("/localizacao/buscar?endereco=Avenida Paulista 1000")

    assert resposta.status_code == 200 and len(resposta.json()) == 5
    _, params, _ = externo.nominatim_chamadas()[0]
    assert params["limit"] == 5 and params["countrycodes"] == "br"


def test_cache_evita_segunda_chamada_externa(client, externo):
    client.get("/localizacao/buscar?cep=01310100")
    total = len(externo.chamadas)

    segunda = client.get("/localizacao/buscar?cep=01310-100")

    assert segunda.status_code == 200
    assert len(externo.chamadas) == total
    client.get("/localizacao/buscar?endereco=Rua  A, 10")
    total = len(externo.chamadas)
    client.get("/localizacao/buscar?endereco=rua a, 10")  # normalizado
    assert len(externo.chamadas) == total


def test_chamadas_ao_nominatim_respeitam_1_segundo(client, externo):
    client.get("/localizacao/buscar?endereco=Rua das Flores 10")
    client.get("/localizacao/buscar?endereco=Rua das Palmeiras 20")
    client.get("/localizacao/buscar?cep=01310100")

    instantes = [c[2] for c in externo.nominatim_chamadas()]
    assert len(instantes) == 3
    assert all(b - a >= 1.0 for a, b in zip(instantes, instantes[1:], strict=False))


def test_user_agent_identifica_o_app_sem_email():
    assert "AmigoDaVizinhanca" in localizacao.USER_AGENT
    assert localizacao.USER_AGENT == (
        "AmigoDaVizinhanca/0.1 (projeto academico; "
        "https://github.com/Felipeand01/Proj_Lab_Engenharia_de_Software-)"
    )
    assert "@" not in localizacao.USER_AGENT


def test_falha_externa_retorna_503_com_orientacao(client, externo):
    externo.erro = httpx.ConnectError("sem rede")

    resposta = client.get("/localizacao/buscar?cep=01310100")

    assert resposta.status_code == 503
    assert "GPS" in resposta.json()["detail"]
    assert "sem rede" not in resposta.text


def test_falha_so_no_nominatim_retorna_503(client, externo, monkeypatch):
    def parcial(url, params=None):
        if "viacep" in url:
            return VIACEP_OK
        raise httpx.ReadTimeout("lento")

    monkeypatch.setattr(localizacao, "_http_get", parcial)

    assert client.get("/localizacao/buscar?cep=01310100").status_code == 503
    assert client.get("/localizacao/buscar?endereco=Rua das Flores").status_code == 503


def test_cep_inexistente_ou_sem_resultado_retorna_404(client, externo):
    externo.viacep = {"erro": True}
    assert client.get("/localizacao/buscar?cep=99999999").status_code == 404
    externo.nominatim = []
    assert client.get("/localizacao/buscar?endereco=lugar nenhum").status_code == 404


@pytest.mark.parametrize(
    "consulta",
    [
        "",  # nenhum parâmetro
        "cep=123",
        "cep=abcdefgh",
        "cep=01310100&endereco=Rua A",  # os dois
        "endereco=ab",
        "endereco=" + "x" * 201,
    ],
)
def test_entrada_invalida_retorna_422_sem_chamar_servicos(client, externo, consulta):
    assert client.get(f"/localizacao/buscar?{consulta}").status_code == 422
    assert externo.chamadas == []


def test_busca_excedendo_limite_por_ip_retorna_429(client, externo, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT", "1")
    monkeypatch.setenv("LIMITE_BUSCA_LOCAL", "2/60")
    limite.limpar()

    codigos = [
        client.get("/localizacao/buscar?cep=01310100").status_code for _ in range(3)
    ]
    limite.limpar()

    assert codigos == [200, 200, 429]


# --- geocodificação reversa (ponto do mapa ou do GPS) ---


def test_reversa_devolve_endereco_do_ponto_com_as_coordenadas_pedidas(client, externo):
    resposta = client.get("/localizacao/reversa?latitude=-23.5620&longitude=-46.6550")

    assert resposta.status_code == 200
    r = resposta.json()
    assert r["logradouro"] == "Avenida Paulista" and r["bairro"] == "Bela Vista"
    assert r["cidade"] == "São Paulo" and r["uf"] == "SP" and r["cep"] == "01310100"
    # O ponto é o escolhido pelo usuário, não o do objeto que o Nominatim encontrou.
    assert r["latitude"] == -23.562 and r["longitude"] == -46.655
    _, params, _ = externo.nominatim_chamadas()[0]
    assert params["lat"] == -23.562 and params["zoom"] == 18


def test_reversa_resultado_parcial_nao_inventa_dados(client, externo):
    externo.reverso = {
        "display_name": "Brasil",
        "address": {"city": "São Paulo", "postcode": "01310", "country_code": "br"},
    }

    r = client.get("/localizacao/reversa?latitude=-23.5&longitude=-46.6").json()

    assert r["cidade"] == "São Paulo"
    assert r["logradouro"] is None and r["bairro"] is None and r["uf"] is None
    assert r["cep"] is None  # prefixo de 5 dígitos não é um CEP


@pytest.mark.parametrize(
    "sem_endereco",
    [
        {"error": "Unable to geocode"},
        {"address": {"country_code": "ar", "road": "Calle X"}},  # fora do Brasil
        [],
    ],
)
def test_reversa_sem_endereco_no_brasil_retorna_404(client, externo, sem_endereco):
    externo.reverso = sem_endereco

    resposta = client.get("/localizacao/reversa?latitude=-23.5&longitude=-46.6")

    assert resposta.status_code == 404


def test_reversa_com_servico_indisponivel_retorna_503(client, externo):
    externo.erro = httpx.ConnectError("sem rede")

    assert (
        client.get("/localizacao/reversa?latitude=-1&longitude=-1").status_code == 503
    )


def test_reversa_usa_cache_e_respeita_1_segundo_com_a_busca(client, externo):
    client.get("/localizacao/reversa?latitude=-23.5&longitude=-46.6")
    client.get("/localizacao/reversa?latitude=-23.5&longitude=-46.6")  # cache
    client.get("/localizacao/buscar?endereco=Rua das Flores 10")

    instantes = [c[2] for c in externo.nominatim_chamadas()]
    assert len(instantes) == 2
    assert instantes[1] - instantes[0] >= 1.0


@pytest.mark.parametrize(
    "consulta",
    [
        "",
        "latitude=-23.5",
        "latitude=91&longitude=0",
        "latitude=0&longitude=181",
        "latitude=abc&longitude=0",
    ],
)
def test_reversa_com_entrada_invalida_retorna_422_sem_chamar_servicos(
    client, externo, consulta
):
    assert client.get(f"/localizacao/reversa?{consulta}").status_code == 422
    assert externo.chamadas == []


def test_reversa_excedendo_limite_por_ip_retorna_429(client, externo, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT", "1")
    monkeypatch.setenv("LIMITE_BUSCA_REVERSA", "2/60")
    limite.limpar()

    codigos = [
        client.get(f"/localizacao/reversa?latitude=-23.5&longitude=-46.{i}").status_code
        for i in range(3)
    ]
    limite.limpar()

    assert codigos == [200, 200, 429]


def test_busca_ignora_cep_parcial_do_nominatim(client, externo):
    """Um postcode de 5 dígitos não pode virar CEP: o cadastro exige 8 dígitos."""
    externo.nominatim = [
        {
            **NOMINATIM_ITEM,
            "address": {**NOMINATIM_ITEM["address"], "postcode": "01310"},
        }
    ]

    [candidato] = client.get(
        "/localizacao/buscar?endereco=Avenida Paulista 1000"
    ).json()

    assert candidato["cep"] is None
