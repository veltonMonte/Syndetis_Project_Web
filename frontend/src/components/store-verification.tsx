import { useRef, useState, type FormEvent } from 'react'
import { Card } from '@/components/echo/card'
import { HardwareButton } from '@/components/echo/hardware-button'
import { useToast } from '@/components/echo/toast'
import { MerchantDocumentFields } from '@/components/merchant-document-fields'
import { VerifiedBadge } from '@/components/verified-badge'
import { confirmMerchantDocument, errorMessage, type AuthSession } from '@/lib/api'
import { validateDocument, type DocumentErrors } from '@/lib/tax-id'

/**
 * The "Verificado Syndetis" badge in the dashboard: shown when the owner's CNPJ is confirmed, otherwise an invitation
 * to add it. Confirming replaces the session's tokens; the dashboard then reloads the stores, which carry the badge.
 */
export function StoreVerification({ session, verified }: { session: AuthSession; verified: boolean }) {
  const toast = useToast()
  const documentInput = useRef<HTMLInputElement>(null)
  const [document, setDocument] = useState('')
  const [errors, setErrors] = useState<DocumentErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  if (verified) {
    return (
      <Card headingLevel={2} variant="screen" title="Selo Verificado Syndetis" description="CNPJ ativo confirmado na Receita Federal">
        <div className="store-verification">
          <VerifiedBadge />
          <p>Sua vitrine mostra o selo para os compradores, ao lado do nome da loja.</p>
        </div>
      </Card>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const found = document ? validateDocument(document) : { document: 'Informe o CNPJ da loja (14 dígitos).' }
    setErrors(found)
    setFormError('')
    if (found.document) {
      documentInput.current?.focus()
      return
    }
    setLoading(true)
    try {
      await confirmMerchantDocument(session, { document })
      toast({ title: 'CNPJ confirmado', body: 'Sua loja ganhou o selo Verificado Syndetis.' })
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card headingLevel={2} variant="screen" title="Cadastre seu CNPJ para ganhar o selo" description="Opcional: sua loja já vende sem ele">
      <form className="store-verification" onSubmit={submit} noValidate>
        <p>
          Lojas com CNPJ ativo na Receita Federal mostram o selo Verificado Syndetis na vitrine. MEI também vale.
        </p>
        {formError && <p className="auth-notice" role="alert">{formError}</p>}
        <MerchantDocumentFields
          document={document}
          onDocumentChange={value => { setDocument(value); setErrors({}) }}
          errors={errors}
          disabled={loading}
          documentRef={documentInput}
        />
        <div>
          <HardwareButton type="submit" variant="primary" loading={loading}>Verificar CNPJ</HardwareButton>
        </div>
      </form>
    </Card>
  )
}
