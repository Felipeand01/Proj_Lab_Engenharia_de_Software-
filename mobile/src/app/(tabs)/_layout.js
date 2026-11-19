import { Tabs } from 'expo-router';

import Icone from '../../components/icone';
import { useAuth } from '../../lib/auth';
import { alvoToque, cabecalho, cores } from '../../theme';

const icone = (nome) =>
  function IconeAba({ color, size }) {
    return <Icone nome={nome} tamanho={size} cor={color} />;
  };

export default function TabsLayout() {
  const { admin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        ...cabecalho,
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { minHeight: alvoToque + 16, borderTopColor: cores.borda },
        tabBarItemStyle: { minHeight: alvoToque },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explorar', tabBarIcon: icone('map-outline') }} />
      {/* Administrador não registra ocorrências (o backend também nega). */}
      <Tabs.Screen
        name="nova"
        options={{ title: 'Registrar', tabBarIcon: icone('add-circle-outline'), href: admin ? null : '/nova' }}
      />
      {/* "Minhas" acompanha a participação do morador; fica fora da navegação do administrador. */}
      <Tabs.Screen
        name="minhas"
        options={{ title: 'Minhas', tabBarIcon: icone('list-outline'), href: admin ? null : '/minhas' }}
      />
      {/* A aba só aparece para administradores; o backend valida o papel de qualquer forma. */}
      <Tabs.Screen
        name="admin"
        options={{ title: 'Painel', tabBarIcon: icone('stats-chart-outline'), href: admin ? '/admin' : null }}
      />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: icone('person-circle-outline') }} />
    </Tabs>
  );
}
