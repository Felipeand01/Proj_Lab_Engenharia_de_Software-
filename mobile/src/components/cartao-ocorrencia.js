import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { contornoFoco, cores, fonte, raio } from '../theme';
import Icone from './icone';
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
        style={({ pressed, focused }) => [styles.cartao, pressed && { opacity: 0.85 }, focused && contornoFoco]}
      >
        <View style={styles.linha}>
          <Text style={styles.categoria}>{o.categoria.nome}</Text>
          <StatusBadge status={o.status} />
        </View>
        <Text style={styles.titulo} numberOfLines={2}>
          {o.titulo}
        </Text>
        <Text style={styles.meta}>
          {[o.bairro, o.cidade].filter(Boolean).join(', ') || null}
        </Text>
        <View style={styles.linha}>
          <Text style={styles.meta}>{formatarData(o.criado_em)}</Text>
          <View style={styles.apoio}>
            <Icone nome="people-outline" tamanho={16} cor={cores.textoSuave} />
            <Text style={styles.meta}>
              {n} {n === 1 ? 'confirmação' : 'confirmações'}
            </Text>
          </View>
        </View>
        {o.status === 'Arquivado' && o.motivo_arquivamento ? (
          <Text style={styles.motivo}>Motivo do arquivamento: {o.motivo_arquivamento}</Text>
        ) : null}
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
    borderLeftWidth: 4,
    borderLeftColor: cores.primaria,
    padding: 14,
    gap: 6,
  },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  categoria: { fontSize: fonte.pequena, fontWeight: '700', color: cores.primaria, flexShrink: 1 },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  apoio: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  motivo: { fontSize: fonte.pequena, color: cores.texto, backgroundColor: cores.fundo, padding: 8, borderRadius: raio.sm },
  meta: { fontSize: fonte.pequena, color: cores.textoSuave },
});
