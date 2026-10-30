import { createRequire } from 'node:module'
import { test, expect, type Page, type Route } from '@playwright/test'

const storeA = {
  id: 'store-a',
  name: 'Ateliê Aurora',
  slug: 'aurora',
  status: 'ACTIVE',
  shippingFee: 8,
  deliveryInstructions: 'Entregar na portaria.',
}
const storeB = { ...storeA, id: 'store-b', name: 'Marca Horizonte', slug: 'horizonte' }
function tokens(role = 'SELLER', ttl = 600, refresh = 'refresh-test-1') {
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'seller-test',
      email: 'lojista@example.test',
      role,
      exp: Math.floor(Date.now() / 1000) + ttl,
    }),
  ).toString('base64url')
  return { accessToken: `test.${payload}.signature`, refreshToken: refresh, expiresIn: ttl }
}
function order(id = 'aurora-01', storeId = storeA.id, status = 'PAID') {
  return {
    id,
    storeId,
    status,
    subtotal: 129.9,
    shipping: 8,
    total: 137.9,
    expiresAt: '2026-11-01T15:00:00Z',
    createdAt: '2026-10-29T15:00:00Z',
    deliveryAddress: 'Rua de teste, 10 — São Paulo/SP',
    deliveryInstructions: 'Entregar na portaria.',
    paymentReviewRequired: false,
    items: [
      {
        productId: 'product-a',
        productName: storeId === storeA.id ? 'Vaso Aurora' : 'Camiseta Horizonte',
        quantity: 1,
        unitPrice: 129.9,
        lineTotal: 129.9,
      },
    ],
  }
}
const limits = {
  planId: 'MAKER',
  enforced: true,
  paid: true,
  capabilities: { structuralEditing: true, ai: true },
  products: { limit: 500, used: 42, remaining: 458, overLimit: false },
  ai: {
    limit: 30,
    used: 6,
    remaining: 24,
    resetsAt: '2026-10-30T03:00:00Z',
    timezone: 'America/Sao_Paulo',
  },
  layoutAdaptationRequired: false,
  canRepublish: true,
}
const subscription = {
  enabled: true,
  sandbox: true,
  planId: 'MAKER',
  monthlyPrice: 49,
  status: 'ACTIVE',
  canPublish: true,
  paidUntil: '2026-11-29T03:00:00Z',
  cancelled: false,
  payments: [],
}
async function fixture(
  page: Page,
  options: {
    role?: string
    empty?: boolean
    loginInvalid?: boolean
    ttl?: number
    hook?: (route: Route) => Promise<boolean>
  } = {},
) {
  const state = {
    refreshes: 0,
    logins: 0,
    patches: [] as string[],
    rejectOld: false,
    status: 'PAID',
    storeCalls: 0,
  }
  await page.route('**/api/**', async (route) => {
    if (options.hook && (await options.hook(route))) return
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    let body: unknown
    if (path === '/api/auth/login') {
      state.logins++
      if (options.loginInvalid) {
        await route.fulfill({ status: 401, json: { message: 'Credenciais inválidas' } })
        return
      }
      body = tokens(options.role, options.ttl)
    } else if (path === '/api/auth/refresh') {
      state.refreshes++
      expect(req.postDataJSON().refreshToken).toBe('refresh-test-1')
      body = tokens(options.role, 600, 'refresh-test-2')
    } else if (path === '/api/auth/logout') {
      await route.fulfill({ status: 204 })
      return
    } else if (path.startsWith('/api/core/')) {
      if (state.rejectOld && state.refreshes === 0) {
        await route.fulfill({ status: 401, json: {} })
        return
      }
      if (path === '/api/core/stores/me') {
        state.storeCalls++
        body = options.empty ? [] : [storeA, storeB]
      } else if (path.endsWith('/entitlements')) body = limits
      else if (path.endsWith('/subscription')) body = subscription
      else if (path.endsWith('/status') && req.method() === 'PATCH') {
        state.status = req.postDataJSON().status
        state.patches.push(state.status)
        body = order('aurora-01', storeA.id, state.status)
      } else if (path.endsWith('/orders')) {
        const other = path.includes(storeB.id)
        const current = order(
          other ? 'horizon-01' : 'aurora-01',
          other ? storeB.id : storeA.id,
          other ? 'PENDING' : state.status,
        )
        const content =
          !url.searchParams.get('status') || current.status === url.searchParams.get('status')
            ? [
                url.searchParams.get('page') === '1'
                  ? { ...current, id: 'page-two-order' }
                  : current,
              ]
            : []
        body = {
          content,
          page: Number(url.searchParams.get('page') || 0),
          totalPages: content.length ? 2 : 0,
          totalElements: content.length ? 11 : 0,
        }
      } else {
        await route.fulfill({ status: 404, json: { message: `Unexpected route: ${path}` } })
        return
      }
    } else {
      await route.fulfill({ status: 404, json: {} })
      return
    }
    await route.fulfill({ json: body })
  })
  return state
}
async function login(page: Page) {
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('lojista@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
}

test('credenciais inválidas mantêm a pessoa no login sem criar sessão', async ({ page }) => {
  const state = await fixture(page, { loginInvalid: true })
  await login(page)
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
  expect(state.logins).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('syndetis.session.v2'))).toBeNull()
  await expect(
    page.getByRole('heading', { name: 'Entrar na sua conta', exact: true }),
  ).toBeVisible()
})

test('login abre dados da loja, pagina, filtra e confirma envio pela API', async ({ page }) => {
  const state = await fixture(page)
  await login(page)
  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect(page.getByRole('table', { name: 'Pedidos de Ateliê Aurora' })).toBeVisible()
  await expect(page.getByText('11 pedido(s) no total')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByRole('button', { name: 'Ver pedido page-two' })).toBeVisible()
  await page.getByRole('button', { name: 'Página anterior' }).click()
  await page.getByRole('button', { name: 'Ver pedido aurora-0' }).click()
  await expect(page.getByRole('table', { name: 'Itens do pedido' })).toContainText('Vaso Aurora')
  await page.getByRole('button', { name: 'Marcar como enviado' }).click()
  expect(state.patches).toEqual([])
  await page.getByRole('button', { name: 'Confirmar envio' }).click()
  await expect(page.getByRole('table', { name: 'Pedidos de Ateliê Aurora' })).toContainText(
    'Enviado',
  )
  expect(state.patches).toEqual(['SHIPPED'])
  await page.getByRole('combobox', { name: 'Status do pedido' }).click()
  await page.getByRole('option', { name: 'Cancelado', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Nenhum pedido com este status' })).toBeVisible()
})

test('plano usa limites reais, sem métricas nem faturamento de exemplo', async ({ page }) => {
  await fixture(page)
  await login(page)
  await page.getByRole('button', { name: 'Plano e limites', exact: true }).click()
  await expect(page.getByText('458 espaço(s) disponível(is).')).toBeVisible()
  await expect(
    page.getByText('24', { exact: false }).filter({ hasText: 'restantes' }),
  ).toBeVisible()
  await expect(page.getByText('R$ 49,00', { exact: true })).toBeVisible()
  await expect(page.getByText('Pode mover, remover e configurar componentes.')).toBeVisible()
  await expect(page.getByText('R$ 108.400,00')).toHaveCount(0)
})

test('sessão e refresh sobrevivem ao F5 e logout limpa a persistência', async ({ page }) => {
  const state = await fixture(page)
  await login(page)
  await expect(page.getByRole('heading', { name: 'Pedidos da loja' })).toBeVisible()
  state.rejectOld = true
  await page.reload()
  await expect(page.getByRole('table', { name: 'Pedidos de Ateliê Aurora' })).toBeVisible()
  expect(state.refreshes).toBe(1)
  await page.getByRole('button', { name: 'Encerrar sessão' }).click()
  await expect(page).toHaveURL(/#\/$/)
  expect(await page.evaluate(() => sessionStorage.getItem('syndetis.session.v2'))).toBeNull()
  await page.goto('/#/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Entrar na sua conta', exact: true }),
  ).toBeVisible()
})

test('duas consultas concorrentes renovam o token apenas uma vez', async ({ page }) => {
  const state = await fixture(page, { ttl: 60 })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Pedidos da loja' })).toBeVisible()
  await page.clock.setFixedTime(new Date(Date.now() + 40000))
  await page.getByRole('button', { name: 'Plano e limites', exact: true }).click()
  await expect(page.getByText('458 espaço(s) disponível(is).')).toBeVisible()
  await expect(page.getByText('R$ 49,00', { exact: true })).toBeVisible()
  expect(state.refreshes).toBe(1)
})

test('refresh revogado retorna ao login com aviso persistente', async ({ page }) => {
  await fixture(page, {
    ttl: 60,
    hook: async (route) => {
      if (new URL(route.request().url()).pathname === '/api/auth/refresh') {
        await route.fulfill({ status: 401, json: { detail: 'Token revogado' } })
        return true
      }
      return false
    },
  })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Pedidos da loja' })).toBeVisible()
  await page.clock.setFixedTime(new Date(Date.now() + 40000))
  await page.getByRole('button', { name: 'Plano e limites', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Entrar na sua conta', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('syndetis.session.v2'))).toBeNull()
})

test('resposta atrasada de renovação não desfaz o logout', async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let refreshing = false
  await fixture(page, {
    ttl: 60,
    hook: async (route) => {
      if (new URL(route.request().url()).pathname !== '/api/auth/refresh') return false
      refreshing = true
      await held
      await route.fulfill({ json: tokens() })
      return true
    },
  })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Pedidos da loja' })).toBeVisible()
  await page.clock.setFixedTime(new Date(Date.now() + 40000))
  await page.getByRole('button', { name: 'Plano e limites', exact: true }).click()
  await expect.poll(() => refreshing).toBe(true)
  await page.getByRole('button', { name: 'Encerrar sessão' }).click()
  await expect(page).toHaveURL(/#\/$/)
  release()
  await page.goto('/#/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Entrar na sua conta', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('syndetis.session.v2'))).toBeNull()
})

test('conta cliente não consulta endpoints de gestão', async ({ page }) => {
  const state = await fixture(page, { role: 'CUSTOMER' })
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Gestão de loja ainda não habilitada' }),
  ).toBeVisible()
  expect(state.storeCalls).toBe(0)
})

test('lojista sem loja recebe estado vazio e link para o Maker', async ({ page }) => {
  await fixture(page, { empty: true })
  await login(page)
  await expect(page.getByRole('heading', { name: 'Sua primeira loja começa aqui' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Criar minha loja', exact: true })).toHaveAttribute(
    'href',
    '#/criar',
  )
})

test('falha em pedidos oferece nova tentativa, sem mostrar pedidos fictícios', async ({ page }) => {
  let fail = true
  await fixture(page, {
    hook: async (route) => {
      if (!fail || !new URL(route.request().url()).pathname.endsWith('/orders')) return false
      await route.fulfill({
        status: 503,
        json: { detail: 'Pedidos temporariamente indisponíveis.' },
      })
      return true
    },
  })
  await login(page)
  await expect(page.getByRole('alert')).toHaveText('Pedidos temporariamente indisponíveis.')
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Pedidos de Ateliê Aurora' })).toBeVisible()
})

test('troca de loja ignora resposta atrasada da loja anterior', async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false
  await fixture(page, {
    hook: async (route) => {
      if (!new URL(route.request().url()).pathname.includes('/store-a/orders')) return false
      requested = true
      await held
      await route
        .fulfill({ json: { content: [order()], page: 0, totalPages: 1, totalElements: 1 } })
        .catch(() => {})
      return true
    },
  })
  await login(page)
  await expect.poll(() => requested).toBe(true)
  await page.getByRole('combobox', { name: 'Loja em gerenciamento' }).click()
  await page.getByRole('option', { name: 'Marca Horizonte', exact: true }).click()
  release()
  await expect(page.getByRole('table', { name: 'Pedidos de Marca Horizonte' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Pedidos de Ateliê Aurora' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Marcar como pago' })).toHaveCount(0)
})

test('cadastro valida tamanho da senha antes de enviar dados', async ({ page }) => {
  let calls = 0
  await page.route('**/api/auth/register', async (route) => {
    calls++
    await route.fulfill({ status: 500, json: {} })
  })
  await page.goto('/#/cadastro')
  await page.getByLabel('Seu nome', { exact: true }).fill('Marina')
  await page.getByLabel('E-mail profissional').fill('marina@example.test')
  await page.getByLabel('Senha de acesso').fill('á'.repeat(40))
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(page.getByLabel('Senha de acesso')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText(/Use pelo menos 8 caracteres e no máximo 72 bytes/)).toBeVisible()
  expect(calls).toBe(0)
})

test('login e painel funcionam no celular e passam acessibilidade', async ({ page }, testInfo) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await fixture(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/entrar')
  await expect(
    page.getByRole('button', { name: 'Entrar na minha conta', exact: true }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await expect(page.getByRole('table', { name: 'Pedidos de Ateliê Aurora' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  const titleTracking = await page
    .getByRole('heading', { name: 'Pedidos da loja', exact: true })
    .evaluate((element) => getComputedStyle(element).letterSpacing)
  expect(titleTracking === 'normal' || parseFloat(titleTracking) >= -1).toBe(true)
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') })
  const findings = await page.evaluate(async () => {
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
    const results = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
    return results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }))
  })
  expect(findings).toEqual([])
  expect(runtimeErrors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true })
})
