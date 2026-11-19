"""Guarda dos testes e da migração: nunca operar em banco que não seja de teste/local."""

import pytest

from backend.app import migrar
from backend.tests.guarda import validar_url_teste


@pytest.mark.parametrize(
    "url",
    [
        "sqlite:///backend/tests/test.db?check_same_thread=false",
        "postgresql+psycopg://u:p@localhost:5432/amigo_vizinhanca_test",
        "postgresql://u:p@127.0.0.1/outro_test",
    ],
)
def test_urls_de_teste_aceitas(url):
    assert validar_url_teste(url) is None


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://u:p@localhost:5432/amigo_vizinhanca",  # sem _test
        "postgresql+psycopg://u:p@ep-xyz.neon.tech/amigo_test",  # host remoto
        "postgresql+psycopg://u:p@localhost/test_amigo",  # _test não é sufixo
        "sqlite:///producao.db",  # SQLite sem 'test' no nome
        "mysql://u:p@localhost/x_test",  # driver não aceito
        "isto nao e url",
    ],
)
def test_urls_perigosas_recusadas(url):
    assert validar_url_teste(url)


def test_migracao_so_imprime_por_padrao(capsys):
    assert migrar.main([]) == 0
    saida = capsys.readouterr().out
    assert "uq_ocorrencias_autor_chave" in saida and "Nada foi executado" in saida


def test_migracao_recusa_aplicar_em_sqlite_dos_testes(capsys):
    assert migrar.main(["--aplicar"]) == 2


def test_migracao_identifica_host_local():
    assert migrar.host_e_local("postgresql://u:p@localhost/x")
    assert not migrar.host_e_local("postgresql://u:p@ep-xyz.neon.tech/x")


def test_brechas_da_revisao_de_seguranca_recusadas():
    """SQLite com 'test' no meio do nome e hostaddr no PostgreSQL são recusados (B7)."""
    from backend.tests.guarda import validar_url_teste

    assert validar_url_teste("sqlite:///prod_latest.db")
    assert validar_url_teste(
        "postgresql+psycopg://u:p@localhost/x_test?hostaddr=203.0.113.5"
    )
    assert validar_url_teste("sqlite:///test.db") is None
