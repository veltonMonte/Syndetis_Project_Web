import { useState } from 'react'
import { core, json, money } from '../lib/api'
import { useAction, useResource } from '../lib/hooks'
import type { Inventory, Page, Product } from '../lib/types'
import { Feedback, Pagination } from './Feedback'

export function SellerCatalog({ storeId }: { storeId: string }) {
  const [page, setPage] = useState(0)
  const products = useResource<Page<Product>>(`/stores/${storeId}/products?page=${page}`)
  const inventory = useResource<Inventory[]>(`/stores/${storeId}/inventory`)
  const action = useAction()
  const [message, setMessage] = useState('')
  const refresh = () => { products.reload(); inventory.reload() }
  return <section className="panel"><h2>Produtos e estoque</h2><form className="form-grid" onSubmit={(event) => {
    event.preventDefault()
    const element = event.currentTarget
    const form = new FormData(element)
    void action.run(async () => {
      await core(`/stores/${storeId}/products`, { method: 'POST', body: json({ name: form.get('name'), sku: form.get('sku'),
        price: Number(form.get('price')), description: form.get('description'), imageUrl: String(form.get('imageUrl') || '') || null }) })
      element.reset(); setMessage('Produto cadastrado. Adicione unidades ao estoque abaixo.'); refresh()
    })
  }}><label>Nome do produto<input name="name" required maxLength={160} /></label><label>SKU<input name="sku" required maxLength={100} /></label>
    <label>Preço (R$)<input name="price" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label><label>URL da imagem<input name="imageUrl" type="url" maxLength={2048} /></label>
    <label className="full-width">Descrição<textarea name="description" maxLength={10000} /></label><button disabled={action.busy}>Cadastrar produto</button></form>
    <Feedback error={action.error || products.error || inventory.error} loading={products.loading} /><p role="status">{message}</p>
    <ul className="catalog-list">{products.data?.content.map((product) => <li key={product.id}>
      <div><strong>{product.name}</strong><p className="muted">{money(product.price)} · Disponíveis: {inventory.data?.find((stock) => stock.productId === product.id)?.available ?? '…'}</p></div>
      <form className="stock-form" onSubmit={(event) => {
        event.preventDefault()
        const element = event.currentTarget
        const form = new FormData(element)
        void action.run(async () => {
          await core(`/stores/${storeId}/inventory/${product.id}/movements`, { method: 'POST', body: json({ delta: Number(form.get('quantity')), reason: 'Entrada pelo painel do lojista' }) })
          element.reset(); setMessage('Estoque atualizado.'); refresh()
        })
      }}><label>Adicionar unidades de {product.name}<input name="quantity" type="number" min="1" max="100000" step="1" required /></label><button className="secondary" disabled={action.busy}>Adicionar estoque</button></form>
    </li>)}</ul><Pagination page={page} totalPages={products.data?.totalPages ?? 0} onChange={setPage} />
  </section>
}
