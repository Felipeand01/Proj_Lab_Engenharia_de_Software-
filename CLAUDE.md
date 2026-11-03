# Amigo da Vizinhança — Instruções do Projeto

## Objetivo atual
Concluir a TG3 da disciplina Laboratório de Engenharia de Software, implementando a aplicação planejada nas TG1 e TG2, com frontend, backend, banco de dados, testes automatizados, segurança, documentação e versão publicada.

## Stack principal
- Frontend: React Native + Expo
- Backend: Python + FastAPI
- ORM: SQLAlchemy
- Banco: PostgreSQL
- Testes backend: Pytest
- CI: GitHub Actions
- Ambiente local: Windows 11 + WSL Ubuntu + VS Code
- Containers: Docker Desktop + Docker Compose

## Regras de trabalho
- Idioma: PT-BR.
- Prefira soluções simples, legíveis e adequadas ao nível acadêmico do projeto.
- Não introduza dependências sem necessidade real.
- Não altere a arquitetura definida nas TG1/TG2 sem justificar e pedir aprovação.
- Não implemente funcionalidades fora do escopo apenas para sofisticar o projeto.
- Não faça git commit, git push, merge, deploy ou alterações destrutivas sem autorização explícita.
- Não use git reset --hard, git clean, rm -rf ou docker compose down -v sem autorização explícita.
- Preserve compatibilidade com o ambiente local e com o GitHub Actions.

## Prioridade de fontes
1. Materiais da disciplina e requisitos da TG3.
2. TG1/TG2 e decisões já registradas.
3. Código atual do repositório.
4. Documentação oficial das tecnologias.
5. Outras fontes apenas quando necessário.

## Fluxo de trabalho
Antes de implementar:
1. Entender a tarefa.
2. Verificar contexto relevante.
3. Propor plano curto.
4. Só então implementar.

Durante a implementação:
- Trabalhar em escopo pequeno.
- Rodar testes direcionados.
- Evitar refatorações não relacionadas.
- Registrar decisões importantes.

Antes de concluir:
- Rodar gates aplicáveis.
- Revisar git diff.
- Atualizar o estado persistente do projeto.

## Economia de contexto e tokens
- Uma tarefa relevante por sessão.
- Usar /clear entre tarefas diferentes.
- Não reler o repositório inteiro sem necessidade.
- Carregar apenas os arquivos relevantes para a tarefa atual.
- Sonnet como padrão.
- Opus apenas para arquitetura, debugging difícil ou decisões complexas.
- Subagents apenas quando agregarem valor real.
- Evitar explicações longas durante implementação.

## Estado persistente
Antes de iniciar uma tarefa relevante, consulte:
- .claude/state/TG3_STATUS.md
- .claude/state/DECISIONS.md
- .claude/state/NEXT_TASK.md

Ao finalizar uma tarefa relevante, atualize esses arquivos de forma curta e objetiva.
