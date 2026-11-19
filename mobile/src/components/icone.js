import { Ionicons } from '@expo/vector-icons';

import { cores } from '../theme';

// Ícone decorativo por nome do Ionicons; o significado deve vir sempre junto em texto.
export default function Icone({ nome, tamanho = 20, cor = cores.texto }) {
  return <Ionicons name={nome} size={tamanho} color={cor} accessible={false} aria-hidden />;
}
