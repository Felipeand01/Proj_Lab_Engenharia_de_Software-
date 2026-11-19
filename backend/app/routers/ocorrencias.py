"""Ocorrências: criação, consulta, confirmação comunitária e listas do usuário."""

from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    Depends,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from backend.app import fotos
from backend.app.models import Categoria, Confirmacao, Ocorrencia, Usuario
from backend.app.schemas import (
    MinhasOcorrenciasOut,
    OcorrenciaDetalhe,
    OcorrenciaForm,
    OcorrenciaOut,
)
from backend.app.limite import limitar
from backend.app.security import get_db, usuario_atual, usuario_opcional
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
        cep=ocorrencia.cep,
        logradouro=ocorrencia.logradouro,
        numero=ocorrencia.numero,
        complemento=ocorrencia.complemento,
        bairro=ocorrencia.bairro,
        cidade=ocorrencia.cidade,
        uf=ocorrencia.uf,
        status=ocorrencia.status,
        motivo_arquivamento=ocorrencia.motivo_arquivamento,
        criado_em=ocorrencia.criado_em,
        categoria=ocorrencia.categoria,
        autor_nome=ocorrencia.autor.nome,
        total_confirmacoes=len(ocorrencia.confirmacoes),
    )


def detalhe(
    ocorrencia: Ocorrencia, usuario: Usuario | None = None
) -> OcorrenciaDetalhe:
    """Detalhe com histórico; `confirmado_por_mim` só é verdadeiro para quem confirmou.

    O histórico não expõe quem alterou o status (privacidade do administrador).
    """
    return OcorrenciaDetalhe(
        **resumo(ocorrencia).model_dump(),
        historico=ocorrencia.historico,
        confirmado_por_mim=usuario is not None
        and any(c.usuario_id == usuario.id for c in ocorrencia.confirmacoes),
        eh_autor=usuario is not None and usuario.id == ocorrencia.autor_id,
    )


def buscar_ou_404(db: Session, ocorrencia_id: int) -> Ocorrencia:
    ocorrencia = db.scalar(
        select(Ocorrencia).where(Ocorrencia.id == ocorrencia_id).options(*CARREGAR)
    )
    if ocorrencia is None:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    return ocorrencia


def pode_ver(ocorrencia: Ocorrencia, usuario: Usuario | None) -> bool:
    """Arquivada só é visível para o administrador e para o autor (TG1, RN8)."""
    if ocorrencia.status != ARQUIVADO:
        return True
    return usuario is not None and (
        usuario.papel == "admin" or usuario.id == ocorrencia.autor_id
    )


def buscar_visivel_ou_404(
    db: Session, ocorrencia_id: int, usuario: Usuario | None
) -> Ocorrencia:
    """Como buscar_ou_404, mas oculta arquivadas de quem não pode vê-las.

    A resposta é idêntica à de uma ocorrência inexistente, para não revelar que o
    registro existe.
    """
    ocorrencia = buscar_ou_404(db, ocorrencia_id)
    if not pode_ver(ocorrencia, usuario):
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    return ocorrencia


@router.get("/ocorrencias", response_model=list[OcorrenciaOut])
def listar(
    categoria_id: int | None = None,
    status: StatusFiltro | None = None,
    min_lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
    max_lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
    min_lon: Annotated[float | None, Query(ge=-180, le=180)] = None,
    max_lon: Annotated[float | None, Query(ge=-180, le=180)] = None,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(usuario_opcional),
):
    """Lista ocorrências, da mais recente para a mais antiga.

    Filtro geográfico opcional: `min_lat`, `max_lat`, `min_lon` e `max_lon` devem vir
    todos juntos (e com mínimo <= máximo), senão 422. Combina com categoria e status.

    Pública, mas sem arquivadas: só o administrador as recebe (inclusive com
    `status=Arquivado`; para os demais esse filtro devolve lista vazia).
    """
    limites = (min_lat, max_lat, min_lon, max_lon)
    if any(v is not None for v in limites):
        if any(v is None for v in limites):
            raise HTTPException(status_code=422, detail="Informe os 4 limites da área")
        if min_lat > max_lat or min_lon > max_lon:
            raise HTTPException(status_code=422, detail="Área inválida")
    consulta = select(Ocorrencia).options(*CARREGAR).order_by(Ocorrencia.id.desc())
    if min_lat is not None:
        consulta = consulta.where(
            Ocorrencia.latitude.between(min_lat, max_lat),
            Ocorrencia.longitude.between(min_lon, max_lon),
        )
    if usuario is None or usuario.papel != "admin":
        consulta = consulta.where(Ocorrencia.status != ARQUIVADO)
    if categoria_id is not None:
        consulta = consulta.where(Ocorrencia.categoria_id == categoria_id)
    if status is not None:
        consulta = consulta.where(Ocorrencia.status == status)
    return [resumo(o) for o in db.scalars(consulta)]


@router.get("/ocorrencias/{ocorrencia_id}", response_model=OcorrenciaDetalhe)
def consultar(
    ocorrencia_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(usuario_opcional),
):
    """Detalhes e histórico (público). Arquivada: 404, salvo para o autor e o admin."""
    return detalhe(buscar_visivel_ou_404(db, ocorrencia_id, usuario), usuario)


def _buscar_por_chave(db: Session, autor_id: int, chave: str) -> Ocorrencia | None:
    return db.scalar(
        select(Ocorrencia)
        .where(Ocorrencia.autor_id == autor_id, Ocorrencia.chave_envio == chave)
        .options(*CARREGAR)
    )


@router.post(
    "/ocorrencias",
    response_model=OcorrenciaDetalhe,
    status_code=201,
    dependencies=[Depends(limitar("criar_ocorrencia"))],
)
def criar(
    dados: Annotated[OcorrenciaForm, Form()],
    arquivo: UploadFile,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Registra uma ocorrência (multipart, foto obrigatória) numa única requisição.

    Ordem: formulário válido, categoria, foto (reencode), armazenamento, e só então
    INSERT + histórico + commit. Qualquer falha antes do commit não deixa linha.
    Reenvio com a mesma `chave_envio` devolve a ocorrência já criada (200), sem novo
    upload. Administrador não cria ocorrências (403).
    """
    if usuario.papel == "admin":
        raise HTTPException(
            status_code=403, detail="Administradores não registram ocorrências"
        )
    chave = str(dados.chave_envio)
    existente = _buscar_por_chave(db, usuario.id, chave)
    if existente is not None:
        response.status_code = 200
        return detalhe(existente, usuario)

    if db.get(Categoria, dados.categoria_id) is None:
        raise HTTPException(status_code=422, detail="Categoria inexistente")

    # Lê no máximo o limite + 1 byte: o excedente nunca vai para a memória.
    jpeg = fotos.reencodar(arquivo.file.read(fotos.MAX_BYTES + 1))
    foto_url = fotos.armazenar(jpeg, request)

    campos = dados.model_dump(exclude={"chave_envio"})
    ocorrencia = Ocorrencia(
        **campos, chave_envio=chave, foto_url=foto_url, autor_id=usuario.id
    )
    registrar_mudanca(db, ocorrencia, REPORTADO, usuario)
    db.add(ocorrencia)
    try:
        db.commit()
    except IntegrityError:  # reenvio simultâneo com a mesma chave
        db.rollback()
        existente = _buscar_por_chave(db, usuario.id, chave)
        if existente is None:
            raise HTTPException(
                status_code=409, detail="Não foi possível registrar a ocorrência"
            ) from None
        response.status_code = 200
        return detalhe(existente, usuario)
    return detalhe(buscar_ou_404(db, ocorrencia.id), usuario)


@router.post(
    "/ocorrencias/{ocorrencia_id}/foto",
    response_model=OcorrenciaDetalhe,
    dependencies=[Depends(limitar("trocar_foto"))],
)
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
    return detalhe(buscar_ou_404(db, ocorrencia_id), usuario)


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
    """Confirma uma ocorrência (uma vez por usuário). Não altera o status.

    Confirmação é apoio de outros moradores: administrador e o próprio autor recebem 403.
    """
    ocorrencia = buscar_visivel_ou_404(db, ocorrencia_id, usuario)
    if usuario.papel == "admin":
        raise HTTPException(
            status_code=403, detail="Administradores não confirmam ocorrências"
        )
    if ocorrencia.status == ARQUIVADO:
        raise HTTPException(status_code=409, detail="Ocorrência arquivada")
    if ocorrencia.autor_id == usuario.id:
        raise HTTPException(
            status_code=403, detail="Você não pode confirmar a própria ocorrência"
        )

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
    """Ocorrências criadas e confirmadas pelo usuário autenticado.

    As criadas incluem as próprias arquivadas (o autor pode ver o motivo); as
    confirmadas nunca incluem arquivadas, que deixam de ser públicas.
    """
    base = select(Ocorrencia).options(*CARREGAR).order_by(Ocorrencia.id.desc())
    criadas = db.scalars(base.where(Ocorrencia.autor_id == usuario.id))
    confirmadas = db.scalars(
        base.join(Confirmacao).where(
            Confirmacao.usuario_id == usuario.id, Ocorrencia.status != ARQUIVADO
        )
    )
    return MinhasOcorrenciasOut(
        criadas=[resumo(o) for o in criadas],
        confirmadas=[resumo(o) for o in confirmadas],
    )
