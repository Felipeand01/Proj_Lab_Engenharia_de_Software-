# Amigo da Vizinhança

Projeto desenvolvido para a disciplina **Laboratório de Engenharia de Software**.

O **Amigo da Vizinhança** é um aplicativo móvel colaborativo voltado ao registro e acompanhamento de problemas de infraestrutura urbana, como buracos, iluminação defeituosa, lixo acumulado e outros problemas encontrados pelos moradores.

## Integrantes

- Eduardo Kenji Hernandes Ikematu 
- Felipe Marques Leite Martha
- Felipe Matos De Souza

## Etapas do projeto

### TG2 - Kick-off do desenvolvimento

Nesta etapa foi configurado o ambiente de desenvolvimento e implementado um teste de integração envolvendo as principais camadas da arquitetura:

**Frontend → Backend → Banco de Dados → Backend → Frontend**

O teste permite verificar, pela interface do aplicativo, se o frontend consegue acessar a API e se a API consegue consultar o banco PostgreSQL.

## Arquitetura

A solução está organizada em três partes principais:

### Frontend

- React Native
- Expo

Responsável pela interface do aplicativo e pela interação com o usuário.

### Backend

- Python
- FastAPI
- SQLAlchemy

Responsável pela API REST, regras de negócio e comunicação com o banco de dados.

### Banco de Dados

- PostgreSQL

Responsável pela persistência dos dados da aplicação.

## Ambiente de desenvolvimento

O projeto utiliza:

- GitHub
- GitHub Codespaces
- Git
- Docker
- Docker Compose

O Codespaces fornece um ambiente de desenvolvimento padronizado para o grupo.

## Estrutura do projeto

```text
.
├── .devcontainer/
│   └── devcontainer.json
│
├── .github/
│   └── workflows/
│       └── backend-tests.yml
│
├── backend/
│   ├── app/
│   │   ├── routers/          # auth, ocorrencias e admin
│   │   ├── database.py
│   │   ├── init_db.py        # cria tabelas e categorias iniciais
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py       # hash de senha, JWT e permissões
│   │   ├── seed.py           # categorias e primeiro administrador
│   │   └── status.py         # regras de status das ocorrências
│   ├── tests/
│   ├── requirements.txt
│   └── requirements-dev.txt
│
├── database/
├── docs/
├── mobile/
├── .env.example
├── docker-compose.yml
├── pytest.ini
├── ruff.toml
└── README.md
```

## Portas utilizadas

| Porta | Serviço |
|---|---|
| 8000 | FastAPI |
| 8081 | Expo / Metro |
| 5432 | PostgreSQL |

No GitHub Codespaces, a porta **8000** é utilizada pelo backend FastAPI e a porta **8081** pelo frontend Expo. O PostgreSQL utiliza a porta **5432**.

Durante a demonstração da integração pelo navegador no Codespaces, a porta 8000 deve estar acessível ao frontend. A porta do PostgreSQL deve permanecer privada.

## Teste de integração da TG2

Para a TG2 foi implementado um teste simples para verificar a comunicação entre as principais camadas da arquitetura:

**Frontend → Backend → Banco de Dados → Backend → Frontend**

O frontend realiza uma requisição para o endpoint:

```text
GET /db-health
```

O FastAPI recebe a requisição, utiliza o SQLAlchemy para consultar o PostgreSQL e retorna as informações da conexão.

Exemplo de resposta da API:

```json
{
  "status": "ok",
  "database": "amigo_vizinhanca",
  "user": "amigo_user"
}
```

Quando a integração está funcionando corretamente, a interface apresenta:

```text
Conexão realizada com sucesso!

Frontend: React Native + Expo
Backend: FastAPI
Banco de dados: amigo_vizinhanca
Usuário PostgreSQL: amigo_user
Status: ok
```

## Modelo de dados implementado na TG2

Para iniciar a implementação do modelo de dados, foi criada a entidade **Categoria**, definida com SQLAlchemy e persistida no PostgreSQL.

A tabela possui os seguintes campos:

| Campo | Tipo | Descrição |
|---|---|---|
| id | Integer | Identificador único da categoria |
| nome | String(50) | Nome da categoria, obrigatório e único |

Foram cadastradas inicialmente as seguintes categorias:

- Iluminação
- Limpeza
- Infraestrutura
- Segurança
- Outros

Também foi criado o endpoint:

```text
GET /categorias
```

Esse endpoint consulta a tabela `categorias` no PostgreSQL e retorna os registros cadastrados.

Exemplo de resposta:

```json
[
  {
    "id": 1,
    "nome": "Iluminação"
  },
  {
    "id": 2,
    "nome": "Limpeza"
  },
  {
    "id": 3,
    "nome": "Infraestrutura"
  },
  {
    "id": 4,
    "nome": "Segurança"
  },
  {
    "id": 5,
    "nome": "Outros"
  }
]
```

### TG3 - Checkpoint 1: Backend e testes automatizados

O primeiro checkpoint da TG3 teve como objetivo evoluir o backend da aplicação e implementar testes automatizados para os endpoints da API.

Nesta etapa, foi adicionado o endpoint de consulta individual de categorias:

```text
GET /categorias/{categoria_id}
```

O endpoint retorna a categoria correspondente ao identificador informado. Caso a categoria não exista, a API retorna o código HTTP `404`.

#### Endpoints testados

Os testes automatizados verificam os seguintes endpoints:

| Endpoint | Cenário | Resultado esperado |
|---|---|---|
| `GET /` | API disponível | `200 OK` |
| `GET /health` | Backend funcionando | `200 OK` |
| `GET /db-health` | Resposta do endpoint de verificação do banco | `200 OK` |
| `GET /categorias` | Listagem de categorias | `200 OK` |
| `GET /categorias/1` | Categoria existente | `200 OK` |
| `GET /categorias/999` | Categoria inexistente | `404 Not Found` |
| `GET /categorias/abc` | Identificador inválido | `422 Unprocessable Entity` |

#### Testes automatizados

Os testes foram desenvolvidos utilizando:

- Pytest
- FastAPI TestClient
- HTTPX
- pytest-html

Os testes utilizam um banco isolado para evitar alterações no banco PostgreSQL utilizado durante o desenvolvimento da aplicação.

Para executar todos os testes localmente:

```bash
python -m pytest
```

Resultado esperado:

```text
7 passed
```

#### GitHub Actions

Também foi configurado um workflow de integração contínua utilizando GitHub Actions.

O arquivo responsável pela automação está localizado em:

```text
.github/workflows/backend-tests.yml
```

A cada `push` ou `pull_request`, o GitHub Actions executa automaticamente as seguintes etapas:

1. Obtém o código do repositório.
2. Configura o Python 3.12.
3. Instala as dependências do backend e dos testes.
4. Executa os testes automatizados.
5. Gera um relatório HTML com os resultados.
6. Disponibiliza o relatório como artefato da execução.

O relatório gerado pelo workflow é disponibilizado com o nome:

```text
backend-test-report
```

No Checkpoint 1, os sete testes automatizados foram executados com sucesso tanto no ambiente local quanto pelo GitHub Actions.

## API do backend (TG3)

| Método e rota | Acesso | Descrição |
|---|---|---|
| `POST /auth/cadastro` | público | Cria conta de morador (o papel nunca vem do cliente) |
| `POST /auth/login` | público | Devolve o token JWT |
| `GET /auth/me` | autenticado | Dados do usuário do token |
| `GET /ocorrencias` | público | Lista, com filtros `categoria_id` e `status` |
| `GET /ocorrencias/{id}` | público | Detalhes e histórico |
| `POST /ocorrencias` | autenticado | Cria ocorrência (status inicial `Reportado`) |
| `POST /ocorrencias/{id}/confirmar` | autenticado | Confirma a ocorrência (uma vez por usuário) |
| `GET /minhas-ocorrencias` | autenticado | Ocorrências criadas e confirmadas pelo usuário |
| `PATCH /admin/ocorrencias/{id}/status` | administrador | Avança o status no fluxo |
| `POST /admin/ocorrencias/{id}/arquivar` | administrador | Arquiva, com motivo obrigatório |
| `GET /admin/indicadores` | administrador | Totais por status e categoria |
| `GET /categorias`, `GET /categorias/{id}` | público | Categorias |
| `GET /`, `/health`, `/db-health` | público | Verificações da API e do banco |

Fluxo de status: `Reportado → Em análise → Encaminhado → Em andamento → Resolvido`. O administrador pode arquivar (com motivo) a partir de qualquer status, exceto `Resolvido` e `Arquivado`, que são finais. Confirmações da comunidade não alteram status nem prioridade.

A autenticação usa o cabeçalho `Authorization: Bearer <token>`.

## Execução do projeto

Todos os comandos partem da raiz do repositório. Pré-requisitos: Python 3.12, Docker com Docker Compose, Node 22 (frontend).

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` (ele não é versionado):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | não | Padrão: PostgreSQL do `docker-compose.yml` em `localhost:5432` |
| `JWT_SECRET` | **sim** | Mínimo de 32 caracteres. Sem ela a API não inicia |
| `JWT_EXPIRA_MINUTOS` | não | Validade do token (padrão 60) |
| `CORS_ORIGINS` | não | Origens permitidas, separadas por vírgula (padrão: Expo local, portas 8081 e 19006) |
| `CORS_ORIGIN_REGEX` | não | Regex de origens extras, por exemplo URLs do Codespaces. Vazio em produção |
| `ADMIN_EMAIL`, `ADMIN_SENHA`, `ADMIN_NOME` | só para criar o admin | Credenciais do primeiro administrador (senha com mínimo de 8 caracteres) |

Gere um segredo para o JWT e coloque no `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Carregue as variáveis no terminal onde for usar o backend (a aplicação lê o ambiente, não o arquivo):

```bash
set -a; source .env; set +a
```

### 2. Banco de dados

Iniciar o PostgreSQL com Docker Compose:

```bash
docker compose up -d db
docker compose ps
```

### 3. Backend

Criar o ambiente virtual e instalar as dependências (use `requirements-dev.txt` se também for rodar testes e lint):

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements-dev.txt
```

Criar as tabelas e as categorias iniciais (pode ser repetido sem problemas):

```bash
python -m backend.app.init_db
```

Criar o primeiro administrador (lê `ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME` do ambiente; repetir não duplica a conta nem troca a senha):

```bash
python -m backend.app.seed
```

Executar a API:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir backend
```

O backend fica na porta **8000**. A documentação automática do FastAPI está em:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Para rotas protegidas no Swagger, faça login em `POST /auth/login` e informe o token no botão **Authorize**.

Verificações rápidas: `/` (API) e `/db-health` (conexão com o PostgreSQL).

### 4. Frontend

Em outro terminal, entrar na pasta do aplicativo:

```bash
cd mobile
```

Instalar as dependências, caso necessário:

```bash
npm install
```

Executar o Expo no navegador:

```bash
npx expo start --web --port 8081
```

O frontend ficará disponível na porta **8081**.

### 5. Testes automatizados

Com o ambiente virtual ativado e as dependências de desenvolvimento instaladas:

```bash
python -m pytest
```

Todos os testes devem passar. Por padrão eles usam um banco SQLite descartável, sem tocar no PostgreSQL de desenvolvimento, e não precisam do `.env` (o `JWT_SECRET` de teste é definido pelo `conftest.py`).

Para rodar a mesma suíte em um PostgreSQL de teste, use um banco **separado**, pois os testes apagam e recriam as tabelas dele:

```bash
docker compose exec db psql -U amigo_user -d amigo_vizinhanca -c "CREATE DATABASE amigo_teste"
TEST_DATABASE_URL="postgresql+psycopg://amigo_user:amigo_pass@localhost:5432/amigo_teste" python -m pytest
```

Relatório HTML dos testes:

```bash
python -m pytest --html=relatorio_testes.html --self-contained-html
```

Lint e formatação:

```bash
ruff check backend
ruff format --check backend
```
