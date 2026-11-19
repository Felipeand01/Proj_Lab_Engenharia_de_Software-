import { StyleSheet, Text, View } from 'react-native';

import { CORES_STATUS } from '../lib/status';
import { fonte } from '../theme';
import Icone from './icone';

const ICONES = {
  Reportado: 'flag',
  'Em análise': 'search',
  Encaminhado: 'paper-plane',
  'Em andamento': 'construct',
  Resolvido: 'checkmark-circle',
  Arquivado: 'archive',
};

export default function StatusBadge({ status }) {
  const c = CORES_STATUS[status] ?? CORES_STATUS.Reportado;
  return (
    <View accessibilityLabel={`Status: ${status}`} style={[styles.badge, { backgroundColor: c.fundo }]}>
      <Icone nome={ICONES[status] ?? ICONES.Reportado} tamanho={14} cor={c.texto} />
      <Text style={[styles.texto, { color: c.texto }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  texto: { fontSize: fonte.meio, fontWeight: '700' },
});
