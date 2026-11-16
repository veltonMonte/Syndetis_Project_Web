import type { Layout } from '../src/lib/types'
import { test, expect, type Page, type Locator } from '@playwright/test'
import { makerProjectKey } from '../src/lib/maker-project'

const store = { id: 'store-free', name: 'Ateliê Livre', slug: 'atelie-livre', status: 'ACTIVE', shippingFee: 0, deliveryInstructions: 'Envio em até 3 dias úteis.' }
const userId = 'maker-free-account'

function tokens() {
  const claims = Buffer.from(JSON.stringify({ sub: userId, email: 'maker@example.test', role: 'SELLER', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'maker-refresh', expiresIn: 600 }
}

/** The core-service, as far as the Maker and the published storefront use it. The layout is kept like the JSONB column. */
async function mock(page: Page) {
  const state = { layout: null as Layout | null, writes: 0 }
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    let body: unknown
    if (path === '/api/auth/login') body = tokens()
    else if (path === '/api/core/stores/me') body = [store]
    else if (path.endsWith('/entitlements')) body = { planId: 'MAKER', enforced: true, capabilities: { structuralEditing: true, ai: false }, products: { limit: 500 }, ai: { remaining: 0, limit: 0 } }
    else if (path.endsWith('/layout/publish')) body = { config: state.layout, version: state.writes + 2 }
    else if (path.endsWith('/layout') && request.method() === 'PUT') {
      state.layout = request.postDataJSON()
      state.writes++
      body = { config: state.layout, version: state.writes + 1 }
    } else if (path.endsWith('/layout')) body = { config: state.layout || {}, version: state.writes + 1 }
    else if (path.endsWith('/orders')) body = { content: [], page: 0, totalPages: 0, totalElements: 0 }
    else if (path === `/api/core/public/stores/${store.slug}`) body = { ...store, layout: state.layout }
    else if (path.endsWith('/categories')) body = []
    else if (path.includes('/products')) body = { content: [], page: 0, totalPages: 1, totalElements: 0 }
    else { await route.fulfill({ status: 404, json: { detail: `Unexpected test endpoint: ${path}` } }); return }
    await route.fulfill({ json: body })
  })
  return state
}

async function openMakerWithTemplate(page: Page) {
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('maker@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await page.goto('/#/criar')
  const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true })
  if (await notice.isVisible()) await notice.click()
  await page.getByRole('button', { name: 'Usar template', exact: true }).click()
  await page.getByRole('button', { name: 'Escolher visual', exact: true }).click()
  await page.getByRole('button', { name: 'Usar Forma', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir minha loja no Maker', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Editor da loja', exact: true })).toBeVisible()
}

const project = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), makerProjectKey(userId))
const canvasSection = (page: Page, type: string) => page.locator('.maker-canvas-surface [data-section-type="' + type + '"]')

/** Drag the element's Mover handle by (dx, dy) screen pixels, in several steps like a hand would. */
async function drag(page: Page, handle: Locator, dx: number, dy: number) {
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + dx / 2, box.y + box.height / 2 + dy / 2, { steps: 6 })
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 })
  await page.mouse.up()
}

test('arrasta um elemento na diagonal, salva por dispositivo e a vitrine pública respeita a posição', async ({ page }, testInfo) => {
  const state = await mock(page)
  await openMakerWithTemplate(page)
  const hero = canvasSection(page, 'hero')
  const before = (await hero.boundingBox())!

  // Diagonal: both axes at once.
  await drag(page, page.getByRole('button', { name: 'Mover Topo da loja livremente', exact: true }), 120, 90)
  const after = (await hero.boundingBox())!
  expect(after.x - before.x).toBeCloseTo(120, -1)
  expect(after.y - before.y).toBeCloseTo(90, -1)
  await expect.poll(async () => (await project(page)).config.components.find((item: { type: string }) => item.type === 'hero').position?.desktop?.y).toBeGreaterThan(0)
  const desktop = (await project(page)).config.components.find((item: { type: string }) => item.type === 'hero').position.desktop
  expect(desktop.x).toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('maker-free-drag-desktop.png') })

  // One axis: Shift keeps the move horizontal.
  const products = canvasSection(page, 'products')
  await products.getByRole('button', { name: /^Editar / }).click()
  const productsBefore = (await products.boundingBox())!
  await page.keyboard.down('Shift')
  await drag(page, page.getByRole('button', { name: 'Mover Produtos livremente', exact: true }), -80, 40)
  await page.keyboard.up('Shift')
  const productsAfter = (await products.boundingBox())!
  expect(productsAfter.x - productsBefore.x).toBeCloseTo(-80, -1)
  expect(Math.abs(productsAfter.y - productsBefore.y)).toBeLessThan(2)

  // The phone keeps its own position; until moved there, it uses the desktop one.
  await page.getByRole('group', { name: 'Dispositivo do canvas' }).getByRole('button', { name: 'Celular', exact: true }).click()
  await expect(page.locator('.maker-canvas-surface .store-preview')).toHaveAttribute('data-frame-device', 'mobile')
  await page.getByRole('combobox', { name: 'Seção da página' }).click()
  await page.getByRole('option', { name: /Topo da loja/ }).click()
  await page.getByRole('button', { name: 'Posição e aparência', exact: true }).click()
  const vertical = page.getByLabel('Vertical no celular (px)', { exact: true })
  await expect(vertical).toHaveValue(String(desktop.y))
  await vertical.fill('24')
  await vertical.press('Enter')
  await expect.poll(async () => (await project(page)).config.components.find((item: { type: string }) => item.type === 'hero').position?.mobile?.y).toBe(24)
  expect((await project(page)).config.components.find((item: { type: string }) => item.type === 'hero').position.desktop).toEqual(desktop)

  // Reload: the draft comes back with every element where it was left.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Editor da loja', exact: true })).toBeVisible()
  await expect(hero).toHaveCSS('left', /px$/)
  const reloaded = await hero.evaluate(node => ({ left: (node as HTMLElement).style.left, top: (node as HTMLElement).style.top }))
  expect(reloaded).toEqual({ left: desktop.x + '%', top: desktop.y + 'px' })

  // Saved to the core-service with the section, then rendered by the public storefront.
  await page.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
  await page.getByRole('button', { name: 'Sincronizar agora', exact: true }).click()
  await expect(page.getByText('Rascunho sincronizado', { exact: true })).toBeVisible()
  const saved = state.layout!.sections.find(section => section.editorType === 'hero')!
  expect(saved.position).toEqual({ desktop, mobile: { x: desktop.x, y: 24 } })

  await page.goto('/#/lojas/' + store.slug)
  const publicHero = page.locator('[data-section-type="hero"]')
  await expect(publicHero).toBeVisible()
  await expect(page.locator('.store-preview')).toHaveAttribute('data-frame-device', 'desktop')
  expect(await publicHero.evaluate(node => (node as HTMLElement).style.top)).toBe(desktop.y + 'px')
  await page.screenshot({ path: testInfo.outputPath('storefront-free-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.store-preview')).toHaveAttribute('data-frame-device', 'mobile')
  expect(await publicHero.evaluate(node => (node as HTMLElement).style.top)).toBe('24px')
  // A moved element never makes the phone page scroll sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('storefront-free-mobile.png'), fullPage: true })
})

test('novos elementos e propriedades por elemento chegam à vitrine; layout antigo segue igual', async ({ page }) => {
  const state = await mock(page)
  await openMakerWithTemplate(page)
  const legacyHero = await canvasSection(page, 'hero').evaluate(node => (node as HTMLElement).getAttribute('style'))
  expect(legacyHero).toBeNull() // no position and no style: rendered exactly as the template does

  await page.getByRole('button', { name: 'Adicionar seção', exact: true }).click()
  await page.getByRole('button', { name: 'Inserir Contagem regressiva', exact: true }).click()
  const countdown = canvasSection(page, 'countdown')
  await expect(countdown.getByRole('timer')).toBeVisible()
  await expect(countdown.getByRole('timer')).toContainText('dias')

  await page.getByRole('button', { name: 'Adicionar seção', exact: true }).click()
  await page.getByRole('button', { name: 'Inserir Texto livre', exact: true }).click()
  const text = canvasSection(page, 'text')
  await expect(text).toContainText('Escreva aqui')
  await page.getByRole('button', { name: 'Posição e aparência', exact: true }).click()
  for (const [label, value] of [['Largura (%)', '60'], ['Camada (nível)', '5'], ['Borda (px)', '2'], ['Cantos (px)', '16']]) {
    const input = page.getByLabel(label, { exact: true })
    await input.fill(value)
    await input.press('Enter')
  }
  await page.getByRole('radio', { name: 'Direita', exact: true }).click()
  await page.getByRole('combobox', { name: 'Sombra' }).click()
  await page.getByRole('option', { name: 'Sombra forte', exact: true }).click()
  await expect(text).toHaveCSS('z-index', '5')
  await expect(text).toHaveCSS('text-align', 'end')
  await expect(text).toHaveCSS('border-top-width', '2px')
  await expect(text).toHaveCSS('border-top-left-radius', '16px')
  await expect.poll(async () => (await text.boundingBox())!.width / (await canvasSection(page, 'hero').boundingBox())!.width).toBeCloseTo(0.6, 1)

  await page.getByRole('button', { name: 'Adicionar seção', exact: true }).click()
  await page.getByRole('button', { name: 'Inserir Divisor', exact: true }).click()
  await expect(canvasSection(page, 'divider').locator('hr')).toBeVisible()

  await page.getByRole('button', { name: 'Mais ferramentas', exact: true }).click()
  await page.getByRole('button', { name: 'Sincronizar agora', exact: true }).click()
  await expect(page.getByText('Rascunho sincronizado', { exact: true })).toBeVisible()
  const savedText = state.layout!.sections.find(section => section.editorType === 'text')!
  expect(savedText).toMatchObject({ type: 'text', style: { width: 60, zIndex: 5, borderWidth: 2, borderRadius: 16, align: 'end', shadow: 'strong' } })
  expect(state.layout!.sections.find(section => section.editorType === 'countdown')!.targetDate).toBeTruthy()
  // Sections never moved or styled carry nothing new: the stored layout of a template stays as it was.
  expect(state.layout!.sections.find(section => section.editorType === 'hero')).not.toHaveProperty('position')

  await page.goto('/#/lojas/' + store.slug)
  const publicText = page.locator('[data-section-type="text"]')
  await expect(publicText).toContainText('Escreva aqui')
  await expect(publicText).toHaveCSS('z-index', '5')
  await expect(page.locator('[data-section-type="countdown"]').getByRole('timer')).toBeVisible()
  await expect(page.locator('[data-section-type="divider"] hr')).toBeVisible()
})
