# OWASP API Security Top 10 — Amigo da Vizinhança

## Objetivo

Este documento aplica o OWASP API Security Top 10 2023 à API do
Amigo da Vizinhança.

Ele deve orientar a implementação e a revisão de segurança do backend
FastAPI durante a TG3.

Status utilizados:

- OK: controle já existente ou risco não presente no estado atual.
- PENDENTE: controle necessário em funcionalidade ainda não implementada.
- ATENÇÃO: risco presente ou configuração que deve ser corrigida antes do deploy.

---

## API1:2023 — Broken Object Level Authorization

**Status: PENDENTE**

Risco para o projeto:

Endpoints que utilizarem IDs de ocorrências, usuários, confirmações ou outros
objetos não podem confiar apenas no ID fornecido pelo cliente.

Controles necessários:

- validar autorização no backend;
- verificar propriedade do recurso quando aplicável;
- impedir que um Morador acesse recursos privados de outro Morador;
- não autorizar operações administrativas apenas porque o cliente conhece o ID;
- criar testes automatizados para acesso permitido e negado.

Exemplo:

Um Morador não pode alterar um ID na URL e acessar informações privadas
pertencentes a outro usuário.

---

## API2:2023 — Broken Authentication

**Status: PENDENTE**

A autenticação ainda não foi implementada.

Quando for criada:

- armazenar senhas somente com hash seguro;
- nunca armazenar senha em texto puro;
- usar tokens com expiração;
- validar tokens no backend;
- não confiar em informações de autenticação enviadas pelo frontend sem validação;
- não expor tokens, senhas ou outros segredos em logs;
- proteger endpoints autenticados por dependências de autenticação do FastAPI.

---

## API3:2023 — Broken Object Property Level Authorization

**Status: PENDENTE**

O cliente não deve poder escolher livremente todos os campos de um objeto.

Controles necessários:

- utilizar schemas explícitos de entrada;
- aceitar somente campos permitidos;
- não permitir que um Morador envie campos administrativos;
- impedir alteração direta de status pelo Morador;
- impedir alteração de autor, perfil ou privilégios pelo cliente.

Exemplo:

Ao criar uma ocorrência, o cliente não poderá definir:

- status administrativo;
- autor diferente do usuário autenticado;
- campos internos de moderação.

---

## API4:2023 — Unrestricted Resource Consumption

**Status: PENDENTE**

A API deverá possuir limites para evitar consumo excessivo de recursos.

Controles necessários:

- limitar tamanho de uploads;
- aceitar somente formatos de imagem previstos;
- limitar quantidade de resultados por página;
- utilizar paginação em listagens;
- limitar tamanho de campos textuais;
- aplicar rate limiting em operações sensíveis quando necessário;
- definir timeouts para serviços externos.

A futura funcionalidade de upload de fotos exige atenção especial.

---

## API5:2023 — Broken Function Level Authorization

**Status: PENDENTE**

As permissões devem seguir a matriz definida em:

`docs/security/authorization-matrix.md`

Regras principais:

- Visitante não executa ações autenticadas;
- Morador não executa funções administrativas;
- somente Administrador altera status;
- somente Administrador arquiva ocorrências;
- autorização deve ser verificada no backend;
- esconder botões no frontend não constitui controle de segurança.

O padrão é negar qualquer operação não explicitamente autorizada.

---

## API6:2023 — Unrestricted Access to Sensitive Business Flows

**Status: PENDENTE**

Fluxos que podem sofrer automação ou abuso incluem:

- criação de contas;
- login;
- criação de ocorrências;
- confirmação de ocorrências.

Controles previstos:

- impedir confirmações duplicadas pelo mesmo usuário;
- validar regras de negócio no backend;
- considerar rate limiting para criação de contas, login e envio de ocorrências;
- não permitir que quantidade de confirmações altere automaticamente o status.

---

## API7:2023 — Server Side Request Forgery

**Status: PENDENTE PARA INTEGRAÇÕES EXTERNAS**

O projeto poderá consumir serviços externos como Nominatim e Cloudinary.

Controles necessários:

- não aceitar URLs arbitrárias fornecidas pelo usuário para requisições do servidor;
- utilizar somente serviços e destinos previamente definidos;
- validar entradas antes de utilizá-las em integrações;
- definir timeout para requisições externas;
- não permitir acesso indireto a endereços internos ou serviços locais.

No estado atual da API, não existe funcionalidade de fetch arbitrário de URLs.

---

## API8:2023 — Security Misconfiguration

**Status: ATENÇÃO**

Durante o desenvolvimento, o FastAPI atualmente utiliza CORS permissivo:

`allow_origins=["*"]`

Essa configuração facilita os testes locais e a integração com Expo Web,
mas não deve permanecer dessa forma no deploy final.

Antes da publicação:

- restringir origens permitidas;
- utilizar variáveis de ambiente para configuração;
- revisar mensagens de erro;
- não expor segredos;
- revisar configuração de debug;
- utilizar HTTPS no ambiente publicado;
- revisar headers e configurações de segurança;
- manter dependências atualizadas.

Auditorias já realizadas:

- Gitleaks: sem segredos detectados;
- pip-audit: sem vulnerabilidades conhecidas no backend;
- npm audit: vulnerabilidades corrigíveis tratadas sem breaking changes;
- dependências transitivas restantes do Expo registradas para acompanhamento.

---

## API9:2023 — Improper Inventory Management

**Status: PARCIAL**

A API deve manter endpoints e versões conhecidos e documentados.

Controles:

- manter README atualizado;
- documentar endpoints disponíveis;
- remover endpoints obsoletos;
- evitar APIs antigas publicadas sem necessidade;
- manter uma única fonte de verdade para a API;
- revisar `/docs` e `/openapi.json` antes do deploy conforme a necessidade do projeto.

O FastAPI fornece documentação OpenAPI automática, que deverá permanecer
coerente com os endpoints realmente implementados.

---

## API10:2023 — Unsafe Consumption of APIs

**Status: PENDENTE PARA INTEGRAÇÕES EXTERNAS**

Dados provenientes de APIs externas não devem ser considerados confiáveis
automaticamente.

Para serviços externos:

- validar respostas recebidas;
- tratar erros e timeouts;
- utilizar HTTPS;
- não executar conteúdo retornado por serviços externos;
- validar tipos e campos antes de persistir dados;
- manter dependências e SDKs atualizados.

Aplicável especialmente às futuras integrações com serviços de mapa,
geocodificação e armazenamento de imagens.

---

## Controles já verificados

| Controle | Estado |
|---|---|
| Scan de segredos nos arquivos atuais | OK |
| Scan de segredos no histórico Git | OK |
| Vulnerabilidades Python com pip-audit | OK |
| Auditoria das dependências npm | Realizada |
| Compatibilidade Expo | OK |
| Expo Doctor | 21/21 checks |
| Matriz de autorização | Definida |
| CodeQL | Configurado; execução pendente após push |

---

## Regra geral

Todo dado recebido pelo backend deve ser considerado não confiável.

Autenticação identifica o usuário.

Autorização determina o que esse usuário pode fazer.

As duas verificações devem ocorrer no backend e não podem depender apenas
do comportamento do aplicativo cliente.
