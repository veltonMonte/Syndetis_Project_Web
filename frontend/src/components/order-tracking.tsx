import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import type { OrderStatus } from '@/lib/types'

const STEPS: { status: OrderStatus; label: string; detail: string }[] = [
  { status: 'PAID', label: 'Em preparação', detail: 'Pagamento confirmado. A loja está separando seu pedido.' },
  { status: 'SHIPPED', label: 'Enviado', detail: 'O pedido saiu para entrega.' },
  { status: 'DELIVERED', label: 'Recebido', detail: 'Entrega concluída.' },
]

/** Em preparação → Enviado → Recebido, from the order status the store moves forward. */
export function OrderPipeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELED') return <p className="order-pipeline-canceled" role="status">Pedido cancelado.</p>
  if (status === 'PENDING') return <p className="order-pipeline-pending" role="status">Aguardando a confirmação do pagamento.</p>
  const current = STEPS.findIndex(step => step.status === status)
  return <ol className="order-pipeline" aria-label="Andamento do pedido">
    {STEPS.map((step, index) => {
      const state = index < current ? 'done' : index === current ? 'current' : 'next'
      return <li key={step.status} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
        <span className="order-pipeline-mark" aria-hidden="true">{state === 'done' ? <Check size={14} /> : index + 1}</span>
        <span>
          <strong>{step.label}</strong>
          {state === 'current' && <small>{step.detail}</small>}
          <span className="sr-only">{state === 'done' ? ' (concluído)' : state === 'next' ? ' (próxima etapa)' : ' (etapa atual)'}</span>
        </span>
      </li>
    })}
  </ol>
}

/** The code the buyer keeps to follow the order in "Meus pedidos", shown once the payment is confirmed. */
export function PurchaseCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return <section className="purchase-code" aria-label="Código da compra">
    <p>Código da compra</p>
    <strong translate="no">{code}</strong>
    <p className="fine-print">Guarde este código. Com ele você acompanha o pedido em “Meus pedidos”, na loja, sem precisar entrar.</p>
    <HardwareButton size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => {
      void navigator.clipboard?.writeText(code).then(() => setCopied(true), () => setCopied(false))
    }}>{copied ? 'Código copiado' : 'Copiar código'}</HardwareButton>
  </section>
}
