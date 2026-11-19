import { Pressable, StyleSheet, Text } from 'react-native';

import { alvoToque, contornoFoco, cores, fonte } from '../theme';

// Ação textual discreta (link ou botão leve) com foco visível e área de toque adequada.
export default function LinkAcao({ rotulo, onPress, papel = 'button' }) {
  return (
    <Pressable
      accessibilityRole={papel}
      onPress={onPress}
      style={({ focused }) => [styles.base, focused && contornoFoco]}
    >
      <Text style={styles.texto}>{rotulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: alvoToque, justifyContent: 'center', paddingHorizontal: 4, alignSelf: 'flex-start' },
  texto: { color: cores.primaria, fontWeight: '700', fontSize: fonte.corpo, textDecorationLine: 'underline' },
});
