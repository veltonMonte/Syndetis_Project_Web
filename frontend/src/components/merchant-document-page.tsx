import { useRef, useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Panel } from '@/components/echo/panel'
import { useToast } from '@/components/echo/toast'
import { MerchantDocumentFields } from '@/components/merchant-document-fields'
import { confirmMerchantDocument, errorMessage, type AuthSession } from '@/lib/api'
import { validateDocument, type DocumentErrors } from '@/lib/tax-id'

/**
 * Shown to a merchant whose account came from Google or GitHub and has no confirmed CNPJ yet: the
 * platform only opens stores for documents the Receita Federal confirms.
 */
export function MerchantDocumentPage({ session, onConfirmed }: { session: AuthSession; onConfirmed: (session: AuthSession) => void }) {
  const toast = useToast()
  const documentInput = useRef<HTMLInputElement>(null)
  const [document, setDocument] = useState('')
  const [errors, setErrors] = useState<DocumentErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const found = validateDocument(document)
    setErrors(found)
    setFormError('')
    if (found.document) {
      documentInput.current?.focus()
      return
    }
    setLoading(true)
    try {
      const next = await confirmMerchantDocument(session, { document })
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
          <h1>Confirme o CNPJ da sua loja</h1>
          <p>
            Para vender na Syndetis, sua loja precisa de um CNPJ ativo na Receita Federal (MEI também vale). Você só faz isso uma vez.
          </p>
          {formError && <p className="auth-notice" role="alert">{formError}</p>}
          <MerchantDocumentFields
            document={document}
            onDocumentChange={value => { setDocument(value); setErrors(current => ({ ...current, document: undefined })) }}
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
