import { createRequire } from 'node:module'
import { test, expect, type Page } from '@playwright/test'

// Phone and tablet chrome: the glass tab bar, the quiet inputs and the logo. The signup checkbox's 44px target
// is tested with PR #53, which adds that checkbox.
const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1280, height: 800 }

async function api(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/providers') return route.fulfill({ json: { oauth: [] } })
    return route.fulfill({ json: {} })
  })
}

async function useTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((value) => localStorage.setItem('syndetis-appearance-v1:guest', value), theme)
}

/**
 * Chromium follows the OS here (Windows: Settings › Personalization › Colors › Transparency effects), so the test
 * pins it. Playwright's emulateMedia has no option for it yet; CDP does.
 */
async function transparency(page: Page, value: 'no-preference' | 'reduce') {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value }] })
}

/** Opacity of an element times its ancestors': axe blends text with any translucent ancestor (see maker-start). */
function accumulatedOpacity(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((node) => {
    let opacity = 1
    for (let element: Element | null = node; element; element = element.parentElement) {
      opacity *= Number(getComputedStyle(element).opacity)
    }
    return opacity
  })
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') })
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: Document, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> }
    }).axe
    const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    return results.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))
  })
}

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test.describe('tab bar de vidro no celular', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`fica fixa embaixo, destaca a página atual e passa acessibilidade (${theme})`, async ({ page }) => {
      await api(page)
      await useTheme(page, theme)
      await transparency(page, 'no-preference')
      await page.setViewportSize(PHONE)
      await page.goto('/#/')
      const tabs = page.getByRole('navigation', { name: 'Navegação principal' })
      await expect(tabs).toHaveCount(1)
      await expect(tabs).toHaveClass(/tab-bar/)
      await expect(tabs.getByRole('link')).toHaveText(['Início', 'Modelos', 'Sobre', 'Planos', 'Entrar'])
      await expect(tabs.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')

      const bar = await tabs.evaluate((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        return {
          position: style.position,
          backdrop: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter'),
          background: style.backgroundColor,
          bottomGap: window.innerHeight - rect.bottom,
          left: rect.left,
          right: window.innerWidth - rect.right,
        }
      })
      expect(bar.position).toBe('fixed')
      expect(bar.backdrop).toContain('blur(')
      expect(bar.backdrop).toContain('saturate(')
      // Translucent: the fill is a mix of the surface with transparency, so the page shows through.
      expect(bar.background).toMatch(/\/ 0\.\d+\)|rgba\(.*, 0\.\d+\)/)
      expect(bar.bottomGap).toBeGreaterThanOrEqual(8)
      expect(bar.left).toBeGreaterThanOrEqual(8)
      expect(bar.right).toBeGreaterThanOrEqual(8)

      // Every tab is a full fingertip target.
      for (const box of await tabs.getByRole('link').evaluateAll((links) => links.map((link) => link.getBoundingClientRect().toJSON()))) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }

      await expect.poll(() => noSidewaysScroll(page)).toBe(true)
      await expect.poll(() => accumulatedOpacity(page, '.tab-bar')).toBe(1)
      expect(await axeViolations(page)).toEqual([])

      await tabs.getByRole('link', { name: 'Modelos' }).click()
      await expect(page).toHaveURL(/#\/modelos$/)
      const modelos = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Modelos' })
      await expect(modelos).toHaveAttribute('aria-current', 'page')

      // The free block is carried to the new tab (transform only) and comes to rest under it.
      const marker = page.locator('.tab-bar__marker')
      await expect.poll(() => marker.evaluate((node) => node.getAnimations().length)).toBe(0)
      const [markerBox, tabBox] = [(await marker.boundingBox())!, (await modelos.boundingBox())!]
      expect(Math.abs(markerBox.x + markerBox.width / 2 - (tabBox.x + tabBox.width / 2))).toBeLessThan(2)
      // The label is printed on the block once it has landed: check it as axe sees it.
      await expect.poll(() => accumulatedOpacity(page, '.tab-bar')).toBe(1)
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test('o bloco viaja entre as abas animando só transform', async ({ page }) => {
    await api(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setViewportSize(PHONE)
    await page.goto('/#/')
    const marker = page.locator('.tab-bar__marker')
    await page.locator('.tab-bar').getByRole('link', { name: 'Planos' }).click()
    const flight = await marker.evaluate((node) => {
      const [animation] = node.getAnimations()
      const keyframes = (animation.effect as KeyframeEffect).getKeyframes()
      return { count: node.getAnimations().length, properties: [...new Set(keyframes.flatMap((frame) => Object.keys(frame)))].sort() }
    })
    expect(flight.count).toBe(1)
    expect(flight.properties).toEqual(['composite', 'computedOffset', 'easing', 'offset', 'transform'])
  })

  test('o bloco viaja entre as abas mesmo com movimento reduzido no sistema (decisão de produto)', async ({ page }) => {
    await api(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(PHONE)
    await page.goto('/#/')
    await page.locator('.tab-bar').getByRole('link', { name: 'Planos' }).click()
    await expect(page.locator('.tab-bar').getByRole('link', { name: 'Planos' })).toHaveAttribute('aria-current', 'page')
    expect(await page.locator('.tab-bar__marker').evaluate((node) => node.getAnimations().length)).toBe(1)
  })

  test('com transparência reduzida a barra fica sólida, sem desfoque', async ({ page }) => {
    await api(page)
    await transparency(page, 'reduce')
    await page.setViewportSize(PHONE)
    await page.goto('/#/')
    const background = await page.locator('.tab-bar').evaluate((node) => getComputedStyle(node).backgroundColor)
    // Opaque: rgb(), not rgba() / color-mix with alpha.
    expect(background).toMatch(/^rgb\(/)
  })

  test('não cobre o fim da página: o último link do rodapé fica clicável acima da barra', async ({ page }) => {
    await api(page)
    await page.setViewportSize(PHONE)
    await page.goto('/#/')
    await expect(page.locator('.tab-bar')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const { footerBottom, barTop } = await page.evaluate(() => ({
      footerBottom: document.querySelector('.footer')!.getBoundingClientRect().bottom,
      barTop: document.querySelector('.tab-bar')!.getBoundingClientRect().top,
    }))
    expect(footerBottom).toBeLessThanOrEqual(barTop)

    // Scrolling a control into view (keyboard focus, anchors) stops above the bar, not under it.
    const lastLink = page.locator('.footer a').last()
    await lastLink.evaluate((node) => node.scrollIntoView({ block: 'end' }))
    const hit = await lastLink.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return top === node || node.contains(top)
    })
    expect(hit).toBe(true)
  })

  test('toasts sobem acima da barra', async ({ page }) => {
    await api(page)
    await page.setViewportSize(PHONE)
    await page.goto('/#/')
    await expect(page.locator('.tab-bar')).toBeVisible()
    const toasterBottom = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.echo-toaster')!).bottom))
    const barTopFromBottom = await page.evaluate(() => window.innerHeight - document.querySelector('.tab-bar')!.getBoundingClientRect().top)
    expect(toasterBottom).toBeGreaterThanOrEqual(barTopFromBottom)
  })

  test('no tablet usa a barra; no desktop volta a navegação do topo', async ({ page }) => {
    await api(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/#/planos')
    await expect(page.locator('.tab-bar')).toBeVisible()
    await expect(page.locator('.tab-bar').getByRole('link', { name: 'Planos' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(() => noSidewaysScroll(page)).toBe(true)

    await page.setViewportSize(DESKTOP)
    await expect(page.locator('.tab-bar')).toBeHidden()
    const top = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(top).toHaveClass(/navigation/)
    await expect(top.getByRole('link')).toHaveText(['Início', 'Modelos', 'Sobre', 'Planos'])
    await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()
    expect(await page.evaluate(() => getComputedStyle(document.body).paddingBottom)).toBe('0px')
  })

  test('a 320 px nada transborda para os lados', async ({ page }) => {
    await api(page)
    await page.setViewportSize({ width: 320, height: 640 })
    for (const route of ['/#/', '/#/cadastro', '/#/planos']) {
      await page.goto(route)
      await expect(page.locator('.tab-bar')).toBeVisible()
      await expect.poll(() => noSidewaysScroll(page)).toBe(true)
    }
  })
})

test.describe('inputs simples', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`repouso, foco e erro distintos, sem sombra projetada, e axe limpo (${theme})`, async ({ page }) => {
      await api(page)
      await useTheme(page, theme)
      await page.setViewportSize(PHONE)
      await page.goto('/#/cadastro')
      const name = page.getByLabel('Seu nome')
      const well = page.locator('.echo-field__well').first()
      const edge = () => well.evaluate((node) => getComputedStyle(node).boxShadow)

      const rest = await edge()
      expect(rest).toMatch(/inset$/)
      expect(rest.split('inset').length - 1).toBe(1) // one hairline, nothing else
      expect(rest).toContain('0px 0px 0px 1px')
      const label = await page.locator('.echo-field__label').first().evaluate((node) => getComputedStyle(node).textTransform)
      expect(label).toBe('none')

      await name.focus()
      await expect.poll(edge).toContain('0px 0px 0px 2px')
      // Focus is the control's own edge: no second ring from the page's global outline.
      expect(await name.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none')

      await page.getByRole('button', { name: 'Criar minha conta' }).click()
      await expect(page.locator('.echo-field__error').first()).toBeVisible()
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await expect.poll(edge).toContain('0px 0px 0px 1.5px')

      await expect.poll(() => accumulatedOpacity(page, '.auth-section')).toBe(1)
      expect(await axeViolations(page)).toEqual([])
    })
  }
})

test.describe('logo', () => {
  const blockTransform = (page: Page) =>
    page.locator('header .brand .syndetis-symbol__block').evaluate((node) => getComputedStyle(node).transform)

  test('o bloco é levado ao encaixe (erguido, em arco, assentado) e volta ao sair, só com transform', async ({ page }) => {
    await api(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setViewportSize(DESKTOP)
    await page.goto('/#/sobre')
    const block = page.locator('header .brand .syndetis-symbol__block')
    expect(await block.evaluate((node) => node.tagName)).toBe('SPAN')
    expect(await blockTransform(page)).toBe('none')

    await page.locator('header .brand').hover()
    const trip = await block.evaluate((node) => {
      const [animation] = node.getAnimations()
      const keyframes = (animation.effect as KeyframeEffect).getKeyframes()
      return {
        duration: Number(animation.effect!.getTiming().duration),
        properties: [...new Set(keyframes.flatMap((frame) => Object.keys(frame)))].sort(),
        // Mid-trip the block is lifted above both its free spot and its slot: a carried path, not a straight slide.
        lifted: String(keyframes.find((frame) => frame.offset === 0.3)?.transform),
      }
    })
    expect(trip.duration).toBeGreaterThanOrEqual(600)
    expect(trip.properties).toEqual(['composite', 'computedOffset', 'easing', 'offset', 'transform'])
    expect(trip.lifted).toMatch(/translate\(\d+%, -\d+%\)/)

    await expect.poll(() => block.evaluate((node) => node.getAnimations()[0]?.playState)).toBe('finished')
    const [, , , , x, y] = (await blockTransform(page)).match(/-?[\d.]+/g)!.map(Number)
    expect(x).toBeLessThan(0)
    expect(y).toBeGreaterThan(0)

    // Leaving plays the trip backwards, back to the free spot.
    await page.mouse.move(640, 600)
    await expect.poll(() => block.evaluate((node) => node.getAnimations()[0]?.playState)).toBe('finished')
    expect(await blockTransform(page)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  })

  test('o bloco viaja até o encaixe mesmo com movimento reduzido no sistema (decisão de produto)', async ({ page }) => {
    await api(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(DESKTOP)
    await page.goto('/#/sobre')
    const block = page.locator('header .brand .syndetis-symbol__block')
    await page.locator('header .brand').hover()
    expect(await block.evaluate((node) => node.getAnimations().length)).toBe(1)
    await expect.poll(() => block.evaluate((node) => node.getAnimations()[0]?.playState)).toBe('finished')
    const [, , , , x, y] = (await blockTransform(page)).match(/-?[\d.]+/g)!.map(Number)
    expect(x).toBeLessThan(0)
    expect(y).toBeGreaterThan(0)
  })
})
