// Status previstos no projeto, na ordem do fluxo.
export const STATUS = [
  'Reportado',
  'Em análise',
  'Encaminhado',
  'Em andamento',
  'Resolvido',
  'Arquivado',
];

export const CORES_STATUS = {
  Reportado: { fundo: '#E8EDF2', texto: '#33475B' },
  'Em análise': { fundo: '#FFF4D6', texto: '#7A5200' },
  Encaminhado: { fundo: '#E1EFFA', texto: '#154F7A' },
  'Em andamento': { fundo: '#FDE9D9', texto: '#8A3B00' },
  Resolvido: { fundo: '#E6F4EA', texto: '#1E6B3A' },
  Arquivado: { fundo: '#ECECEC', texto: '#4A4A4A' },
};

// Apenas conveniência de UI: o backend é quem valida a transição.
const PROXIMO = {
  Reportado: 'Em análise',
  'Em análise': 'Encaminhado',
  Encaminhado: 'Em andamento',
  'Em andamento': 'Resolvido',
};

export const proximoStatus = (atual) => PROXIMO[atual] ?? null;
export const podeArquivar = (atual) => atual in PROXIMO;
