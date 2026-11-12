import type { ReactNode } from 'react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { ConfirmButton } from '@/components/echo/confirm-button'
import { NumberField } from '@/components/echo/number-field'
import { Progress } from '@/components/echo/progress'
import { formatBRL } from '@/lib/maker'

export interface StoreCartLine {
  key: string
  name: string
  price: number
  quantity: number
  maximum: number
  choices?: string
  image?: string | null
}

export function StoreCart({ lines, image, threshold, onQuantity, onBrowse, onCheckout }: {
  lines: StoreCartLine[]
  image: (src?: string, alt?: string) => ReactNode
  threshold?: number
  onQuantity: (key: string, quantity: number) => void
  onBrowse: () => void
  onCheckout: () => void
}) {
  const subtotal = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0) / 100
  if (!lines.length) return <div className="shop-empty">
    <p>Sua sacola está vazia.</p>
    <HardwareButton onClick={onBrowse}>Ver produtos</HardwareButton>
  </div>

  return <div className="shop-commerce-columns">
    <ul className="shop-cart-lines">
      {lines.map(line => <li key={line.key}>
        <div className="shop-cart-item">
          {line.image && <div className="shop-cart-photo" aria-hidden="true">{image(line.image, '')}</div>}
          <div>
            <strong>{line.name}</strong>
            {line.choices && <p>{line.choices}</p>}
            <p>{formatBRL(line.price)} por unidade</p>
          </div>
        </div>
        <NumberField label={'Quantidade de ' + line.name + (line.choices ? ' · ' + line.choices : '')}
          min={1} max={line.maximum} value={line.quantity} step={1} smallStep={1}
          incrementLabel={'Aumentar quantidade de ' + line.name} decrementLabel={'Diminuir quantidade de ' + line.name}
          onValueChange={value => { if (value !== null) onQuantity(line.key, value) }} />
        <ConfirmButton size="sm" align="start" className="shop-cart-remove" confirmLabel="Confirmar remoção"
          cancelLabel="Manter produto" onConfirm={() => onQuantity(line.key, 0)}>
          Remover {line.name}
        </ConfirmButton>
      </li>)}
    </ul>
    <aside className="shop-commerce-panel" aria-label="Resumo da sacola">
      {threshold != null && threshold > 0 && <div>
        <p>{subtotal >= threshold ? 'Exemplo: faixa de frete grátis atingida.' : 'Exemplo: faltam ' + formatBRL(threshold - subtotal) + ' para frete grátis.'}</p>
        <Progress value={Math.min(subtotal / threshold, 1)} aria-label="Progresso demonstrativo para frete grátis" />
      </div>}
      <p className="shop-commerce-total"><span>Subtotal</span><strong>{formatBRL(subtotal)}</strong></p>
      <p>O valor da entrega aparece na finalização.</p>
      <HardwareButton variant="primary" fullWidth onClick={onCheckout}>Finalizar compra</HardwareButton>
      <HardwareButton variant="ghost" fullWidth onClick={onBrowse}>Continuar comprando</HardwareButton>
    </aside>
  </div>
}
