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