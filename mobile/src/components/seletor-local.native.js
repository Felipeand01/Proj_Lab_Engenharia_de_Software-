import { StyleSheet, Text } from 'react-native';

import { cores, fonte } from '../theme';

// Seleção no mapa só existe na versão web; no aplicativo use o GPS ou as coordenadas digitadas.
// Mesma interface do componente web: { latitude, longitude, onChange }.
export default function SeletorLocal() {
  return (
    <Text style={styles.aviso}>
      O minimapa está disponível na versão web. Aqui, use sua localização ou informe as coordenadas.
    </Text>
  );
}

const styles = StyleSheet.create({
  aviso: { fontSize: fonte.pequena, color: cores.textoSuave },
});
