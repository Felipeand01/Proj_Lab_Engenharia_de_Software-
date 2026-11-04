import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import CartaoOcorrencia from '../../components/cartao-ocorrencia';
import Chip from '../../components/chip';
import { Carregando, ErroTela, Vazio } from '../../components/estado';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { STATUS } from '../../lib/status';
import { useCarregar } from '../../lib/use-carregar';
import { cores, fonte } from '../../theme';

export default function ListaOcorrencias() {
  const { api } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [categoriaId, setCategoriaId] = useState(null);
  const [categorias, setCategorias] = useState([]);

  // O status fica na URL: o painel do administrador abre a lista já filtrada.
  const status = STATUS.includes(params.status) ? params.status : null;
  const setStatus = (valor) => router.setParams({ status: valor ?? undefined });

  useEffect(() => {
    api('/categorias')
      .then(setCategorias)
      .catch(() => setCategorias([])); // sem categorias a lista continua funcionando
  }, [api]);

  const buscar = useCallback(() => {
    const consulta = new URLSearchParams();
    if (categoriaId) consulta.set('categoria_id', String(categoriaId));
    if (status) consulta.set('status', status);
    const texto = consulta.toString();
    return api(`/ocorrencias${texto ? `?${texto}` : ''}`);
  }, [api, categoriaId, status]);

  const { dados, carregando, erro, recarregar } = useCarregar(buscar);
  const filtrando = categoriaId !== null || status !== null;

  function limpar() {
    setCategoriaId(null);
    setStatus(null);
  }

  return (
    <Tela>
      <Text style={styles.rotulo}>Categoria</Text>
      <View style={styles.chips}>
        <Chip rotulo="Todas" ativo={categoriaId === null} onPress={() => setCategoriaId(null)} />
        {categorias.map((c) => (
          <Chip key={c.id} rotulo={c.nome} ativo={categoriaId === c.id} onPress={() => setCategoriaId(c.id)} />
        ))}
      </View>

      <Text style={styles.rotulo}>Status</Text>
      <View style={styles.chips}>
        <Chip rotulo="Todos" ativo={status === null} onPress={() => setStatus(null)} />
        {STATUS.map((s) => (
          <Chip key={s} rotulo={s} ativo={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>

      {carregando && !dados ? <Carregando texto="Buscando ocorrências…" /> : null}
      {erro ? <ErroTela erro={erro} onTentar={recarregar} /> : null}

      {!erro && dados && dados.length === 0 ? (
        <Vazio
          titulo={filtrando ? 'Nenhuma ocorrência com esses filtros' : 'Ainda não há ocorrências'}
          texto={
            filtrando
              ? 'Tente outra categoria ou status.'
              : 'Quando alguém registrar um problema no bairro, ele aparecerá aqui.'
          }
        />
      ) : null}

      {!erro && dados
        ? dados.map((o) => <CartaoOcorrencia key={o.id} ocorrencia={o} />)
        : null}

      {filtrando ? (
        <Text accessibilityRole="button" onPress={limpar} style={styles.limpar}>
          Limpar filtros
        </Text>
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  rotulo: { fontSize: fonte.pequena, fontWeight: '700', color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  limpar: { color: cores.primaria, fontWeight: '700', textAlign: 'center', padding: 12 },
});
