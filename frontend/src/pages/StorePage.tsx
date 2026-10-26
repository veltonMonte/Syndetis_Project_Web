import { useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { Checkout } from '../components/Checkout'
import { Feedback, Pagination } from '../components/Feedback'
import { money } from '../lib/api'
import { useResource } from '../lib/hooks'
import type { CartLine, Page, Product, PublicStore } from '../lib/types'

export function StorePage() { const { slug = '' } = useParams(); return <Storefront key={slug} slug={slug} /> }
function Storefront({ slug }: { slug: string }) {
  const store = useResource<PublicStore>(`/public/stores/${encodeURIComponent(slug)}`)
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
  const color = store.data?.layout.theme.primaryColor
  return <div style={{ '--brand': color && /^#[a-f0-9]{6}$/i.test(color) ? color : '#3630a3' } as CSSProperties}>
    <Feedback error={store.error} loading={store.loading} />
    {store.data && <><header className="store-hero"><p className="eyebrow">{store.data.name}</p><h1>{store.data.layout.sections.find((section) => section.type === 'hero')?.title ?? store.data.name}</h1><p>{store.data.deliveryInstructions}</p></header>
      <div className="shop-layout"><section><h2>Escolha seus produtos</h2><Feedback error={products.error} loading={products.loading} />
        {products.data?.content.length === 0 && <p className="notice">Esta loja ainda não tem produtos disponíveis.</p>}
        <div className="product-grid">{products.data?.content.map((product) => {
          const amount = lines.find((line) => line.product.id === product.id)?.quantity ?? 0
          return <article className="product-card" key={product.id}>
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" /> : <div className="product-placeholder" aria-hidden="true">S.</div>}
            <div className="product-body"><h3>{product.name}</h3><p className="muted">{product.description}</p><strong>{money(product.price)}</strong>
              {amount ? <div className="quantity"><button aria-label={`Remover uma unidade de ${product.name}`} onClick={() => quantity(product, amount - 1)}>−</button><output aria-label={`Quantidade de ${product.name}`}>{amount}</output><button disabled={amount >= 99} aria-label={`Adicionar uma unidade de ${product.name}`} onClick={() => quantity(product, amount + 1)}>+</button></div> : <button onClick={() => quantity(product, 1)}>Adicionar ao pedido</button>}</div>
          </article>
        })}</div><Pagination page={page} totalPages={products.data?.totalPages ?? 0} onChange={setPage} /></section>
        <Checkout store={store.data} lines={lines} onCreated={() => updateCart([])} /></div></>}
  </div>
}
