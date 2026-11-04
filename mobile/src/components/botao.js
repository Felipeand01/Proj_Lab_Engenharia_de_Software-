import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { alvoToque, cores, fonte, raio } from '../theme';

// variante: 'primario' | 'secundario' | 'perigo'
export default function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado }) {
  const inativo = desabilitado || carregando;
  const cor = variante === 'perigo' ? cores.perigo : cores.primaria;
  const preenchido = variante !== 'secundario';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        preenchido ? { backgroundColor: cor } : { borderColor: cor, borderWidth: 1.5 },
        inativo && styles.inativo,
        pressed && { opacity: 0.8 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={preenchido ? cores.sobrePrimaria : cor} />
      ) : (
        <Text style={[styles.texto, { color: preenchido ? cores.sobrePrimaria : cor }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: alvoToque,
    paddingHorizontal: 16,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontSize: fonte.corpo, fontWeight: '600', textAlign: 'center' },
  inativo: { opacity: 0.5 },
});
