import { test, expect, type Page } from '@playwright/test'

// A merchant account exists only for a CNPJ the Receita Federal confirms as active. CPF is refused, as a fraud
// barrier (docs/architecture/adr/0006-lojista-somente-cnpj.md).
const userId = 'b6f0c7a2-4d1e-4c55-9a2e-1f0c8f9b2a33'

function tokens(docVerified: boolean) {
  const claims = Buffer.from(JSON.stringify({
    sub: userId, email: 'oauth@example.test', role: 'SELLER', doc_verified: docVerified,
    exp: Math.floor(Date.now() / 1000) + 600,
  })).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'refresh', expiresIn: 600 }
}

const company = (document: string, values: Record<string, unknown> = {}) =>
  ({ type: 'CNPJ', document, status: 'ACTIVE', registrationStatus: 'ATIVA', name: 'CASA BRISA LTDA', mei: false, legalNature: 'Sociedade Empresária Limitada', ...values })

async function api(page: Page) {
  const calls: { path: string; body: unknown; authorization?: string }[] = []
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    calls.push({ path, body: request.postDataJSON(), authorization: request.headers().authorization })
    if (path === '/api/auth/register/seller') {
      const body = request.postDataJSON() as { document?: string }
      // The Receita Federal says this one is closed down; the others are active.
      if (body.document === '11444777000161') {
        await route.fulfill({ status: 422, json: { status: 422, message: 'Este CNPJ está com a situação inapta na Receita Federal. Só CNPJs ativos podem abrir uma loja.' } })
        return
      }
      await route.fulfill({ status: 201, json: {} })
      return
    }
    if (path === '/api/auth/login') return route.fulfill({ json: tokens(true) })
    if (path === '/api/auth/oauth2/exchange') return route.fulfill({ json: tokens(false) })
    if (path === '/api/auth/me/document') return route.fulfill({ json: tokens(true) })
    if (path === '/api/integrations/tax-ids/lookup') {
      const document = (request.postDataJSON() as { document: string }).document
      if (document === '11222333000181') return route.fulfill({ json: company(document, { status: 'INACTIVE', registrationStatus: 'BAIXADA', name: 'LOJA ANTIGA LTDA' }) })
      return route.fulfill({ json: company(document, document === '33000167000101' ? { name: 'MARIA SOUZA', mei: true } : {}) })
    }
    if (path === '/api/core/stores/me') return route.fulfill({ json: [] })
    if (path.endsWith('/entitlements')) return route.fulfill({ json: { plan: 'MAKER', activeProductLimit: 100, structuralEditing: true } })
    await route.fulfill({ json: {} })
  })
  return calls
}

test('cadastro de lojista aceita só CNPJ: recusa CPF sem enviar e mostra a empresa encontrada', async ({ page }) => {
  const calls = await api(page)
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Rui')
  await page.getByLabel('E-mail profissional').fill('rui@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')

  // A CPF never leaves the browser and is never looked up.
  await page.getByLabel('CNPJ da loja').fill('40442820135')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByLabel('CNPJ da loja')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Contas de lojista usam o CNPJ da loja, não CPF.')).toBeVisible()
  await expect(page.getByLabel('Data de nascimento do titular do CPF')).toHaveCount(0)

  await page.getByLabel('CNPJ da loja').fill('33000167000102')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByText('Este CNPJ não é válido: confira os números.')).toBeVisible()
  expect(calls.filter(call => call.path === '/api/auth/register/seller' || call.path === '/api/integrations/tax-ids/lookup')).toHaveLength(0)

  // A MEI is a CNPJ too.
  await page.getByLabel('CNPJ da loja').fill('33000167000101')
  await expect(page.getByLabel('CNPJ da loja')).toHaveValue('33.000.167/0001-01')
  const found = page.getByRole('status', { name: 'Empresa encontrada na Receita Federal' })
  await expect(found).toContainText('MARIA SOUZA')
  await expect(found).toContainText('MEI (microempreendedor individual)')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/criar$/)
  const signup = calls.filter(call => call.path === '/api/auth/register/seller').at(-1)
  expect(signup?.body).toMatchObject({ document: '33000167000101' })
  expect(signup?.body).not.toHaveProperty('birthDate')
})

test('CNPJ baixado aparece como recusado antes de enviar, e a recusa do servidor é mostrada', async ({ page }) => {
  await api(page)
  await page.goto('/#/cadastro')
  await page.getByLabel('CNPJ da loja').fill('11222333000181')
  await expect(page.getByText(/situação baixada na Receita Federal/)).toBeVisible()
  await expect(page.getByLabel('CNPJ da loja')).toHaveAttribute('aria-invalid', 'true')

  await page.getByLabel('Seu nome', { exact: true }).fill('Ana')
  await page.getByLabel('E-mail profissional').fill('ana@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByLabel('CNPJ da loja').fill('11444777000161')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'situação inapta' })).toBeVisible()
  await expect(page).toHaveURL(/#\/cadastro$/)
})

test('lojista do Google ou GitHub confirma o CNPJ antes de abrir o Maker', async ({ page }) => {
  const calls = await api(page)
  await page.goto('/auth/callback?code=oauth-code')
  const heading = page.getByRole('heading', { name: 'Confirme o CNPJ da sua loja' })
  await expect(heading).toBeVisible()
  await page.goto('/#/dashboard')
  await expect(heading).toBeVisible()

  await page.getByLabel('CNPJ da loja').fill('40442820135')
  await page.getByRole('button', { name: 'Confirmar documento' }).click()
  await expect(page.getByText('Contas de lojista usam o CNPJ da loja, não CPF.')).toBeVisible()
  expect(calls.some(call => call.path === '/api/auth/me/document')).toBe(false)

  await page.getByLabel('CNPJ da loja').fill('33000167000101')
  await page.getByRole('button', { name: 'Confirmar documento' }).click()
  await expect(heading).toHaveCount(0)
  const confirmation = calls.find(call => call.path === '/api/auth/me/document')
  expect(confirmation?.body).toEqual({ document: '33000167000101' })
  expect(confirmation?.authorization).toMatch(/^Bearer test\./)
})
