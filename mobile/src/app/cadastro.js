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
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  function validar() {
    const e = {};
    if (nome.trim().length < 2) e.nome = 'Informe seu nome.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = 'Informe um e-mail válido.';
    // Mesmas regras que o servidor consegue conferir sem a lista de senhas comuns: tamanho
    // (sem espaços nas pontas, como o backend) e senha diferente do e-mail e da parte antes do "@".
    const senhaLimpa = senha.trim();
    const tamanho = [...senhaLimpa].length;
    const emailLimpo = email.trim().toLowerCase();
    if (tamanho < 8) e.senha = 'A senha precisa ter ao menos 8 caracteres.';
    else if (tamanho > 128) e.senha = 'A senha pode ter no máximo 128 caracteres.';
    else if (senhaLimpa.toLowerCase() === emailLimpo || senhaLimpa.toLowerCase() === emailLimpo.split('@')[0]) {
      e.senha = 'Essa senha é muito comum ou igual ao seu e-mail. Escolha outra.';
    }
    if (confirmacao !== senha) e.confirmacao = 'As senhas não são iguais.';
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
      else if (e.status === 422) {
        // O servidor indica o campo quando sabe; o aviso de senha comum chega sem campo e é da senha.
        setErros(Object.keys(e.campos ?? {}).length ? e.campos : { senha: e.message });
      } else setErroGeral(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={styles.titulo}>Crie sua conta de morador</Text>
      <Text style={styles.sub}>Com a conta você registra ocorrências e confirma as de outros moradores.</Text>
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
        ajuda="De 8 a 128 caracteres. Não use senhas comuns (como 12345678 ou senha123) nem o seu e-mail."
        erro={erros.senha}
      />
      <Campo
        rotulo="Confirmar senha"
        value={confirmacao}
        onChangeText={setConfirmacao}
        secureTextEntry
        autoComplete="new-password"
        erro={erros.confirmacao}
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
  sub: { fontSize: fonte.corpo, color: cores.textoSuave },
  link: { color: cores.primaria, fontWeight: '700', textAlign: 'center', padding: 12 },
});
