import { StyleSheet, Text, View } from 'react-native';

import { cores, fonte } from '../theme';
import Chip from './chip';
import LinkAcao from './link-acao';

// Filtros do Explorar, compartilhados entre Mapa e Lista (o estado fica na URL, na tela).
export default function FiltrosOcorrencias({
  categorias,
  categoriaId,
  onCategoria,
  statusDisponiveis,
  status,
  onStatus,
  comArea,
  onLimparArea,
}) {
  return (
    <View style={styles.grupo}>
      <Text style={styles.rotulo}>Categoria</Text>
      <View style={styles.chips}>
        <Chip rotulo="Todas" ativo={categoriaId === null} onPress={() => onCategoria(null)} />
        {categorias.map((c) => (
          <Chip key={c.id} rotulo={c.nome} ativo={categoriaId === c.id} onPress={() => onCategoria(c.id)} />
        ))}
      </View>

      <Text style={styles.rotulo}>Status</Text>
      <View style={styles.chips}>
        <Chip rotulo="Todos" ativo={status === null} onPress={() => onStatus(null)} />
        {statusDisponiveis.map((s) => (
          <Chip key={s} rotulo={s} ativo={status === s} onPress={() => onStatus(s)} />
        ))}
      </View>

      {comArea ? (
        <View style={styles.areaLinha}>
          <Text style={styles.area}>Filtrando pela área do mapa</Text>
          <LinkAcao rotulo="Limpar área" onPress={onLimparArea} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 8 },
  rotulo: { fontSize: fonte.pequena, fontWeight: '700', color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  area: { fontSize: fonte.corpo, color: cores.texto, fontWeight: '600' },
  areaLinha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
});
