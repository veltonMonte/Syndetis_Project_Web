import type { Layout } from '../src/lib/types'
import { createRequire } from 'node:module'
import { test, expect, type Page } from '@playwright/test'
import { createMakerDraft, makerProjectKey } from '../src/lib/maker-project'
import { initialConfig, templates } from '../src/lib/maker'

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
  return {
    accessToken: `test.${claims}.signature`,
    refreshToken: 'maker-refresh',
    expiresIn: 600,
  }
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
    layoutWrites: [] as { path: string; body: Layout; version?: string }[],
    aiCalls: 0,
    publishWrites: 0,
    publishVersions: [] as (string | undefined)[],
    failPublish: false,
    publishDelayMs: 0,
    publishPending: false,
    failLayout: false,
    saveDelayMs: 0,
    activeWrites: 0,
    maxActiveWrites: 0,
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
    } else if (path === '/api/core/stores/me')
      body = options.noStore ? [] : [store]
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
    } else if (path.endsWith('/layout/publish')) {
      if (state.failPublish) { await route.fulfill({status:503,json:{detail:'Publicação indisponível.'}}); return }
      state.publishPending = true
      if (state.publishDelayMs) await new Promise(resolve=>setTimeout(resolve,state.publishDelayMs))
      state.publishPending = false
      state.publishWrites++
      state.publishVersions.push(req.headers()['if-match'])
      body = {version:3}
    } else if (path.endsWith('/layout') && req.method() === 'PUT') {
      if (state.failLayout) { await route.fulfill({status:503,json:{detail:'Falha temporária ao salvar.'}}); return }
      state.activeWrites++
      state.maxActiveWrites=Math.max(state.maxActiveWrites,state.activeWrites)
      if(state.saveDelayMs)await new Promise(resolve=>setTimeout(resolve,state.saveDelayMs))
      state.activeWrites--
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
      await route.fulfill({
        status: 404,
        json: { detail: `Unexpected test endpoint: ${path}` },
      })
      return
    }
    await route.fulfill({ json: body })
  })
  return state
}
async function openVisualGuide(page: Page) {
  await page.getByRole('button',{name:'Usar template',exact:true}).click()
  await page.getByRole('button',{name:'Escolher visual',exact:true}).click()
}
async function finishGuide(page: Page) {
  await page.getByRole('button',{name:'Abrir minha loja no Maker',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Editor da loja',exact:true})).toBeVisible()
}
async function syncDraft(page: Page) {
  const more=page.getByRole('button',{name:'Mais ferramentas',exact:true})
  if(await more.getAttribute('aria-expanded')!=='true')await more.click()
  await page.getByRole('button',{name:'Sincronizar agora',exact:true}).click()
  await expect(page.getByText(/^(Rascunho sincronizado|Rascunho salvo localmente)$/)).toBeVisible()
}
async function publishStore(page: Page) {
  await page.getByRole('button',{name:'Publicar Loja',exact:true}).click()
  await page.getByRole('button',{name:'Confirmar publicação',exact:true}).click()
}

async function enterMaker(page: Page) {
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('maker@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page
    .getByRole('button', { name: 'Entrar na minha conta', exact: true })
    .click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await page.goto('/#/criar')
  const notice = page.getByRole('button', {
    name: 'Dismiss notification',
    exact: true,
  })
  if (await notice.isVisible()) {
    await notice.click()
    await expect(notice).toBeHidden()
  }
}
const projectOf = (page: Page, id = userId) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || 'null'),
    makerProjectKey(id),
  )

test('Maker novo começa pela escolha e ignora loja de demonstração e plano local', async ({
  page,
}, testInfo) => {
  const state = await mock(page, { basic: true })
  await page.addInitScript((config) => {
    localStorage.setItem('syndetis-maker-v1', JSON.stringify(config))
    localStorage.setItem('syndetis-active-plan-v2', 'MAKER')
  }, initialConfig)
  await enterMaker(page)
  await expect(
    page.getByRole('heading', { name: 'Como você quer criar sua loja?' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Criar com IA', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Criar sozinho', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Usar template', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Disponível no Maker', exact: true }),
  ).toHaveCount(2)
  for (const button of await page
    .getByRole('button', { name: 'Disponível no Maker', exact: true })
    .all())
    await expect(button).toBeDisabled()
  await expect(
    page.getByRole('group', { name: 'Sua loja no notebook' }),
  ).toHaveCount(0)
  expect(await projectOf(page)).toBeNull()
  expect(state.storeWrites).toBe(0)
  await page.screenshot({
    path: testInfo.outputPath('maker-start-basic.png'),
    fullPage: true,
  })
})

test('Básico aplica somente o template escolhido, vazio de produtos, e bloqueia estrutura', async ({
  page,
}) => {
  const state = await mock(page, { basic: true })
  await enterMaker(page)
  await openVisualGuide(page)
  expect(await projectOf(page)).toBeNull()
  await page.getByRole('button', { name: 'Usar Linha', exact: true }).click()
  await finishGuide(page)
  const project = await projectOf(page)
  expect(project.config.template).toBe('linha')
  expect(project.config.products).toEqual([])
  expect(project.config.categories).toEqual([])
  await page.getByRole('button',{name:'Sua página',exact:true}).click()
  await expect(page.getByRole('button',{name:'Adicionar seção',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Mais opções desta seção',exact:true}).click()
  await expect(page.getByRole('button',{name:'Excluir seção',exact:true})).toBeDisabled()
  await page
    .getByLabel('Título da seção', { exact: true })
    .fill('Minha marca, do meu jeito')
  await expect(page.locator('.maker-canvas-surface')).toContainText(
    'Minha marca, do meu jeito',
  )
  await syncDraft(page)
  await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  expect(state.layoutWrites.at(-1)!.body.sections).toHaveLength(5)
  expect(state.layoutWrites.at(-1)!.version).toBe('"1"')
})

test('Maker livre nasce vazio, preserva o vazio após F5 e adiciona primeira seção', async ({
  page,
}, testInfo) => {
  const state = await mock(page)
  await enterMaker(page)
  await page.screenshot({
    path: testInfo.outputPath('maker-start-maker.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Criar sozinho', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Sua página está em branco.',
      exact: true,
    }),
  ).toBeVisible()
  expect((await projectOf(page)).config.components).toEqual([])
  await syncDraft(page)
  await expect(
    page.getByText(
      'Adicione uma seção visível antes de sincronizar ou publicar.',
      {
        exact: false,
      },
    ).first(),
  ).toBeVisible()
  expect(state.layoutWrites).toHaveLength(0)
  expect(state.storeWrites).toBe(0)
  await page.getByRole('button', { name: 'Visualizar', exact: true }).click()
  const emptyPreview = page.getByRole('dialog', {
    name: 'Visualizar sua loja',
    exact: true,
  })
  await expect(
    emptyPreview.getByText('Sua página está em branco.', { exact: true }),
  ).toBeVisible()
  await expect(emptyPreview.locator('.store-nav')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(emptyPreview).toBeHidden()
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Sua página está em branco.',
      exact: true,
    }),
  ).toBeVisible()
  expect((await projectOf(page)).config.products).toEqual([])
  await page
    .getByRole('button', { name: 'Adicionar primeira seção', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Inserir Topo da loja', exact: true })
    .click()
  await expect
    .poll(async () => (await projectOf(page)).config.components.length)
    .toBe(2)
  await expect(
    page.getByRole('heading', {
      name: 'Sua página está em branco.',
      exact: true,
    }),
  ).toHaveCount(0)
})

test('dispositivos aparecem ao Visualizar, alternam notebook/tablet e fecham com Escape', async ({
  page,
}, testInfo) => {
  await mock(page)
  await enterMaker(page)
  await openVisualGuide(page)
  await page.getByRole('button', { name: 'Usar Forma', exact: true }).click()
  await finishGuide(page)
  await expect(page.locator('.macbook-pro')).toHaveCount(0)
  await page.getByRole('button', { name: 'Visualizar', exact: true }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Visualizar sua loja',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('group', { name: 'Sua loja no notebook', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('maker-preview-notebook.png'),
    fullPage: true,
  })
  await dialog.getByRole('button', { name: 'Tablet', exact: true }).click()
  await expect(
    dialog.getByRole('group', { name: 'Sua loja no tablet', exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByRole('group', { name: 'Sua loja no notebook', exact: true }),
  ).toHaveCount(0)
  const bounds = await dialog.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  )
  const tabletBounds = await dialog
    .getByRole('group', { name: 'Sua loja no tablet', exact: true })
    .boundingBox()
  expect(tabletBounds!.y + tabletBounds!.height).toBeLessThanOrEqual(
    bounds!.y + bounds!.height,
  )
  await page.screenshot({
    path: testInfo.outputPath('maker-preview-tablet.png'),
    fullPage: true,
  })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Visualizar', exact: true }),
  ).toBeFocused()
})

test('IA abre briefing sem simular geração ou consumir franquia', async ({
  page,
}) => {
  const state = await mock(page)
  await enterMaker(page)
  await page.getByRole('button', { name: 'Criar com IA', exact: true }).click()
  await page
    .getByLabel('Sua ideia para a loja', { exact: true })
    .fill('Uma marca de cerâmicas com tons naturais.')
  await expect(
    page.getByRole('button', {
      name: 'Gerar com IA · em integração',
      exact: true,
    }),
  ).toBeDisabled()
  expect(state.aiCalls).toBe(0)
  await page
    .getByRole('button', {
      name: 'Continuar sozinho com esta ideia',
      exact: true,
    })
    .click()
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
  await expect(
    page.getByRole('button', { name: 'Criar sozinho', exact: true }),
  ).toBeEnabled()
})

test('cadastro novo entra no início do Maker sem herdar rascunho de outra conta', async ({
  page,
}) => {
  await mock(page, { role: 'CUSTOMER', noStore: true, userId: 'new-account' })
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, mode: 'template', config }),
      ),
    { key: makerProjectKey(userId), config: initialConfig },
  )
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Marina')
  await page.getByLabel('Nome da sua loja (opcional)').fill('Marca Nova')
  await page.getByLabel('E-mail profissional').fill('nova@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page
    .getByRole('button', { name: 'Criar minha conta', exact: true })
    .click()
  await expect(page).toHaveURL(/#\/criar$/)
  await expect(
    page.getByRole('heading', { name: 'Como você quer criar sua loja?' }),
  ).toBeVisible()
  expect(await projectOf(page, 'new-account')).toBeNull()
  await openVisualGuide(page)
  await page.getByRole('button',{name:'Usar Linha',exact:true}).click()
  await expect(
    page.getByLabel('Nome da sua loja', { exact: true }),
  ).toHaveValue('Marca Nova')
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
    page.getByText('Seu rascunho personalizado está preservado.', {
      exact: false,
    }),
  ).toBeVisible()
  expect((await projectOf(page)).mode).toBe('blank')
  await openVisualGuide(page)
  await page
    .getByRole('button', { name: 'Usar Essencial', exact: true })
    .click()
  await finishGuide(page)
  expect((await projectOf(page)).mode).toBe('template')
  const previous = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('syndetis-maker-previous:maker-account-a') || 'null',
    ),
  )
  expect(previous.mode).toBe('blank')
})

test('falha ao consultar o plano não libera modos avançados', async ({
  page,
}) => {
  const state = await mock(page)
  state.failLimits = true
  await enterMaker(page)
  await expect(page.getByRole('alert')).toHaveText(
    'Plano temporariamente indisponível.',
  )
  await expect(
    page.getByRole('button', { name: 'Criar sozinho', exact: true }),
  ).toHaveCount(0)
  state.failLimits = false
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Como você quer criar sua loja?' }),
  ).toBeVisible()
})

test('entrada e prévia funcionam no celular com acessibilidade', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mock(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await enterMaker(page)
  await expect(
    page.getByRole('heading', { name: 'Como você quer criar sua loja?' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath('maker-start-mobile.png'),
    fullPage: true,
  })
  await page.addScriptTag({
    path: createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  })
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown,
          ) => Promise<{
            violations: { id: string; nodes: { target: string[] }[] }[]
          }>
        }
      }
    ).axe
    const result = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    })
    return result.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    }))
  })
  expect(violations).toEqual([])
  expect(errors).toEqual([])
})

test('adaptação ao Básico preserva catálogo do rascunho personalizado', async ({
  page,
}) => {
  await mock(page, { basic: true })
  const config = createMakerDraft('Minha marca', 'linha')
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
    {
      id: 'c1',
      name: 'Coleção',
      slug: 'colecao',
      description: '',
      featured: true,
    },
  ]
  await page.addInitScript(
    ({ key, draft }) => localStorage.setItem(key, JSON.stringify(draft)),
    {
      key: makerProjectKey(userId),
      draft: { version: 1, mode: 'template', config, storeId: store.id },
    },
  )
  await enterMaker(page)
  await expect(
    page.getByText('Seu rascunho personalizado está preservado.', {
      exact: false,
    }),
  ).toBeVisible()
  await openVisualGuide(page)
  await page.getByRole('button', { name: 'Usar Forma', exact: true }).click()
  await finishGuide(page)
  const adapted = await projectOf(page)
  expect(adapted.config.components).toHaveLength(6)
  expect(adapted.config.products).toHaveLength(1)
  expect(adapted.config.categories).toHaveLength(1)
})


function previewStyle(node: Element) {
  const style = getComputedStyle(node)
  return {
    width: node.clientWidth, background: style.backgroundColor, bodyFont: style.fontFamily,
    headingFont: style.getPropertyValue('--shop-heading-font').trim(),
    action: style.getPropertyValue('--shop-action').trim(),
    layout: node.getAttribute('data-motion-layout'),
    sections: Array.from(node.querySelectorAll('.shop-viewport .shop-section')).map(section=>section.getAttribute('data-section-type')),
    heroClass: node.querySelector('[data-section-type="hero"] > div:not(.shop-section-edit):not(.maker-floating-tools)')?.className,
  }
}

for (const template of templates) {
  test(`prévia de ${template.name} mostra o layout responsivo sem criar rascunho`, async ({
    page,
  }, testInfo) => {
    await page.goto('/#/')
    await page
      .getByRole('button', {
        name: `Pré-visualizar ${template.name}`,
        exact: true,
      })
      .click()
    const dialog = page.getByRole('dialog', {
      name: `Prévia de ${template.name}`,
      exact: true,
    })
    await expect(dialog).toBeVisible()
    const preview = dialog.locator('.shop-template')
    await expect(preview).toHaveAttribute('data-store-template', template.id)
    // The gallery shows the store the Maker starts with: no sample products or cart.
    await expect(preview.locator('.shop-product')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /^Sacola/ })).toHaveCount(0)
    await expect(dialog).toContainText('Produtos, categorias e imagens você adiciona no Maker')
    await expect(dialog).not.toContainText('Loja verificada')
    await expect(dialog).not.toContainText('CNPJ')
    expect(await projectOf(page)).toBeNull()
    await dialog.getByRole('radio', { name: 'Celular', exact: true }).click()
    await expect(dialog.locator('.template-inspection')).toHaveAttribute(
      'data-device',
      'phone',
    )
    const overflow = await preview.evaluate(
      (node) => node.scrollWidth > node.clientWidth,
    )
    expect(overflow).toBe(false)
    await expect
      .poll(() =>
        dialog.evaluate((node) => Number(getComputedStyle(node).opacity)),
      )
      .toBe(1)
    await page.addScriptTag({
      path: createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
    })
    const violations = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: {
            run: (
              context: Element,
              options: unknown,
            ) => Promise<{ violations: { id: string }[] }>
          }
        }
      ).axe
      return (
        await axe.run(document.querySelector('[role="dialog"]')!, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        })
      ).violations.map((item) => item.id)
    })
    expect(violations).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath(`template-${template.id}-phone.png`),
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole('button', {
        name: `Pré-visualizar ${template.name}`,
        exact: true,
      }),
    ).toBeFocused()
  })
  test(`Básico salva ${template.name} com identidade e estrutura próprias`, async ({
    page,
  }) => {
    const state = await mock(page, { basic: true })
    await enterMaker(page)
    await openVisualGuide(page)
    const cardStyle = await page.locator('.template-thumbnail .shop-template[data-store-template="'+template.id+'"]').evaluate(previewStyle)
    await page
      .getByRole('button', { name: `Usar ${template.name}`, exact: true })
      .click()
    await finishGuide(page)
    expect(await page.locator('.maker-canvas-surface .shop-template').evaluate(previewStyle)).toEqual(cardStyle)
    const project = await projectOf(page)
    expect(
      project.config.components.map(
        (section: { type: string }) => section.type,
      ),
    ).toEqual(template.sections)
    expect(project.config.products).toEqual([])
    expect(project.config.categories).toEqual([])
    await syncDraft(page)
    await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
    expect(state.layoutWrites.at(-1)!.body.templateId).toBe(template.id)
    expect(state.layoutWrites.at(-1)!.body.theme.backgroundColor).toBe(
      template.background,
    )
    expect(
      state.layoutWrites.at(-1)!.body.sections.map((section) => section.type),
    ).toEqual(
      template.sections.map(
        (type) =>
          ({
            announcement: 'banner',
            hero: 'hero',
            categories: 'category-list',
            products: 'product-grid',
            'editorial-banner': 'banner',
            'product-detail': 'product-detail',
            benefits: 'text',
            footer: 'footer',
          })[type],
      ),
    )
    await page.reload()
    await expect(
      page.locator('.maker-canvas-surface .shop-template'),
    ).toHaveAttribute('data-store-template', template.id)
    expect((await projectOf(page)).config.products).toEqual([])
  })
}

test('imagem, logo, fonte e conteúdo da marca acompanham o salvamento e a troca de modelo', async ({
  page,
}) => {
  const state = await mock(page, { basic: true })
  await enterMaker(page)
  await openVisualGuide(page)
  await page.getByRole('button', { name: 'Usar Linha', exact: true }).click()
  await finishGuide(page)
  const project = await projectOf(page)
  project.config.categories = [
    {
      id: 'c1',
      name: 'Minha coleção',
      slug: 'minha-colecao',
      description: '',
      featured: true,
    },
  ]
  project.config.products = [
    {
      id: 'p1',
      name: 'Meu produto',
      slug: 'meu-produto',
      categoryId: 'c1',
      price: 42,
      stock: 2,
      sku: '001',
      image: '',
      featured: true,
    },
  ]
  await page.evaluate(
    ({ key, project }) => localStorage.setItem(key, JSON.stringify(project)),
    { key: makerProjectKey(userId), project },
  )
  await page.reload()
  await page.getByRole('button', { name: /^Editar Uma nova forma/ }).click()
  await page
    .getByLabel('Título da seção', { exact: true })
    .fill('Minha coleção, minha identidade')
  await page
    .getByLabel('Imagem de destaque (URL)', { exact: true })
    .fill('https://example.test/hero.png')
  await page
    .getByLabel('Descrição da imagem', { exact: true })
    .fill('Foto da minha coleção')
  await page.getByRole('button', { name: 'Sua marca', exact: true }).click()
  await page
    .getByLabel('Logo da loja (URL)', { exact: true })
    .fill('https://example.test/logo.png')
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await page.getByRole('combobox',{name:'Par de fontes',exact:true}).click()
  await page.getByRole('option',{name:'Newsreader / Figtree',exact:true}).click()
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await page.getByRole('button',{name:'Trocar visual',exact:true}).click()
  await page.getByRole('button', { name: 'Usar Forma', exact: true }).click()
  await expect(page.locator('.maker-canvas-surface')).toContainText(
    'Minha coleção, minha identidade',
  )
  await expect(page.locator('.maker-canvas-surface')).toContainText(
    'Meu produto',
  )
  await syncDraft(page)
  await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  const payload = state.layoutWrites.at(-1)!.body
  expect(payload.templateId).toBe('forma')
  expect(payload.theme.headingFontFamily).toBe('Newsreader, Georgia, serif')
  expect(payload.theme.logoUrl).toBe('https://example.test/logo.png')
  expect(
    payload.sections.find((section) => section.type === 'hero'),
  ).toMatchObject({
    title: 'Minha coleção, minha identidade',
    imageUrl: 'https://example.test/hero.png',
    imageAlt: 'Foto da minha coleção',
  })
  expect((await projectOf(page)).config.products).toHaveLength(1)
  const previous = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('syndetis-maker-previous:maker-account-a') || 'null',
    ),
  )
  expect(previous.config.template).toBe('linha')
  expect(previous.config.branding.headingFontFamily).toBe('Newsreader, Georgia, serif')
  expect(previous.config.branding.bodyFontFamily).toBe('Figtree, Segoe UI, sans-serif')
})

test('rascunho legado do Básico continua abrindo e salvando no template ecommerce', async ({
  page,
}) => {
  const state = await mock(page, { basic: true })
  const config = createMakerDraft('Marca existente', 'linha')
  config.template = 'organico'
  config.components = config.components!.filter((section) =>
    ['hero', 'products', 'footer'].includes(section.type),
  )
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, mode: 'template', config }),
      ),
    { key: makerProjectKey(userId), config },
  )
  await enterMaker(page)
  await expect(page.locator('.maker-canvas-surface')).toContainText(
    'Marca existente',
  )
  await syncDraft(page)
  await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  expect(state.layoutWrites.at(-1)!.body.templateId).toBe('ecommerce')
  expect(
    state.layoutWrites.at(-1)!.body.sections.map((section) => section.type),
  ).toEqual(['hero', 'product-grid', 'footer'])
})

test('Básico vincula um produto real do rascunho ao destaque premium e preserva após F5', async ({
  page,
}) => {
  const state = await mock(page, { basic: true })
  const config = createMakerDraft('Marca existente', 'presenca')
  config.products = [1, 2].map((number) => ({
    id: 'real-' + number,
    name: 'Produto cadastrado ' + number,
    slug: 'produto-' + number,
    categoryId: '',
    price: 42 * number,
    stock: 2,
    sku: 'P' + number,
    image: '',
    featured: true,
  }))
  await page.addInitScript(
    ({ key, config }) =>
      !localStorage.getItem(key) &&
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, mode: 'template', config }),
      ),
    { key: makerProjectKey(userId), config },
  )
  await enterMaker(page)
  await page
    .getByRole('button', { name: 'Editar Conheça os detalhes', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Produto em destaque', exact: true })
    .click()
  await page
    .getByRole('option', { name: 'Produto cadastrado 2', exact: true })
    .click()
  await expect(page.locator('.shop-detail-info h4')).toHaveText(
    'Produto cadastrado 2',
  )
  await syncDraft(page)
  await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  expect(
    state.layoutWrites.at(-1)!.body.sections.find(
      (section) => section.type === 'product-detail',
    )?.productId,
  ).toBe('real-2')
  await page.reload()
  await expect(page.locator('.shop-detail-info h4')).toHaveText(
    'Produto cadastrado 2',
  )
  expect((await projectOf(page)).config.products).toHaveLength(2)
})

test('Coleção Movimento contém seis modelos adicionais e respeita movimento reduzido', async ({
  page,
}, testInfo) => {
  const motion = templates.filter(
    (template) => template.collection === 'movimento',
  )
  expect(motion.map((template) => template.id)).toEqual([
    'pulso',
    'ambar',
    'aurora',
    'prisma',
    'vetor',
    'eon',
  ])
  expect(templates.filter((template) => !template.collection)).toHaveLength(3)
  expect(
    templates.filter((template) => template.collection === 'premium'),
  ).toHaveLength(3)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/')
  await page
    .getByRole('button', { name: 'Pré-visualizar Pulso', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Prévia de Pulso',
    exact: true,
  })
  const hero = dialog.locator('.motion-hero')
  await expect(hero).toHaveAttribute('data-paused', 'true')
  // No sample artwork: the hero starts empty, waiting for the merchant's own images.
  await expect(hero.locator('.shop-image')).toHaveCount(0)
  await expect(hero.locator('.motion-empty')).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Retomar animações da vitrine', exact: true })
    .click()
  await expect(hero).not.toHaveAttribute('data-paused')
  await dialog
    .getByRole('button', { name: 'Pausar animações da vitrine', exact: true })
    .click()
  await expect(hero).toHaveAttribute('data-paused', 'true')
  await page.screenshot({
    path: testInfo.outputPath('motion-collection-desktop.png'),
    fullPage: true,
  })
  await dialog.getByRole('radio', { name: 'Celular', exact: true }).click()
  expect(
    await hero.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath('motion-collection-phone.png'),
    fullPage: true,
  })
})

test('Básico escolhe três produtos próprios na composição sem receber imagens ou produtos de demonstração', async ({
  page,
}) => {
  const state = await mock(page, { basic: true })
  const config = createMakerDraft('Minha marca', 'pulso')
  expect(config.products).toEqual([])
  expect(
    config.components!.find((section) => section.type === 'hero')?.imageUrl,
  ).toBeUndefined()
  config.products = [1, 2, 3].map((number) => ({
    id: 'own-' + number,
    name: 'Produto próprio ' + number,
    slug: 'produto-' + number,
    categoryId: '',
    price: 50,
    stock: 4,
    sku: 'P' + number,
    image: '/images/oliva-ceramics.png',
    featured: true,
  }))
  await page.addInitScript(
    ({ key, config }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, mode: 'template', config }),
        )
    },
    { key: makerProjectKey(userId), config },
  )
  await enterMaker(page)
  await expect(page.locator('.motion-product-cutout')).toHaveCount(3)
  await page.getByRole('button', { name: /Editar Feito para/ }).click()
  await page.getByRole('button',{name:'Usar fotos do catálogo',exact:true}).click()
  for (const [slot, number] of [
    [1, 3],
    [2, 1],
    [3, 2],
  ]) {
    await page
      .getByRole('combobox', {
        name: `Produto ${slot} da composição`,
        exact: true,
      })
      .click()
    await page
      .getByRole('option', { name: `Produto próprio ${number}`, exact: true })
      .click()
  }
  await syncDraft(page)
  await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  expect(state.layoutWrites.at(-1)!.body.templateId).toBe('pulso')
  expect(
    state.layoutWrites.at(-1)!.body.sections.find(
      (section) => section.type === 'hero',
    )?.productIds,
  ).toEqual(['own-3', 'own-1', 'own-2'])
  await page.reload()
  await expect(
    page.locator('.motion-product-cutout img').first(),
  ).toHaveAttribute('alt', 'Produto próprio 3')
  expect((await projectOf(page)).config.products).toHaveLength(3)
})

test('galeria mantém cards iguais entre coleções e seis arquiteturas novas distintas', async ({ page }) => {
  const motion = templates.filter(template => template.collection === 'movimento')
  expect(new Set(motion.map(template => template.cinematic?.layout)).size).toBe(6)
  expect(new Set(motion.map(template => template.sections.join(','))).size).toBe(6)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await mock(page, { basic: true })
  await enterMaker(page)
  await page.goto('/#/modelos')
  await expect(page.locator('.template-thumbnail')).toHaveCount(12)
  await page.evaluate(() => document.fonts.ready)
  const sizes = await page.locator('.template-thumbnail').evaluateAll(nodes => nodes.map(node => ({
    media: node.clientHeight,
    width: node.clientWidth,
    card: (node.closest('.echo-card') as HTMLElement).offsetHeight,
  })))
  expect(new Set(sizes.map(size => Math.round(size.media))).size).toBe(1)
  expect(Math.max(...sizes.map(size => size.width)) - Math.min(...sizes.map(size => size.width))).toBeLessThanOrEqual(1)
  expect(Math.max(...sizes.map(size => size.card)) - Math.min(...sizes.map(size => size.card))).toBeLessThanOrEqual(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Prisma aceita fotografia opaca e preserva enquadramento e características ao salvar', async ({ page }) => {
  const state = await mock(page, { basic: true })
  const config = createMakerDraft('Minha marca', 'prisma')
  await page.route('https://example.test/photo.jpg', route => route.fulfill({
    contentType: 'image/png',
    path: 'public/images/oliva-ceramics.png',
  }))
  await page.addInitScript(({ key, config }) => {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, JSON.stringify({ version: 1, mode: 'template', config }))
  }, { key: makerProjectKey(userId), config })
  await enterMaker(page)
  await page.getByRole('button', { name: /Editar Leve em/ }).click()
  await page.getByLabel('Imagem de destaque (URL)', { exact: true }).fill('https://example.test/photo.jpg')
  await page.getByLabel('Descrição da imagem', { exact: true }).fill('Minha fotografia com fundo')
  await page.getByRole('button',{name:'Enquadramento e características',exact:true}).click()
  await page.getByRole('combobox', { name: 'Apresentação da imagem', exact: true }).click()
  await page.getByRole('option', { name: 'Fotografia com fundo', exact: true }).click()
  await page.getByRole('combobox', { name: 'Enquadramento da foto', exact: true }).click()
  await page.getByRole('option', { name: 'Preencher quadro', exact: true }).click()
  await page.getByLabel('Característica 1', { exact: true }).fill('Material')
  await page.getByLabel('Valor 1', { exact: true }).fill('Cerâmica')
  const hero = page.locator('.maker-canvas-surface .showcase-technical')
  await expect(hero).toHaveAttribute('data-image-mode', 'photo')
  const image = hero.getByAltText('Minha fotografia com fundo', { exact: true })
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(image).toHaveCSS('object-fit', 'cover')
  await expect(hero).toContainText('Cerâmica')
  await syncDraft(page)
  await expect.poll(() => state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  const saved = state.layoutWrites.at(-1)!.body.sections.find(section => section.type === 'hero')!
  expect(saved).toMatchObject({
    imagePresentation: 'photo',
    imageFit: 'cover',
    imageUrl: 'https://example.test/photo.jpg',
    facts: [{ label: 'Material', value: 'Cerâmica' }, { label: '', value: '' }, { label: '', value: '' }],
  })
  await page.reload()
  await expect(page.locator('.showcase-technical')).toHaveAttribute('data-image-mode', 'photo')
  await expect(page.getByAltText('Minha fotografia com fundo', { exact: true })).toHaveCSS('object-fit', 'cover')
  await expect(page.locator('.showcase-technical')).toContainText('Cerâmica')
  expect((await projectOf(page)).config.products).toEqual([])
})

test('Vetor começa pelo catálogo, vazio e sem produtos de exemplo', async ({ page }) => {
  await page.goto('/#/')
  await page.getByRole('button', { name: 'Pré-visualizar Vetor', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Prévia de Vetor', exact: true })
  const preview = dialog.locator('.shop-template')
  await expect(preview).toHaveAttribute('data-motion-layout', 'catalog')
  await expect(preview.locator('.shop-product')).toHaveCount(0)
  await expect(preview).toContainText('Seu catálogo está vazio')
  await expect(preview).not.toContainText('Produto de exemplo')
})


test('fase 1: tokens, fontes e link são persistidos no Básico e no contrato publicado', async ({page},testInfo) => {
  const state = await mock(page,{basic:true})
  const config = createMakerDraft('Marca Clara','linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await page.setViewportSize({width:1610,height:1000})
  await enterMaker(page)
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await page.getByLabel('Cor principal',{exact:true}).fill('#2457a7')
  await page.getByRole('button',{name:'Mais opções de aparência',exact:true}).click()
  await page.getByLabel('Fundo da loja',{exact:true}).fill('#fafafa')
  await expect.poll(async()=>(await projectOf(page)).config.branding.backgroundColor).toBe('#fafafa')
  await page.getByRole('combobox',{name:'Par de fontes',exact:true}).click()
  await page.getByRole('option',{name:'Newsreader / Figtree',exact:true}).click()
  await expect.poll(async()=>(await projectOf(page)).config.branding.backgroundColor).toBe('#fafafa')
  await page.getByRole('button',{name:'Sua página',exact:true}).click()
  await page.getByRole('button',{name:/Editar Uma nova forma/}).click()
  await page.getByLabel('Título da seção',{exact:true}).fill('Uma loja com a sua identidade')
  await page.getByRole('button',{name:'Destino do botão',exact:true}).click()
  await page.getByLabel('Endereço do botão',{exact:true}).fill('https://example.test/colecao')
  await syncDraft(page)
  await expect.poll(()=>state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  expect(state.layoutWrites.at(-1)!.body.theme).toMatchObject({primaryColor:'#2457a7',backgroundColor:'#fafafa',bodyFontFamily:'Figtree, Segoe UI, sans-serif'})
  expect(state.layoutWrites.at(-1)!.body.sections.find(section=>section.type==='hero')).toMatchObject({buttonUrl:'https://example.test/colecao',editorType:'hero'})
  const project = await projectOf(page)
  expect(project.editorDocument.schemaVersion).toBe(1)
  expect(project.editorDocument.page.sections.find((section:{type:string})=>section.type==='hero').blocks[0].props.text).toBe('Uma loja com a sua identidade')
  await page.screenshot({path:testInfo.outputPath('visual-maker-desktop.png'),fullPage:true})
  await page.reload()
  await expect(page.locator('.shop-hero h3')).toHaveText('Uma loja com a sua identidade')
  await page.getByRole('group',{name:'Dispositivo do canvas',exact:true}).getByRole('button',{name:'Celular',exact:true}).click()
  await expect(page.locator('.maker-canvas-stage')).toHaveAttribute('data-canvas-device','phone')
  await expect(page.locator('.maker-canvas-surface')).toHaveCSS('width','390px')
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({path:testInfo.outputPath('visual-maker-mobile.png'),fullPage:true})
})

test('fase 1: reordenação por arraste e teclado preserva o rodapé de sistema',async({page})=>{
  await page.setViewportSize({width:1610,height:1600})
  await mock(page)
  const config=createMakerDraft('Marca Livre','linha')
  await page.addInitScript(({key,config})=>localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config})),{key:makerProjectKey(userId),config})
  await enterMaker(page)
  await page.getByRole('button',{name:'Sua página',exact:true}).click()
  await page.getByRole('button',{name:'Organizar seções',exact:true}).click()
  const rows=page.locator('.component-layer-row')
  await rows.nth(1).focus()
  await rows.nth(1).press('Alt+ArrowDown')
  await expect.poll(async()=> (await projectOf(page)).config.components[2].type).toBe('hero')
  await expect(rows.nth(2)).toContainText('Topo da loja')
  await rows.filter({hasText:'Topo da loja'}).locator('.layer-grip').dragTo(rows.filter({hasText:'Faixa de aviso'}).locator('.layer-grip'))
  await expect.poll(async()=> (await projectOf(page)).config.components[0].type).toBe('hero')
  const footer=rows.filter({hasText:'Sistema'})
  await footer.getByRole('button').first().click()
  await expect(footer.getByRole('button',{name:'Ocultar componente',exact:true})).toBeDisabled()
  await expect(footer.getByRole('button',{name:'Excluir componente',exact:true})).toBeDisabled()
})

test('fase 1: publicação depende do servidor e libera o link só após sucesso',async({page})=>{
  const state=await mock(page)
  const config=createMakerDraft('Marca Publicada','linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await enterMaker(page)
  state.failPublish=true
  await publishStore(page)
  await expect(page.getByText('Não foi possível publicar a loja',{exact:true})).toBeVisible()
  expect((await projectOf(page)).config.settings.published).toBe(false)
  await page.getByRole('button',{name:'Mais ferramentas',exact:true}).click()
  await expect(page.getByRole('link',{name:'Abrir loja publicada',exact:true})).toHaveCount(0)
  state.failPublish=false
  await publishStore(page)
  await expect.poll(()=>state.publishWrites).toBe(1)
  // Publishing is guarded by the draft version the server just returned (optimistic concurrency).
  expect(state.publishVersions).toEqual(['"2"'])
  await expect(page.getByRole('link',{name:'Abrir loja publicada',exact:true})).toHaveAttribute('href','#/lojas/'+store.slug)
})


test('fase 1: workspace acessível no computador e celular e contraste corrigível',async({page})=>{
 await mock(page,{basic:true})
 const config=createMakerDraft('Marca Acessível','linha')
 await page.addInitScript(({key,config})=>localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config})),{key:makerProjectKey(userId),config})
 await enterMaker(page)
 await page.getByRole('button',{name:'Sua marca',exact:true}).click()
 await page.getByRole('button',{name:'Mais opções de aparência',exact:true}).click()
  await page.getByLabel('Fundo da loja',{exact:true}).fill('#ffffff')
 await page.getByLabel('Texto da loja',{exact:true}).fill('#eeeeee')
 await expect(page.getByText(/Use pelo menos 4,5:1/)).toBeVisible()
 await page.getByRole('button',{name:'Corrigir contraste do texto',exact:true}).click()
 await expect(page.getByLabel('Texto da loja',{exact:true})).toHaveValue('#000000')
 await page.setViewportSize({width:390,height:844})
 await page.reload()
 await expect(page.locator('.maker-canvas-stage')).toBeInViewport()
 for(const width of [1610,390]) {
  await page.setViewportSize({width,height:1000})
  await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')})
  const violations=await page.evaluate(async()=>{
   const axe=(window as unknown as {axe:{run:(context:Element,options:unknown)=>Promise<{violations:{id:string;nodes:{target:string[]}[]}[]}>}}).axe
   return (await axe.run(document.querySelector('.visual-maker')!,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}))
  })
  expect(violations).toEqual([])
 }
})


test('Pulso preserva o degradê do card mesmo em rascunho com ação lilás', async ({page},testInfo)=>{
  await mock(page,{basic:true})
  await page.goto('/#/')
  const card=page.locator('.template-thumbnail .shop-template[data-store-template="pulso"] .motion-hero')
  const expected=await card.evaluate(node=>getComputedStyle(node).backgroundImage)
  expect(expected).toContain('linear-gradient')
  const config=createMakerDraft('Minha marca','pulso')
  config.accent='#6857eb'
  await page.evaluate(({key,config})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))
  },{key:makerProjectKey(userId),config})
  await enterMaker(page)
  const hero=page.locator('.maker-canvas-surface .motion-hero')
  await expect(hero).toHaveCSS('background-image',expected)
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await page.getByLabel('Cor principal',{exact:true}).fill('#ffdd00')
  await expect(hero).toHaveCSS('background-image',expected)
  await expect(hero.locator('.motion-headline')).toHaveCSS('color','rgb(255, 255, 255)')
  await page.getByLabel('Cor principal',{exact:true}).fill('#173db4')
  await expect(hero).toHaveCSS('background-image',expected)
  await page.screenshot({path:testInfo.outputPath('pulso-maker-gradient.png'),fullPage:true})
})


test('Maker simples: marca, página e aparência sem ferramentas avançadas no caminho', async ({page},testInfo) => {
  await mock(page,{basic:true})
  const config=createMakerDraft('Minha loja','pulso')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.setViewportSize({width:1610,height:1000})
  await enterMaker(page)
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Sua marca em toda a loja'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Categorias da prévia',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Pulso',exact:true})).not.toBeVisible()
  await page.getByLabel('Nome da loja virtual',{exact:true}).fill('Minha marca real')
  await expect(page.locator('.visual-store-name')).toHaveText('Minha marca real')
  await page.screenshot({path:testInfo.outputPath('maker-simples-marca.png'),fullPage:true})
  await page.getByRole('button',{name:'Editar minha página',exact:true}).click()
  await expect(page.getByRole('button',{name:'Adicionar seção',exact:true})).toBeDisabled()
  await expect(page.getByRole('button',{name:'Duplicar componente',exact:true})).not.toBeVisible()
  await page.getByRole('combobox',{name:'Seção da página',exact:true}).click()
  const heroIndex=config.components.findIndex(section=>section.type==='hero')
  await page.getByRole('option').nth(heroIndex).click()
  await page.getByLabel('Título da seção',{exact:true}).fill('Sua próxima descoberta')
  await expect(page.locator('.maker-canvas-surface')).toContainText('Sua próxima descoberta')
  await expect(page.getByRole('button',{name:'Excluir seção',exact:true})).not.toBeVisible()
  await page.screenshot({path:testInfo.outputPath('maker-simples-pagina.png'),fullPage:true})
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await expect(page.getByLabel('Cor principal',{exact:true})).toBeVisible()
  await expect(page.getByLabel('Fundo da loja',{exact:true})).not.toBeVisible()
  await page.getByLabel('Cor principal',{exact:true}).fill('#173db4')
  expect((await projectOf(page)).config.accent).toBe('#173db4')
  await page.reload()
  await page.getByRole('button',{name:'Sua marca',exact:true}).click()
  await expect(page.getByLabel('Nome da loja virtual',{exact:true})).toHaveValue('Minha marca real')
  for(const width of [1610,390]) {
    await page.setViewportSize({width,height:1000})
    if (width === 390) await page.getByRole('group',{name:'Dispositivo do canvas',exact:true}).getByRole('button',{name:'Celular',exact:true}).click()
    await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')})
    const result=await page.evaluate(async()=>{
      const axe=(window as unknown as {axe:{run:(node:Element,options:unknown)=>Promise<{violations:{id:string}[]}>}}).axe
      return (await axe.run(document.querySelector('.visual-maker')!,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(item=>item.id)
    })
    expect(result).toEqual([])
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  }
  await page.screenshot({path:testInfo.outputPath('maker-simples-celular.png'),fullPage:true})
  expect(errors).toEqual([])
})


test('Maker guiado: segmento, visual e marca sem importar exemplos',async({page})=>{
  const state=await mock(page,{basic:true,noStore:true})
  await enterMaker(page)
  await page.getByRole('button',{name:'Usar template',exact:true}).click()
  await expect(page.getByRole('heading',{name:'O que você vende?',exact:true})).toBeVisible()
  await page.getByRole('combobox',{name:'Segmento da loja',exact:true}).click()
  await page.getByRole('option',{name:'Moda e acessórios',exact:true}).click()
  await page.getByRole('button',{name:'Escolher visual',exact:true}).click()
  await page.getByRole('button',{name:'Usar Pulso',exact:true}).click()
  expect(await projectOf(page)).toBeNull()
  await page.getByLabel('Nome da sua loja',{exact:true}).fill('Marca do lojista')
  await page.getByRole('button',{name:'Abrir minha loja no Maker',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Editor da loja',exact:true})).toBeVisible()
  const project=await projectOf(page)
  expect(project.config.name).toBe('Marca do lojista')
  expect(project.config.template).toBe('pulso')
  expect(project.config.products).toEqual([])
  expect(project.config.categories).toEqual([])
  expect(project.config.components.find((section:{type:string})=>section.type==='hero').title).toBe('Encontre o seu próximo favorito.')
  expect(state.storeWrites).toBe(0)
})

test('Maker direto: editar no canvas, desfazer, refazer e recuperar exclusão',async({page},testInfo)=>{
  await mock(page)
  const config=createMakerDraft('Marca Direta','linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await page.setViewportSize({width:1610,height:1100})
  await enterMaker(page)
  const title=page.getByRole('textbox',{name:'Título no canvas: hero',exact:true})
  await title.fill('Minha loja, do meu jeito')
  await expect.poll(async()=>(await projectOf(page)).config.components.find((section:{type:string})=>section.type==='hero').title).toBe('Minha loja, do meu jeito')
  await page.getByRole('heading',{name:'Editor da loja',exact:true}).click()
  await page.keyboard.press('Control+z')
  await expect(title).toHaveText(config.components.find(section=>section.type==='hero')!.title)
  await page.keyboard.press('Control+Shift+z')
  await expect(title).toHaveText('Minha loja, do meu jeito')
  const before=(await projectOf(page)).config.components.length
  const hero=page.locator('.maker-canvas-surface [data-section-type="hero"]').first()
  await hero.locator('.maker-floating-tools').getByRole('button',{name:'Duplicar',exact:true}).click()
  await expect.poll(async()=>(await projectOf(page)).config.components.length).toBe(before+1)
  const selected=page.locator('.maker-canvas-surface [data-selected="true"]')
  await selected.locator('.maker-floating-tools').getByRole('button',{name:'Excluir',exact:true}).click()
  await selected.getByRole('button',{name:'Remover seção',exact:true}).click()
  await expect.poll(async()=>(await projectOf(page)).config.components.length).toBe(before)
  await title.fill('Edição posterior à exclusão')
  await page.getByRole('region',{name:'Notifications',exact:true}).getByRole('button',{name:'Desfazer',exact:true}).click()
  await expect(title.first()).toHaveText('Edição posterior à exclusão')
  await expect.poll(async()=>(await projectOf(page)).config.components.length).toBe(before+1)
  await page.screenshot({path:testInfo.outputPath('maker-canvas-direto.png'),fullPage:true,animations:'disabled'})
})

test('Maker autosave: servidor confirma, falha preserva rascunho e reenvio recupera',async({page})=>{
  const state=await mock(page,{basic:true})
  const config=createMakerDraft('Marca Salva','linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await enterMaker(page)
  const title=page.getByRole('textbox',{name:'Título no canvas: hero',exact:true})
  await title.fill('Texto salvo sem botão')
  await expect.poll(()=>state.layoutWrites.length).toBeGreaterThanOrEqual(1)
  await expect(page.locator('.visual-sync-status')).toContainText('Salvo automaticamente')
  state.failLayout=true
  await title.fill('Preservado mesmo sem servidor')
  await expect(page.locator('.maker-sync-problem')).toContainText('Falha temporária ao salvar.')
  expect((await projectOf(page)).config.components.find((section:{type:string})=>section.type==='hero').title).toBe('Preservado mesmo sem servidor')
  state.failLayout=false
  await page.getByRole('button',{name:'Tentar sincronizar',exact:true}).click()
  await expect(page.locator('.visual-sync-status')).toContainText('Salvo automaticamente')
  expect(state.layoutWrites.at(-1)!.body.sections.find(section=>section.type==='hero')!.title).toBe('Preservado mesmo sem servidor')
  expect(state.publishWrites).toBe(0)
})

test('Maker autosave: gravações lentas são serializadas e a última edição prevalece',async({page})=>{
  const state=await mock(page)
  state.saveDelayMs=2500
  const config=createMakerDraft('Marca em edição','linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await enterMaker(page)
  const title=page.getByRole('textbox',{name:'Título no canvas: hero',exact:true})
  await title.fill('Primeira edição')
  await expect.poll(()=>state.activeWrites).toBe(1)
  await title.fill('Última edição')
  await expect.poll(()=>state.layoutWrites.length,{timeout:15000}).toBe(2)
  await expect(page.locator('.visual-sync-status')).toContainText('Salvo automaticamente')
  expect(state.maxActiveWrites).toBe(1)
  expect(state.layoutWrites.at(-1)!.body.sections.find(section=>section.type==='hero')!.title).toBe('Última edição')
})


test('Maker: trocar visual pode ser desfeito e inserir aqui respeita a posição', async ({page}, testInfo) => {
  await mock(page)
  const config = createMakerDraft('Marca Testada', 'linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await page.setViewportSize({width:1610,height:1100})
  await enterMaker(page)
  await page.getByRole('button',{name:'Trocar visual',exact:true}).click()
  await page.getByRole('button',{name:'Usar Pulso',exact:true}).click()
  await expect(page.locator('.maker-canvas-surface .shop-template')).toHaveAttribute('data-store-template','pulso')
  await page.getByRole('button',{name:'Desfazer',exact:true}).click()
  await expect(page.locator('.maker-canvas-surface .shop-template')).toHaveAttribute('data-store-template','linha')
  await page.getByRole('button',{name:'Refazer',exact:true}).click()
  await expect(page.locator('.maker-canvas-surface .shop-template')).toHaveAttribute('data-store-template','pulso')
  await page.getByRole('button',{name:'Inserir seção antes de Topo da loja',exact:true}).click()
  await page.getByRole('button',{name:'Inserir Imagem e texto',exact:true}).click()
  const sections=(await projectOf(page)).config.components as {type:string}[]
  expect(sections[sections.findIndex(section=>section.type==='hero')-1].type).toBe('editorial-banner')
  await page.getByRole('button',{name:'Desfazer',exact:true}).click()
  await page.locator('.maker-canvas-surface .shop-viewport').evaluate(node=>node.scrollTo(0,0))
  await page.screenshot({path:testInfo.outputPath('maker-concluido-desktop.png'),fullPage:true,animations:'disabled'})
})

test('Maker: histórico local restaura conteúdo sem restaurar metadados de publicação', async ({page})=>{
  await mock(page)
  const config=createMakerDraft('Marca Atual','linha')
  config.settings!.published=true
  config.settings!.publishedAt='2026-10-30T10:00:00Z'
  const previous=createMakerDraft('Nome anterior','linha')
  await page.addInitScript(({key,config,previous,userId})=>{
    localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config,storeId:'store-maker'}))
    localStorage.setItem('syndetis-maker-versions:'+userId+':store-maker',JSON.stringify([{id:'previous',savedAt:'2026-10-29T10:00:00Z',label:'Antes da edição',config:previous}]))
  },{key:makerProjectKey(userId),config,previous,userId})
  await enterMaker(page)
  await page.getByRole('button',{name:'Mais ferramentas',exact:true}).click()
  await page.getByRole('button',{name:'Histórico local',exact:true}).click()
  await page.getByRole('button',{name:'Restaurar esta versão',exact:true}).click()
  expect((await projectOf(page)).config.name).toBe('Nome anterior')
  expect((await projectOf(page)).config.settings.publishedAt).toBe('2026-10-30T10:00:00Z')
  await page.getByRole('button',{name:'Desfazer',exact:true}).click()
  expect((await projectOf(page)).config.name).toBe('Marca Atual')
})

test('Básico: histórico incompatível não altera rascunho nem histórico de desfazer',async({page})=>{
  await mock(page,{basic:true})
  const config=createMakerDraft('Marca Básica','linha')
  const previous=createMakerDraft('Estrutura livre','blank')
  await page.addInitScript(({key,config,previous,userId})=>{
    localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config,storeId:'store-maker'}))
    localStorage.setItem('syndetis-maker-versions:'+userId+':store-maker',JSON.stringify([{id:'previous',savedAt:'2026-10-29T10:00:00Z',label:'Visual antigo',config:previous},{id:'broken',savedAt:'invalid',label:'Inválida',config:{version:1,components:[]}}]))
  },{key:makerProjectKey(userId),config,previous,userId})
  await enterMaker(page)
  await page.getByRole('button',{name:'Mais ferramentas',exact:true}).click()
  await page.getByRole('button',{name:'Histórico local',exact:true}).click()
  await expect(page.getByRole('button',{name:'Restaurar esta versão',exact:true})).toHaveCount(1)
  await page.getByRole('button',{name:'Restaurar esta versão',exact:true}).click()
  await expect(page.getByText('Adequação necessária',{exact:true})).toBeVisible()
  expect((await projectOf(page)).config.name).toBe('Marca Básica')
  await expect(page.getByRole('button',{name:'Desfazer',exact:true})).toBeDisabled()
})


test('Maker: publicação em andamento bloqueia trocas e desfazer por teclado',async({page})=>{
  const state=await mock(page)
  state.publishDelayMs=2500
  const config=createMakerDraft('Marca Publicada','linha')
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await enterMaker(page)
  await page.getByRole('textbox',{name:'Título no canvas: hero',exact:true}).fill('Versão enviada')
  await publishStore(page)
  await expect.poll(()=>state.publishPending).toBe(true)
  await expect(page.getByRole('button',{name:'Trocar visual',exact:true})).toBeDisabled()
  await page.keyboard.press('Control+z')
  expect((await projectOf(page)).config.components.find((section:{type:string})=>section.type==='hero').title).toBe('Versão enviada')
  await expect(page.getByText('Loja publicada com sucesso!',{exact:true})).toBeVisible()
  expect(state.publishWrites).toBe(1)
  await expect(page.getByRole('button',{name:'Trocar visual',exact:true})).toBeEnabled()
})


test('prévia do Maker: página completa, rodapé e sacola nos modelos originais',async({page})=>{
  await mock(page)
  const config=createMakerDraft('Marca navegável','linha')
  config.products=[{id:'draft-product',name:'Item da prévia',slug:'item',categoryId:'',price:42,stock:5,sku:'DRAFT',image:'',featured:true}]
  await page.addInitScript(({key,config})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,mode:'template',config}))},{key:makerProjectKey(userId),config})
  await enterMaker(page)
  await page.getByRole('button',{name:'Visualizar',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Visualizar sua loja',exact:true})
  await dialog.getByRole('button',{name:'Página completa',exact:true}).click()
  await dialog.locator('.shop-footer').scrollIntoViewIfNeeded()
  await expect(dialog.locator('.shop-footer')).toBeVisible()
  await dialog.getByRole('button',{name:'Adicionar ao pedido',exact:true}).click()
  const bag=dialog.getByRole('region',{name:'Sua sacola',exact:true})
  await expect(bag).toContainText('Item da prévia')
  await bag.getByRole('button',{name:'Finalizar compra',exact:true}).click()
  const checkout=dialog.getByRole('region',{name:'Finalizar compra',exact:true})
  await expect(checkout.getByRole('button',{name:'Revisar pedido e pagar',exact:true})).toBeDisabled()
  await expect(dialog).toBeVisible()
})
