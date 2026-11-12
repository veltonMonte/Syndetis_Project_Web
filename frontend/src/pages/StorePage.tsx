import { useState } from 'react'
import { Field } from '@/components/echo/field'
import { Select } from '@/components/echo/select'
import { Stack } from '@/components/echo/layout'
import { HardwareButton } from '@/components/echo/hardware-button'
import { StorePreview } from '@/components/store-preview'
import { publishedLayout } from '@/lib/published-layout'
import { useParams, useSearchParams } from 'react-router-dom'
import { Checkout } from '../components/Checkout'
import { OrderDetails } from './OrdersPage'
import { Feedback, Pagination } from '../components/Feedback'
import { useResource } from '../lib/hooks'
import type { CartLine, Category, Page, Product, PublicStore } from '../lib/types'

// Per-item cart limit. The order API checks inventory when it reserves the items.
const cartLimit = (product: Product) => Math.min(99, product.available ?? 99)

export function StorePage() { const { slug = '' } = useParams(); return <Storefront key={slug} slug={slug} /> }
function Storefront({ slug }: { slug: string }) {
  const store = useResource<PublicStore>(`/public/stores/${encodeURIComponent(slug)}`)
  const [params, setParams] = useSearchParams()
  const orderId = params.get('pedido')
  const validOrderId = orderId && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(orderId) ? orderId : null
  const [page, setPage] = useState(0)
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const catalogPath = '/public/stores/' + encodeURIComponent(slug)
  const categories = useResource<Category[]>(store.data ? catalogPath + '/categories' : null)
  const filters = new URLSearchParams({ page: String(page) })
  if (category) filters.set('category', category)
  if (query) filters.set('q', query)
  const products = useResource<Page<Product>>(catalogPath + '/products?' + filters)
  function chooseCategory(value: string) {
    setCategory(value)
    setPage(0)
  }
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(`cart:${slug}`) ?? '[]') as CartLine[] } catch { return [] }
  })
  function updateCart(next: CartLine[]) { setLines(next); sessionStorage.setItem(`cart:${slug}`, JSON.stringify(next)) }
  function quantity(product: Product, amount: number) {
    if (!Number.isFinite(amount)) return
    const others = lines.filter((line) => line.product.id !== product.id)
    updateCart(amount > 0 && cartLimit(product) > 0 ? [...others, { product, quantity: Math.min(cartLimit(product), Math.floor(amount)) }] : others)
  }
  const catalogProduct = (id: string) => products.data?.content.find(item => item.id === id)
  const published = store.data
  return <div className="published-store">
    <Feedback error={store.error} loading={store.loading} />
    {store.error && <HardwareButton onClick={store.reload}>Tentar carregar a loja novamente</HardwareButton>}
    {published && <>
        <h1 className="sr-only">{published.name}</h1>
        <StorePreview
          config={publishedLayout(published, products.data?.content ?? [], categories.data ?? [])}
          onSelectPublicCategory={chooseCategory}
          publicCategory={category}
          catalogPending={products.loading || !!products.error}
          catalogControls={<Stack gap={6}>
            <form className="shop-catalog-search" role="search" onSubmit={event => {
              event.preventDefault()
              setQuery(search.trim())
              setPage(0)
            }}>
              <Field label="Buscar produtos" type="search" value={search} onValueChange={setSearch} />
              <HardwareButton type="submit">Buscar</HardwareButton>
            </form>
            {!!categories.data?.length && <Select aria-label="Filtrar por categoria" value={category || 'all'}
              options={[{value:'all',label:'Todas as categorias'},...categories.data.map(item => ({value:item.id,label:item.name}))]}
              onValueChange={value => chooseCategory(value === 'all' ? '' : value || '')} />}
            <Feedback error={products.error || categories.error} loading={products.loading || categories.loading} />
            {products.error && <HardwareButton onClick={products.reload}>Tentar carregar produtos novamente</HardwareButton>}
            {categories.error && <HardwareButton onClick={categories.reload}>Tentar carregar categorias novamente</HardwareButton>}
          </Stack>}
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
            const product = catalogProduct(id)
            if (product) quantity(product, (lines.find(line => line.product.id === id)?.quantity ?? 0) + 1)
          }}
          publicCart={{
            remaining: id => {
              const product = catalogProduct(id)
              const quantity = lines.find(line => line.product.id === id)?.quantity ?? 0
              return product ? Math.max(0, cartLimit(product) - quantity) : 0
            },
            lines: lines.map(line => ({ key: line.product.id, name: line.product.name, price: line.product.price, image: line.product.imageUrl, quantity: line.quantity, maximum: Math.max(line.quantity, cartLimit(catalogProduct(line.product.id) ?? line.product)) })),
            onQuantity: (id, amount) => {
              const line = lines.find(item => item.product.id === id)
              if (line) quantity(catalogProduct(id) ?? line.product, amount)
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
