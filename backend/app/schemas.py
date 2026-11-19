"""Schemas Pydantic de entrada e saída da API."""

import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from backend.app.status import ARQUIVADO, TODOS_STATUS

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

UFS = frozenset(
    "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split()
)

# Lista curta de senhas muito comuns (política mínima; não substitui verificação de vazamentos).
SENHAS_COMUNS = frozenset(
    {
        "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
        "password", "password1", "password123", "senha123", "senha1234",
        "12341234", "qwertyui", "qwerty123", "qwertyuiop", "abcd1234", "abc12345",
        "iloveyou", "admin123", "adminadmin", "brasil123", "mudar123",
        "senhasenha", "123mudar", "1q2w3e4r", "senha@123", "convidado",
    }
)  # fmt: skip


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

    @model_validator(mode="after")
    def senha_forte_o_bastante(self):
        """Rejeita senha comum ou igual ao e-mail (ou à parte local dele)."""
        senha = self.senha.lower()
        if senha in SENHAS_COMUNS or senha in (self.email, self.email.split("@")[0]):
            raise ValueError(
                "Essa senha é muito comum ou igual ao seu e-mail. Escolha outra."
            )
        return self


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


class OcorrenciaForm(BaseModel):
    """Campos do formulário multipart de criação (a foto vai em `arquivo`).

    Status, autor e demais campos extras enviados pelo cliente são ignorados.
    Campos de endereço opcionais: texto vazio vira None.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    categoria_id: int
    titulo: str = Field(min_length=3, max_length=120)
    descricao: str = Field(min_length=10, max_length=2000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    chave_envio: UUID
    cep: str | None = None
    logradouro: str | None = Field(default=None, max_length=200)
    numero: str | None = Field(default=None, max_length=20)
    complemento: str | None = Field(default=None, max_length=100)
    bairro: str | None = Field(default=None, max_length=100)
    cidade: str | None = Field(default=None, max_length=100)
    uf: str | None = None

    @field_validator(
        "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf",
        mode="before",
    )  # fmt: skip
    @classmethod
    def vazio_vira_none(cls, valor):
        return None if isinstance(valor, str) and not valor.strip() else valor

    @field_validator("cep")
    @classmethod
    def cep_com_8_digitos(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        if not re.fullmatch(r"\d{5}-?\d{3}", valor):
            raise ValueError("CEP deve ter 8 dígitos")
        return valor.replace("-", "")

    @field_validator("uf")
    @classmethod
    def uf_valida(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        if valor.upper() not in UFS:
            raise ValueError("UF inválida")
        return valor.upper()


class OcorrenciaOut(BaseModel):
    id: int
    titulo: str
    descricao: str
    foto_url: str | None
    latitude: float
    longitude: float
    cep: str | None
    logradouro: str | None
    numero: str | None
    complemento: str | None
    bairro: str | None
    cidade: str | None
    uf: str | None
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
    confirmado_por_mim: bool = False  # sempre falso para visitante
    eh_autor: bool = False  # sempre falso para visitante; esconde "Confirmar" do autor


class CandidatoLocalOut(BaseModel):
    logradouro: str | None
    bairro: str | None
    cidade: str | None
    uf: str | None
    cep: str | None
    latitude: float
    longitude: float
    rotulo: str


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
