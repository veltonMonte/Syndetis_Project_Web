import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { core, json, money } from '../lib/api'
import { useAction, useResource } from '../lib/hooks'
import { useSession } from '../lib/session'
import type { Address, CartLine, Order, Store } from '../lib/types'
import { AddressForm } from './AddressForm'
import { Feedback } from './Feedback'

export function Checkout({ store, lines, onCreated }: { store: Store; lines: CartLine[]; onCreated: () => void }) {
  const session = useSession()
  const addresses = useResource<Address[]>(session ? '/customers/me/addresses' : null)
  const [selected, setSelected] = useState('')
  const [adding, setAdding] = useState(false)
  const attempt = useRef({ fingerprint: '', key: '' })
  const action = useAction()
  const navigate = useNavigate()
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.product.price * 100) * line.quantity, 0)
  const addressId = selected || addresses.data?.[0]?.id
  return <section className="panel checkout"><h2>Seu pedido</h2>
    <ul className="line-list">{lines.map((line) => <li key={line.product.id}><span>{line.quantity} × {line.product.name}</span><strong>{money(line.product.price * line.quantity)}</strong></li>)}</ul>
    <p className="muted">{store.deliveryInstructions}</p>
    <dl className="totals"><div><dt>Produtos</dt><dd>{money(subtotalCents / 100)}</dd></div><div><dt>Entrega pelo vendedor</dt><dd>{money(store.shippingFee)}</dd></div><div className="total"><dt>Total estimado</dt><dd>{money((subtotalCents + Math.round(store.shippingFee * 100)) / 100)}</dd></div></dl>
    {!session ? <Link className="button" to={`/entrar?next=${encodeURIComponent(`/lojas/${store.slug}`)}`}>Entre para continuar</Link> : <>
      <h3>Endereço de entrega</h3><Feedback error={addresses.error} loading={addresses.loading} />
      {!!addresses.data?.length && <label>Selecione o endereço<select value={addressId} onChange={(event) => setSelected(event.target.value)}>{addresses.data.map((address) => <option value={address.id} key={address.id}>{address.street}, {address.number} · {address.city}/{address.state}</option>)}</select></label>}
      <button className="text-button" onClick={() => setAdding(!adding)}>{adding ? 'Fechar formulário' : 'Adicionar endereço'}</button>
      {adding && <AddressForm onSaved={(address) => { setSelected(address.id); setAdding(false); addresses.reload() }} />}
      <Feedback error={action.error} />
      <button disabled={action.busy || !addressId || !lines.length} onClick={() => void action.run(async () => {
        const payload = { storeId: store.id, addressId, items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })) }
        const fingerprint = json(payload)
        const storageKey = `checkout:${session.userId}:${store.id}`
        if (attempt.current.fingerprint !== fingerprint) {
          let saved: { fingerprint?: string; key?: string } = {}
          try { saved = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}') as typeof saved } catch { /* recupera uma tentativa inválida */ }
          attempt.current = { fingerprint, key: saved.fingerprint === fingerprint && saved.key ? saved.key : crypto.randomUUID() }
          sessionStorage.setItem(storageKey, json(attempt.current))
        }
        const order = await core<Order>('/orders', { method: 'POST', headers: { 'Idempotency-Key': attempt.current.key }, body: fingerprint })
        sessionStorage.removeItem(storageKey)
        onCreated()
        navigate(`/pedidos/${order.id}`)
      })}>{action.busy ? 'Preparando pedido…' : 'Revisar pedido e pagar'}</button>
      <p className="fine-print">O valor final será confirmado no pedido. O pagamento acontece no ambiente seguro do Mercado Pago.</p>
    </>}
  </section>
}
