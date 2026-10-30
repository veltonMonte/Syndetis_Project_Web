export type Business = 'loja' | 'cardapio' | 'evento'
export type Template = 'essencial' | 'editorial' | 'organico'

export type StoreComponentType =
  | 'announcement'
  | 'hero'
  | 'categories'
  | 'products'
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

export const templates: { id: Template; name: string; category: string; image: string; accent: string }[] = [
  { id: 'organico', name: 'Orgânico', category: 'Design que respira', image: 'photo-1600585154340-be6161a56a0c', accent: '#6857eb' },
  { id: 'editorial', name: 'Editorial', category: 'Sua marca em destaque', image: 'photo-1513694203232-719a280e022f', accent: '#7d73ff' },
  { id: 'essencial', name: 'Essencial', category: 'O simples bem feito', image: 'photo-1497366216548-37526070297c', accent: '#5346bf' },
]

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
    description: config.description || initialConfig.description,
    business: 'loja',
    template: config.template || 'organico',
    accent: /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : '#6857eb',
    components: Array.isArray(config.components) && config.components.length > 0 ? config.components : defaultComponents,
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
      !templates.some(t => t.id === draft.template) ||
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
