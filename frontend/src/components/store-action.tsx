import type { ReactNode } from 'react'
import type { StoreComponent } from '@/lib/maker'
export function StoreAction({ section, className, children }: { section: StoreComponent; className: string; children: ReactNode }) {
  const link = section.ctaUrl && /^https?:\/\//i.test(section.ctaUrl) ? section.ctaUrl : null
  return <a className={className} href={link || '#produtos'} onClick={event=>{
    if (event.defaultPrevented || link) return
    event.preventDefault()
    event.currentTarget.closest('.shop-template')?.querySelector('[data-section-type="products"]')?.scrollIntoView({block:'start'})
  }}>{children}</a>
}
