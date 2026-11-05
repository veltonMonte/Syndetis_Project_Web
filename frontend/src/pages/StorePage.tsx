import { useRef, useState } from 'react'
import { Sheet } from '@/components/echo/sheet'
import { NumberField } from '@/components/echo/number-field'
import { Stack } from '@/components/echo/layout'
import { money } from '@/lib/api'
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
  const [cartOpen, setCartOpen] = useState(false)
  const cartFocus = useRef<HTMLElement>(null)
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
        onOpenPublicCart={()=>{cartFocus.current=document.activeElement as HTMLElement;setCartOpen(true)}}
        onAddPublicProduct={id=>{ const product=products.data?.content.find(item=>item.id===id); if(product) quantity(product,(lines.find(line=>line.product.id===id)?.quantity || 0)+1) }} />
      <Sheet side="right" open={cartOpen} onOpenChange={setCartOpen}>
        <Sheet.Content title="Sua sacola" description="Confira os produtos e as quantidades antes de continuar." finalFocus={cartFocus}>
          <Stack gap={8}>
            {!lines.length && <p>Sua sacola está vazia. Adicione um produto da loja.</p>}
            {lines.map(line=><div key={line.product.id}><strong>{line.product.name}</strong><p>{money(line.product.price * line.quantity)}</p>
              <NumberField label={'Quantidade de '+line.product.name} value={line.quantity} min={1} max={99} step={1} smallStep={1} incrementLabel={'Aumentar quantidade de '+line.product.name} decrementLabel={'Diminuir quantidade de '+line.product.name} onValueChange={value=>{if(value!==null)quantity(line.product,value)}}/>
              <HardwareButton onClick={()=>quantity(line.product,0)}>Retirar da sacola</HardwareButton>
            </div>)}
            <p>Subtotal: {money(lines.reduce((total,line)=>total+line.product.price*line.quantity,0))}</p>
            <HardwareButton disabled={!lines.length} onClick={()=>{setCartOpen(false);requestAnimationFrame(()=>checkout.current?.scrollIntoView({block:'start'}))}}>Continuar para o pedido</HardwareButton>
            <Sheet.Close>Continuar comprando</Sheet.Close>
          </Stack>
        </Sheet.Content>
      </Sheet>
      <Pagination page={page} totalPages={products.data?.totalPages ?? 0} onChange={setPage} />
      <div ref={checkout}><Checkout store={store.data} lines={lines} onCreated={()=>updateCart([])} /></div>
    </>}
  </div>
}
