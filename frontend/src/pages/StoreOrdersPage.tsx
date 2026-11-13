import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Stack } from '@/components/echo/layout'
import { BuyerAccess } from '@/components/buyer-access'
import { OrderPipeline, PurchaseCode } from '@/components/order-tracking'
import { Feedback } from '@/components/Feedback'
import { core, errorMessage, money } from '@/lib/api'
import { useResource } from '@/lib/hooks'
import { useSession } from '@/lib/session'
import type { Order, Page, PublicOrderStatus, PublicStore } from '@/lib/types'
import '@/components/store-commerce.css'

const CODE_PATTERN = /^[0-9a-z]{4}-?[0-9a-z]{4}$/i

/** "Meus pedidos" of one storefront: follow an order with its purchase code, or sign in to find the codes. */
export function StoreOrdersPage() {
  const { slug = '' } = useParams()
  const store = useResource<PublicStore>(`/public/stores/${encodeURIComponent(slug)}`)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [result, setResult] = useState<PublicOrderStatus | null>(null)
  const [searching, setSearching] = useState(false)
  const [forgot, setForgot] = useState(false)

  async function lookup(event: FormEvent) {
    event.preventDefault()
    setResult(null)
    if (!CODE_PATTERN.test(code.trim())) {
      setCodeError('O código tem 8 letras e números, como 7K0M-2XP1.')
      return
    }
    setCodeError('')
    setSearching(true)
    try {
      const found = await core<PublicOrderStatus>(`/public/orders/${encodeURIComponent(code.trim())}`)
      if (found.storeSlug !== slug) setCodeError('Este código é de uma compra em outra loja.')
      else setResult(found)
    } catch (error) {
      setCodeError(errorMessage(error))
    } finally {
      setSearching(false)
    }
  }

  return <main className="store-orders">
    <Stack gap={4} align="start">
      <HardwareButton variant="ghost" size="sm" href={`#/lojas/${encodeURIComponent(slug)}`}>
        ← Voltar para {store.data?.name ?? 'a loja'}
      </HardwareButton>
      <h1>Meus pedidos</h1>
      <p>Cole o código que apareceu quando o pagamento foi confirmado.</p>
    </Stack>
    <form onSubmit={lookup} noValidate>
      <Stack gap={6} align="stretch">
        <Field label="Código da compra" placeholder="XXXX-XXXX" autoComplete="off" value={code} onValueChange={setCode} error={codeError} disabled={searching} />
        <div><HardwareButton type="submit" variant="primary" loading={searching}>Ver andamento</HardwareButton></div>
      </Stack>
    </form>
    {result && <section className="store-orders-result" aria-label="Andamento da compra">
      <h2>Compra <span className="purchase-code-text" translate="no">{result.purchaseCode}</span></h2>
      <OrderPipeline status={result.status} />
      <ul>{result.items.map(item => <li key={item.productName}>{item.quantity} × {item.productName}</li>)}</ul>
      <p className="fine-print">Atualizado em {new Date(result.updatedAt).toLocaleString('pt-BR')}.</p>
    </section>}
    {!forgot
      ? <div><HardwareButton variant="ghost" onClick={() => setForgot(true)}>Não lembro meu código</HardwareButton></div>
      : store.data && <ForgottenCodes store={store.data} />}
    <Feedback error={store.error} />
  </main>
}

function ForgottenCodes({ store }: { store: PublicStore }) {
  const session = useSession()
  if (!session) return <BuyerAccess modes={['login']} title="Entre com o e-mail da compra"
    intro="Use o e-mail e a senha que você criou ao finalizar a compra." />
  return <BuyerOrders store={store} />
}

function BuyerOrders({ store }: { store: PublicStore }) {
  const orders = useResource<Page<Order>>(`/orders/me?storeId=${encodeURIComponent(store.id)}&size=50`)
  return <section className="store-orders-result" aria-label="Suas compras nesta loja">
    <h2>Suas compras em {store.name}</h2>
    <Feedback error={orders.error} loading={orders.loading} />
    {orders.data?.content.length === 0 && <p>Nenhuma compra com este e-mail nesta loja.</p>}
    {orders.data?.content.map(order => <article key={order.id} className="shop-commerce-panel">
      <Stack gap={6}>
        {order.purchaseCode ? <PurchaseCode code={order.purchaseCode} /> : <p className="muted">Pedido {order.id.slice(0, 8).toUpperCase()}</p>}
        <OrderPipeline status={order.status} />
        <p>{money(order.total)} · {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
        {order.status === 'PENDING' && <HardwareButton size="sm" href={`#/lojas/${encodeURIComponent(store.slug)}?pedido=${order.id}`}>
          Ver pedido e pagar
        </HardwareButton>}
      </Stack>
    </article>)}
  </section>
}
