import { useRef, useState } from 'react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { StorePreview } from '@/components/store-preview'
import { publishedLayout } from '@/lib/published-layout'
import { useParams } from 'react-router-dom'
import { Checkout } from '../components/Checkout'
import { Feedback, Pagination } from '../components/Feedback'
import { useResource } from '../lib/hooks'
import type { CartLine, Page, Product, PublicStore } from '../lib/types'

export function StorePage() { const { slug = '' } = useParams(); return <Storefront key={slug} slug={slug} /> }
function Storefront({ slug }: { slug: string }) {
  const store = useResource<PublicStore>(`/public/stores/${encodeURIComponent(slug)}`)
  const checkout = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const products = useResource<Page<Product>>(`/public/stores/${encodeURIComponent(slug)}/products?page=${page}`)
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(`cart:${slug}`) ?? '[]') as CartLine[] } catch { return [] }
  })
  function updateCart(next: CartLine[]) { setLines(next); sessionStorage.setItem(`cart:${slug}`, JSON.stringify(next)) }
  function quantity(product: Product, amount: number) {
    const others = lines.filter((line) => line.product.id !== product.id)
    updateCart(amount > 0 ? [...others, { product, quantity: Math.min(99, Math.floor(amount)) }] : others)
  }
  return <div className="published-store">
    <Feedback error={store.error} loading={store.loading} />
    {store.error && <HardwareButton onClick={store.reload}>Tentar carregar a loja novamente</HardwareButton>}
    {store.data && <>
      <h1 className="sr-only">{store.data.name}</h1>
      <Feedback error={products.error} loading={products.loading} />
      {products.error && <HardwareButton onClick={products.reload}>Tentar carregar produtos novamente</HardwareButton>}
      <StorePreview config={publishedLayout(store.data,products.data?.content || [])}
        publicCartCount={lines.reduce((sum,line)=>sum+line.quantity,0)}
        onOpenPublicCart={()=>checkout.current?.scrollIntoView({block:'start'})}
        onAddPublicProduct={id=>{ const product=products.data?.content.find(item=>item.id===id); if(product) quantity(product,(lines.find(line=>line.product.id===id)?.quantity || 0)+1) }} />
      <Pagination page={page} totalPages={products.data?.totalPages ?? 0} onChange={setPage} />
      <div ref={checkout}><Checkout store={store.data} lines={lines} onCreated={()=>updateCart([])} /></div>
    </>}
  </div>
}
