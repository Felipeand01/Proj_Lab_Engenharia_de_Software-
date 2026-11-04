import { Pressable, StyleSheet, Text } from 'react-native';

import { alvoToque, cores, fonte, raio } from '../theme';

// Opção selecionável (filtros e escolha de categoria).
export default function Chip({ rotulo, ativo, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      onPress={onPress}
      style={[styles.chip, ativo && styles.ativo]}
    >
      <Text style={[styles.texto, ativo && styles.textoAtivo]}>
        {ativo ? '✓ ' : ''}
        {rotulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: alvoToque - 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: raio.pill,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  ativo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  texto: { fontSize: fonte.pequena + 1, color: cores.texto, fontWeight: '600' },
  textoAtivo: { color: cores.sobrePrimaria },
});
