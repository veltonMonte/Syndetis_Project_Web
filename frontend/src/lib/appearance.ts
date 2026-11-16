import { getSession } from './session'

export type Appearance = 'light' | 'dark'
export const appearanceKey = (userId?: string | null) =>
  `syndetis-appearance-v1:${userId ? encodeURIComponent(userId) : 'guest'}`
export function readAppearance(userId?: string | null): Appearance {
  try {
    return localStorage.getItem(appearanceKey(userId)) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
export function applyAppearance(theme: Appearance) {
  document.documentElement.dataset.theme = theme
}
export function initializeAppearance() {
  applyAppearance(readAppearance(getSession()?.userId))
}
export function saveAppearance(userId: string | null, theme: Appearance): boolean {
  try {
    localStorage.setItem(appearanceKey(userId), theme)
    return true
  } catch {
    return false
  }
}
