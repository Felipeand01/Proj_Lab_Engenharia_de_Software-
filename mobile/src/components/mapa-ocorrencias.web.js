import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CORES_STATUS } from '../lib/status';
import { cores, fonte } from '../theme';

// Mapa web (MapLibre + OpenStreetMap). A versão nativa é mapa-ocorrencias.native.js
// e recebe as mesmas props: { ocorrencias, onAbrir(id) }.
// shortcut: tiles públicos do OSM servem a demonstração; em produção use um provedor próprio.
const ESTILO = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Colaboradores do OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// O Metro não empacota o worker do MapLibre (build ESM usa import.meta.url): ele é servido
// de mobile/public/. Ao atualizar o maplibre-gl, recopie dist/maplibre-gl-worker.mjs para lá.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

const CENTRO_PADRAO = [-46.633308, -23.55052]; // [lng, lat]

function webglDisponivel() {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
}

function criarMarcador(o) {
  const botao = document.createElement('button');
  const cor = CORES_STATUS[o.status]?.texto ?? cores.primaria;
  botao.type = 'button';
  botao.setAttribute('aria-label', `${o.titulo}, ${o.categoria.nome}, status ${o.status}`);
  botao.title = `${o.titulo} · ${o.status}`;
  Object.assign(botao.style, {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #fff',
    background: cor,
    boxShadow: '0 1px 4px rgba(0,0,0,.45)',
    cursor: 'pointer',
    padding: '0',
  });
  return botao;
}

export default function MapaOcorrencias({ ocorrencias, onAbrir }) {
  const destino = useRef(null);
  const mapa = useRef(null);
  const [webgl] = useState(webglDisponivel);

  useEffect(() => {
    if (!webgl) return undefined;
    mapa.current = new maplibregl.Map({
      container: destino.current,
      style: ESTILO,
      center: CENTRO_PADRAO,
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapa.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    return () => mapa.current?.remove();
  }, [webgl]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return undefined;

    const marcadores = ocorrencias.map((o) => {
      const elemento = criarMarcador(o);
      elemento.addEventListener('click', () => onAbrir(o.id));
      return new maplibregl.Marker({ element: elemento })
        .setLngLat([o.longitude, o.latitude])
        .addTo(instancia);
    });

    if (ocorrencias.length === 1) {
      instancia.jumpTo({ center: [ocorrencias[0].longitude, ocorrencias[0].latitude], zoom: 15 });
    } else if (ocorrencias.length > 1) {
      const limites = new maplibregl.LngLatBounds();
      ocorrencias.forEach((o) => limites.extend([o.longitude, o.latitude]));
      instancia.fitBounds(limites, { padding: 56, maxZoom: 16, animate: false });
    }

    return () => marcadores.forEach((m) => m.remove());
  }, [ocorrencias, onAbrir, webgl]);

  if (!webgl) {
    return (
      <View style={styles.falha}>
        <Text style={styles.falhaTexto}>
          Não foi possível exibir o mapa neste navegador. Consulte as ocorrências na lista.
        </Text>
      </View>
    );
  }

  return (
    <View
      ref={destino}
      style={styles.mapa}
      accessibilityLabel="Mapa com as ocorrências. Cada marcador abre o detalhe da ocorrência."
    />
  );
}

const styles = StyleSheet.create({
  mapa: { flex: 1, minHeight: 280 },
  falha: { flex: 1, minHeight: 280, justifyContent: 'center', padding: 24 },
  falhaTexto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center' },
});
