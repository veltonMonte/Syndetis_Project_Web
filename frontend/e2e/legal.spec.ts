import { createRequire } from 'node:module'
import { test, expect, type Page } from '@playwright/test'

// Legal texts (docs/legal/README.md): public pages, acceptance at signup and inside the app.
const VERSIONS = { termsVersion: '2026-11-18', privacyVersion: '2026-11-18' }
const userId = 'c1d2e3f4-0000-4c55-9a2e-1f0c8f9b2a33'

function tokens() {
  const claims = Buffer.from(JSON.stringify({
    sub: userId, email: 'lojista@example.test', role: 'SELLER', doc_verified: true,
    exp: Math.floor(Date.now() / 1000) + 600,
  })).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'refresh', expiresIn: 600 }
}

async function api(page: Page, legal: { pending: boolean; acceptedAt: string | null }) {
  const calls: { method: string; path: string; body: unknown; authorization?: string }[] = []
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    calls.push({ method: request.method(), path, body: request.postDataJSON(), authorization: request.headers().authorization })
    if (path === '/api/auth/providers') return route.fulfill({ json: { oauth: ['google'] } })
    if (path === '/api/auth/register/seller') return route.fulfill({ status: 201, json: {} })
    if (path === '/api/auth/login' || path === '/api/auth/oauth2/exchange') return route.fulfill({ json: tokens() })
    if (path === '/api/auth/me/legal') {
      if (request.method() === 'POST') legal = { pending: false, acceptedAt: new Date().toISOString() }
      return route.fulfill({ json: { ...VERSIONS, ...legal, acceptedTermsVersion: null, acceptedPrivacyVersion: null } })
    }
    if (path === '/api/integrations/tax-ids/lookup') {
      return route.fulfill({ json: { type: 'CNPJ', document: '33000167000101', status: 'ACTIVE', name: 'MARINA LTDA' } })
    }
    if (path === '/api/core/stores/me') return route.fulfill({ json: [] })
    if (path.endsWith('/entitlements')) return route.fulfill({ json: { plan: 'MAKER', activeProductLimit: 100, structuralEditing: true } })
    await route.fulfill({ json: {} })
  })
  return calls
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') })
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: Document, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> }
    }).axe
    const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    return results.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))
  })
}

test('o rodapé leva aos documentos legais, que avisam que são rascunho', async ({ page }) => {
  await api(page, { pending: false, acceptedAt: null })
  await page.goto('/#/')
  const legalLinks = page.getByRole('navigation', { name: 'Documentos legais' })
  await expect(legalLinks.getByRole('link')).toHaveCount(6)
  await legalLinks.getByRole('link', { name: 'Privacidade' }).click()
  await expect(page).toHaveURL(/#\/legal\/privacidade$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade da Syndetis' })).toBeVisible()
  await expect(page).toHaveTitle('Syndetis — Política de Privacidade')
  await expect(page.getByText('Rascunho para revisão jurídica.')).toBeVisible()
  // The controller / processor table is a real table, named after its section.
  await expect(page.getByRole('table', { name: '1. Quem é responsável pelos seus dados' })).toBeVisible()
  expect(await axeViolations(page)).toEqual([])

  await page.getByRole('link', { name: 'Todos os documentos' }).first().click()
  await expect(page).toHaveURL(/#\/legal$/)
  for (const title of ['Termos de Uso', 'Política de Cookies', 'Planos, teste grátis e assinatura', 'Selo Verificado Syndetis', 'Modelo de termos para lojas']) {
    await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible()
  }
  await page.getByRole('link', { name: /Planos, teste grátis e assinatura/ }).click()
  await expect(page.getByRole('heading', { name: '7. Direito de arrependimento (CDC, art. 49)' })).toBeVisible()
})

test('o cadastro só cria a conta com o aceite e envia as versões aceitas', async ({ page }) => {
  const calls = await api(page, { pending: false, acceptedAt: null })
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Marina')
  await page.getByLabel('CPF ou CNPJ').fill('33000167000101')
  await page.getByLabel('E-mail profissional').fill('marina@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'aceite os Termos de Uso e a Política de Privacidade' })).toBeVisible()
  // Social signup needs the same acceptance.
  await page.getByRole('button', { name: 'Continuar com Google' }).click()
  await expect(page).toHaveURL(/#\/cadastro$/)
  expect(calls.filter(call => call.path === '/api/auth/register/seller')).toHaveLength(0)

  const consent = page.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ })
  await expect(page.getByRole('link', { name: 'Termos de Uso' }).first()).toHaveAttribute('href', '#/legal/termos-de-uso')
  await consent.click()
  await expect(consent).toBeChecked()
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/criar$/)
  const signup = calls.find(call => call.path === '/api/auth/register/seller')
  expect(signup?.body).toMatchObject({ acceptedTermsVersion: VERSIONS.termsVersion, acceptedPrivacyVersion: VERSIONS.privacyVersion })
})

test('quem entra com Google sem aceite vê a tela de aceite antes do painel', async ({ page }) => {
  const calls = await api(page, { pending: true, acceptedAt: null })
  await page.goto('/auth/callback?code=oauth-code')
  const heading = page.getByRole('heading', { name: 'Antes de começar' })
  await expect(heading).toBeVisible()
  await page.goto('/#/dashboard')
  await expect(heading).toBeVisible()
  // The texts stay readable while the acceptance is pending.
  await page.goto('/#/legal/termos-de-uso')
  await expect(page.getByRole('heading', { level: 1, name: 'Termos de Uso da Plataforma Syndetis' })).toBeVisible()
  await page.goto('/#/dashboard')

  await page.getByRole('button', { name: 'Aceitar e continuar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'aceite os Termos de Uso' })).toBeVisible()
  expect(calls.filter(call => call.method === 'POST' && call.path === '/api/auth/me/legal')).toHaveLength(0)
  expect(await axeViolations(page)).toEqual([])

  await page.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ }).click()
  await page.getByRole('button', { name: 'Aceitar e continuar' }).click()
  await expect(heading).toHaveCount(0)
  const accepted = calls.find(call => call.method === 'POST' && call.path === '/api/auth/me/legal')
  expect(accepted?.body).toEqual(VERSIONS)
  expect(accepted?.authorization).toMatch(/^Bearer test\./)
})

test('quem aceitou no cadastro e escolheu o Google não precisa aceitar de novo', async ({ page }) => {
  const calls = await api(page, { pending: true, acceptedAt: null })
  // Google sends the merchant back to the app with a single-use code.
  await page.route('**/oauth2/authorization/google', route =>
    route.fulfill({ status: 302, headers: { location: '/auth/callback?code=oauth-code' } }))
  await page.goto('/#/cadastro')
  await page.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ }).click()
  await page.getByRole('button', { name: 'Continuar com Google' }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Antes de começar' })).toHaveCount(0)
  await expect.poll(() => calls.filter(call => call.method === 'POST' && call.path === '/api/auth/me/legal').length).toBeGreaterThan(0)
})

test('a versão nova dos Termos pede um novo aceite', async ({ page }) => {
  await api(page, { pending: true, acceptedAt: '2026-01-01T12:00:00Z' })
  await page.goto('/auth/callback?code=oauth-code')
  await expect(page.getByRole('heading', { name: 'Os Termos de Uso mudaram' })).toBeVisible()
})
