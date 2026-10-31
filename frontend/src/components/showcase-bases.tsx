import { StoreEditorText } from '@/components/store-editor-text'
import { StoreAction } from '@/components/store-action'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import {
  formatBRL,
  type StoreComponent,
  type StoreProduct,
  type StoreTemplate,
} from '@/lib/maker'
import './showcase-bases.css'

type Props = {
  section: StoreComponent
  preset: StoreTemplate
  name: string
  products: StoreProduct[]
  image: (src?: string, alt?: string) => ReactNode
}
export function ShowcaseBase({
  section,
  preset,
  name,
  products,
  image,
}: Props) {
  const layout = preset.cinematic!.layout
  const selected = section.productIds?.[0]
    ? products.find((product) => product.id === section.productIds![0])
    : products[0]
  const src = section.imageUrl || selected?.image
  const picture = (className: string) => (
    <div className={'showcase-photo ' + className}>
      {image(
        src,
        section.imageAlt || selected?.name || 'Adicione uma foto da sua marca',
      )}
    </div>
  )
  const facts = (section.facts || []).filter(
    (fact) => fact.label.trim() || fact.value.trim(),
  )
  const action = (
    <StoreAction section={section} className="showcase-action">
      {section.ctaText || 'Ver produtos'}
      <ArrowUpRight size={16} aria-hidden="true" />
    </StoreAction>
  )
  const frameProps = {
    'data-image-mode': section.imagePresentation || 'photo',
    style: {
      '--showcase-image-fit':
        section.imageFit || (layout === 'technical' ? 'contain' : 'cover'),
    } as CSSProperties,
  }
  if (layout === 'editorial')
    return (
      <div className="showcase-editorial" {...frameProps}>
        <div className="showcase-editorial-copy">
          <small>Uma seleção de {name}</small>
          <h3><StoreEditorText section={section} field="title" /></h3>
          <p><StoreEditorText section={section} field="subtitle" /></p>
          {action}
          <div className="showcase-editorial-footnote">
            <span>Da sua marca.</span>
            <span>Para o seu dia a dia.</span>
          </div>
        </div>
        {picture('showcase-editorial-photo')}
      </div>
    )
  if (layout === 'mosaic')
    return (
      <div className="showcase-mosaic" {...frameProps}>
        <div className="showcase-mosaic-lead">
          <small>{name}</small>
          <h3><StoreEditorText section={section} field="title" /></h3>
          <p><StoreEditorText section={section} field="subtitle" /></p>
          {action}
        </div>
        {picture('showcase-mosaic-photo')}
        <div className="showcase-mosaic-note">
          <small>Seleções da marca</small>
          <strong>Detalhes que fazem a diferença.</strong>
          <ArrowUpRight size={28} aria-hidden="true" />
        </div>
      </div>
    )
  if (layout === 'technical')
    return (
      <div className="showcase-technical" {...frameProps}>
        <div className="showcase-technical-summary">
          <h3><StoreEditorText section={section} field="title" /></h3>
          <p className="showcase-technical-subtitle">
            {selected?.name || 'Produto em destaque'}
          </p>
          <div className="showcase-technical-facts">
            <h4>Características</h4>
            {facts.length ? (
              <dl>
                {facts.map((fact, index) => (
                  <div key={index}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>Preencha as características do produto no Maker.</p>
            )}
          </div>
          <div className="showcase-technical-purchase">
            {selected && <strong>{formatBRL(selected.price)}</strong>}
            {action}
          </div>
        </div>
        {picture('showcase-technical-photo')}
        <div className="showcase-technical-description">
          <h4>Descrição</h4>
          <p>
            {section.subtitle ||
              selected?.description ||
              'Apresente os diferenciais do seu produto.'}
          </p>
          <span>Detalhes, imagens e condições definidos pela loja.</span>
        </div>
      </div>
    )
  if (layout === 'catalog')
    return (
      <div className="showcase-catalog-banner" {...frameProps}>
        <div>
          <small>Seleção de {name}</small>
          <h3><StoreEditorText section={section} field="title" /></h3>
          <p><StoreEditorText section={section} field="subtitle" /></p>
          {action}
        </div>
        {picture('showcase-catalog-photo')}
      </div>
    )
  return (
    <div className="showcase-immersive" {...frameProps}>
      {picture('showcase-immersive-photo')}
      <div className="showcase-immersive-copy">
        <small>{name}</small>
        <h3><StoreEditorText section={section} field="title" /></h3>
        <p><StoreEditorText section={section} field="subtitle" /></p>
        {action}
      </div>
      <div className="showcase-immersive-foot">
        <span>Explore a seleção</span>
        <ArrowDown size={18} aria-hidden="true" />
      </div>
    </div>
  )
}
