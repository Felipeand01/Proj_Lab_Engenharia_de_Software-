import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Endereço do backend: EXPO_PUBLIC_API_URL (público, sem segredos) ou detecção local.
function obterUrlBackend() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // Fora do desenvolvimento, adivinhar o servidor seria inseguro: exige configuração explícita.
  if (!__DEV__) return null;

  if (Platform.OS === 'web') {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Codespaces: a porta vem no nome do host (…-8081.app.github.dev).
    return origin.replace('-8081.', '-8000.');
  }

  // Celular em desenvolvimento: usa o IP do computador que serve o Expo.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:8000` : 'http://localhost:8000';
}

export const URL_BACKEND = obterUrlBackend();
const TIMEOUT_MS = 15000;
const TIMEOUT_UPLOAD_MS = 60000;

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Converte o corpo de erro do FastAPI em texto amigável em PT-BR.
function mensagemDeErro(status, corpo) {
  const detalhe = corpo?.detail;

  if (status === 422 && Array.isArray(detalhe)) {
    const campos = detalhe
      .map((d) => (Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null))
      .filter(Boolean);
    const lista = [...new Set(campos)].join(', ');
    return lista
      ? `Confira os campos: ${lista}.`
      : 'Alguns dados enviados são inválidos.';
  }
  if (typeof detalhe === 'string' && status !== 401 && status !== 403) {
    return detalhe;
  }
  if (status === 401) return 'Sessão expirada ou inválida. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  if (status === 404) return 'Não encontramos o que você procurou.';
  if (status === 409) return 'Esta ação não é possível no estado atual.';
  if (status === 422) return 'Alguns dados enviados são inválidos.';
  return 'Algo deu errado no servidor. Tente novamente em instantes.';
}

export async function requisitar(caminho, { metodo = 'GET', corpo, token } = {}) {
  const cabecalhos = {};
  // FormData (upload de foto): o fetch define o Content-Type com o boundary.
  const ehFormData = typeof FormData !== 'undefined' && corpo instanceof FormData;
  if (corpo !== undefined && !ehFormData) cabecalhos['Content-Type'] = 'application/json';
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  if (!URL_BACKEND) {
    throw new ErroApi(0, 'O endereço do servidor não está configurado neste aplicativo.');
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), ehFormData ? TIMEOUT_UPLOAD_MS : TIMEOUT_MS);
  let resposta;
  try {
    resposta = await fetch(`${URL_BACKEND}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined || ehFormData ? corpo : JSON.stringify(corpo),
      signal: controle.signal,
    });
  } catch (e) {
    throw new ErroApi(
      0,
      e?.name === 'AbortError'
        ? 'O servidor demorou para responder. Tente novamente.'
        : 'Sem conexão com o servidor. Verifique sua internet.',
    );
  } finally {
    clearTimeout(timer);
  }

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!resposta.ok) {
    throw new ErroApi(resposta.status, mensagemDeErro(resposta.status, dados));
  }
  return dados;
}
