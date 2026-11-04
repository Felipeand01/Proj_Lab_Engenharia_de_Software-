import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import CartaoOcorrencia from '../../components/cartao-ocorrencia';
import Chip from '../../components/chip';
import { Carregando, ErroTela, Vazio } from '../../components/estado';
import RequerLogin from '../../components/requer-login';
import Tela from '../../components/tela';
import { useAuth } from '../../lib/auth';
import { useCarregar } from '../../lib/use-carregar';

function MinhasOcorrencias() {
  const { api } = useAuth();
  const [aba, setAba] = useState('criadas');
  const buscar = useCallback(() => api('/minhas-ocorrencias'), [api]);
  const { dados, carregando, erro, recarregar } = useCarregar(buscar);

  const lista = dados?.[aba] ?? [];

  return (
    <Tela>
      <View style={styles.chips}>
        <Chip rotulo="Criadas por mim" ativo={aba === 'criadas'} onPress={() => setAba('criadas')} />
        <Chip rotulo="Confirmadas por mim" ativo={aba === 'confirmadas'} onPress={() => setAba('confirmadas')} />
      </View>

      {carregando && !dados ? <Carregando /> : null}
      {erro ? <ErroTela erro={erro} onTentar={recarregar} /> : null}

      {!erro && dados && lista.length === 0 ? (
        <Vazio
          titulo={aba === 'criadas' ? 'Você ainda não registrou ocorrências' : 'Você ainda não confirmou ocorrências'}
          texto={
            aba === 'criadas'
              ? 'Use a aba Registrar para reportar um problema no bairro.'
              : 'Abra uma ocorrência na lista e toque em Confirmar para apoiá-la.'
          }
        />
      ) : null}

      {!erro ? lista.map((o) => <CartaoOcorrencia key={o.id} ocorrencia={o} />) : null}
    </Tela>
  );
}

export default function Minhas() {
  return (
    <RequerLogin motivo="Entre para ver as ocorrências que você criou e confirmou.">
      <MinhasOcorrencias />
    </RequerLogin>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
