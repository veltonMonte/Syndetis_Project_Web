import { clearSession, getRefreshToken, getSession, saveSession } from './session'
import type { Tokens } from './types'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}
let refreshing: Promise<void> | null = null
async function refresh() {
  const token = getRefreshToken()
  if (!token) { clearSession(); throw new ApiError(401, 'Entre novamente para continuar.') }
  saveSession(await request<Tokens>('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: token }) }, false))
}
export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const session = getSession()
  if (session) headers.set('Authorization', `Bearer ${session.accessToken}`)
  const response = await fetch(path, { ...options, headers, cache: 'no-store' })
  if (response.status === 401 && path.startsWith('/api/core/') && retry) {
    refreshing ??= refresh().catch((error: unknown) => { clearSession(); throw error }).finally(() => { refreshing = null })
    await refreshing
    return request<T>(path, options, false)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string; message?: string | string[] } | null
    throw new ApiError(response.status, body?.detail ?? (Array.isArray(body?.message) ? body.message.join('; ') : body?.message) ?? 'Não foi possível concluir a operação.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export const core = <T>(path: string, options?: RequestInit) => request<T>(`/api/core${path}`, options)
export const json = (value: unknown) => JSON.stringify(value)
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocorreu um erro. Tente novamente.'
