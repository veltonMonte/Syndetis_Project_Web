import { DRAFT_KEY, ensureFullConfig, initialConfig, slugify, type LayoutConfig } from './maker'
import { clearSession, getRefreshToken, getSession, saveSession } from './session'
import type { Layout, Store, Tokens } from './types'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let refreshing: Promise<void> | null = null
async function refresh() {
  const token = getRefreshToken()
  if (!token) {
    clearSession()
    throw new ApiError(401, 'Entre novamente para continuar.')
  }
  saveSession(
    await request<Tokens>(
      '/api/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken: token }) },
      false,
    ),
  )
}

export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const session = getSession()
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`)
  const response = await fetch(path, { ...options, headers, cache: 'no-store' })
  if (response.status === 401 && path.startsWith('/api/core/') && retry) {
    refreshing ??= refresh()
      .catch((error: unknown) => {
        clearSession()
        throw error
      })
      .finally(() => {
        refreshing = null
      })
    await refreshing
    return request<T>(path, options, false)
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string; message?: string | string[] } | null
    throw new ApiError(
      response.status,
      body?.detail ??
        (Array.isArray(body?.message) ? body.message.join('; ') : body?.message) ??
        'Não foi possível concluir a operação.',
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const core = <T>(path: string, options?: RequestInit) => request<T>(`/api/core${path}`, options)
export const json = (value: unknown) => JSON.stringify(value)
export const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Ocorreu um erro. Tente novamente.'

export interface AuthUser {
  id: string
  firstName: string
  email: string
  role: 'SELLER' | 'CUSTOMER' | 'ADMIN'
  provider?: 'local' | 'github' | 'google'
  avatarUrl?: string
  storeId?: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED'

export interface DashboardOrder {
  id: string
  code: string
  customerName: string
  customerEmail: string
  customerCity: string
  itemsSummary: string
  itemsCount: number
  total: number
  paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Boleto'
  status: OrderStatus
  createdAt: string
  trackingCode?: string
}

export interface ChatMessage {
  id: string
  sender: 'seller' | 'customer' | 'system'
  text: string
  timestamp: string
  attachment?: {
    type: 'order' | 'product' | 'coupon'
    title: string
    subtitle: string
  }
}

export interface ChatThread {
  id: string
  customerName: string
  customerEmail: string
  customerCity: string
  online: boolean
  unread: number
  orderCode: string
  orderTotal: number
  orderStatus: OrderStatus
  lifetimeValue: number
  messages: ChatMessage[]
}

export interface FinancialTransaction {
  id: string
  description: string
  orderCode?: string
  type: 'credit' | 'payout' | 'fee'
  method: 'Pix' | 'Cartão de Crédito' | 'Boleto' | 'Repasse Pix'
  grossAmount: number
  netAmount: number
  status: 'Disponível' | 'A receber' | 'Concluído'
  date: string
}

export type PlanCode = 'STANDARD' | 'MAKER'

export interface BillingPlanInfo {
  code: PlanCode
  name: string
  priceMonthly: number
  priceInCents: number
  description: string
  features: string[]
  activeProductLimit: number
  structuralEditing: boolean
  aiDailyRequestLimit: number
}

const SESSION_META_KEY = 'syndetis-auth-meta-v1'
const ORDERS_KEY = 'syndetis-dashboard-orders-v1'
const CHATS_KEY = 'syndetis-dashboard-chats-v1'
const TRANSACTIONS_KEY = 'syndetis-dashboard-tx-v1'
const PLAN_KEY = 'syndetis-active-plan-v2'

function buildAuthSessionFromTokens(tokens: Tokens, preferredName?: string, storeId?: string): AuthSession {
  saveSession(tokens)
  const verified = getSession()
  if (!verified) {
    throw new ApiError(401, 'Token de acesso inválido ou expirado.')
  }
  const fallbackName = verified.email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
  const session: AuthSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: verified.userId,
      firstName: preferredName?.trim() || fallbackName || 'Lojista',
      email: verified.email,
      role: verified.role,
      provider: 'local',
      storeId,
    },
  }
  try {
    sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(session.user))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('syndetis-auth-change'))
  return session
}

export function readSession(): AuthSession | null {
  const verified = getSession()
  if (!verified) return null
  try {
    const rawMeta = sessionStorage.getItem(SESSION_META_KEY)
    const parsedMeta = rawMeta ? (JSON.parse(rawMeta) as Partial<AuthUser>) : null
    const fallbackName = verified.email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
    return {
      accessToken: verified.accessToken,
      refreshToken: getRefreshToken() || '',
      expiresIn: 3600,
      user: {
        id: verified.userId,
        firstName: parsedMeta?.firstName || fallbackName || 'Lojista',
        email: verified.email,
        role: verified.role,
        provider: parsedMeta?.provider || 'local',
        storeId: parsedMeta?.storeId,
      },
    }
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession | null) {
  if (!session) {
    clearSession()
    try {
      sessionStorage.removeItem(SESSION_META_KEY)
    } catch {
      /* ignore */
    }
  } else {
    try {
      sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(session.user))
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event('syndetis-auth-change'))
}

export async function loginWithCredentials(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase()
  const tokens = await request<Tokens>(
    '/api/auth/login',
    {
      method: 'POST',
      body: json({ email: normalizedEmail, password }),
    },
    false,
  )
  return buildAuthSessionFromTokens(tokens)
}

export async function registerUserAccount(
  firstName: string,
  email: string,
  password: string,
  storeName?: string,
): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase()
  const cleanName = firstName.trim()
  await request(
    '/api/auth/register',
    {
      method: 'POST',
      body: json({
        firstName: cleanName,
        email: normalizedEmail,
        password,
      }),
    },
    false,
  )

  if (storeName?.trim()) {
    try {
      const current = ensureFullConfig(JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || initialConfig)
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...current,
          name: storeName.trim(),
          settings: {
            ...current.settings,
            slug: slugify(storeName.trim()),
          },
        }),
      )
    } catch {
      /* ignore */
    }
  }

  const tokens = await request<Tokens>(
    '/api/auth/login',
    {
      method: 'POST',
      body: json({ email: normalizedEmail, password }),
    },
    false,
  )
  return buildAuthSessionFromTokens(tokens, cleanName)
}

export function startOAuthRedirect(provider: 'github' | 'google'): void {
  window.location.assign(`/oauth2/authorization/${provider}`)
}

export async function exchangeOAuthCallbackCode(code: string): Promise<AuthSession> {
  if (!code || !code.trim()) {
    throw new ApiError(400, 'Código de autorização OAuth ausente. Faça login novamente.')
  }
  const tokens = await request<Tokens>(
    '/api/auth/oauth2/exchange',
    {
      method: 'POST',
      body: json({ code: code.trim() }),
    },
    false,
  )
  return buildAuthSessionFromTokens(tokens)
}

export async function logoutSession() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    try {
      await request(
        '/api/auth/logout',
        {
          method: 'POST',
          body: json({ refreshToken }),
        },
        false,
      )
    } catch {
      /* ignore logout network failure and clear local token */
    }
  }
  writeSession(null)
}

async function resolveOrCreateStore(full: Required<LayoutConfig>): Promise<Store> {
  const stores = await core<Store[]>('/stores/me')
  if (stores.length > 0) return stores[0]
  const desiredSlug = slugify(full.settings.slug || full.name || 'minha-loja')
  return await core<Store>('/stores', {
    method: 'POST',
    body: json({
      name: full.name || 'Minha Loja Syndetis',
      slug: desiredSlug.length >= 3 ? desiredSlug : `${desiredSlug}-loja`,
    }),
  })
}

function toCoreLayoutPayload(full: Required<LayoutConfig>, structuralEditing: boolean): Layout & { templateId: string } {
  const heroComp = full.components.find(c => c.type === 'hero')
  const prodComp = full.components.find(c => c.type === 'products')
  if (!structuralEditing) {
    return {
      schemaVersion: 1,
      templateId: 'ecommerce',
      theme: {
        primaryColor: full.accent,
        backgroundColor: '#08051c',
      },
      sections: [
        { type: 'hero', title: (heroComp?.title || `Bem-vindo à ${full.name}`).replace(/\n/g, ' ').slice(0, 160) },
        { type: 'product-grid', title: (prodComp?.title || 'Produtos').slice(0, 160) },
        { type: 'footer' },
      ],
    }
  }
  const sections = full.components
    .filter(c => c.visible)
    .map(c => {
      if (c.type === 'hero') return { type: 'hero', title: c.title.replace(/\n/g, ' ').slice(0, 160) }
      if (c.type === 'products' || c.type === 'categories') return { type: 'product-grid', title: c.title.slice(0, 160) }
      if (c.type === 'editorial-banner' || c.type === 'newsletter' || c.type === 'announcement') {
        return { type: 'banner', title: c.title.replace(/\n/g, ' ').slice(0, 160) }
      }
      if (c.type === 'benefits' || c.type === 'testimonials') {
        return { type: 'text', title: c.title.slice(0, 160) }
      }
      return { type: 'footer' }
    })

  return {
    schemaVersion: 1,
    templateId: 'ecommerce',
    theme: {
      primaryColor: full.accent,
      backgroundColor: '#08051c',
    },
    sections: sections.length > 0 ? sections : [{ type: 'hero', title: full.name }, { type: 'footer' }],
  }
}

export async function syncStoreLayout(
  config: LayoutConfig,
  publish = false,
): Promise<{ syncedWithBackend: boolean }> {
  const full = ensureFullConfig(config)

  // Always save local draft first when not publishing
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
  } catch {
    /* ignore */
  }

  try {
    const store = await resolveOrCreateStore(full)
    const current = await core<{ config: Layout; version: number }>(`/stores/${store.id}/layout`)
    const payload = toCoreLayoutPayload(full, readActivePlan() === 'MAKER')
    const updatedDraft = await core<{ version: number }>(`/stores/${store.id}/layout`, {
      method: 'PUT',
      headers: { 'If-Match': `"${current.version}"` },
      body: json(payload),
    })

    if (publish) {
      await core(`/stores/${store.id}/layout/publish`, {
        method: 'POST',
        headers: { 'If-Match': `"${updatedDraft.version}"` },
      })
      full.settings.published = true
      full.settings.publishedAt = new Date().toISOString()
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
      } catch {
        /* ignore */
      }
    }

    return { syncedWithBackend: true }
  } catch (err) {
    if (publish) {
      // Never fake publication success when backend synchronization fails
      throw err instanceof Error
        ? err
        : new ApiError(503, 'Não foi possível confirmar a publicação com o servidor.')
    }
    return { syncedWithBackend: false }
  }
}

const DEFAULT_ORDERS: DashboardOrder[] = [
  {
    id: 'ord-1048',
    code: '#SYN-1048',
    customerName: 'Marina Vasconcelos',
    customerEmail: 'marina.v@email.com',
    customerCity: 'São Paulo, SP',
    itemsSummary: '1× Cronógrafo Monolith 01',
    itemsCount: 1,
    total: 680,
    paymentMethod: 'Pix',
    status: 'PAID',
    createdAt: '29/10/2026 14:22',
  },
  {
    id: 'ord-1047',
    code: '#SYN-1047',
    customerName: 'Lucas Andrade',
    customerEmail: 'lucas.andrade@email.com',
    customerCity: 'Curitiba, PR',
    itemsSummary: '1× Headphone Acoustic Studio + 1× Luminária Aura',
    itemsCount: 2,
    total: 1460,
    paymentMethod: 'Cartão de Crédito',
    status: 'PREPARING',
    createdAt: '29/10/2026 11:08',
  },
  {
    id: 'ord-1046',
    code: '#SYN-1046',
    customerName: 'Beatriz Nogueira',
    customerEmail: 'bia.nogueira@email.com',
    customerCity: 'Belo Horizonte, MG',
    itemsSummary: '1× Câmera Analógica K-Series',
    itemsCount: 1,
    total: 1240,
    paymentMethod: 'Pix',
    status: 'SHIPPED',
    createdAt: '28/10/2026 19:45',
    trackingCode: 'BR984120554SY',
  },
  {
    id: 'ord-1045',
    code: '#SYN-1045',
    customerName: 'Rafael Monteiro',
    customerEmail: 'rafael.m@email.com',
    customerCity: 'Rio de Janeiro, RJ',
    itemsSummary: '2× Luminária Articulada Aura',
    itemsCount: 2,
    total: 1080,
    paymentMethod: 'Cartão de Crédito',
    status: 'DELIVERED',
    createdAt: '27/10/2026 16:30',
    trackingCode: 'BR983901120SY',
  },
  {
    id: 'ord-1044',
    code: '#SYN-1044',
    customerName: 'Camila Telles',
    customerEmail: 'camila.telles@email.com',
    customerCity: 'Porto Alegre, RS',
    itemsSummary: '1× Cronógrafo Monolith 01',
    itemsCount: 1,
    total: 680,
    paymentMethod: 'Boleto',
    status: 'PENDING',
    createdAt: '27/10/2026 09:15',
  },
]

const DEFAULT_CHATS: ChatThread[] = [
  {
    id: 'chat-marina',
    customerName: 'Marina Vasconcelos',
    customerEmail: 'marina.v@email.com',
    customerCity: 'São Paulo, SP',
    online: true,
    unread: 2,
    orderCode: '#SYN-1048',
    orderTotal: 680,
    orderStatus: 'PAID',
    lifetimeValue: 1360,
    messages: [
      {
        id: 'm-1',
        sender: 'customer',
        text: 'Olá! Acabei de finalizar o pagamento via Pix do Cronógrafo Monolith 01.',
        timestamp: '14:23',
      },
      {
        id: 'm-2',
        sender: 'system',
        text: 'Pagamento aprovado automaticamente para o pedido #SYN-1048 (R$ 680,00).',
        timestamp: '14:23',
        attachment: {
          type: 'order',
          title: 'Pedido #SYN-1048 · Pago via Pix',
          subtitle: '1× Cronógrafo Monolith 01 · Envio Expresso SP',
        },
      },
      {
        id: 'm-3',
        sender: 'customer',
        text: 'Vocês conseguem enviar com embalagem para presente? É para aniversário neste sábado!',
        timestamp: '14:25',
      },
    ],
  },
  {
    id: 'chat-lucas',
    customerName: 'Lucas Andrade',
    customerEmail: 'lucas.andrade@email.com',
    customerCity: 'Curitiba, PR',
    online: true,
    unread: 1,
    orderCode: '#SYN-1047',
    orderTotal: 1460,
    orderStatus: 'PREPARING',
    lifetimeValue: 2140,
    messages: [
      {
        id: 'm-20',
        sender: 'customer',
        text: 'Bom dia! Gostaria de confirmar se a Luminária Aura do meu pedido #SYN-1047 é bivolt.',
        timestamp: '11:15',
      },
      {
        id: 'm-21',
        sender: 'seller',
        text: 'Olá, Lucas! Sim, a Luminária Escultural Aura é bivolt automática (110V/220V) e já acompanha lâmpada quente.',
        timestamp: '11:18',
      },
      {
        id: 'm-22',
        sender: 'customer',
        text: 'Perfeito! Quando tiverem o código de rastreio podem me mandar por aqui?',
        timestamp: '11:20',
      },
    ],
  },
  {
    id: 'chat-beatriz',
    customerName: 'Beatriz Nogueira',
    customerEmail: 'bia.nogueira@email.com',
    customerCity: 'Belo Horizonte, MG',
    online: false,
    unread: 0,
    orderCode: '#SYN-1046',
    orderTotal: 1240,
    orderStatus: 'SHIPPED',
    lifetimeValue: 1240,
    messages: [
      {
        id: 'm-30',
        sender: 'seller',
        text: 'Olá Beatriz! Sua Câmera Analógica K-Series já foi despachada por transportadora expressa.',
        timestamp: 'Ontem, 20:05',
        attachment: {
          type: 'order',
          title: 'Rastreio ativo · BR984120554SY',
          subtitle: 'Previsão de entrega: Amanhã até 18h',
        },
      },
      {
        id: 'm-31',
        sender: 'customer',
        text: 'Muito obrigada pela agilidade! Ansiosa para receber.',
        timestamp: 'Ontem, 20:14',
      },
    ],
  },
  {
    id: 'chat-rafael',
    customerName: 'Rafael Monteiro',
    customerEmail: 'rafael.m@email.com',
    customerCity: 'Rio de Janeiro, RJ',
    online: false,
    unread: 0,
    orderCode: '#SYN-1045',
    orderTotal: 1080,
    orderStatus: 'DELIVERED',
    lifetimeValue: 3290,
    messages: [
      {
        id: 'm-40',
        sender: 'customer',
        text: 'As luminárias chegaram impecáveis! O acabamento ao vivo é ainda mais bonito.',
        timestamp: '27 Out',
      },
      {
        id: 'm-41',
        sender: 'seller',
        text: 'Ficamos muito felizes, Rafael! Liberamos um cupom exclusivo de 10% para sua próxima compra.',
        timestamp: '27 Out',
        attachment: {
          type: 'coupon',
          title: 'Cupom VIP: SYNDETIS10',
          subtitle: '10% de desconto + Frete Grátis em toda a loja',
        },
      },
    ],
  },
]

const DEFAULT_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'tx-01',
    description: 'Venda #SYN-1048 · Marina Vasconcelos',
    orderCode: '#SYN-1048',
    type: 'credit',
    method: 'Pix',
    grossAmount: 680,
    netAmount: 673.2,
    status: 'Disponível',
    date: '29/10/2026 14:22',
  },
  {
    id: 'tx-02',
    description: 'Venda #SYN-1047 · Lucas Andrade (6x)',
    orderCode: '#SYN-1047',
    type: 'credit',
    method: 'Cartão de Crédito',
    grossAmount: 1460,
    netAmount: 1401.6,
    status: 'A receber',
    date: '29/10/2026 11:08',
  },
  {
    id: 'tx-03',
    description: 'Venda #SYN-1046 · Beatriz Nogueira',
    orderCode: '#SYN-1046',
    type: 'credit',
    method: 'Pix',
    grossAmount: 1240,
    netAmount: 1227.6,
    status: 'Disponível',
    date: '28/10/2026 19:45',
  },
  {
    id: 'tx-04',
    description: 'Saque Pix para conta empresarial PJ',
    type: 'payout',
    method: 'Repasse Pix',
    grossAmount: -4500,
    netAmount: -4500,
    status: 'Concluído',
    date: '26/10/2026 17:10',
  },
  {
    id: 'tx-05',
    description: 'Venda #SYN-1045 · Rafael Monteiro (3x)',
    orderCode: '#SYN-1045',
    type: 'credit',
    method: 'Cartão de Crédito',
    grossAmount: 1080,
    netAmount: 1036.8,
    status: 'Disponível',
    date: '25/10/2026 16:30',
  },
]

/** Aligned with services/core-service/src/main/resources/billing/plans.json */
export const BILLING_PLANS: BillingPlanInfo[] = [
  {
    code: 'STANDARD',
    name: 'Standard',
    priceMonthly: 29,
    priceInCents: 2900,
    description: 'Para operar sua loja virtual com até 100 produtos ativos e personalização de conteúdo do template.',
    features: [
      'Até 100 produtos ativos',
      'Edição de textos, fontes, cores, logo e imagens dos templates',
      'Estrutura fixa do template oficial (sem edição estrutural)',
      'Sem cota diária de IA para layout e imagens',
    ],
    activeProductLimit: 100,
    structuralEditing: false,
    aiDailyRequestLimit: 0,
  },
  {
    code: 'MAKER',
    name: 'Maker',
    priceMonthly: 49,
    priceInCents: 4900,
    description: 'Liberdade estrutural completa na Sessão Maker, até 500 produtos ativos e IA integrada.',
    features: [
      'Até 500 produtos ativos',
      'Mover, adicionar, remover e configurar componentes livremente',
      'Textos, fontes, cores, logo e imagens dos templates',
      '30 requisições diárias compartilhadas de IA para layout e imagens',
    ],
    activeProductLimit: 500,
    structuralEditing: true,
    aiDailyRequestLimit: 30,
  },
]

export function readOrders(): DashboardOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || 'null')
    return Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_ORDERS
  } catch {
    return DEFAULT_ORDERS
  }
}

export function writeOrders(orders: DashboardOrder[]) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  } catch {
    /* ignore */
  }
}

export function readChats(): ChatThread[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHATS_KEY) || 'null')
    return Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_CHATS
  } catch {
    return DEFAULT_CHATS
  }
}

export function writeChats(chats: ChatThread[]) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
  } catch {
    /* ignore */
  }
}

export function readTransactions(): FinancialTransaction[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || 'null')
    return Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_TRANSACTIONS
  } catch {
    return DEFAULT_TRANSACTIONS
  }
}

export function writeTransactions(txs: FinancialTransaction[]) {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs))
  } catch {
    /* ignore */
  }
}

export function readActivePlan(): PlanCode {
  try {
    const saved = localStorage.getItem(PLAN_KEY)
    if (saved === 'STANDARD' || saved === 'MAKER') return saved
    return 'MAKER'
  } catch {
    return 'MAKER'
  }
}

export function writeActivePlan(plan: PlanCode) {
  try {
    localStorage.setItem(PLAN_KEY, plan)
  } catch {
    /* ignore */
  }
}
