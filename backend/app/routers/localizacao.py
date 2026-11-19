"""Busca de localização por CEP ou endereço (ViaCEP + Nominatim/OpenStreetMap).

Só é chamada quando o usuário toca em "Buscar" (nunca por tecla/autocomplete). Para
respeitar a política do Nominatim: no máximo 1 requisição por segundo (trava global
no processo), User-Agent identificando o app, cache de resultados e timeout.

shortcut: trava e cache em memória valem para 1 instância; com várias instâncias,
usar fila/cache compartilhado.
"""

import logging
import re
import threading
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.limite import limitar
from backend.app.schemas import UFS, CandidatoLocalOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/localizacao", tags=["Localização"])

VIACEP = "https://viacep.com.br/ws/{cep}/json/"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSO = "https://nominatim.openstreetmap.org/reverse"
# Identifica o app e o repositório (política do Nominatim), sem e-mail pessoal.
USER_AGENT = (
    "AmigoDaVizinhanca/0.1 (projeto academico; "
    "https://github.com/Felipeand01/Proj_Lab_Engenharia_de_Software-)"
)
INTERVALO_NOMINATIM = 1.0  # segundos entre chamadas ao Nominatim
TIMEOUT = 8
MAX_CACHE = 500
MAX_CANDIDATOS = 5

_agora = time.monotonic  # trocáveis nos testes
_dormir = time.sleep
_trava = threading.Lock()
_ultima_chamada = float("-inf")
_cache: dict[str, list[dict]] = {}


def _http_get(url: str, params: dict | None = None) -> object:
    """GET com timeout e User-Agent; devolve o JSON. Erros viram 503 no chamador."""
    resposta = httpx.get(
        url, params=params, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT}
    )
    resposta.raise_for_status()
    return resposta.json()


def _indisponivel() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="Busca de endereço indisponível agora. Use o GPS ou marque no mapa.",
    )


ESPERA_TRAVA = 2  # segundos aguardando a vez antes de responder 503


def _consultar_nominatim(url: str, params: dict) -> object:
    """Chamada ao Nominatim (busca ou reversa) respeitando o intervalo global."""
    global _ultima_chamada
    # Espera limitada pela trava: sem isso, uma fila de buscas prenderia as threads da API.
    if not _trava.acquire(timeout=ESPERA_TRAVA):
        raise _indisponivel()
    try:
        espera = INTERVALO_NOMINATIM - (_agora() - _ultima_chamada)
        if espera > 0:
            _dormir(espera)
        _ultima_chamada = _agora()
        try:
            return _http_get(url, params)
        except (httpx.HTTPError, ValueError) as erro:
            logger.warning("Nominatim falhou: %s", type(erro).__name__)
            raise _indisponivel() from None
    finally:
        _trava.release()


def _nominatim(params: dict) -> list[dict]:
    """Busca no Nominatim (até MAX_CANDIDATOS resultados)."""
    dados = _consultar_nominatim(
        NOMINATIM,
        {
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": MAX_CANDIDATOS,
            "countrycodes": "br",
            **params,
        },
    )
    return dados if isinstance(dados, list) else []


def _cep_de_8_digitos(texto: object) -> str | None:
    """CEP só vale com 8 dígitos; o Nominatim às vezes devolve só o prefixo."""
    digitos = re.sub(r"\D", "", str(texto or ""))
    return digitos if len(digitos) == 8 else None


def _candidato(item: dict, cep: str | None = None) -> dict | None:
    end = item.get("address") or {}
    iso = end.get("ISO3166-2-lvl4", "")  # ex.: "BR-SP"
    uf = iso.split("-")[-1] if iso.startswith("BR-") else None
    try:
        latitude, longitude = float(item["lat"]), float(item["lon"])
    except (KeyError, TypeError, ValueError):
        return None
    return {
        "logradouro": end.get("road"),
        "bairro": end.get("suburb") or end.get("neighbourhood"),
        "cidade": end.get("city") or end.get("town") or end.get("village"),
        "uf": uf if uf in UFS else None,
        "cep": cep or _cep_de_8_digitos(end.get("postcode")),
        "latitude": latitude,
        "longitude": longitude,
        "rotulo": str(item.get("display_name", ""))[:300],
    }


def _buscar_por_cep(cep: str) -> list[dict]:
    try:
        dados = _http_get(VIACEP.format(cep=cep))
    except (httpx.HTTPError, ValueError) as erro:
        logger.warning("ViaCEP falhou: %s", type(erro).__name__)
        raise _indisponivel() from None
    if not isinstance(dados, dict) or dados.get("erro"):
        raise HTTPException(status_code=404, detail="CEP não encontrado")
    consulta = ", ".join(
        p
        for p in (dados.get("logradouro"), dados.get("localidade"), dados.get("uf"))
        if p
    )
    itens = _nominatim({"q": consulta})
    candidatos = [c for c in (_candidato(i, cep) for i in itens) if c]
    # Preenche o que o ViaCEP conhece (mais confiável que o Nominatim para CEP).
    for c in candidatos:
        c["logradouro"] = dados.get("logradouro") or c["logradouro"]
        c["bairro"] = dados.get("bairro") or c["bairro"]
        c["cidade"] = dados.get("localidade") or c["cidade"]
        c["uf"] = dados.get("uf") or c["uf"]
    return candidatos


@router.get(
    "/buscar",
    response_model=list[CandidatoLocalOut],
    dependencies=[Depends(limitar("busca_local"))],
)
def buscar(
    cep: str | None = Query(default=None, max_length=9),
    endereco: str | None = Query(default=None, min_length=3, max_length=200),
):
    """Até 5 candidatos para um CEP (8 dígitos) ou um endereço digitado.

    Informe exatamente um dos dois. 404 se nada for encontrado; 503 se os serviços
    externos falharem (o app sugere GPS ou marcação no mapa).
    """
    if (cep is None) == (endereco is None):
        raise HTTPException(status_code=422, detail="Informe cep ou endereco")
    if cep is not None:
        if not re.fullmatch(r"\d{5}-?\d{3}", cep):
            raise HTTPException(status_code=422, detail="CEP deve ter 8 dígitos")
        chave = "cep:" + cep.replace("-", "")
    else:
        chave = "end:" + " ".join(endereco.lower().split())

    if chave not in _cache:
        if cep is not None:
            resultado = _buscar_por_cep(chave[4:])
        else:
            itens = _nominatim({"q": endereco})
            resultado = [c for c in (_candidato(i) for i in itens) if c]
        if not resultado:
            raise HTTPException(status_code=404, detail="Endereço não encontrado")
        if len(_cache) >= MAX_CACHE:
            _cache.clear()
        _cache[chave] = resultado
    return _cache[chave]


@router.get(
    "/reversa",
    response_model=CandidatoLocalOut,
    dependencies=[Depends(limitar("busca_reversa"))],
)
def reversa(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    """Endereço aproximado de um ponto do mapa ou do GPS (geocodificação reversa).

    Devolve só o que o Nominatim informou: campo ausente fica nulo (nada é inventado) e
    as coordenadas devolvidas são as do ponto pedido. 404 se o ponto não tem endereço no
    Brasil; 503 se o serviço externo falhar (o app deixa o endereço em branco).
    """
    chave = f"rev:{latitude:.5f},{longitude:.5f}"
    if chave not in _cache:
        dados = _consultar_nominatim(
            NOMINATIM_REVERSO,
            {
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 18,
                "lat": latitude,
                "lon": longitude,
            },
        )
        endereco = dados.get("address") if isinstance(dados, dict) else None
        if not isinstance(endereco, dict) or endereco.get("country_code") != "br":
            raise HTTPException(
                status_code=404, detail="Endereço não encontrado para este ponto"
            )
        candidato = _candidato(
            {
                "lat": latitude,
                "lon": longitude,
                "address": endereco,
                "display_name": dados.get("display_name", ""),
            }
        )
        if len(_cache) >= MAX_CACHE:
            _cache.clear()
        _cache[chave] = [candidato]
    return {**_cache[chave][0], "latitude": latitude, "longitude": longitude}
