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
  cnpj?: string
  cep?: string
  address?: string
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
    description: 'Peças de uso diário com especificações técnicas detalhadas.',
    featured: true,
  },
  {
    id: 'cat-lancamentos',
    name: 'Lançamentos',
    slug: 'lancamentos',
    description: 'Novos lotes disponíveis em estoque para envio imediato.',
    featured: true,
  },
  {
    id: 'cat-objetos',
    name: 'Escritório & Estúdio',
    slug: 'escritorio-estudio',
    description: 'Equipamentos de iluminação, áudio e organização de bancada.',
    featured: true,
  },
  {
    id: 'cat-edicao-limitada',
    name: 'Série Especial',
    slug: 'serie-especial',
    description: 'Tiragens numeradas sob encomenda.',
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
    badge: 'Pronta entrega',
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
    badge: 'Novo lote',
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
    badge: 'Série Especial',
    featured: true,
  },
  {
    id: 'prod-4',
    name: 'Luminária Articulada Aura',
    slug: 'luminaria-articulada-aura',
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
    title: 'Frete grátis em compras acima de R$ 299,00 · 5% de desconto no Pix',
    subtitle: 'Despacho em até 24h úteis com código de rastreio',
    variant: 'minimal',
    visible: true,
    badge: 'Topo',
  },
  {
    id: 'comp-hero',
    type: 'hero',
    title: 'Equipamentos e objetos para trabalho e estúdio',
    subtitle: 'Especificações técnicas transparentes, estoque atualizado em tempo real e envio com nota fiscal.',
    ctaText: 'Ver catálogo completo',
    variant: 'editorial',
    visible: true,
    badge: 'Destaque',
  },
  {
    id: 'comp-categories',
    type: 'categories',
    title: 'Categorias do catálogo',
    subtitle: 'Filtre os produtos por linha de aplicação.',
    ctaText: 'Ver todas as categorias',
    variant: 'grid',
    visible: true,
  },
  {
    id: 'comp-products',
    type: 'products',
    title: 'Produtos em estoque',
    subtitle: 'Itens disponíveis para faturamento e despacho imediato.',
    ctaText: 'Ver todos os itens',
    variant: 'grid',
    visible: true,
  },
  {
    id: 'comp-benefits',
    type: 'benefits',
    title: 'Condições comerciais claras antes do pagamento',
    subtitle: 'Pix com aprovação imediata · Cartão em até 10x · Troca ou devolução em até 7 dias corridos (CDC)',
    variant: 'minimal',
    visible: true,
  },
  {
    id: 'comp-footer',
    type: 'footer',
    title: 'Atendimento direto por WhatsApp e e-mail em horário comercial.',
    subtitle: 'Operado via plataforma Syndetis · Pagamentos processados com criptografia TLS',
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
  enableBoleto: true,
  supportEmail: 'suporte@syndetis.com.br',
  whatsapp: '(11) 99812-4400',
  cnpj: '48.921.304/0001-72',
  cep: '04538-132',
  address: 'Av. Brigadeiro Faria Lima, 3477 — Itaim Bibi, São Paulo/SP',
  seoTitle: 'Syndetis Store — Catálogo Oficial',
  seoDescription: 'Compre online com Pix, cartão ou boleto e acompanhe a entrega em tempo real.',
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
    description: 'Faixa superior para regra de frete grátis, desconto no Pix ou prazo de despacho.',
    defaultTitle: 'Frete grátis acima de R$ 299,00 · 5% de desconto no Pix',
    defaultSubtitle: 'Envio com nota fiscal e rastreio pelos Correios ou transportadora',
    defaultVariant: 'minimal',
  },
  {
    type: 'hero',
    label: 'Cabeçalho da Vitrine (Hero)',
    description: 'Bloco principal com proposta clara da loja, subtítulo objetivo e botão de ação.',
    defaultTitle: 'Catálogo oficial com pronta entrega',
    defaultSubtitle: 'Consulte especificações, disponibilidade de estoque e condições de pagamento no Pix ou cartão.',
    defaultCta: 'Explorar produtos',
    defaultVariant: 'editorial',
  },
  {
    type: 'categories',
    label: 'Grade de Categorias',
    description: 'Exibe as categorias ativas da sua loja para navegação direta.',
    defaultTitle: 'Navegue por categoria',
    defaultSubtitle: 'Acesse rapidamente cada linha de produtos.',
    defaultCta: 'Ver categorias',
    defaultVariant: 'grid',
  },
  {
    type: 'products',
    label: 'Grade de Produtos',
    description: 'Lista os produtos cadastrados com preço, parcelamento e saldo de estoque.',
    defaultTitle: 'Produtos em destaque',
    defaultSubtitle: 'Preços à vista no Pix ou parcelados no cartão de crédito.',
    defaultCta: 'Adicionar ao pedido',
    defaultVariant: 'grid',
  },
  {
    type: 'editorial-banner',
    label: 'Bloco Institucional',
    description: 'Seção de texto e imagem para explicar garantia, origem dos produtos ou especificações.',
    defaultTitle: 'Garantia de fábrica de 12 meses e assistência técnica nacional',
    defaultSubtitle: 'Todos os produtos acompanham nota fiscal eletrônica (NF-e) e manual em português.',
    defaultCta: 'Conhecer política de garantia',
    defaultVariant: 'highlight',
  },
  {
    type: 'benefits',
    label: 'Regras de Frete, Pagamento e Troca',
    description: 'Resumo objetivo de aprovação via Pix, parcelamento e direito de arrependimento.',
    defaultTitle: 'Pagamento transparente e política de troca simplificada',
    defaultSubtitle: 'Pix com desconto · Cartão em até 10x · Devolução gratuita em até 7 dias após o recebimento',
    defaultVariant: 'minimal',
  },
  {
    type: 'testimonials',
    label: 'Avaliações de Compradores',
    description: 'Bloco para exibir relatos reais de clientes com pedido confirmado.',
    defaultTitle: 'Avaliações de clientes verificados',
    defaultSubtitle: 'Exibe apenas comentários vinculados a pedidos reais entregues pela loja.',
    defaultVariant: 'grid',
  },
  {
    type: 'newsletter',
    label: 'Avisos de Reposição por E-mail',
    description: 'Formulário para clientes receberem alertas de estoque e novos lotes.',
    defaultTitle: 'Receba avisos de reposição de estoque',
    defaultSubtitle: 'Informe seu e-mail para ser avisado quando novos lotes chegarem. Sem spam, cancelamento em 1 clique.',
    defaultCta: 'Cadastrar e-mail',
    defaultVariant: 'highlight',
  },
  {
    type: 'footer',
    label: 'Rodapé com Dados Fiscais e Contato',
    description: 'Exibe razão social, CNPJ, canais de suporte humano e meios de pagamento aceitos.',
    defaultTitle: 'Atendimento de segunda a sexta, das 9h às 18h.',
    defaultSubtitle: 'Pagamentos via Pix, Cartão de Crédito e Boleto · Dados protegidos conforme a LGPD',
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
  name: 'Syndetis Store',
  description: 'Equipamentos de estúdio, relojoaria técnica e acessórios essenciais com pronta entrega e nota fiscal.',
  business: 'loja',
  template: 'essencial',
  accent: '#2563eb',
  components: defaultComponents,
  categories: defaultCategories,
  products: defaultProducts,
  settings: defaultSettings,
}

export const templates: { id: Template; name: string; category: string; image: string; accent: string }[] = [
  { id: 'essencial', name: 'Essencial (Grade Densa)', category: 'Foco em catálogo e tabela técnica', image: 'photo-1497366216548-37526070297c', accent: '#2563eb' },
  { id: 'editorial', name: 'Editorial (Destaque)', category: 'Apresentação detalhada de produto', image: 'photo-1513694203232-719a280e022f', accent: '#0284c7' },
  { id: 'organico', name: 'Compacto (Mobile First)', category: 'Checkout rápido para Pix e WhatsApp', image: 'photo-1600585154340-be6161a56a0c', accent: '#0f766e' },
]

export const DRAFT_KEY = 'syndetis-maker-v1'

/** WCAG relative luminance: choose readable text even for arbitrary brand colours. */
export function accentInk(hex: string) {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#2563eb'
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
    template: config.template || 'essencial',
    accent: /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : '#2563eb',
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

export function formatDateBR(isoOrText: string): string {
  if (!isoOrText) return ''
  // Already in dd/mm/aaaa format
  if (/^\d{2}\/\d{2}\/\d{4}/.test(isoOrText)) return isoOrText
  const parsed = new Date(isoOrText)
  if (Number.isNaN(parsed.getTime())) return isoOrText
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
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
