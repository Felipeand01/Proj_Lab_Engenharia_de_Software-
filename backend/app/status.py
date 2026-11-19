"""Regras de status das ocorrências e registro do histórico."""

from sqlalchemy.orm import Session

from backend.app.models import HistoricoStatus, Ocorrencia, Usuario

REPORTADO = "Reportado"
EM_ANALISE = "Em análise"
ENCAMINHADO = "Encaminhado"
EM_ANDAMENTO = "Em andamento"
RESOLVIDO = "Resolvido"
ARQUIVADO = "Arquivado"

TODOS_STATUS = (REPORTADO, EM_ANALISE, ENCAMINHADO, EM_ANDAMENTO, RESOLVIDO, ARQUIVADO)

# Fluxo linear. Resolvido e Arquivado são estados finais (sem próximo).
PROXIMO = {
    REPORTADO: EM_ANALISE,
    EM_ANALISE: ENCAMINHADO,
    ENCAMINHADO: EM_ANDAMENTO,
    EM_ANDAMENTO: RESOLVIDO,
}
ARQUIVAVEIS = (REPORTADO, EM_ANALISE, ENCAMINHADO, EM_ANDAMENTO)


def transicao_valida(atual: str, novo: str) -> bool:
    """Indica se o administrador pode mover a ocorrência de `atual` para `novo`."""
    if novo == ARQUIVADO:
        return atual in ARQUIVAVEIS
    return PROXIMO.get(atual) == novo


def registrar_mudanca(
    session: Session,
    ocorrencia: Ocorrencia,
    novo: str,
    autor: Usuario,
    motivo: str | None = None,
) -> None:
    """Atualiza o status da ocorrência e grava a linha correspondente no histórico.

    Para uma ocorrência recém-criada (ainda sem status), o status anterior é nulo.
    O commit fica por conta de quem chama.
    """
    session.add(
        HistoricoStatus(
            ocorrencia=ocorrencia,
            status_anterior=ocorrencia.status,
            status_novo=novo,
            alterado_por_id=autor.id,
            motivo=motivo,
        )
    )
    ocorrencia.status = novo
