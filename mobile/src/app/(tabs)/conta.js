import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import Botao from '../../components/botao';
import { Carregando } from '../../components/estado';
import Icone from '../../components/icone';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { cores, fonte, raio } from '../../theme';

const DICAS = [
  ['camera-outline', 'Fotografe o problema de frente, sem pessoas, rostos ou placas de veículos.'],
  ['location-outline', 'Marque o ponto exato no mapa. Não informe o endereço da sua casa.'],
  ['people-outline', 'Confirme ocorrências que você também viu: mais confirmações mostram a relevância.'],
];

function Onboarding() {
  const router = useRouter();
  return (
    <>
      <View style={styles.apresentacao}>
        <Text style={styles.titulo}>Amigo da Vizinhança</Text>
        <Text style={styles.texto}>
          Moradores registram e acompanham problemas de infraestrutura do bairro, como buracos, lixo e iluminação.
          Você pode consultar as ocorrências sem conta.
        </Text>
      </View>

      <View style={styles.aviso} accessibilityRole="summary">
        <Icone nome="information-circle" tamanho={22} cor={cores.aviso} />
        <Text style={styles.avisoTexto}>
          É um espaço de participação comunitária. Registrar aqui não aciona o atendimento oficial da prefeitura.
        </Text>
      </View>

      <Text style={styles.secao}>Para registrar com cuidado</Text>
      {DICAS.map(([icone, texto]) => (
        <View key={icone} style={styles.dica}>
          <Icone nome={icone} tamanho={22} cor={cores.primaria} />
          <Text style={styles.dicaTexto}>{texto}</Text>
        </View>
      ))}

      <Botao titulo="Entrar" icone="log-in-outline" onPress={() => router.push('/entrar')} />
      <Botao titulo="Criar conta" variante="secundario" onPress={() => router.push('/cadastro')} />
    </>
  );
}

export default function Conta() {
  const { usuario, restaurando, sair, admin } = useAuth();

  if (restaurando) return <Carregando />;

  return (
    <Tela>
      {!usuario ? (
        <Onboarding />
      ) : (
        <>
          <View style={styles.cartao}>
            <Icone nome="person-circle-outline" tamanho={40} cor={cores.primaria} />
            <View style={styles.dados}>
              <Text style={styles.nome}>{usuario.nome}</Text>
              <Text style={styles.texto}>{usuario.email}</Text>
              <Text style={styles.texto}>Perfil: {admin ? 'Administrador' : 'Morador'}</Text>
            </View>
          </View>
          <Botao titulo="Sair" icone="log-out-outline" variante="secundario" onPress={sair} />
        </>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  apresentacao: { gap: 8 },
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.primaria },
  secao: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto, marginTop: 8 },
  aviso: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: raio.md,
    backgroundColor: cores.avisoFundo,
  },
  avisoTexto: { flex: 1, fontSize: fonte.meio, color: cores.aviso, fontWeight: '600' },
  dica: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dicaTexto: { flex: 1, fontSize: fonte.meio, color: cores.texto },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
  },
  dados: { flex: 1, gap: 2 },
  nome: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave },
});
