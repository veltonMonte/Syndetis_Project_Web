import { useRef, useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Panel } from '@/components/echo/panel'
import { useToast } from '@/components/echo/toast'
import { MerchantDocumentFields } from '@/components/merchant-document-fields'
import { confirmMerchantDocument, errorMessage, type AuthSession } from '@/lib/api'
import { validateDocument, type DocumentErrors } from '@/lib/tax-id'

/**
 * Shown to a merchant whose account came from Google or GitHub and has no confirmed CPF/CNPJ yet: the
 * platform only opens stores for documents the Receita Federal confirms.
 */
export function MerchantDocumentPage({ session, onConfirmed }: { session: AuthSession; onConfirmed: (session: AuthSession) => void }) {
  const toast = useToast()
  const documentInput = useRef<HTMLInputElement>(null)
  const [document, setDocument] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [errors, setErrors] = useState<DocumentErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const found = validateDocument(document, birthDate)
    setErrors(found)
    setFormError('')
    if (found.document || found.birthDate) {
      if (found.document) documentInput.current?.focus()
      return
    }
    setLoading(true)
    try {
      const next = await confirmMerchantDocument(session, { document, birthDate })
      toast({ title: 'Documento confirmado', body: 'A Receita Federal confirmou seu documento. Agora você pode criar sua loja.' })
      onConfirmed(next)
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="shell merchant-document-page">
      <Panel variant="raised">
        <form onSubmit={submit} noValidate>
          <ShieldCheck size={28} aria-hidden="true" />
          <h1>Confirme seu CPF ou CNPJ</h1>
          <p>
            Para vender na Syndetis, sua conta precisa de um CPF ou CNPJ ativo na Receita Federal. Você só faz isso uma vez.
          </p>
          {formError && <p className="auth-notice" role="alert">{formError}</p>}
          <MerchantDocumentFields
            document={document}
            birthDate={birthDate}
            onDocumentChange={value => { setDocument(value); setErrors(current => ({ ...current, document: undefined })) }}
            onBirthDateChange={value => { setBirthDate(value); setErrors(current => ({ ...current, birthDate: undefined })) }}
            errors={errors}
            disabled={loading}
            documentRef={documentInput}
          />
          <HardwareButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Confirmar documento
          </HardwareButton>
        </form>
      </Panel>
    </section>
  )
}
