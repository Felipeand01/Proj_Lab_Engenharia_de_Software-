import { Tabs } from 'expo-router';

import { useAuth } from '../../lib/auth';
import { cores } from '../../theme';

export default function TabsLayout() {
  const { admin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: cores.sobrePrimaria,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ocorrências' }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="nova"options={{ title: 'Registrar' }} />
      <Tabs.Screen name="minhas" options={{ title: 'Minhas' }} />
      {/* A aba só aparece para administradores; o backend valida o papel de qualquer forma. */}
      <Tabs.Screen name="admin" options={{ title: 'Painel', href: admin ? '/admin' : null }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta' }} />
    </Tabs>
  );
}
