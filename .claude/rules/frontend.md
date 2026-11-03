# Frontend

Aplicar estas regras ao trabalhar em `mobile/**`.

## Stack

- React Native
- Expo
- React
- React Native Web para desenvolvimento web
- Node 22

## Princípios

- Mobile-first.
- Priorizar funcionamento real sobre decoração.
- Não introduzir bibliotecas web incompatíveis com React Native.
- Não usar soluções específicas de navegador quando existir alternativa compatível com mobile, salvo quando forem necessárias apenas para Expo Web.

## Ambiente

Desenvolvimento local:
- Expo na porta 8081.
- backend local em `http://localhost:8000`.

Codespaces:
- preservar compatibilidade com URLs encaminhadas de porta.

Não quebrar suporte já existente ao Codespaces ao adicionar suporte local.

## Componentes

- Criar componentes reutilizáveis quando houver repetição real.
- Evitar componentes genéricos sem necessidade.
- Manter responsabilidades claras.
- Evitar arquivos excessivamente grandes quando a tela crescer.

## Estados obrigatórios

Fluxos que dependam de dados devem considerar quando aplicável:
- loading;
- sucesso;
- vazio;
- erro;
- sem conexão;
- acesso negado.

Nunca deixar interface silenciosamente quebrada.

## Interações

- Todo botão visível deve possuir ação real.
- Todo link deve possuir destino válido.
- Elementos desabilitados devem indicar claramente o estado.
- Não simular funcionalidades que ainda não existem.

## Navegação

- Navegação deve ser consistente.
- Não criar telas inacessíveis.
- Não criar rotas sem fluxo de retorno adequado.
- Proteger telas sensíveis em conjunto com autorização real no backend.

## Responsividade

- Priorizar telas de celular.
- Verificar tamanhos menores.
- Evitar overflow horizontal.
- Não depender de largura desktop.
- Garantir que textos e botões permaneçam utilizáveis em telas pequenas.

## Acessibilidade

Quando aplicável:
- labels acessíveis;
- contraste adequado;
- área de toque adequada;
- textos legíveis;
- não depender apenas de cor para transmitir estado.

## Dependências

Antes de adicionar biblioteca:
1. verificar necessidade;
2. verificar compatibilidade com Expo/React Native;
3. preferir documentação oficial;
4. evitar biblioteca abandonada ou excessiva para necessidade simples.

## Qualidade

Após alteração relevante:
- executar lint;
- testar fluxo alterado;
- verificar console;
- usar Playwright quando o fluxo puder ser validado via Expo Web;
- usar Maestro posteriormente para fluxos mobile.
