# Amigo da Vizinhança

Projeto desenvolvido para a disciplina **Laboratório de Engenharia de Software**.

O **Amigo da Vizinhança** é um aplicativo móvel colaborativo voltado ao registro e acompanhamento de problemas de infraestrutura urbana, como buracos, iluminação defeituosa, lixo acumulado e outros problemas encontrados pelos moradores.

## Integrantes

- Eduardo Kenji Hernandes Ikematu 
- Felipe Marques Leite Martha
- Felipe Matos De Souza

## Etapa atual

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
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── main.py
│   └── requirements.txt
│
├── database/
│
├── mobile/
│   ├── assets/
│   ├── App.js
│   ├── app.json
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── docker-compose.yml
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
