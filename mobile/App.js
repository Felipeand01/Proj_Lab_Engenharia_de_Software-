import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  function obterUrlBackend() {
    if (Platform.OS === 'web') {
      return window.location.origin.replace('-8081.', '-8000.');
    }

    return '';
  }

  async function testarConexao() {
    setCarregando(true);
    setErro('');

    try {
      const backendUrl = obterUrlBackend();

      if (!backendUrl) {
        throw new Error('URL do backend não configurada para este dispositivo.');
      }

      const resposta = await fetch(`${backendUrl}/db-health`);

      if (!resposta.ok) {
        throw new Error('Não foi possível acessar o backend.');
      }

      const resultado = await resposta.json();
      setDados(resultado);
    } catch (error) {
      setDados(null);
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    testarConexao();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Amigo da Vizinhança</Text>

        <Text style={styles.subtitulo}>
          TG2 - Teste de integração da arquitetura
        </Text>

        <View style={styles.separador} />

        {carregando && (
          <>
            <ActivityIndicator size="large" />
            <Text style={styles.status}>Testando conexão...</Text>
          </>
        )}

        {!carregando && dados && (
          <View>
            <Text style={styles.sucesso}>Conexão realizada com sucesso!</Text>

            <Text style={styles.texto}>
              Frontend: React Native + Expo
            </Text>

            <Text style={styles.texto}>
              Backend: FastAPI
            </Text>

            <Text style={styles.texto}>
              Banco de dados: {dados.database}
            </Text>

            <Text style={styles.texto}>
              Usuário PostgreSQL: {dados.user}
            </Text>

            <Text style={styles.texto}>
              Status: {dados.status}
            </Text>
          </View>
        )}

        {!carregando && erro !== '' && (
          <Text style={styles.erro}>{erro}</Text>
        )}

        <TouchableOpacity
          style={styles.botao}
          onPress={testarConexao}
        >
          <Text style={styles.textoBotao}>Testar conexão novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  separador: {
    height: 1,
    backgroundColor: '#dddddd',
    marginVertical: 24,
  },
  sucesso: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  status: {
    textAlign: 'center',
    marginTop: 12,
  },
  texto: {
    fontSize: 16,
    marginBottom: 8,
  },
  erro: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  botao: {
    marginTop: 24,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#222222',
  },
  textoBotao: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
