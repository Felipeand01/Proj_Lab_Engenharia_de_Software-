import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import Botao from '../../components/botao';
import CartaoOcorrencia from '../../components/cartao-ocorrencia';
import Chip from '../../components/chip';
import { Carregando, ErroTela, Vazio } from '../../components/estado';
import FiltrosOcorrencias from '../../components/filtros-ocorrencias';
import MapaOcorrencias from '../../components/mapa-ocorrencias';
import LinkAcao from '../../components/link-acao';
import StatusBadge from '../../components/status-badge';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { CORES_STATUS, STATUS, glifoStatus } from '../../lib/status';
import { useCarregar } from '../../lib/use-carregar';
import { cores, fonte } from '../../theme';

// Área do mapa na URL: area=min_lat,min_lon,max_lat,max_lon
function lerArea(texto) {
  const n = String(texto ?? '').split(',').map(Number);
  if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) return null;
  const [min_lat, min_lon, max_lat, max_lon] = n;
  return min_lat < max_lat && min_lon < max_lon ? { min_lat, min_lon, max_lat, max_lon } : null;
}

const unico = (v) => (Array.isArray(v) ? v[0] : v);

export default function Explorar() {
  const { api, admin } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { height } = useWindowDimensions();
  const [categorias, setCategorias] = useState([]);
  const [areaVisivel, setAreaVisivel] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Arquivadas só existem para o administrador (a API as oculta dos demais).
  const statusDisponiveis = admin ? STATUS : STATUS.filter((s) => s !== 'Arquivado');

  // Filtros, visão e foco ficam na URL: valem para Mapa e Lista e podem ser compartilhados.
  const status = statusDisponiveis.includes(unico(params.status)) ? unico(params.status) : null;
  const categoriaId = Number(unico(params.categoria)) || null;
  const areaTexto = unico(params.area);
  const area = useMemo(() => lerArea(areaTexto), [areaTexto]);
  const foco = unico(params.foco) ?? null;
  const vista = unico(params.vista) ?? (Platform.OS === 'web' ? 'mapa' : 'lista');
  const noMapa = vista === 'mapa';

  const mudar = (valores) => router.setParams(valores);

  useEffect(() => {
    api('/categorias')
      .then(setCategorias)
      .catch(() => setCategorias([])); // sem categorias a lista continua funcionando
  }, [api]);

  const buscar = useCallback(() => {
    const consulta = new URLSearchParams();
    if (categoriaId) consulta.set('categoria_id', String(categoriaId));
    if (status) consulta.set('status', status);
    if (area) Object.entries(area).forEach(([k, v]) => consulta.set(k, String(v)));
    const texto = consulta.toString();
    return api(`/ocorrencias${texto ? `?${texto}` : ''}`);
  }, [api, categoriaId, status, area]);

  const { dados, carregando, erro, recarregar } = useCarregar(buscar);
  const filtrando = categoriaId !== null || status !== null || area !== null;
  const ativos = [categoriaId, status, area].filter((v) => v !== null).length;

  // Só ocorrências com coordenadas podem aparecer no mapa.
  const comLocal = useMemo(
    () => (dados ?? []).filter((o) => o.latitude != null && o.longitude != null),
    [dados],
  );
  const abrir = useCallback((id) => router.push(`/ocorrencia/${id}`), [router]);

  function limpar() {
    mudar({ categoria: undefined, status: undefined, area: undefined, foco: undefined });
  }

  function buscarNestaArea() {
    const a = areaVisivel;
    mudar({ area: `${a.min_lat},${a.min_lon},${a.max_lat},${a.max_lon}`, foco: undefined });
  }

  const vazio = !erro && dados && dados.length === 0;

  return (
    <Tela>
      <View style={styles.vistas}>
        <Chip rotulo="Mapa" ativo={noMapa} onPress={() => mudar({ vista: 'mapa' })} />
        <Chip rotulo="Lista" ativo={!noMapa} onPress={() => mudar({ vista: 'lista' })} />
      </View>

      {/* No mapa os filtros ficam recolhidos para o mapa ser o primeiro bloco útil da tela. */}
      {noMapa ? (
        <Botao
          titulo={`Filtros (${ativos} ${ativos === 1 ? 'ativo' : 'ativos'})`}
          variante="secundario"
          icone={filtrosAbertos ? 'chevron-up' : 'chevron-down'}
          onPress={() => setFiltrosAbertos((v) => !v)}
          expandido={filtrosAbertos}
        />
      ) : null}
      {!noMapa || filtrosAbertos ? (
        <FiltrosOcorrencias
          categorias={categorias}
          categoriaId={categoriaId}
          onCategoria={(id) => mudar({ categoria: id ?? undefined })}
          statusDisponiveis={statusDisponiveis}
          status={status}
          onStatus={(s) => mudar({ status: s ?? undefined })}
          comArea={area !== null}
          onLimparArea={() => mudar({ area: undefined })}
        />
      ) : null}
      {filtrando && !vazio && (!noMapa || filtrosAbertos) ? <LinkAcao rotulo="Limpar filtros" onPress={limpar} /> : null}

      {carregando && !dados ? <Carregando texto="Buscando ocorrências…" /> : null}
      {erro ? <ErroTela erro={erro} onTentar={recarregar} /> : null}

      {vazio ? (
        <Vazio
          titulo={filtrando ? 'Nenhuma ocorrência com esses filtros' : 'Ainda não há ocorrências'}
          texto={
            filtrando
              ? 'Tente outra categoria, status ou área do mapa.'
              : 'Quando alguém registrar um problema no bairro, ele aparecerá aqui.'
          }
        >
          {filtrando ? <Botao titulo="Limpar filtros" variante="secundario" onPress={limpar} /> : null}
        </Vazio>
      ) : null}

      {/* O mapa fica montado durante recargas para não perder a posição (inclusive com filtro vazio). */}
      {noMapa && !erro && dados ? (
        <>
          <Text style={styles.resumo}>
            {comLocal.length} {comLocal.length === 1 ? 'ocorrência' : 'ocorrências'} no mapa
            {carregando ? ' · atualizando…' : ''}
          </Text>
          <View style={{ height: Math.min(560, Math.max(320, height * 0.5)) }}>
            <MapaOcorrencias
              ocorrencias={comLocal}
              onAbrir={abrir}
              foco={foco}
              area={area}
              onAreaChange={setAreaVisivel}
            />
          </View>
          <Botao
            titulo="Buscar nesta área"
            variante="secundario"
            onPress={buscarNestaArea}
            desabilitado={!areaVisivel || carregando}
          />
          <View accessibilityLabel="Legenda dos marcadores por status" style={styles.legenda}>
            {statusDisponiveis.map((s) => (
              <View key={s} style={styles.item}>
                <View style={[styles.glifo, { backgroundColor: CORES_STATUS[s].texto }]}>
                  <Text style={styles.glifoTexto}>{glifoStatus(s)}</Text>
                </View>
                <StatusBadge status={s} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {!noMapa && !erro && dados ? dados.map((o) => <CartaoOcorrencia key={o.id} ocorrencia={o} />) : null}

    </Tela>
  );
}

const styles = StyleSheet.create({
  vistas: { flexDirection: 'row', gap: 8 },
  resumo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  glifo: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  glifoTexto: { color: '#fff', fontSize: fonte.pequena, fontWeight: '700' },
});
