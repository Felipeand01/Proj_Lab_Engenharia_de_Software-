from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def agora() -> datetime:
    """Data/hora atual em UTC, usada como padrão das colunas de criação."""
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    papel: Mapped[str] = mapped_column(String(20), default="morador", nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)


class Ocorrencia(Base):
    __tablename__ = "ocorrencias"

    id: Mapped[int] = mapped_column(primary_key=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    categoria_id: Mapped[int] = mapped_column(
        ForeignKey("categorias.id"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(String(120), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    foto_url: Mapped[str | None] = mapped_column(String(500))
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Reportado", nullable=False)
    motivo_arquivamento: Mapped[str | None] = mapped_column(String(500))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)

    autor: Mapped[Usuario] = relationship()
    categoria: Mapped[Categoria] = relationship()
    confirmacoes: Mapped[list["Confirmacao"]] = relationship(
        back_populates="ocorrencia"
    )
    historico: Mapped[list["HistoricoStatus"]] = relationship(
        back_populates="ocorrencia", order_by="HistoricoStatus.id"
    )


class Confirmacao(Base):
    __tablename__ = "confirmacoes"
    # Cada usuário confirma uma ocorrência no máximo uma vez.
    __table_args__ = (UniqueConstraint("ocorrencia_id", "usuario_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ocorrencia_id: Mapped[int] = mapped_column(
        ForeignKey("ocorrencias.id"), nullable=False
    )
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)

    ocorrencia: Mapped[Ocorrencia] = relationship(back_populates="confirmacoes")


class HistoricoStatus(Base):
    __tablename__ = "historico_status"

    id: Mapped[int] = mapped_column(primary_key=True)
    ocorrencia_id: Mapped[int] = mapped_column(
        ForeignKey("ocorrencias.id"), nullable=False
    )
    status_anterior: Mapped[str | None] = mapped_column(String(20))
    status_novo: Mapped[str] = mapped_column(String(20), nullable=False)
    alterado_por_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"), nullable=False
    )
    motivo: Mapped[str | None] = mapped_column(String(500))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=agora)

    ocorrencia: Mapped[Ocorrencia] = relationship(back_populates="historico")
