import { test, expect, type Page } from '@playwright/test'

// A merchant account exists only for a CPF or CNPJ the Receita Federal confirms (exists and is active).
const userId = 'b6f0c7a2-4d1e-4c55-9a2e-1f0c8f9b2a33'

function tokens(docVerified: boolean) {
  const claims = Buffer.from(JSON.stringify({
    sub: userId, email: 'oauth@example.test', role: 'SELLER', doc_verified: docVerified,
    exp: Math.floor(Date.now() / 1000) + 600,
  })).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'refresh', expiresIn: 600 }
}

async function api(page: Page) {
  const calls: { path: string; body: unknown; authorization?: string }[] = []
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    calls.push({ path, body: request.postDataJSON(), authorization: request.headers().authorization })
    if (path === '/api/auth/register/seller') {
      const body = request.postDataJSON() as { birthDate?: string }
      // The Receita Federal does not know this CPF with this birth date; then it does.
      if (body.birthDate === '1970-11-15') {
        await route.fulfill({ status: 422, json: { status: 422, message: 'Não encontramos este CPF com essa data de nascimento na Receita Federal.' } })
        return
      }
      await route.fulfill({ status: 201, json: {} })
      return
    }
    if (path === '/api/auth/login') return route.fulfill({ json: tokens(true) })
    if (path === '/api/auth/oauth2/exchange') return route.fulfill({ json: tokens(false) })
    if (path === '/api/auth/me/document') return route.fulfill({ json: tokens(true) })
    if (path === '/api/integrations/tax-ids/lookup') {
      return route.fulfill({ json: { type: 'CNPJ', document: '11222333000181', status: 'INACTIVE', registrationStatus: 'BAIXADA', name: 'LOJA ANTIGA LTDA' } })
    }
    if (path === '/api/core/stores/me') return route.fulfill({ json: [] })
    if (path.endsWith('/entitlements')) return route.fulfill({ json: { plan: 'MAKER', activeProductLimit: 100, structuralEditing: true } })
    await route.fulfill({ json: {} })
  })
  return calls
}

test('cadastro com CPF pede a data de nascimento e mostra a recusa da Receita Federal', async ({ page }) => {
  const calls = await api(page)
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Rui')
  await page.getByLabel('CPF ou CNPJ').fill('40442820136')
  await page.getByLabel('E-mail profissional').fill('rui@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ }).click()
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  // Wrong check digits never leave the browser.
  await expect(page.getByLabel('CPF ou CNPJ')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Este CPF não é válido: confira os números.')).toBeVisible()
  expect(calls.filter(call => call.path === '/api/auth/register/seller')).toHaveLength(0)

  await page.getByLabel('CPF ou CNPJ').fill('40442820135')
  await expect(page.getByLabel('CPF ou CNPJ')).toHaveValue('404.428.201-35')
  const birth = page.getByLabel('Data de nascimento do titular do CPF')
  await expect(birth).toBeVisible()
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByText('Informe a data de nascimento do titular do CPF.')).toBeVisible()

  await birth.fill('1970-11-15')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Não encontramos este CPF' })).toBeVisible()
  await expect(page).toHaveURL(/#\/cadastro$/)

  await birth.fill('1970-11-14')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/criar$/)
  const signups = calls.filter(call => call.path === '/api/auth/register/seller')
  expect(signups.at(-1)?.body).toMatchObject({ document: '40442820135', birthDate: '1970-11-14' })
  // A CPF is personal data: it is never sent to the public lookup.
  expect(calls.some(call => call.path === '/api/integrations/tax-ids/lookup')).toBe(false)
})

test('CNPJ baixado aparece como recusado antes de enviar', async ({ page }) => {
  await api(page)
  await page.goto('/#/cadastro')
  await page.getByLabel('CPF ou CNPJ').fill('11222333000181')
  await expect(page.getByText(/situação baixada na Receita Federal/)).toBeVisible()
  await expect(page.getByLabel('CPF ou CNPJ')).toHaveAttribute('aria-invalid', 'true')
})

test('lojista do Google ou GitHub confirma o documento antes de abrir o Maker', async ({ page }) => {
  const calls = await api(page)
  await page.goto('/auth/callback?code=oauth-code')
  const heading = page.getByRole('heading', { name: 'Confirme seu CPF ou CNPJ' })
  await expect(heading).toBeVisible()
  await page.goto('/#/dashboard')
  await expect(heading).toBeVisible()

  await page.getByLabel('CPF ou CNPJ').fill('40442820135')
  await page.getByLabel('Data de nascimento do titular do CPF').fill('1970-11-14')
  await page.getByRole('button', { name: 'Confirmar documento' }).click()
  await expect(heading).toHaveCount(0)
  const confirmation = calls.find(call => call.path === '/api/auth/me/document')
  expect(confirmation?.body).toEqual({ document: '40442820135', birthDate: '1970-11-14' })
  expect(confirmation?.authorization).toMatch(/^Bearer test\./)
})
