import { editorProblem } from './editor-document'
import { toCoreLayoutPayload } from './layout-payload'
import { DRAFT_KEY, ensureFullConfig, slugify, type LayoutConfig } from './maker'
import {
  clearSession,
  getRefreshToken,
  getSession,
  getSessionExpiresAt,
  getSessionGeneration,
  isSessionExpiring,
  saveSession,
} from './session'
import { safeServerMessage } from './safe-message'
import type { Layout, Store, Tokens } from './types'
import { makerNameKey, type MakerEntitlements } from './maker-project'

export class ApiError extends Error {
  readonly status: number
  readonly retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

let refreshing: { generation: number; promise: Promise<void> } | null = null
function renewSession(): Promise<void> {
  const generation = getSessionGeneration()
  if (refreshing?.generation === generation) return refreshing.promise
  const flight = { generation, promise: Promise.resolve() }
  flight.promise = (async () => {
    const token = getRefreshToken()
    if (!token) {
      clearSession('expired')
      throw new ApiError(401, 'Sua sessão expirou. Entre novamente para continuar.')
    }
    try {
      const tokens = await request<Tokens>(
        '/api/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken: token }) },
        false,
      )
      // An old refresh must never sign the person back in after logout or replace a newer login.
      if (getSessionGeneration() !== generation)
        throw new ApiError(409, 'A sessão foi alterada. Tente a operação novamente.')
      saveSession(tokens)
    } catch (error) {
      if (
        getSessionGeneration() === generation &&
        error instanceof ApiError &&
        [400, 401, 403].includes(error.status)
      )
        clearSession('expired')
      throw error
    }
  })().finally(() => {
    if (refreshing === flight) refreshing = null
  })
  refreshing = flight
  return flight.promise
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const protectedRequest = path.startsWith('/api/core/') && !path.startsWith('/api/core/public/')
  if (protectedRequest && getSession() && isSessionExpiring()) await renewSession()
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const session = getSession()
  const token = protectedRequest ? session?.accessToken : undefined
  if (token) headers.set('Authorization', 'Bearer ' + token)
  const deadline = AbortSignal.timeout(20000)
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      signal,
      headers,
      cache: 'no-store',
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(
      deadline.aborted ? 408 : 0,
      deadline.aborted
        ? 'O serviço demorou para responder. Tente novamente.'
        : 'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.',
    )
  }
  if (protectedRequest && session?.userId !== getSession()?.userId) {
    throw new ApiError(409, 'A conta desta sessão mudou. Tente a operação novamente.')
  }
  if (response.status === 401 && protectedRequest && retry && getSession()) {
    // Other requests may have renewed the token while this request was in flight.
    if (getSession()?.accessToken === token) await renewSession()
    return request<T>(path, options, false)
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string
      message?: string | string[]
    } | null
    if (
      response.status === 401 &&
      protectedRequest &&
      getSession() &&
      getSession()?.accessToken === token
    )
      clearSession('expired')
    const message =
      path === '/api/auth/login' && response.status === 401
        ? 'E-mail ou senha incorretos.'
        : response.status === 429
          ? 'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.'
          : safeServerMessage(response.status, body)
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new ApiError(response.status, message, retryAfter > 0 ? retryAfter : undefined)
  }
  if (response.status === 204) return undefined as T
  try {
    const text = await response.text()
    return text ? (JSON.parse(text) as T) : (undefined as T)
  } catch {
    throw new ApiError(502, 'O servidor retornou uma resposta inválida. Tente novamente.')
  }
}

export const core = <T>(path: string, options?: RequestInit) =>
  request<T>(`/api/core${path}`, options)
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
  /** False for a merchant who still has to confirm a CPF/CNPJ with the Receita Federal. */
  documentVerified?: boolean
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
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

function buildAuthSessionFromTokens(
  tokens: Tokens,
  preferredName?: string,
  storeId?: string,
): AuthSession {
  saveSession(tokens)
  const verified = getSession()
  if (!verified) {
    throw new ApiError(401, 'Token de acesso inválido ou expirado.')
  }
  const fallbackName = verified.email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
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
      documentVerified: verified.documentVerified,
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
    const storedMeta = rawMeta ? (JSON.parse(rawMeta) as Partial<AuthUser>) : null
    const parsedMeta = storedMeta?.id === verified.userId ? storedMeta : null
    const fallbackName = verified.email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
    return {
      accessToken: verified.accessToken,
      refreshToken: getRefreshToken() || '',
      expiresIn: Math.max(0, Math.floor((getSessionExpiresAt() - Date.now()) / 1000)),
      user: {
        id: verified.userId,
        firstName: parsedMeta?.firstName || fallbackName || 'Lojista',
        email: verified.email,
        role: verified.role,
        provider: parsedMeta?.provider || 'local',
        storeId: parsedMeta?.storeId,
        documentVerified: verified.documentVerified,
      },
    }
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession | null) {
  if (!session) {
    clearSession('logout')
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

/**
 * `seller`: a merchant account on the Syndetis site (the only accounts the platform offers).
 * `buyer`: the e-mail and password a shopper creates inside a storefront checkout.
 */
export async function registerUserAccount(
  firstName: string,
  email: string,
  password: string,
  storeName?: string,
  account: 'seller' | 'buyer' = 'seller',
  document?: MerchantDocument,
): Promise<AuthSession> {
  const normalizedEmail = email.trim().toLowerCase()
  const cleanName = firstName.trim()
  await request(
    account === 'seller' ? '/api/auth/register/seller' : '/api/auth/register',
    {
      method: 'POST',
      body: json({
        firstName: cleanName,
        email: normalizedEmail,
        password,
        ...(account === 'seller' && document ? merchantDocumentBody(document) : {}),
      }),
    },
    false,
  )

  const tokens = await request<Tokens>(
    '/api/auth/login',
    {
      method: 'POST',
      body: json({ email: normalizedEmail, password }),
    },
    false,
  )
  const session = buildAuthSessionFromTokens(tokens, cleanName)
  if (storeName?.trim()) {
    try {
      localStorage.setItem(makerNameKey(session.user.id), storeName.trim())
    } catch {
      /* Name remains optional. */
    }
  }
  return session
}

/** A merchant's CPF (with the holder's date of birth, YYYY-MM-DD) or CNPJ. */
export interface MerchantDocument {
  document: string
  birthDate?: string
}

function merchantDocumentBody({ document, birthDate }: MerchantDocument) {
  const digits = document.replace(/\D/g, '')
  return digits.length === 11 ? { document: digits, birthDate } : { document: digits }
}

/** The Receita Federal's public record of a CNPJ, as the integration-hub returns it. */
export interface CnpjRecord {
  type: 'CNPJ'
  document: string
  status: 'ACTIVE' | 'INACTIVE' | 'NOT_FOUND'
  registrationStatus?: string
  name?: string
  tradeName?: string
  mei?: boolean
  legalNature?: string
}

export function lookupCnpj(cnpj: string, signal?: AbortSignal): Promise<CnpjRecord> {
  return request<CnpjRecord>('/api/integrations/tax-ids/lookup', {
    method: 'POST', body: json({ document: cnpj.replace(/\D/g, '') }), signal,
  }, false)
}

/**
 * A merchant who signed up with Google or GitHub confirms a CPF or CNPJ. The auth-service answers with new
 * tokens that carry the confirmation, so the session is replaced.
 */
export async function confirmMerchantDocument(session: AuthSession, document: MerchantDocument): Promise<AuthSession> {
  const tokens = await request<Tokens>('/api/auth/me/document', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + session.accessToken },
    body: json(merchantDocumentBody(document)),
  }, false)
  return buildAuthSessionFromTokens(tokens, session.user.firstName, session.user.storeId)
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
  // Clear immediately: an in-flight renewal must not restore a signed-out session.
  writeSession(null)
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
}

async function resolveOrCreateStore(
  full: Required<LayoutConfig>,
  storeId?: string,
): Promise<Store> {
  const stores = await core<Store[]>('/stores/me')
  if (storeId) {
    const owned = stores.find((item) => item.id === storeId)
    if (!owned) throw new ApiError(404, 'A loja deste rascunho não está disponível nesta conta.')
    return owned
  }
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

export async function syncStoreLayout(
  config: LayoutConfig,
  publish = false,
  context?: { userId: string; storeId?: string },
): Promise<{ syncedWithBackend: boolean; storeId?: string; storeSlug?: string; error?: string }> {
  const full = ensureFullConfig(config)

  const problem = editorProblem(full)
  if (problem) throw new ApiError(422, problem)

  // Always save local draft first when not publishing
  try {
    if (!context) localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
  } catch {
    /* ignore */
  }

  if (!full.components.some((component) => component.visible)) {
    const message =
      'Adicione uma seção visível antes de sincronizar ou publicar. Seu rascunho vazio continua neste navegador.'
    if (publish) throw new ApiError(422, message)
    return { syncedWithBackend: false, error: message }
  }
  if (context && getSession()?.userId !== context.userId)
    throw new ApiError(401, 'Entre na conta deste rascunho para continuar.')
  try {
    const store = await resolveOrCreateStore(full, context?.storeId)
    await core<MakerEntitlements>(`/stores/${store.id}/entitlements`)
    const current = await core<{ config: Layout; version: number }>(`/stores/${store.id}/layout`)
    const payload = toCoreLayoutPayload(full)
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
        if (!context) localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
      } catch {
        /* ignore */
      }
    }

    return { syncedWithBackend: true, storeId: store.id, storeSlug: store.slug }
  } catch (err) {
    if (publish) {
      // Never fake publication success when backend synchronization fails
      throw err instanceof Error
        ? err
        : new ApiError(503, 'Não foi possível confirmar a publicação com o servidor.')
    }
    return { syncedWithBackend: false, error: errorMessage(err) }
  }
}

/** Aligned with services/core-service/src/main/resources/billing/plans.json */
export const BILLING_PLANS: BillingPlanInfo[] = [
  {
    code: 'STANDARD',
    name: 'Standard',
    priceMonthly: 29,
    priceInCents: 2900,
    description:
      'Para operar sua loja virtual com até 100 produtos ativos e personalização de conteúdo do template.',
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
    description:
      'Liberdade estrutural completa na Sessão Maker, até 500 produtos ativos e IA integrada.',
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
