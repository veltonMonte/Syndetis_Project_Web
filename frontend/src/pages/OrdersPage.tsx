import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HardwareButton } from '@/components/echo/hardware-button'
import { ConfirmButton } from '@/components/echo/confirm-button'
import { Feedback, Pagination } from '../components/Feedback'
import { OrderSummary } from '../components/OrderSummary'
import { statusLabels } from '../lib/orderStatus'
import { core, money, readSession } from '../lib/api'
import { useAction, useResource } from '../lib/hooks'
import type { Order, Page } from '../lib/types'

export function OrdersPage() {
  const [page, setPage] = useState(0)
  const orders = useResource<Page<Order>>(`/orders/me?page=${page}`)
  return <section><p className="eyebrow">Sua conta</p><h1>Meus pedidos</h1><Feedback error={orders.error} loading={orders.loading} />
    {orders.data?.content.length === 0 && <p className="notice">Você ainda não fez nenhum pedido.</p>}
    <div className="order-list">{orders.data?.content.map((order) => <Link className="panel order-link" key={order.id} to={`/pedidos/${order.id}`}><div><strong>Pedido {order.id.slice(0, 8).toUpperCase()}</strong><span className="muted">{statusLabels[order.status]}</span></div><strong>{money(order.total)}</strong></Link>)}</div>
    <Pagination page={page} totalPages={orders.data?.totalPages ?? 0} onChange={setPage} /></section>
}
export function OrderPage() {
  const { orderId } = useParams()
  if (!orderId) return null
  if (!readSession()) return <section className="panel narrow">
    <h1>Seu pedido</h1>
    <p>Entre na sua conta para acompanhar o pagamento.</p>
    <HardwareButton variant="primary" href={'#/entrar?next=' + encodeURIComponent('/pedidos/' + orderId)}>Entrar para ver o pedido</HardwareButton>
  </section>
  return <section className="panel narrow">
    <Link to="/pedidos">← Meus pedidos</Link>
    <h1>Seu pedido</h1>
    <OrderDetails key={orderId} orderId={orderId} />
  </section>
}

export function OrderDetails({ orderId, storeId }: { orderId: string; storeId?: string }) {
  const order = useResource<Order>(`/orders/${encodeURIComponent(orderId)}`)
  const data = order.data && (!storeId || order.data.storeId === storeId) ? order.data : null
  const action = useAction()
  const [now, setNow] = useState(() => Date.now())
  const { reload } = order
  const status = data?.status
  const synchronized = useRef(false)
  useEffect(() => {
    if (status !== 'PENDING' || synchronized.current || !new URLSearchParams(window.location.search).has('payment_id')) return
    synchronized.current = true
    void action.run(async () => { await core(`/orders/${orderId}/payment/sync`, { method: 'POST' }); reload() })
  }, [status, orderId, action, reload])
  useEffect(() => {
    if (status !== 'PENDING') return
    const timer = window.setInterval(() => { setNow(Date.now()); if (document.visibilityState === 'visible') reload() }, 5000)
    return () => clearInterval(timer)
  }, [status, reload])
  const error = order.data && !data ? 'Este pedido não pertence a esta loja.' : order.error || action.error
  return <div className={storeId ? 'shop-commerce-panel shop-order-review' : undefined}>
    <p className="muted">Pedido {orderId.slice(0, 8).toUpperCase()}</p>
    <Feedback error={error} loading={!order.data && order.loading} />
    {data && <><OrderSummary order={data} />{data.status === 'PENDING' && <>
      <p className="fine-print">Reserva válida até {new Date(data.expiresAt).toLocaleString('pt-BR')}. A confirmação vem diretamente do provedor.</p>
      <div className="shop-order-actions">
        <HardwareButton variant="primary" disabled={action.busy || data.paymentReviewRequired || Date.parse(data.expiresAt) <= now} onClick={() => void action.run(async () => {
        const checkout = await core<{ checkoutUrl: string }>(`/orders/${orderId}/payment`, { method: 'POST' })
        const url = new URL(checkout.checkoutUrl)
        if (url.protocol !== 'https:' || !/^([a-z0-9-]+\.)?mercadopago\.com(\.br)?$/.test(url.hostname)) throw new Error('URL de pagamento inválida.')
        window.location.assign(url.href)
        })}>Pagar com Mercado Pago</HardwareButton>
        <ConfirmButton confirmLabel="Confirmar cancelamento" cancelLabel="Manter pedido" onConfirm={() => {
          if (action.busy) return
          void action.run(async () => { await core(`/orders/${orderId}/cancel`, { method: 'POST' }); reload() })
        }}>Cancelar pedido</ConfirmButton>
      </div>
    </>}<HardwareButton variant="ghost" disabled={action.busy} onClick={() => void action.run(async () => {
      await core(`/orders/${orderId}/payment/sync`, { method: 'POST' }); reload()
    })}>Atualizar situação</HardwareButton></>}
  </div>
}
