import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { alvoToque, contornoFoco, cores, fonte, raio } from '../theme';
import Icone from './icone';

// O "olho" que o Edge mostra em campos de senha é do navegador (some quando o campo perde o
// foco). O app tem o próprio botão de mostrar/ocultar; aqui esconde o nativo para não duplicar.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('sem-olho-nativo')) {
  const estilo = document.createElement('style');
  estilo.id = 'sem-olho-nativo';
  estilo.textContent = 'input::-ms-reveal, input::-ms-clear { display: none; }';
  document.head.appendChild(estilo);
}

export default function Campo({ rotulo, erro, ajuda, multilinha, ...resto }) {
  const [focado, setFocado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const ehSenha = Boolean(resto.secureTextEntry);
  return (
    <View style={styles.grupo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.caixa}>
        <TextInput
          accessibilityLabel={rotulo}
          placeholderTextColor={cores.textoSuave}
          multiline={multilinha}
          aria-invalid={erro ? true : undefined}
          style={[
            styles.input,
            multilinha && styles.multilinha,
            ehSenha && styles.comBotao,
            erro && { borderColor: cores.perigo },
            focado && contornoFoco,
          ]}
          {...resto}
          secureTextEntry={ehSenha && !visivel}
          onFocus={(e) => {
            setFocado(true);
            resto.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            resto.onBlur?.(e);
          }}
        />
        {ehSenha ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visivel}
            onPress={() => setVisivel((v) => !v)}
            style={({ focused }) => [styles.olho, focused && contornoFoco]}
          >
            <Icone nome={visivel ? 'eye-off-outline' : 'eye-outline'} tamanho={22} cor={cores.textoSuave} />
          </Pressable>
        ) : null}
      </View>
      {ajuda && !erro ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
      {erro ? <Text accessibilityRole="alert" style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: 4 },
  rotulo: { fontSize: fonte.pequena, fontWeight: '600', color: cores.texto },
  input: {
    minHeight: alvoToque,
    borderWidth: 1,
    borderColor: cores.bordaCampo,
    borderRadius: raio.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.superficie,
  },
  multilinha: { minHeight: 110, textAlignVertical: 'top' },
  caixa: { justifyContent: 'center' },
  comBotao: { paddingRight: alvoToque + 4 },
  olho: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: alvoToque,
    minHeight: alvoToque,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raio.md,
  },
  ajuda: { fontSize: fonte.pequena, color: cores.textoSuave },
  erro: { fontSize: fonte.pequena, color: cores.perigo },
});
