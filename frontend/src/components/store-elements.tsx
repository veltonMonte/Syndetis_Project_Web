import { useEffect, useState, type ReactNode } from 'react'
import { StoreAction } from '@/components/store-action'
import { StoreEditorText } from '@/components/store-editor-text'
import { cleanItems, cleanTargetDate } from '@/lib/maker-elements'
import type { StoreComponent } from '@/lib/maker'

type ImageRenderer = (src?: string, alt?: string) => ReactNode

/** Free elements of the Maker: small pieces the merchant places anywhere on the page. */
export function StoreFreeElement({ section, image, editing, paused }: { section: StoreComponent; image: ImageRenderer; editing: boolean; paused: boolean }) {
  switch (section.type) {
    case 'text':
      return <div className="shop-free-text">
        {(section.title || editing) && <h4><StoreEditorText section={section} field="title" /></h4>}
        {(section.subtitle || editing) && <p><StoreEditorText section={section} field="subtitle" /></p>}
      </div>
    case 'image':
      return <figure className="shop-free-image">
        {image(section.imageUrl, section.imageAlt || 'Adicione uma imagem')}
        {(section.title || editing) && <figcaption><StoreEditorText section={section} field="title" /></figcaption>}
      </figure>
    case 'button':
      return <div className="shop-free-button">
        <StoreAction section={section} className="shop-action">{section.ctaText || 'Ver produtos'}</StoreAction>
      </div>
    case 'banner':
      return <div className="shop-free-banner" data-has-image={!!section.imageUrl || undefined}>
        {section.imageUrl && <div className="shop-free-banner-media">{image(section.imageUrl, section.imageAlt || '')}</div>}
        <div className="shop-free-banner-copy">
          <h4><StoreEditorText section={section} field="title" /></h4>
          {(section.subtitle || editing) && <p><StoreEditorText section={section} field="subtitle" /></p>}
          {section.ctaText && <StoreAction section={section} className="shop-action">{section.ctaText}</StoreAction>}
        </div>
      </div>
    case 'spacer':
      return <div className="shop-free-spacer" aria-hidden={editing ? undefined : true}>{editing && <span>Espaçador</span>}</div>
    case 'divider':
      return <hr className="shop-free-divider" />
    case 'countdown':
      return <div className="shop-free-countdown">
        {(section.title || editing) && <h4><StoreEditorText section={section} field="title" /></h4>}
        <Countdown target={cleanTargetDate(section.targetDate)} paused={paused} />
        {(section.subtitle || editing) && <p><StoreEditorText section={section} field="subtitle" /></p>}
      </div>
    case 'testimonials': {
      const items = cleanItems(section.items)
      return <div className="shop-extra shop-testimonials">
        <h4><StoreEditorText section={section} field="title" /></h4>
        {(section.subtitle || editing) && <p><StoreEditorText section={section} field="subtitle" /></p>}
        {items ? <div className="shop-testimonial-list">{items.map((item, index) => <blockquote key={index}>
          <p>{item.quote}</p>{item.author && <footer>{item.author}</footer>}
        </blockquote>)}</div> : <p className="shop-empty">Escreva os depoimentos dos seus clientes no painel de edição.</p>}
      </div>
    }
    default:
      return null
  }
}

const UNITS = [['dias', 86400], ['horas', 3600], ['minutos', 60], ['segundos', 1]] as const

function Countdown({ target, paused }: { target?: string; paused: boolean }) {
  const end = target ? Date.parse(target) : NaN
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!Number.isFinite(end) || paused) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [end, paused])
  if (!Number.isFinite(end)) return <p className="shop-empty">Defina a data de término no painel de edição.</p>
  const left = Math.max(0, Math.floor((end - now) / 1000))
  if (!left) return <p className="shop-free-countdown-done">Encerrado</p>
  const parts = UNITS.map(([label, size], index) => [label, Math.floor((index ? left % UNITS[index - 1][1] : left) / size)] as const)
  const date = new Date(end).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
  return <div className="shop-free-countdown-clock" role="timer" aria-label={'Termina em ' + date}>
    {parts.map(([label, value]) => <span key={label}><strong>{String(value).padStart(2, '0')}</strong><small>{label}</small></span>)}
  </div>
}
