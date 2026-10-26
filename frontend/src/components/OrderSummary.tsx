import { money } from '../lib/api'
import type { Order } from '../lib/types'
import { statusLabels } from '../lib/orderStatus'

export function OrderSummary({ order }: { order: Order }) {
  return <>
    <span className={`badge status-${order.status.toLowerCase()}`}>{statusLabels[order.status]}</span>
    {order.paymentReviewRequired && <p className="notice error">Este pagamento precisa de conciliação com o vendedor. O pedido não será enviado até a revisão.</p>}
    <ul className="line-list">{order.items.map((item) => <li key={item.productId}><span>{item.quantity} × {item.productName}</span><strong>{money(item.lineTotal)}</strong></li>)}</ul>
    <dl className="totals"><div><dt>Produtos</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Entrega</dt><dd>{money(order.shipping)}</dd></div><div className="total"><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>
    <p><strong>Condições de entrega:</strong> {order.deliveryInstructions}</p>
    {order.deliveryAddress && <p><strong>Endereço:</strong> {order.deliveryAddress}</p>}
  </>
}
