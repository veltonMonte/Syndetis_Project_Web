import { core, json } from '../lib/api'
import { useAction } from '../lib/hooks'
import type { Address } from '../lib/types'
import { Feedback } from './Feedback'

export function AddressForm({ onSaved }: { onSaved: (address: Address) => void }) {
  const action = useAction()
  return <form onSubmit={(event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void action.run(async () => {
      await core('/customers/me', { method: 'PUT', body: json({ name: form.get('name'), phone: form.get('phone') }) })
      onSaved(await core<Address>('/customers/me/addresses', { method: 'POST', body: json({
        zipCode: String(form.get('zipCode')).replace(/\D/g, ''), street: form.get('street'), number: form.get('number'),
        complement: form.get('complement'), city: form.get('city'), state: String(form.get('state')).toUpperCase(),
      }) }))
    })
  }}>
    <label>Nome de quem recebe<input name="name" required maxLength={160} autoComplete="name" /></label>
    <label>Telefone<input name="phone" type="tel" required maxLength={30} autoComplete="tel" /></label>
    <div className="form-grid"><label>CEP<input name="zipCode" required pattern="[0-9]{5}-?[0-9]{3}" autoComplete="postal-code" /></label><label>UF<input name="state" required pattern="[A-Za-z]{2}" maxLength={2} autoComplete="address-level1" /></label></div>
    <label>Rua<input name="street" required maxLength={160} autoComplete="address-line1" /></label>
    <div className="form-grid"><label>Número<input name="number" required maxLength={30} /></label><label>Complemento<input name="complement" maxLength={160} autoComplete="address-line2" /></label></div>
    <label>Cidade<input name="city" required maxLength={120} autoComplete="address-level2" /></label>
    <Feedback error={action.error} /><button className="secondary" disabled={action.busy}>Salvar endereço</button>
  </form>
}
