import type { CSSProperties } from 'react'
import { ArrowUpRight, Check, Command, Menu, ShieldCheck, ShoppingBag, Sparkles, Star, Truck } from 'lucide-react'
import {
  accentInk,
  ensureFullConfig,
  formatBRL,
  initialConfig,
  photo,
  templates,
  type LayoutConfig,
  type StoreComponent,
} from '@/lib/maker'

interface StorePreviewProps {
  config?: LayoutConfig
  mobile?: boolean
  selectedComponentId?: string | null
  onSelectComponent?: (id: string) => void
  activeCategoryFilter?: string | null
}

export function StorePreview({
  config = initialConfig,
  mobile = false,
  selectedComponentId,
  onSelectComponent,
  activeCategoryFilter,
}: StorePreviewProps) {
  const full = ensureFullConfig(config)
  const template = templates.find(t => t.id === full.template) || templates[0]
  const heroSrc = photo(template.image, 800)
  const visibleComponents = full.components.filter(c => c.visible)
  const visibleProducts = activeCategoryFilter
    ? full.products.filter(p => p.categoryId === activeCategoryFilter)
    : full.products

  function renderSection(comp: StoreComponent) {
    const isSelected = selectedComponentId === comp.id
    const interactiveProps = onSelectComponent
      ? {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation()
            onSelectComponent(comp.id)
          },
          'data-selected': isSelected ? 'true' : undefined,
          'data-selectable': 'true',
          title: `Clique para editar: ${comp.title.replace(/\n/g, ' ')}`,
        }
      : {}

    switch (comp.type) {
      case 'announcement':
        return (
          <div key={comp.id} className="store-topline store-section-item" {...interactiveProps}>
            {comp.title}
          </div>
        )

      case 'hero':
        return (
          <div key={comp.id} className={`store-hero store-hero-${comp.variant} store-section-item`} {...interactiveProps}>
            <div className="store-hero-copy">
              <small>{comp.badge || `Coleção Oficial · ${full.name}`}</small>
              <h3>{comp.title}</h3>
              <p>{comp.subtitle || full.description}</p>
              {comp.ctaText && (
                <span className="store-cta">
                  {comp.ctaText} <ArrowUpRight size={10} />
                </span>
              )}
            </div>
            <img src={heroSrc} alt={`Vitrine ${full.name}`} loading="lazy" />
          </div>
        )

      case 'categories':
        return (
          <div key={comp.id} className="store-categories-block store-section-item" {...interactiveProps}>
            <div className="store-collection">
              <span>{comp.title}</span>
              <span>
                {comp.ctaText || 'Explorar'} <ArrowUpRight size={9} />
              </span>
            </div>
            <div className="store-category-pills">
              {full.categories.map(cat => (
                <span key={cat.id} className={`store-cat-pill ${cat.featured ? 'is-featured' : ''}`}>
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        )

      case 'products':
        return (
          <div key={comp.id} className="store-products-block store-section-item" {...interactiveProps}>
            <div className="store-collection">
              <span>{comp.title}</span>
              <span>
                {comp.ctaText || 'Ver todos'} ({visibleProducts.length}) <ArrowUpRight size={9} />
              </span>
            </div>
            <div className={`store-products store-products-${comp.variant}`}>
              {(mobile ? visibleProducts.slice(0, 2) : visibleProducts.slice(0, 4)).map(prod => {
                const catName = full.categories.find(c => c.id === prod.categoryId)?.name || 'Coleção'
                return (
                  <div key={prod.id} className="store-product-card">
                    <div className="store-product-img-wrap">
                      <img src={photo(prod.image, 600)} alt={prod.name} loading="lazy" />
                      {prod.badge && <em className="store-product-badge">{prod.badge}</em>}
                    </div>
                    <small className="store-product-cat">{catName}</small>
                    <strong className="store-product-name">{prod.name}</strong>
                    <div className="store-product-price-row">
                      <span>{formatBRL(prod.price)}</span>
                      {prod.compareAtPrice && <del>{formatBRL(prod.compareAtPrice)}</del>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'editorial-banner':
        return (
          <div key={comp.id} className="store-editorial-block store-section-item" {...interactiveProps}>
            <div>
              <small>Manifesto · {full.name}</small>
              <h4>{comp.title}</h4>
              <p>{comp.subtitle}</p>
            </div>
            {comp.ctaText && (
              <span className="store-cta">
                {comp.ctaText} <ArrowUpRight size={9} />
              </span>
            )}
          </div>
        )

      case 'benefits':
        return (
          <div key={comp.id} className="store-benefits-block store-section-item" {...interactiveProps}>
            <div>
              <Truck size={11} />
              <span>Frete grátis acima de R$ {full.settings.freeShippingThreshold}</span>
            </div>
            <div>
              <Sparkles size={11} />
              <span>{full.settings.pixDiscountPercent}% OFF no Pix imediato</span>
            </div>
            <div>
              <ShieldCheck size={11} />
              <span>Até {full.settings.maxInstallments}x sem juros</span>
            </div>
          </div>
        )

      case 'testimonials':
        return (
          <div key={comp.id} className="store-testimonials-block store-section-item" {...interactiveProps}>
            <div className="store-collection">
              <span>{comp.title}</span>
              <span>
                <Star size={9} /> 4,9/5
              </span>
            </div>
            <div className="store-testimonial-grid">
              <div>
                <p>“Acabamento impecável e entrega super rápida. Virou minha loja favorita.”</p>
                <small>— Marina V. · Compra verificada</small>
              </div>
              {!mobile && (
                <div>
                  <p>“Embalagem autoral linda e atendimento humano pelo chat.”</p>
                  <small>— Lucas A. · Compra verificada</small>
                </div>
              )}
            </div>
          </div>
        )

      case 'newsletter':
        return (
          <div key={comp.id} className="store-newsletter-block store-section-item" {...interactiveProps}>
            <div>
              <strong>{comp.title}</strong>
              <p>{comp.subtitle}</p>
            </div>
            <span className="store-cta">
              <Check size={9} /> {comp.ctaText || 'Inscrever'}
            </span>
          </div>
        )

      case 'footer':
        return (
          <div key={comp.id} className="store-footer-block store-section-item" {...interactiveProps}>
            <span>
              <strong>{full.name}.</strong> {comp.title}
            </span>
            <span>{comp.subtitle}</span>
          </div>
        )
    }
  }

  // Keep announcement at very top if present, then navbar, then remaining components
  const topAnnouncements = visibleComponents.filter(c => c.type === 'announcement')
  const bodyComponents = visibleComponents.filter(c => c.type !== 'announcement')

  return (
    <div
      className={`store-preview ${mobile ? 'store-mobile' : ''} store-${full.template}`}
      style={{ '--store-accent': full.accent, '--store-accent-ink': accentInk(full.accent) } as CSSProperties}
    >
      {topAnnouncements.map(renderSection)}
      <div className="store-nav">
        <strong>
          <Command size={11} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
          {full.name || 'syndetis'}
          <span>.</span>
        </strong>
        <span className="store-links">
          {full.categories
            .slice(0, 3)
            .map(c => c.name)
            .join(' · ') || 'Catálogo'}
        </span>
        <ShoppingBag size={12} aria-hidden="true" />
        {mobile && <Menu size={13} aria-hidden="true" />}
      </div>
      <div className="store-body-scroll">{bodyComponents.map(renderSection)}</div>
    </div>
  )
}
