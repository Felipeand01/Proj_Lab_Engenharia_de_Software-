"""Dados iniciais: categorias e primeiro administrador.

Primeiro administrador (credenciais só por variáveis de ambiente):

    ADMIN_EMAIL=... ADMIN_SENHA=... [ADMIN_NOME=...] python -m backend.app.seed
"""

import os

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import Categoria, Usuario
from backend.app.schemas import CadastroIn

CATEGORIAS_INICIAIS = ("Iluminação", "Limpeza", "Infraestrutura", "Segurança", "Outros")


def semear_categorias(session: Session) -> int:
    """Insere as categorias que faltam e devolve quantas foram criadas."""
    existentes = set(session.scalars(select(Categoria.nome)))
    novas = [Categoria(nome=n) for n in CATEGORIAS_INICIAIS if n not in existentes]
    session.add_all(novas)
    session.commit()
    return len(novas)


def criar_admin(session: Session, nome: str, email: str, senha: str) -> str:
    """Cria o administrador, ou promove o usuário existente com esse e-mail.

    A senha de um usuário já existente não é alterada.
    Devolve "criado", "promovido" ou "existente".
    """
    # Importado aqui para o init_db (só categorias) não exigir JWT_SECRET.
    from backend.app.security import gerar_hash

    dados = CadastroIn(nome=nome, email=email, senha=senha)  # mesmas regras do cadastro
    usuario = session.scalar(select(Usuario).where(Usuario.email == dados.email))
    if usuario is None:
        session.add(
            Usuario(
                nome=dados.nome,
                email=dados.email,
                senha_hash=gerar_hash(dados.senha),
                papel="admin",
            )
        )
        resultado = "criado"
    elif usuario.papel != "admin":
        usuario.papel = "admin"
        resultado = "promovido"
    else:
        resultado = "existente"
    session.commit()
    return resultado


def main() -> None:
    email = os.getenv("ADMIN_EMAIL")
    senha = os.getenv("ADMIN_SENHA")
    if not email or not senha:
        raise SystemExit("Defina ADMIN_EMAIL e ADMIN_SENHA no ambiente.")

    with SessionLocal() as session:
        try:
            resultado = criar_admin(
                session, os.getenv("ADMIN_NOME", "Administrador"), email, senha
            )
        except ValidationError as erro:
            # Mostra só os campos inválidos, nunca os valores informados.
            campos = ", ".join(str(e["loc"][0]) for e in erro.errors())
            raise SystemExit(f"Credenciais de administrador inválidas: {campos}.")
    print(f"Administrador {resultado}.")


if __name__ == "__main__":
    main()
