import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { requisitar } from './api';
import { lerToken, removerToken, salvarToken } from './storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [restaurando, setRestaurando] = useState(true);
  const tokenRef = useRef(null); // espelha o token para `sair` não depender de estado

  // Revoga o token no servidor (best-effort: sem rede, a sessão local é encerrada igual).
  const sair = useCallback(async () => {
    const atual = tokenRef.current;
    tokenRef.current = null;
    setToken(null);
    setUsuario(null);
    await removerToken();
    if (atual) {
      try {
        await requisitar('/auth/logout', { metodo: 'POST', token: atual });
      } catch {
        // token já inválido ou servidor fora do ar
      }
    }
  }, []);

  // Restaura a sessão salva e confirma o token no backend.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const salvo = await lerToken();
      if (salvo) {
        try {
          const eu = await requisitar('/auth/me', { token: salvo });
          if (ativo) {
            tokenRef.current = salvo;
            setToken(salvo);
            setUsuario(eu);
          }
        } catch (erro) {
          // Token inválido/expirado limpa a sessão; falta de rede mantém o token salvo.
          if (erro.status === 401) await removerToken();
        }
      }
      if (ativo) setRestaurando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const { access_token: novo } = await requisitar('/auth/login', {
      metodo: 'POST',
      corpo: { email, senha },
    });
    const eu = await requisitar('/auth/me', { token: novo });
    await salvarToken(novo);
    tokenRef.current = novo;
    setToken(novo);
    setUsuario(eu);
  }, []);

  const cadastrar = useCallback(
    async (nome, email, senha) => {
      await requisitar('/auth/cadastro', { metodo: 'POST', corpo: { nome, email, senha } });
      await entrar(email, senha);
    },
    [entrar],
  );

  // Chamadas autenticadas: um 401 encerra a sessão local.
  const api = useCallback(
    async (caminho, opcoes) => {
      try {
        return await requisitar(caminho, { ...opcoes, token });
      } catch (erro) {
        if (erro.status === 401 && token) await sair();
        throw erro;
      }
    },
    [token, sair],
  );

  const valor = useMemo(
    () => ({ usuario, token, restaurando, entrar, cadastrar, sair, api, admin: usuario?.papel === 'admin' }),
    [usuario, token, restaurando, entrar, cadastrar, sair, api],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
