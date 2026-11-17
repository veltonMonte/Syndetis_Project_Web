import { test, expect, type Page } from '@playwright/test'

// Merchants connect their own Mercado Pago account with OAuth: no API key to copy, payments go to them.
const store = { id: '3f0f1a52-8c1e-4d3e-9a51-0c9d1f2b7a10', name: 'Casa Brisa', slug: 'casa-brisa', status: 'ACTIVE', shippingFee: 18.9, deliveryInstructions: 'Envio em 2 dias.' }

function tokens() {
  const claims = Buffer.from(JSON.stringify({
    sub: 'seller-mp', email: 'lojista@example.test', role: 'SELLER', doc_verified: true,
    exp: Math.floor(Date.now() / 1000) + 600,
  })).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'refresh', expiresIn: 600 }
}

async function api(page: Page, providers: string[] = []) {
  const state = { connected: false, authorizations: 0, disconnects: 0 }
  await page.route('https://auth.mercadopago.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Mercado Pago: autorizar Syndetis</h1>' }))
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/auth/providers') return route.fulfill({ json: { oauth: providers } })
    if (path === '/api/auth/login') return route.fulfill({ json: tokens() })
    if (path === '/api/core/stores/me') return route.fulfill({ json: [store] })
    if (path === `/api/core/stores/${store.id}/payments/mercadopago`) {
      if (request.method() === 'DELETE') { state.disconnects++; state.connected = false; return route.fulfill({ status: 204 }) }
      return route.fulfill({ json: state.connected
        ? { available: true, connected: true, nickname: 'CASABRISA', liveMode: false, connectedAt: '2026-11-16T22:00:00Z' }
        : { available: true, connected: false } })
    }
    if (path === `/api/core/stores/${store.id}/payments/mercadopago/authorize`) {
      state.authorizations++
      return route.fulfill({ json: { authorizationUrl: 'https://auth.mercadopago.com/authorization?client_id=1234&response_type=code&platform_id=mp&state=abc' } })
    }
    if (path.endsWith('/orders')) return route.fulfill({ json: { content: [], page: 0, totalPages: 0, totalElements: 0 } })
    if (path.startsWith('/api/core/public/stores/')) return route.fulfill({ json: { ...store, layout: { sections: [] } } })
    await route.fulfill({ json: {} })
  })
  return state
}

async function login(page: Page) {
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('lojista@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard/)
}

test('lojista conecta o Mercado Pago pela autorização do próprio Mercado Pago', async ({ page }) => {
  const state = await api(page)
  await login(page)
  await page.getByRole('button', { name: 'Recebimentos' }).click()
  await expect(page.getByText('Não é preciso copiar chaves de API', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Conectar Mercado Pago' }).click()
  await expect(page).toHaveURL(/^https:\/\/auth\.mercadopago\.com\/authorization\?client_id=1234/)
  expect(state.authorizations).toBe(1)

  // Mercado Pago sends the merchant back through the core-service, which lands on the dashboard.
  state.connected = true
  await page.goto('/#/dashboard?mercadopago=conectado')
  await expect(page.getByText('Mercado Pago conectado').first()).toBeVisible()
  await expect(page.getByText('CASABRISA')).toBeVisible()
  await expect(page.getByText('Testes do Mercado Pago')).toBeVisible()
  await expect(page).toHaveURL(/#\/dashboard$/)
})

test('lojista desconecta o Mercado Pago depois de confirmar', async ({ page }) => {
  const state = await api(page)
  state.connected = true
  await login(page)
  await page.getByRole('button', { name: 'Recebimentos' }).click()
  await page.getByRole('button', { name: 'Desconectar Mercado Pago' }).click()
  expect(state.disconnects).toBe(0)
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Conectar Mercado Pago' })).toBeVisible()
  expect(state.disconnects).toBe(1)
})

test('login mostra só os logins sociais configurados', async ({ page }) => {
  await api(page, ['google'])
  await page.goto('/#/entrar')
  await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar com GitHub' })).toHaveCount(0)
})

test('sem logins sociais configurados, o login não mostra botões que levariam a erro', async ({ page }) => {
  await api(page, [])
  await page.goto('/#/cadastro')
  await expect(page.getByLabel('Seu nome', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continuar com/ })).toHaveCount(0)
})
