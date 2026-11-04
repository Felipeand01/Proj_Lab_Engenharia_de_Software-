import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';

import Botao from '../../components/botao';
import Campo from '../../components/campo';
import { formatarData } from '../../components/cartao-ocorrencia';
import { Carregando, ErroTela, Vazio } from '../../components/estado';
import Mensagem from '../../components/mensagem';
import StatusBadge from '../../components/status-badge';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { podeArquivar, proximoStatus } from '../../lib/status';
import { useCarregar } from '../../lib/use-carregar';
import { cores, fonte, raio } from '../../theme';

const linkMapa = (lat, lon) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;

export default function DetalheOcorrencia() {
  const { id } = useLocalSearchParams();
  const { api, usuario, admin } = useAuth();
  const router = useRouter();
  const buscar = useCallback(() => api(`/ocorrencias/${id}`), [api, id]);
  const { dados: o, carregando, erro, recarregar } = useCarregar(buscar);

  const [acao, setAcao] = useState(null); // 'confirmar' | 'status' | 'arquivar'
  const [feedback, setFeedback] = useState(null); // { tipo, texto }
  const [motivo, setMotivo] = useState('');
  const [fotoComErro, setFotoComErro] = useState(false);

  async function executar(nome, caminho, opcoes, sucesso) {
    setAcao(nome);
    setFeedback(null);
    try {
      await api(caminho, opcoes);
      setFeedback({ tipo: 'sucesso', texto: sucesso });
      setMotivo('');
      await recarregar();
    } catch (e) {
      setFeedback({ tipo: 'erro', texto: e.message });
    } finally {
      setAcao(null);
    }
  }

  if (carregando && !o) return <Carregando />;
  if (erro?.status === 404) {
    return (
      <Vazio titulo="Ocorrência não encontrada" texto="Ela pode ter sido removida ou o link está incorreto.">
        <Botao titulo="Ver ocorrências" onPress={() => router.replace('/')} />
      </Vazio>
    );
  }
  if (erro && !o) return <ErroTela erro={erro} onTentar={recarregar} />;
  if (!o) return null;

  const proximo = proximoStatus(o.status);
  const arquivada = o.status === 'Arquivado';

  return (
    <Tela>
      <View style={styles.linha}>
        <Text style={styles.categoria}>{o.categoria.nome}</Text>
        <StatusBadge status={o.status} />
      </View>
      <Text style={styles.titulo}>{o.titulo}</Text>
      <Text style={styles.meta}>
        Registrada por {o.autor_nome} em {formatarData(o.criado_em)}
      </Text>

      {o.foto_url && !fotoComErro ? (
        <Image
          source={{ uri: o.foto_url }}
          accessibilityLabel={`Foto da ocorrência: ${o.titulo}`}
          style={styles.foto}
          resizeMode="cover"
          onError={() => setFotoComErro(true)}
        />
      ) : null}
      {o.foto_url && fotoComErro ? <Mensagem tipo="aviso">Não foi possível carregar a foto.</Mensagem> : null}

      <Text style={styles.texto}>{o.descricao}</Text>

      <View style={styles.bloco}>
        <Text style={styles.secao}>Local</Text>
        <Text style={styles.texto}>
          Latitude {o.latitude.toFixed(5)} · Longitude {o.longitude.toFixed(5)}
        </Text>
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL(linkMapa(o.latitude, o.longitude))}
        >
          Ver no mapa
        </Text>
      </View>

      {o.motivo_arquivamento ? (
        <Mensagem tipo="aviso">{`Arquivada. Motivo: ${o.motivo_arquivamento}`}</Mensagem>
      ) : null}

      <View style={styles.bloco}>
        <Text style={styles.secao}>
          {o.total_confirmacoes} {o.total_confirmacoes === 1 ? 'confirmação' : 'confirmações'}
        </Text>
        <Text style={styles.meta}>
          Confirmações indicam apoio da comunidade; não alteram o status nem a prioridade de atendimento.
        </Text>
        {usuario ? (
          <Botao
            titulo="Confirmar esta ocorrência"
            onPress={() =>
              executar('confirmar', `/ocorrencias/${o.id}/confirmar`, { metodo: 'POST' }, 'Obrigado! Sua confirmação foi registrada.')
            }
            carregando={acao === 'confirmar'}
            desabilitado={arquivada}
          />
        ) : (
          <Botao titulo="Entre para confirmar" variante="secundario" onPress={() => router.push('/entrar')} />
        )}
        {arquivada ? <Text style={styles.meta}>Ocorrências arquivadas não recebem confirmações.</Text> : null}
      </View>

      {feedback ? <Mensagem tipo={feedback.tipo}>{feedback.texto}</Mensagem> : null}

      <View style={styles.bloco}>
        <Text style={styles.secao}>Histórico</Text>
        {o.historico.map((h, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitulo}>
              {h.status_anterior ? `${h.status_anterior} → ${h.status_novo}` : `Registrada como ${h.status_novo}`}
            </Text>
            <Text style={styles.meta}>{formatarData(h.criado_em)}</Text>
            {h.motivo ? <Text style={styles.meta}>Motivo: {h.motivo}</Text> : null}
          </View>
        ))}
      </View>

      {admin ? (
        <View style={[styles.bloco, styles.admin]}>
          <Text style={styles.secao}>Ações do administrador</Text>
          {proximo ? (
            <Botao
              titulo={`Mover para "${proximo}"`}
              onPress={() =>
                executar(
                  'status',
                  `/admin/ocorrencias/${o.id}/status`,
                  { metodo: 'PATCH', corpo: { status: proximo } },
                  `Status atualizado para ${proximo}.`,
                )
              }
              carregando={acao === 'status'}
            />
          ) : (
            <Text style={styles.meta}>Esta ocorrência está em estado final.</Text>
          )}
          {podeArquivar(o.status) ? (
            <>
              <Campo
                rotulo="Motivo do arquivamento"
                value={motivo}
                onChangeText={setMotivo}
                maxLength={500}
                ajuda="Obrigatório (mínimo de 3 caracteres)."
              />
              <Botao
                titulo="Arquivar ocorrência"
                variante="perigo"
                onPress={() =>
                  executar(
                    'arquivar',
                    `/admin/ocorrencias/${o.id}/arquivar`,
                    { metodo: 'POST', corpo: { motivo: motivo.trim() } },
                    'Ocorrência arquivada.',
                  )
                }
                carregando={acao === 'arquivar'}
                desabilitado={motivo.trim().length < 3}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </Tela>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  categoria: { fontSize: fonte.pequena, fontWeight: '700', color: cores.primaria, flexShrink: 1 },
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.texto },
  meta: { fontSize: fonte.pequena, color: cores.textoSuave },
  texto: { fontSize: fonte.corpo, color: cores.texto, lineHeight: 22 },
  foto: { width: '100%', height: 200, borderRadius: raio.md, backgroundColor: cores.borda },
  link: { color: cores.primaria, fontWeight: '700', fontSize: fonte.corpo },
  bloco: {
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
    gap: 8,
  },
  admin: { borderColor: cores.primaria },
  secao: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  item: { gap: 2, paddingVertical: 4, borderTopWidth: 1, borderTopColor: cores.borda },
  itemTitulo: { fontSize: fonte.corpo, fontWeight: '600', color: cores.texto },
});
