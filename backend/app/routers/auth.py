"""Cadastro, login e consulta do usuário autenticado."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models import Usuario
from backend.app.schemas import CadastroIn, LoginIn, TokenOut, UsuarioOut
from backend.app.security import (
    criar_token,
    gerar_hash,
    get_db,
    usuario_atual,
    verificar_senha,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Hash de uma senha qualquer: o login com e-mail inexistente também verifica um hash,
# para o tempo de resposta não revelar se o e-mail existe.
_HASH_FALSO = gerar_hash("senha-que-nao-existe")


@router.post("/cadastro", response_model=UsuarioOut, status_code=201)
def cadastrar(dados: CadastroIn, db: Session = Depends(get_db)):
    """Cria uma conta de morador. O papel nunca vem do cliente."""
    if db.scalar(select(Usuario).where(Usuario.email == dados.email)):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=gerar_hash(dados.senha),
        papel="morador",
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:  # cadastro simultâneo com o mesmo e-mail
        db.rollback()
        raise HTTPException(status_code=409, detail="E-mail já cadastrado") from None
    return usuario


@router.post("/login", response_model=TokenOut)
def login(dados: LoginIn, db: Session = Depends(get_db)):
    """Autentica por e-mail e senha e devolve um JWT com expiração."""
    usuario = db.scalar(select(Usuario).where(Usuario.email == dados.email))
    senha_ok = verificar_senha(
        dados.senha, usuario.senha_hash if usuario else _HASH_FALSO
    )
    if usuario is None or not senha_ok:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    return TokenOut(access_token=criar_token(usuario))


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(usuario_atual)):
    """Devolve os dados do usuário dono do token."""
    return usuario
