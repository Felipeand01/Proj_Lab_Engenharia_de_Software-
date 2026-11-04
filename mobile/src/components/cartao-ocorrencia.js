import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores, fonte, raio } from '../theme';
import StatusBadge from './status-badge';

// O backend envia datas UTC sem fuso; acrescenta "Z" para converter corretamente.
export const formatarData = (iso) =>
  new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleDateString('pt-BR');

export default function CartaoOcorrencia({ ocorrencia: o }) {
  const n = o.total_confirmacoes;
  return (
    <Link href={`/ocorrencia/${o.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${o.titulo}, ${o.categoria.nome}, status ${o.status}`}
        style={({ pressed }) => [styles.cartao, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.linha}>
          <Text style={styles.categoria}>{o.categoria.nome}</Text>
          <StatusBadge status={o.status} />
        </View>
        <Text style={styles.titulo} numberOfLines={2}>
          {o.titulo}
        </Text>
        <Text style={styles.meta}>
          {formatarData(o.criado_em)} · {n} {n === 1 ? 'confirmação' : 'confirmações'}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    gap: 6,
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  categoria: { fontSize: fonte.pequena, fontWeight: '700', color: cores.primaria, flexShrink: 1 },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  meta: { fontSize: fonte.pequena, color: cores.textoSuave },
});
