import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import Botao from '../components/botao';
import Campo from '../components/campo';
import Mensagem from '../components/mensagem';
import Tela from '../components/tela';
import { useAuth } from '../lib/auth';
import { cores, fonte } from '../theme';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  function validar() {
    const e = {};
    if (nome.trim().length < 2) e.nome = 'Informe seu nome.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = 'Informe um e-mail válido.';
    if (senha.length < 8) e.senha = 'A senha precisa ter ao menos 8 caracteres.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    setErroGeral('');
    if (!validar()) return;
    setEnviando(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      if (e.status === 409) setErros({ email: 'Este e-mail já está cadastrado.' });
      else setErroGeral(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={styles.titulo}>Crie sua conta de morador</Text>
      <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoComplete="name" erro={erros.nome} />
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        erro={erros.email}
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="new-password"
        ajuda="Mínimo de 8 caracteres."
        erro={erros.senha}
        onSubmitEditing={enviar}
      />
      <Mensagem>{erroGeral}</Mensagem>
      <Botao titulo="Criar conta" onPress={enviar} carregando={enviando} />
      <Link href="/entrar" replace style={styles.link}>
        Já tem conta? Entrar
      </Link>
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.texto },
  link: { color: cores.primaria, fontWeight: '700', textAlign: 'center', padding: 12 },
});
