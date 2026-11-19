import { StyleSheet, Text, View } from 'react-native';

import { cores, fonte, raio } from '../theme';
import Icone from './icone';

// tipo: 'erro' | 'sucesso' | 'aviso'. Sempre com rótulo em texto, não só cor.
const ESTILOS = {
  erro: { fundo: cores.perigoFundo, texto: cores.perigo, marca: 'Erro', icone: 'alert-circle' },
  sucesso: { fundo: cores.sucessoFundo, texto: cores.sucesso, marca: 'Pronto', icone: 'checkmark-circle' },
  aviso: { fundo: cores.avisoFundo, texto: cores.aviso, marca: 'Atenção', icone: 'information-circle' },
};

export default function Mensagem({ tipo = 'erro', children }) {
  if (!children) return null;
  const e = ESTILOS[tipo];
  return (
    <View accessibilityRole="alert" style={[styles.caixa, { backgroundColor: e.fundo }]}>
      <Icone nome={e.icone} tamanho={20} cor={e.texto} />
      <Text style={[styles.texto, { color: e.texto }]}>
        <Text style={styles.marca}>{e.marca}: </Text>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: raio.md },
  texto: { flex: 1, fontSize: fonte.meio },
  marca: { fontWeight: '700' },
});
