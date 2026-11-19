import { BadgeCheck } from 'lucide-react'
import './verified-badge.css'

/**
 * "Verificado Syndetis": the store's owner has a CNPJ the Receita Federal confirmed as active. Only ever rendered
 * from server-side state (the store's `verified` / `ownerVerified`), never from the layout the merchant edits.
 */
export function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className="verified-badge" data-size={size} title="CNPJ ativo confirmado na Receita Federal">
      <BadgeCheck size={size === 'sm' ? 13 : 15} aria-hidden="true" />
      <span>Verificado Syndetis</span>
    </span>
  )
}
