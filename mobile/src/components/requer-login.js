import { useRouter } from 'expo-router';

import { useAuth } from '../lib/auth';
import Botao from './botao';
import { Carregando, Vazio } from './estado';

// Protege telas de morador na interface. A autorização real é do backend.
export default function RequerLogin({ motivo, children }) {
  const { usuario, restaurando } = useAuth();
  const router = useRouter();

  if (restaurando) return <Carregando />;
  if (usuario) return children;

  return (
    <Vazio titulo="Entre para continuar" texto={motivo}>
      <Botao titulo="Entrar" onPress={() => router.push('/entrar')} />
      <Botao titulo="Criar conta" variante="secundario" onPress={() => router.push('/cadastro')} />
    </Vazio>
  );
}
