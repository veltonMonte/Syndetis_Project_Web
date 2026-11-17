// The demo store's catalog: categories, 12 products with stock, and the orders that fill the dashboard.
// Images are drawn by generate-images.mjs and served by the frontend from /images/demo/.

export const store = {
  name: 'Casa Brisa',
  slug: 'casa-brisa',
  shippingFee: 18.9,
  deliveryInstructions: 'Envio em até 2 dias úteis, com rastreio por e-mail.',
}

export const categories = [
  { name: 'Casa', slug: 'casa', position: 0 },
  { name: 'Cozinha', slug: 'cozinha', position: 1 },
  { name: 'Acessórios', slug: 'acessorios', position: 2 },
]

const palette = (bg1, bg2, main, dark, light, accent = dark) => ({ bg1, bg2, main, dark, light, accent })

export const products = [
  { sku: 'BRISA-001', name: 'Caneca Cerâmica Terra', category: 'cozinha', price: 79.9, stock: 40, shape: 'mug', image: 'caneca-terra.svg', colors: palette('#f6ede4', '#ead7c5', '#b8664a', '#6e3424', '#e8b9a2'), description: 'Cerâmica esmaltada à mão, 320 ml. Vai ao micro-ondas e à lava-louças.' },
  { sku: 'BRISA-002', name: 'Vela Aromática Alecrim', category: 'casa', price: 59.9, stock: 55, shape: 'candle', image: 'vela-alecrim.svg', colors: palette('#eef1e8', '#d8e0cc', '#f3efe4', '#59684a', '#9fb38a'), description: 'Cera vegetal com óleo essencial de alecrim. Cerca de 40 horas de queima.' },
  { sku: 'BRISA-003', name: 'Caderno Linho A5', category: 'acessorios', price: 49.9, stock: 70, shape: 'notebook', image: 'caderno-linho.svg', colors: palette('#eceff3', '#d6dce6', '#3f5a7a', '#1f2f44', '#e6ebf2', '#d9a441'), description: 'Capa em linho, 160 páginas pontilhadas em papel pólen 90 g.' },
  { sku: 'BRISA-004', name: 'Ecobag Algodão Cru', category: 'acessorios', price: 39.9, stock: 90, shape: 'tote', image: 'ecobag-algodao.svg', colors: palette('#f5f1e8', '#e7dfcd', '#e9dfc8', '#7b6a4c', '#f8f4ea', '#c4553b'), description: 'Algodão cru 100%, alças reforçadas e bolso interno.' },
  { sku: 'BRISA-005', name: 'Vaso Concreto Mini', category: 'casa', price: 69.9, stock: 32, shape: 'pot', image: 'vaso-concreto.svg', colors: palette('#eef0ee', '#d9dedb', '#a7aeab', '#5e6663', '#cdd3d0'), description: 'Concreto aparente com furo de drenagem. 12 cm de altura.' },
  { sku: 'BRISA-006', name: 'Luminária Cúpula Nuvem', category: 'casa', price: 249, stock: 14, shape: 'lamp', image: 'luminaria-cupula.svg', colors: palette('#f3eee8', '#e2d6c9', '#efe6d8', '#5d4a3a', '#fff6e2'), description: 'Cúpula em tecido e base em madeira. Bivolt, lâmpada E27.' },
  { sku: 'BRISA-007', name: 'Relógio Minimal Areia', category: 'acessorios', price: 329, stock: 12, shape: 'watch', image: 'relogio-areia.svg', colors: palette('#f1ece4', '#ded2c2', '#c9b79c', '#3b332a', '#f8f4ee'), description: 'Caixa de 38 mm em aço, pulseira de couro e resistência à água 5 ATM.' },
  { sku: 'BRISA-008', name: 'Fone Over-ear Neblina', category: 'acessorios', price: 459, stock: 9, shape: 'headphones', image: 'fone-neblina.svg', colors: palette('#e9ecef', '#cfd6dd', '#8796a5', '#2c3640', '#dfe5ea'), description: 'Bluetooth 5.3, 40 horas de bateria e almofadas em espuma viscoelástica.' },
  { sku: 'BRISA-009', name: 'Óculos de Sol Âmbar', category: 'acessorios', price: 189, stock: 22, shape: 'sunglasses', image: 'oculos-ambar.svg', colors: palette('#fbf1e3', '#f1d9b8', '#c8822f', '#3a2412', '#f3c78f'), description: 'Armação em acetato e lentes com proteção UV400.' },
  { sku: 'BRISA-010', name: 'Mochila Urbana Musgo', category: 'acessorios', price: 299, stock: 18, shape: 'backpack', image: 'mochila-musgo.svg', colors: palette('#edf0e9', '#d6ddcc', '#6b7a4f', '#353f24', '#a7b58a'), description: 'Lona encerada, compartimento para notebook de 15" e fundo impermeável.' },
  { sku: 'BRISA-011', name: 'Garrafa Térmica 500 ml', category: 'cozinha', price: 119, stock: 48, shape: 'bottle', image: 'garrafa-termica.svg', colors: palette('#e8f1f1', '#cfe2e1', '#3f8c88', '#1d4644', '#bfe0de'), description: 'Aço inox de parede dupla: 12 h quente, 24 h gelado.' },
  { sku: 'BRISA-012', name: 'Banqueta Madeira Clara', category: 'casa', price: 389, stock: 7, shape: 'stool', image: 'banqueta-madeira.svg', colors: palette('#f5efe6', '#e6d9c6', '#d8b98c', '#8a6a42', '#efdcc0'), description: 'Pinus de reflorestamento com acabamento em verniz à base de água. 45 cm.' },
]

/**
 * Orders by a demo buyer, by SKU and quantity, and the status each one is taken to by the seller.
 * PENDING orders keep their stock reserved until they expire (ORDER_RESERVATION_TTL_MINUTES).
 */
export const orders = [
  { items: [['BRISA-001', 2], ['BRISA-011', 1]], status: 'DELIVERED' },
  { items: [['BRISA-007', 1]], status: 'DELIVERED' },
  { items: [['BRISA-008', 1], ['BRISA-003', 2]], status: 'DELIVERED' },
  { items: [['BRISA-006', 1], ['BRISA-002', 3]], status: 'SHIPPED' },
  { items: [['BRISA-010', 1]], status: 'SHIPPED' },
  { items: [['BRISA-012', 2]], status: 'PAID' },
  { items: [['BRISA-009', 1], ['BRISA-004', 2]], status: 'PAID' },
  { items: [['BRISA-005', 3]], status: 'PAID' },
  { items: [['BRISA-002', 2], ['BRISA-001', 1]], status: 'PENDING' },
  { items: [['BRISA-011', 2]], status: 'CANCELED' },
]
