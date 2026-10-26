import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { SellerCatalog } from '../components/SellerCatalog'
import { SellerOrders } from '../components/SellerOrders'
import { StoreSettings } from '../components/StoreSettings'
import { core, json } from '../lib/api'
import { useAction, useResource } from '../lib/hooks'
import type { Store } from '../lib/types'

export function SellerPage() {
  const stores = useResource<Store[]>('/stores/me')
  const [selected, setSelected] = useState('')
  const [creating, setCreating] = useState(false)
  const action = useAction()
  const store = stores.data?.find((item) => item.id === selected) ?? stores.data?.[0]
  return <section><p className="eyebrow">Espaço do lojista</p><h1>Sua loja, do seu jeito.</h1><Feedback error={stores.error || action.error} loading={stores.loading} />
    <div className="actions">{!!stores.data?.length && <label>Loja<select value={store?.id} onChange={(event) => setSelected(event.target.value)}>{stores.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <button className="secondary" onClick={() => setCreating(!creating)}>{creating ? 'Fechar formulário' : 'Criar loja'}</button>{store && <Link className="button" to={`/lojas/${store.slug}`}>Abrir vitrine ↗</Link>}</div>
    {(creating || stores.data?.length === 0) && <form className="panel form-grid" onSubmit={(event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      void action.run(async () => {
        const created = await core<Store>('/stores', { method: 'POST', body: json({ name: form.get('name'), slug: form.get('slug') }) })
        setSelected(created.id); setCreating(false); stores.reload()
      })
    }}><label>Nome da loja<input name="name" required maxLength={160} /></label><label>Identificador público<input name="slug" required minLength={3} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label><button disabled={action.busy}>Criar minha loja</button></form>}
    {store && <div key={store.id} className="seller-sections"><StoreSettings store={store} onSaved={stores.reload} /><SellerCatalog storeId={store.id} /><SellerOrders storeId={store.id} /></div>}
  </section>
}
