import { StoreAction } from '@/components/store-action'
import { Field } from '@/components/echo/field'
import {
  MotionMarquee,
  MotionStorefrontHero,
} from '@/components/motion-storefront'
import { Sheet } from '@/components/echo/sheet'
import {
  PremiumProductDetails,
  PreviewCartContent,
} from '@/components/premium-storefront'
import {
  addPreviewLine,
  setPreviewQuantity,
  previewStockLeft,
  type PreviewCartLine,
} from '@/lib/preview-cart'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
  interactiveDemo?: boolean
  staticPreview?: boolean
  onAddPublicProduct?: (id: string) => void
  onOpenPublicCart?: () => void
  publicCartCount?: number
}

/** Render the Maker JSON; commerce interactions are enabled only in the explicit gallery demo. */
export function StorePreview({
  config = initialConfig,
  mobile = false,
  selectedComponentId,
  onSelectComponent,
  activeCategoryFilter,
  interactiveDemo = false,
  staticPreview = false,
  onAddPublicProduct, onOpenPublicCart, publicCartCount = 0,
}: StorePreviewProps) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<PreviewCartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [detailProductId, setDetailProductId] = useState<string | null>(null)
  const detailRef = useRef<HTMLElement>(null)
  const cartReturnFocus = useRef<HTMLElement>(null)
  const [userMotion, setUserMotion] = useState(false)
  const [motionPaused, setMotionPaused] = useState(
    () =>
      staticPreview ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      if (preference.matches) setMotionPaused(true)
    }
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  const raw = ensureFullConfig(config)
  const base = getStoreTemplate(raw.template)
  const validColor = (value: string | undefined, fallback: string) => value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
  const full = {...raw, accent: validColor(raw.accent,base.accent), branding: {...raw.branding,
    backgroundColor: validColor(raw.branding.backgroundColor,base.background),
    textColor: validColor(raw.branding.textColor,base.ink),
  }}
  const preset = getStoreTemplate(full.template)
  const layout = preset.cinematic?.layout
  const premium = !!preset.collection
  const demo = interactiveDemo && premium
  const cartCount = onAddPublicProduct ? publicCartCount : cart.reduce((count, line) => count + line.quantity, 0)
  const headingFont = full.branding.headingFontFamily || preset.headingFont
  const bodyFont =
    full.branding.bodyFontFamily ||
    preset.bodyFont ||
    'DM Sans, Segoe UI, sans-serif'
  const theme = useMemo(() => {
    const result = createEchoTheme({
      chassis: full.branding.backgroundColor,
      paper: full.branding.textColor,
      accent: full.accent,
      radius: full.branding.radius ?? preset.radius,
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
  }, [full.branding.backgroundColor, full.branding.textColor, full.branding.radius, preset.radius, full.accent, bodyFont])
  const headerTheme = useMemo(() => {
    if (!preset.cinematic) return undefined
    const result = createEchoTheme({
      chassis:
        layout === 'immersive' ||
        (layout === 'cinematic' && accentInk(full.accent) === '#ffffff')
          ? '#10121b'
          : '#ffffff',
      paper:
        layout === 'immersive' ||
        (layout === 'cinematic' && accentInk(full.accent) === '#ffffff')
          ? '#ffffff'
          : '#000000',
      accent: full.accent,
      finish: 0,
      pills: false,
    })
    return Object.fromEntries(
      Object.entries(result.values.roles).map(([key, value]) => [
        '--echo-' + key,
        value,
      ]),
    ) as CSSProperties
  }, [preset.cinematic, full.accent, layout])
  const sections = full.components.filter((section) => section.visible)
  const products = full.products.filter(
    (product) =>
      (!activeCategoryFilter || product.categoryId === activeCategoryFilter) &&
      (!demo ||
        layout !== 'catalog' ||
        product.name
          .toLocaleLowerCase('pt-BR')
          .includes(search.toLocaleLowerCase('pt-BR'))),
  )
  const style = {
    ...theme,
    '--shop-type-scale': full.branding.typeScale ?? 1,
    '--shop-section-gap': (full.branding.spacing ?? 0) + 'px',
    '--shop-secondary': validColor(full.branding.secondaryColor,full.accent),
    '--shop-secondary-ink': accentInk(validColor(full.branding.secondaryColor,full.accent)),
    '--shop-highlight-ink': accentInk(validColor(full.branding.highlightColor,full.accent)),
    ...(full.branding.radius !== undefined ? { '--shop-radius': 'var(--echo-radius-md)' } : {}),
    '--shop-highlight': full.branding.highlightColor || full.accent,
    '--shop-action': full.accent,
    '--shop-hero-start':
      full.accent === preset.accent
        ? preset.heroStart || full.accent
        : full.accent,
    '--shop-hero-end':
      full.accent === preset.accent
        ? preset.heroEnd || full.accent
        : full.accent,
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
        <span>{onAddPublicProduct ? 'Imagem indisponível' : alt}</span>
      </div>
    )
  }
  function renderContent(section: StoreComponent) {
    switch (section.type) {
      case 'announcement':
        if (layout === 'cinematic')
          return (
            <MotionMarquee
              text={section.title}
              paused={motionPaused}
              userMotion={userMotion}
              onToggle={() => {
                setUserMotion(true)
                setMotionPaused((value) => !value)
              }}
            />
          )
        return <p className="shop-announcement">{section.title}</p>
      case 'hero':
        if (preset.cinematic)
          return (
            <MotionStorefrontHero
              section={section}
              preset={preset}
              name={full.name}
              products={full.products}
              paused={motionPaused}
              userMotion={userMotion}
              image={image}
            />
          )
        return (
          <div className={'shop-hero shop-hero-' + section.variant}>
            <div className="shop-hero-copy">
              <h3>{section.title}</h3>
              {(section.subtitle || full.description) && (
                <p>{section.subtitle || full.description}</p>
              )}
              {section.ctaText && (
                <StoreAction section={section} className="shop-action">{section.ctaText}</StoreAction>
              )}
            </div>
            {(!premium || section.imageUrl) && (
              <div className="shop-hero-image">
                {image(
                  section.imageUrl,
                  section.imageAlt || 'Adicione a foto de destaque',
                )}
              </div>
            )}
          </div>
        )
      case 'categories':
        if (onAddPublicProduct && !full.categories.length) return null
        return (
          <div className="shop-categories">
            <h4>{section.title}</h4>
            <div className={premium ? 'shop-category-tiles' : 'shop-chips'}>
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
              <div
                className="shop-product-grid"
                role={layout === 'immersive' ? 'region' : undefined}
                aria-label={
                  layout === 'immersive' ? 'Produtos em destaque' : undefined
                }
                tabIndex={layout === 'immersive' ? 0 : undefined}
              >
                {products.map((product) => (
                  <article className="shop-product" key={product.id}>
                    <div className="shop-product-image">
                      {image(
                        product.image,
                        product.image ? product.name : 'Imagem do produto',
                      )}
                      {premium && (
                        <div className="shop-quick-action">
                          {demo ? (
                            <HardwareButton
                              size="sm"
                              fullWidth
                              disabled={previewStockLeft(cart, product) < 1}
                              onClick={() => {
                                setDetailProductId(product.id)
                                detailRef.current?.scrollIntoView({
                                  block: 'start',
                                  behavior: window.matchMedia(
                                    '(prefers-reduced-motion: reduce)',
                                  ).matches
                                    ? 'auto'
                                    : 'smooth',
                                })
                              }}
                            >
                              {product.options?.length
                                ? 'Escolher opções'
                                : 'Ver detalhes'}
                            </HardwareButton>
                          ) : (
                            <span className="shop-action">Ver detalhes</span>
                          )}
                        </div>
                      )}
                      {product.badge && (
                        <span className="shop-badge">{product.badge}</span>
                      )}
                    </div>
                    {onAddPublicProduct && <HardwareButton fullWidth onClick={() => onAddPublicProduct(product.id)}>Adicionar ao pedido</HardwareButton>}
                    <p className="shop-product-name">{product.name}</p>
                    <p className="shop-price">
                      {product.compareAtPrice &&
                      product.compareAtPrice > product.price ? (
                        <del>{formatBRL(product.compareAtPrice)}</del>
                      ) : null}
                      <span>{formatBRL(product.price)}</span>
                    </p>
                    {(preset.id === 'essencial' ||
                      layout === 'technical' ||
                      layout === 'catalog') && (
                      <span className="shop-action shop-product-action">
                        Ver produto
                      </span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="shop-empty">
                {full.products.length
                  ? 'Nenhum produto encontrado neste filtro.'
                  : onAddPublicProduct ? 'Nenhum produto disponível no momento.' : 'Seu catálogo está vazio. Adicione produtos na aba Produtos.'}
              </div>
            )}
          </div>
        )
      case 'product-detail': {
        const productId =
          demo && detailProductId ? detailProductId : section.productId
        const product = productId
          ? full.products.find((item) => item.id === productId)
          : full.products[0]
        return (
          <PremiumProductDetails
            key={product?.id || section.id}
            product={product}
            section={section}
            publicCommerce={!!onAddPublicProduct}
            demo={demo}
            available={product ? previewStockLeft(cart, product) : 0}
            image={image}
            onAdd={(item, choices) => {
              if(onAddPublicProduct) { onAddPublicProduct(item.id); return }
              setCart((previous) => addPreviewLine(previous, item, choices))
              setCartOpen(true)
            }}
          />
        )
      }
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
        ref={section.type === 'product-detail' ? detailRef : undefined}
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
    <Sheet open={cartOpen} onOpenChange={setCartOpen} side="right">
      <div
        className="store-preview shop-template"
        role="region"
        aria-label={'Prévia visual de ' + full.name}
        tabIndex={0}
        data-store-template={preset.id}
        data-collection={preset.collection}
        data-custom-secondary={!!full.branding.secondaryColor || undefined}
        data-custom-highlight={!!full.branding.highlightColor || undefined}
        data-motion-layout={layout}
        data-mobile={mobile || undefined}
        onClickCapture={event => { if(onSelectComponent && (event.target as HTMLElement).closest('a')) event.preventDefault() }}
        style={style}
      >
        <div className="shop-viewport">
          {sections
            .filter((section) => section.type === 'announcement')
            .map(renderSection)}
          <header className="shop-header" style={headerTheme}>
            {(preset.id === 'linha' || premium) && (
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
            {(preset.id === 'essencial' || layout === 'technical' || layout === 'catalog') && (demo && layout === 'catalog' ? <div className="showcase-search"><Field aria-label="Buscar produtos no modelo" placeholder="Buscar produtos..." value={search} onValueChange={setSearch} size="sm" /></div> : <span className="shop-search"><Search size={16} aria-hidden="true" />Buscar produtos</span>)}
            {demo || onOpenPublicCart ? (
              <div className="shop-bag">
                <HardwareButton
                  size="sm"
                  variant={preset.cinematic ? 'neutral' : 'ghost'}
                  icon={<ShoppingBag size={18} />}
                  onClick={(event) => {
                    if(onOpenPublicCart) { onOpenPublicCart(); return }
                    cartReturnFocus.current = event.currentTarget
                    setCartOpen(true)
                  }}
                >
                  {'Sacola (' + cartCount + ')'}
                </HardwareButton>
              </div>
            ) : (
              <span className="shop-bag">
                <ShoppingBag size={18} aria-hidden="true" />
                <span>Sacola (0)</span>
              </span>
            )}
          </header>
          {sections
            .filter((section) => section.type !== 'announcement')
            .map(renderSection)}
        </div>
      </div>
      {demo && (
        <PreviewCartContent
          returnFocus={cartReturnFocus}
          lines={cart}
          threshold={full.settings.freeShippingThreshold}
          onQuantity={(key, quantity) =>
            setCart((previous) => setPreviewQuantity(previous, key, quantity))
          }
        />
      )}
    </Sheet>
  )
}
