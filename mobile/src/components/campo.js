import { StyleSheet, Text, TextInput, View } from 'react-native';

import { alvoToque, cores, fonte, raio } from '../theme';

export default function Campo({ rotulo, erro, ajuda, multilinha, ...resto }) {
  return (
    <View style={styles.grupo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={cores.textoSuave}
        multiline={multilinha}
        style={[styles.input, multilinha && styles.multilinha, erro && { borderColor: cores.perigo }]}
        {...resto}
      />
      {ajuda && !erro ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 4 },
  rotulo: { fontSize: fonte.pequena, fontWeight: '600', color: cores.texto },
  input: {
    minHeight: alvoToque,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.superficie,
  },
  multilinha: { minHeight: 110, textAlignVertical: 'top' },
  ajuda: { fontSize: fonte.pequena, color: cores.textoSuave },
  erro: { fontSize: fonte.pequena, color: cores.perigo },
});
