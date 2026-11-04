import { Platform } from 'react-native';

export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024; // igual ao limite do backend (FOTO_MAX_BYTES)

// Envia a foto escolhida (asset do expo-image-picker) para a ocorrência.
export async function enviarFoto(api, ocorrenciaId, foto) {
  const nome = foto.fileName || 'foto.jpg';
  const dados = new FormData();
  if (Platform.OS === 'web') {
    // No web o asset traz o File; sem ele, busca o conteúdo pela URI do blob.
    const arquivo = foto.file ?? (await (await fetch(foto.uri)).blob());
    dados.append('arquivo', arquivo, nome);
  } else {
    dados.append('arquivo', { uri: foto.uri, name: nome, type: foto.mimeType || 'image/jpeg' });
  }
  return api(`/ocorrencias/${ocorrenciaId}/foto`, { metodo: 'POST', corpo: dados });
}
