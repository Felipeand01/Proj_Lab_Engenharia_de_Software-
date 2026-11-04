import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Botao from '../../components/botao';
import Campo from '../../components/campo';
import Chip from '../../components/chip';
import Mensagem from '../../components/mensagem';
import RequerLogin from '../../components/requer-login';
import SeletorFoto from '../../components/seletor-foto';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { enviarFoto } from '../../lib/foto';
import { cores, fonte } from '../../theme';

const numero = (texto) => Number(String(texto).trim().replace(',', '.'));

function Formulario() {
  const { api } = useAuth();
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState(null);
  // Ocorrência já criada cuja foto falhou: { id, foto, mensagem }. A ocorrência não se perde.
  const [pendente, setPendente] = useState(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [aviso, setAviso] = useState('');
  const [localizando, setLocalizando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api('/categorias')
      .then(setCategorias)
      .catch((e) => setErroGeral(`Não foi possível carregar as categorias. ${e.message}`));
  }, [api]);

  async function usarMinhaLocalizacao() {
    setAviso('');
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAviso('Sem permissão de localização. Informe a latitude e a longitude manualmente.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setLatitude(coords.latitude.toFixed(6));
      setLongitude(coords.longitude.toFixed(6));
    } catch {
      setAviso('Não foi possível obter sua localização. Informe a latitude e a longitude manualmente.');
    } finally {
      setLocalizando(false);
    }
  }

  function validar() {
    const e = {};
    if (!categoriaId) e.categoria = 'Escolha uma categoria.';
    if (titulo.trim().length < 3) e.titulo = 'O título precisa ter ao menos 3 caracteres.';
    if (descricao.trim().length < 10) e.descricao = 'Descreva o problema com ao menos 10 caracteres.';
    const lat = numero(latitude);
    const lon = numero(longitude);
    if (!latitude.trim() || Number.isNaN(lat) || lat < -90 || lat > 90) e.latitude = 'Latitude entre -90 e 90.';
    if (!longitude.trim() || Number.isNaN(lon) || lon < -180 || lon > 180) e.longitude = 'Longitude entre -180 e 180.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    setErroGeral('');
    if (!validar()) return;
    setEnviando(true);
    try {
      const criada = await api('/ocorrencias', {
        metodo: 'POST',
        corpo: {
          categoria_id: categoriaId,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          latitude: numero(latitude),
          longitude: numero(longitude),
        },
      });
      setTitulo('');
      setDescricao('');
      setLatitude('');
      setLongitude('');
      setCategoriaId(null);
      const escolhida = foto;
      setFoto(null);
      if (escolhida) {
        try {
          await enviarFoto(api, criada.id, escolhida);
        } catch (e) {
          setPendente({ id: criada.id, foto: escolhida, mensagem: e.message });
          return;
        }
      }
      router.push(`/ocorrencia/${criada.id}`);
    } catch (e) {
      setErroGeral(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function tentarFotoDeNovo() {
    setEnviando(true);
    try {
      await enviarFoto(api, pendente.id, pendente.foto);
      const { id } = pendente;
      setPendente(null);
      router.push(`/ocorrencia/${id}`);
    } catch (e) {
      setPendente({ ...pendente, mensagem: e.message });
    } finally {
      setEnviando(false);
    }
  }

  function verSemFoto() {
    const { id } = pendente;
    setPendente(null);
    router.push(`/ocorrencia/${id}`);
  }

  if (pendente) {
    return (
      <Tela>
        <Text style={styles.titulo}>Ocorrência registrada</Text>
        <Mensagem tipo="aviso">{`Sua ocorrência foi salva, mas a foto não foi enviada. ${pendente.mensagem}`}</Mensagem>
        <Botao titulo="Tentar enviar a foto de novo" onPress={tentarFotoDeNovo} carregando={enviando} />
        <Botao titulo="Ver ocorrência sem foto" variante="secundario" onPress={verSemFoto} desabilitado={enviando} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Text style={styles.titulo}>Registrar ocorrência</Text>

      <View style={styles.grupo}>
        <Text style={styles.rotulo}>Categoria</Text>
        <View style={styles.chips}>
          {categorias.map((c) => (
            <Chip key={c.id} rotulo={c.nome} ativo={categoriaId === c.id} onPress={() => setCategoriaId(c.id)} />
          ))}
        </View>
        {erros.categoria ? <Text style={styles.erro}>{erros.categoria}</Text> : null}
      </View>

      <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} maxLength={120} erro={erros.titulo} />
      <Campo
        rotulo="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multilinha
        maxLength={2000}
        erro={erros.descricao}
      />

      <View style={styles.grupo}>
        <Text style={styles.rotulo}>Local</Text>
        <Text style={styles.ajuda}>
          Usamos sua localização só para preencher o local desta ocorrência. Se preferir, digite as coordenadas.
        </Text>
        <Botao
          titulo="Usar minha localização"
          variante="secundario"
          onPress={usarMinhaLocalizacao}
          carregando={localizando}
        />
        <Mensagem tipo="aviso">{aviso}</Mensagem>
      </View>
      <Campo
        rotulo="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numbers-and-punctuation"
        placeholder="-23.550520"
        erro={erros.latitude}
      />
      <Campo
        rotulo="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numbers-and-punctuation"
        placeholder="-46.633308"
        erro={erros.longitude}
      />

      <SeletorFoto foto={foto} onChange={setFoto} desabilitado={enviando} />

      <Mensagem>{erroGeral}</Mensagem>
      <Botao titulo="Enviar ocorrência" onPress={enviar} carregando={enviando} />
    </Tela>
  );
}

export default function Nova() {
  return (
    <RequerLogin motivo="Para registrar uma ocorrência, entre ou crie sua conta de morador.">
      <Formulario />
    </RequerLogin>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.texto },
  grupo: { gap: 8 },
  rotulo: { fontSize: fonte.pequena, fontWeight: '600', color: cores.texto },
  ajuda: { fontSize: fonte.pequena, color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  erro: { fontSize: fonte.pequena, color: cores.perigo },
});
