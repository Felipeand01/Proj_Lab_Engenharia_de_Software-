import { Pressable, StyleSheet, Text } from 'react-native';

import { alvoToque, contornoFoco, cores, fonte, raio } from '../theme';
import Icone from './icone';

// Opção selecionável (filtros e escolha de categoria).
export default function Chip({ rotulo, ativo, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      onPress={onPress}
      style={({ focused }) => [styles.chip, ativo && styles.ativo, focused && contornoFoco]}
    >
      {ativo ? <Icone nome="checkmark" tamanho={16} cor={cores.sobrePrimaria} /> : null}
      <Text style={[styles.texto, ativo && styles.textoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: alvoToque,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: raio.pill,
    borderWidth: 1,
    borderColor: cores.bordaCampo,
    backgroundColor: cores.superficie,
  },
  ativo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  texto: { fontSize: fonte.meio, color: cores.texto, fontWeight: '600' },
  textoAtivo: { color: cores.sobrePrimaria },
});
