import { test, expect, type Page } from '@playwright/test'

const storeId = '7b3cda7a-33f4-4f64-8eef-664b187d6ca5'
const productId = '86b233b0-f6ea-46a4-a2d5-15610c6226c1'
const orderId = '4d28c395-3c72-43a0-b9c7-4ea0a621e388'
const addressId = '990da804-f3a0-4568-b8bb-ef26d8bd6ee6'
const product = { id: productId, name: 'Camiseta artesanal', price: 39.9, sku: 'CAM-01', description: 'Feita para durar.', imageUrl: null }
const store = { id: storeId, name: 'Ateliê', slug: 'atelie', status: 'ACTIVE', shippingFee: 8.5, deliveryInstructions: 'Envio pelo vendedor em até 3 dias úteis.',
  layout: { schemaVersion: 1, theme: { primaryColor: '#3630a3', backgroundColor: '#ffffff' }, sections: [{ type: 'hero', title: 'Feito com cuidado.' }, { type: 'product-grid' }] } }
function tokens(role = 'CUSTOMER') {
  const payload = Buffer.from(JSON.stringify({ sub: '80c3d235-646e-469c-978d-e8112543e00f', email: 'buyer@example.test', role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')
  return { accessToken: `test.${payload}.signature`, refreshToken: 'test-refresh', expiresIn: 600 }
}
const pageOf = (content: unknown[]) => ({ content, page: 0, totalPages: 1, totalElements: content.length })

async function mockBuyer(page: Page, failFirstOrder = false, startWithoutAddress = false) {
  const requests: { key: string | undefined; body: Record<string, unknown> }[] = []
  let status = 'PENDING'
  const address = { id: addressId, street: 'Rua A', number: '10', city: 'São Paulo', state: 'SP', zipCode: '01001000' }
  let savedAddresses = startWithoutAddress ? [] : [address]
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const order = { id: orderId, storeId, status, subtotal: 39.9, shipping: 8.5, total: 48.4,
      expiresAt: new Date(Date.now() + 1800000).toISOString(), createdAt: new Date().toISOString(), paymentReviewRequired: false,
      deliveryAddress: 'Rua A, 10 — São Paulo/SP', deliveryInstructions: store.deliveryInstructions,
      items: [{ productId, productName: product.name, quantity: 1, unitPrice: 39.9, lineTotal: 39.9 }] }
    let body: unknown
    if (path === '/api/auth/login') body = tokens()
    else if (path === '/api/core/public/stores/atelie') body = {
      ...store,
      layout: {
        ...store.layout,
        templateId: 'aurora',
        theme: { ...store.layout.theme, headingFontFamily: 'Georgia, serif' },
        sections: [...store.layout.sections, { type: 'footer', copyright: 'Ateliê' }],
      },
    }
    else if (path.endsWith('/categories')) body = []
    else if (path.endsWith('/products')) body = pageOf([product])
    else if (path === '/api/core/customers/me' && request.method() === 'PUT') body = request.postDataJSON()
    else if (path === '/api/core/customers/me/addresses') {
      if (request.method() === 'POST') {
        savedAddresses = [address]
        body = address
      } else body = savedAddresses
    }
    else if (path === '/api/core/orders' && request.method() === 'POST') {
      requests.push({ key: request.headers()['idempotency-key'], body: request.postDataJSON() as Record<string, unknown> }); body = order
      if (failFirstOrder && requests.length === 1) { await route.fulfill({ status: 502, json: { message: 'Falha temporária de rede' } }); return }
    } else if (path.endsWith('/cancel')) { status = 'CANCELED'; body = { ...order, status } }
    else if (path === `/api/core/orders/${orderId}`) body = order
    else if (path === '/api/core/orders/me') body = pageOf([order])
    else { await route.fulfill({ status: 404, json: { message: `Rota de teste inesperada: ${path}` } }); return }
    await route.fulfill({ json: body })
  })
  return requests
}

test('comprador entra, monta o pedido, revisa o total do servidor e cancela', async ({ page }, testInfo) => {
  const requests = await mockBuyer(page, false, true)
  await page.goto('/#/lojas/atelie')
  await page.getByRole('button', { name: 'Ver produto: Camiseta artesanal', exact: true }).click()
  const details = page.getByRole('region', { name: 'Detalhes do produto', exact: true })
  await expect(details.getByRole('heading', { name: 'Camiseta artesanal' })).toBeVisible()
  await details.getByRole('button', { name: 'Adicionar à sacola', exact: true }).click()
  await page.getByRole('button', { name: 'Sacola (1)', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Sua sacola', exact: true })).toContainText('Camiseta artesanal')
  await page.getByRole('button', { name: 'Finalizar compra', exact: true }).click()
  await page.getByRole('link', { name: 'Entre para continuar' }).click()
  await page.getByLabel('E-mail profissional').fill('buyer@example.test')
  await page.getByLabel('Senha de acesso', { exact: true }).fill('TestPassword123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page).toHaveURL(/\/lojas\/atelie\?etapa=finalizar$/)
  const template = page.locator('[data-store-template="aurora"]')
  const finalization = template.getByRole('region', { name: 'Finalizar compra', exact: true })
  await expect(finalization.getByRole('heading', { name: 'Finalizar compra' })).toHaveCSS('font-family', /^Georgia,/)
  const addAddress = finalization.getByRole('button', { name: 'Adicionar endereço' })
  await expect(addAddress).toHaveCSS('background-color', 'rgb(54, 48, 163)')
  await expect(finalization.getByRole('button', { name: 'Revisar pedido e pagar' })).toHaveCount(0)
  await addAddress.click()
  await finalization.getByLabel('Nome de quem recebe').fill('Comprador de teste')
  await finalization.getByLabel('Telefone').fill('11999990000')
  await finalization.getByLabel('CEP').fill('01001000')
  await finalization.getByLabel('UF').fill('SP')
  await finalization.getByLabel('Rua').fill('Rua A')
  await finalization.getByLabel('Número').fill('10')
  await finalization.getByLabel('Cidade').fill('São Paulo')
  await finalization.getByRole('button', { name: 'Salvar endereço' }).click()
  await expect(finalization.getByRole('combobox', { name: 'Selecione o endereço' })).toBeVisible()
  await expect(finalization.getByRole('button', { name: 'Revisar pedido e pagar' })).toHaveCSS('background-color', 'rgb(54, 48, 163)')
  await expect(template.locator('.shop-brand')).toHaveText('Ateliê')
  await expect(template.locator('.shop-footer')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('checkout-desktop.png') })
  await page.getByRole('button', { name: 'Revisar pedido e pagar' }).click()
  await expect(page).toHaveURL(`/#/lojas/atelie?pedido=${orderId}`)
  const review = template.getByRole('region', { name: 'Seu pedido', exact: true })
  await expect(review.getByRole('heading', { name: 'Seu pedido' })).toHaveCSS('font-family', /^Georgia,/)
  await expect(page.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
  await expect(page.locator('.total')).toContainText('48,40')
  expect(requests).toHaveLength(1)
  expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(requests[0].body).toEqual({ storeId, addressId, items: [{ productId, quantity: 1 }] })
  await page.getByRole('button', { name: 'Cancelar pedido', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click()
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pagar com Mercado Pago' })).toHaveCount(0)
})

test('retorno com status aprovado na URL não confirma um pedido', async ({ page }) => {
  await mockBuyer(page)
  await page.addInitScript((token) => sessionStorage.setItem('syndetis.access', token), tokens().accessToken)
  await page.goto(`/pedidos/${orderId}?collection_status=approved`)
  await expect(page).toHaveURL(`/?collection_status=approved#/pedidos/${orderId}`)
  await expect(page.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
  await expect(page.getByText('Pagamento confirmado', { exact: true })).toHaveCount(0)
})

test('recarregar depois de uma falha conserva a mesma chave de idempotência', async ({ page }) => {
  const requests = await mockBuyer(page, true)
  await page.addInitScript((token) => sessionStorage.setItem('syndetis.access', token), tokens().accessToken)
  await page.goto('/#/lojas/atelie')
  await page.getByRole('button', { name: 'Adicionar ao pedido' }).click()
  await page.getByRole('button', { name: 'Sacola (1)', exact: true }).click()
  await page.getByRole('button', { name: 'Finalizar compra', exact: true }).click()
  await page.getByRole('button', { name: 'Revisar pedido e pagar' }).click()
  await expect(page.getByText('Falha temporária de rede')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Revisar pedido e pagar' }).click()
  await expect(page).toHaveURL(`/#/lojas/atelie?pedido=${orderId}`)
  expect(requests).toHaveLength(2)
  expect(requests[0].key).toBe(requests[1].key)
})
