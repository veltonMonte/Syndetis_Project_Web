import { createContext, useContext } from 'react'
import type { Appearance } from './appearance'

export const AppearanceContext = createContext<{
  theme: Appearance
  setTheme: (theme: Appearance) => boolean
} | null>(null)
export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error('AppearanceProvider não está disponível.')
  return context
}
