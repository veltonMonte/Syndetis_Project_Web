import { useSyncExternalStore } from 'react'
import type { Session, Tokens } from './types'

// Tab-scoped persistence: survive reload without retaining credentials after the tab closes.
const SESSION_KEY = 'syndetis.session.v2'
const LEGACY_KEY = 'syndetis.access'
let refreshToken: string | undefined
let expiresAt = 0
let generation = 0
const listeners = new Set<() => void>()
let current = restore()

function decode(accessToken: string): { session: Session; expiresAt: number } {
  const parts = accessToken.split('.')
  if (parts.length !== 3) throw new Error('Token inválido')
  const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const claims = JSON.parse(
    new TextDecoder().decode(Uint8Array.from(atob(raw), (char) => char.charCodeAt(0))),
  ) as Record<string, unknown>
  if (
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    typeof claims.email !== 'string' ||
    typeof claims.exp !== 'number' ||
    !Number.isFinite(claims.exp) ||
    !['CUSTOMER', 'SELLER', 'ADMIN'].includes(String(claims.role))
  )
    throw new Error('Token inválido')
  // Claims are for presentation only. The gateway and services verify the signature and permissions.
  return {
    session: {
      accessToken,
      userId: claims.sub,
      email: claims.email,
      role: claims.role as Session['role'],
    },
    expiresAt: claims.exp * 1000,
  }
}

function restore(): Session | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    const tokens: Partial<Tokens> | null = stored ? JSON.parse(stored) : null
    const token = tokens?.accessToken || sessionStorage.getItem(LEGACY_KEY)
    if (!token) return null
    const parsed = decode(token)
    refreshToken = typeof tokens?.refreshToken === 'string' ? tokens.refreshToken : undefined
    expiresAt = parsed.expiresAt
    if (expiresAt <= Date.now() && !refreshToken) return null
    return parsed.session
  } catch {
    return null
  }
}

function notify(reason: 'updated' | 'expired' | 'logout') {
  listeners.forEach((listener) => listener())
  window.dispatchEvent(new CustomEvent('syndetis-auth-change', { detail: { reason } }))
}

export function getSession() {
  return current
}
export function getRefreshToken() {
  return refreshToken
}
export function getSessionGeneration() {
  return generation
}
export function getSessionExpiresAt() {
  return expiresAt
}
export function isSessionExpiring() {
  return Boolean(current && expiresAt <= Date.now() + 30000)
}

export function saveSession(tokens: Tokens) {
  const parsed = decode(tokens.accessToken)
  if (
    parsed.expiresAt <= Date.now() ||
    typeof tokens.refreshToken !== 'string' ||
    !tokens.refreshToken
  )
    throw new Error('Sessão inválida ou expirada')
  current = parsed.session
  expiresAt = parsed.expiresAt
  refreshToken = tokens.refreshToken
  generation++
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens))
    sessionStorage.removeItem(LEGACY_KEY)
  } catch {
    // A failed write must not leave an older account available after reload.
    try {
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(LEGACY_KEY)
    } catch {
      /* Storage may be unavailable. */
    }
    /* Storage-restricted contexts still retain the current session in memory. */
  }
  notify('updated')
}

export function clearSession(reason: 'expired' | 'logout' = 'expired') {
  current = null
  refreshToken = undefined
  expiresAt = 0
  generation++
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(LEGACY_KEY)
    sessionStorage.removeItem('syndetis-auth-meta-v1')
  } catch {
    /* memory state is still cleared */
  }
  notify(reason)
}

export function useSession() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, getSession)
}
