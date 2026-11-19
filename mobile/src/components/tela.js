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
  // minWidth 0 evita que filhos largos estourem a coluna em telas de 360px.
  coluna: { width: '100%', maxWidth: 640, minWidth: 0, padding: espaco.lg, paddingBottom: espaco.xl * 2, gap: espaco.md },
});
