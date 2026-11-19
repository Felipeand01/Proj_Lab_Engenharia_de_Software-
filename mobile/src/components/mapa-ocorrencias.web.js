import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CORES_STATUS, glifoStatus } from '../lib/status';
import { cores, fonte } from '../theme';

// Mapa web (MapLibre + OpenStreetMap). A versão nativa é mapa-ocorrencias.native.js
// e recebe as mesmas props: { ocorrencias, onAbrir(id)?, foco?, area?, onAreaChange?(bbox) }.
// Sem onAbrir os marcadores não são clicáveis (minimapa do detalhe).
// shortcut: tiles públicos do OSM servem a demonstração; em produção use um provedor próprio.
export const ESTILO = {
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

export const CENTRO_PADRAO = [-46.633308, -23.55052]; // [lng, lat]

export function webglDisponivel() {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
}

function criarMarcador(o, interativo, destacado) {
  const el = document.createElement(interativo ? 'button' : 'div');
  const cor = CORES_STATUS[o.status]?.texto ?? cores.primaria;
  if (interativo) el.type = 'button';
  else el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `${o.titulo}, ${o.categoria.nome}, status ${o.status}`);
  el.title = `${o.titulo} · ${o.status}`;
  const tamanho = destacado ? '48px' : '40px';
  el.textContent = glifoStatus(o.status);
  Object.assign(el.style, {
    color: '#fff',
    font: '700 16px system-ui, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: tamanho,
    height: tamanho,
    borderRadius: '50%',
    border: destacado ? '4px solid #1B2733' : '3px solid #fff',
    background: cor,
    boxShadow: destacado ? '0 0 0 3px #fff, 0 2px 6px rgba(0,0,0,.6)' : '0 1px 4px rgba(0,0,0,.45)',
    cursor: interativo ? 'pointer' : 'default',
    padding: '0',
    zIndex: destacado ? '2' : '1',
  });
  return el;
}

const arredondar = (n) => Math.round(n * 1e5) / 1e5;

export default function MapaOcorrencias({ ocorrencias, onAbrir, foco, area, onAreaChange }) {
  const destino = useRef(null);
  const mapa = useRef(null);
  const ajustado = useRef(false); // enquadra os marcadores só uma vez (não "puxa" o mapa depois)
  const focoAplicado = useRef(null);
  const aoMudarArea = useRef(onAreaChange);
  const [webgl] = useState(webglDisponivel);

  useEffect(() => {
    aoMudarArea.current = onAreaChange;
  }, [onAreaChange]);

  useEffect(() => {
    if (!webgl) return undefined;
    const instancia = new maplibregl.Map({
      container: destino.current,
      style: ESTILO,
      center: CENTRO_PADRAO,
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapa.current = instancia;
    instancia.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const avisar = () => {
      const b = instancia.getBounds();
      aoMudarArea.current?.({
        min_lat: arredondar(b.getSouth()),
        min_lon: arredondar(b.getWest()),
        max_lat: arredondar(b.getNorth()),
        max_lon: arredondar(b.getEast()),
      });
    };
    instancia.on('moveend', avisar);
    instancia.on('load', avisar);
    return () => {
      instancia.remove();
      mapa.current = null;
      ajustado.current = false;
      focoAplicado.current = null;
    };
  }, [webgl]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return undefined;

    const marcadores = ocorrencias.map((o) => {
      const elemento = criarMarcador(o, Boolean(onAbrir), String(o.id) === String(foco));
      if (onAbrir) elemento.addEventListener('click', () => onAbrir(o.id));
      return new maplibregl.Marker({ element: elemento })
        .setLngLat([o.longitude, o.latitude])
        .addTo(instancia);
    });

    const alvo = foco ? ocorrencias.find((o) => String(o.id) === String(foco)) : null;
    if (alvo && focoAplicado.current !== foco) {
      focoAplicado.current = foco;
      ajustado.current = true;
      instancia.jumpTo({ center: [alvo.longitude, alvo.latitude], zoom: 16 });
    } else if (!ajustado.current && ocorrencias.length > 0) {
      ajustado.current = true;
      if (area) {
        instancia.fitBounds([[area.min_lon, area.min_lat], [area.max_lon, area.max_lat]], { animate: false });
      } else if (ocorrencias.length === 1) {
        instancia.jumpTo({ center: [ocorrencias[0].longitude, ocorrencias[0].latitude], zoom: 15 });
      } else {
        const limites = new maplibregl.LngLatBounds();
        ocorrencias.forEach((o) => limites.extend([o.longitude, o.latitude]));
        instancia.fitBounds(limites, { padding: 56, maxZoom: 16, animate: false });
      }
    }

    return () => marcadores.forEach((m) => m.remove());
  }, [ocorrencias, onAbrir, foco, area, webgl]);

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
      accessibilityLabel={
        onAbrir
          ? 'Mapa com as ocorrências. Cada marcador abre o detalhe da ocorrência.'
          : 'Mapa com a localização da ocorrência.'
      }
    />
  );
}

const styles = StyleSheet.create({
  mapa: { flex: 1, minHeight: 280 },
  falha: { flex: 1, minHeight: 280, justifyContent: 'center', padding: 24 },
  falhaTexto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center' },
});
