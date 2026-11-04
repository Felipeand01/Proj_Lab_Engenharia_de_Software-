"""Schemas Pydantic de entrada e saída da API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.status import ARQUIVADO, TODOS_STATUS

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class CadastroIn(BaseModel):
    # Campos extras (ex.: "papel") são ignorados: o cadastro público só cria morador.
    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str = Field(min_length=2, max_length=100)
    email: str = Field(max_length=254, pattern=EMAIL_REGEX)
    senha: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def email_minusculo(cls, valor: str) -> str:
        return valor.lower()


class LoginIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(max_length=254)
    senha: str = Field(max_length=128)

    @field_validator("email")
    @classmethod
    def email_minusculo(cls, valor: str) -> str:
        return valor.lower()


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    papel: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CategoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str


class OcorrenciaIn(BaseModel):
    # Status, autor e demais campos extras enviados pelo cliente são ignorados.
    model_config = ConfigDict(str_strip_whitespace=True)

    categoria_id: int
    titulo: str = Field(min_length=3, max_length=120)
    descricao: str = Field(min_length=10, max_length=2000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class OcorrenciaOut(BaseModel):
    id: int
    titulo: str
    descricao: str
    foto_url: str | None
    latitude: float
    longitude: float
    status: str
    motivo_arquivamento: str | None
    criado_em: datetime
    categoria: CategoriaOut
    autor_nome: str
    total_confirmacoes: int


class HistoricoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status_anterior: str | None
    status_novo: str
    motivo: str | None
    criado_em: datetime


class OcorrenciaDetalhe(OcorrenciaOut):
    historico: list[HistoricoOut]


class MinhasOcorrenciasOut(BaseModel):
    criadas: list[OcorrenciaOut]
    confirmadas: list[OcorrenciaOut]


# Arquivar tem endpoint próprio, pois exige motivo.
StatusAlteravel = Literal[*(s for s in TODOS_STATUS if s != ARQUIVADO)]


class StatusIn(BaseModel):
    status: StatusAlteravel


class ArquivarIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    motivo: str = Field(min_length=3, max_length=500)


class IndicadoresOut(BaseModel):
    total: int
    por_status: dict[str, int]
    por_categoria: dict[str, int]
