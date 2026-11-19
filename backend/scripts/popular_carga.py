"""Popula um banco LOCAL com ocorrências de teste para o teste de carga (RNF04).

Uso (na raiz do repositório, com DATABASE_URL apontando para o banco local):

    python -m backend.scripts.popular_carga [--quantidade 1000]

Recusa qualquer host que não seja local. Exige que as categorias já existam
(`python -m backend.app.init_db`). Repetir não duplica: só completa até a quantidade.
"""

import argparse
import random
import sys

from sqlalchemy import func, select
from sqlalchemy.engine import make_url

HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1", "", None}
EMAIL_CARGA = "carga@exemplo.local"
PREFIXO = "[carga] "
STATUS = ["Reportado", "Em análise", "Encaminhado", "Em andamento", "Resolvido"]


def host_e_local(url: str) -> bool:
    """Verdadeiro para SQLite em arquivo ou PostgreSQL em host local."""
    return make_url(url).host in HOSTS_LOCAIS


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--quantidade", type=int, default=1000)
    args = ap.parse_args(argv)

    # Importados aqui: os models podem ganhar colunas; só usamos as obrigatórias.
    from backend.app.database import DATABASE_URL, SessionLocal
    from backend.app.models import Categoria, Ocorrencia, Usuario

    if not host_e_local(DATABASE_URL):
        print("Recusado: o banco não é local. Este script só roda em banco local.")
        return 2

    rng = random.Random(42)
    with SessionLocal() as s:
        categorias = list(s.scalars(select(Categoria.id)))
        if not categorias:
            print("Sem categorias. Rode antes: python -m backend.app.init_db")
            return 1
        usuario = s.scalar(select(Usuario).where(Usuario.email == EMAIL_CARGA))
        if usuario is None:
            # senha_hash inválido de propósito: este usuário não consegue fazer login.
            usuario = Usuario(nome="Carga", email=EMAIL_CARGA, senha_hash="!")
            s.add(usuario)
            s.flush()
        existentes = s.scalar(
            select(func.count())
            .select_from(Ocorrencia)
            .where(Ocorrencia.titulo.like(PREFIXO + "%"))
        )
        faltam = max(args.quantidade - existentes, 0)
        for i in range(faltam):
            s.add(
                Ocorrencia(
                    autor_id=usuario.id,
                    categoria_id=rng.choice(categorias),
                    titulo=f"{PREFIXO}Ocorrência {existentes + i + 1}",
                    descricao="Ocorrência sintética para teste de carga.",
                    # Área aproximada da cidade de São Paulo.
                    latitude=rng.uniform(-23.75, -23.45),
                    longitude=rng.uniform(-46.80, -46.45),
                    status=rng.choice(STATUS),
                )
            )
        s.commit()
    print(f"Criadas {faltam} ocorrências (total de carga: {existentes + faltam}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
