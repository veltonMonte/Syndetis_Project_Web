import { useState } from 'react'
import { core, json } from '../lib/api'
import { useAction } from '../lib/hooks'
import type { Layout, Store } from '../lib/types'
import { Feedback } from './Feedback'

export function StoreSettings({ store, onSaved }: { store: Store; onSaved: () => void }) {
  const action = useAction()
  const [message, setMessage] = useState('')
  return <div className="settings-grid"><section className="panel"><h2>Entrega da loja</h2>
    <form onSubmit={(event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      void action.run(async () => {
        await core(`/stores/${store.id}`, { method: 'PUT', body: json({ name: store.name, status: store.status,
          shippingFee: Number(form.get('shippingFee')), deliveryInstructions: form.get('deliveryInstructions') }) })
        setMessage('Condições de entrega salvas.'); onSaved()
      })
    }}><label>Valor fixo de entrega (R$)<input name="shippingFee" type="number" min="0" max="9999999999.99" step="0.01" required defaultValue={store.shippingFee} /></label>
      <label>Como você entrega?<textarea name="deliveryInstructions" required maxLength={1000} defaultValue={store.deliveryInstructions} /></label>
      <p className="fine-print">Defina uma condição que possa cumprir para os clientes da sua loja. O envio é de sua responsabilidade.</p>
      <button disabled={action.busy}>Salvar entrega</button></form></section>
    <section className="panel"><h2>Personalize sua vitrine</h2><form onSubmit={(event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      void action.run(async () => {
        const current = await core<{ config: Layout; version: number }>(`/stores/${store.id}/layout`)
        const config: Layout = { ...current.config, theme: { ...current.config.theme, primaryColor: String(form.get('color')) },
          sections: current.config.sections.map((section) => section.type === 'hero' ? { ...section, title: String(form.get('title')) } : section) }
        const draft = await core<{ version: number }>(`/stores/${store.id}/layout`, { method: 'PUT', headers: { 'If-Match': `"${current.version}"` }, body: json(config) })
        await core(`/stores/${store.id}/layout/publish`, { method: 'POST', headers: { 'If-Match': `"${draft.version}"` } })
        setMessage('Vitrine publicada.'); onSaved()
      })
    }}><label>Título da vitrine<input name="title" required maxLength={160} defaultValue={`Bem-vindo à ${store.name}`} /></label>
      <label>Cor principal<input name="color" type="color" defaultValue="#3630a3" /></label><button disabled={action.busy}>Publicar vitrine</button></form></section>
    <div className="full-width"><Feedback error={action.error} /><p role="status">{message}</p></div>
  </div>
}
