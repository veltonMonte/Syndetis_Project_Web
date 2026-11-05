import { useState } from 'react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { StorePreview } from '@/components/store-preview'
import { publishedLayout } from '@/lib/published-layout'
import { useParams, useSearchParams } from 'react-router-dom'
import { Checkout } from '../components/Checkout'
import { OrderDetails } from './OrdersPage'
import { Feedback, Pagination } from '../components/Feedback'
import { useResource } from '../lib/hooks'
import type { CartLine, Page, Product, PublicStore } from '../lib/types'

export function StorePage() { const { slug = '' } = useParams(); return <Storefront key={slug} slug={slug} /> }
function Storefront({ slug }: { slug: string }) {
  const store = useResource<PublicStore>(`/public/stores/${encodeURIComponent(slug)}`)
  const [params, setParams] = useSearchParams()
  const orderId = params.get('pedido')
  const validOrderId = orderId && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(orderId) ? orderId : null
  const [page, setPage] = useState(0)
  const products = useResource<Page<Product>>(`/public/stores/${encodeURIComponent(slug)}/products?page=${page}`)
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(`cart:${slug}`) ?? '[]') as CartLine[] } catch { return [] }
  })
  function updateCart(next: CartLine[]) { setLines(next); sessionStorage.setItem(`cart:${slug}`, JSON.stringify(next)) }
  function quantity(product: Product, amount: number) {
    if (!Number.isFinite(amount)) return
    const others = lines.filter((line) => line.product.id !== product.id)
    updateCart(amount > 0 ? [...others, { product, quantity: Math.min(99, Math.floor(amount)) }] : others)
  }
  const published = store.data
  return <div className="published-store">
    <Feedback error={store.error} loading={store.loading} />
    {store.error && <HardwareButton onClick={store.reload}>Tentar carregar a loja novamente</HardwareButton>}
    {published && <>
        <h1 className="sr-only">{published.name}</h1>
        <Feedback error={products.error} loading={products.loading} />
        {products.error && <HardwareButton onClick={products.reload}>Tentar carregar produtos novamente</HardwareButton>}
        <StorePreview
          config={publishedLayout(published, products.data?.content ?? [])}
          resumeCheckout={params.get('etapa') === 'finalizar'}
          orderReview={validOrderId ? <OrderDetails key={validOrderId} orderId={validOrderId} storeId={published.id} /> : undefined}
          onExitOrder={() => {
            const next = new URLSearchParams(params)
            next.delete('pedido')
            setParams(next)
          }}
          onCheckoutViewChange={active => {
            const next = new URLSearchParams(params)
            if (active) next.set('etapa', 'finalizar')
            else next.delete('etapa')
            setParams(next, { replace: true })
          }}
          catalogFooter={<Pagination page={page} totalPages={products.data?.totalPages ?? 0} onChange={setPage} />}
          onAddPublicProduct={id => {
            const product = products.data?.content.find(item => item.id === id)
            if (product) quantity(product, (lines.find(line => line.product.id === id)?.quantity ?? 0) + 1)
          }}
          publicCart={{
            lines: lines.map(line => ({ key: line.product.id, name: line.product.name, price: line.product.price, quantity: line.quantity, maximum: 99 })),
            onQuantity: (id, amount) => {
              const line = lines.find(item => item.product.id === id)
              if (line) quantity(line.product, amount)
            },
            checkout: <Checkout store={published} lines={lines} onCreated={order => {
              updateCart([])
              setParams({ pedido: order.id }, { replace: true })
            }} />,
          }}
        />
    </>}
  </div>
}
