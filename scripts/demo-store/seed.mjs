// Seeds the "Casa Brisa" demo store through the public HTTP APIs (auth-service + core-service),
// exactly as the frontend would: seller account, store, categories, 12 products with images and
// stock, a published Maker layout with freely placed elements, and orders in every status so the
// seller dashboard shows sales, orders and inventory.
//
//   docker compose up -d                      # Postgres, Redis, auth, core, gateway
//   node scripts/demo-store/generate-images.mjs   # only if frontend/public/images/demo is missing
//   node scripts/demo-store/seed.mjs
//
// Safe to run again: existing accounts, store, categories and products are reused, and orders
// are only created for a store that has none. It refuses any host that is not this machine,
// so it can never write to a production database (override with SEED_ALLOW_REMOTE=1 only for a
// disposable test environment, e.g. the syndetis-neon-test branch behind a local core-service).
//
// Environment (all optional):
//   SEED_BASE_URL   gateway origin, default http://127.0.0.1:8080
//   SEED_AUTH_URL   auth API root, default $SEED_BASE_URL/api/auth   (direct: http://127.0.0.1:8081/api/auth)
//   SEED_CORE_URL   core API root, default $SEED_BASE_URL/api/core   (direct: http://127.0.0.1:8082/api)
//   SEED_SELLER_EMAIL / SEED_SELLER_PASSWORD, SEED_BUYER_EMAIL / SEED_BUYER_PASSWORD
//   SEED_SELLER_DOCUMENT / SEED_SELLER_BIRTH_DATE  the merchant's CPF (or CNPJ) the Receita Federal must confirm.
//                   The default is a test CPF from SERPRO's documentation, which its free demo endpoint (the local
//                   default, SERPRO_CPF_URL) confirms. A merchant account is only created for a confirmed document.
//   SEED_PUBLIC_ORIGIN  origin that serves the frontend (and its /images/demo/*.svg), default http://localhost:8080.
//                       The core-service only accepts absolute http(s) image URLs, so this is stored with each product.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { categories, orders, products, store as demoStore } from './catalog.mjs'

const base = process.env.SEED_BASE_URL ?? 'http://127.0.0.1:8080'
const authRoot = process.env.SEED_AUTH_URL ?? `${base}/api/auth`
const coreRoot = process.env.SEED_CORE_URL ?? `${base}/api/core`
const publicOrigin = process.env.SEED_PUBLIC_ORIGIN ?? 'http://localhost:8080'
// Demo-only credentials for a local database; override them through the environment.
const seller = { email: process.env.SEED_SELLER_EMAIL ?? 'lojista@casabrisa.test', password: process.env.SEED_SELLER_PASSWORD ?? 'CasaBrisa-Demo-2026!', firstName: 'Lojista Casa Brisa',
  document: process.env.SEED_SELLER_DOCUMENT ?? '40442820135', birthDate: process.env.SEED_SELLER_BIRTH_DATE ?? '1970-11-14' }
const buyer = { email: process.env.SEED_BUYER_EMAIL ?? 'cliente@casabrisa.test', password: process.env.SEED_BUYER_PASSWORD ?? 'CasaBrisa-Cliente-2026!', firstName: 'Cliente Demo' }

for (const root of [authRoot, coreRoot]) {
  const host = new URL(root).hostname
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) && process.env.SEED_ALLOW_REMOTE !== '1')
    throw new Error(`Recusado: ${root} não é local. O seed só escreve em bancos de desenvolvimento (SEED_ALLOW_REMOTE=1 para um ambiente de teste descartável).`)
}

async function call(root, path, { token, body, method = body ? 'POST' : 'GET', headers = {}, expect = [200, 201, 204] } = {}) {
  const response = await fetch(root + path, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const data = text ? (() => { try { return JSON.parse(text) } catch { return text } })() : null
  if (!expect.includes(response.status)) {
    const detail = typeof data === 'object' && data ? data.detail || data.message || JSON.stringify(data) : data
    throw Object.assign(new Error(`${method} ${path} → ${response.status}: ${detail}`), { status: response.status })
  }
  return { status: response.status, data, etag: response.headers.get('etag') }
}
const auth = (path, options) => call(authRoot, path, options).then(result => result.data)
const core = (path, options) => call(coreRoot, path, options).then(result => result.data)

async function waitForServices() {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(`${coreRoot}/public/stores/seed-readiness-probe`, { signal: AbortSignal.timeout(2000) })
      if (response.status === 404) return
    } catch { /* still starting */ }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error(`O core-service não respondeu em ${coreRoot}. Suba o ambiente com "docker compose up -d".`)
}

async function account({ email, password, firstName, document, birthDate }, path) {
  try { return await confirmed((await auth('/login', { body: { email, password } })).accessToken, { document, birthDate }) } catch (error) { if (error.status !== 401 && error.status !== 404) throw error }
  const identity = document ? (document.length === 11 ? { document, birthDate } : { document }) : {}
  await auth(path, { body: { firstName, email, password, ...identity }, expect: [200, 201] })
  return (await auth('/login', { body: { email, password } })).accessToken
}

/** A merchant created before CPF/CNPJ were required confirms the seed's document once. */
async function confirmed(token, { document, birthDate }) {
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  if (claims.doc_verified !== false || !document) return token
  const body = document.length === 11 ? { document, birthDate } : { document }
  return (await auth('/me/document', { token, body })).accessToken
}

async function allPages(path, token) {
  const items = []
  for (let page = 0; ; page++) {
    const batch = await core(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, { token })
    items.push(...batch.content)
    if (page + 1 >= batch.totalPages) return items
  }
}

/** The Maker's layout, in the core-service format (see frontend/src/lib/layout-payload.ts). */
function layout() {
  return {
    schemaVersion: 1,
    templateId: 'horizonte',
    theme: {
      brandName: demoStore.name, primaryColor: '#0e3b43', backgroundColor: '#f0f4f5', textColor: '#0e3b43',
      secondaryColor: '#2a6770', accentColor: '#c8822f', headingFontFamily: 'Instrument Serif, Georgia, serif', bodyFontFamily: 'Figtree, Segoe UI, sans-serif',
    },
    sections: [
      { id: 'demo-announcement', editorType: 'announcement', type: 'banner', title: 'Frete grátis acima de R$ 299 · 5% de desconto no Pix', description: '' },
      { id: 'demo-hero', editorType: 'hero', type: 'hero', title: 'Objetos simples\npara dias leves.', subtitle: 'Peças de casa, cozinha e rua feitas para durar — escolhidas uma a uma pela Casa Brisa.', buttonText: 'Ver produtos' },
      { id: 'demo-countdown', editorType: 'countdown', type: 'banner', title: 'Semana Brisa termina em', description: 'Até 20% off em peças selecionadas.', targetDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        position: { desktop: { x: 18, y: -24 }, mobile: { x: 0, y: -12 } }, style: { width: 64, borderRadius: 24, shadow: 'strong', zIndex: 3, backgroundColor: '#ffffff', align: 'center' } },
      { id: 'demo-categories', editorType: 'categories', type: 'category-list', title: 'Compre por ambiente', description: '' },
      { id: 'demo-products', editorType: 'products', type: 'product-grid', title: 'Toda a coleção', description: 'Doze peças com envio em até 2 dias úteis.' },
      { id: 'demo-note', editorType: 'text', type: 'text', title: 'Feito para durar', body: 'Trocamos qualquer peça em até 30 dias e consertamos o que for possível antes de substituir.',
        position: { desktop: { x: 6, y: 0 } }, style: { width: 46, borderWidth: 2, borderColor: '#0e3b43', borderRadius: 16, align: 'start', backgroundColor: '#ffffff' } },
      { id: 'demo-divider', editorType: 'divider', type: 'text', title: '', body: '' },
      { id: 'demo-banner', editorType: 'banner', type: 'banner', title: 'Casa Brisa no seu ritmo', description: 'Monte seu kit de casa nova com 10% off a partir de 3 peças.', buttonText: 'Montar meu kit',
        imageUrl: `${publicOrigin}/images/demo/luminaria-cupula.svg`, imageAlt: 'Luminária Cúpula Nuvem' },
      { id: 'demo-footer', editorType: 'footer', type: 'footer', text: demoStore.name, copyright: 'Casa Brisa · loja de demonstração criada pelo seed do Syndetis' },
    ],
  }
}

await waitForServices()
const sellerToken = await account(seller, '/register/seller')
const buyerToken = await account({ ...buyer, document: undefined }, '/register')

let store = (await core('/stores/me', { token: sellerToken })).find(item => item.slug === demoStore.slug)
if (!store) store = await core('/stores', { token: sellerToken, body: demoStore })
console.info(`Loja: ${store.name} (${store.id})`)

const existingCategories = await core(`/stores/${store.id}/categories`, { token: sellerToken })
const categoryIds = {}
for (const category of categories) {
  const found = existingCategories.find(item => item.slug === category.slug)
  categoryIds[category.slug] = (found ?? await core(`/stores/${store.id}/categories`, { token: sellerToken, body: category })).id
}

const existingProducts = await allPages(`/stores/${store.id}/products`, sellerToken)
const productIds = {}
let created = 0
for (const product of products) {
  let found = existingProducts.find(item => item.sku === product.sku)
  if (!found) {
    found = await core(`/stores/${store.id}/products`, { token: sellerToken, body: {
      name: product.name, description: product.description, price: product.price, sku: product.sku,
      imageUrl: `${publicOrigin}/images/demo/${product.image}`, categoryId: categoryIds[product.category], active: true,
    } })
    await core(`/stores/${store.id}/inventory/${found.id}/movements`, { token: sellerToken, body: { delta: product.stock, reason: 'Estoque inicial da loja demo' } })
    created++
  }
  productIds[product.sku] = found.id
}
console.info(`Produtos: ${products.length} (${created} criados agora)`)

const current = await core(`/stores/${store.id}/layout`, { token: sellerToken })
const saved = await core(`/stores/${store.id}/layout`, { token: sellerToken, method: 'PUT', body: layout(), headers: { 'If-Match': `"${current.version}"` } })
await core(`/stores/${store.id}/layout/publish`, { token: sellerToken, method: 'POST', headers: { 'If-Match': `"${saved.version}"` } })
console.info('Layout do Maker salvo e publicado.')

const existingOrders = await core(`/stores/${store.id}/orders?size=1`, { token: sellerToken })
if (existingOrders.totalElements === 0) {
  const address = await core('/customers/me/addresses', { token: buyerToken, body: { zipCode: '01310100', street: 'Avenida Paulista', number: '1000', complement: 'Conjunto 42', city: 'São Paulo', state: 'SP' } })
  const path = { PAID: ['PAID'], SHIPPED: ['PAID', 'SHIPPED'], DELIVERED: ['PAID', 'SHIPPED', 'DELIVERED'], CANCELED: ['CANCELED'], PENDING: [] }
  for (const order of orders) {
    const placed = await core('/orders', { token: buyerToken, headers: { 'Idempotency-Key': randomUUID() }, body: {
      storeId: store.id, addressId: address.id, items: order.items.map(([sku, quantity]) => ({ productId: productIds[sku], quantity })),
    } })
    for (const status of path[order.status])
      await core(`/stores/${store.id}/orders/${placed.id}/status`, { token: sellerToken, method: 'PATCH', body: { status } })
  }
  console.info(`Pedidos: ${orders.length} criados (entregues, enviados, pagos, pendente e cancelado).`)
} else console.info(`Pedidos: a loja já tem ${existingOrders.totalElements}; nenhum novo pedido criado.`)

const publicStore = await core(`/public/stores/${store.slug}`)
const publicProducts = await core(`/public/stores/${store.slug}/products?size=100`)
assert.ok(publicProducts.content.length >= 10, 'a vitrine pública deve listar pelo menos 10 produtos')
assert.ok(publicStore.layout.sections.some(section => section.position), 'o layout publicado deve trazer elementos posicionados')
console.info(`Pronto: vitrine em /#/lojas/${store.slug} com ${publicProducts.content.length} produtos. Entre como ${seller.email} para ver o painel.`)
