// Generates the demo store's product illustrations as plain SVG files. No third-party images:
// every picture is drawn here from simple shapes, so the demo has no licensing question.
//   node scripts/demo-store/generate-images.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products } from './catalog.mjs'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'public', 'images', 'demo')

const shapes = {
  mug: c => `<rect x="300" y="330" width="320" height="340" rx="38" fill="${c.main}"/><path d="M620 410h50a70 70 0 0 1 0 140h-50" fill="none" stroke="${c.main}" stroke-width="42"/><rect x="300" y="330" width="320" height="56" rx="28" fill="${c.dark}" opacity=".35"/>`,
  candle: c => `<rect x="330" y="380" width="260" height="300" rx="30" fill="${c.main}"/><rect x="330" y="470" width="260" height="90" fill="${c.light}"/><path d="M460 380v-60" stroke="${c.dark}" stroke-width="10"/><path d="M460 230c40 50 30 90 0 100c-30-10-40-50 0-100z" fill="#f4b740"/>`,
  notebook: c => `<rect x="300" y="260" width="330" height="440" rx="18" fill="${c.main}"/><rect x="300" y="260" width="44" height="440" fill="${c.dark}" opacity=".5"/><rect x="390" y="350" width="190" height="70" rx="8" fill="${c.light}"/><path d="M600 260v200" stroke="${c.accent}" stroke-width="16"/>`,
  tote: c => `<path d="M380 360c0-110 160-110 160 0" fill="none" stroke="${c.dark}" stroke-width="22"/><path d="M290 360h340l-30 330H320z" fill="${c.main}"/><circle cx="460" cy="520" r="54" fill="${c.accent}" opacity=".8"/>`,
  pot: c => `<path d="M460 340c-80-90-150-60-140-10c60 0 100 10 140 10zM460 340c70-110 150-80 150-30c-70 0-110 20-150 30zM460 340c-10-110 40-150 60-120c-20 40-40 80-60 120z" fill="#4f8a5b"/><path d="M330 400h260l-30 280H360z" fill="${c.main}"/><rect x="320" y="390" width="280" height="40" rx="10" fill="${c.dark}"/>`,
  lamp: c => `<path d="M330 420c0-140 260-140 260 0z" fill="${c.main}"/><rect x="450" y="420" width="20" height="230" fill="${c.dark}"/><ellipse cx="460" cy="665" rx="120" ry="26" fill="${c.dark}"/><ellipse cx="460" cy="430" rx="60" ry="14" fill="#ffe7a3"/>`,
  watch: c => `<rect x="410" y="200" width="100" height="520" rx="30" fill="${c.dark}"/><circle cx="460" cy="460" r="150" fill="${c.main}"/><circle cx="460" cy="460" r="122" fill="${c.light}"/><path d="M460 460V375M460 460l60 35" stroke="${c.dark}" stroke-width="12" stroke-linecap="round"/>`,
  headphones: c => `<path d="M310 520v-60a150 150 0 0 1 300 0v60" fill="none" stroke="${c.dark}" stroke-width="34"/><rect x="270" y="480" width="100" height="170" rx="44" fill="${c.main}"/><rect x="550" y="480" width="100" height="170" rx="44" fill="${c.main}"/>`,
  sunglasses: c => `<path d="M250 420h420" stroke="${c.dark}" stroke-width="20"/><rect x="260" y="410" width="170" height="130" rx="60" fill="${c.main}"/><rect x="490" y="410" width="170" height="130" rx="60" fill="${c.main}"/><path d="M430 450q30-24 60 0" fill="none" stroke="${c.dark}" stroke-width="16"/>`,
  backpack: c => `<rect x="320" y="290" width="280" height="400" rx="80" fill="${c.main}"/><rect x="360" y="480" width="200" height="150" rx="30" fill="${c.dark}" opacity=".45"/><path d="M400 290c0-70 120-70 120 0" fill="none" stroke="${c.dark}" stroke-width="20"/>`,
  bottle: c => `<rect x="400" y="230" width="120" height="70" rx="16" fill="${c.dark}"/><rect x="370" y="290" width="180" height="420" rx="60" fill="${c.main}"/><rect x="370" y="420" width="180" height="110" fill="${c.light}" opacity=".7"/>`,
  stool: c => `<ellipse cx="460" cy="330" rx="170" ry="44" fill="${c.main}"/><path d="M340 350l-50 340M580 350l50 340M420 360l-15 330M500 360l15 330" stroke="${c.dark}" stroke-width="22" stroke-linecap="round"/><path d="M320 560h280" stroke="${c.dark}" stroke-width="14"/>`,
}

function svg(product) {
  const c = product.colors
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 920" role="img" aria-label="${product.name}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.bg2}"/></linearGradient></defs>
<rect width="920" height="920" fill="url(#bg)"/>
<ellipse cx="460" cy="730" rx="250" ry="38" fill="#000" opacity=".12"/>
${shapes[product.shape](c)}
</svg>
`
}

await mkdir(out, { recursive: true })
for (const product of products) await writeFile(join(out, product.image), svg(product))
console.info(`${products.length} ilustrações geradas em ${out}`)
