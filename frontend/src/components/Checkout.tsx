import { HardwareButton } from '@/components/echo/hardware-button'
import { Select } from '@/components/echo/select'
import { useRef, useState } from 'react'
import { core, json, money } from '../lib/api'
import { useAction, useResource } from '../lib/hooks'
import { useSession } from '../lib/session'
import type { Address, CartLine, Order, Store } from '../lib/types'
import { AddressForm } from './AddressForm'
import { Feedback } from './Feedback'

export function Checkout({ store, lines, onCreated }: { store: Store; lines: CartLine[]; onCreated: (order: Order) => void }) {
  const session = useSession()
  const addresses = useResource<Address[]>(session ? '/customers/me/addresses' : null)
  const [selected, setSelected] = useState('')
  const [adding, setAdding] = useState(false)
  const attempt = useRef({ fingerprint: '', key: '' })
  const action = useAction()
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.product.price * 100) * line.quantity, 0)
  const addressId = selected || addresses.data?.[0]?.id
  const needsAddress = !!session && !addressId && !addresses.loading && !addresses.error
  const canReview = !!session && !!addressId && !addresses.loading && !addresses.error && !adding && !!lines.length
  const addressPanel = useRef<HTMLElement>(null)
  return <div className="shop-commerce-columns">
    <section className="shop-commerce-panel" aria-label="Entrega" ref={addressPanel}>
      <h3>Entrega</h3>
      <p>{store.deliveryInstructions}</p>
      {!session ? <HardwareButton variant="primary" href={`#/entrar?next=${encodeURIComponent(`/lojas/${store.slug}?etapa=finalizar`)}`}>Entre para continuar</HardwareButton> : <>
        <Feedback error={addresses.error} loading={addresses.loading} />
        {addresses.error && <HardwareButton onClick={addresses.reload}>Tentar carregar endereços novamente</HardwareButton>}
        {!!addresses.data?.length && <Select aria-label="Selecione o endereço" value={addressId} container={addressPanel}
          onValueChange={setSelected} options={addresses.data.map(address => ({
            value: address.id,
            label: address.street + ', ' + address.number + ' · ' + address.city + '/' + address.state,
          }))} />}
        {needsAddress && !adding && <p>Adicione o endereço onde deseja receber o pedido.</p>}
        <HardwareButton variant={needsAddress && !adding ? 'primary' : 'ghost'} aria-expanded={adding} onClick={() => setAdding(!adding)}>{adding ? 'Fechar formulário' : 'Adicionar endereço'}</HardwareButton>
        {adding && <AddressForm onSaved={(address) => { setSelected(address.id); setAdding(false); addresses.reload() }} />}
      </>}
    </section>
    <section className="shop-commerce-panel" aria-label="Resumo do pedido">
      <h3>Seu pedido</h3>
      <ul className="line-list">{lines.map(line => <li key={line.product.id}><span>{line.quantity} × {line.product.name}</span><strong>{money(line.product.price * line.quantity)}</strong></li>)}</ul>
      <dl className="totals"><div><dt>Produtos</dt><dd>{money(subtotalCents / 100)}</dd></div><div><dt>Entrega pelo vendedor</dt><dd>{money(store.shippingFee)}</dd></div><div className="total"><dt>Total estimado</dt><dd>{money((subtotalCents + Math.round(store.shippingFee * 100)) / 100)}</dd></div></dl>
      <Feedback error={action.error} />
      {canReview && <HardwareButton fullWidth variant="primary" loading={action.busy} onClick={() => void action.run(async () => {
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
        onCreated(order)
      })}>{action.busy ? 'Preparando pedido…' : 'Revisar pedido e pagar'}</HardwareButton>}
      {needsAddress && <p className="fine-print">Informe o endereço para liberar a revisão do pedido.</p>}
      <p className="fine-print">O valor final será confirmado no pedido. O pagamento acontece no ambiente seguro do Mercado Pago.</p>
    </section>
  </div>
}
