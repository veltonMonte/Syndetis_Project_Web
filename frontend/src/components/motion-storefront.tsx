import { StoreEditorText } from '@/components/store-editor-text'
import { accentInk } from '@/lib/maker'
import { StoreAction } from '@/components/store-action'
import { ShowcaseBase } from '@/components/showcase-bases'
import type { CSSProperties, ReactNode } from 'react'
import { Image as ImageIcon, Pause, Play, Zap } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import type { StoreComponent, StoreProduct, StoreTemplate } from '@/lib/maker'
import './motion-storefront.css'

export function MotionMarquee({
  text,
  paused,
  userMotion,
  onToggle,
}: {
  text: string
  paused: boolean
  userMotion: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="motion-marquee"
      data-paused={paused || undefined}
      data-user-motion={userMotion || undefined}
    >
      <p className="motion-announcement-text">{text}</p>
      <div className="motion-marquee-window" aria-hidden="true">
        <div className="motion-marquee-track">
          {[0, 1].map((group) => (
            <div key={group} className="motion-marquee-group">
              {[0, 1, 2].map((item) => (
                <span key={item}>
                  <Zap size={14} />
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="motion-pause">
        <HardwareButton
          size="sm"
          variant="ghost"
          iconOnly
          icon={paused ? <Play size={14} /> : <Pause size={14} />}
          aria-label={
            paused
              ? 'Retomar animações da vitrine'
              : 'Pausar animações da vitrine'
          }
          aria-pressed={paused}
          onClick={onToggle}
        />
      </div>
    </div>
  )
}

export function MotionStorefrontHero({
  section,
  preset,
  name,
  products,
  paused,
  userMotion,
  image,
}: {
  section: StoreComponent
  preset: StoreTemplate
  name: string
  products: StoreProduct[]
  paused: boolean
  userMotion: boolean
  image: (src?: string, alt?: string) => ReactNode
}) {
  const palette = preset.cinematic!
  if (palette.layout !== 'cinematic')
    return (
      <ShowcaseBase
        section={section}
        preset={preset}
        name={name}
        products={products}
        image={image}
      />
    )
  const selected = section.productIds?.length
    ? section.productIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is StoreProduct => !!product)
    : products.filter((product) => !!product.image).slice(0, 3)
  const visibleProducts = selected
    .filter((product) => !!product.image)
    .slice(0, 3)
  const style = {
    '--motion-start': palette.gradient[0],
    '--motion-ink': accentInk(palette.gradient[0]),
    '--motion-image-fit':
      section.imageFit ||
      (section.imagePresentation === 'cutout' ? 'contain' : 'cover'),
    '--motion-middle': palette.gradient[1],
    '--motion-end': palette.gradient[2],
    '--motion-weight': ['ambar', 'prisma'].includes(preset.id) ? 800 : 400,
  } as CSSProperties
  return (
    <div
      className="motion-hero"
      data-motion-hero={preset.id}
      data-image-mode={section.imagePresentation || 'photo'}
      data-user-motion={userMotion || undefined}
      data-paused={paused || undefined}
      style={style}
    >
      <h3 className="motion-headline"><StoreEditorText section={section} field="title" /></h3>
      {section.imageUrl ? (
        <div className="motion-scene motion-scene-artwork">
          {image(
            section.imageUrl,
            section.imageAlt || 'Composição visual da sua marca',
          )}
        </div>
      ) : visibleProducts.length ? (
        <div
          className="motion-scene motion-product-fan"
          data-count={visibleProducts.length}
        >
          {visibleProducts.map((product, index) => (
            <div
              className="motion-product-cutout"
              key={product.id + '-' + index}
              style={{ '--motion-product-index': index } as CSSProperties}
            >
              {image(product.image, product.name)}
            </div>
          ))}
        </div>
      ) : (
        <div className="motion-empty">
          <ImageIcon size={28} aria-hidden="true" />
          <p>
            Escolha até três produtos com imagem ou adicione uma composição da
            sua marca.
          </p>
        </div>
      )}
      <div className="motion-glass-card">
        <strong>{name}</strong>
        {section.subtitle && <p><StoreEditorText section={section} field="subtitle" /></p>}
        <div className="motion-actions">
          {section.ctaText && (
            <StoreAction section={section} className="motion-primary-action">{section.ctaText}</StoreAction>
          )}
          <span className="motion-secondary-action">Sobre</span>
        </div>
      </div>
    </div>
  )
}
