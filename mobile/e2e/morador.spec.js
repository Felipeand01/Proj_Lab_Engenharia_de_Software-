const { test, expect, API, FOTO, SENHA, pedir, criarMorador, criarOcorrencia, entrar, aba, semOverflow, unico } = require('./ajuda');

const CANDIDATO = {
  logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP',
  cep: '01310100', latitude: -23.5614, longitude: -46.6559, rotulo: 'Av. Paulista, Bela Vista, São Paulo - SP',
};

// Endereço devolvido pela geocodificação reversa (sempre simulada: nunca chama o Nominatim real).
const REVERSO = {
  logradouro: 'Rua Augusta', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP',
  cep: '01305000', latitude: -23.55, longitude: -46.65, rotulo: 'Rua Augusta, Consolação',
};
const reversaMockada = (page, resposta, status = 200) =>
  page.route(`${API}/localizacao/reversa**`, (r) =>
    r.fulfill(status === 200 ? { json: resposta } : { status, json: { detail: 'Sem endereço' } }),
  );
const campo = (page, nome) => page.getByLabel(nome, { exact: true });

const nomeBotao = (t) => ({ name: t, exact: true });

async function minhasCriadas(token, titulo) {
  const { criadas } = await pedir('/minhas-ocorrencias', { token });
  return criadas.filter((o) => o.titulo === titulo);
}

async function preencherBasico(page, titulo) {
  await page.getByRole('button', nomeBotao('Infraestrutura')).click();
  await page.getByLabel('Título').fill(titulo);
  await page.getByLabel('Descrição').fill('Buraco grande na calçada, perigoso para pedestres.');
}

async function escolherFoto(page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', nomeBotao('Escolher foto')).click();
  await (await chooser).setFiles(FOTO);
  await expect(page.getByLabel('Pré-visualização da foto escolhida')).toBeVisible();
}

const buscaMockada = (page, candidatos) =>
  page.route(`${API}/localizacao/buscar**`, (r) => r.fulfill({ json: candidatos }));

test.describe('cadastro e sessão', () => {
  test('cadastro valida confirmação de senha, entra logado e permite sair', async ({ page }) => {
    const email = `${unico('c')}@example.com`;
    await page.goto('/cadastro');
    await page.getByLabel('Nome').fill('Nova Moradora');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByLabel('Confirmar senha').fill('OutraSenha123');
    await page.getByRole('button', nomeBotao('Criar conta')).click();
    await expect(page.getByText('As senhas não são iguais.')).toBeVisible();
    await semOverflow(page);

    await page.getByLabel('Confirmar senha').fill(SENHA);
    await page.getByRole('button', nomeBotao('Criar conta')).click();
    await aba(page, 'Conta').click();
    await expect(page.getByText('Nova Moradora')).toBeVisible();
    await expect(page.getByText('Perfil: Morador')).toBeVisible();

    await page.getByRole('button', nomeBotao('Sair')).click();
    await expect(page.getByRole('button', nomeBotao('Criar conta'))).toBeVisible();
    // Sessão encerrada: Registrar volta a pedir login.
    await aba(page, 'Registrar').click();
    await expect(page.getByText('Para registrar uma ocorrência, entre ou crie sua conta de morador.')).toBeVisible();
  });

  test('e-mail repetido e senha comum são rejeitados com mensagem clara', async ({ page }) => {
    const m = await criarMorador();
    await page.goto('/cadastro');
    await page.getByLabel('Nome').fill('Repetida');
    await page.getByLabel('E-mail').fill(m.email);
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByLabel('Confirmar senha').fill(SENHA);
    await page.getByRole('button', nomeBotao('Criar conta')).click();
    await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible();

    await page.getByLabel('E-mail').fill(`${unico('s')}@example.com`);
    await page.getByLabel('Senha', { exact: true }).fill('password123');
    await page.getByLabel('Confirmar senha').fill('password123');
    await page.getByRole('button', nomeBotao('Criar conta')).click();
    await expect(page.getByText('Essa senha é muito comum ou igual ao seu e-mail. Escolha outra.')).toBeVisible();
    await expect(page.getByText(/Confira os campos|body/)).toHaveCount(0);
  });

  test('cadastro informa as regras da senha e diz qual requisito falhou', async ({ page }) => {
    await page.goto('/cadastro');
    await expect(page.getByText(/De 8 a 128 caracteres\. Não use senhas comuns/)).toBeVisible();
    const enviar = () => page.getByRole('button', nomeBotao('Criar conta')).click();
    const preencher = async (email, senha) => {
      await page.getByLabel('Nome').fill('Teste Regras');
      await page.getByLabel('E-mail').fill(email);
      await page.getByLabel('Senha', { exact: true }).fill(senha);
      await page.getByLabel('Confirmar senha').fill(senha);
    };

    await preencher('regras@example.com', 'curta12');
    await enviar();
    await expect(page.getByText('A senha precisa ter ao menos 8 caracteres.')).toBeVisible();

    // Igual à parte antes do @ (sem diferenciar maiúsculas): barrado já no cliente.
    await preencher('maria.silva@example.com', 'Maria.Silva');
    await enviar();
    await expect(page.getByText('Essa senha é muito comum ou igual ao seu e-mail. Escolha outra.')).toBeVisible();

    await preencher('sem-arroba', 'Zq9!kLm2pw');
    await enviar();
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();

    // Lista de senhas comuns: só o servidor conhece; a mensagem aparece no campo Senha.
    await preencher(`${unico('r')}@example.com`, 'senha123');
    await enviar();
    await expect(page.getByText('Essa senha é muito comum ou igual ao seu e-mail. Escolha outra.')).toBeVisible();
    await expect(page.getByText(/Confira os campos|body|Erro:/)).toHaveCount(0);
  });

  test('botão mostrar/ocultar senha fica sempre visível, é acessível e preserva o valor', async ({ page }) => {
    const ocultar = (n) => page.getByRole('button', nomeBotao('Ocultar senha')).nth(n);
    const mostrar = page.getByRole('button', nomeBotao('Mostrar senha'));
    for (const [url, qtd] of [['/cadastro', 2], ['/entrar', 1]]) {
      await page.goto(url);
      await expect(mostrar).toHaveCount(qtd); // visível sem foco nenhum no campo
      const campos = [page.getByLabel('Senha', { exact: true })];
      if (qtd === 2) campos.push(page.getByLabel('Confirmar senha'));

      for (const [i, campo] of campos.entries()) {
        await campo.fill(SENHA);
        await expect(campo).toHaveAttribute('type', 'password');
        const botao = mostrar.nth(i); // mesmo rótulo nos dois campos: vale a posição
        const caixa = await botao.boundingBox();
        expect(caixa.width).toBeGreaterThanOrEqual(44);
        expect(caixa.height).toBeGreaterThanOrEqual(44);

        await botao.click();
        // O React Native Web remove o atributo type (texto é o padrão) em vez de escrever "text".
        await expect(campo).not.toHaveAttribute('type', 'password');
        expect(await campo.evaluate((el) => el.type)).toBe('text');
        await expect(campo).toHaveValue(SENHA);
        await expect(ocultar(0)).toBeVisible();

        // Sem foco no campo o botão continua lá (o "olho" do Edge, do navegador, some).
        await page.mouse.click(2, 2);
        await expect(ocultar(0)).toBeVisible();

        await ocultar(0).focus();
        await page.keyboard.press('Enter'); // teclado alterna
        await expect(campo).toHaveAttribute('type', 'password');
        await expect(campo).toHaveValue(SENHA);
      }
      await semOverflow(page);
    }
  });

  test('token inválido: sessão expirada não deixa a tela quebrada', async ({ page }) => {
    const m = await criarMorador();
    await entrar(page, m.email);
    // Invalida a sessão no servidor e abre uma tela protegida.
    await pedir('/auth/logout', { token: m.token, metodo: 'POST' });
    await page.route(`${API}/**`, (r) => (r.request().method() === 'OPTIONS' ? r.fallback() : r.fulfill({ status: 401, json: { detail: 'Token inválido' } })));
    await aba(page, 'Minhas').click();
    await expect(page.getByText(/Traceback/)).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Conta' })).toBeVisible();
    await semOverflow(page);
  });
});

test.describe('navegação do morador', () => {
  test('morador tem 4 abas (Explorar, Registrar, Minhas, Conta), sem Painel, e todas navegam', async ({ page }) => {
    const m = await criarMorador();
    await entrar(page, m.email);
    await expect(page.getByRole('tab')).toHaveText([/Explorar/, /Registrar/, /Minhas/, /Conta/]);
    await expect(aba(page, 'Painel')).toHaveCount(0);
    for (const nome of ['Registrar', 'Minhas', 'Conta', 'Explorar']) {
      await aba(page, nome).click();
      await expect(aba(page, nome)).toHaveAttribute('aria-selected', 'true');
    }
    await semOverflow(page);
  });
});

test.describe('registrar ocorrência', () => {
  test('validações do formulário e foto/local obrigatórios', async ({ page }) => {
    const m = await criarMorador();
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText('Escolha uma categoria.')).toBeVisible();
    await expect(page.getByText('O título precisa ter ao menos 3 caracteres.')).toBeVisible();
    await expect(page.getByText('Adicione uma foto da ocorrência.')).toBeVisible();
    await expect(page.getByText('Latitude entre -90 e 90.')).toBeVisible();

    // Confirmar fica desabilitado sem coordenadas.
    await expect(page.getByRole('button', nomeBotao('Confirmar este local'))).toBeDisabled();

    // Com coordenadas mas sem confirmar: bloqueia.
    await page.getByLabel('Latitude').fill('-23.55');
    await page.getByLabel('Longitude').fill('-46.63');
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText('Confirme o local no mapa antes de enviar.')).toBeVisible();

    // UF e CEP inválidos.
    await campo(page, 'UF').fill('S1');
    await page.getByLabel('CEP (opcional)').fill('123');
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText('Use a sigla do estado (ex.: SP).')).toBeVisible();
    await expect(page.getByText('O CEP precisa ter 8 dígitos.')).toBeVisible();
    await semOverflow(page);
  });

  test('registra por busca de CEP (mockada) com foto; detalhe e Minhas refletem', async ({ page }) => {
    const m = await criarMorador();
    const titulo = unico('Buraco CEP');
    let consultas = 0;
    await page.route(`${API}/localizacao/buscar**`, (r) => {
      consultas += 1;
      return r.fulfill({ json: [CANDIDATO] });
    });
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await preencherBasico(page, titulo);
    await page.getByLabel('CEP ou endereço').fill('01310-100');
    expect(consultas, 'a busca só ocorre ao tocar em Buscar').toBe(0);
    await page.getByRole('button', nomeBotao('Buscar')).click();
    await expect(page.getByText('Endereço encontrado. Confira o ponto no mapa e confirme o local.')).toBeVisible();
    await expect(page.getByLabel('Rua', { exact: true })).toHaveValue('Avenida Paulista');
    await expect(page.getByLabel('Latitude')).toHaveValue('-23.561400');
    expect(consultas).toBe(1);

    await escolherFoto(page);
    // Sem confirmar o local, não envia.
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText('Confirme o local no mapa antes de enviar.')).toBeVisible();
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await expect(page.getByText('Local confirmado. Se mover o ponto, confirme de novo.')).toBeVisible();
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();

    await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/Avenida Paulista/).filter({ visible: true })).toBeVisible();
    await expect(page.getByLabel(/Foto da ocorrência/)).toBeVisible();
    await expect(page.getByText('Você registrou esta ocorrência. A confirmação é feita por outros moradores.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar esta ocorrência' })).toHaveCount(0);
    await semOverflow(page);
    expect(await minhasCriadas(m.token, titulo)).toHaveLength(1);
  });

  test('busca com vários resultados exige escolha; sem resultado/erro mantém caminhos alternativos', async ({ page }) => {
    const m = await criarMorador();
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    const outro = { ...CANDIDATO, logradouro: 'Rua Augusta', rotulo: 'Rua Augusta, Consolação', latitude: -23.55, longitude: -46.65 };
    await buscaMockada(page, [CANDIDATO, outro]);
    await page.getByLabel('CEP ou endereço').fill('Paulista');
    await page.getByRole('button', nomeBotao('Buscar')).click();
    await expect(page.getByText('Encontramos mais de um endereço. Escolha o correto.')).toBeVisible();
    await page.getByRole('button', nomeBotao(outro.rotulo)).click();
    await expect(page.getByLabel('Rua', { exact: true })).toHaveValue('Rua Augusta');

    await page.unroute(`${API}/localizacao/buscar**`);
    await buscaMockada(page, []);
    await page.getByLabel('CEP ou endereço').fill('xyzxyz');
    await page.getByRole('button', nomeBotao('Buscar')).click();
    await expect(page.getByText(/Nenhum endereço encontrado/)).toBeVisible();

    await page.unroute(`${API}/localizacao/buscar**`);
    await page.route(`${API}/localizacao/buscar**`, (r) => r.fulfill({ status: 503, json: { detail: 'Serviço de busca indisponível.' } }));
    await page.getByRole('button', nomeBotao('Buscar')).click();
    await expect(page.getByText(/Você pode usar sua localização ou tocar no mapa/)).toBeVisible();
    await semOverflow(page);
  });

  test('GPS negado cai para o caminho manual e registra', async ({ page, context }) => {
    const m = await criarMorador();
    const titulo = unico('Buraco manual');
    await context.clearPermissions();
    await context.addInitScript(() => {
      // Simula o usuário negando a permissão de localização.
      const negar = (_ok, erro) => erro({ code: 1, message: 'User denied Geolocation' });
      navigator.geolocation.getCurrentPosition = negar;
      navigator.geolocation.watchPosition = negar;
      if (navigator.permissions) navigator.permissions.query = async () => ({ state: 'denied', addEventListener() {}, removeEventListener() {} });
    });
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByRole('button', nomeBotao('Usar minha localização')).click();
    await expect(page.getByText(/Sem permissão de localização|Não foi possível obter sua localização/)).toBeVisible();

    await preencherBasico(page, titulo);
    await page.getByLabel('Latitude').fill('-23,5505');
    await page.getByLabel('Longitude').fill('-46,6333');
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await escolherFoto(page);
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
    expect(await minhasCriadas(m.token, titulo)).toHaveLength(1);
  });

  test('GPS permitido preenche o ponto e o endereço', async ({ page, context }) => {
    const m = await criarMorador();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -23.5, longitude: -46.6 });
    await reversaMockada(page, REVERSO);
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByRole('button', nomeBotao('Usar minha localização')).click();
    await expect(page.getByLabel('Latitude')).toHaveValue('-23.500000');
    await expect(campo(page, 'Rua')).toHaveValue('Rua Augusta');
    await expect(campo(page, 'Cidade')).toHaveValue('São Paulo');
    await expect(page.getByRole('button', nomeBotao('Confirmar este local'))).toBeEnabled();
  });

  test('toque no minimapa define o ponto; mover o ponto desfaz a confirmação', async ({ page }) => {
    const m = await criarMorador();
    await reversaMockada(page, REVERSO);
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(page.getByLabel('Latitude')).not.toHaveValue('');
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await expect(page.getByText('Local confirmado. Se mover o ponto, confirme de novo.')).toBeVisible();
    await mapa.click({ position: { x: 120, y: 120 } });
    await expect(page.getByRole('button', nomeBotao('Confirmar este local'))).toBeVisible();
    await semOverflow(page);
  });

  test('toque no mapa preenche o endereço; número e complemento vazios; salvo = coordenadas = marcador', async ({ page }) => {
    const m = await criarMorador();
    const titulo = unico('Buraco mapa');
    await reversaMockada(page, REVERSO);
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await expect(campo(page, 'Número (opcional)')).toBeVisible(); // E3-01: número é opcional
    await expect(campo(page, 'Complemento (opcional)')).toBeVisible();
    await preencherBasico(page, titulo);
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(campo(page, 'Rua')).toHaveValue('Rua Augusta');
    await expect(campo(page, 'Bairro')).toHaveValue('Consolação');
    await expect(campo(page, 'Cidade')).toHaveValue('São Paulo');
    await expect(campo(page, 'UF')).toHaveValue('SP');
    await expect(campo(page, 'CEP (opcional)')).toHaveValue('01305000');
    await expect(mapa.locator('.maplibregl-marker')).toHaveCount(1); // um marcador, no ponto escolhido
    const lat = Number(await campo(page, 'Latitude').inputValue());
    const lon = Number(await campo(page, 'Longitude').inputValue());

    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    // Depois de confirmado, o endereço acompanha o local (travado); número e complemento seguem livres.
    await expect(campo(page, 'Rua')).not.toBeEditable();
    await expect(campo(page, 'CEP (opcional)')).not.toBeEditable();
    await expect(campo(page, 'Número (opcional)')).toBeEditable();
    await escolherFoto(page);
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/Rua Augusta/).filter({ visible: true })).toBeVisible();

    const [salva] = await minhasCriadas(m.token, titulo);
    expect(salva.logradouro).toBe('Rua Augusta');
    expect(salva.numero).toBeNull();
    expect(salva.complemento).toBeNull();
    expect(salva.latitude).toBeCloseTo(lat, 5);
    expect(salva.longitude).toBeCloseTo(lon, 5);
  });

  test('buscar um endereço e depois escolher outro ponto não deixa o endereço antigo', async ({ page }) => {
    const m = await criarMorador();
    await buscaMockada(page, [CANDIDATO]);
    await reversaMockada(page, REVERSO, 404); // o novo ponto não tem endereço
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByLabel('CEP ou endereço').fill('01310-100');
    await page.getByRole('button', nomeBotao('Buscar')).click();
    await expect(campo(page, 'Rua')).toHaveValue('Avenida Paulista');
    await campo(page, 'Número (opcional)').fill('1000');
    await campo(page, 'Complemento (opcional)').fill('Bloco B');

    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(page.getByText(/Não encontramos um endereço para este ponto/)).toBeVisible();
    for (const nome of ['Rua', 'Número (opcional)', 'Complemento (opcional)', 'Bairro', 'Cidade', 'UF', 'CEP (opcional)']) {
      await expect(campo(page, nome), nome).toHaveValue('');
    }
    await expect(campo(page, 'Latitude')).not.toHaveValue('-23.561400');
    await semOverflow(page);
  });

  test('mudar o ponto de novo refaz o endereço; resposta antiga não vence e o botão espera', async ({ page }) => {
    const m = await criarMorador();
    let chamadas = 0;
    await page.route(`${API}/localizacao/reversa**`, async (r) => {
      chamadas += 1;
      if (chamadas === 1) {
        await new Promise((ok) => setTimeout(ok, 1500)); // resposta lenta do 1º ponto
        return r.fulfill({ json: { ...REVERSO, logradouro: 'Rua Antiga' } });
      }
      return r.fulfill({ json: { ...REVERSO, logradouro: 'Rua Nova' } });
    });
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(page.getByRole('button', nomeBotao('Confirmar este local'))).toBeDisabled(); // buscando o endereço
    await mapa.click({ position: { x: 150, y: 150 } });
    await expect(campo(page, 'Rua')).toHaveValue('Rua Nova');
    await page.waitForTimeout(2000); // a resposta antiga chega depois e é descartada
    await expect(campo(page, 'Rua')).toHaveValue('Rua Nova');
    await expect(page.getByRole('button', nomeBotao('Confirmar este local'))).toBeEnabled();
  });

  test('busca lenta não sobrescreve um ponto escolhido no mapa depois', async ({ page }) => {
    const m = await criarMorador();
    await page.route(`${API}/localizacao/buscar**`, async (r) => {
      await new Promise((ok) => setTimeout(ok, 1500));
      return r.fulfill({ json: [CANDIDATO] });
    });
    await reversaMockada(page, REVERSO);
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByLabel('CEP ou endereço').fill('01310-100');
    await page.getByRole('button', nomeBotao('Buscar')).click();
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(campo(page, 'Rua')).toHaveValue('Rua Augusta');
    await page.waitForTimeout(2000);
    await expect(campo(page, 'Rua')).toHaveValue('Rua Augusta');
    await expect(campo(page, 'Latitude')).not.toHaveValue('-23.561400');
  });

  test('leitura atrasada do GPS não sobrescreve um ponto escolhido depois no mapa', async ({ page, context }) => {
    const m = await criarMorador();
    await context.grantPermissions(['geolocation']);
    await context.addInitScript(() => {
      // GPS lento: a posição só chega 1,5 s depois do toque no botão.
      navigator.geolocation.getCurrentPosition = (ok) =>
        setTimeout(
          () =>
            ok({
              coords: { latitude: -23.5, longitude: -46.6, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
              timestamp: Date.now(),
            }),
          1500,
        );
    });
    // O endereço do ponto do GPS (-23.5) seria "Rua do GPS"; o do toque no mapa é "Rua Augusta".
    await page.route(`${API}/localizacao/reversa**`, (r) => {
      const doGps = new URL(r.request().url()).searchParams.get('latitude') === '-23.5';
      return r.fulfill({ json: { ...REVERSO, logradouro: doGps ? 'Rua do GPS' : 'Rua Augusta' } });
    });
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByRole('button', nomeBotao('Usar minha localização')).click(); // o GPS vai demorar
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } }); // escolha posterior, mais recente
    await expect(campo(page, 'Rua')).toHaveValue('Rua Augusta');
    const lat = await campo(page, 'Latitude').inputValue();
    expect(lat).not.toBe('-23.500000');

    await page.waitForTimeout(2200); // a leitura do GPS chega agora e deve ser descartada
    await expect(campo(page, 'Latitude')).toHaveValue(lat);
    await expect(campo(page, 'Rua')).toHaveValue('Rua Augusta');
    await expect(page.getByRole('button', nomeBotao('Usar minha localização'))).toBeEnabled(); // GPS já terminou
    await expect(page.getByRole('button', nomeBotao('Confirmar este local'))).toBeEnabled();
  });

  test('registro informa que a localização pode ser consultada no Nominatim', async ({ page }) => {
    const m = await criarMorador();
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await expect(
      page.getByText('A localização selecionada pode ser consultada no serviço OpenStreetMap/Nominatim para buscar um endereço aproximado.'),
    ).toBeVisible();
    await semOverflow(page);
  });

  test('endereço parcial: avisa, permite completar, travar/destravar e cadastrar', async ({ page }) => {
    const m = await criarMorador();
    const titulo = unico('Buraco parcial');
    await reversaMockada(page, { logradouro: null, bairro: null, cidade: 'São Paulo', uf: 'SP', cep: null, latitude: -23.5, longitude: -46.6, rotulo: '' });
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await preencherBasico(page, titulo);
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(page.getByText(/não informou o endereço completo/)).toBeVisible();
    await expect(campo(page, 'Rua')).toHaveValue('');
    await expect(campo(page, 'Cidade')).toHaveValue('São Paulo');

    await campo(page, 'Rua').fill('Rua Digitada'); // o usuário completa o que faltou
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await expect(campo(page, 'Rua')).not.toBeEditable();
    await page.getByRole('button', nomeBotao('Alterar local')).click();
    await expect(campo(page, 'Rua')).toBeEditable();
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await escolherFoto(page);
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
    const [salva] = await minhasCriadas(m.token, titulo);
    expect(salva.logradouro).toBe('Rua Digitada');
    expect(salva.cidade).toBe('São Paulo');
    expect(salva.numero).toBeNull();
  });

  test('serviço de endereço indisponível não impede cadastrar o local', async ({ page }) => {
    const m = await criarMorador();
    const titulo = unico('Buraco sem endereço');
    await reversaMockada(page, REVERSO, 503);
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await preencherBasico(page, titulo);
    const mapa = page.getByLabel(/^Minimapa para escolher o local/);
    await mapa.scrollIntoViewIfNeeded();
    await mapa.click({ position: { x: 60, y: 60 } });
    await expect(page.getByText(/Não foi possível obter o endereço deste ponto agora/)).toBeVisible();
    await expect(campo(page, 'Rua')).toHaveValue('');
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await escolherFoto(page);
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
    const [salva] = await minhasCriadas(m.token, titulo);
    expect(salva.logradouro).toBeNull();
    expect(salva.latitude).not.toBeNull();
  });

  test('coordenadas digitadas à mão limpam o endereço anterior', async ({ page }) => {
    const m = await criarMorador();
    await buscaMockada(page, [CANDIDATO]);
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await page.getByLabel('CEP ou endereço').fill('01310-100');
    await page.getByRole('button', nomeBotao('Buscar')).click();
    await expect(campo(page, 'Rua')).toHaveValue('Avenida Paulista');
    await campo(page, 'Latitude').fill('-23.5');
    await expect(campo(page, 'Rua')).toHaveValue('');
    await expect(campo(page, 'Cidade')).toHaveValue('');
    await expect(page.getByText(/Coordenadas alteradas à mão/)).toBeVisible();
  });

  test('falha de rede no envio mantém dados e o retry não duplica a ocorrência', async ({ page }) => {
    const m = await criarMorador();
    const titulo = unico('Buraco retry');
    await entrar(page, m.email);
    await aba(page, 'Registrar').click();
    await preencherBasico(page, titulo);
    await page.getByLabel('Latitude').fill('-23.5505');
    await page.getByLabel('Longitude').fill('-46.6333');
    await page.getByRole('button', nomeBotao('Confirmar este local')).click();
    await escolherFoto(page);

    // 1º envio: o servidor grava, mas a resposta se perde (pior caso para duplicar).
    let tentativas = 0;
    await page.route(`${API}/ocorrencias`, async (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      tentativas += 1;
      if (tentativas === 1) {
        await r.fetch();
        return r.abort('failed');
      }
      return r.continue();
    });
    await page.getByRole('button', nomeBotao('Enviar ocorrência')).click();
    await expect(page.getByText(/Seus dados foram mantidos/)).toBeVisible();
    await expect(page.getByLabel('Título')).toHaveValue(titulo);
    await expect(page.getByLabel('Pré-visualização da foto escolhida')).toBeVisible();

    await page.getByRole('button', nomeBotao('Tentar novamente')).click();
    await expect(page.getByText(titulo).filter({ visible: true })).toBeVisible();
    expect(tentativas).toBe(2);
    expect(await minhasCriadas(m.token, titulo)).toHaveLength(1);
  });
});

test.describe('confirmar ocorrências', () => {
  test('confirma ocorrência de outro, vê "Você já confirmou", Minhas lista e sair', async ({ page }) => {
    const autor = await criarMorador('Autor Alheio');
    const o = await criarOcorrencia(autor.token, { titulo: unico('Calçada quebrada') });
    const m = await criarMorador('Confirmador');
    await entrar(page, m.email);
    await page.goto(`/ocorrencia/${o.id}`);
    await expect(page.getByText('0 confirmações')).toBeVisible();
    await page.getByRole('button', nomeBotao('Confirmar esta ocorrência')).click();
    await expect(page.getByText('Obrigado! Sua confirmação foi registrada.')).toBeVisible();
    await expect(page.getByText('1 confirmação', { exact: true })).toBeVisible();
    const ja = page.getByRole('button', nomeBotao('Você já confirmou'));
    await expect(ja).toBeVisible();
    await expect(ja).toBeDisabled();
    await expect(page.getByRole('button', nomeBotao('Confirmar esta ocorrência'))).toHaveCount(0);
    await semOverflow(page);

    // Repetir pela API devolve 409 (a UI não permite, o backend também não).
    await expect(pedir(`/ocorrencias/${o.id}/confirmar`, { token: m.token, metodo: 'POST' })).rejects.toThrow(/409/);

    // Link direto (sem histórico) oferece o caminho de volta ao início.
    await page.getByRole('button', { name: 'Ir para o início' }).click();
    await aba(page, 'Minhas').click();
    await page.getByRole('button', { name: /^Confirmadas \(1\)/ }).click();
    await expect(page.getByRole('link', { name: new RegExp(`^${o.titulo},`) })).toBeVisible();
    await page.getByRole('button', { name: /^Criadas \(0\)/ }).click();
    await expect(page.getByText('Você ainda não registrou ocorrências')).toBeVisible();

    await aba(page, 'Conta').click();
    await page.getByRole('button', nomeBotao('Sair')).click();
    await expect(page.getByRole('button', nomeBotao('Criar conta'))).toBeVisible();
    // Após sair, o detalhe oferece só "Entre para confirmar".
    await page.goto(`/ocorrencia/${o.id}`);
    await expect(page.getByRole('button', nomeBotao('Entre para confirmar'))).toBeVisible();
  });
});
