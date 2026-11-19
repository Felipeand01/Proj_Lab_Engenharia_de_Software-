import { Platform } from 'react-native';

export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024; // igual ao limite do backend (FOTO_MAX_BYTES)

// Monta o FormData do envio único de ocorrência: campos de texto + a foto (asset do expo-image-picker).
// Campos vazios/nulos são omitidos.
export async function montarEnvio(campos, foto) {
  const dados = new FormData();
  Object.entries(campos).forEach(([nome, valor]) => {
    if (valor !== null && valor !== undefined && String(valor) !== '') dados.append(nome, String(valor));
  });
  const nome = foto.fileName || 'foto.jpg';
  if (Platform.OS === 'web') {
    // No web o asset traz o File; sem ele, busca o conteúdo pela URI do blob.
    const arquivo = foto.file ?? (await (await fetch(foto.uri)).blob());
    dados.append('arquivo', arquivo, nome);
  } else {
    dados.append('arquivo', { uri: foto.uri, name: nome, type: foto.mimeType || 'image/jpeg' });
  }
  return dados;
}

// UUID v4 para a chave de idempotência do envio (gerada uma vez por formulário).
export function novaChaveEnvio() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
