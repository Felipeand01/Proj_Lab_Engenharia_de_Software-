import 'maplibre-gl/dist/maplibre-gl.css'; // CSS global: só vale no web, ignorado no nativo
import { Stack, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../lib/auth';
import { cabecalho, cores } from '../theme';

// Link direto ou recarga da página não deixam histórico: o cabeçalho oferece o caminho para o início.
function IrParaInicio() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ir para o início"
      onPress={() => router.replace('/')}
      style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 12 }}
    >
      <Text style={{ color: cores.sobrePrimaria, fontWeight: '700' }}>Início</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={({ navigation }) => ({
          ...cabecalho,
          headerBackTitle: 'Voltar',
          headerLeft: navigation.canGoBack() ? undefined : () => <IrParaInicio />,
          contentStyle: { backgroundColor: cores.fundo },
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ocorrencia/[id]" options={{ title: 'Ocorrência' }} />
        <Stack.Screen name="entrar" options={{ title: 'Entrar' }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
      </Stack>
    </AuthProvider>
  );
}
