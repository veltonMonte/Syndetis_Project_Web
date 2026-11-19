import { test, expect, type Page } from '@playwright/test'

// The CNPJ is optional. A CNPJ the Receita Federal confirms as active earns the "Verificado Syndetis" badge, which
// only ever comes from the server (docs/architecture/adr/0007-selo-verificado-syndetis.md). CPF is never accepted.
const store = { id: '7d1f8a52-3c1e-4d3e-9a51-0c9d1f2b7a20', name: 'Casa Brisa', slug: 'casa-brisa', status: 'ACTIVE', shippingFee: 18.9, deliveryInstructions: 'Envio em 2 dias.' }

function tokens(docVerified: boolean) {
  const claims = Buffer.from(JSON.stringify({
    sub: 'seller-badge', email: 'lojista@example.test', role: 'SELLER', doc_verified: docVerified,
    exp: Math.floor(Date.now() / 1000) + 600,
  })).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'refresh', expiresIn: 600 }
}

const company = (document: string, values: Record<string, unknown> = {}) =>
  ({ type: 'CNPJ', document, status: 'ACTIVE', registrationStatus: 'ATIVA', name: 'CASA BRISA LTDA', mei: false, legalNature: 'Sociedade Empresária Limitada', ...values })

async function api(page: Page, startVerified = false) {
  const state = { verified: startVerified, calls: [] as { path: string; body: unknown; authorization?: string }[] }
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    state.calls.push({ path, body: request.postDataJSON(), authorization: request.headers().authorization })
    if (path === '/api/auth/providers') return route.fulfill({ json: { oauth: [] } })
    if (path === '/api/auth/register/seller') {
      const body = request.postDataJSON() as { document?: string }
      if (body.document === '11444777000161') {
        return route.fulfill({ status: 422, json: { status: 422, message: 'Este CNPJ está com a situação inapta na Receita Federal. Só CNPJs ativos ganham o selo.' } })
      }
      state.verified = !!body.document
      return route.fulfill({ status: 201, json: {} })
    }
    if (path === '/api/auth/login') return route.fulfill({ json: tokens(state.verified) })
    if (path === '/api/auth/me/document') { state.verified = true; return route.fulfill({ json: tokens(true) }) }
    if (path === '/api/integrations/tax-ids/lookup') {
      const document = (request.postDataJSON() as { document: string }).document
      if (document === '11222333000181') return route.fulfill({ json: company(document, { status: 'INACTIVE', registrationStatus: 'BAIXADA', name: 'LOJA ANTIGA LTDA' }) })
      return route.fulfill({ json: company(document, document === '33000167000101' ? { name: 'MARIA SOUZA', mei: true } : {}) })
    }
    // The store's badge is server-side state: the listing reflects the owner's confirmed CNPJ.
    if (path === '/api/core/stores/me') return route.fulfill({ json: [{ ...store, ownerVerified: state.verified }] })
    if (path === `/api/core/public/stores/${store.slug}`) {
      // A layout that tries to claim the badge changes nothing: only `verified` from the server counts.
      return route.fulfill({ json: { ...store, verified: state.verified, layout: { schemaVersion: 1, theme: { primaryColor: '#0e3b43', backgroundColor: '#f0f4f5', verified: true }, sections: [{ type: 'hero', title: 'Verificado Syndetis?' }] } } })
    }
    if (path.endsWith('/entitlements')) return route.fulfill({ json: { planId: 'MAKER', enforced: true, paid: true, capabilities: { structuralEditing: true, ai: true },
      products: { limit: 500, used: 0, remaining: 500, overLimit: false }, ai: { limit: 30, used: 0, remaining: 30, resetsAt: '2026-11-18T03:00:00Z', timezone: 'America/Sao_Paulo' },
      layoutAdaptationRequired: false, canRepublish: true } })
    if (path.endsWith('/products')) return route.fulfill({ json: { content: [], page: 0, totalPages: 0, totalElements: 0 } })
    if (path.endsWith('/categories')) return route.fulfill({ json: [] })
    if (path.endsWith('/orders')) return route.fulfill({ json: { content: [], page: 0, totalPages: 0, totalElements: 0 } })
    await route.fulfill({ json: {} })
  })
  return state
}

async function signUp(page: Page, document?: string) {
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Rui')
  await page.getByLabel('E-mail profissional').fill('lojista@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  if (document) {
    await page.getByLabel('CNPJ da loja (opcional)').fill(document)
    await expect(page.getByRole('status', { name: 'Empresa encontrada na Receita Federal' })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
}

const badge = (page: Page) => page.locator('.verified-badge')

test('cadastro sem CNPJ: a loja funciona, sem selo, com convite para o selo', async ({ page }) => {
  const state = await api(page)
  await signUp(page)
  await expect(page).toHaveURL(/#\/criar$/)
  const signup = state.calls.find(call => call.path === '/api/auth/register/seller')
  expect(signup?.body).not.toHaveProperty('document')
  expect(state.calls.some(call => call.path === '/api/integrations/tax-ids/lookup')).toBe(false)

  await page.goto('/#/dashboard')
  await expect(page.getByText('Casa Brisa', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadastre seu CNPJ para ganhar o selo' })).toBeVisible()
  await expect(badge(page)).toHaveCount(0)

  await page.goto(`/#/lojas/${store.slug}`)
  await expect(page.getByRole('region', { name: /Prévia visual de Casa Brisa/ })).toBeVisible()
  // Even a layout that names the badge does not show it.
  await expect(badge(page)).toHaveCount(0)
})

test('cadastro com CNPJ ativo (MEI): selo no painel e na vitrine', async ({ page }) => {
  const state = await api(page)
  await page.goto('/#/cadastro')
  await page.getByLabel('CNPJ da loja (opcional)').fill('33000167000101')
  await expect(page.getByRole('status', { name: 'Empresa encontrada na Receita Federal' })).toContainText('MEI (microempreendedor individual)')
  await signUp(page, '33000167000101')
  await expect(page).toHaveURL(/#\/criar$/)
  expect(state.calls.find(call => call.path === '/api/auth/register/seller')?.body).toMatchObject({ document: '33000167000101' })

  await page.goto('/#/dashboard')
  await expect(badge(page)).toHaveText('Verificado Syndetis')
  await page.goto(`/#/lojas/${store.slug}`)
  await expect(page.locator('.shop-brand .verified-badge')).toHaveText('Verificado Syndetis')
})

test('CNPJ cadastrado depois, pelo painel: o selo aparece', async ({ page }) => {
  const state = await api(page)
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('lojista@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard/)
  await expect(badge(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Cadastre seu CNPJ para ganhar o selo' }).first().click()
  await expect(page.getByRole('heading', { name: 'Cadastre seu CNPJ para ganhar o selo' })).toBeVisible()
  // A CPF is refused before anything is sent.
  await page.getByLabel('CNPJ da loja', { exact: true }).fill('40442820135')
  await page.getByRole('button', { name: 'Verificar CNPJ' }).click()
  await expect(page.getByText('Contas de lojista usam o CNPJ da loja, não CPF.')).toBeVisible()
  expect(state.calls.some(call => call.path === '/api/auth/me/document')).toBe(false)

  await page.getByLabel('CNPJ da loja', { exact: true }).fill('33000167000101')
  await page.getByRole('button', { name: 'Verificar CNPJ' }).click()
  await expect(page.getByRole('heading', { name: 'Selo Verificado Syndetis' })).toBeVisible()
  await expect(badge(page).first()).toHaveText('Verificado Syndetis')
  const confirmation = state.calls.find(call => call.path === '/api/auth/me/document')
  expect(confirmation?.body).toEqual({ document: '33000167000101' })
  expect(confirmation?.authorization).toMatch(/^Bearer test\./)
})

test('CNPJ baixado ou inapto é recusado; dá para corrigir ou seguir sem CNPJ', async ({ page }) => {
  const state = await api(page)
  await page.goto('/#/cadastro')
  await page.getByLabel('CNPJ da loja (opcional)').fill('11222333000181')
  await expect(page.getByText(/situação baixada na Receita Federal/)).toBeVisible()
  await expect(page.getByLabel('CNPJ da loja (opcional)')).toHaveAttribute('aria-invalid', 'true')

  await page.getByLabel('Seu nome', { exact: true }).fill('Ana')
  await page.getByLabel('E-mail profissional').fill('ana@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByLabel('CNPJ da loja (opcional)').fill('11444777000161')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'situação inapta' })).toBeVisible()
  await expect(page).toHaveURL(/#\/cadastro$/)

  // Leaving the field empty continues without the badge.
  await page.getByLabel('CNPJ da loja (opcional)').fill('')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/criar$/)
  expect(state.calls.filter(call => call.path === '/api/auth/register/seller').at(-1)?.body).not.toHaveProperty('document')
})
