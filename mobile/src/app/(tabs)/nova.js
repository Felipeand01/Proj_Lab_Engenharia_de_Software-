import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Botao from '../../components/botao';
import Campo from '../../components/campo';
import Chip from '../../components/chip';
import { Vazio } from '../../components/estado';
import Mensagem from '../../components/mensagem';
import RequerLogin from '../../components/requer-login';
import SeletorFoto from '../../components/seletor-foto';
import SeletorLocal from '../../components/seletor-local';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { apenasDigitos, buscarEnderecoDoPonto, buscarLocalizacao } from '../../lib/cep';
import { montarEnvio, novaChaveEnvio } from '../../lib/foto';
import { cores, fonte } from '../../theme';

const numero = (texto) => Number(String(texto).trim().replace(',', '.'));
const coordenada = (texto, limite) => {
  const n = numero(texto);
  return String(texto).trim() && Number.isFinite(n) && Math.abs(n) <= limite ? n : null;
};

function Formulario() {
  const { api } = useAuth();
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState(null);
  // Gerada uma vez por formulário: "Tentar novamente" reenvia a mesma chave e não duplica a ocorrência.
  const [chave, setChave] = useState(novaChaveEnvio);

  const [consulta, setConsulta] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [candidatos, setCandidatos] = useState([]);
  const [avisoBusca, setAvisoBusca] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numeroEnd, setNumeroEnd] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [localizando, setLocalizando] = useState(false);
  // O local escolhido é a referência única: marcador, coordenadas e endereço mudam juntos.
  // Cada mudança de local incrementa a versão; respostas assíncronas de versões antigas são ignoradas.
  const versaoLocal = useRef(0);
  const [resolvendo, setResolvendo] = useState(false);
  const [statusPonto, setStatusPonto] = useState(null); // { tipo: 'info' | 'aviso', texto }

  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const lat = coordenada(latitude, 90);
  const lon = coordenada(longitude, 180);

  useEffect(() => {
    api('/categorias')
      .then(setCategorias)
      .catch((e) => setErroGeral(`Não foi possível carregar as categorias. ${e.message}`));
  }, [api]);

  // Endereço completo (inclui número e complemento): deixa de valer assim que o local muda.
  function limparEndereco() {
    [setCep, setLogradouro, setNumeroEnd, setComplemento, setBairro, setCidade, setUf].forEach((d) => d(''));
  }

  // Posiciona o marcador e as coordenadas; qualquer mudança do ponto desfaz a confirmação visual.
  function posicionar(novaLat, novaLon) {
    setLatitude(Number(novaLat).toFixed(6));
    setLongitude(Number(novaLon).toFixed(6));
    setConfirmado(false);
  }

  // Busca o endereço do ponto. Só preenche com o que o serviço informou; nunca inventa campos.
  async function resolverEndereco(novaLat, novaLon, versao) {
    setResolvendo(true);
    setStatusPonto({ tipo: 'info', texto: 'Buscando o endereço deste ponto…' });
    try {
      const r = await buscarEnderecoDoPonto(api, Number(Number(novaLat).toFixed(6)), Number(Number(novaLon).toFixed(6)));
      if (versao !== versaoLocal.current) return; // o usuário já escolheu outro local
      setCep(r.cep ? apenasDigitos(r.cep) : '');
      setLogradouro(r.logradouro ?? '');
      setBairro(r.bairro ?? '');
      setCidade(r.cidade ?? '');
      setUf((r.uf ?? '').toUpperCase());
      const completo = r.logradouro && r.bairro && r.cidade && r.uf;
      setStatusPonto(
        completo
          ? { tipo: 'info', texto: 'Endereço preenchido a partir do ponto. Confira antes de confirmar o local.' }
          : { tipo: 'aviso', texto: 'O serviço não informou o endereço completo deste ponto. Complete o que faltar ou deixe em branco.' },
      );
    } catch (e) {
      if (versao !== versaoLocal.current) return;
      setStatusPonto({
        tipo: 'aviso',
        texto:
          e.status === 404
            ? 'Não encontramos um endereço para este ponto. Preencha o endereço ou deixe em branco.'
            : 'Não foi possível obter o endereço deste ponto agora. Preencha o endereço ou deixe em branco.',
      });
    } finally {
      if (versao === versaoLocal.current) setResolvendo(false);
    }
  }

  // Ponto escolhido sem endereço pronto (mapa ou GPS): o endereço anterior é descartado
  // e o do novo ponto é buscado. Assim endereço e marcador nunca divergem.
  function definirPonto(novaLat, novaLon) {
    versaoLocal.current += 1;
    posicionar(novaLat, novaLon);
    limparEndereco();
    setCandidatos([]);
    setAvisoBusca('');
    resolverEndereco(novaLat, novaLon, versaoLocal.current);
  }

  // Coordenadas digitadas à mão: o endereço antigo é limpo (não há consulta a cada tecla).
  const digitarCoordenada = (definir) => (texto) => {
    versaoLocal.current += 1;
    definir(texto);
    setConfirmado(false);
    limparEndereco();
    setResolvendo(false);
    setStatusPonto({
      tipo: 'aviso',
      texto: 'Coordenadas alteradas à mão: o endereço foi limpo. Preencha-o ou deixe em branco.',
    });
  };

  async function usarMinhaLocalizacao() {
    setAviso('');
    setLocalizando(true);
    const versao = versaoLocal.current;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAviso('Sem permissão de localização. Busque o endereço, toque no mapa ou informe as coordenadas.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      // Leitura atrasada: se outro local foi escolhido enquanto o GPS respondia, ela é descartada.
      if (versao !== versaoLocal.current) return;
      definirPonto(coords.latitude, coords.longitude);
    } catch {
      setAviso('Não foi possível obter sua localização. Busque o endereço, toque no mapa ou informe as coordenadas.');
    } finally {
      setLocalizando(false);
    }
  }

  // Resultado da busca: endereço e ponto vêm juntos e substituem o local anterior por inteiro.
  function aplicarCandidato(c) {
    if (c.latitude == null || c.longitude == null) {
      setAvisoBusca('Este resultado não tem coordenadas. Escolha outro, use sua localização ou toque no mapa.');
      return;
    }
    versaoLocal.current += 1;
    setResolvendo(false);
    setStatusPonto(null);
    limparEndereco();
    setCep(c.cep ? apenasDigitos(c.cep) : '');
    setLogradouro(c.logradouro ?? '');
    setBairro(c.bairro ?? '');
    setCidade(c.cidade ?? '');
    setUf((c.uf ?? '').toUpperCase());
    setCandidatos([]);
    posicionar(c.latitude, c.longitude);
    setAvisoBusca('Endereço encontrado. Confira o ponto no mapa e confirme o local.');
  }

  async function buscarEndereco() {
    setAvisoBusca('');
    setCandidatos([]);
    if (consulta.trim().length < 3) {
      setAvisoBusca('Digite um CEP ou um endereço para buscar.');
      return;
    }
    setBuscando(true);
    const versao = versaoLocal.current;
    try {
      const achados = (await buscarLocalizacao(api, consulta)).slice(0, 5);
      if (versao !== versaoLocal.current) return; // outro local foi escolhido enquanto buscava
      if (achados.length === 0) {
        setAvisoBusca('Nenhum endereço encontrado. Confira o texto, use sua localização ou toque no mapa.');
      } else if (achados.length === 1) {
        aplicarCandidato(achados[0]);
      } else {
        setCandidatos(achados);
        setAvisoBusca('Encontramos mais de um endereço. Escolha o correto.');
      }
    } catch (e) {
      if (versao !== versaoLocal.current) return;
      setAvisoBusca(`${e.message} Você pode usar sua localização ou tocar no mapa.`);
    } finally {
      setBuscando(false);
    }
  }

  function validar() {
    const e = {};
    if (!categoriaId) e.categoria = 'Escolha uma categoria.';
    if (titulo.trim().length < 3) e.titulo = 'O título precisa ter ao menos 3 caracteres.';
    if (descricao.trim().length < 10) e.descricao = 'Descreva o problema com ao menos 10 caracteres.';
    if (lat === null) e.latitude = 'Latitude entre -90 e 90.';
    if (lon === null) e.longitude = 'Longitude entre -180 e 180.';
    if (resolvendo) e.local = 'Aguarde a busca do endereço deste ponto.';
    else if (lat !== null && lon !== null && !confirmado) e.local = 'Confirme o local no mapa antes de enviar.';
    if (cep && apenasDigitos(cep).length !== 8) e.cep = 'O CEP precisa ter 8 dígitos.';
    if (uf && !/^[A-Za-z]{2}$/.test(uf)) e.uf = 'Use a sigla do estado (ex.: SP).';
    if (!foto) e.foto = 'Adicione uma foto da ocorrência.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    setErroGeral('');
    if (!validar()) return;
    setEnviando(true);
    try {
      // Envio único (campos + foto). Em falha, o formulário, a foto e o ponto permanecem.
      const corpo = await montarEnvio(
        {
          categoria_id: categoriaId,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          latitude: lat,
          longitude: lon,
          cep: apenasDigitos(cep),
          logradouro: logradouro.trim(),
          numero: numeroEnd.trim(),
          complemento: complemento.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          uf: uf.trim().toUpperCase(),
          chave_envio: chave,
        },
        foto,
      );
      const criada = await api('/ocorrencias', { metodo: 'POST', corpo });
      reiniciar();
      router.push(`/ocorrencia/${criada.id}`);
    } catch (e) {
      setErroGeral(`${e.message} Seus dados foram mantidos: toque em "Tentar novamente".`);
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    [setTitulo, setDescricao, setLatitude, setLongitude, setConsulta, setCep, setLogradouro, setNumeroEnd]
      .concat([setComplemento, setBairro, setCidade, setUf])
      .forEach((definir) => definir(''));
    setCategoriaId(null);
    setFoto(null);
    setConfirmado(false);
    versaoLocal.current += 1; // descarta respostas pendentes do formulário anterior
    setResolvendo(false);
    setStatusPonto(null);
    setCandidatos([]);
    setAvisoBusca('');
    setErros({});
    setChave(novaChaveEnvio());
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
      {/* Texto fixo (e não o `ajuda` do Campo, que some quando há erro de validação). */}
      <Text style={styles.ajuda}>
        Evite incluir documentos, contatos, dados pessoais ou rostos identificáveis na descrição e na fotografia.
      </Text>

      <View style={styles.grupo}>
        <Text style={styles.rotulo}>Local</Text>
        <Text style={styles.ajuda}>
          Busque pelo CEP ou endereço, use sua localização (só quando você tocar no botão) ou marque o ponto no mapa.
        </Text>
        <Text style={styles.ajuda}>
          A localização selecionada pode ser consultada no serviço OpenStreetMap/Nominatim para buscar um endereço
          aproximado.
        </Text>
        <Campo
          rotulo="CEP ou endereço"
          value={consulta}
          onChangeText={setConsulta}
          onSubmitEditing={buscarEndereco}
          returnKeyType="search"
          placeholder="01310-100 ou Av. Paulista, São Paulo"
        />
        <Botao titulo="Buscar" variante="secundario" onPress={buscarEndereco} carregando={buscando} />
        {candidatos.map((c, i) => (
          <Botao key={i} titulo={c.rotulo || `${c.logradouro}, ${c.bairro}, ${c.cidade} - ${c.uf}`} variante="secundario" onPress={() => aplicarCandidato(c)} />
        ))}
        <Mensagem tipo="aviso">{avisoBusca}</Mensagem>

        <Botao
          titulo="Usar minha localização"
          variante="secundario"
          onPress={usarMinhaLocalizacao}
          carregando={localizando}
        />
        <Mensagem tipo="aviso">{aviso}</Mensagem>
      </View>

      {statusPonto?.tipo === 'info' ? <Text style={styles.ajuda}>{statusPonto.texto}</Text> : null}
      {statusPonto?.tipo === 'aviso' ? <Mensagem tipo="aviso">{statusPonto.texto}</Mensagem> : null}
      {/* Rua, bairro, cidade, UF e CEP acompanham o local: ficam travados depois de confirmado. */}
      <Campo rotulo="Rua" value={logradouro} onChangeText={setLogradouro} maxLength={150} editable={!confirmado} />
      <Campo rotulo="Número (opcional)" value={numeroEnd} onChangeText={setNumeroEnd} maxLength={20} />
      <Campo rotulo="Complemento (opcional)" value={complemento} onChangeText={setComplemento} maxLength={100} />
      <Campo rotulo="Bairro" value={bairro} onChangeText={setBairro} maxLength={100} editable={!confirmado} />
      <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} maxLength={100} editable={!confirmado} />
      <Campo
        rotulo="UF"
        value={uf}
        onChangeText={setUf}
        maxLength={2}
        autoCapitalize="characters"
        editable={!confirmado}
        erro={erros.uf}
      />
      <Campo
        rotulo="CEP (opcional)"
        value={cep}
        onChangeText={setCep}
        maxLength={9}
        keyboardType="numbers-and-punctuation"
        editable={!confirmado}
        erro={erros.cep}
      />
      {confirmado ? (
        <Text style={styles.ajuda}>
          Rua, bairro, cidade, UF e CEP seguem o local confirmado. Para mudá-los, toque em “Alterar local”.
        </Text>
      ) : null}

      <View style={styles.grupo}>
        <Text style={styles.rotulo}>Ponto no mapa</Text>
        <SeletorLocal latitude={lat} longitude={lon} onChange={(p) => definirPonto(p.latitude, p.longitude)} />
        <Campo
          rotulo="Latitude"
          value={latitude}
          onChangeText={digitarCoordenada(setLatitude)}
          keyboardType="numbers-and-punctuation"
          placeholder="-23.550520"
          erro={erros.latitude}
        />
        <Campo
          rotulo="Longitude"
          value={longitude}
          onChangeText={digitarCoordenada(setLongitude)}
          keyboardType="numbers-and-punctuation"
          placeholder="-46.633308"
          erro={erros.longitude}
        />
        {confirmado ? (
          <>
            <Mensagem tipo="sucesso">Local confirmado. Se mover o ponto, confirme de novo.</Mensagem>
            <Botao titulo="Alterar local" variante="secundario" onPress={() => setConfirmado(false)} />
          </>
        ) : (
          <Botao
            titulo="Confirmar este local"
            onPress={() => setConfirmado(true)}
            desabilitado={lat === null || lon === null || resolvendo}
          />
        )}
        {erros.local ? <Text style={styles.erro}>{erros.local}</Text> : null}
      </View>

      <SeletorFoto foto={foto} onChange={setFoto} desabilitado={enviando} obrigatoria />
      {erros.foto ? <Text style={styles.erro}>{erros.foto}</Text> : null}

      <Mensagem>{erroGeral}</Mensagem>
      <Botao titulo={erroGeral ? 'Tentar novamente' : 'Enviar ocorrência'} onPress={enviar} carregando={enviando} />
    </Tela>
  );
}

export default function Nova() {
  const { admin } = useAuth();
  return (
    <RequerLogin motivo="Para registrar uma ocorrência, entre ou crie sua conta de morador.">
      {admin ? (
        <Vazio
          titulo="Administradores não registram ocorrências"
          texto="Use o painel para acompanhar e atualizar as ocorrências dos moradores."
        />
      ) : (
        <Formulario />
      )}
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
