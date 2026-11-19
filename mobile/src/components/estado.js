import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { cores, fonte } from '../theme';
import Botao from './botao';
import Icone from './icone';

// Estados de tela: carregando, erro (com "tentar de novo") e vazio.
export function Carregando({ texto = 'Carregando…' }) {
  return (
    <View style={styles.centro} accessibilityLiveRegion="polite">
      <ActivityIndicator color={cores.primaria} size="large" />
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

export function ErroTela({ erro, onTentar }) {
  const semConexao = erro?.status === 0;
  return (
    <View style={styles.centro}>
      <Icone nome={semConexao ? 'cloud-offline-outline' : 'alert-circle-outline'} tamanho={36} cor={cores.perigo} />
      <Text style={styles.titulo}>{semConexao ? 'Sem conexão' : 'Não foi possível carregar'}</Text>
      <Text style={styles.texto}>{erro?.message}</Text>
      {onTentar ? <Botao titulo="Tentar de novo" variante="secundario" onPress={onTentar} /> : null}
    </View>
  );
}

// `icone` (nome do Ionicons) é opcional.
export function Vazio({ titulo, texto, icone, children }) {
  return (
    <View style={styles.centro}>
      {icone ? <Icone nome={icone} tamanho={36} cor={cores.primaria} /> : null}
      <Text style={styles.titulo}>{titulo}</Text>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', gap: 10, padding: 24, width: '100%', maxWidth: 420, alignSelf: 'center' },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto, textAlign: 'center' },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center' },
});
