// Busca de endereço no nosso backend (que consulta ViaCEP/Nominatim). Só é chamada pelo botão "Buscar".
export const apenasDigitos = (texto) => String(texto).replace(/\D/g, '');

// Retorna a lista (0 a 5) de candidatos { logradouro, bairro, cidade, uf, cep, latitude, longitude, rotulo }.
export async function buscarLocalizacao(api, consulta) {
  const texto = consulta.trim();
  const ehCep = /^[\d\s.-]+$/.test(texto);
  const parametro = ehCep ? `cep=${apenasDigitos(texto)}` : `endereco=${encodeURIComponent(texto)}`;
  const resposta = await api(`/localizacao/buscar?${parametro}`);
  return Array.isArray(resposta) ? resposta : (resposta?.candidatos ?? []);
}

// Endereço aproximado de um ponto (mapa, GPS ou coordenadas digitadas). Devolve
// { logradouro, bairro, cidade, uf, cep } só com o que o serviço informou (o resto vem nulo).
// Erro 404 = sem endereço para o ponto; qualquer outro erro = serviço indisponível.
export function buscarEnderecoDoPonto(api, latitude, longitude) {
  return api(`/localizacao/reversa?latitude=${latitude}&longitude=${longitude}`);
}
