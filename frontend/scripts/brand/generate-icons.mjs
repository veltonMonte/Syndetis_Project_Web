// Generates every static brand file from one geometry: the favicon (SVG + ICO), the
// apple-touch-icon, the web-manifest icons and the standalone symbol SVGs in public/brand.
// Run from frontend/: node scripts/brand/generate-icons.mjs   (needs Playwright's Chromium)
//
// The same path is drawn by src/components/syndetis-logo.tsx; change both together.
// Usage rules: docs/product/marca.md.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public')

// 48-unit grid; the drawing spans 4..44 on both axes.
const BASE =
  'M8 8h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4v4a4 4 0 0 1 4 4h4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4h-4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4v-4a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Z'
const BLOCK = '<rect x="28" y="4" width="16" height="16" rx="4"'

// Echo theme values (src/components/echo/echo-theme*.css).
const C = {
  chassis: '#08051c', // --echo-surface, dark device
  paperInk: '#f5f3ff', // --echo-text, dark device
  ink: '#211f2b', // --echo-text, light device
  accent: '#6857eb', // --echo-accent
  glow: '#7d73ff', // --echo-accent-glow
}

const symbol = (ink, block) => `<path fill="${ink}" d="${BASE}"/>${BLOCK} fill="${block}"/>`

/** The drawing scaled about the grid centre (24, 24). */
const scaled = (scale, ink, block) => {
  const o = +(24 - 24 * scale).toFixed(3)
  return `<g transform="matrix(${scale} 0 0 ${scale} ${o} ${o})">${symbol(ink, block)}</g>`
}

const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>\n`

// App icon: dark chassis tile, so it reads on light and dark tab bars alike.
const tile = (radius, scale) =>
  svg('0 0 48 48', `<rect width="48" height="48" rx="${radius}" fill="${C.chassis}"/>${scaled(scale, C.paperInk, C.glow)}`)

const files = {
  'favicon.svg': tile(11, 0.82),
  // Old favicon URL, kept so cached tabs and external links to /syndetis.svg don't 404.
  'syndetis.svg': tile(11, 0.82),
  'brand/syndetis-symbol.svg': svg('4 4 40 40', symbol(C.ink, C.accent)),
  'brand/syndetis-symbol-dark.svg': svg('4 4 40 40', symbol(C.paperInk, C.glow)),
  'brand/syndetis-symbol-mono.svg': svg('4 4 40 40', symbol('#000', '#000')),
  'brand/syndetis-app-icon.svg': tile(11, 0.82),
}

const rasters = [
  // name, size, svg
  ['favicon-16.png', 16, tile(11, 0.82)],
  ['favicon-32.png', 32, tile(11, 0.82)],
  // iOS rounds the corners itself and wants the art inset.
  ['apple-touch-icon.png', 180, tile(0, 0.66)],
  ['icons/icon-192.png', 192, tile(11, 0.82)],
  ['icons/icon-512.png', 512, tile(11, 0.82)],
  // Maskable: full bleed, art inside the 80% safe circle.
  ['icons/icon-maskable-512.png', 512, tile(0, 0.56)],
]

for (const [name, content] of Object.entries(files)) {
  const path = join(root, name)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

const browser = await chromium.launch()
const png = {}
for (const [name, size, content] of rasters) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${content.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  )
  png[name] = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
}
await browser.close()

for (const [name, data] of Object.entries(png)) {
  if (name.startsWith('favicon-')) continue
  const path = join(root, name)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
}

// favicon.ico: a 16 px and a 32 px PNG in one ICO container, for browsers without SVG favicons.
const entries = [
  [16, png['favicon-16.png']],
  [32, png['favicon-32.png']],
]
const header = Buffer.alloc(6 + 16 * entries.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(entries.length, 4)
let offset = header.length
entries.forEach(([size, data], i) => {
  const at = 6 + 16 * i
  header.writeUInt8(size, at)
  header.writeUInt8(size, at + 1)
  header.writeUInt16LE(1, at + 4)
  header.writeUInt16LE(32, at + 6)
  header.writeUInt32LE(data.length, at + 8)
  header.writeUInt32LE(offset, at + 12)
  offset += data.length
})
await writeFile(join(root, 'favicon.ico'), Buffer.concat([header, ...entries.map(([, data]) => data)]))

console.log('brand icons written to', root)
