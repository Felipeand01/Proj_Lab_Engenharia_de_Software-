"""Ocorrências: criação, consulta, confirmação comunitária e listas do usuário."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from backend.app import fotos
from backend.app.models import Categoria, Confirmacao, Ocorrencia, Usuario
from backend.app.schemas import (
    MinhasOcorrenciasOut,
    OcorrenciaDetalhe,
    OcorrenciaIn,
    OcorrenciaOut,
)
from backend.app.security import get_db, usuario_atual
from backend.app.status import ARQUIVADO, REPORTADO, TODOS_STATUS, registrar_mudanca

router = APIRouter(tags=["Ocorrências"])

StatusFiltro = Literal[*TODOS_STATUS]

# Evita consultas extras por ocorrência ao montar as listas.
CARREGAR = (
    selectinload(Ocorrencia.autor),
    selectinload(Ocorrencia.categoria),
    selectinload(Ocorrencia.confirmacoes),
)


def resumo(ocorrencia: Ocorrencia) -> OcorrenciaOut:
    """Monta a saída pública (sem e-mail do autor, só o nome)."""
    return OcorrenciaOut(
        id=ocorrencia.id,
        titulo=ocorrencia.titulo,
        descricao=ocorrencia.descricao,
        foto_url=ocorrencia.foto_url,
        latitude=ocorrencia.latitude,
        longitude=ocorrencia.longitude,
        status=ocorrencia.status,
        motivo_arquivamento=ocorrencia.motivo_arquivamento,
        criado_em=ocorrencia.criado_em,
        categoria=ocorrencia.categoria,
        autor_nome=ocorrencia.autor.nome,
        total_confirmacoes=len(ocorrencia.confirmacoes),
    )


def detalhe(ocorrencia: Ocorrencia) -> OcorrenciaDetalhe:
    return OcorrenciaDetalhe(
        **resumo(ocorrencia).model_dump(),
        historico=ocorrencia.historico,
    )


def buscar_ou_404(db: Session, ocorrencia_id: int) -> Ocorrencia:
    ocorrencia = db.scalar(
        select(Ocorrencia).where(Ocorrencia.id == ocorrencia_id).options(*CARREGAR)
    )
    if ocorrencia is None:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    return ocorrencia


@router.get("/ocorrencias", response_model=list[OcorrenciaOut])
def listar(
    categoria_id: int | None = None,
    status: StatusFiltro | None = None,
    db: Session = Depends(get_db),
):
    """Lista ocorrências (público), da mais recente para a mais antiga."""
    consulta = select(Ocorrencia).options(*CARREGAR).order_by(Ocorrencia.id.desc())
    if categoria_id is not None:
        consulta = consulta.where(Ocorrencia.categoria_id == categoria_id)
    if status is not None:
        consulta = consulta.where(Ocorrencia.status == status)
    return [resumo(o) for o in db.scalars(consulta)]


@router.get("/ocorrencias/{ocorrencia_id}", response_model=OcorrenciaDetalhe)
def consultar(ocorrencia_id: int, db: Session = Depends(get_db)):
    """Detalhes e histórico de uma ocorrência (público)."""
    return detalhe(buscar_ou_404(db, ocorrencia_id))


@router.post("/ocorrencias", response_model=OcorrenciaDetalhe, status_code=201)
def criar(
    dados: OcorrenciaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Registra uma ocorrência com status inicial Reportado."""
    if db.get(Categoria, dados.categoria_id) is None:
        raise HTTPException(status_code=422, detail="Categoria inexistente")

    ocorrencia = Ocorrencia(**dados.model_dump(), autor_id=usuario.id)
    registrar_mudanca(db, ocorrencia, REPORTADO, usuario)
    db.add(ocorrencia)
    db.commit()
    return detalhe(buscar_ou_404(db, ocorrencia.id))


@router.post("/ocorrencias/{ocorrencia_id}/foto", response_model=OcorrenciaDetalhe)
def enviar_foto(
    ocorrencia_id: int,
    request: Request,
    arquivo: UploadFile,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Define a foto da ocorrência (uma por ocorrência; substitui a anterior)."""
    ocorrencia = buscar_ou_404(db, ocorrencia_id)
    if ocorrencia.autor_id != usuario.id and usuario.papel != "admin":
        raise HTTPException(status_code=403, detail="Apenas o autor pode enviar a foto")
    if ocorrencia.status == ARQUIVADO:
        raise HTTPException(status_code=409, detail="Ocorrência arquivada")

    # Lê no máximo o limite + 1 byte: o excedente nunca vai para a memória.
    conteudo = arquivo.file.read(fotos.MAX_BYTES + 1)
    ocorrencia.foto_url = fotos.armazenar(fotos.reencodar(conteudo), request)
    db.commit()
    return detalhe(buscar_ou_404(db, ocorrencia_id))


@router.post(
    "/ocorrencias/{ocorrencia_id}/confirmar",
    response_model=OcorrenciaOut,
    status_code=201,
)
def confirmar(
    ocorrencia_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Confirma uma ocorrência (uma vez por usuário). Não altera o status."""
    ocorrencia = buscar_ou_404(db, ocorrencia_id)
    if ocorrencia.status == ARQUIVADO:
        raise HTTPException(status_code=409, detail="Ocorrência arquivada")

    ja_confirmou = db.scalar(
        select(Confirmacao).where(
            Confirmacao.ocorrencia_id == ocorrencia_id,
            Confirmacao.usuario_id == usuario.id,
        )
    )
    if ja_confirmou:
        raise HTTPException(status_code=409, detail="Você já confirmou esta ocorrência")

    db.add(Confirmacao(ocorrencia_id=ocorrencia_id, usuario_id=usuario.id))
    try:
        db.commit()
    except IntegrityError:  # confirmação simultânea do mesmo usuário
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Você já confirmou esta ocorrência"
        ) from None
    db.refresh(ocorrencia)
    return resumo(ocorrencia)


@router.get("/minhas-ocorrencias", response_model=MinhasOcorrenciasOut)
def minhas(db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    """Ocorrências criadas e confirmadas pelo usuário autenticado."""
    base = select(Ocorrencia).options(*CARREGAR).order_by(Ocorrencia.id.desc())
    criadas = db.scalars(base.where(Ocorrencia.autor_id == usuario.id))
    confirmadas = db.scalars(
        base.join(Confirmacao).where(Confirmacao.usuario_id == usuario.id)
    )
    return MinhasOcorrenciasOut(
        criadas=[resumo(o) for o in criadas],
        confirmadas=[resumo(o) for o in confirmadas],
    )
