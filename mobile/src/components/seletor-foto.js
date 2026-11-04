import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { TAMANHO_MAXIMO_FOTO } from '../lib/foto';
import { cores, fonte, raio } from '../theme';
import Botao from './botao';
import Mensagem from './mensagem';

// Escolhe uma foto (galeria no celular, seletor de arquivo no web) e mostra o preview.
// O envio é feito pela tela, depois de criar a ocorrência.
export default function SeletorFoto({ foto, onChange, desabilitado }) {
  const [erro, setErro] = useState('');

  async function escolher() {
    setErro('');
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (resultado.canceled || !resultado.assets?.length) return; // cancelar mantém a foto atual
      const escolhida = resultado.assets[0];
      if (escolhida.fileSize && escolhida.fileSize > TAMANHO_MAXIMO_FOTO) {
        setErro('A foto passa de 5 MB. Escolha uma imagem menor.');
        return;
      }
      onChange(escolhida);
    } catch {
      setErro('Não foi possível abrir suas fotos. Tente novamente.');
    }
  }

  return (
    <View style={styles.grupo}>
      <Text style={styles.rotulo}>Foto (opcional)</Text>
      <Text style={styles.ajuda}>Uma foto ajuda a identificar o problema. JPEG, PNG ou WebP, até 5 MB.</Text>

      {foto ? (
        <Image
          source={{ uri: foto.uri }}
          accessibilityLabel="Pré-visualização da foto escolhida"
          style={styles.preview}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.acoes}>
        <View style={styles.acao}>
          <Botao
            titulo={foto ? 'Trocar foto' : 'Escolher foto'}
            variante="secundario"
            onPress={escolher}
            desabilitado={desabilitado}
          />
        </View>
        {foto ? (
          <View style={styles.acao}>
            <Botao titulo="Remover foto" variante="perigo" onPress={() => onChange(null)} desabilitado={desabilitado} />
          </View>
        ) : null}
      </View>
      <Mensagem>{erro}</Mensagem>
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 8 },
  rotulo: { fontSize: fonte.pequena, fontWeight: '600', color: cores.texto },
  ajuda: { fontSize: fonte.pequena, color: cores.textoSuave },
  preview: { width: '100%', height: 200, borderRadius: raio.md, backgroundColor: cores.borda },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  acao: { flexGrow: 1, flexBasis: 140 },
});
