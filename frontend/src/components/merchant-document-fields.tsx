import { useEffect, useState } from 'react'
import { CalendarDays, IdCard } from 'lucide-react'
import { Field } from '@/components/echo/field'
import { errorMessage, lookupCnpj, type CnpjRecord } from '@/lib/api'
import { documentDigits, formatDocument, isValidCnpj, type DocumentErrors } from '@/lib/tax-id'
import './merchant-document-fields.css'

interface MerchantDocumentFieldsProps {
  document: string
  birthDate: string
  onDocumentChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  errors: DocumentErrors
  disabled?: boolean
  documentRef?: React.Ref<HTMLInputElement>
}

type Lookup = { cnpj: string } & ({ state: 'loading' } | { state: 'done'; record: CnpjRecord } | { state: 'failed'; message: string })

/**
 * The merchant's CPF or CNPJ. A complete CNPJ is looked up right away in the Receita Federal's open data, so
 * the merchant sees the company it belongs to (razão social, MEI, situação) before creating the account.
 * A CPF is personal data: it is checked, with the holder's date of birth, only when the account is created.
 */
export function MerchantDocumentFields({ document, birthDate, onDocumentChange, onBirthDateChange, errors, disabled, documentRef }: MerchantDocumentFieldsProps) {
  const digits = documentDigits(document)
  const isCpf = digits.length === 11
  const cnpj = digits.length === 14 && isValidCnpj(digits) ? digits : ''
  const [lookup, setLookup] = useState<Lookup | null>(null)

  useEffect(() => {
    if (!cnpj) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLookup({ cnpj, state: 'loading' })
      lookupCnpj(cnpj, controller.signal)
        .then(record => setLookup({ cnpj, state: 'done', record }))
        .catch(error => { if (!controller.signal.aborted) setLookup({ cnpj, state: 'failed', message: errorMessage(error) }) })
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [cnpj])

  const current = lookup?.cnpj === cnpj ? lookup : null
  const record = current?.state === 'done' ? current.record : null
  const lookupError = record && record.status !== 'ACTIVE'
    ? record.status === 'NOT_FOUND'
      ? 'Este CNPJ não existe na Receita Federal.'
      : `Este CNPJ está com a situação ${record.registrationStatus?.toLowerCase() || 'irregular'} na Receita Federal. Só documentos ativos podem abrir uma loja.`
    : undefined

  return (
    <div className="merchant-document">
      <Field
        ref={documentRef}
        disabled={disabled}
        label="CPF ou CNPJ"
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
        inputMode="numeric"
        autoComplete="off"
        maxLength={18}
        start={<IdCard size={15} />}
        value={formatDocument(document)}
        onValueChange={value => onDocumentChange(documentDigits(value))}
        error={errors.document || lookupError}
        description={
          current?.state === 'loading' ? 'Consultando a Receita Federal…'
            : current?.state === 'failed' ? `Não foi possível consultar agora (${current.message}). Confirmamos ao criar a conta.`
              : record?.status === 'ACTIVE' ? undefined
                : 'A conta de lojista só é criada para um CPF ou CNPJ ativo na Receita Federal.'
        }
      />
      {record?.status === 'ACTIVE' && (
        <div className="merchant-document-company" role="status" aria-label="Empresa encontrada na Receita Federal">
          <strong>{record.name || 'Empresa sem razão social informada'}</strong>
          {record.tradeName && record.tradeName !== record.name && <span>{record.tradeName}</span>}
          <dl>
            <div><dt>Situação</dt><dd>{record.registrationStatus || 'Ativa'}</dd></div>
            <div><dt>Porte</dt><dd>{record.mei ? 'MEI (microempreendedor individual)' : record.legalNature || 'Empresa'}</dd></div>
          </dl>
        </div>
      )}
      {isCpf && (
        <Field
          disabled={disabled}
          label="Data de nascimento do titular do CPF"
          type="date"
          autoComplete="bday"
          start={<CalendarDays size={15} />}
          value={birthDate}
          onValueChange={onBirthDateChange}
          error={errors.birthDate}
          description="A Receita Federal confirma o CPF junto com a data de nascimento."
        />
      )}
    </div>
  )
}
