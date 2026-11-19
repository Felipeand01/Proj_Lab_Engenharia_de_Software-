"""Rate limiting simples em memória (janela deslizante por IP e por rota).

Padrão seguro: a chave é `request.client.host`; `X-Forwarded-For` é IGNORADO, pois
o cliente poderia forjá-lo para burlar o limite. Com `CONFIAR_PROXY=1` (desligado
por padrão) usa-se só a entrada mais à direita do cabeçalho, a que o proxy confiável
acrescentou. Atrás de um proxy sem essa opção, vários clientes dividem o mesmo IP;
por isso os limites padrão são um teto anti-abuso coletivo e configuráveis por env.

RATE_LIMIT=0 desliga o limite (usado nos testes).

shortcut: estado em memória de 1 instância; usar Redis se houver várias instâncias.
"""

import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

# (tentativas, janela em segundos); sobrescrevível por LIMITE_<NOME>="20/60".
PADROES = {
    "login": (20, 60),
    "cadastro": (10, 60),
    "criar_ocorrencia": (10, 60),
    "busca_local": (30, 60),
    "busca_reversa": (30, 60),
    "trocar_foto": (10, 60),
}

_eventos: dict[tuple[str, str], deque] = defaultdict(deque)


def limpar() -> None:
    """Zera os contadores (uso em testes)."""
    _eventos.clear()


def ip_do_cliente(request: Request) -> str:
    if os.getenv("CONFIAR_PROXY") == "1":
        encaminhado = request.headers.get("x-forwarded-for", "")
        if encaminhado.strip():
            return encaminhado.split(",")[-1].strip()
    return request.client.host if request.client else "desconhecido"


def _configuracao(nome: str) -> tuple[int, int]:
    valor = os.getenv(f"LIMITE_{nome.upper()}")
    if valor:
        try:
            maximo, janela = valor.split("/")
            return int(maximo), int(janela)
        except ValueError:
            pass  # valor malformado: mantém o padrão
    return PADROES[nome]


def limitar(nome: str):
    """Cria uma dependência FastAPI que responde 429 ao exceder o limite de `nome`."""

    def dependencia(request: Request) -> None:
        if os.getenv("RATE_LIMIT", "1") == "0":
            return
        maximo, janela = _configuracao(nome)
        agora = time.monotonic()
        # shortcut: descarta tudo ao passar de 10.000 chaves; usar expiração por chave se escalar.
        if len(_eventos) > 10_000:
            _eventos.clear()
        fila = _eventos[(nome, ip_do_cliente(request))]
        while fila and agora - fila[0] >= janela:
            fila.popleft()
        if len(fila) >= maximo:
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas. Aguarde um pouco e tente novamente.",
                headers={"Retry-After": str(janela)},
            )
        fila.append(agora)

    return dependencia
