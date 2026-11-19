// E2E do Expo Web. Pré-requisitos (ver README): backend local em :8000 (banco local isolado,
// RATE_LIMIT=0, CORS_ORIGINS com http://localhost:8081, administrador via seed com
// ADMIN_EMAIL/ADMIN_SENHA no ambiente) e `npx expo start --web --port 8081`.
// Sem o Expo rodando, o webServer abaixo o inicia.
const { defineConfig } = require('@playwright/test');

// E2E_URL e E2E_API (ver e2e/ajuda.js) apontam para um Expo e um backend isolados, em outras portas.
const URL_APP = process.env.E2E_URL || 'http://localhost:8081';

const tela = (width, height) => ({
  viewport: { width, height },
  // WebGL por software: o MapLibre precisa dele no Chromium headless.
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
});

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: URL_APP, locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-360x800', use: tela(360, 800) },
    { name: 'mobile-390x844', use: tela(390, 844) },
    { name: 'mobile-430x932', use: tela(430, 932) },
    { name: 'desktop-1280x800', use: tela(1280, 800) },
  ],
  webServer: {
    command: `npx expo start --web --port ${new URL(URL_APP).port}`,
    url: URL_APP,
    reuseExistingServer: true,
    timeout: 180000,
  },
});
