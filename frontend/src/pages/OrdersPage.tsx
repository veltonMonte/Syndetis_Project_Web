import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Feedback, Pagination } from '../components/Feedback'
import { OrderSummary } from '../components/OrderSummary'
import { statusLabels } from '../lib/orderStatus'
import { core, money } from '../lib/api'
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
  const order = useResource<Order>(`/orders/${orderId}`)
  const action = useAction()
  const [now, setNow] = useState(() => Date.now())
  const { reload } = order
  const status = order.data?.status
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
  return <section className="panel narrow"><Link to="/pedidos">← Meus pedidos</Link><h1>Seu pedido</h1><p className="muted">{orderId?.slice(0, 8).toUpperCase()}</p><Feedback error={order.error || action.error} loading={!order.data && order.loading} />
    {order.data && <><OrderSummary order={order.data} />{order.data.status === 'PENDING' && <>
      <p className="fine-print">Reserva válida até {new Date(order.data.expiresAt).toLocaleString('pt-BR')}. A confirmação vem diretamente do provedor.</p>
      <div className="actions"><button disabled={action.busy || order.data.paymentReviewRequired || Date.parse(order.data.expiresAt) <= now} onClick={() => void action.run(async () => {
        const checkout = await core<{ checkoutUrl: string }>(`/orders/${orderId}/payment`, { method: 'POST' })
        const url = new URL(checkout.checkoutUrl)
        if (url.protocol !== 'https:' || !/^([a-z0-9-]+\.)?mercadopago\.com(\.br)?$/.test(url.hostname)) throw new Error('URL de pagamento inválida.')
        window.location.assign(url.href)
      })}>Pagar com Mercado Pago</button><button className="secondary" disabled={action.busy} onClick={() => void action.run(async () => { await core(`/orders/${orderId}/cancel`, { method: 'POST' }); order.reload() })}>Cancelar pedido</button></div>
    </>}<button className="text-button" disabled={action.busy} onClick={() => void action.run(async () => {
      await core(`/orders/${orderId}/payment/sync`, { method: 'POST' }); reload()
    })}>Atualizar situação</button></>}
  </section>
}
