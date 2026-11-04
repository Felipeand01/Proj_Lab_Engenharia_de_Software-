import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { cores, fonte } from '../theme';
import Botao from './botao';

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
      <Text style={styles.titulo}>{semConexao ? 'Sem conexão' : 'Não foi possível carregar'}</Text>
      <Text style={styles.texto}>{erro?.message}</Text>
      {onTentar ? <Botao titulo="Tentar de novo" variante="secundario" onPress={onTentar} /> : null}
    </View>
  );
}

export function Vazio({ titulo, texto, children }) {
  return (
    <View style={styles.centro}>
      <Text style={styles.titulo}>{titulo}</Text>
      {texto ? <Text style={styles.texto}>{texto}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', gap: 10, padding: 24 },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto, textAlign: 'center' },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center' },
});
