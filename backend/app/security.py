"""Hash de senha, JWT e dependências de autenticação/autorização."""

import os
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import Usuario

ALGORITMO = "HS256"
EXPIRA_MINUTOS = int(os.getenv("JWT_EXPIRA_MINUTOS", "60"))

# O segredo vem sempre do ambiente; sem ele a API não inicia.
JWT_SECRET = os.getenv("JWT_SECRET", "")
if len(JWT_SECRET) < 32:
    raise RuntimeError("Defina JWT_SECRET no ambiente com pelo menos 32 caracteres.")

_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)


def gerar_hash(senha: str) -> str:
    return _hasher.hash(senha)


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        return _hasher.verify(senha_hash, senha)
    except (VerificationError, InvalidHashError):
        return False


def criar_token(usuario: Usuario) -> str:
    """Gera um JWT com expiração. `sub` guarda o id do usuário (como texto)."""
    expira = datetime.now(UTC) + timedelta(minutes=EXPIRA_MINUTOS)
    return jwt.encode(
        {"sub": str(usuario.id), "exp": expira}, JWT_SECRET, algorithm=ALGORITMO
    )


def ler_token(token: str) -> int | None:
    """Devolve o id do usuário do token, ou None se inválido ou expirado."""
    try:
        dados = jwt.decode(
            token, JWT_SECRET, algorithms=[ALGORITMO], options={"require": ["exp"]}
        )
        return int(dados["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


def usuario_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Exige token válido e devolve o usuário; caso contrário, 401."""
    erro = HTTPException(
        status_code=401,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credenciais is None:
        raise erro
    usuario_id = ler_token(credenciais.credentials)
    usuario = db.get(Usuario, usuario_id) if usuario_id is not None else None
    if usuario is None:
        raise erro
    return usuario


def exige_admin(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
    """Exige papel de administrador; caso contrário, 403."""
    if usuario.papel != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return usuario
