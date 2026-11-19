# Matriz de Autorização

## Perfis

O Amigo da Vizinhança possui três níveis de acesso:

- Visitante: usuário não autenticado.
- Morador: usuário autenticado que utiliza as funcionalidades de participação.
- Administrador: usuário autenticado responsável pela análise e moderação das ocorrências.

## Matriz de permissões

| Ação | Visitante | Morador | Administrador |
|---|---|---|---|
| Visualizar mapa | Permitido | Permitido | Permitido |
| Listar ocorrências | Permitido | Permitido | Permitido |
| Visualizar detalhes de ocorrência | Permitido | Permitido | Permitido |
| Criar conta | Permitido | Não aplicável | Não aplicável |
| Fazer login | Permitido | Permitido | Permitido |
| Criar ocorrência | Negado | Permitido | Negado |
| Visualizar próprias ocorrências | Negado | Permitido | Não aplicável |
| Confirmar/apoiar ocorrência | Negado | Permitido | Negado |
| Visualizar ocorrências confirmadas pelo próprio usuário | Negado | Permitido | Não aplicável |
| Visualizar todas as ocorrências para moderação | Negado | Negado | Permitido |
| Alterar status de ocorrência | Negado | Negado | Permitido |
| Arquivar ocorrência | Negado | Negado | Permitido |
| Informar motivo do arquivamento | Negado | Negado | Permitido |
| Visualizar indicadores administrativos | Negado | Negado | Permitido |
| Excluir ocorrência definitivamente | Negado | Negado | Negado |

## Regras de segurança

1. A autorização deve ser validada pelo backend em cada endpoint protegido.
2. Ocultar uma funcionalidade no frontend não substitui a validação de autorização no backend.
3. O status inicial de uma nova ocorrência é sempre `Reportado`.
4. Somente o Administrador pode alterar o status de uma ocorrência.
5. O arquivamento é permitido somente ao Administrador e exige motivo.
6. Uma confirmação representa apenas participação comunitária.
7. A quantidade de confirmações não altera automaticamente status, prioridade, gravidade ou veracidade da ocorrência.
8. Cada Morador pode confirmar uma mesma ocorrência no máximo uma vez.
9. Operações não previstas nesta matriz devem permanecer negadas até que sejam explicitamente definidas.
10. Exclusão física de ocorrências não faz parte do MVP. Ocorrências encerradas devem permanecer disponíveis conforme as regras de histórico do sistema.

## Fluxo de status

Fluxo normal:

`Reportado -> Em análise -> Encaminhado -> Em andamento -> Resolvido`

Também é permitido ao Administrador arquivar uma ocorrência a partir de:

- Reportado
- Em análise
- Encaminhado
- Em andamento

`Resolvido` e `Arquivado` são estados finais.

## Princípio padrão

Na ausência de uma permissão explicitamente concedida:

**NEGAR ACESSO.**
