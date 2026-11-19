import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Carregando, ErroTela, Vazio } from '../../components/estado';
import Icone from '../../components/icone';
import Mensagem from '../../components/mensagem';
import StatusBadge from '../../components/status-badge';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { STATUS } from '../../lib/status';
import { useCarregar } from '../../lib/use-carregar';
import { alvoToque, contornoFoco, cores, fonte, raio } from '../../theme';

function Indicadores() {
  const { api } = useAuth();
  const router = useRouter();
  const buscar = useCallback(() => api('/admin/indicadores'), [api]);
  const { dados, carregando, erro, recarregar } = useCarregar(buscar);

  if (carregando && !dados) return <Carregando />;
  if (erro?.status === 403) {
    return <Vazio icone="lock-closed-outline" titulo="Acesso negado" texto="Esta área é exclusiva para administradores." />;
  }
  if (erro) return <ErroTela erro={erro} onTentar={recarregar} />;
  if (!dados) return null;

  return (
    <Tela>
      <Text style={styles.titulo}>Painel do administrador</Text>
      <Mensagem tipo="aviso">
        Os status são demonstrativos e não têm vínculo com a prefeitura: alterá-los não aciona nenhum atendimento
        oficial.
      </Mensagem>
      <Text style={styles.total}>
        {dados.total} {dados.total === 1 ? 'ocorrência registrada' : 'ocorrências registradas'}
      </Text>

      <Text style={styles.secao}>Por status</Text>
      <Text style={styles.meta}>Toque em um status para ver as ocorrências e alterar o andamento.</Text>
      {STATUS.map((s) => (
        <Pressable
          key={s}
          accessibilityRole="button"
          accessibilityLabel={`${dados.por_status[s] ?? 0} ocorrências em ${s}`}
          onPress={() => router.navigate({ pathname: '/', params: { vista: 'lista', status: s } })}
          style={({ pressed, focused }) => [styles.linha, pressed && { opacity: 0.8 }, focused && contornoFoco]}
        >
          <StatusBadge status={s} />
          <View style={styles.direita}>
            <Text style={styles.numero}>{dados.por_status[s] ?? 0}</Text>
            <Icone nome="chevron-forward" tamanho={18} cor={cores.textoSuave} />
          </View>
        </Pressable>
      ))}

      <Text style={styles.secao}>Por categoria</Text>
      {Object.entries(dados.por_categoria).map(([nome, qtd]) => (
        <View key={nome} style={[styles.linha, styles.semBotao]}>
          <Text style={styles.nome}>{nome}</Text>
          <Text style={styles.numero}>{qtd}</Text>
        </View>
      ))}
    </Tela>
  );
}

export default function Admin() {
  const { admin, restaurando } = useAuth();
  if (restaurando) return <Carregando />;
  // A aba fica oculta para não administradores; o backend nega o acesso de qualquer forma.
  if (!admin) return <Vazio titulo="Acesso negado" texto="Esta área é exclusiva para administradores." />;
  return <Indicadores />;
}

const styles = StyleSheet.create({
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.texto },
  total: { fontSize: fonte.subtitulo, color: cores.texto },
  secao: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto, marginTop: 8 },
  meta: { fontSize: fonte.pequena, color: cores.textoSuave },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: alvoToque + 4,
    gap: 8,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: 14,
  },
  semBotao: { backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, paddingHorizontal: 4 },
  direita: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nome: { flexShrink: 1, fontSize: fonte.corpo, color: cores.texto },
  numero: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
});
