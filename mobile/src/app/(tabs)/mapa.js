import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Carregando, ErroTela, Vazio } from '../../components/estado';
import MapaOcorrencias from '../../components/mapa-ocorrencias';
import StatusBadge from '../../components/status-badge';
import { useAuth } from '../../lib/auth';
import { STATUS } from '../../lib/status';
import { useCarregar } from '../../lib/use-carregar';
import { cores, espaco, fonte } from '../../theme';

export default function Mapa() {
  const { api } = useAuth();
  const router = useRouter();

  const buscar = useCallback(() => api('/ocorrencias'), [api]);
  const { dados, carregando, erro, recarregar } = useCarregar(buscar);

  // Só ocorrências com coordenadas podem aparecer no mapa.
  const comLocal = useMemo(
    () => (dados ?? []).filter((o) => o.latitude != null && o.longitude != null),
    [dados],
  );
  const abrir = useCallback((id) => router.push(`/ocorrencia/${id}`), [router]);
  const statusPresentes = STATUS.filter((s) => comLocal.some((o) => o.status === s));

  if (erro) return <ErroTela erro={erro} onTentar={recarregar} />;
  if (carregando && !dados) return <Carregando texto="Carregando o mapa…" />;
  if (dados && comLocal.length === 0) {
    return (
      <Vazio
        titulo="Nenhuma ocorrência no mapa"
        texto="Quando alguém registrar um problema com localização, ele aparecerá aqui."
      />
    );
  }

  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        <Text style={styles.resumo}>
          {comLocal.length} {comLocal.length === 1 ? 'ocorrência' : 'ocorrências'} no mapa
        </Text>
        <View style={styles.legenda}>
          {statusPresentes.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </View>
      </View>
      <MapaOcorrencias ocorrencias={comLocal} onAbrir={abrir} />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { padding: espaco.md, gap: 8 },
  resumo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
