import { useId, useState, type FormEvent } from 'react'
import { FileText } from 'lucide-react'
import { Checkbox } from '@/components/echo/checkbox'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Panel } from '@/components/echo/panel'
import { useToast } from '@/components/echo/toast'
import { errorMessage } from '@/lib/api'
import { acceptLegalTerms } from '@/lib/legal-api'
import './legal.css'

export const LEGAL_CONSENT_REQUIRED = 'Para continuar, aceite os Termos de Uso e a Política de Privacidade.'

/**
 * The acceptance checkbox, with links to the texts it accepts. Used on the signup form and on the in-app screen,
 * so both record the same thing.
 */
export function LegalConsent({
  checked,
  onCheckedChange,
  error,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="legal-consent">
      <div className="legal-consent-row">
        <Checkbox
          id={`${id}-box`}
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          checked={checked}
          onCheckedChange={next => onCheckedChange(next)}
          disabled={disabled}
          required
        />
        <label id={`${id}-label`} htmlFor={`${id}-box`}>
          Li e aceito os <a href="#/legal/termos-de-uso" target="_blank" rel="noopener">Termos de Uso</a>, incluindo as{' '}
          <a href="#/legal/assinatura" target="_blank" rel="noopener">regras da assinatura</a>, e estou ciente da{' '}
          <a href="#/legal/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.
        </label>
      </div>
      {error && <p id={`${id}-error`} className="legal-consent-error" role="alert">{error}</p>}
    </div>
  )
}

/**
 * Shown to a merchant whose account has no acceptance of the texts in force: the first Google or GitHub
 * sign-in, or a newer version of the Terms. The legal pages stay readable meanwhile.
 */
export function LegalAcceptancePage({ firstTime, onAccepted }: { firstTime: boolean; onAccepted: () => void }) {
  const toast = useToast()
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    if (!checked) { setError(LEGAL_CONSENT_REQUIRED); return }
    setLoading(true)
    setError('')
    try {
      await acceptLegalTerms()
      toast({ title: 'Aceite registrado', body: 'Guardamos a versão e a data do seu aceite.' })
      onAccepted()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="shell legal-acceptance-page">
      <Panel variant="raised">
        <form onSubmit={submit} noValidate>
          <FileText size={28} aria-hidden="true" />
          <h1>{firstTime ? 'Antes de começar' : 'Os Termos de Uso mudaram'}</h1>
          <p>
            {firstTime
              ? 'Para usar o painel e o Maker, leia e aceite os Termos de Uso da Syndetis. Eles explicam o que a plataforma faz, as regras da assinatura e como tratamos os dados dos seus compradores.'
              : 'Publicamos uma nova versão dos Termos de Uso ou da Política de Privacidade. Leia e aceite para continuar usando o painel.'}
          </p>
          <LegalConsent
            checked={checked}
            onCheckedChange={next => { setChecked(next); if (next) setError('') }}
            error={error}
            disabled={loading}
          />
          <HardwareButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Aceitar e continuar
          </HardwareButton>
        </form>
      </Panel>
    </section>
  )
}
