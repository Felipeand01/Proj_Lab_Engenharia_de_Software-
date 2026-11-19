# OWASP MASVS — Amigo da Vizinhança

## Objetivo

Aplicar os principais controles do OWASP Mobile Application Security
Verification Standard ao aplicativo mobile do Amigo da Vizinhança.

O aplicativo utiliza React Native + Expo e deve permanecer compatível
com Android e iOS.

Status:

- OK: controle já verificado.
- PENDENTE: depende de funcionalidade ainda não implementada.
- ATENÇÃO: deve ser tratado antes do deploy.
- NÃO APLICÁVEL: fora do escopo atual do MVP.

---

## MASVS-STORAGE — Armazenamento seguro

**Status: PENDENTE**

Controles:

- não armazenar senhas no dispositivo;
- não armazenar tokens sensíveis em AsyncStorage;
- utilizar armazenamento seguro da plataforma para credenciais/tokens;
- não registrar tokens, senhas ou dados sensíveis em logs;
- evitar persistência local desnecessária de dados pessoais;
- revisar backups e caches antes da publicação.

Quando autenticação for implementada, utilizar solução compatível com
armazenamento seguro do Expo/plataforma.

---

## MASVS-CRYPTO — Criptografia

**Status: PENDENTE**

Controles:

- não implementar algoritmos criptográficos próprios;
- utilizar bibliotecas e mecanismos confiáveis da plataforma;
- senhas devem ser protegidas no backend com hash adequado;
- tokens e chaves não devem ficar hardcoded no aplicativo;
- segredos de servidor nunca devem ser incluídos no bundle mobile.

Gitleaks já foi executado no repositório e não encontrou segredos.

---

## MASVS-AUTH — Autenticação e autorização

**Status: PENDENTE**

A autenticação ainda não foi implementada.

Requisitos:

- autenticação validada pelo backend;
- tokens com expiração;
- logout deve invalidar/remover credenciais locais;
- perfil do usuário não pode ser confiado apenas a partir do frontend;
- permissões devem seguir `authorization-matrix.md`;
- funções administrativas devem ser protegidas no backend;
- não armazenar senha no aplicativo.

---

## MASVS-NETWORK — Comunicação de rede

**Status: ATENÇÃO PARA DEPLOY**

Durante desenvolvimento local são utilizadas conexões HTTP locais.

Em produção:

- utilizar HTTPS;
- não permitir HTTP inseguro para a API publicada;
- validar corretamente erros e respostas do backend;
- definir timeouts apropriados;
- não desativar validação TLS;
- utilizar apenas endpoints conhecidos;
- não incluir segredos em URLs.

A configuração local de desenvolvimento não representa a configuração
final de produção.

---

## MASVS-PLATFORM — Interação com a plataforma

**Status: PENDENTE**

Controles:

- solicitar somente permissões realmente necessárias;
- localização deve ser solicitada apenas quando a funcionalidade exigir;
- câmera/galeria devem ser utilizadas somente para envio de fotos;
- explicar ao usuário por que cada permissão é necessária;
- não utilizar WebView para conteúdo sensível sem necessidade;
- validar arquivos e dados recebidos da plataforma;
- manter compatibilidade segura com Android e iOS.

---

## MASVS-CODE — Qualidade e segurança do código

**Status: PARCIAL / OK**

Controles já aplicados:

- ESLint configurado para o frontend;
- Ruff configurado para o backend Python;
- testes automatizados Pytest;
- dependências Python verificadas com pip-audit;
- dependências npm verificadas com npm audit;
- Expo Doctor: 21/21 checks;
- `expo install --check`: dependências compatíveis;
- Gitleaks executado;
- CodeQL configurado.

Controles pendentes:

- executar CodeQL após push;
- manter dependências atualizadas;
- revisar entradas recebidas pelo aplicativo;
- tratar erros sem expor informações sensíveis.

---

## MASVS-RESILIENCE — Resistência a engenharia reversa

**Status: NÃO PRIORITÁRIO PARA O MVP ACADÊMICO**

O projeto não processa segredos críticos, pagamentos ou propriedade
intelectual sensível que justifique mecanismos avançados contra
engenharia reversa neste momento.

Antes de uma publicação real:

- gerar builds de produção;
- não incluir debug desnecessário;
- não incluir segredos no bundle;
- revisar logs;
- avaliar mecanismos adicionais de proteção conforme o risco.

Não serão implementados controles complexos de anti-debug ou
anti-tampering apenas para a entrega acadêmica.

---

## MASVS-PRIVACY — Privacidade

**Status: PENDENTE**

O aplicativo poderá tratar:

- identificação do usuário;
- localização;
- fotos;
- ocorrências criadas;
- histórico de participação.

Requisitos:

- coletar apenas dados necessários;
- explicar a finalidade de localização e fotos;
- evitar exposição desnecessária de dados pessoais;
- limitar informações públicas associadas ao usuário;
- definir regras de retenção e exclusão futuramente;
- não utilizar dados pessoais para finalidades diferentes daquelas
  informadas ao usuário.

---

## Prioridades para a TG3

Antes do deploy final:

1. implementar autenticação e autorização no backend;
2. usar armazenamento seguro para tokens;
3. publicar a API usando HTTPS;
4. restringir CORS;
5. revisar permissões de localização, câmera e galeria;
6. validar uploads de imagem;
7. executar CodeQL;
8. executar auditoria final de segurança;
9. validar fluxos principais em Android e, quando viável, iOS;
10. revisar dados pessoais e privacidade.

---

## Regra geral

O aplicativo cliente nunca deve ser considerado uma barreira de
segurança.

Toda autorização relevante deve ser aplicada no backend.

Nenhum segredo de servidor deve ser distribuído no aplicativo mobile.
