# Qualidade de UI/UX

Aplicar estas regras ao trabalhar em interfaces, telas, componentes visuais e fluxos do aplicativo.

## Objetivo visual

O Amigo da Vizinhança deve transmitir:

- confiança;
- clareza;
- utilidade pública;
- contexto urbano;
- comunidade;
- localização e mapa;
- facilidade de uso.

A interface deve parecer um produto real e específico para seu propósito, não um template genérico produzido por IA.

## Mobile-first

O produto é prioritariamente um aplicativo móvel.

Sempre:
- projetar primeiro para telas de celular;
- verificar diferentes larguras;
- evitar overflow horizontal;
- manter áreas de toque adequadas;
- garantir leitura confortável;
- evitar dependência de layout desktop.

A versão web deve continuar funcional, mas não deve ditar o design mobile.

## Proibido

Nunca adicionar:

- "Made with Lovable";
- badges ou créditos de ferramentas de geração;
- avaliações falsas;
- depoimentos inventados;
- números ou métricas fictícias apresentados como reais;
- contador de visitantes falso;
- conteúdo fictício apresentado como dado real;
- links sem destino;
- botões sem comportamento;
- telas sem fluxo de retorno;
- funcionalidades visuais que não existem no backend;
- Lorem Ipsum;
- textos excessivamente genéricos;
- CTA sem função;
- componentes apenas para preencher espaço;
- animações sem propósito;
- gradiente roxo como estética padrão;
- estética genérica de SaaS de IA;
- domínio ou branding de plataforma de deploy exibido ao usuário por padrão.

## Interações reais

Todo elemento interativo deve funcionar.

Antes de considerar uma tela pronta, verificar:

- botões;
- links;
- formulários;
- filtros;
- navegação;
- estados de loading;
- estados de erro;
- estados vazios;
- acesso negado;
- retorno para tela anterior.

Não simular ação que ainda não esteja implementada.

Quando uma funcionalidade futura precisar aparecer, identificá-la claramente como indisponível ou não exibi-la.

## Conteúdo

Textos devem ser:

- específicos para o Amigo da Vizinhança;
- curtos;
- claros;
- naturais;
- coerentes com serviço urbano e participação comunitária.

Evitar:

- marketing exagerado;
- frases vagas;
- linguagem genérica de startup;
- promessas sem comprovação;
- excesso de textos explicativos;
- linguagem artificial.

## Design system

Buscar consistência em:

- espaçamento;
- tipografia;
- bordas;
- raios;
- ícones;
- tamanhos;
- estados;
- componentes;
- feedback visual.

Não criar estilos diferentes para componentes equivalentes sem motivo.

Quando padrões começarem a se repetir, consolidá-los de forma simples.

## Cor

A paleta deve ser coerente com:

- ambiente urbano;
- confiança;
- colaboração;
- leitura de mapa;
- estados de ocorrência.

Cores de status devem ser semanticamente consistentes.

Não depender exclusivamente de cor para comunicar significado.

Evitar combinação excessiva de cores.

## Tipografia

Priorizar:

- legibilidade;
- hierarquia clara;
- poucas variações;
- tamanhos adequados para mobile.

Evitar:
- títulos exageradamente grandes;
- excesso de fontes;
- textos muito pequenos;
- longos blocos centralizados.

## Cards e containers

Cards devem existir apenas quando ajudarem a organizar informação.

Evitar:
- card dentro de card sem necessidade;
- excesso de sombras;
- excesso de bordas;
- interface composta inteiramente por caixas;
- componentes visualmente pesados.

## Ícones

Usar ícones reconhecíveis e consistentes.

Não usar:
- emojis como substituto padrão de ícones funcionais;
- ícones diferentes para a mesma função;
- ícones decorativos sem significado.

Todo ícone interativo deve ter propósito claro.

## Mapa

O mapa é elemento central do produto.

Ao projetar experiências relacionadas ao mapa:

- preservar área útil do mapa;
- não cobrir excessivamente a visualização;
- manter controles fáceis de alcançar;
- garantir diferenciação clara das ocorrências;
- usar marcadores legíveis;
- oferecer alternativa textual quando necessário;
- não depender exclusivamente do mapa para informação crítica.

Filtros e detalhes devem complementar o mapa, não competir com ele.

## Ocorrências

Uma ocorrência deve comunicar com clareza, quando disponível:

- categoria;
- localização;
- status;
- foto;
- descrição;
- data;
- histórico;
- confirmações/apoios.

A prioridade visual deve refletir as ações realmente importantes para o usuário.

## Status

Os estados previstos são:

- Reportado
- Em análise
- Encaminhado
- Em andamento
- Resolvido
- Arquivado

Usar nomes e representação visual consistentes em todo o aplicativo.

Não inventar novos status sem decisão explícita.

## Acessibilidade

Quando aplicável:

- contraste suficiente;
- área de toque confortável;
- labels acessíveis;
- ordem lógica de navegação;
- texto compreensível;
- feedback além de cor;
- suporte a tamanhos de tela diferentes.

No Expo Web:
- verificar navegação por teclado quando relevante.

## Responsividade

Antes de considerar tela pronta:

- testar viewport mobile;
- verificar quebra de textos;
- verificar botões;
- verificar modais;
- verificar formulários;
- verificar mapa;
- verificar listas.

Não corrigir responsividade somente para uma resolução específica.

## Loading

Não deixar o usuário sem feedback durante operação perceptível.

Usar loading adequado sem bloquear toda a aplicação desnecessariamente.

## Erros

Mensagens devem:
- explicar o problema de forma compreensível;
- oferecer ação quando possível;
- não expor detalhes internos;
- não mostrar stack trace;
- não culpar o usuário.

## Estado vazio

Listas, mapa e histórico devem possuir estado vazio claro quando aplicável.

Evitar páginas visualmente quebradas quando não houver dados.

## Referências visuais

Ferramentas e galerias podem servir como inspiração, nunca como especificação automática.

Podem ser consultados quando necessário:
- UI/UX Pro Max;
- Anthropic frontend-design;
- Kage;
- Minimal Gallery;
- referências reais de aplicativos mobile.

Não copiar interfaces integralmente.

Adaptar qualquer referência ao contexto do Amigo da Vizinhança.

## Animações

Adicionar apenas se:
- melhorar compreensão;
- indicar transição;
- fornecer feedback;
- não prejudicar desempenho.

Não adicionar animações apenas para tornar a tela "mais moderna".

## Critério de conclusão visual

Uma tela só pode ser considerada pronta se:

- funciona;
- possui conteúdo específico;
- todos os elementos interativos têm ação;
- não possui links quebrados;
- não possui placeholders indevidos;
- funciona em viewport mobile;
- estados principais foram considerados;
- não existem erros relevantes no console;
- aparência é consistente com o restante do aplicativo;
- acessibilidade básica foi verificada;
- o resultado não parece um template genérico de IA.
