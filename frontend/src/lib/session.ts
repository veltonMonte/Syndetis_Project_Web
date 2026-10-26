import { useSyncExternalStore } from 'react'
import type { Session, Tokens } from './types'

const SESSION_KEY = 'syndetis.access'
let current = restore()
let refreshToken: string | undefined
const listeners = new Set<() => void>()

function decode(accessToken: string): Session {
  const raw = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const claims = JSON.parse(atob(raw)) as { sub: string; email: string; role: Session['role']; exp: number }
  if (claims.exp * 1000 <= Date.now() || !['CUSTOMER', 'SELLER', 'ADMIN'].includes(claims.role)) throw new Error('Sessão expirada')
  return { accessToken, userId: claims.sub, email: claims.email, role: claims.role }
}
function restore(): Session | null {
  try { const token = sessionStorage.getItem(SESSION_KEY); return token ? decode(token) : null } catch { return null }
}
export function getSession() { return current }
export function getRefreshToken() { return refreshToken }
export function saveSession(tokens: Tokens) {
  current = decode(tokens.accessToken)
  refreshToken = tokens.refreshToken
  sessionStorage.setItem(SESSION_KEY, tokens.accessToken)
  listeners.forEach((listener) => listener())
}
export function clearSession() {
  current = null
  refreshToken = undefined
  sessionStorage.removeItem(SESSION_KEY)
  listeners.forEach((listener) => listener())
}
export function useSession() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, getSession)
}
