# Testes e Gates

## Princípio

Não considerar uma implementação pronta apenas porque compila ou parece funcionar.

Toda feature deve possuir nível de validação proporcional ao risco.

## Durante implementação

Executar primeiro testes direcionados para reduzir tempo e consumo de tokens.

Não rodar toda a suíte repetidamente após mudanças pequenas sem necessidade.

## Backend

Ferramenta principal:
- Pytest

Casos a considerar:
- caminho feliz;
- input inválido;
- recurso inexistente;
- não autenticado;
- papel incorreto;
- recurso de outro usuário;
- estado inválido;
- erro esperado.

Não testar apenas status `200`.

## Frontend

Validar:
- renderização;
- loading;
- erro;
- vazio;
- ações dos botões;
- navegação;
- integração com API;
- responsividade mobile.

Playwright pode ser usado para fluxos Expo Web.

Maestro será usado posteriormente para fluxos mobile relevantes.

## Segurança

Features sensíveis devem incluir testes negativos de autenticação e autorização.

Nunca confiar apenas em teste visual.

## Gates finais

Antes de considerar uma tarefa concluída, executar os gates aplicáveis.

Backend:
- lint;
- formatação;
- Pytest.

Frontend:
- lint;
- testes aplicáveis;
- verificação do fluxo alterado;
- ausência de erros relevantes no console.

Segurança:
- nenhum secret exposto;
- validação adequada;
- autorização verificada quando aplicável.

## Falhas

Se um gate falhar:
1. identificar causa;
2. corrigir somente o necessário;
3. executar novamente o teste direcionado;
4. rodar o gate final quando estabilizar.

Não mascarar falhas:
- removendo testes;
- diminuindo assertions;
- ignorando erros;
- desabilitando lint;
- alterando configuração apenas para fazer o gate passar.

## Regressão

Quando uma correção resolver bug relevante:
- adicionar teste que reproduza o problema sempre que viável.

## Evidência

Ao finalizar uma tarefa, informar objetivamente:
- quais testes foram executados;
- quais passaram;
- quais não foram executados e por quê.

Nunca afirmar que algo foi testado se o teste não foi realmente executado.
