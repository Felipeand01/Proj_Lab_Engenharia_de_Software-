"""Rotas administrativas: status, arquivamento e indicadores."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models import Categoria, Ocorrencia, Usuario
from backend.app.routers.ocorrencias import buscar_ou_404, detalhe
from backend.app.schemas import ArquivarIn, IndicadoresOut, OcorrenciaDetalhe, StatusIn
from backend.app.security import exige_admin, get_db
from backend.app.status import (
    ARQUIVADO,
    TODOS_STATUS,
    registrar_mudanca,
    transicao_valida,
)

# Toda rota deste router exige administrador (401 sem token, 403 para morador).
router = APIRouter(
    prefix="/admin", tags=["Administração"], dependencies=[Depends(exige_admin)]
)


def aplicar_mudanca(
    db: Session,
    ocorrencia_id: int,
    novo: str,
    admin: Usuario,
    motivo: str | None = None,
) -> OcorrenciaDetalhe:
    ocorrencia = buscar_ou_404(db, ocorrencia_id)
    if not transicao_valida(ocorrencia.status, novo):
        raise HTTPException(
            status_code=409,
            detail=f"Transição inválida: {ocorrencia.status} → {novo}",
        )
    if novo == ARQUIVADO:
        ocorrencia.motivo_arquivamento = motivo
    registrar_mudanca(db, ocorrencia, novo, admin, motivo)
    db.commit()
    return detalhe(buscar_ou_404(db, ocorrencia_id))


@router.patch("/ocorrencias/{ocorrencia_id}/status", response_model=OcorrenciaDetalhe)
def alterar_status(
    ocorrencia_id: int,
    dados: StatusIn,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(exige_admin),
):
    """Avança a ocorrência para o próximo status do fluxo."""
    return aplicar_mudanca(db, ocorrencia_id, dados.status, admin)


@router.post("/ocorrencias/{ocorrencia_id}/arquivar", response_model=OcorrenciaDetalhe)
def arquivar(
    ocorrencia_id: int,
    dados: ArquivarIn,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(exige_admin),
):
    """Arquiva a ocorrência (exige motivo) a partir de um status não final."""
    return aplicar_mudanca(db, ocorrencia_id, ARQUIVADO, admin, dados.motivo)


@router.get("/indicadores", response_model=IndicadoresOut)
def indicadores(db: Session = Depends(get_db)):
    """Total de ocorrências por status e por categoria (inclui zeros)."""
    por_status = dict.fromkeys(TODOS_STATUS, 0)
    por_status.update(
        db.execute(
            select(Ocorrencia.status, func.count()).group_by(Ocorrencia.status)
        ).all()
    )
    por_categoria = dict(
        db.execute(
            select(Categoria.nome, func.count(Ocorrencia.id))
            .outerjoin(Ocorrencia, Ocorrencia.categoria_id == Categoria.id)
            .group_by(Categoria.nome)
            .order_by(Categoria.nome)
        ).all()
    )
    return IndicadoresOut(
        total=sum(por_status.values()),
        por_status=por_status,
        por_categoria=por_categoria,
    )
