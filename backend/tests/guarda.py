"""Guarda dos testes: o `drop_all` só pode rodar em banco dedicado a testes."""

from sqlalchemy.engine import make_url

HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}


def validar_url_teste(url: str) -> str | None:
    """Devolve None se a URL é segura para os testes, ou o motivo da recusa.

    SQLite: o arquivo deve ter "test" no nome. PostgreSQL: host local e banco
    terminando em `_test`. Qualquer outro caso é recusado.
    """
    try:
        alvo = make_url(url)
    except Exception:
        return "URL de banco inválida"
    if alvo.drivername.startswith("sqlite"):
        arquivo = (alvo.database or "").rsplit("/", 1)[-1]
        if not (arquivo.startswith("test") or "_test" in arquivo):
            return "o arquivo SQLite de teste deve começar com 'test' ou conter '_test'"
        return None
    if alvo.drivername.startswith("postgresql"):
        if "host" in alvo.query or "hostaddr" in alvo.query:
            return "parâmetros host/hostaddr na URL não são aceitos"
        if alvo.host not in HOSTS_LOCAIS:
            return "o PostgreSQL de teste deve estar em host local"
        if not (alvo.database or "").endswith("_test"):
            return "o nome do banco de teste deve terminar em '_test'"
        return None
    return "somente SQLite ou PostgreSQL local são aceitos nos testes"
