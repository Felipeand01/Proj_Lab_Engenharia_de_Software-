# Eficiência de Contexto e Tokens

## Objetivo

Concluir corretamente a TG3 com o menor desperdício possível de contexto, chamadas de modelo, subagents e ferramentas.

Qualidade e correção têm prioridade sobre economia extrema.

## Sessões

- Trabalhe preferencialmente em uma tarefa relevante por sessão.
- Não reconstrua contexto que já esteja registrado nos arquivos de estado.
- Antes de uma tarefa relevante, consulte somente:
  - `CLAUDE.md`
  - `.claude/state/TG3_STATUS.md`
  - `.claude/state/DECISIONS.md`
  - `.claude/state/NEXT_TASK.md`
  - arquivos diretamente relacionados à tarefa

- Não leia o repositório inteiro sem necessidade.
- Não reler arquivos que já foram compreendidos na mesma sessão sem motivo.
- Quando a tarefa mudar substancialmente, recomende `/clear`.

## Modelos

Padrão:
- Sonnet para implementação, testes, refatorações comuns e tarefas rotineiras.

Escalar para Opus somente quando houver:
- decisão arquitetural importante;
- debugging difícil após tentativas razoáveis;
- problema que envolva múltiplos subsistemas;
- revisão crítica de segurança;
- decisão ambígua de alto impacto.

Não usar Opus apenas para melhorar respostas simples.

## Effort

- Use esforço proporcional à complexidade.
- Não aumente effort sem necessidade.
- Para tarefas mecânicas, prefira baixo custo.
- Para arquitetura/debugging complexo, effort maior é aceitável.

## Subagents

Crie/delegue para subagent somente quando:
- permitir trabalho claramente paralelo;
- proteger o contexto principal;
- exigir especialização distinta;
- a revisão independente trouxer valor real.

Evite criar vários agentes para resolver a mesma tarefa simples.

Como padrão:
- máximo de 1 implementer;
- máximo de 1 reviewer adicional por tarefa;
- agentes extras somente com justificativa.

## Ferramentas externas

Use apenas quando agregarem valor real:

- Context7: documentação externa atualizada.
- Playwright: fluxo visual/web.
- Skills especializadas: somente quando correspondem diretamente à tarefa.
- Claude Octopus: somente para decisão difícil ou necessidade real de consenso.

Não chamar ferramentas apenas porque estão disponíveis.

## Testes

Durante implementação:
- execute primeiro testes direcionados à área alterada.

No gate final:
- execute a suíte completa aplicável.

Evite executar suites completas repetidamente sem alteração relevante.

## Respostas durante coding

Durante implementação:
- seja objetivo;
- evite tutoriais longos;
- não repita contexto conhecido;
- não produza documentação extensa sem solicitação;
- informe somente decisões, problemas e resultados relevantes.

## Escopo

Não implementar:
- funcionalidades não solicitadas;
- abstrações especulativas;
- arquitetura para necessidades futuras não confirmadas;
- componentes apenas decorativos;
- refatorações não relacionadas.

Prefira a menor solução correta que satisfaça os requisitos da TG3.

## Persistência entre sessões

Ao concluir uma tarefa relevante, atualize de forma curta:

### TG3_STATUS.md
O que está concluído e validado.

### DECISIONS.md
Somente decisões arquiteturais ou de produto que precisam sobreviver às sessões.

### NEXT_TASK.md
Próxima ação concreta e pendências.

Não transformar esses arquivos em logs extensos.
