import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHAVE = 'amigo_token';

// Celular: armazenamento seguro do sistema. Web: localStorage (não há SecureStore).
export async function lerToken() {
  try {
    if (Platform.OS === 'web') return window.localStorage.getItem(CHAVE);
    return await SecureStore.getItemAsync(CHAVE);
  } catch {
    return null;
  }
}

export async function salvarToken(token) {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(CHAVE, token);
    else await SecureStore.setItemAsync(CHAVE, token);
  } catch {
    // Sem armazenamento: a sessão vale só até fechar o app.
  }
}

export async function removerToken() {
  try {
    if (Platform.OS === 'web') window.localStorage.removeItem(CHAVE);
    else await SecureStore.deleteItemAsync(CHAVE);
  } catch {
    // nada a fazer
  }
}
