import { StoreEditing, StoreEditorText } from '@/components/store-editor-text'
import { StoreAction } from '@/components/store-action'
import { Field } from '@/components/echo/field'
import {
  MotionMarquee,
  MotionStorefrontHero,
} from '@/components/motion-storefront'
import { PremiumProductDetails } from '@/components/premium-storefront'
import { StoreCart, type StoreCartLine } from '@/components/store-cart'
import {
  addPreviewLine,
  setPreviewQuantity,
  previewStockLeft,
  previewSubtotal,
  type PreviewCartLine,
} from '@/lib/preview-cart'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Image as ImageIcon, Pencil, ShoppingBag } from 'lucide-react'
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
  type StoreProduct,
} from '@/lib/maker'
import './store-templates.css'
import './store-commerce.css'

type ShopView = 'store' | 'product' | 'cart' | 'checkout'
const shopViews = [['store', 'Vitrine'], ['product', 'Produto'], ['cart', 'Sacola'], ['checkout', 'Finalização']] as const

interface StorePreviewProps {
  config?: LayoutConfig
  mobile?: boolean
  selectedComponentId?: string | null
  onSelectComponent?: (id: string, inline?: boolean) => void
  onChangeComponent?: (id: string, patch: Partial<StoreComponent>) => void
  renderSectionTools?: (section: StoreComponent) => React.ReactNode
  renderInsert?: (beforeId?: string) => React.ReactNode
  onDropSection?: (sourceId: string, targetId: string) => void
  activeCategoryFilter?: string | null
  interactiveDemo?: boolean
  staticPreview?: boolean
  onAddPublicProduct?: (id: string) => void
  publicCart?: {
    lines: StoreCartLine[]
    remaining: (productId: string) => number
    onQuantity: (key: string, quantity: number) => void
    checkout: ReactNode
  }
  resumeCheckout?: boolean
  orderReview?: ReactNode
  onExitOrder?: () => void
  onCheckoutViewChange?: (active: boolean) => void
  catalogControls?: ReactNode
  catalogPending?: boolean
  onSelectPublicCategory?: (id: string) => void
  publicCategory?: string
  catalogFooter?: ReactNode
  previewNavigation?: boolean
  /** Extra header action of a published store, next to the bag (e.g. "Meus pedidos"). */
  headerAction?: ReactNode
}

/** Render the Maker JSON; sample commerce runs only in the merchant's own Maker preview, real commerce only on published stores. */
export function StorePreview({
  config = initialConfig,
  mobile = false,
  selectedComponentId,
  onSelectComponent, onChangeComponent, renderSectionTools, renderInsert, onDropSection,
  activeCategoryFilter,
  interactiveDemo = false,
  staticPreview = false,
  onAddPublicProduct, publicCart, resumeCheckout = false, orderReview, onExitOrder, onCheckoutViewChange, catalogControls, catalogPending, onSelectPublicCategory, publicCategory, catalogFooter, previewNavigation = false, headerAction,
}: StorePreviewProps) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<PreviewCartLine[]>([])
  const [shoppingView, setView] = useState<ShopView>(resumeCheckout ? 'checkout' : 'store')
  const view = orderReview ? 'order' : shoppingView
  const [detailProductId, setDetailProductId] = useState<string | null>(null)
  const storefrontRef = useRef<HTMLDivElement>(null)
  const commerceRef = useRef<HTMLElement>(null)
  const reviewingOrder = view === 'order'
  useEffect(() => {
    if (reviewingOrder) commerceRef.current?.focus()
  }, [reviewingOrder])
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
  const demo = interactiveDemo
  const showNavigation = previewNavigation || !!onChangeComponent
  const isPublished = !!onAddPublicProduct
  const commerceEnabled = demo || !!publicCart || showNavigation
  const cartLines = publicCart?.lines ?? cart.map(line => ({
    key: line.key,
    name: line.product.name,
    price: line.product.price,
    image: line.product.image,
    quantity: line.quantity,
    maximum: previewStockLeft(cart, line.product, line.key),
    choices: Object.entries(line.choices).map(([label, value]) => label + ': ' + value).join(', '),
  }))
  const cartCount = cartLines.reduce((count, line) => count + line.quantity, 0)

  function goTo(next: ShopView) {
    setView(next)
    if (view === 'order') onExitOrder?.()
    if ((view === 'checkout') !== (next === 'checkout')) onCheckoutViewChange?.(next === 'checkout')
    requestAnimationFrame(() => {
      const target = next === 'store' ? storefrontRef.current : commerceRef.current
      if (storefrontRef.current) storefrontRef.current.scrollTop = 0
      target?.focus({ preventScroll: true })
      target?.scrollIntoView({ block: 'nearest' })
    })
  }

  function viewProduct(id: string) {
    setDetailProductId(id)
    goTo('product')
  }

  function addProduct(product: StoreProduct, choices: Record<string, string> = {}) {
    if (onAddPublicProduct) {
      onAddPublicProduct(product.id)
      return
    }
    setCart(previous => addPreviewLine(previous, product, choices))
    goTo('cart')
  }
  function availableFor(product?: StoreProduct) {
    if (!product) return 0
    return publicCart ? publicCart.remaining(product.id) : previewStockLeft(cart, product)
  }

  function jumpToSection(type: StoreComponent['type']) {
    const target = storefrontRef.current?.querySelector<HTMLElement>('[data-section-type="' + type + '"]')
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start' })
  }

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
  const sections = full.components.filter(section => section.visible && (!isPublished || (section.type !== 'testimonials' && section.type !== 'newsletter' && (section.type !== 'categories' || full.categories.length > 0))))
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
        return <p className="shop-announcement"><StoreEditorText section={section} field="title" /></p>
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
              <h3><StoreEditorText section={section} field="title" /></h3>
              {(section.subtitle || full.description) && (
                <p><StoreEditorText section={section} field="subtitle" fallback={full.description} /></p>
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
            <h4><StoreEditorText section={section} field="title" /></h4>
            <div className={premium ? 'shop-category-tiles' : 'shop-chips'}>
              {full.categories.length ? (
                full.categories.map((category) => (
                  onSelectPublicCategory
                    ? <HardwareButton key={category.id} size="sm" held={publicCategory === category.id}
                        aria-pressed={publicCategory === category.id} onClick={() => {
                          onSelectPublicCategory(publicCategory === category.id ? '' : category.id)
                          jumpToSection('products')
                        }}>{category.name}</HardwareButton>
                    : <span key={category.id}>{category.name}</span>
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
            <h4><StoreEditorText section={section} field="title" /></h4>
            {section.subtitle && (
              <p className="shop-description"><StoreEditorText section={section} field="subtitle" /></p>
            )}
            {catalogControls}
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
                    {commerceEnabled && (
                      <div className="shop-product-actions">
                        <HardwareButton size="sm" onClick={() => viewProduct(product.id)}>{'Ver produto: ' + product.name}</HardwareButton>
                        {!product.options?.length && <HardwareButton size="sm" variant="ghost"
                          disabled={availableFor(product) < 1}
                          onClick={() => addProduct(product)}>{product.stock === 0 ? 'Produto indisponível' : 'Adicionar ao pedido'}</HardwareButton>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : !catalogPending && (
              <div className="shop-empty">
                {publicCategory || full.products.length
                  ? 'Nenhum produto encontrado neste filtro.'
                  : onAddPublicProduct ? 'Nenhum produto encontrado.' : 'Seu catálogo está vazio. Adicione produtos na aba Produtos.'}
              </div>
            )}
            {catalogFooter}
          </div>
        )
      case 'product-detail': {
        const productId = section.productId
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
            available={availableFor(product)}
            image={image}
            onAdd={addProduct}
          />
        )
      }
      case 'editorial-banner':
        return (
          <div className="shop-story">
            <h4><StoreEditorText section={section} field="title" /></h4>
            <div>
              <p><StoreEditorText section={section} field="subtitle" /></p>
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
              {section.subtitle && <p><StoreEditorText section={section} field="subtitle" /></p>}
              {full.settings.supportEmail && (
                <p>{full.settings.supportEmail}</p>
              )}
              {full.settings.whatsapp && <p>{full.settings.whatsapp}</p>}
            </div>
            {(full.description || !isPublished) && <div>
              <strong>Sobre a loja</strong>
              <p>{full.description || 'Apresente sua marca e seus canais de atendimento.'}</p>
            </div>}
            <div>
              <strong>Feito com Syndetis</strong>
              <p>Conteúdo e condições definidos pela loja.</p>
            </div>
          </footer>
        )
      case 'testimonials':
        return (
          <div className="shop-extra">
            <h4><StoreEditorText section={section} field="title" /></h4>
            <p><StoreEditorText section={section} field="subtitle" /></p>
            <p className="shop-empty">
              As avaliações poderão ser exibidas quando houver compras
              avaliadas.
            </p>
          </div>
        )
      case 'newsletter':
        return (
          <div className="shop-extra">
            <h4><StoreEditorText section={section} field="title" /></h4>
            <p><StoreEditorText section={section} field="subtitle" /></p>
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
        data-section-id={section.id}
        tabIndex={isPublished || demo ? -1 : undefined}
        onDragOver={onDropSection ? event => { event.preventDefault(); event.currentTarget.dataset.dropTarget = 'true' } : undefined}
        onDragLeave={onDropSection ? event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) delete event.currentTarget.dataset.dropTarget } : undefined}
        onDrop={onDropSection ? event => { event.preventDefault(); delete event.currentTarget.dataset.dropTarget; const id = event.dataTransfer.getData('application/x-syndetis-section'); if (id) onDropSection(id, section.id) } : undefined}
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
        {renderSectionTools?.(section)}
        {renderContent(section)}
      </section>
    )
  }
  const editing = onSelectComponent && onChangeComponent ? { select: (id: string) => onSelectComponent(id, true), change: onChangeComponent } : null
  const withInsert = (section: StoreComponent) => <div className="shop-editor-section-wrap" key={section.id}>{renderInsert?.(section.id)}{renderSection(section)}</div>
  const productSection = sections.find(section => section.type === 'product-detail')
  const detailProduct = full.products.find(item => item.id === detailProductId) ??
    full.products.find(item => item.id === productSection?.productId) ?? full.products[0]
  const detailContent = productSection ?? { id: 'product-page', type: 'product-detail' as const, title: 'Sobre o produto', subtitle: '', visible: true, variant: 'editorial' as const }
  const screenLabel = view === 'product' ? 'Detalhes do produto' : view === 'cart' ? 'Sua sacola' : view === 'order' ? 'Seu pedido' : 'Finalizar compra'
  return (
    <StoreEditing.Provider value={editing}>
      <div
        ref={storefrontRef}
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
          {showNavigation && <nav className="shop-commerce-nav" aria-label="Telas da prévia">
            {shopViews.map(([value, label]) => <HardwareButton key={value} size="sm"
              held={view === value} aria-current={view === value ? 'page' : undefined}
              onClick={() => goTo(value)}>{label}</HardwareButton>)}
          </nav>}
          {sections
            .filter((section) => section.type === 'announcement')
            .map(onChangeComponent ? withInsert : renderSection)}
          <header className="shop-header" style={headerTheme}>
            {view === 'store' && (isPublished || demo) && <nav className="shop-header-links" aria-label="Navegação da loja">
              {([['categories', 'Categorias'], ['products', 'Produtos'], ['footer', 'Sobre a loja']] as const)
                .filter(([type]) => sections.some(section => section.type === type))
                .map(([type, label]) => <HardwareButton key={type} size="sm" variant="ghost"
                  onClick={() => jumpToSection(type)}>{label}</HardwareButton>)}
            </nav>}
            <strong className="shop-brand">
              {full.branding.logoUrl ? (
                <img src={full.branding.logoUrl} alt={full.name} />
              ) : (
                full.name
              )}
            </strong>
            {view === 'store' && demo && layout === 'catalog' && <div className="showcase-search">
              <Field aria-label="Buscar produtos no modelo" placeholder="Buscar produtos..." value={search} onValueChange={setSearch} size="sm" />
            </div>}
            {commerceEnabled ? (
              <div className="shop-bag">
                {headerAction}
                <HardwareButton
                  size="sm"
                  variant={preset.cinematic ? 'neutral' : 'ghost'}
                  icon={<ShoppingBag size={18} />}
                  onClick={() => goTo('cart')}
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
          {view === 'store' ? <>
            {sections.filter(section => section.type !== 'announcement').map(onChangeComponent ? withInsert : renderSection)}
            {renderInsert?.()}
          </> : <><section className="shop-commerce-page" ref={commerceRef} tabIndex={-1} aria-label={screenLabel}>
            <div><HardwareButton variant="ghost" onClick={() => goTo(view === 'checkout' ? 'cart' : 'store')}>
              {view === 'checkout' ? 'Voltar à sacola' : 'Voltar à vitrine'}
            </HardwareButton></div>
            {(view !== 'product' || !detailProduct) && <h2>{screenLabel}</h2>}
            {!publicCart && <p>Prévia da jornada de compra</p>}
            {view === 'order' && orderReview}
            {view === 'product' && <PremiumProductDetails key={detailProduct?.id || 'empty'} product={detailProduct}
              section={detailContent} page demo={!publicCart} publicCommerce={!!publicCart}
              available={availableFor(detailProduct)}
              image={image} onAdd={addProduct} />}
            {view === 'cart' && <StoreCart lines={cartLines} image={image} threshold={publicCart ? undefined : full.settings.freeShippingThreshold}
              onQuantity={publicCart?.onQuantity ?? ((key, quantity) => setCart(previous => setPreviewQuantity(previous, key, quantity)))}
              onBrowse={() => goTo('store')} onCheckout={() => goTo('checkout')} />}
            {view === 'checkout' && (cartLines.length ? publicCart?.checkout ?? (
              <div className="shop-commerce-columns">
                <section className="shop-commerce-panel" aria-label="Entrega de exemplo">
                  <h3>Entrega</h3><p>Endereço de exemplo</p><strong>Rua da Vitrine, 120 · São Paulo/SP</strong>
                  <h3>Pagamento</h3><p>O pagamento é realizado no ambiente seguro do Mercado Pago.</p>
                </section>
                <aside className="shop-commerce-panel" aria-label="Resumo do pedido de exemplo">
                  <h3>Seu pedido</h3>
                  <ul className="line-list">{cartLines.map(line => <li key={line.key}>
                    <span>{line.quantity} × {line.name}</span><strong>{formatBRL(line.price * line.quantity)}</strong>
                  </li>)}</ul>
                  <p className="shop-commerce-total"><span>Subtotal</span><strong>{formatBRL(previewSubtotal(cart))}</strong></p>
                  <HardwareButton disabled fullWidth>Revisar pedido e pagar</HardwareButton>
                  <p>Esta prévia não cria pedidos nem cobranças.</p>
                </aside>
              </div>
            ) : <div className="shop-empty"><p>Adicione um produto para ver o resumo do pedido.</p>
              <HardwareButton onClick={() => goTo('store')}>Ver produtos</HardwareButton></div>)}
          </section>
          {sections.filter(section => section.type === 'footer').map(renderSection)}
          </>}
        </div>
      </div>
    </StoreEditing.Provider>
  )
}
