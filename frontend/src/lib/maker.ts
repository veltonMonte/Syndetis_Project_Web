export type Business = 'loja' | 'cardapio' | 'evento'
export type Template = 'pulso' | 'ambar' | 'aurora' | 'prisma' | 'vetor' | 'eon' | 'presenca' | 'impacto' | 'horizonte' | 'linha' | 'forma' | 'essencial' | 'editorial' | 'organico' | 'blank'

export type StoreComponentType =
  | 'announcement'
  | 'hero'
  | 'categories'
  | 'products'
  | 'product-detail'
  | 'editorial-banner'
  | 'benefits'
  | 'testimonials'
  | 'newsletter'
  | 'footer'

export type ComponentVariant = 'grid' | 'editorial' | 'minimal' | 'highlight'

export interface StoreComponent {
  id: string
  type: StoreComponentType
  title: string
  subtitle: string
  ctaText?: string
  imageUrl?: string
  imageAlt?: string
  productId?: string
  productIds?: string[]
  imageFit?: 'cover' | 'contain'
  imagePresentation?: 'photo' | 'cutout'
  facts?: { label: string; value: string }[]
  variant: ComponentVariant
  visible: boolean
  badge?: string
}

export interface StoreCategory {
  id: string
  name: string
  slug: string
  description: string
  featured: boolean
}

export interface StoreProduct {
  id: string
  name: string
  slug: string
  categoryId: string
  price: number
  compareAtPrice?: number
  stock: number
  sku: string
  image: string
  badge?: string
  featured: boolean
  description?: string
  gallery?: string[]
  options?: { label: string; values: string[] }[]
  returnPolicy?: string
}

export interface StoreSettings {
  slug: string
  currency: string
  freeShippingThreshold: number
  enablePix: boolean
  pixDiscountPercent: number
  enableCard: boolean
  maxInstallments: number
  enableBoleto: boolean
  supportEmail: string
  whatsapp: string
  seoTitle: string
  seoDescription: string
  published: boolean
  publishedAt?: string
}

export interface LayoutConfig {
  version: 1
  name: string
  description: string
  business: Business
  template: Template
  accent: string
  branding?: { logoUrl?: string; headingFontFamily?: string; bodyFontFamily?: string }
  components?: StoreComponent[]
  categories?: StoreCategory[]
  products?: StoreProduct[]
  settings?: StoreSettings
}

export const photo = (id: string, width = 800) =>
  id.startsWith('http') || id.startsWith('/')
    ? id
    : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export const defaultCategories: StoreCategory[] = [
  {
    id: 'cat-essenciais',
    name: 'Essenciais',
    slug: 'essenciais',
    description: 'Peças atemporais para o dia a dia com acabamento autoral.',
    featured: true,
  },
  {
    id: 'cat-lancamentos',
    name: 'Lançamentos',
    slug: 'lancamentos',
    description: 'Novas séries numeradas e tiragens exclusivas da estação.',
    featured: true,
  },
  {
    id: 'cat-objetos',
    name: 'Objetos & Casa',
    slug: 'objetos-casa',
    description: 'Design funcional em cerâmica, metal escovado e vidro.',
    featured: true,
  },
  {
    id: 'cat-edicao-limitada',
    name: 'Edição Limitada',
    slug: 'edicao-limitada',
    description: 'Colaborações especiais produzidas em pequena escala.',
    featured: false,
  },
]

export const defaultProducts: StoreProduct[] = [
  {
    id: 'prod-1',
    name: 'Cronógrafo Monolith 01',
    slug: 'cronografo-monolith-01',
    categoryId: 'cat-essenciais',
    price: 680,
    compareAtPrice: 790,
    stock: 18,
    sku: 'SYN-MN-01',
    image: 'photo-1523275335684-37898b6baf30',
    badge: 'Mais vendido',
    featured: true,
  },
  {
    id: 'prod-2',
    name: 'Headphone Acoustic Studio',
    slug: 'headphone-acoustic-studio',
    categoryId: 'cat-lancamentos',
    price: 920,
    compareAtPrice: 1090,
    stock: 11,
    sku: 'SYN-AC-02',
    image: 'photo-1505740420928-5e560c06d30e',
    badge: 'Novo',
    featured: true,
  },
  {
    id: 'prod-3',
    name: 'Câmera Analógica K-Series',
    slug: 'camera-analogica-k-series',
    categoryId: 'cat-edicao-limitada',
    price: 1240,
    stock: 6,
    sku: 'SYN-CM-03',
    image: 'photo-1526170375885-4d8ecf77b99f',
    badge: 'Edição Limitada',
    featured: true,
  },
  {
    id: 'prod-4',
    name: 'Luminária Escultural Aura',
    slug: 'luminaria-escultural-aura',
    categoryId: 'cat-objetos',
    price: 540,
    stock: 24,
    sku: 'SYN-LM-04',
    image: 'photo-1513506003901-1e6a229e2d15',
    featured: true,
  },
]

export const defaultComponents: StoreComponent[] = [
  {
    id: 'comp-announcement',
    type: 'announcement',
    title: 'Frete grátis para todo o Brasil em compras acima de R$ 299 · 5% OFF no Pix',
    subtitle: 'Envio expresso com rastreio em tempo real',
    variant: 'minimal',
    visible: true,
    badge: 'Topo',
  },
  {
    id: 'comp-hero',
    type: 'hero',
    title: 'Design autoral.\nFeito para durar.',
    subtitle: 'Curadoria de objetos, acessórios e peças essenciais com acabamento de precisão.',
    ctaText: 'Explorar coleção',
    variant: 'editorial',
    visible: true,
    badge: 'Destaque',
  },
  {
    id: 'comp-categories',
    type: 'categories',
    title: 'Navegue por categorias',
    subtitle: 'Coleções pensadas para cada momento.',
    ctaText: 'Ver todas',
    variant: 'grid',
    visible: true,
  },
  {
    id: 'comp-products',
    type: 'products',
    title: 'Destaques da vitrine',
    subtitle: 'Seleção principal da temporada disponível para envio imediato.',
    ctaText: 'Ver catálogo completo',
    variant: 'grid',
    visible: true,
  },
  {
    id: 'comp-benefits',
    type: 'benefits',
    title: 'Experiência garantida do pedido à entrega',
    subtitle: 'Pagamento seguro via Pix ou Cartão em até 10x · Troca fácil em 30 dias',
    variant: 'minimal',
    visible: true,
  },
  {
    id: 'comp-footer',
    type: 'footer',
    title: 'Atendimento humano e entrega em todo o país.',
    subtitle: 'Powered by Ecossistema Syndetis · Loja Oficial',
    variant: 'minimal',
    visible: true,
  },
]

export const defaultSettings: StoreSettings = {
  slug: 'syndetis-store',
  currency: 'BRL',
  freeShippingThreshold: 299,
  enablePix: true,
  pixDiscountPercent: 5,
  enableCard: true,
  maxInstallments: 10,
  enableBoleto: false,
  supportEmail: 'contato@syndetis.app',
  whatsapp: '+55 (11) 99812-4400',
  seoTitle: 'Syndetis Store — Design Autoral & Essenciais',
  seoDescription: 'Loja virtual oficial criada com a Sessão Maker da Syndetis.',
  published: true,
  publishedAt: '2026-10-29T00:30:00Z',
}

export const COMPONENT_LIBRARY: {
  type: StoreComponentType
  label: string
  description: string
  defaultTitle: string
  defaultSubtitle: string
  defaultCta?: string
  defaultVariant: ComponentVariant
}[] = [
  {
    type: 'announcement',
    label: 'Barra de Avisos',
    description: 'Faixa superior para frete grátis, cupom ativo ou aviso de envio.',
    defaultTitle: 'Frete grátis acima de R$ 299 · 5% OFF no Pix imediato',
    defaultSubtitle: 'Promoção válida por tempo limitado',
    defaultVariant: 'minimal',
  },
  {
    type: 'hero',
    label: 'Hero Principal',
    description: 'Abertura de impacto com título editorial, imagem e botão de ação.',
    defaultTitle: 'Sua marca.\nEm movimento.',
    defaultSubtitle: 'Peças criadas com identidade própria e acabamento impecável.',
    defaultCta: 'Conhecer coleção',
    defaultVariant: 'editorial',
  },
  {
    type: 'categories',
    label: 'Grade de Categorias',
    description: 'Exibe as categorias ativas da sua loja para navegação rápida.',
    defaultTitle: 'Explore por categoria',
    defaultSubtitle: 'Encontre exatamente o que procura.',
    defaultCta: 'Ver categorias',
    defaultVariant: 'grid',
  },
  {
    type: 'products',
    label: 'Vitrine de Produtos',
    description: 'Grade com seus produtos cadastrados, preços e selos de destaque.',
    defaultTitle: 'Seleção em destaque',
    defaultSubtitle: 'Os favoritos dos nossos clientes.',
    defaultCta: 'Comprar agora',
    defaultVariant: 'grid',
  },
  {
    type: 'product-detail',
    label: 'Produto em destaque',
    description: 'Galeria de imagens e informações de um produto do seu catálogo.',
    defaultTitle: 'Conheça os detalhes',
    defaultSubtitle: 'Apresente o produto e suas informações principais.',
    defaultCta: 'Adicionar à sacola',
    defaultVariant: 'editorial',
  },
  {
    type: 'editorial-banner',
    label: 'Banner Editorial',
    description: 'Bloco visual para contar a história da marca ou destacar um lançamento.',
    defaultTitle: 'Feito com propósito, desenhado para permanecer.',
    defaultSubtitle: 'Cada detalhe do nosso processo une estética minimalista e matéria-prima selecionada.',
    defaultCta: 'Nossa história',
    defaultVariant: 'highlight',
  },
  {
    type: 'benefits',
    label: 'Benefícios & Garantias',
    description: 'Selos de confiança: frete rápido, Pix com desconto e garantia.',
    defaultTitle: 'Compra 100% protegida e envio em até 24h',
    defaultSubtitle: 'Pix com aprovação instantânea · Até 10x sem juros · Primeira troca grátis',
    defaultVariant: 'minimal',
  },
  {
    type: 'testimonials',
    label: 'Depoimentos de Clientes',
    description: 'Prova social com avaliações verificadas de quem já comprou.',
    defaultTitle: 'Quem recebe, recomenda',
    defaultSubtitle: 'Avaliação média 4,9/5 baseada em mais de 420 pedidos entregues.',
    defaultVariant: 'grid',
  },
  {
    type: 'newsletter',
    label: 'Clube & Newsletter',
    description: 'Captura de e-mail para oferecer cupom na primeira compra.',
    defaultTitle: 'Ganhe 10% OFF no primeiro pedido',
    defaultSubtitle: 'Entre para a lista exclusiva e receba lançamentos antes de todo mundo.',
    defaultCta: 'Quero meu cupom',
    defaultVariant: 'highlight',
  },
  {
    type: 'footer',
    label: 'Rodapé da Loja',
    description: 'Links institucionais, canais de atendimento, selos de pagamento e CNPJ.',
    defaultTitle: 'Atendimento dedicado de segunda a sábado.',
    defaultSubtitle: 'Pagamentos via Pix, Visa, Mastercard e Elo · Ambiente criptografado',
    defaultVariant: 'minimal',
  },
]

export const PRODUCT_IMAGE_PRESETS = [
  { label: 'Relógio Minimal', id: 'photo-1523275335684-37898b6baf30' },
  { label: 'Headphone Studio', id: 'photo-1505740420928-5e560c06d30e' },
  { label: 'Câmera Analógica', id: 'photo-1526170375885-4d8ecf77b99f' },
  { label: 'Luminária Design', id: 'photo-1513506003901-1e6a229e2d15' },
  { label: 'Cerâmica Autoral', id: 'photo-1578749556568-bc2c40e68b61' },
  { label: 'Óculos Acetato', id: 'photo-1511499767150-a48a237f0083' },
  { label: 'Mochila Urbana', id: 'photo-1548036328-c9fa89d128fa' },
  { label: 'Perfume Botânico', id: 'photo-1541643600914-78b084683601' },
]

export const initialConfig: LayoutConfig = {
  version: 1,
  name: 'Syndetis Studio',
  description: 'Curadoria de objetos autorais, tecnologia minimalista e peças essenciais para o cotidiano.',
  business: 'loja',
  template: 'organico',
  accent: '#6857eb',
  components: defaultComponents,
  categories: defaultCategories,
  products: defaultProducts,
  settings: defaultSettings,
}

export interface StoreTemplate {
  id: 'linha' | 'forma' | 'essencial' | 'presenca' | 'impacto' | 'horizonte' | 'pulso' | 'ambar' | 'aurora' | 'prisma' | 'vetor' | 'eon'
  name: string
  category: string
  image: string
  accent: string
  background: string
  ink: string
  headingFont: string
  bodyFont?: string
  collection?: 'premium' | 'movimento'
  cinematic?: { layout: 'cinematic' | 'editorial' | 'mosaic' | 'technical' | 'catalog' | 'immersive'; artwork: string; alt: string; gradient: [string, string, string]; headline: string }
  heroStart?: string
  heroEnd?: string
  radius: number
  sections: StoreComponentType[]
}

export const templates: StoreTemplate[] = [
  { id: 'linha', name: 'Linha', category: 'Composição editorial, marca ao centro e fotos amplas.', image: '', accent: '#16181d', background: '#f8f8f6', ink: '#16181d', headingFont: 'Newsreader, Georgia, serif', radius: 0, sections: ['announcement', 'hero', 'products', 'editorial-banner', 'footer'] },
  { id: 'forma', name: 'Forma', category: 'Destaque central, contornos suaves e navegação por categorias.', image: '', accent: '#2f4a3a', background: '#e9ede3', ink: '#1f2b24', headingFont: 'Newsreader, Georgia, serif', radius: 1, sections: ['announcement', 'hero', 'categories', 'products', 'editorial-banner', 'footer'] },
  { id: 'essencial', name: 'Essencial', category: 'Catálogo em foco, busca em destaque e cartões de produtos.', image: '', accent: '#1d4ed8', background: '#ffffff', ink: '#0f1729', headingFont: 'Space Grotesk, Arial, sans-serif', radius: 0.4, sections: ['announcement', 'hero', 'benefits', 'products', 'footer'] },
  { id: 'presenca', name: 'Presença', category: 'Abertura imersiva, tipografia de contraste e composição simétrica.', image: '', collection: 'premium', accent: '#6b1f2e', background: '#f7f7f8', ink: '#1a1417', headingFont: 'Bodoni Moda, Georgia, serif', bodyFont: 'Jost, Segoe UI, sans-serif', heroStart: '#35101a', heroEnd: '#6b1f2e', radius: 0.1, sections: ['announcement', 'hero', 'categories', 'products', 'product-detail', 'editorial-banner', 'footer'] },
  { id: 'impacto', name: 'Impacto', category: 'Títulos expressivos, blocos amplos e catálogo com linhas marcadas.', image: '', collection: 'premium', accent: '#2740ff', background: '#e6e6e3', ink: '#0d0d12', headingFont: 'Barlow Condensed, Impact, sans-serif', bodyFont: 'Barlow, Segoe UI, sans-serif', heroStart: '#2740ff', heroEnd: '#1a2bd0', radius: 0, sections: ['announcement', 'hero', 'categories', 'products', 'product-detail', 'editorial-banner', 'footer'] },
  { id: 'horizonte', name: 'Horizonte', category: 'Superfícies suaves, respiro entre seções e destaque para os produtos.', image: '', collection: 'premium', accent: '#0e3b43', background: '#f0f4f5', ink: '#0e3b43', headingFont: 'Instrument Serif, Georgia, serif', bodyFont: 'Figtree, Segoe UI, sans-serif', heroStart: '#0e3b43', heroEnd: '#2a6770', radius: 1, sections: ['announcement', 'hero', 'categories', 'products', 'product-detail', 'editorial-banner', 'footer'] },
  {"id":"pulso","name":"Pulso","category":"Campanha imersiva, produtos em leque e cartão de vidro.","image":"","collection":"movimento","accent":"#173db4","background":"#fafaf8","ink":"#17202a","headingFont":"Archivo Black, Arial, sans-serif","bodyFont":"Bricolage Grotesque, Segoe UI, sans-serif","radius":0.8,"cinematic":{"artwork":"/images/templates/movimento-pulso.webp","alt":"Três embalagens de demonstração com acabamento metálico e padrões marmorizados.","gradient":["#173db4","#10b58e","#f77d66"],"headline":"Feito para\nse destacar.","layout":"cinematic"},"sections":["announcement","hero","categories","products","product-detail","editorial-banner","footer"]},
  {"id":"ambar","name":"Âmbar","category":"Editorial em duas colunas, narrativa e fotos amplas.","image":"","collection":"movimento","accent":"#291712","background":"#f5f0e8","ink":"#342b24","headingFont":"Instrument Serif, Georgia, serif","bodyFont":"Bricolage Grotesque, Segoe UI, sans-serif","radius":0.8,"cinematic":{"artwork":"/images/templates/movimento-ambar.webp","alt":"Embalagens, garrafa âmbar e cerâmica em uma composição de demonstração.","gradient":["#291712","#ab503b","#e6a758"],"headline":"Tempo de\nsentir.","layout":"editorial"},"sections":["hero","editorial-banner","categories","products","product-detail","footer"]},
  {"id":"aurora","name":"Aurora","category":"Mosaico assimétrico com blocos de coleção e fotos.","image":"","collection":"movimento","accent":"#b51d59","background":"#fff9f1","ink":"#291728","headingFont":"Archivo Black, Arial, sans-serif","bodyFont":"Bricolage Grotesque, Segoe UI, sans-serif","radius":0.8,"cinematic":{"artwork":"/images/templates/movimento-aurora.webp","alt":"Três garrafas de demonstração com cores cítricas e elementos de frutas.","gradient":["#b51d59","#f15c2e","#f7c844"],"headline":"Uma nova\nenergia.","layout":"mosaic"},"sections":["announcement","hero","categories","editorial-banner","products","product-detail","footer"]},
  {"id":"prisma","name":"Prisma","category":"Produto ao centro, características e descrição.","image":"","collection":"movimento","accent":"#c93232","background":"#ffffff","ink":"#15191d","headingFont":"Bricolage Grotesque, Arial, sans-serif","bodyFont":"Bricolage Grotesque, Segoe UI, sans-serif","radius":0.8,"cinematic":{"artwork":"/images/templates/movimento-prisma-tecnico.webp","alt":"Produto de demonstração: patinete elétrico em verde-petróleo, visto de lado.","gradient":["#142c54","#6b9fca","#eef7fa"],"headline":"Leve em\ncada detalhe.","layout":"technical"},"sections":["hero","products","product-detail","benefits","footer"]},
  {"id":"vetor","name":"Vetor","category":"Catálogo primeiro, categorias laterais e busca.","image":"","collection":"movimento","accent":"#1e2826","background":"#f8f9f7","ink":"#17211b","headingFont":"Bricolage Grotesque, Arial, sans-serif","bodyFont":"Bricolage Grotesque, Segoe UI, sans-serif","radius":0.8,"cinematic":{"artwork":"/images/templates/movimento-vetor.webp","alt":"Três calçados de demonstração com texturas de tecido e detalhes em lima.","gradient":["#1e2826","#1d7356","#c8e84b"],"headline":"Seu próximo\nmovimento.","layout":"catalog"},"sections":["announcement","categories","products","hero","product-detail","footer"]},
  {"id":"eon","name":"Éon","category":"Vitrine escura, fotografia ampla e faixa de produtos.","image":"","collection":"movimento","accent":"#b59059","background":"#151413","ink":"#f6f0e6","headingFont":"Instrument Serif, Georgia, serif","bodyFont":"Bricolage Grotesque, Segoe UI, sans-serif","radius":0.8,"cinematic":{"artwork":"/images/templates/movimento-eon.webp","alt":"Composição de demonstração com relógio, vidro facetado e couro.","gradient":["#19171a","#6a4332","#c0a773"],"headline":"O essencial,\nem outra luz.","layout":"immersive"},"sections":["hero","editorial-banner","products","product-detail","footer"]},
]

export const templateCollections = [
  { id: 'original', title: 'Coleção original', description: 'Bases versáteis para começar e personalizar.', templates: templates.filter(item => !item.collection) },
  { id: 'premium', title: 'Coleção premium', description: 'Composições com abertura imersiva e mais detalhes de produto.', templates: templates.filter(item => item.collection === 'premium') },
  { id: 'movimento', title: 'Coleção Movimento', description: 'Seis bases distintas: campanha, editorial, mosaico, produto, catálogo e vitrine escura.', templates: templates.filter(item => item.collection === 'movimento') },
]

export function getStoreTemplate(id: Template): StoreTemplate {
  return templates.find(t => t.id === id) || templates[id === 'organico' ? 1 : 0]
}

export function isKnownTemplate(id: unknown): id is Template {
  return typeof id === 'string' && ['blank', 'editorial', 'organico', ...templates.map(t => t.id)].includes(id)
}

export const DRAFT_KEY = 'syndetis-maker-v1'

/** WCAG relative luminance: choose readable text even for arbitrary brand colours. */
export function accentInk(hex: string) {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#6857eb'
  const channels = clean.match(/[a-f\d]{2}/gi)!.map(v => {
    const value = parseInt(v, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const light = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return light > 0.179 ? '#000000' : '#ffffff'
}

export function ensureFullConfig(config: LayoutConfig): Required<LayoutConfig> {
  return {
    version: 1,
    name: config.name || initialConfig.name,
    description: typeof config.description === 'string' ? config.description : initialConfig.description,
    business: 'loja',
    branding: config.branding || {},
    template: config.template || 'organico',
    accent: /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : '#6857eb',
    components: Array.isArray(config.components) ? config.components : defaultComponents,
    categories: Array.isArray(config.categories) ? config.categories : defaultCategories,
    products: Array.isArray(config.products) ? config.products : defaultProducts,
    settings: config.settings ? { ...defaultSettings, ...config.settings } : defaultSettings,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item'
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function readDraft(): LayoutConfig | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    if (
      draft?.version !== 1 ||
      typeof draft.name !== 'string' ||
      typeof draft.description !== 'string' ||
      !['loja', 'cardapio', 'evento'].includes(draft.business) ||
      !isKnownTemplate(draft.template) ||
      !/^#[0-9a-f]{6}$/i.test(draft.accent)
    )
      return null
    if (draft.name === 'Oliva Studio') return initialConfig
    return ensureFullConfig({
      version: 1,
      name: draft.name.slice(0, 60),
      description: draft.description.slice(0, 600),
      business: 'loja',
      template: draft.template,
      accent: draft.accent,
      components: draft.components,
      categories: draft.categories,
      products: draft.products,
      settings: draft.settings,
    })
  } catch {
    return null
  }
}
