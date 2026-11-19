import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { alvoToque, contornoFoco, cores, fonte, raio } from '../theme';
import Icone from './icone';

// variante: 'primario' | 'secundario' | 'perigo'; `icone` opcional (nome do Ionicons).
export default function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado, icone, expandido }) {
  const inativo = desabilitado || carregando;
  const cor = variante === 'perigo' ? cores.perigo : cores.primaria;
  const preenchido = variante !== 'secundario';
  const corTexto = preenchido ? cores.sobrePrimaria : cor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando, ...(expandido !== undefined && { expanded: expandido }) }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed, focused }) => [
        styles.base,
        preenchido ? { backgroundColor: cor } : { borderColor: cor, borderWidth: 1.5, backgroundColor: cores.superficie },
        inativo && styles.inativo,
        pressed && { opacity: 0.8 },
        focused && contornoFoco,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <View style={styles.conteudo}>
          {icone ? <Icone nome={icone} tamanho={18} cor={corTexto} /> : null}
          <Text style={[styles.texto, { color: corTexto }]}>{titulo}</Text>
        </View>
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
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inativo: { opacity: 0.5 },
  texto: { fontSize: fonte.corpo, fontWeight: '700', textAlign: 'center' },
});
