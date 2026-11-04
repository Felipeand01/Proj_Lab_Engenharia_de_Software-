import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import Botao from '../../components/botao';
import { Carregando, Vazio } from '../../components/estado';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { cores, fonte, raio } from '../../theme';

export default function Conta() {
  const { usuario, restaurando, sair, admin } = useAuth();
  const router = useRouter();

  if (restaurando) return <Carregando />;

  if (!usuario) {
    return (
      <Tela>
        <Vazio
          titulo="Amigo da Vizinhança"
          texto="Registre e acompanhe problemas de infraestrutura do seu bairro. Você pode consultar as ocorrências sem conta; para registrar e confirmar, é preciso entrar."
        >
          <Botao titulo="Entrar" onPress={() => router.push('/entrar')} />
          <Botao titulo="Criar conta" variante="secundario" onPress={() => router.push('/cadastro')} />
        </Vazio>
      </Tela>
    );
  }

  return (
    <Tela>
      <View style={styles.cartao}>
        <Text style={styles.nome}>{usuario.nome}</Text>
        <Text style={styles.texto}>{usuario.email}</Text>
        <Text style={styles.texto}>Perfil: {admin ? 'Administrador' : 'Morador'}</Text>
      </View>
      <Botao titulo="Sair" variante="secundario" onPress={sair} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    gap: 4,
  },
  nome: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave },
});
