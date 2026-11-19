// Utilitários dos testes E2E: API local para montar dados, espera de tela e verificações globais.
const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// E2E_API/E2E_URL permitem rodar contra um backend e um Expo isolados (portas diferentes).
const API = process.env.E2E_API || 'http://localhost:8000';
const FOTO = path.join(__dirname, 'foto.png');
const SENHA = 'Zq9!kLm2pw';
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const unico = (prefixo) => `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function pedir(caminho, { token, metodo = 'GET', json, form } = {}) {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : form,
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${caminho} -> ${r.status} ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

async function criarMorador(nome = 'Morador E2E') {
  const email = `${unico('m')}@example.com`;
  await pedir('/auth/cadastro', { metodo: 'POST', json: { nome, email, senha: SENHA } });
  const { access_token } = await pedir('/auth/login', { metodo: 'POST', json: { email, senha: SENHA } });
  return { nome, email, senha: SENHA, token: access_token };
}

async function tokenAdmin() {
  const { ADMIN_EMAIL, ADMIN_SENHA } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_SENHA) throw new Error('Defina ADMIN_EMAIL e ADMIN_SENHA (administrador do seed local).');
  const { access_token } = await pedir('/auth/login', { metodo: 'POST', json: { email: ADMIN_EMAIL, senha: ADMIN_SENHA } });
  return access_token;
}

async function criarOcorrencia(token, { titulo = unico('Buraco'), categoria_id = 3, latitude = -23.5505, longitude = -46.6333 } = {}) {
  const form = new FormData();
  Object.entries({
    categoria_id, titulo, descricao: 'Descrição de teste automatizado', latitude, longitude,
    bairro: 'Sé', cidade: 'São Paulo', uf: 'SP', chave_envio: crypto.randomUUID(),
  }).forEach(([k, v]) => form.append(k, String(v)));
  form.append('arquivo', new Blob([fs.readFileSync(FOTO)], { type: 'image/png' }), 'foto.png');
  return pedir('/ocorrencias', { token, metodo: 'POST', form });
}

async function entrar(page, email, senha = SENHA) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0);
}

const aba = (page, nome) => page.getByRole('tab', { name: nome });

async function semOverflow(page) {
  const { sw, iw } = await page.evaluate(() => ({
    sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    iw: window.innerWidth,
  }));
  expect(sw, `scrollWidth ${sw} > innerWidth ${iw}`).toBeLessThanOrEqual(iw);
}

// `page` com tiles do OSM mockados (nada sai para a internet) e coleta de erros de console.
// "Failed to load resource" é ignorado: respostas 4xx esperadas (login inválido, 409) geram esse log.
const test = base.extend({
  page: async ({ page }, use) => {
    const erros = [];
    await page.route('https://tile.openstreetmap.org/**', (r) =>
      r.fulfill({ contentType: 'image/png', body: PNG_1X1 }),
    );
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) erros.push(m.text());
    });
    await use(page);
    expect(erros, 'erros de console').toEqual([]);
  },
});

module.exports = { test, expect, API, FOTO, SENHA, pedir, criarMorador, tokenAdmin, criarOcorrencia, entrar, aba, semOverflow, unico };
