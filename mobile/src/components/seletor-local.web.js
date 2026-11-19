import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cores, fonte } from '../theme';
import { CENTRO_PADRAO, ESTILO, webglDisponivel } from './mapa-ocorrencias.web';

// Minimapa para escolher o local: toque no mapa ou arraste o marcador.
// Props: { latitude, longitude (números ou null), onChange({ latitude, longitude }) }.
// Sem WebGL o formulário continua utilizável pelos campos de latitude/longitude.
export default function SeletorLocal({ latitude, longitude, onChange }) {
  const destino = useRef(null);
  const mapa = useRef(null);
  const marcador = useRef(null);
  const interno = useRef(false); // mudança vinda do próprio mapa: não recentralizar
  const aoMudar = useRef(onChange);
  const [webgl] = useState(webglDisponivel);

  useEffect(() => {
    aoMudar.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!webgl) return undefined;
    const instancia = new maplibregl.Map({
      container: destino.current,
      style: ESTILO,
      center: CENTRO_PADRAO,
      zoom: 11,
      attributionControl: { compact: true },
    });
    instancia.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    instancia.on('click', (e) => {
      interno.current = true;
      aoMudar.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
    });
    mapa.current = instancia;
    return () => {
      instancia.remove();
      mapa.current = null;
      marcador.current = null;
    };
  }, [webgl]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return;
    const valido = Number.isFinite(latitude) && Number.isFinite(longitude);
    if (!valido) {
      marcador.current?.remove();
      marcador.current = null;
      return;
    }
    if (!marcador.current) {
      marcador.current = new maplibregl.Marker({ draggable: true, color: cores.primaria })
        .setLngLat([longitude, latitude])
        .addTo(instancia);
      marcador.current.on('dragend', () => {
        const p = marcador.current.getLngLat();
        interno.current = true;
        aoMudar.current({ latitude: p.lat, longitude: p.lng });
      });
    } else {
      marcador.current.setLngLat([longitude, latitude]);
    }
    if (interno.current) interno.current = false;
    else instancia.jumpTo({ center: [longitude, latitude], zoom: 16 });
  }, [latitude, longitude, webgl]);

  if (!webgl) {
    return (
      <Text style={styles.falha}>
        Não foi possível exibir o mapa neste navegador. Informe a latitude e a longitude nos campos abaixo.
      </Text>
    );
  }

  return (
    <View
      ref={destino}
      style={styles.mapa}
      accessibilityLabel="Minimapa para escolher o local. Toque no mapa ou arraste o marcador."
    />
  );
}

const styles = StyleSheet.create({
  mapa: { height: 260, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: cores.borda },
  falha: { fontSize: fonte.pequena, color: cores.textoSuave },
});
