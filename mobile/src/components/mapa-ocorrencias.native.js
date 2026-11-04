import { StyleSheet, Text, View } from 'react-native';

import { cores, fonte } from '../theme';

// Mapa nativo ainda não implementado (previsto: @maplibre/maplibre-react-native).
// Mesma interface do componente web: { ocorrencias, onAbrir(id) }.
// A tela exibe esta mensagem e mantém a lista como alternativa.
export default function MapaOcorrencias() {
  return (
    <View style={styles.aviso}>
      <Text style={styles.titulo}>Mapa disponível na versão web</Text>
      <Text style={styles.texto}>
        No aplicativo, consulte as ocorrências pela aba Ocorrências.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: { padding: 24, gap: 8, alignItems: 'center' },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto, textAlign: 'center' },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center' },
});
