import { ScrollView, StyleSheet, View } from 'react-native';

import { cores, espaco } from '../theme';

// Container rolável com largura máxima (boa leitura no web e no celular).
export default function Tela({ children, estilo }) {
  return (
    <ScrollView
      style={styles.fundo}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.coluna, estilo]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, alignItems: 'center' },
  coluna: { width: '100%', maxWidth: 640, padding: espaco.lg, gap: espaco.md },
});
