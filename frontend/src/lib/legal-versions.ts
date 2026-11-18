/**
 * The legal texts in force (docs/legal/README.md). Each version is the date printed on the text in src/legal and
 * must match auth.legal.* in the auth-service's application.properties: a signup that sends any other version
 * is refused, and every merchant whose acceptance is older is asked to accept again.
 */
export const LEGAL_VERSIONS = {
  termsVersion: '2026-11-18',
  privacyVersion: '2026-11-18',
} as const

/**
 * Who offers the platform, shown in the footer (Decreto nº 7.962/2013, art. 2º). [PREENCHER] marks data that only
 * the company can give: fill it in here, once, and in the texts of src/legal.
 */
export const SYNDETIS_COMPANY = {
  legalName: '[PREENCHER: razão social]',
  cnpj: '[PREENCHER: CNPJ]',
  address: '[PREENCHER: endereço]',
  email: '[PREENCHER: e-mail de atendimento]',
} as const

/** The public pages, in the order the index and the footer list them. */
export const LEGAL_SLUGS = [
  'termos-de-uso',
  'privacidade',
  'cookies',
  'assinatura',
  'selo-verificado',
  'modelo-para-lojas',
] as const

export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export const isLegalSlug = (value: string): value is LegalSlug => (LEGAL_SLUGS as readonly string[]).includes(value)
