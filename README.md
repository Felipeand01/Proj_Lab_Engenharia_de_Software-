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
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── init_db.py
│   │   ├── main.py
│   │   └── models.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   └── test_main.py
│   ├── requirements.txt
│   └── requirements-dev.txt
│
├── database/
├── docs/
├── mobile/
├── docker-compose.yml
├── pytest.ini
├── .gitignore
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

## Execução do projeto

### 1. Banco de dados

Na raiz do projeto, iniciar o PostgreSQL com Docker Compose:

```bash
docker compose up -d db
```

Para verificar se o container está em execução:

```bash
docker compose ps
```

### 2. Backend

Criar o ambiente virtual Python, caso ainda não exista:

```bash
python -m venv backend/.venv
```

Ativar o ambiente virtual:

```bash
source backend/.venv/bin/activate
```

Instalar as dependências:

```bash
pip install -r backend/requirements.txt
```

Executar o FastAPI:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir backend
```

O backend ficará disponível na porta **8000**.

Para testar somente a API:

```text
/
```

Para testar a conexão com o PostgreSQL:

```text
/db-health
```

### 3. Frontend

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

### 4. Testes automatizados

Com o ambiente virtual do backend ativado, instalar as dependências de desenvolvimento:

```bash
pip install -r backend/requirements-dev.txt
```

Executar os testes automatizados:

```bash
python -m pytest
```

Resultado esperado:

```text
7 passed
```

Para gerar também o relatório HTML dos testes:

```bash
python -m pytest --html=relatorio_testes.html --self-contained-html
```