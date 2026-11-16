import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { useSession } from '@/lib/session'
import {
  applyAppearance,
  appearanceKey,
  readAppearance,
  saveAppearance,
  type Appearance,
} from '@/lib/appearance'

import { AppearanceContext } from '@/lib/appearance-context'

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const owner = session?.userId || null
  const [choice, setChoice] = useState(() => ({ owner, theme: readAppearance(owner) }))
  if (choice.owner !== owner) setChoice({ owner, theme: readAppearance(owner) })
  const theme = choice.owner === owner ? choice.theme : readAppearance(owner)
  useLayoutEffect(() => {
    applyAppearance(theme)
  }, [theme, owner])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === appearanceKey(owner) || event.key === null)
        setChoice({ owner, theme: readAppearance(owner) })
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [owner])
  function setTheme(next: Appearance) {
    const stored = saveAppearance(owner, next)
    setChoice({ owner, theme: next })
    return stored
  }
  return (
    <AppearanceContext.Provider value={{ theme, setTheme }}>{children}</AppearanceContext.Provider>
  )
}
