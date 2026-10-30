import { createRequire } from 'node:module'
import { test, expect, type Page } from '@playwright/test'
import { createMakerDraft, makerProjectKey } from '../src/lib/maker-project'
import { initialConfig } from '../src/lib/maker'

const store = {
  id: 'store-maker',
  name: 'Ateliê Aurora',
  slug: 'aurora',
  status: 'ACTIVE',
  shippingFee: 0,
  deliveryInstructions: '',
}
const userId = 'maker-account-a'
function tokens(id = userId, role = 'SELLER') {
  const claims = Buffer.from(
    JSON.stringify({
      sub: id,
      email: 'maker@example.test',
      role,
      exp: Math.floor(Date.now() / 1000) + 600,
    }),
  ).toString('base64url')
  return { accessToken: `test.${claims}.signature`, refreshToken: 'maker-refresh', expiresIn: 600 }
}
async function mock(
  page: Page,
  options: {
    basic?: boolean
    noStore?: boolean
    role?: string
    userId?: string
    quota?: number
  } = {},
) {
  const state = {
    basic: !!options.basic,
    failLimits: false,
    storeWrites: 0,
    layoutWrites: [] as { path: string; body: { sections: unknown[] }; version?: string }[],
    aiCalls: 0,
  }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    let body: unknown
    if (path === '/api/auth/register') {
      await route.fulfill({ status: 201, json: {} })
      return
    }
    if (path === '/api/auth/login') body = tokens(options.userId, options.role)
    else if (path === '/api/auth/logout') {
      await route.fulfill({ status: 204 })
      return
    } else if (path === '/api/core/stores/me') body = options.noStore ? [] : [store]
    else if (path.endsWith('/entitlements')) {
      if (state.failLimits) {
        await route.fulfill({
          status: 503,
          json: { detail: 'Plano temporariamente indisponível.' },
        })
        return
      }
      body = {
        planId: state.basic ? 'STANDARD' : 'MAKER',
        enforced: true,
        capabilities: { structuralEditing: !state.basic, ai: !state.basic },
        products: { limit: state.basic ? 100 : 500 },
        ai: { remaining: options.quota ?? 30, limit: 30 },
      }
    } else if (path.endsWith('/layout') && req.method() === 'PUT') {
      state.layoutWrites.push({
        path,
        body: req.postDataJSON(),
        version: req.headers()['if-match'],
      })
      body = { version: 2 }
    } else if (path.endsWith('/layout')) body = { config: {}, version: 1 }
    else if (path.endsWith('/orders'))
      body = { content: [], page: 0, totalPages: 0, totalElements: 0 }
    else if (path === '/api/core/stores' && req.method() === 'POST') {
      state.storeWrites++
      body = store
    } else if (path.includes('/ai')) {
      state.aiCalls++
      await route.fulfill({ status: 503, json: {} })
      return
    } else {
      await route.fulfill({ status: 404, json: { detail: `Unexpected test endpoint: ${path}` } })
      return
    }
    await route.fulfill({ json: body })
  })
  return state
}
async function enterMaker(page: Page) {
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('maker@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await page.goto('/#/criar')
  const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true })
  if (await notice.isVisible()) {
    await notice.click()
    await expect(notice).toBeHidden()
  }
}
const projectOf = (page: Page, id = userId) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), makerProjectKey(id))

test('Maker novo começa pela escolha e ignora loja de demonstração e plano local', async ({
  page,
}, testInfo) => {
  const state = await mock(page, { basic: true })
  await page.addInitScript((config) => {
    localStorage.setItem('syndetis-maker-v1', JSON.stringify(config))
    localStorage.setItem('syndetis-active-plan-v2', 'MAKER')
  }, initialConfig)
  await enterMaker(page)
  await expect(page.getByRole('heading', { name: 'Como você quer criar sua loja?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Criar com IA', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Criar sozinho', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Usar template', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disponível no Maker', exact: true })).toHaveCount(
    2,
  )
  for (const button of await page
    .getByRole('button', { name: 'Disponível no Maker', exact: true })
    .all())
    await expect(button).toBeDisabled()
  await expect(page.getByRole('group', { name: 'Sua loja no notebook' })).toHaveCount(0)
  expect(await projectOf(page)).toBeNull()
  expect(state.storeWrites).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('maker-start-basic.png'), fullPage: true })
})

test('Básico aplica somente o template escolhido, vazio de produtos, e bloqueia estrutura', async ({
  page,
}) => {
  const state = await mock(page, { basic: true })
  await enterMaker(page)
  await page.getByRole('button', { name: 'Usar template', exact: true }).click()
  expect(await projectOf(page)).toBeNull()
  await page.getByRole('button', { name: 'Usar Editorial', exact: true }).click()
  const project = await projectOf(page)
  expect(project.config.template).toBe('editorial')
  expect(project.config.products).toEqual([])
  expect(project.config.categories).toEqual([])
  await expect(page.getByRole('button', { name: 'Adicionar', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Excluir seção', exact: true })).toBeDisabled()
  await page.getByLabel('Título da seção', { exact: true }).fill('Minha marca, do meu jeito')
  await expect(page.locator('.maker-canvas-surface')).toContainText('Minha marca, do meu jeito')
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await expect.poll(() => state.layoutWrites.length).toBe(1)
  expect(state.layoutWrites[0].body.sections).toHaveLength(3)
  expect(state.layoutWrites[0].version).toBe('"1"')
})

test('Maker livre nasce vazio, preserva o vazio após F5 e adiciona primeira seção', async ({
  page,
}, testInfo) => {
  const state = await mock(page)
  await enterMaker(page)
  await page.screenshot({ path: testInfo.outputPath('maker-start-maker.png'), fullPage: true })
  await page.getByRole('button', { name: 'Criar sozinho', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Sua página está em branco.', exact: true }),
  ).toBeVisible()
  expect((await projectOf(page)).config.components).toEqual([])
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await expect(
    page.getByText('Adicione uma seção visível antes de sincronizar ou publicar.', {
      exact: false,
    }),
  ).toBeVisible()
  expect(state.layoutWrites).toHaveLength(0)
  expect(state.storeWrites).toBe(0)
  await page.getByRole('button', { name: 'Visualizar', exact: true }).click()
  const emptyPreview = page.getByRole('dialog', { name: 'Visualizar sua loja', exact: true })
  await expect(emptyPreview.getByText('Sua página está em branco.', { exact: true })).toBeVisible()
  await expect(emptyPreview.locator('.store-nav')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(emptyPreview).toBeHidden()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Sua página está em branco.', exact: true }),
  ).toBeVisible()
  expect((await projectOf(page)).config.products).toEqual([])
  await page.getByRole('button', { name: 'Adicionar primeira seção', exact: true }).click()
  await page
    .locator('.catalog-item-card')
    .filter({ hasText: 'Hero Principal' })
    .getByRole('button', { name: 'Inserir', exact: true })
    .click()
  await expect.poll(async () => (await projectOf(page)).config.components.length).toBe(1)
  await expect(
    page.getByRole('heading', { name: 'Sua página está em branco.', exact: true }),
  ).toHaveCount(0)
})

test('dispositivos aparecem ao Visualizar, alternam notebook/tablet e fecham com Escape', async ({
  page,
}, testInfo) => {
  await mock(page)
  await enterMaker(page)
  await page.getByRole('button', { name: 'Usar template', exact: true }).click()
  await page.getByRole('button', { name: 'Usar Orgânico', exact: true }).click()
  await expect(page.locator('.macbook-pro')).toHaveCount(0)
  await page.getByRole('button', { name: 'Visualizar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Visualizar sua loja', exact: true })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('group', { name: 'Sua loja no notebook', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('maker-preview-notebook.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Tablet', exact: true }).click()
  await expect(dialog.getByRole('group', { name: 'Sua loja no tablet', exact: true })).toBeVisible()
  await expect(
    dialog.getByRole('group', { name: 'Sua loja no notebook', exact: true }),
  ).toHaveCount(0)
  const bounds = await dialog.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  const tabletBounds = await dialog
    .getByRole('group', { name: 'Sua loja no tablet', exact: true })
    .boundingBox()
  expect(tabletBounds!.y + tabletBounds!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height)
  await page.screenshot({ path: testInfo.outputPath('maker-preview-tablet.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Visualizar', exact: true })).toBeFocused()
})

test('IA abre briefing sem simular geração ou consumir franquia', async ({ page }) => {
  const state = await mock(page)
  await enterMaker(page)
  await page.getByRole('button', { name: 'Criar com IA', exact: true }).click()
  await page
    .getByLabel('Sua ideia para a loja', { exact: true })
    .fill('Uma marca de cerâmicas com tons naturais.')
  await expect(
    page.getByRole('button', { name: 'Gerar com IA · em integração', exact: true }),
  ).toBeDisabled()
  expect(state.aiCalls).toBe(0)
  await page.getByRole('button', { name: 'Continuar sozinho com esta ideia', exact: true }).click()
  expect((await projectOf(page)).config.description).toBe(
    'Uma marca de cerâmicas com tons naturais.',
  )
  expect((await projectOf(page)).config.components).toEqual([])
})

test('cota de IA esgotada bloqueia somente IA', async ({ page }) => {
  await mock(page, { quota: 0 })
  await enterMaker(page)
  await expect(
    page.getByRole('button', { name: 'Franquia diária esgotada', exact: true }),
  ).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Criar sozinho', exact: true })).toBeEnabled()
})

test('cadastro novo entra no início do Maker sem herdar rascunho de outra conta', async ({
  page,
}) => {
  await mock(page, { role: 'CUSTOMER', noStore: true, userId: 'new-account' })
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, mode: 'template', config })),
    { key: makerProjectKey(userId), config: initialConfig },
  )
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Marina')
  await page.getByLabel('Nome da sua loja (opcional)').fill('Marca Nova')
  await page.getByLabel('E-mail profissional').fill('nova@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/criar$/)
  await expect(page.getByRole('heading', { name: 'Como você quer criar sua loja?' })).toBeVisible()
  expect(await projectOf(page, 'new-account')).toBeNull()
  await page.getByRole('button', { name: 'Usar template', exact: true }).click()
  await expect(page.getByLabel('Nome da sua loja', { exact: true })).toHaveValue('Marca Nova')
})

test('downgrade preserva rascunho livre e exige template antes de voltar ao editor', async ({
  page,
}) => {
  const state = await mock(page)
  await enterMaker(page)
  await page.getByRole('button', { name: 'Criar sozinho', exact: true }).click()
  state.basic = true
  await page.reload()
  await expect(
    page.getByText('Seu rascunho personalizado está preservado.', { exact: false }),
  ).toBeVisible()
  expect((await projectOf(page)).mode).toBe('blank')
  await page.getByRole('button', { name: 'Usar template', exact: true }).click()
  await page.getByRole('button', { name: 'Usar Essencial', exact: true }).click()
  expect((await projectOf(page)).mode).toBe('template')
  const previous = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('syndetis-maker-previous:maker-account-a') || 'null'),
  )
  expect(previous.mode).toBe('blank')
})

test('falha ao consultar o plano não libera modos avançados', async ({ page }) => {
  const state = await mock(page)
  state.failLimits = true
  await enterMaker(page)
  await expect(page.getByRole('alert')).toHaveText('Plano temporariamente indisponível.')
  await expect(page.getByRole('button', { name: 'Criar sozinho', exact: true })).toHaveCount(0)
  state.failLimits = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Como você quer criar sua loja?' })).toBeVisible()
})

test('entrada e prévia funcionam no celular com acessibilidade', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mock(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await enterMaker(page)
  await expect(page.getByRole('heading', { name: 'Como você quer criar sua loja?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('maker-start-mobile.png'), fullPage: true })
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown,
          ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>
        }
      }
    ).axe
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
    return result.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    }))
  })
  expect(violations).toEqual([])
  expect(errors).toEqual([])
})

test('adaptação ao Básico preserva catálogo do rascunho personalizado', async ({ page }) => {
  await mock(page, { basic: true })
  const config = createMakerDraft('Minha marca', 'editorial')
  config.components!.push({
    id: 'extra',
    type: 'newsletter',
    title: 'Novidades',
    subtitle: '',
    variant: 'minimal',
    visible: true,
  })
  config.products = [
    {
      id: 'p1',
      name: 'Produto da marca',
      slug: 'produto',
      categoryId: 'c1',
      price: 80,
      stock: 1,
      sku: 'P1',
      image: '',
      featured: true,
    },
  ]
  config.categories = [
    { id: 'c1', name: 'Coleção', slug: 'colecao', description: '', featured: true },
  ]
  await page.addInitScript(({ key, draft }) => localStorage.setItem(key, JSON.stringify(draft)), {
    key: makerProjectKey(userId),
    draft: { version: 1, mode: 'template', config, storeId: store.id },
  })
  await enterMaker(page)
  await expect(
    page.getByText('Seu rascunho personalizado está preservado.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Usar template', exact: true }).click()
  await page.getByRole('button', { name: 'Usar Orgânico', exact: true }).click()
  const adapted = await projectOf(page)
  expect(adapted.config.components).toHaveLength(3)
  expect(adapted.config.products).toHaveLength(1)
  expect(adapted.config.categories).toHaveLength(1)
})
