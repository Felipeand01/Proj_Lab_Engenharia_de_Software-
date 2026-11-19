const { test, expect, pedir, criarMorador, tokenAdmin, criarOcorrencia, entrar, aba, semOverflow, unico } = require('./ajuda');

const nome = (t) => ({ name: t, exact: true });
const arquivarViaApi = async (id, motivo = 'Duplicada de outra ocorrência') =>
  pedir(`/admin/ocorrencias/${id}/arquivar`, { token: await tokenAdmin(), metodo: 'POST', json: { motivo } });

test.describe('autor e ocorrência arquivada', () => {
  test('arquivada só é visível ao autor (e ao admin); outros veem não encontrada', async ({ page, browser }) => {
    const autor = await criarMorador('Autora Arquivada');
    const titulo = unico('Entulho arquivado');
    const o = await criarOcorrencia(autor.token, { titulo });
    await arquivarViaApi(o.id);

    await entrar(page, autor.email);
    // Minhas > Criadas mostra a arquivada com o motivo.
    await aba(page, 'Minhas').click();
    const cartao = page.getByRole('link', { name: new RegExp(`^${titulo},`) });
    await expect(cartao).toBeVisible();
    await expect(page.getByText('Motivo do arquivamento: Duplicada de outra ocorrência')).toBeVisible();
    await cartao.click();
    await expect(page.getByText('Arquivada. Motivo: Duplicada de outra ocorrência')).toBeVisible();
    // Autor não confirma a própria; não há ações de admin.
    await expect(page.getByText('Você registrou esta ocorrência. A confirmação é feita por outros moradores.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar esta ocorrência' })).toHaveCount(0);
    await expect(page.getByText('Ações do administrador')).toHaveCount(0);
    await semOverflow(page);

    // Outro morador e visitante: 404 amigável e fora da lista pública.
    const outro = await criarMorador('Outro Morador');
    for (const email of [outro.email, null]) {
      const ctx = await browser.newContext({ baseURL: process.env.E2E_URL || 'http://localhost:8081' });
      const p = await ctx.newPage();
      if (email) await entrar(p, email);
      await p.goto(`/ocorrencia/${o.id}`);
      await expect(p.getByText('Ocorrência não encontrada')).toBeVisible();
      await p.goto('/?vista=lista');
      await expect(p.getByRole('button', { name: /Todos/ }).first()).toBeVisible();
      await expect(p.getByText(titulo)).toHaveCount(0);
      await ctx.close();
    }
  });

  test('morador acessando /admin diretamente recebe acesso negado', async ({ page }) => {
    const m = await criarMorador();
    await entrar(page, m.email);
    await expect(aba(page, 'Painel')).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByText('Acesso negado')).toBeVisible();
    await expect(page.getByText('Painel do administrador')).toHaveCount(0);
    await expect(pedir('/admin/indicadores', { token: m.token })).rejects.toThrow(/403/);
  });
});

test.describe('administrador', () => {
  async function entrarAdmin(page) {
    await entrar(page, process.env.ADMIN_EMAIL, process.env.ADMIN_SENHA);
  }

  test('administrador tem 3 abas (Explorar, Painel, Conta), todas navegam, e /minhas direto não quebra', async ({ page }) => {
    await entrarAdmin(page);
    await expect(page.getByRole('tab')).toHaveText([/Explorar/, /Painel/, /Conta/]);
    await expect(aba(page, 'Minhas')).toHaveCount(0);
    await expect(aba(page, 'Registrar')).toHaveCount(0);
    for (const nome of ['Painel', 'Conta', 'Explorar']) {
      await aba(page, nome).click();
      await expect(aba(page, nome)).toHaveAttribute('aria-selected', 'true');
    }
    // A página Minhas continua existindo: abrir o endereço direto não quebra nem cria aba.
    await page.goto('/minhas');
    await expect(page.getByText(/Traceback/)).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveText([/Explorar/, /Painel/, /Conta/]);
    await semOverflow(page);
  });

  test('painel, sem Registrar, filtro Arquivado disponível e sem Confirmar', async ({ page }) => {
    const autor = await criarMorador('Autor do Admin');
    const o = await criarOcorrencia(autor.token, { titulo: unico('Painel') });
    await entrarAdmin(page);
    await expect(aba(page, 'Registrar')).toHaveCount(0);
    await aba(page, 'Painel').click();
    await expect(page.getByText('Painel do administrador')).toBeVisible();
    await expect(page.getByText(/ocorrências registradas/)).toBeVisible();
    await expect(page.getByText(/demonstrativos e não têm vínculo com a prefeitura/)).toBeVisible();
    await semOverflow(page);

    // Toque em um status abre a lista filtrada.
    await page.getByRole('button', { name: /ocorrências em Reportado$/ }).click();
    await expect(page).toHaveURL(/status=Reportado/);
    await expect(page.getByRole('link', { name: new RegExp(`^${o.titulo},`) })).toBeVisible();
    await expect(page.getByRole('button', { name: /Arquivado/ })).toBeVisible();

    await page.goto('/nova');
    await expect(page.getByText('Administradores não registram ocorrências')).toBeVisible();

    await page.goto(`/ocorrencia/${o.id}`);
    await expect(page.getByRole('button', { name: 'Confirmar esta ocorrência' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Entre para confirmar' })).toHaveCount(0);
    await expect(page.getByText('Ações do administrador')).toBeVisible();
  });

  test('avança status com confirmação (cancelar não altera) e arquiva com motivo', async ({ page }) => {
    const autor = await criarMorador('Autor Fluxo Admin');
    const titulo = unico('Fluxo admin');
    const o = await criarOcorrencia(autor.token, { titulo });
    await entrarAdmin(page);
    await page.goto(`/ocorrencia/${o.id}`);

    // Cancelar o diálogo: nada muda.
    page.once('dialog', (d) => d.dismiss());
    await page.getByRole('button', nome('Mover para "Em análise"')).click();
    await expect(page.getByText('Status atualizado')).toHaveCount(0);
    expect((await pedir(`/ocorrencias/${o.id}`)).status).toBe('Reportado');

    // Aceitar: avança e registra no histórico.
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', nome('Mover para "Em análise"')).click();
    await expect(page.getByText('Status atualizado para Em análise.')).toBeVisible();
    await expect(page.getByText('Reportado → Em análise')).toBeVisible();
    await expect(page.getByRole('button', nome('Mover para "Encaminhado"'))).toBeVisible();

    // Arquivar exige motivo (>= 3 caracteres).
    const arquivar = page.getByRole('button', nome('Arquivar ocorrência'));
    await expect(arquivar).toBeDisabled();
    await page.getByLabel('Motivo do arquivamento').fill('ab');
    await expect(arquivar).toBeDisabled();
    await page.getByLabel('Motivo do arquivamento').fill('Fora do escopo do aplicativo');
    await expect(arquivar).toBeEnabled();
    page.once('dialog', (d) => d.accept());
    await arquivar.click();
    await expect(page.getByText('Ocorrência arquivada.')).toBeVisible();
    await expect(page.getByText('Arquivada. Motivo: Fora do escopo do aplicativo')).toBeVisible();
    await expect(page.getByText('Esta ocorrência está em estado final.')).toBeVisible();
    await expect(page.getByRole('button', nome('Arquivar ocorrência'))).toHaveCount(0);
    await semOverflow(page);
    const final = await pedir(`/ocorrencias/${o.id}`, { token: await tokenAdmin() });
    expect(final.status).toBe('Arquivado');
    expect(final.historico.map((h) => h.status_novo)).toEqual(['Reportado', 'Em análise', 'Arquivado']);
  });

  test('erro do servidor na ação de status mostra mensagem sem derrubar a tela', async ({ page }) => {
    const autor = await criarMorador();
    const o = await criarOcorrencia(autor.token, { titulo: unico('Falha admin') });
    await entrarAdmin(page);
    await page.goto(`/ocorrencia/${o.id}`);
    await page.route('**/admin/ocorrencias/*/status', (r) =>
      r.request().method() === 'OPTIONS' ? r.fallback() : r.fulfill({ status: 500, json: { detail: 'erro interno' } }),
    );
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', nome('Mover para "Em análise"')).click();
    await expect(page.getByText(/não foi possível|tente novamente|erro/i).first()).toBeVisible();
    await expect(page.getByText('Ações do administrador')).toBeVisible();
  });
});
