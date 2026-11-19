"""Migração manual e idempotente do esquema (PostgreSQL), sem Alembic.

Uso:
    python -m backend.app.migrar                 # só imprime o SQL
    python -m backend.app.migrar --aplicar       # executa (banco local)
    python -m backend.app.migrar --aplicar --permitir-remoto   # banco remoto (Neon)

Antes de aplicar em banco remoto, faça backup (branch do Neon ou `pg_dump`).
Rollback: `DROP INDEX uq_ocorrencias_autor_chave`, `DROP TABLE tokens_revogados` e
`ALTER TABLE ocorrencias DROP COLUMN ...` para cada coluna adicionada.
Linhas antigas ficam com `chave_envio` NULL, que o PostgreSQL não trata como duplicada.
"""

import argparse
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}

COLUNAS = {
    "cep": "VARCHAR(8)",
    "logradouro": "VARCHAR(200)",
    "numero": "VARCHAR(20)",
    "complemento": "VARCHAR(100)",
    "bairro": "VARCHAR(100)",
    "cidade": "VARCHAR(100)",
    "uf": "VARCHAR(2)",
    "chave_envio": "VARCHAR(36)",
}

COMANDOS = [
    *(
        f"ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS {nome} {tipo}"
        for nome, tipo in COLUNAS.items()
    ),
    "CREATE TABLE IF NOT EXISTS tokens_revogados ("
    "jti VARCHAR(36) PRIMARY KEY, expira_em TIMESTAMP NOT NULL)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_ocorrencias_autor_chave "
    "ON ocorrencias (autor_id, chave_envio)",
]


def host_e_local(url: str) -> bool:
    return make_url(url).host in HOSTS_LOCAIS


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--aplicar", action="store_true", help="executa o SQL")
    parser.add_argument(
        "--permitir-remoto", action="store_true", help="permite host não local"
    )
    args = parser.parse_args(argv)

    for comando in COMANDOS:
        print(comando + ";")
    if not args.aplicar:
        print("\n-- Nada foi executado. Use --aplicar para aplicar.")
        return 0

    from backend.app.database import DATABASE_URL

    if not DATABASE_URL.startswith("postgresql"):
        print("Recusado: a migração é para PostgreSQL.", file=sys.stderr)
        return 2
    if not host_e_local(DATABASE_URL) and not args.permitir_remoto:
        print(
            "Recusado: o banco não é local. Faça backup e use --permitir-remoto.",
            file=sys.stderr,
        )
        return 2

    engine = create_engine(DATABASE_URL)
    with engine.begin() as conexao:  # uma transação: tudo ou nada
        for comando in COMANDOS:
            conexao.execute(text(comando))
    print("Migração aplicada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
