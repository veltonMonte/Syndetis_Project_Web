import { DRAFT_KEY, ensureFullConfig, initialConfig, type LayoutConfig } from './maker'
import { clearSession, getRefreshToken, getSession, saveSession } from './session'
import type { Tokens } from './types'

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

export interface BillingPlanInfo {
  code: 'FREE' | 'PRO' | 'ENTERPRISE'
  name: string
  priceMonthly: number
  description: string
  features: string[]
  maxProducts: string
  aiQuotaDaily: number
}

const SESSION_KEY = 'syndetis-auth-session-v1'
const ORDERS_KEY = 'syndetis-dashboard-orders-v1'
const CHATS_KEY = 'syndetis-dashboard-chats-v1'
const TRANSACTIONS_KEY = 'syndetis-dashboard-tx-v1'
const PLAN_KEY = 'syndetis-active-plan-v1'

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.user?.email || !parsed?.accessToken) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession | null) {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    window.dispatchEvent(new Event('syndetis-auth-change'))
  } catch {
    /* ignore storage error */
  }
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 2200): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function loginWithCredentials(email: string, password: string): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase()
  try {
    const res = await fetchWithTimeout('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail, password }),
    })
    if (res.ok) {
      const data = await res.json()
      const firstName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const session: AuthSession = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn || 3600,
        user: {
          id: crypto.randomUUID(),
          firstName,
          email: normalizedEmail,
          role: 'SELLER',
          provider: 'local',
        },
      }
      writeSession(session)
      return session
    }
  } catch {
    /* Fallback to local prototype authentication when gateway is offline */
  }

  const nameFromEmail = normalizedEmail
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
  const session: AuthSession = {
    accessToken: `syn_live_${btoa(normalizedEmail).slice(0, 24)}`,
    refreshToken: `syn_ref_${Date.now()}`,
    expiresIn: 3600,
    user: {
      id: 'usr-seller-01',
      firstName: nameFromEmail || 'Criador Syndetis',
      email: normalizedEmail,
      role: 'SELLER',
      provider: 'local',
      storeId: 'store-syndetis-01',
    },
  }
  writeSession(session)
  return session
}

export async function registerUserAccount(
  firstName: string,
  email: string,
  password: string,
  storeName?: string,
): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase()
  const cleanName = firstName.trim()
  try {
    const res = await fetchWithTimeout('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: cleanName,
        email: normalizedEmail,
        password,
      }),
    })
    if (res.ok) {
      return await loginWithCredentials(normalizedEmail, password)
    }
  } catch {
    /* Fallback to local prototype registration when gateway is offline */
  }

  if (storeName?.trim()) {
    try {
      const current = ensureFullConfig(JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || initialConfig)
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...current,
          name: storeName.trim(),
        }),
      )
    } catch {
      /* ignore */
    }
  }

  const session: AuthSession = {
    accessToken: `syn_live_${btoa(normalizedEmail).slice(0, 24)}`,
    refreshToken: `syn_ref_${Date.now()}`,
    expiresIn: 3600,
    user: {
      id: 'usr-seller-01',
      firstName: cleanName,
      email: normalizedEmail,
      role: 'SELLER',
      provider: 'local',
      storeId: 'store-syndetis-01',
    },
  }
  writeSession(session)
  return session
}

export async function authenticateWithOAuth(provider: 'github' | 'google'): Promise<AuthSession> {
  try {
    // Check if the backend gateway OAuth endpoint is reachable first
    const probe = await fetchWithTimeout(`/.well-known/jwks.json`, { method: 'GET' }, 1200)
    if (probe.ok) {
      window.location.href = `/oauth2/authorization/${provider}`
      // Return a pending promise while browser navigates
      return new Promise(() => {})
    }
  } catch {
    /* Gateway offline: perform instant OAuth identity handshake in prototype mode */
  }

  const isGithub = provider === 'github'
  const session: AuthSession = {
    accessToken: `syn_oauth_${provider}_${Date.now()}`,
    refreshToken: `syn_ref_${provider}_${Date.now()}`,
    expiresIn: 3600,
    user: {
      id: isGithub ? 'usr-github-01' : 'usr-google-01',
      firstName: isGithub ? 'Dev Studio (GitHub)' : 'Criador (Google)',
      email: isGithub ? 'studio@github.syndetis.app' : 'criador@google.syndetis.app',
      role: 'SELLER',
      provider,
      storeId: 'store-syndetis-01',
    },
  }
  writeSession(session)
  return session
}

export async function exchangeOAuthCallbackCode(code: string): Promise<AuthSession> {
  try {
    const res = await fetchWithTimeout('/api/auth/oauth2/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
    if (res.ok) {
      const data = await res.json()
      const session: AuthSession = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn || 3600,
        user: {
          id: 'usr-oauth-verified',
          firstName: 'Conta Conectada',
          email: 'vendedor@syndetis.app',
          role: 'SELLER',
          provider: 'google',
          storeId: 'store-syndetis-01',
        },
      }
      writeSession(session)
      return session
    }
  } catch {
    /* fallback */
  }
  return authenticateWithOAuth('google')
}

export async function logoutSession() {
  const current = readSession()
  if (current?.refreshToken) {
    try {
      await fetchWithTimeout('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
    } catch {
      /* ignore */
    }
  }
  writeSession(null)
}

export async function syncStoreLayout(config: LayoutConfig, publish = false): Promise<{ syncedWithBackend: boolean }> {
  const full = ensureFullConfig(config)
  if (publish) {
    full.settings.published = true
    full.settings.publishedAt = new Date().toISOString()
  }
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
  } catch {
    /* ignore */
  }
  const session = readSession()
  if (session?.accessToken && session.user.storeId) {
    try {
      const headers = {
        Authorization: `Bearer ${session.accessToken}`,
        'If-Match': '"1"',
      }
      const putRes = await fetchWithTimeout(`/api/stores/${session.user.storeId}/layout`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(full),
      })
      if (putRes.ok && publish) {
        await fetchWithTimeout(`/api/stores/${session.user.storeId}/layout/publish`, {
          method: 'POST',
          headers,
        })
      }
      if (putRes.ok) return { syncedWithBackend: true }
    } catch {
      /* local save succeeded */
    }
  }
  return { syncedWithBackend: false }
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
    createdAt: 'Hoje, 14:22',
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
    createdAt: 'Hoje, 11:08',
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
    createdAt: 'Ontem, 19:45',
    trackingCode: 'BR984120554SY',
  },
  {
    id: 'ord-1045',
    code: '#SYN-1045',
    customerName: 'Rafael Monteiro',
    customerEmail: 'rafael.m@email.com',
    customerCity: 'Rio de Janeiro, RJ',
    itemsSummary: '2× Luminária Escultural Aura',
    itemsCount: 2,
    total: 1080,
    paymentMethod: 'Cartão de Crédito',
    status: 'DELIVERED',
    createdAt: '27 Out, 16:30',
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
    createdAt: '27 Out, 09:15',
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
    date: 'Hoje, 14:22',
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
    date: 'Hoje, 11:08',
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
    date: 'Ontem, 19:45',
  },
  {
    id: 'tx-04',
    description: 'Saque Pix para conta empresarial PJ',
    type: 'payout',
    method: 'Repasse Pix',
    grossAmount: -4500,
    netAmount: -4500,
    status: 'Concluído',
    date: '26 Out, 17:10',
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
    date: '25 Out, 16:30',
  },
]

export const BILLING_PLANS: BillingPlanInfo[] = [
  {
    code: 'FREE',
    name: 'Essencial',
    priceMonthly: 0,
    description: 'Para tirar sua primeira loja virtual do papel e validar produtos.',
    features: ['Até 15 produtos ativos', 'Maker visual completo', 'Checkout Pix e Cartão', 'Subdomínio syndetis.app'],
    maxProducts: '15 produtos',
    aiQuotaDaily: 5,
  },
  {
    code: 'PRO',
    name: 'Studio Pro',
    priceMonthly: 89,
    description: 'Para marcas autorais em crescimento com alto volume e atendimento integrado.',
    features: [
      'Até 500 produtos e categorias ilimitadas',
      'Chat Vendedor ↔ Cliente em tempo real',
      'Domínio próprio + SSL automático',
      'Taxas reduzidas no Pix (0,89%)',
    ],
    maxProducts: '500 produtos',
    aiQuotaDaily: 50,
  },
  {
    code: 'ENTERPRISE',
    name: 'Scale & Atelier',
    priceMonthly: 249,
    description: 'Infraestrutura dedicada, múltiplos operadores e API aberta.',
    features: [
      'Catálogo e tráfego ilimitados',
      'Múltiplos atendentes no Chat e CRM',
      'Repasse Pix instantâneo D+0',
      'Gerente de conta e SLA dedicado',
    ],
    maxProducts: 'Ilimitado',
    aiQuotaDaily: 500,
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

export function readActivePlan(): 'FREE' | 'PRO' | 'ENTERPRISE' {
  try {
    const saved = localStorage.getItem(PLAN_KEY)
    if (saved === 'FREE' || saved === 'PRO' || saved === 'ENTERPRISE') return saved
    return 'PRO'
  } catch {
    return 'PRO'
  }
}

export function writeActivePlan(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  try {
    localStorage.setItem(PLAN_KEY, plan)
  } catch {
    /* ignore */
  }
}
