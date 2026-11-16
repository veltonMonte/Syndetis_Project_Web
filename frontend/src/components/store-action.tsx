import type { ReactNode } from 'react'
import type { StoreComponent } from '@/lib/maker'
import { isHttpUrl } from '@/lib/safe-url'

/** A section's call to action: the merchant's external link when it is a web address, else the catalog. */
export function StoreAction({ section, className, children }: { section: StoreComponent; className: string; children: ReactNode }) {
  const link = isHttpUrl(section.ctaUrl) ? section.ctaUrl : null
  return <a className={className} href={link || '#produtos'}
    // The destination is written by a merchant: it gets no reference back to this page.
    rel={link ? 'noopener noreferrer' : undefined}
    onClick={event=>{
      if (event.defaultPrevented || link) return
      event.preventDefault()
      event.currentTarget.closest('.shop-template')?.querySelector('[data-section-type="products"]')?.scrollIntoView({block:'start'})
    }}>{children}</a>
}
