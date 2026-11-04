import { StyleSheet, Text, View } from 'react-native';

import { cores, fonte, raio } from '../theme';

// tipo: 'erro' | 'sucesso' | 'aviso'. Sempre com rótulo em texto, não só cor.
const ESTILOS = {
  erro: { fundo: cores.perigoFundo, texto: cores.perigo, marca: 'Erro' },
  sucesso: { fundo: cores.sucessoFundo, texto: cores.sucesso, marca: 'Pronto' },
  aviso: { fundo: cores.avisoFundo, texto: cores.aviso, marca: 'Atenção' },
};

export default function Mensagem({ tipo = 'erro', children }) {
  if (!children) return null;
  const e = ESTILOS[tipo];
  return (
    <View accessibilityRole="alert" style={[styles.caixa, { backgroundColor: e.fundo }]}>
      <Text style={[styles.texto, { color: e.texto }]}>
        <Text style={styles.marca}>{e.marca}: </Text>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { padding: 12, borderRadius: raio.md },
  texto: { fontSize: fonte.pequena + 1 },
  marca: { fontWeight: '700' },
});
