import { useState } from 'react'
import { core, json } from '../lib/api'
import { useAction, useResource } from '../lib/hooks'
import type { Order, OrderStatus, Page } from '../lib/types'
import { Feedback, Pagination } from './Feedback'
import { OrderSummary } from './OrderSummary'

export function SellerOrders({ storeId }: { storeId: string }) {
  const [page, setPage] = useState(0)
  const orders = useResource<Page<Order>>(`/stores/${storeId}/orders?page=${page}`)
  const action = useAction()
  function change(orderId: string, status: OrderStatus) {
    void action.run(async () => { await core(`/stores/${storeId}/orders/${orderId}/status`, { method: 'PATCH', body: json({ status }) }); orders.reload() })
  }
  return <section><div className="section-heading"><h2>Pedidos recebidos</h2><button className="secondary" onClick={orders.reload}>Atualizar pedidos</button></div>
    <Feedback error={orders.error || action.error} loading={orders.loading} />{orders.data?.content.length === 0 && <p className="notice">Os pedidos da sua loja aparecerão aqui.</p>}
    <div className="order-list">{orders.data?.content.map((order) => <article key={order.id} className="panel"><h3>Pedido {order.id.slice(0, 8).toUpperCase()}</h3><OrderSummary order={order} />
      <div className="actions">{order.status === 'PENDING' && <button className="secondary" disabled={action.busy} onClick={() => change(order.id, 'CANCELED')}>Cancelar pedido</button>}
        {order.status === 'PAID' && <button disabled={action.busy || order.paymentReviewRequired} onClick={() => change(order.id, 'SHIPPED')}>Marcar como enviado</button>}
        {order.status === 'SHIPPED' && <button disabled={action.busy || order.paymentReviewRequired} onClick={() => change(order.id, 'DELIVERED')}>Confirmar entrega</button>}</div>
    </article>)}</div><Pagination page={page} totalPages={orders.data?.totalPages ?? 0} onChange={setPage} />
  </section>
}
