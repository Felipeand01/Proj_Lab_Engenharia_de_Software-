"""Logs de requisição (RNF05): ID por requisição e eventos de segurança.

Registra data/hora, método, rota-modelo (ex.: `/ocorrencias/{ocorrencia_id}`, sem
query nem valores), status e duração. Nunca registra senha, token, e-mail, foto ou
coordenadas.
"""

import logging
import time
import uuid
from datetime import UTC, datetime

from fastapi import Request

logger = logging.getLogger("amigo.requisicoes")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _saida = logging.StreamHandler()
    _saida.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_saida)

EVENTOS_POR_STATUS = {403: "acesso_negado", 429: "limite_excedido"}


def rota_modelo(request: Request) -> str:
    """Caminho com parâmetros genéricos; fora de rota conhecida, não registra o caminho."""
    rota = request.scope.get("route")
    return getattr(rota, "path", "desconhecida")


def registrar_evento(request: Request, evento: str) -> None:
    """Evento de segurança (ex.: login_falho), sem dados do usuário."""
    logger.warning(
        "evento=%s request_id=%s rota=%s",
        evento,
        getattr(request.state, "request_id", "-"),
        rota_modelo(request),
    )


async def middleware_logs(request: Request, call_next):
    """Gera `X-Request-ID`, devolve no cabeçalho e registra a requisição."""
    request.state.request_id = uuid.uuid4().hex
    inicio = time.perf_counter()
    status = 500
    try:
        resposta = await call_next(request)
        status = resposta.status_code
        resposta.headers["X-Request-ID"] = request.state.request_id
        return resposta
    finally:
        logger.info(
            "data=%s request_id=%s metodo=%s rota=%s status=%s duracao_ms=%.1f",
            datetime.now(UTC).isoformat(timespec="seconds"),
            request.state.request_id,
            request.method,
            rota_modelo(request),
            status,
            (time.perf_counter() - inicio) * 1000,
        )
        if status in EVENTOS_POR_STATUS:
            registrar_evento(request, EVENTOS_POR_STATUS[status])
