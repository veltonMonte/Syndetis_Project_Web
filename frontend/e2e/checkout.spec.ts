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

async function mockBuyer(page: Page, failFirstOrder = false) {
  const requests: { key: string | undefined; body: Record<string, unknown> }[] = []
  let status = 'PENDING'
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const order = { id: orderId, storeId, status, subtotal: 39.9, shipping: 8.5, total: 48.4,
      expiresAt: new Date(Date.now() + 1800000).toISOString(), createdAt: new Date().toISOString(), paymentReviewRequired: false,
      deliveryAddress: 'Rua A, 10 — São Paulo/SP', deliveryInstructions: store.deliveryInstructions,
      items: [{ productId, productName: product.name, quantity: 1, unitPrice: 39.9, lineTotal: 39.9 }] }
    let body: unknown
    if (path === '/api/auth/login') body = tokens()
    else if (path === '/api/core/public/stores/atelie') body = store
    else if (path.endsWith('/products')) body = pageOf([product])
    else if (path === '/api/core/customers/me/addresses') body = [{ id: addressId, street: 'Rua A', number: '10', city: 'São Paulo', state: 'SP', zipCode: '01001000' }]
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

test('comprador entra, monta o pedido, revisa o total do servidor e cancela', async ({ page }) => {
  const requests = await mockBuyer(page)
  await page.goto('/lojas/atelie')
  await page.getByRole('button', { name: 'Adicionar ao pedido' }).click()
  await page.getByRole('link', { name: 'Entre para continuar' }).click()
  await page.getByLabel('E-mail').fill('buyer@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('TestPassword123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/lojas\/atelie$/)
  await page.getByRole('button', { name: 'Revisar pedido e pagar' }).click()
  await expect(page).toHaveURL(`/pedidos/${orderId}`)
  await expect(page.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
  await expect(page.locator('.total')).toContainText('48,40')
  expect(requests).toHaveLength(1)
  expect(requests[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(requests[0].body).toEqual({ storeId, addressId, items: [{ productId, quantity: 1 }] })
  await page.getByRole('button', { name: 'Cancelar pedido', exact: true }).click()
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pagar com Mercado Pago' })).toHaveCount(0)
})

test('retorno com status aprovado na URL não confirma um pedido', async ({ page }) => {
  await mockBuyer(page)
  await page.addInitScript((token) => sessionStorage.setItem('syndetis.access', token), tokens().accessToken)
  await page.goto(`/pedidos/${orderId}?collection_status=approved`)
  await expect(page.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
  await expect(page.getByText('Pagamento confirmado', { exact: true })).toHaveCount(0)
})

test('recarregar depois de uma falha conserva a mesma chave de idempotência', async ({ page }) => {
  const requests = await mockBuyer(page, true)
  await page.addInitScript((token) => sessionStorage.setItem('syndetis.access', token), tokens().accessToken)
  await page.goto('/lojas/atelie')
  await page.getByRole('button', { name: 'Adicionar ao pedido' }).click()
  await page.getByRole('button', { name: 'Revisar pedido e pagar' }).click()
  await expect(page.getByText('Falha temporária de rede')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Revisar pedido e pagar' }).click()
  await expect(page).toHaveURL(`/pedidos/${orderId}`)
  expect(requests).toHaveLength(2)
  expect(requests[0].key).toBe(requests[1].key)
})

test('lojista cria produto, ajusta estoque e publica o layout com controle de versão', async ({ page }) => {
  let stock = 0
  let productCreated = false
  const versions: string[] = []
  await page.addInitScript((token) => sessionStorage.setItem('syndetis.access', token), tokens('SELLER').accessToken)
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let body: unknown
    if (path.endsWith('/stores/me')) body = [store]
    else if (path.endsWith('/products')) {
      if (request.method() === 'POST') { productCreated = true; body = product }
      else body = pageOf(productCreated ? [product] : [])
    } else if (path.endsWith('/inventory')) body = [{ productId, quantity: stock, reserved: 0, available: stock }]
    else if (path.endsWith('/movements')) { stock += Number((request.postDataJSON() as { delta: number }).delta); body = { productId, quantity: stock, available: stock, reserved: 0 } }
    else if (path.endsWith('/orders')) body = pageOf([])
    else if (path.endsWith('/layout')) {
      if (request.method() === 'PUT') { versions.push(request.headers()['if-match']); body = { config: request.postDataJSON(), version: 4 } }
      else body = { config: store.layout, version: 3 }
    } else if (path.endsWith('/publish')) { versions.push(request.headers()['if-match']); body = { config: store.layout, version: 5 } }
    else { await route.fulfill({ status: 404 }); return }
    await route.fulfill({ json: body })
  })
  await page.goto('/painel')
  await page.getByLabel('Nome do produto', { exact: true }).fill(product.name)
  await page.getByLabel('SKU', { exact: true }).fill(product.sku)
  await page.getByLabel('Preço (R$)', { exact: true }).fill('39.90')
  await page.getByRole('button', { name: 'Cadastrar produto', exact: true }).click()
  await expect(page.getByText('Produto cadastrado. Adicione unidades ao estoque abaixo.')).toBeVisible()
  await page.getByLabel(`Adicionar unidades de ${product.name}`).fill('5')
  await page.getByRole('button', { name: 'Adicionar estoque', exact: true }).click()
  await expect(page.getByText(/Disponíveis: 5/)).toBeVisible()
  await page.getByLabel('Título da vitrine').fill('Nova coleção')
  await page.getByRole('button', { name: 'Publicar vitrine', exact: true }).click()
  await expect(page.getByText('Vitrine publicada.', { exact: true })).toBeVisible()
  expect(versions).toEqual(['"3"', '"4"'])
})
