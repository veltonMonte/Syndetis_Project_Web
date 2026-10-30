import { useMemo, type CSSProperties } from 'react'
import { Image as ImageIcon, Pencil, Search, ShoppingBag } from 'lucide-react'
import { createEchoTheme } from 'echo-ui-core/theme'
import { HardwareButton } from '@/components/echo/hardware-button'
import {
  accentInk,
  ensureFullConfig,
  formatBRL,
  getStoreTemplate,
  initialConfig,
  photo,
  type LayoutConfig,
  type StoreComponent,
} from '@/lib/maker'
import './store-templates.css'

interface StorePreviewProps {
  config?: LayoutConfig
  mobile?: boolean
  selectedComponentId?: string | null
  onSelectComponent?: (id: string) => void
  activeCategoryFilter?: string | null
}

/** A read-only rendering of the same JSON used by the Maker. No demo data is injected. */
export function StorePreview({
  config = initialConfig,
  mobile = false,
  selectedComponentId,
  onSelectComponent,
  activeCategoryFilter,
}: StorePreviewProps) {
  const full = ensureFullConfig(config)
  const preset = getStoreTemplate(full.template)
  const headingFont = full.branding.headingFontFamily || preset.headingFont
  const bodyFont =
    full.branding.bodyFontFamily || 'DM Sans, Segoe UI, sans-serif'
  const theme = useMemo(() => {
    const result = createEchoTheme({
      chassis: preset.background,
      paper: preset.ink,
      accent: full.accent,
      radius: preset.radius,
      finish: 0,
      pills: false,
      fontSans: bodyFont,
    })
    return Object.fromEntries(
      Object.entries(result.values.roles).map(([key, value]) => [
        '--echo-' + key,
        value,
      ]),
    )
  }, [preset.background, preset.ink, preset.radius, full.accent, bodyFont])
  const sections = full.components.filter((section) => section.visible)
  const products = activeCategoryFilter
    ? full.products.filter(
        (product) => product.categoryId === activeCategoryFilter,
      )
    : full.products
  const style = {
    ...theme,
    '--shop-action': full.accent,
    '--shop-action-ink': accentInk(full.accent),
    '--shop-heading-font': headingFont,
    '--shop-body-font': bodyFont,
  } as CSSProperties

  function image(src?: string, alt = 'Adicione uma imagem da sua marca') {
    const url = src ? photo(src) : ''
    return url && /^(https?:\/\/|\/(?!\/))/.test(url) ? (
      <img className="shop-image" src={url} alt={alt} loading="lazy" />
    ) : (
      <div className="shop-placeholder">
        <ImageIcon size={24} aria-hidden="true" />
        <span>{alt}</span>
      </div>
    )
  }
  function renderContent(section: StoreComponent) {
    switch (section.type) {
      case 'announcement':
        return <p className="shop-announcement">{section.title}</p>
      case 'hero':
        return (
          <div className={'shop-hero shop-hero-' + section.variant}>
            <div className="shop-hero-copy">
              <h3>{section.title}</h3>
              {(section.subtitle || full.description) && (
                <p>{section.subtitle || full.description}</p>
              )}
              {section.ctaText && (
                <span className="shop-action">{section.ctaText}</span>
              )}
            </div>
            <div className="shop-hero-image">
              {image(
                section.imageUrl,
                section.imageAlt || 'Adicione a foto de destaque',
              )}
            </div>
          </div>
        )
      case 'categories':
        return (
          <div className="shop-categories">
            <h4>{section.title}</h4>
            <div className="shop-chips">
              {full.categories.length ? (
                full.categories.map((category) => (
                  <span key={category.id}>{category.name}</span>
                ))
              ) : (
                <p className="shop-empty">Suas categorias aparecerão aqui.</p>
              )}
            </div>
          </div>
        )
      case 'products':
        return (
          <div className="shop-catalog">
            <h4>{section.title}</h4>
            {section.subtitle && (
              <p className="shop-description">{section.subtitle}</p>
            )}
            {products.length ? (
              <div className="shop-product-grid">
                {products.map((product) => (
                  <article className="shop-product" key={product.id}>
                    <div className="shop-product-image">
                      {image(
                        product.image,
                        product.image ? product.name : 'Imagem do produto',
                      )}
                      {product.badge && (
                        <span className="shop-badge">{product.badge}</span>
                      )}
                    </div>
                    <p className="shop-product-name">{product.name}</p>
                    <p className="shop-price">
                      {product.compareAtPrice &&
                      product.compareAtPrice > product.price ? (
                        <del>{formatBRL(product.compareAtPrice)}</del>
                      ) : null}
                      <span>{formatBRL(product.price)}</span>
                    </p>
                    {preset.id === 'essencial' && (
                      <span className="shop-action shop-product-action">
                        Ver produto
                      </span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="shop-empty">
                Seu catálogo está vazio. Adicione produtos na aba Produtos.
              </div>
            )}
          </div>
        )
      case 'editorial-banner':
        return (
          <div className="shop-story">
            <h4>{section.title}</h4>
            <div>
              <p>{section.subtitle}</p>
              {section.ctaText && <span>{section.ctaText}</span>}
            </div>
          </div>
        )
      case 'benefits':
        return (
          <div className="shop-benefits" aria-label={section.title}>
            {section.subtitle
              .split('\n')
              .filter(Boolean)
              .map((text, index) => (
                <div key={index}>
                  <strong>
                    {['Pagamento', 'Entrega', 'Trocas'][index] || section.title}
                  </strong>
                  <p>{text}</p>
                </div>
              ))}
          </div>
        )
      case 'footer':
        return (
          <footer className="shop-footer">
            <div>
              <strong>{section.title || full.name}</strong>
              {section.subtitle && <p>{section.subtitle}</p>}
              {full.settings.supportEmail && (
                <p>{full.settings.supportEmail}</p>
              )}
              {full.settings.whatsapp && <p>{full.settings.whatsapp}</p>}
            </div>
            <div>
              <strong>Sobre a loja</strong>
              <p>
                {full.description ||
                  'Apresente sua marca e seus canais de atendimento.'}
              </p>
            </div>
            <div>
              <strong>Feito com Syndetis</strong>
              <p>Conteúdo e condições definidos pela loja.</p>
            </div>
          </footer>
        )
      case 'testimonials':
        return (
          <div className="shop-extra">
            <h4>{section.title}</h4>
            <p>{section.subtitle}</p>
            <p className="shop-empty">
              As avaliações poderão ser exibidas quando houver compras
              avaliadas.
            </p>
          </div>
        )
      case 'newsletter':
        return (
          <div className="shop-extra">
            <h4>{section.title}</h4>
            <p>{section.subtitle}</p>
            {section.ctaText && (
              <span className="shop-action">{section.ctaText}</span>
            )}
          </div>
        )
    }
  }
  function renderSection(section: StoreComponent) {
    return (
      <section
        key={section.id}
        className="shop-section"
        data-section-type={section.type}
        data-selected={selectedComponentId === section.id || undefined}
      >
        {onSelectComponent && (
          <div className="shop-section-edit">
            <HardwareButton
              size="sm"
              iconOnly
              icon={<Pencil size={14} />}
              aria-label={'Editar ' + section.title.replace(/\n/g, ' ')}
              onClick={() => onSelectComponent(section.id)}
            />
          </div>
        )}
        {renderContent(section)}
      </section>
    )
  }
  return (
    <div
      className="store-preview shop-template"
      role="region"
      aria-label={"Prévia visual de " + full.name}
      tabIndex={0}
      data-store-template={preset.id}
      data-mobile={mobile || undefined}
      style={style}
    >
      <div className="shop-viewport">
        {sections
          .filter((section) => section.type === 'announcement')
          .map(renderSection)}
        <header className="shop-header">
          {preset.id === 'linha' && (
            <span className="shop-header-links">
              Coleções <span>Novidades</span> <span>Sobre</span>
            </span>
          )}
          {preset.id === 'forma' && (
            <span className="shop-header-links">
              Loja <span>Sobre</span>
            </span>
          )}
          <strong className="shop-brand">
            {full.branding.logoUrl ? (
              <img src={full.branding.logoUrl} alt={full.name} />
            ) : (
              full.name
            )}
          </strong>
          {preset.id === 'essencial' && (
            <span className="shop-search">
              <Search size={16} aria-hidden="true" />
              Buscar produtos
            </span>
          )}
          <span className="shop-bag">
            <ShoppingBag size={18} aria-hidden="true" />
            <span>Sacola (0)</span>
          </span>
        </header>
        {sections
          .filter((section) => section.type !== 'announcement')
          .map(renderSection)}
      </div>
    </div>
  )
}
