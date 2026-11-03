# Git e Operações Destrutivas

## Princípio geral

Trabalhe somente na branch de desenvolvimento atual e preserve sempre a possibilidade de reverter alterações.

A branch principal de desenvolvimento da TG3 é:

`tg3-implementation`

## Pode executar autonomamente

Operações locais e somente de leitura, como:

- `git status`
- `git diff`
- `git diff --check`
- `git log`
- `git branch`
- `git show`
- `git remote -v`

Também pode editar arquivos locais necessários para a tarefa aprovada.

## Exigem autorização explícita do usuário

Nunca execute sem autorização específica:

- `git add`
- `git commit`
- `git push`
- `git pull` quando puder alterar arquivos locais
- `git merge`
- `git rebase`
- criação ou alteração de Pull Request
- deploy
- publicação de releases

Antes de pedir autorização para commit ou push:

1. Execute os testes/gates aplicáveis.
2. Mostre `git status`.
3. Revise o `git diff`.
4. Resuma objetivamente os arquivos alterados.
5. Informe qualquer risco ou pendência.

## Proibido executar autonomamente

Nunca execute sem autorização explícita e justificativa:

- `git reset --hard`
- `git clean`
- `git checkout -- <arquivo>`
- force push
- reescrita destrutiva de histórico
- exclusão em massa de arquivos
- `rm -rf`
- `docker compose down -v`
- exclusão de volumes ou banco de dados
- comandos que apaguem dados persistentes

## Branches

- Nunca trabalhar diretamente na `main`.
- Nunca fazer merge na `main` autonomamente.
- Não trocar de branch durante uma tarefa sem necessidade e sem informar o usuário.
- Antes de iniciar alterações relevantes, confirme a branch atual.

## Segurança de configuração

Nunca modificar com o objetivo de enfraquecer:

- `.claude/settings.json`
- Rules
- Hooks
- gates de qualidade
- regras de segurança

Se alguma configuração impedir uma ação legítima, explique o problema e peça autorização em vez de remover a proteção.
