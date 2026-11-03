# Backend

Aplicar estas regras ao trabalhar em `backend/**`.

## Stack

- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pytest

## Princípios

- Manter código simples, legível e modular.
- Evitar abstrações prematuras.
- Não adicionar dependências sem necessidade real.
- Preservar compatibilidade com Python 3.12.
- Preferir recursos oficiais do FastAPI e SQLAlchemy.

## Estrutura

Separar responsabilidades quando o backend crescer.

Evitar concentrar:
- modelos;
- schemas;
- regras de negócio;
- autenticação;
- rotas;
- utilitários

em um único arquivo grande.

Não refatorar toda a estrutura antecipadamente sem necessidade.

## API

- Usar métodos HTTP adequados.
- Retornar códigos HTTP corretos.
- Validar entradas.
- Tratar erros de forma explícita.
- Não expor detalhes internos em respostas.
- Manter contratos de API claros e previsíveis.

## Banco de dados

- Usar SQLAlchemy.
- Não construir SQL concatenando entrada do usuário.
- Trabalhar com sessões de forma segura.
- Evitar alterações destrutivas.
- Quando o modelo começar a evoluir de forma significativa, propor migrations antes de alterar produção.

## Configuração

- Não hardcodar secrets de produção.
- Configurações sensíveis devem vir do ambiente.
- Manter valores locais/de desenvolvimento claramente separados de produção.

## Desenvolvimento local

Ambiente esperado:
- PostgreSQL via Docker na porta 5432.
- FastAPI na porta 8000.
- ambiente virtual em `backend/.venv`.

Comandos relevantes:

`source backend/.venv/bin/activate`

`uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir backend`

## Qualidade

Após alterar backend:
1. rodar teste direcionado relevante;
2. rodar lint/formatação aplicável;
3. rodar suíte backend completa no gate final.

Não considerar feature backend pronta se testes relevantes estiverem falhando.
