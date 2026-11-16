import { useRef, useState, type FormEvent } from 'react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import {
  EMPTY_ADDRESS, formatZipCode, toAddressPayload, validateAddress,
  type AddressErrors, type AddressFields,
} from '@/lib/address-form'
import { core, json } from '../lib/api'
import { useAction } from '../lib/hooks'
import type { Address } from '../lib/types'
import { Feedback } from './Feedback'

const ORDER: (keyof AddressFields)[] = ['name', 'phone', 'zipCode', 'state', 'street', 'number', 'complement', 'city']

/** Delivery address at checkout: each field says in words what is wrong, and the first one gets focus. */
export function AddressForm({ onSaved }: { onSaved: (address: Address) => void }) {
  const action = useAction()
  const [fields, setFields] = useState<AddressFields>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})
  const inputs = useRef<Partial<Record<keyof AddressFields, HTMLInputElement | null>>>({})

  function bind(key: keyof AddressFields, format: (value: string) => string = value => value) {
    return {
      value: fields[key],
      error: errors[key],
      disabled: action.busy,
      ref: (node: HTMLInputElement | null) => { inputs.current[key] = node },
      onValueChange: (value: string) => {
        setFields(current => ({ ...current, [key]: format(value) }))
        if (errors[key]) setErrors(current => ({ ...current, [key]: undefined }))
      },
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateAddress(fields)
    setErrors(found)
    const first = ORDER.find(key => found[key])
    if (first) {
      inputs.current[first]?.focus()
      return
    }
    const payload = toAddressPayload(fields)
    void action.run(async () => {
      await core('/customers/me', { method: 'PUT', body: json(payload.customer) })
      onSaved(await core<Address>('/customers/me/addresses', { method: 'POST', body: json(payload.address) }))
    })
  }

  return <form onSubmit={submit} noValidate aria-label="Novo endereço de entrega">
    <Field label="Nome de quem recebe" maxLength={160} autoComplete="name" {...bind('name')} />
    <Field label="Telefone" type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="(11) 99999-0000" {...bind('phone')} />
    <div className="form-grid">
      <Field label="CEP" inputMode="numeric" maxLength={9} autoComplete="postal-code" placeholder="00000-000" {...bind('zipCode', formatZipCode)} />
      <Field label="UF" maxLength={2} autoComplete="address-level1" placeholder="SP" {...bind('state', value => value.toUpperCase())} />
    </div>
    <Field label="Rua" maxLength={160} autoComplete="address-line1" {...bind('street')} />
    <div className="form-grid">
      <Field label="Número" maxLength={30} {...bind('number')} />
      <Field label="Complemento" maxLength={160} autoComplete="address-line2" description="Opcional." {...bind('complement')} />
    </div>
    <Field label="Cidade" maxLength={120} autoComplete="address-level2" {...bind('city')} />
    <Feedback error={action.error} />
    <div><HardwareButton type="submit" variant="primary" loading={action.busy}>Salvar endereço</HardwareButton></div>
  </form>
}
