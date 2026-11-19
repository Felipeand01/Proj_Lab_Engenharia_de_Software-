"""Hash de senha, JWT e dependências de autenticação/autorização."""

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import TokenRevogado, Usuario

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
    """Gera um JWT com expiração. `sub` guarda o id do usuário (como texto).

    `jti` identifica o token, para que o logout possa revogá-lo.
    """
    expira = datetime.now(UTC) + timedelta(minutes=EXPIRA_MINUTOS)
    return jwt.encode(
        {"sub": str(usuario.id), "exp": expira, "jti": uuid.uuid4().hex},
        JWT_SECRET,
        algorithm=ALGORITMO,
    )


def _dados_do_token(token: str) -> dict | None:
    """Claims do token, ou None se inválido ou expirado."""
    try:
        dados = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITMO],
            options={"require": ["exp", "sub", "jti"]},
        )
        int(dados["sub"])
        return dados
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def ler_token(token: str) -> int | None:
    """Devolve o id do usuário do token, ou None se inválido ou expirado."""
    dados = _dados_do_token(token)
    return int(dados["sub"]) if dados else None


def revogar_token(db: Session, token: str) -> None:
    """Registra o `jti` do token como revogado (logout) e limpa revogações vencidas."""
    dados = _dados_do_token(token)
    if dados and dados.get("jti"):
        agora = datetime.now(UTC).replace(tzinfo=None)
        db.execute(delete(TokenRevogado).where(TokenRevogado.expira_em < agora))
        expira = datetime.fromtimestamp(dados["exp"], UTC).replace(tzinfo=None)
        db.merge(TokenRevogado(jti=dados["jti"], expira_em=expira))
        db.commit()


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


def _usuario_do_token(
    credenciais: HTTPAuthorizationCredentials | None, db: Session
) -> Usuario | None:
    if credenciais is None:
        return None
    dados = _dados_do_token(credenciais.credentials)
    if dados is None:
        return None
    jti = dados.get("jti")
    if jti and db.get(TokenRevogado, jti) is not None:
        return None  # token revogado por logout
    return db.get(Usuario, int(dados["sub"]))


def usuario_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Exige token válido e devolve o usuário; caso contrário, 401."""
    usuario = _usuario_do_token(credenciais, db)
    if usuario is None:
        raise HTTPException(
            status_code=401,
            detail="Não autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


def usuario_opcional(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario | None:
    """Usuário do token ou None (visitante), para rotas públicas.

    Token ausente, inválido, expirado ou de usuário inexistente vira visitante, e não
    erro 401: o app envia o token em todas as chamadas, e um token vencido não pode
    quebrar a consulta pública nem conceder privilégio algum.
    """
    return _usuario_do_token(credenciais, db)


def exige_admin(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
    """Exige papel de administrador; caso contrário, 403."""
    if usuario.papel != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return usuario
