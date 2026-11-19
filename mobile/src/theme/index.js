// Tokens visuais do app. Status usam cor + texto + ícone (nunca só cor).
export const cores = {
  fundo: '#F2F4F3',
  superficie: '#FFFFFF',
  texto: '#16242C',
  textoSuave: '#4F616B',
  borda: '#CBD5D9',
  bordaCampo: '#7A8C94', // limite de inputs/chips: >= 3:1 sobre branco
  primaria: '#14566B',
  primariaEscura: '#0E3F50',
  primariaClara: '#E1EEF2',
  sobrePrimaria: '#FFFFFF',
  destaque: '#F2B705', // amarelo de sinalização urbana: faixa do cabeçalho e foco
  perigo: '#A8231B',
  perigoFundo: '#FCEBEA',
  sucesso: '#1E6B3A',
  sucessoFundo: '#E6F4EA',
  aviso: '#6E4A00',
  avisoFundo: '#FFF4D6',
};

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const raio = { sm: 6, md: 10, pill: 999 };
export const fonte = { pequena: 13, meio: 14, corpo: 16, subtitulo: 18, titulo: 22 };

// Altura mínima de toque recomendada.
export const alvoToque = 44;

// Contorno de foco por teclado (usado em Pressable via estado `focused`, e em Campo).
export const contornoFoco = {
  outlineWidth: 3,
  outlineStyle: 'solid',
  outlineColor: cores.primariaEscura,
  outlineOffset: 2,
};

// Opções de cabeçalho compartilhadas por Stack e Tabs.
export const cabecalho = {
  headerStyle: { backgroundColor: cores.primaria, borderBottomWidth: 3, borderBottomColor: cores.destaque },
  headerTintColor: cores.sobrePrimaria,
  headerTitleStyle: { fontWeight: '700' },
};
