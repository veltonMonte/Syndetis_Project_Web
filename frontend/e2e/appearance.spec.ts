import { createRequire } from 'node:module'
import { test, expect, type Page } from '@playwright/test'
import { createMakerDraft, makerProjectKey } from '../src/lib/maker-project'
import { appearanceKey } from '../src/lib/appearance'

const store = {
  id: 'appearance-store',
  name: 'Marca Aurora',
  slug: 'aurora',
  status: 'ACTIVE',
  shippingFee: 0,
  deliveryInstructions: '',
}
async function fixture(page: Page) {
  const state = { userId: 'appearance-a' }
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown
    if (path === '/api/auth/login') {
      const payload = Buffer.from(
        JSON.stringify({
          sub: state.userId,
          email: 'tema@example.test',
          role: 'SELLER',
          exp: Math.floor(Date.now() / 1000) + 600,
        }),
      ).toString('base64url')
      data = {
        accessToken: `test.${payload}.signature`,
        refreshToken: 'appearance-refresh',
        expiresIn: 600,
      }
    } else if (path === '/api/auth/logout') {
      await route.fulfill({ status: 204 })
      return
    } else if (path === '/api/core/stores/me') data = [store]
    else if (path.endsWith('/entitlements'))
      data = {
        planId: 'STANDARD',
        enforced: true,
        capabilities: { structuralEditing: false, ai: false },
        products: { limit: 100 },
        ai: { limit: 0, remaining: 0 },
      }
    else if (path.endsWith('/orders'))
      data = { content: [], page: 0, totalElements: 0, totalPages: 0 }
    else {
      await route.fulfill({ status: 404, json: {} })
      return
    }
    await route.fulfill({ json: data })
  })
  return state
}
async function login(page: Page) {
  await page.goto('/#/entrar')
  await page.getByLabel('E-mail profissional').fill('tema@example.test')
  await page.getByLabel('Senha de acesso').fill('Teste123!')
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
}
async function settings(page: Page) {
  await page.getByRole('link', { name: 'Configurações da conta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Configurações', exact: true })).toBeVisible()
}
const currentTheme = (page: Page) => page.locator('html').getAttribute('data-theme')

test('claro é o padrão mesmo quando o sistema prefere escuro', async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await login(page)
  await settings(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('radio', { name: 'Claro', exact: true })).toBeChecked()
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  )
})

test('dois temas podem ser alternados e a preferência sobrevive ao F5', async ({
  page,
}, testInfo) => {
  await fixture(page)
  await login(page)
  await settings(page)
  const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true })
  if (await notice.isVisible()) await notice.click()
  await page.screenshot({ path: testInfo.outputPath('appearance-light.png'), fullPage: true })
  await page.getByRole('radio', { name: 'Escuro', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Escuro', exact: true })).toBeChecked()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), appearanceKey('appearance-a')),
  ).toBe('dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: testInfo.outputPath('appearance-dark.png'), fullPage: true })
  await page.getByRole('radio', { name: 'Claro', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('tema de uma conta não altera o padrão de outra conta', async ({ page }) => {
  const state = await fixture(page)
  await login(page)
  await settings(page)
  await page.getByRole('radio', { name: 'Escuro', exact: true }).click()
  await expect.poll(() => currentTheme(page)).toBe('dark')
  await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click()
  await expect.poll(() => currentTheme(page)).toBe('light')
  state.userId = 'appearance-b'
  await login(page)
  await settings(page)
  await expect.poll(() => currentTheme(page)).toBe('light')
  await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click()
  state.userId = 'appearance-a'
  await login(page)
  await expect.poll(() => currentTheme(page)).toBe('dark')
})

test('configurações do Maker alteram a interface sem modificar o rascunho', async ({ page }) => {
  await fixture(page)
  const project = {
    version: 1,
    mode: 'template',
    storeId: store.id,
    config: createMakerDraft(store.name, 'organico'),
  }
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value))
    },
    { key: makerProjectKey('appearance-a'), value: project },
  )
  await login(page)
  await page.goto('/#/criar')
  await page.getByRole('button', { name: '05 · Configurações da Loja', exact: true }).click()
  await page.getByRole('radio', { name: 'Escuro', exact: true }).click()
  await expect.poll(() => currentTheme(page)).toBe('dark')
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || 'null'),
    makerProjectKey('appearance-a'),
  )
  expect(after).toEqual(project)
})

test('tema claro passa contraste e acessibilidade no celular', async ({ page }, testInfo) => {
  await fixture(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.goto('/#/configuracoes')
  await expect(
    page.getByRole('radiogroup', { name: 'Tema da plataforma', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            doc: Document,
            options: unknown,
          ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>
        }
      }
    ).axe
    const results = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
    return results.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    }))
  })
  expect(violations).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('appearance-mobile-light.png'),
    fullPage: true,
  })
})
