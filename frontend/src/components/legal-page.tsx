import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/echo/card'
import { Grid } from '@/components/echo/layout'
import { LegalDocumentBody } from '@/components/legal-document'
import { documentTitle } from '@/lib/legal-markdown'
import { LEGAL_DOCUMENTS } from '@/lib/legal-documents'
import { LEGAL_SLUGS, SYNDETIS_COMPANY, type LegalSlug } from '@/lib/legal-versions'
import './legal.css'

/** One public legal text, at #/legal/<slug>. */
export function LegalPage({ slug }: { slug: LegalSlug }) {
  const document = LEGAL_DOCUMENTS[slug]
  return (
    <section className="shell legal-page">
      <nav className="legal-breadcrumb" aria-label="Navegação dos documentos">
        <a href="#/legal"><ArrowLeft size={14} aria-hidden="true" /> Todos os documentos</a>
      </nav>
      <article className="legal-article" aria-labelledby="legal-title">
        <header>
          <span className="eyebrow">Documentos legais</span>
          <h1 id="legal-title">{documentTitle(document.source) || document.title}</h1>
        </header>
        <LegalDocumentBody source={document.source} />
      </article>
    </section>
  )
}

/** #/legal: every legal text, with one line on each. */
export function LegalIndex() {
  return (
    <section className="shell legal-page">
      <header className="legal-index-heading">
        <span className="eyebrow">Documentos legais</span>
        <h1>Termos, privacidade e regras da Syndetis</h1>
        <p>
          Os textos que valem entre a Syndetis, os lojistas e os compradores. São rascunhos em revisão jurídica e ainda
          podem mudar antes da publicação definitiva.
        </p>
      </header>
      <Grid minItemWidth="18rem" gap={10}>
        {LEGAL_SLUGS.map(slug => (
          <Card
            key={slug}
            title={LEGAL_DOCUMENTS[slug].title}
            description={LEGAL_DOCUMENTS[slug].summary}
            href={`#/legal/${slug}`}
            headingLevel={2}
          />
        ))}
      </Grid>
      <p className="legal-company">
        {SYNDETIS_COMPANY.legalName} · CNPJ {SYNDETIS_COMPANY.cnpj} · {SYNDETIS_COMPANY.address} · {SYNDETIS_COMPANY.email}
      </p>
    </section>
  )
}
