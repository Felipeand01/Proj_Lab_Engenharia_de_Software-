const { test, expect, criarMorador, criarOcorrencia, aba, semOverflow, unico } = require('./ajuda');

test.describe('visitante', () => {
  let a, b; // a: Iluminação em Reportado; b: Limpeza
  test.beforeAll(async () => {
    const m = await criarMorador('Autora Visitante');
    a = await criarOcorrencia(m.token, { titulo: unico('Poste apagado'), categoria_id: 1 });
    b = await criarOcorrencia(m.token, { titulo: unico('Lixo acumulado'), categoria_id: 2 });
  });

  test('Explorar abre no mapa, alterna para lista e mantém filtros', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/no mapa/)).toBeVisible();
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible();
    await semOverflow(page);

    // No mapa os filtros começam recolhidos atrás do botão "Filtros".
    await expect(page.getByRole('button', { name: 'Filtros (0 ativos)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iluminação', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /^Filtros/ }).click();

    // Filtro por categoria no mapa: marcador de A visível, de B não.
    await page.getByRole('button', { name: 'Iluminação', exact: true }).click();
    await expect(page).toHaveURL(/categoria=1/);
    await expect(page.getByLabel(new RegExp(`^${a.titulo},`)).first()).toBeAttached();
    await expect(page.getByLabel(new RegExp(`^${b.titulo},`))).toHaveCount(0);

    // Lista mantém o filtro (URL) e mostra os cartões.
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page).toHaveURL(/vista=lista/);
    await expect(page).toHaveURL(/categoria=1/);
    await expect(page.getByRole('link', { name: new RegExp(`^${a.titulo},`) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`^${b.titulo},`) })).toHaveCount(0);
    await semOverflow(page);

    // Voltar ao mapa mantém o filtro.
    await page.getByRole('button', { name: 'Mapa', exact: true }).click();
    await expect(page).toHaveURL(/categoria=1/);
    await expect(page.getByRole('button', { name: /Iluminação$/ })).toBeVisible();
  });

  test('filtro de status sem resultado mostra vazio e Limpar filtros restaura', async ({ page }) => {
    // Área sem ocorrências garante o estado vazio.
    await page.goto('/?vista=lista&area=-10,-10,-9,-9');
    await expect(page.getByText('Nenhuma ocorrência com esses filtros')).toBeVisible();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.getByRole('link', { name: new RegExp(`^${a.titulo},`) })).toBeVisible();
  });

  test('visitante não vê Arquivado entre os status', async ({ page }) => {
    await page.goto('/?vista=lista');
    await expect(page.getByRole('button', { name: 'Em análise', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Arquivado', exact: true })).toHaveCount(0);
  });

  test('detalhe: abre pela lista, sem Confirmar, e "Ver no mapa" volta ao mapa focado', async ({ page }) => {
    await page.goto('/?vista=lista');
    await page.getByRole('link', { name: new RegExp(`^${a.titulo},`) }).click();
    await expect(page.getByText(a.titulo).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Registrada como Reportado')).toBeVisible();
    await expect(page.getByLabel(/Foto da ocorrência/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entre para confirmar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar esta ocorrência' })).toHaveCount(0);
    // E4-01: sem link externo; permanecem "Ver no mapa", o minimapa integrado e a atribuição do OSM.
    await expect(page.getByText('Abrir no OpenStreetMap')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver no mapa' })).toBeVisible();
    await expect(page.locator('.maplibregl-canvas').filter({ visible: true })).toBeVisible();
    expect(await page.locator('.maplibregl-ctrl-attrib').count()).toBeGreaterThan(0);
    await semOverflow(page);

    await page.getByRole('button', { name: 'Ver no mapa' }).click();
    await expect(page).toHaveURL(new RegExp(`vista=mapa.*foco=${a.id}`));
    await expect(page.locator('.maplibregl-canvas').filter({ visible: true })).toBeVisible();
    // O marcador em foco é destacado (48px; os demais têm 40px).
    await expect(page.getByLabel(new RegExp(`^${a.titulo},`)).filter({ visible: true })).toHaveCSS('width', '48px');
    await semOverflow(page);
  });

  test('detalhe de ocorrência inexistente mostra erro amigável', async ({ page }) => {
    await page.goto('/ocorrencia/99999999');
    await expect(page.getByText('Ocorrência não encontrada')).toBeVisible();
    await page.getByRole('button', { name: 'Ver ocorrências' }).click();
    await expect(page.getByRole('button', { name: 'Lista', exact: true })).toBeVisible();
  });

  test('Registrar e Minhas pedem login; Painel não aparece', async ({ page }) => {
    await page.goto('/');
    await aba(page, 'Registrar').click();
    await expect(page.getByText('Entre para continuar').filter({ visible: true })).toBeVisible();
    await expect(page.getByLabel('Título')).toHaveCount(0);
    await aba(page, 'Minhas').click();
    await expect(page.getByText('Entre para ver as ocorrências que você criou e confirmou.')).toBeVisible();
    await expect(aba(page, 'Painel')).toHaveCount(0);
    await page.getByRole('button', { name: 'Entrar', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/entrar/);
    await semOverflow(page);
  });

  test('login inválido mostra erro sem detalhes internos', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('ninguem@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('SenhaErrada123');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText(/inválidos|incorret/i)).toBeVisible();
    await expect(page.getByText(/Traceback|sqlalchemy/i)).toHaveCount(0);
  });

  test('teclado: Tab alcança "Limpar filtros" com foco visível', async ({ page }) => {
    await page.goto('/?vista=lista&categoria=1');
    const limpar = page.getByRole('button', { name: 'Limpar filtros' });
    await expect(limpar).toBeVisible();
    let focou = false;
    for (let i = 0; i < 40 && !focou; i++) {
      await page.keyboard.press('Tab');
      focou = await limpar.evaluate((el) => el === document.activeElement);
    }
    expect(focou).toBe(true);
    await expect(limpar).toHaveCSS('outline-style', 'solid');
    await expect(limpar).toHaveCSS('outline-width', '3px');
  });

  test('mapa: marcador mostra glifo do status e a legenda lista os status', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Legenda dos marcadores por status')).toBeVisible();
    await expect(page.getByLabel('Status: Reportado')).toBeVisible();
    const marcador = page.getByLabel(new RegExp(`^${a.titulo},`)).first();
    await expect(marcador).toBeAttached();
    await expect(marcador).toHaveText('1'); // Reportado é a etapa 1
    await expect(marcador).toHaveCSS('width', '40px');
    await semOverflow(page);
  });
});
