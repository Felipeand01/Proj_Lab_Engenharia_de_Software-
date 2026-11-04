import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

// Carrega dados ao focar a tela e expõe loading/erro e recarga manual.
// `buscar` deve ser memoizada com useCallback: quando muda (ex.: filtros), recarrega.
export function useCarregar(buscar) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Só a requisição mais recente pode atualizar o estado (evita resposta antiga sobrescrever filtro novo).
  const ultima = useRef(0);

  const recarregar = useCallback(async () => {
    const minha = ++ultima.current;
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await buscar();
      if (minha === ultima.current) setDados(resultado);
    } catch (e) {
      if (minha === ultima.current) setErro(e);
    } finally {
      if (minha === ultima.current) setCarregando(false);
    }
  }, [buscar]);

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar]),
  );

  return { dados, carregando, erro, recarregar };
}
