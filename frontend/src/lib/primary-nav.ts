import type { ComponentType } from 'react'
import {
  Blocks,
  CreditCard,
  House,
  Info,
  LayoutDashboard,
  LayoutTemplate,
  LogIn,
  type LucideProps,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  current: boolean
  icon: ComponentType<LucideProps>
  /** Shown only in the tab bar: on wide screens the header has its own button for it. */
  tabOnly?: boolean
}

/** The platform's main destinations, shared by the header links (wide screens) and the tab bar (phones, tablets). */
export function primaryNav(route: string, signedIn: boolean): NavItem[] {
  if (signedIn) {
    return [
      { href: '#/criar', label: 'Maker', icon: Blocks, current: route === '/criar' || route === '/' },
      { href: '#/modelos', label: 'Modelos', icon: LayoutTemplate, current: route === '/modelos' },
      { href: '#/dashboard', label: 'Dashboard', icon: LayoutDashboard, current: route === '/dashboard' },
      { href: '#/planos', label: 'Planos', icon: CreditCard, current: route === '/planos' },
    ]
  }
  return [
    { href: '#/', label: 'Início', icon: House, current: route === '/' },
    { href: '#/modelos', label: 'Modelos', icon: LayoutTemplate, current: route === '/modelos' },
    { href: '#/sobre', label: 'Sobre', icon: Info, current: route === '/sobre' || route === '/sobre/tutorial' },
    { href: '#/planos', label: 'Planos', icon: CreditCard, current: route === '/planos' },
    { href: '#/entrar', label: 'Entrar', icon: LogIn, current: route === '/entrar', tabOnly: true },
  ]
}
