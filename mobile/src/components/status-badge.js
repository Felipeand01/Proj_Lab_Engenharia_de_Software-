import { StyleSheet, Text, View } from 'react-native';

import { CORES_STATUS } from '../lib/status';

export default function StatusBadge({ status }) {
  const c = CORES_STATUS[status] ?? CORES_STATUS.Reportado;
  return (
    <View accessibilityLabel={`Status: ${status}`} style={[styles.badge, { backgroundColor: c.fundo }]}>
      <View style={[styles.ponto, { backgroundColor: c.texto }]} />
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
  ponto: { width: 8, height: 8, borderRadius: 4 },
  texto: { fontSize: 13, fontWeight: '700' },
});
