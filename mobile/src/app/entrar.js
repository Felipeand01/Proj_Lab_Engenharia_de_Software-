import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import Botao from '../components/botao';
import Campo from '../components/campo';
import Mensagem from '../components/mensagem';
import Tela from '../components/tela';
import { useAuth } from '../lib/auth';
import { cores, fonte } from '../theme';

export default function Entrar() {
  const { entrar } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setErro(e.status === 401 ? 'E-mail ou senha incorretos.' : e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={styles.titulo}>Entre na sua conta</Text>
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={enviar}
      />
      <Mensagem>{erro}</Mensagem>
      <Botao titulo="Entrar" onPress={enviar} carregando={enviando} />
      <Link href="/cadastro" replace style={styles.link}>
        Ainda não tem conta? Criar conta
      </Link>
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.texto },
  link: { color: cores.primaria, fontWeight: '700', textAlign: 'center', padding: 12 },
});
