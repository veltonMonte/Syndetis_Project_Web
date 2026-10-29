import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Layers3,
  MapPin,
  Monitor,
  MoreHorizontal,
  PackagePlus,
  Palette,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  Settings2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Textarea } from '@/components/echo/textarea'
import { Panel } from '@/components/echo/panel'
import { Card } from '@/components/echo/card'
import { Grid, Stack } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { MacbookPro } from '@/components/ui/macbook-pro'
import { Iphone } from '@/components/ui/iphone'
import { StorePreview } from '@/components/store-preview'
import {
  COMPONENT_LIBRARY,
  ensureFullConfig,
  formatBRL,
  formatCep,
  formatCpfCnpj,
  formatDateBR,
  photo,
  PRODUCT_IMAGE_PRESETS,
  slugify,
  templates,
  type ComponentVariant,
  type LayoutConfig,
  type StoreCategory,
  type StoreComponent,
  type StoreComponentType,
  type StoreProduct,
} from '@/lib/maker'
import { errorMessage, syncStoreLayout } from '@/lib/api'

export type MakerTab = 'componentes' | 'categorias' | 'produtos' | 'identidade' | 'configuracoes'

const BRAND_SWATCHES = [
  { name: 'Azul Confiança (Padrão)', hex: '#2563eb' },
  { name: 'Azul Oceano', hex: '#0284c7' },
  { name: 'Verde Operacional', hex: '#059669' },
  { name: 'Índigo Corporativo', hex: '#4f46e5' },
  { name: ' Grafite Sóbrio', hex: '#334155' },
  { name: 'Âmbar Comercial', hex: '#d97706' },
]

const CEP_FALLBACKS: Record<string, string> = {
  '04538132': 'Av. Brigadeiro Faria Lima, Itaim Bibi — São Paulo/SP',
  '01310100': 'Av. Paulista, Bela Vista — São Paulo/SP',
  '22041001': 'Av. Atlântica, Copacabana — Rio de Janeiro/RJ',
  '30112010': 'Av. Getúlio Vargas, Savassi — Belo Horizonte/MG',
  '80420090': 'Av. do Batel, Batel — Curitiba/PR',
}

interface PendingDelete {
  kind: 'component' | 'category' | 'product' | 'bulk-products'
  id: string
  name: string
  ids?: string[]
}

interface UndoAction {
  label: string
  restore: () => void
}

export function MakerStudio({
  config,
  setConfig,
  activeTab: controlledTab,
  onTabChange,
}: {
  config: LayoutConfig
  setConfig: (config: LayoutConfig) => void
  activeTab?: MakerTab
  onTabChange?: (tab: MakerTab) => void
}) {
  const full = ensureFullConfig(config)
  const toast = useToast()

  const [internalTab, setInternalTab] = useState<MakerTab>('componentes')
  const activeTab = controlledTab ?? internalTab
  function setActiveTab(next: MakerTab) {
    setInternalTab(next)
    onTabChange?.(next)
  }

  const [mobile, setMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Destructive confirmation modal & Undo state
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [lastUndo, setLastUndo] = useState<UndoAction | null>(null)

  // Component builder state
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    full.components[1]?.id || full.components[0]?.id || null,
  )
  const [showComponentCatalog, setShowComponentCatalog] = useState(false)
  const [draggedCompId, setDraggedCompId] = useState<string | null>(null)

  // Category form state
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [catError, setCatError] = useState('')
  const [previewCatFilter, setPreviewCatFilter] = useState<string | null>(null)

  // Product form & table state
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('490')
  const [newProdCompare, setNewProdCompare] = useState('590')
  const [newProdStock, setNewProdStock] = useState('15')
  const [newProdSku, setNewProdSku] = useState('')
  const [newProdBadge] = useState('Pronta entrega')
  const [newProdCatId, setNewProdCatId] = useState(full.categories[0]?.id || 'cat-essenciais')
  const [newProdImage, setNewProdImage] = useState(PRODUCT_IMAGE_PRESETS[0].id)
  const [prodErrors, setProdErrors] = useState<{ name?: string; price?: string }>({})

  // Product Table filter, sort, bulk selection, row menu
  const [prodSearch, setProdSearch] = useState('')
  const [prodCatFilter, setProdCatFilter] = useState<string>('ALL')
  const [prodSortBy, setProdSortBy] = useState<'name' | 'price' | 'stock'>('name')
  const [prodSortAsc, setProdSortAsc] = useState(true)
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([])
  const [openProdMenuId, setOpenProdMenuId] = useState<string | null>(null)

  // CEP lookup & fiscal validation state
  const [cepLoading, setCepLoading] = useState(false)
  const [fiscalErrors, setFiscalErrors] = useState<{ cnpj?: string; cep?: string }>({})

  // AI prompt assistant state
  const [aiPrompt, setAiPrompt] = useState('')

  // Close modal or row menu on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pendingDelete) setPendingDelete(null)
        if (openProdMenuId) setOpenProdMenuId(null)
        if (showComponentCatalog) setShowComponentCatalog(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingDelete, openProdMenuId, showComponentCatalog])

  const selectedComponent = full.components.find(c => c.id === selectedCompId) || full.components[0] || null

  function updateConfig(patch: Partial<LayoutConfig>) {
    const next = ensureFullConfig({ ...full, ...patch, business: 'loja' })
    setConfig(next)
  }

  // --- Component Actions ---
  function addComponent(type: StoreComponentType) {
    const meta = COMPONENT_LIBRARY.find(item => item.type === type) || COMPONENT_LIBRARY[0]
    const created: StoreComponent = {
      id: `comp-${type}-${Date.now().toString(36)}`,
      type,
      title: meta.defaultTitle,
      subtitle: meta.defaultSubtitle,
      ctaText: meta.defaultCta,
      variant: meta.defaultVariant,
      visible: true,
    }
    const nextComponents = [...full.components, created]
    updateConfig({ components: nextComponents })
    setSelectedCompId(created.id)
    setShowComponentCatalog(false)
    toast({
      title: 'Seção adicionada à vitrine',
      body: `"${meta.label}" foi incluída no final da página.`,
    })
  }

  function requestRemoveComponent(id: string) {
    if (full.components.length <= 1) {
      toast({
        title: 'Ação bloqueada',
        body: 'A vitrine precisa manter pelo menos uma seção ativa.',
      })
      return
    }
    const target = full.components.find(c => c.id === id)
    if (!target) return
    setPendingDelete({
      kind: 'component',
      id,
      name: target.title.replace(/\n/g, ' '),
    })
  }

  function duplicateComponent(id: string) {
    const index = full.components.findIndex(c => c.id === id)
    if (index === -1) return
    const original = full.components[index]
    const copy: StoreComponent = {
      ...original,
      id: `comp-${original.type}-${Date.now().toString(36)}`,
      title: `${original.title} (Cópia)`,
    }
    const next = [...full.components]
    next.splice(index + 1, 0, copy)
    updateConfig({ components: next })
    setSelectedCompId(copy.id)
    toast({ title: 'Seção duplicada', body: 'A cópia foi posicionada abaixo da seção original.' })
  }

  function moveComponent(id: string, direction: -1 | 1) {
    const index = full.components.findIndex(c => c.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= full.components.length) return
    const next = [...full.components]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    updateConfig({ components: next })
  }

  function handleDropComponent(targetId: string) {
    if (!draggedCompId || draggedCompId === targetId) return
    const fromIdx = full.components.findIndex(c => c.id === draggedCompId)
    const toIdx = full.components.findIndex(c => c.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...full.components]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    updateConfig({ components: next })
    setDraggedCompId(null)
  }

  function updateSelectedComponent(patch: Partial<StoreComponent>) {
    if (!selectedComponent) return
    const next = full.components.map(c => (c.id === selectedComponent.id ? { ...c, ...patch } : c))
    updateConfig({ components: next })
  }

  // --- Category Actions ---
  function handleAddCategory() {
    if (newCatName.trim().length < 2) {
      setCatError('Informe um nome para a categoria (mínimo 2 caracteres).')
      return
    }
    const created: StoreCategory = {
      id: `cat-${Date.now().toString(36)}`,
      name: newCatName.trim(),
      slug: slugify(newCatName),
      description: newCatDesc.trim() || 'Linha de produtos do catálogo.',
      featured: true,
    }
    updateConfig({ categories: [...full.categories, created] })
    setNewCatName('')
    setNewCatDesc('')
    setCatError('')
    toast({ title: 'Categoria adicionada', body: `"${created.name}" já está disponível no catálogo.` })
  }

  function moveCategory(id: string, direction: -1 | 1) {
    const idx = full.categories.findIndex(c => c.id === id)
    const nextIdx = idx + direction
    if (idx < 0 || nextIdx < 0 || nextIdx >= full.categories.length) return
    const next = [...full.categories]
    const [moved] = next.splice(idx, 1)
    next.splice(nextIdx, 0, moved)
    updateConfig({ categories: next })
  }

  // --- Product Actions ---
  function validateProdName(val: string) {
    return val.trim().length < 2 ? 'Informe o nome comercial do produto (mínimo 2 caracteres).' : undefined
  }

  function validateProdPrice(val: string) {
    const parsed = Number(val.replace(',', '.'))
    return !Number.isFinite(parsed) || parsed <= 0 ? 'Informe um valor unitário maior que R$ 0,00.' : undefined
  }

  function handleAddProduct() {
    const nameErr = validateProdName(newProdName)
    const priceErr = validateProdPrice(newProdPrice)
    if (nameErr || priceErr) {
      setProdErrors({ name: nameErr, price: priceErr })
      return
    }
    const parsedPrice = Number(newProdPrice.replace(',', '.'))
    const parsedCompare = Number(newProdCompare.replace(',', '.'))
    const created: StoreProduct = {
      id: `prod-${Date.now().toString(36)}`,
      name: newProdName.trim(),
      slug: slugify(newProdName),
      categoryId: newProdCatId || full.categories[0]?.id || 'cat-essenciais',
      price: parsedPrice,
      compareAtPrice: Number.isFinite(parsedCompare) && parsedCompare > parsedPrice ? parsedCompare : undefined,
      stock: Math.max(0, parseInt(newProdStock, 10) || 10),
      sku: newProdSku.trim() || `SYN-${Math.floor(100 + Math.random() * 900)}`,
      image: newProdImage,
      badge: newProdBadge.trim() || undefined,
      featured: true,
    }
    updateConfig({ products: [created, ...full.products] })
    setNewProdName('')
    setNewProdSku('')
    setProdErrors({})
    setShowNewProductForm(false)
    toast({ title: 'Produto cadastrado', body: `"${created.name}" (${formatBRL(created.price)}) foi incluído no catálogo.` })
  }

  function duplicateProduct(prod: StoreProduct) {
    const copy: StoreProduct = {
      ...prod,
      id: `prod-${Date.now().toString(36)}`,
      name: `${prod.name} (Cópia)`,
      sku: `${prod.sku}-B`,
    }
    updateConfig({ products: [copy, ...full.products] })
    setOpenProdMenuId(null)
    toast({ title: 'Produto duplicado', body: `"${copy.name}" foi criado no catálogo.` })
  }

  function toggleProductFeatured(id: string) {
    const next = full.products.map(p => (p.id === id ? { ...p, featured: !p.featured } : p))
    updateConfig({ products: next })
    setOpenProdMenuId(null)
  }

  // --- Execute Confirmed Destructive Delete + Setup Undo ---
  function confirmPendingDelete() {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'component') {
      const snapshot = [...full.components]
      const nextComponents = full.components.filter(c => c.id !== pendingDelete.id)
      updateConfig({ components: nextComponents })
      if (selectedCompId === pendingDelete.id) {
        setSelectedCompId(nextComponents[0]?.id || null)
      }
      setLastUndo({
        label: `Seção "${pendingDelete.name}" excluída`,
        restore: () => updateConfig({ components: snapshot }),
      })
      toast({
        title: 'Seção excluída',
        body: `"${pendingDelete.name}" foi removida. Você pode desfazer a ação na barra de aviso.`,
      })
    } else if (pendingDelete.kind === 'category') {
      const snapshot = [...full.categories]
      updateConfig({ categories: full.categories.filter(c => c.id !== pendingDelete.id) })
      if (previewCatFilter === pendingDelete.id) setPreviewCatFilter(null)
      setLastUndo({
        label: `Categoria "${pendingDelete.name}" excluída`,
        restore: () => updateConfig({ categories: snapshot }),
      })
      toast({
        title: 'Categoria excluída',
        body: `"${pendingDelete.name}" foi removida.`,
      })
    } else if (pendingDelete.kind === 'product') {
      const snapshot = [...full.products]
      updateConfig({ products: full.products.filter(p => p.id !== pendingDelete.id) })
      setSelectedProdIds(prev => prev.filter(id => id !== pendingDelete.id))
      setLastUndo({
        label: `Produto "${pendingDelete.name}" excluído`,
        restore: () => updateConfig({ products: snapshot }),
      })
      toast({
        title: 'Produto excluído',
        body: `"${pendingDelete.name}" foi removido do catálogo.`,
      })
    } else if (pendingDelete.kind === 'bulk-products' && pendingDelete.ids) {
      const snapshot = [...full.products]
      const removeSet = new Set(pendingDelete.ids)
      updateConfig({ products: full.products.filter(p => !removeSet.has(p.id)) })
      setSelectedProdIds([])
      setLastUndo({
        label: `${pendingDelete.ids.length} produtos excluídos`,
        restore: () => updateConfig({ products: snapshot }),
      })
      toast({
        title: 'Exclusão em lote concluída',
        body: `${pendingDelete.ids.length} produtos foram removidos do catálogo.`,
      })
    }
    setPendingDelete(null)
  }

  // --- CEP Auto-Lookup (Brazilian Context) ---
  async function handleCepBlur(rawCep: string) {
    const clean = rawCep.replace(/\D/g, '')
    if (clean.length !== 8) {
      setFiscalErrors(prev => ({ ...prev, cep: 'Informe um CEP válido com 8 dígitos (ex.: 04538-132).' }))
      return
    }
    setFiscalErrors(prev => ({ ...prev, cep: undefined }))
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      if (res.ok) {
        const data = (await res.json()) as {
          erro?: boolean
          logradouro?: string
          bairro?: string
          localidade?: string
          uf?: string
        }
        if (!data.erro && data.localidade) {
          const formattedAddress = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`]
            .filter(Boolean)
            .join(' — ')
          updateConfig({
            settings: {
              ...full.settings,
              cep: formatCep(clean),
              address: formattedAddress,
            },
          })
          toast({
            title: 'Endereço preenchido pelo CEP',
            body: formattedAddress,
          })
          return
        }
      }
    } catch {
      // Fallback for offline environment
    } finally {
      setCepLoading(false)
    }

    if (CEP_FALLBACKS[clean]) {
      updateConfig({
        settings: {
          ...full.settings,
          cep: formatCep(clean),
          address: CEP_FALLBACKS[clean],
        },
      })
    }
  }

  // --- Save & Publish ---
  async function handleSaveDraft() {
    setSaving(true)
    try {
      const { syncedWithBackend } = await syncStoreLayout(full, false)
      toast({
        title: syncedWithBackend ? 'Rascunho sincronizado' : 'Rascunho salvo localmente',
        body: syncedWithBackend
          ? 'Alterações salvas e sincronizadas com o servidor.'
          : 'Alterações gravadas neste navegador.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishStore() {
    setPublishing(true)
    try {
      await syncStoreLayout(full, true)
      updateConfig({
        settings: {
          ...full.settings,
          published: true,
          publishedAt: new Date().toISOString(),
        },
      })
      toast({
        title: 'Vitrine publicada',
        body: `Publicação confirmada pelo servidor em ${full.settings.slug}.syndetis.app.`,
      })
    } catch (err) {
      toast({
        title: 'Falha ao publicar no servidor',
        body: errorMessage(err),
      })
    } finally {
      setPublishing(false)
    }
  }

  function handleExportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${full.settings.slug || 'syndetis-store'}-layout.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({ title: 'Arquivo JSON exportado', body: 'O backup estrutural da loja foi baixado.' })
  }

  function handleApplyPromptSuggestion() {
    if (aiPrompt.trim().length < 10) {
      toast({
        title: 'Descrição insuficiente',
        body: 'Digite pelo menos 10 caracteres descrevendo o segmento e objetivo da loja.',
      })
      return
    }
    const lower = aiPrompt.toLowerCase()
    const nextTemplate = /editorial|moda|luxo|minimal/.test(lower)
      ? 'editorial'
      : /compacto|whatsapp|rapido/.test(lower)
        ? 'organico'
        : 'essencial'
    updateConfig({
      description: aiPrompt.trim(),
      template: nextTemplate,
    })
    toast({
      title: 'Configuração sugerida aplicada',
      body: `Layout ajustado para o modelo "${nextTemplate}" com a nova descrição comercial.`,
    })
  }

  // Filtered & sorted products for the SaaS Catalog Table
  const filteredProducts = full.products
    .filter(p => {
      if (prodCatFilter !== 'ALL' && p.categoryId !== prodCatFilter) return false
      if (prodSearch.trim()) {
        const q = prodSearch.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const dir = prodSortAsc ? 1 : -1
      if (prodSortBy === 'name') return a.name.localeCompare(b.name, 'pt-BR') * dir
      if (prodSortBy === 'price') return (a.price - b.price) * dir
      return (a.stock - b.stock) * dir
    })

  function toggleSort(col: 'name' | 'price' | 'stock') {
    if (prodSortBy === col) {
      setProdSortAsc(v => !v)
    } else {
      setProdSortBy(col)
      setProdSortAsc(true)
    }
  }

  const allVisibleSelected =
    filteredProducts.length > 0 && filteredProducts.every(p => selectedProdIds.includes(p.id))

  return (
    <section className="maker-page maker-studio">
      {/* Top Studio Header: 1 Primary CTA ("Publicar vitrine"), Secondary with border, Tertiary ghost */}
      <div className="maker-studio-header">
        <div>
          <span className="eyebrow">
            Construtor de Vitrine · {full.settings.slug}.syndetis.app
          </span>
          <h1>{full.name}</h1>
        </div>

        <div className="maker-header-actions">
          <span className="demo-label tabular-nums">
            <span className="status-pip" /> {full.components.filter(c => c.visible).length} seções ·{' '}
            {full.categories.length} categorias · {full.products.length} itens
            {full.settings.publishedAt ? ` · Publicado em ${formatDateBR(full.settings.publishedAt)}` : ''}
          </span>
          <HardwareButton size="sm" variant="ghost" href="#/dashboard" trailingIcon={<ArrowUpRight size={13} />}>
            Ver pedidos e chat
          </HardwareButton>
          <HardwareButton size="sm" variant="secondary" onClick={handleSaveDraft} loading={saving}>
            Salvar rascunho
          </HardwareButton>
          <HardwareButton
            size="sm"
            variant="primary"
            icon={<Rocket size={14} />}
            loading={publishing}
            onClick={handlePublishStore}
          >
            Publicar vitrine
          </HardwareButton>
        </div>
      </div>

      {/* Undo Banner when a destructive action was just taken */}
      {lastUndo && (
        <div className="saas-undo-bar" role="status">
          <span>{lastUndo.label}.</span>
          <div className="saas-undo-actions">
            <button
              type="button"
              className="saas-undo-btn"
              onClick={() => {
                lastUndo.restore()
                setLastUndo(null)
                toast({ title: 'Alteração desfeita', body: 'O item excluído foi restaurado.' })
              }}
            >
              <RotateCcw size={13} /> Desfazer exclusão
            </button>
            <button
              type="button"
              className="saas-undo-dismiss"
              aria-label="Fechar aviso"
              onClick={() => setLastUndo(null)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Studio Navigation Tabs */}
      <div className="maker-tabs-bar" role="tablist" aria-label="Áreas do construtor">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'componentes'}
          className={`saas-tab-btn ${activeTab === 'componentes' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('componentes')}
        >
          <Layers3 size={15} />
          <span>Seções da Página ({full.components.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categorias'}
          className={`saas-tab-btn ${activeTab === 'categorias' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('categorias')}
        >
          <Tag size={15} />
          <span>Categorias ({full.categories.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'produtos'}
          className={`saas-tab-btn ${activeTab === 'produtos' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('produtos')}
        >
          <ShoppingBag size={15} />
          <span>Catálogo de Produtos ({full.products.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'identidade'}
          className={`saas-tab-btn ${activeTab === 'identidade' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('identidade')}
        >
          <Palette size={15} />
          <span>Aparência e Marca</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'configuracoes'}
          className={`saas-tab-btn ${activeTab === 'configuracoes' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('configuracoes')}
        >
          <Settings2 size={15} />
          <span>Frete, Pagamentos e Fiscal</span>
        </button>
      </div>

      {/* Main Split Workspace: Left Controls + Right Live Storefront */}
      <div className="maker-workspace-grid">
        <aside className="maker-sidebar">
          {activeTab === 'componentes' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Seções da Vitrine</h2>
                  <p>Arraste para reordenar, oculte temporariamente ou edite o conteúdo de cada bloco.</p>
                </div>
                <HardwareButton
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={14} />}
                  onClick={() => setShowComponentCatalog(v => !v)}
                >
                  {showComponentCatalog ? 'Fechar lista' : 'Adicionar seção'}
                </HardwareButton>
              </div>

              {showComponentCatalog && (
                <Panel variant="screen" className="component-catalog-drawer">
                  <span className="control-label">Selecione um bloco para adicionar à página</span>
                  <div className="component-catalog-grid">
                    {COMPONENT_LIBRARY.map(item => (
                      <div key={item.type} className="catalog-item-card">
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </div>
                        <HardwareButton
                          size="sm"
                          variant="secondary"
                          icon={<Plus size={13} />}
                          onClick={() => addComponent(item.type)}
                        >
                          Inserir seção
                        </HardwareButton>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              <div className="component-layer-list" role="list" aria-label="Seções da vitrine">
                {full.components.map((comp, index) => {
                  const meta = COMPONENT_LIBRARY.find(m => m.type === comp.type)
                  const isSelected = selectedComponent?.id === comp.id
                  return (
                    <div
                      key={comp.id}
                      role="listitem"
                      draggable
                      onDragStart={() => setDraggedCompId(comp.id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDropComponent(comp.id)}
                      className={`component-layer-row ${isSelected ? 'is-selected' : ''} ${!comp.visible ? 'is-hidden' : ''}`}
                      onClick={() => setSelectedCompId(comp.id)}
                    >
                      <span className="layer-grip" title="Arraste para reordenar">
                        <GripVertical size={14} />
                      </span>
                      <div className="layer-info">
                        <small className="tabular-nums">
                          {index + 1}. {meta?.label || comp.type} {!comp.visible ? '(Oculto)' : ''}
                        </small>
                        <strong>{comp.title.replace(/\n/g, ' ')}</strong>
                      </div>
                      <div className="layer-actions" onClick={e => e.stopPropagation()}>
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Mover seção para cima"
                          disabled={index === 0}
                          icon={<ArrowUp size={13} />}
                          onClick={() => moveComponent(comp.id, -1)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Mover seção para baixo"
                          disabled={index === full.components.length - 1}
                          icon={<ArrowDown size={13} />}
                          onClick={() => moveComponent(comp.id, 1)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label={comp.visible ? 'Ocultar seção' : 'Exibir seção'}
                          icon={comp.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          onClick={() => {
                            const next = full.components.map(c =>
                              c.id === comp.id ? { ...c, visible: !c.visible } : c,
                            )
                            updateConfig({ components: next })
                          }}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Duplicar seção"
                          icon={<Copy size={13} />}
                          onClick={() => duplicateComponent(comp.id)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label={`Excluir seção ${comp.title}`}
                          icon={<Trash2 size={13} />}
                          onClick={() => requestRemoveComponent(comp.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedComponent && (
                <Panel variant="screen" className="component-inspector">
                  <div className="inspector-header">
                    <span className="control-label">
                      Propriedades: {COMPONENT_LIBRARY.find(m => m.type === selectedComponent.type)?.label}
                    </span>
                    <HardwareButton
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={13} />}
                      onClick={() => requestRemoveComponent(selectedComponent.id)}
                    >
                      Excluir seção…
                    </HardwareButton>
                  </div>
                  <Stack gap={6}>
                    <Field
                      label="Título principal da seção"
                      value={selectedComponent.title}
                      onValueChange={v => updateSelectedComponent({ title: v })}
                      description="Exibido em destaque no bloco selecionado."
                    />
                    <Textarea
                      label="Subtítulo ou descrição complementar"
                      rows={2}
                      maxRows={4}
                      value={selectedComponent.subtitle}
                      onValueChange={v => updateSelectedComponent({ subtitle: v })}
                      description="Use frases objetivas sobre prazo, garantia ou diferencial."
                    />
                    {selectedComponent.type !== 'announcement' &&
                      selectedComponent.type !== 'benefits' &&
                      selectedComponent.type !== 'footer' && (
                        <Field
                          label="Rótulo do botão de ação"
                          value={selectedComponent.ctaText || ''}
                          placeholder="Ex.: Ver catálogo completo"
                          onValueChange={v => updateSelectedComponent({ ctaText: v })}
                          description="Use um verbo claro indicando o que acontece ao clicar."
                        />
                      )}
                    <div>
                      <span className="control-label">Densidade e disposição do bloco</span>
                      <Stack direction="row" gap={4}>
                        {(['editorial', 'grid', 'minimal', 'highlight'] as ComponentVariant[]).map(variant => (
                          <HardwareButton
                            key={variant}
                            size="sm"
                            variant={selectedComponent.variant === variant ? 'secondary' : 'ghost'}
                            onClick={() => updateSelectedComponent({ variant })}
                          >
                            {variant === 'editorial'
                              ? 'Destaque'
                              : variant === 'grid'
                                ? 'Grade'
                                : variant === 'minimal'
                                  ? 'Compacto'
                                  : 'Expandido'}
                          </HardwareButton>
                        ))}
                      </Stack>
                    </div>
                  </Stack>
                </Panel>
              )}
            </div>
          )}

          {activeTab === 'categorias' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Categorias do Catálogo</h2>
                  <p>Agrupe seus produtos para facilitar a busca e filtragem pelo comprador.</p>
                </div>
              </div>

              <Panel variant="screen" className="maker-form-box">
                <span className="control-label">Cadastrar nova categoria</span>
                <Stack gap={6}>
                  <Field
                    label="Nome da categoria"
                    placeholder="Ex.: Iluminação Técnica, Áudio, Acessórios"
                    value={newCatName}
                    onValueChange={v => {
                      setNewCatName(v)
                      if (catError) setCatError('')
                    }}
                    onBlur={() => {
                      if (newCatName && newCatName.trim().length < 2) {
                        setCatError('Informe pelo menos 2 caracteres para a categoria.')
                      }
                    }}
                    description="O endereço amigável (slug) é gerado automaticamente."
                    error={catError || undefined}
                  />
                  <Field
                    label="Descrição da linha"
                    placeholder="Ex.: Equipamentos com garantia de 12 meses e envio imediato."
                    value={newCatDesc}
                    onValueChange={setNewCatDesc}
                  />
                  <HardwareButton
                    size="sm"
                    variant="secondary"
                    icon={<FolderPlus size={14} />}
                    onClick={handleAddCategory}
                  >
                    Salvar categoria
                  </HardwareButton>
                </Stack>
              </Panel>

              {full.categories.length === 0 ? (
                <div className="saas-empty-state">
                  <Tag size={20} />
                  <strong>Nenhuma categoria cadastrada</strong>
                  <p>Crie categorias para organizar seus produtos no menu da vitrine.</p>
                </div>
              ) : (
                <div className="component-layer-list">
                  {full.categories.map((cat, idx) => {
                    const count = full.products.filter(p => p.categoryId === cat.id).length
                    return (
                      <div key={cat.id} className="component-layer-row">
                        <div className="layer-info">
                          <small className="tabular-nums">
                            /{cat.slug} · {count} {count === 1 ? 'item vinculado' : 'itens vinculados'}
                          </small>
                          <strong>{cat.name}</strong>
                          <p className="layer-subtext">{cat.description}</p>
                        </div>
                        <div className="layer-actions">
                          <HardwareButton
                            size="sm"
                            variant={previewCatFilter === cat.id ? 'secondary' : 'ghost'}
                            onClick={() => setPreviewCatFilter(previewCatFilter === cat.id ? null : cat.id)}
                          >
                            {previewCatFilter === cat.id ? 'Filtro ativo' : 'Testar filtro'}
                          </HardwareButton>
                          <HardwareButton
                            size="sm"
                            variant="ghost"
                            iconOnly
                            aria-label="Subir categoria"
                            disabled={idx === 0}
                            icon={<ArrowUp size={13} />}
                            onClick={() => moveCategory(cat.id, -1)}
                          />
                          <HardwareButton
                            size="sm"
                            variant="ghost"
                            iconOnly
                            aria-label="Descer categoria"
                            disabled={idx === full.categories.length - 1}
                            icon={<ArrowDown size={13} />}
                            onClick={() => moveCategory(cat.id, 1)}
                          />
                          <HardwareButton
                            size="sm"
                            variant="ghost"
                            iconOnly
                            aria-label={`Excluir categoria ${cat.name}`}
                            icon={<Trash2 size={13} />}
                            onClick={() =>
                              setPendingDelete({
                                kind: 'category',
                                id: cat.id,
                                name: cat.name,
                              })
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'produtos' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Catálogo de Produtos</h2>
                  <p>Gerencie preços, SKU, disponibilidade de estoque e ações em lote.</p>
                </div>
                <HardwareButton
                  size="sm"
                  variant="secondary"
                  icon={<PackagePlus size={14} />}
                  onClick={() => setShowNewProductForm(v => !v)}
                >
                  {showNewProductForm ? 'Fechar formulário' : 'Novo produto'}
                </HardwareButton>
              </div>

              {showNewProductForm && (
                <Panel variant="screen" className="maker-form-box">
                  <span className="control-label">Cadastrar novo item no estoque</span>
                  <Stack gap={6}>
                    <Field
                      label="Nome comercial do produto"
                      placeholder="Ex.: Luminária Articulada Aura"
                      value={newProdName}
                      onValueChange={v => {
                        setNewProdName(v)
                        if (prodErrors.name) setProdErrors(prev => ({ ...prev, name: undefined }))
                      }}
                      onBlur={() => {
                        const err = validateProdName(newProdName)
                        if (err) setProdErrors(prev => ({ ...prev, name: err }))
                      }}
                      error={prodErrors.name}
                    />
                    <div className="maker-two-cols">
                      <Field
                        label="Preço de venda (R$)"
                        mono
                        value={newProdPrice}
                        onValueChange={v => {
                          setNewProdPrice(v)
                          if (prodErrors.price) setProdErrors(prev => ({ ...prev, price: undefined }))
                        }}
                        onBlur={() => {
                          const err = validateProdPrice(newProdPrice)
                          if (err) setProdErrors(prev => ({ ...prev, price: err }))
                        }}
                        description="Valor cobrado no checkout."
                        error={prodErrors.price}
                      />
                      <Field
                        label="Preço anterior (opcional)"
                        mono
                        value={newProdCompare}
                        onValueChange={setNewProdCompare}
                        description="Para exibir preço riscado."
                      />
                    </div>
                    <div className="maker-two-cols">
                      <Field
                        label="Saldo em estoque (un.)"
                        mono
                        value={newProdStock}
                        onValueChange={setNewProdStock}
                      />
                      <Field
                        label="Código SKU"
                        mono
                        placeholder="SYN-104"
                        value={newProdSku}
                        onValueChange={setNewProdSku}
                      />
                    </div>

                    <div>
                      <span className="control-label">Categoria vinculada</span>
                      <div className="pill-selector-wrap">
                        {full.categories.map(cat => (
                          <HardwareButton
                            key={cat.id}
                            size="sm"
                            variant={newProdCatId === cat.id ? 'secondary' : 'ghost'}
                            onClick={() => setNewProdCatId(cat.id)}
                          >
                            {cat.name}
                          </HardwareButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="control-label">Foto de referência do produto</span>
                      <div className="product-preset-thumbs">
                        {PRODUCT_IMAGE_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            className={`preset-thumb-btn ${newProdImage === preset.id ? 'is-active' : ''}`}
                            onClick={() => setNewProdImage(preset.id)}
                            title={preset.label}
                          >
                            <img src={photo(preset.id, 180)} alt={preset.label} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <HardwareButton
                      size="sm"
                      variant="primary"
                      icon={<Check size={14} />}
                      onClick={handleAddProduct}
                    >
                      Salvar produto no catálogo
                    </HardwareButton>
                  </Stack>
                </Panel>
              )}

              {/* SaaS Table Controls: Search, Category Filter, Bulk Actions */}
              <div className="saas-table-toolbar">
                <div className="saas-table-search">
                  <Search size={14} />
                  <input
                    type="search"
                    placeholder="Buscar por nome ou SKU…"
                    value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)}
                    aria-label="Buscar produtos por nome ou SKU"
                  />
                </div>
                <select
                  className="saas-select"
                  value={prodCatFilter}
                  onChange={e => setProdCatFilter(e.target.value)}
                  aria-label="Filtrar por categoria"
                >
                  <option value="ALL">Todas as categorias</option>
                  {full.categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProdIds.length > 0 && (
                <div className="saas-bulk-bar" role="region" aria-label="Ações em massa">
                  <span className="tabular-nums">
                    <strong>{selectedProdIds.length}</strong>{' '}
                    {selectedProdIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
                  </span>
                  <div className="saas-bulk-actions">
                    <button
                      type="button"
                      className="saas-text-button"
                      onClick={() => setSelectedProdIds([])}
                    >
                      Desmarcar
                    </button>
                    <button
                      type="button"
                      className="saas-danger-btn-sm"
                      onClick={() =>
                        setPendingDelete({
                          kind: 'bulk-products',
                          id: 'bulk',
                          name: `${selectedProdIds.length} produtos selecionados`,
                          ids: selectedProdIds,
                        })
                      }
                    >
                      <Trash2 size={13} /> Excluir selecionados
                    </button>
                  </div>
                </div>
              )}

              {/* Fixed-Header SaaS Product Table */}
              {filteredProducts.length === 0 ? (
                <div className="saas-empty-state">
                  <ShoppingBag size={20} />
                  <strong>Nenhum produto encontrado</strong>
                  <p>
                    {prodSearch || prodCatFilter !== 'ALL'
                      ? 'Nenhum item corresponde aos filtros aplicados no momento.'
                      : 'Seu catálogo ainda está vazio. Adicione o primeiro produto para começar a vender.'}
                  </p>
                  {prodSearch || prodCatFilter !== 'ALL' ? (
                    <HardwareButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setProdSearch('')
                        setProdCatFilter('ALL')
                      }}
                    >
                      Limpar filtros de busca
                    </HardwareButton>
                  ) : (
                    <HardwareButton
                      size="sm"
                      variant="secondary"
                      icon={<Plus size={14} />}
                      onClick={() => setShowNewProductForm(true)}
                    >
                      Cadastrar primeiro produto
                    </HardwareButton>
                  )}
                </div>
              ) : (
                <div className="saas-table-wrap">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os produtos visíveis"
                            checked={allVisibleSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedProdIds(filteredProducts.map(p => p.id))
                              } else {
                                setSelectedProdIds([])
                              }
                            }}
                          />
                        </th>
                        <th>
                          <button type="button" className="saas-th-sort" onClick={() => toggleSort('name')}>
                            Produto / SKU <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="num-col">
                          <button type="button" className="saas-th-sort" onClick={() => toggleSort('price')}>
                            Preço <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="num-col">
                          <button type="button" className="saas-th-sort" onClick={() => toggleSort('stock')}>
                            Estoque <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th style={{ width: 44 }} aria-label="Ações da linha" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(prod => {
                        const catName =
                          full.categories.find(c => c.id === prod.categoryId)?.name || 'Sem categoria'
                        const isChecked = selectedProdIds.includes(prod.id)
                        const menuOpen = openProdMenuId === prod.id
                        return (
                          <tr key={prod.id} className={isChecked ? 'is-selected' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Selecionar ${prod.name}`}
                                checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedProdIds(prev => [...prev, prod.id])
                                  } else {
                                    setSelectedProdIds(prev => prev.filter(id => id !== prod.id))
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <div className="saas-table-prod-cell">
                                <img src={photo(prod.image, 120)} alt={prod.name} className="product-row-thumb" />
                                <div>
                                  <strong>{prod.name}</strong>
                                  <small className="tabular-nums">
                                    {catName} · {prod.sku}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td className="num-col tabular-nums">{formatBRL(prod.price)}</td>
                            <td className="num-col tabular-nums">
                              <span
                                className={`saas-stock-badge ${prod.stock <= 8 ? 'is-low' : 'is-ok'}`}
                              >
                                {prod.stock} un.
                              </span>
                            </td>
                            <td className="action-col">
                              <div className="saas-row-menu-anchor">
                                <button
                                  type="button"
                                  className="saas-row-dots-btn"
                                  aria-label={`Ações para ${prod.name}`}
                                  aria-expanded={menuOpen}
                                  onClick={() => setOpenProdMenuId(menuOpen ? null : prod.id)}
                                >
                                  <MoreHorizontal size={15} />
                                </button>
                                {menuOpen && (
                                  <div className="saas-row-dropdown" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => duplicateProduct(prod)}
                                    >
                                      <Copy size={13} /> Duplicar item
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => toggleProductFeatured(prod.id)}
                                    >
                                      <Check size={13} />{' '}
                                      {prod.featured ? 'Remover destaque' : 'Marcar como destaque'}
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="is-danger"
                                      onClick={() => {
                                        setOpenProdMenuId(null)
                                        setPendingDelete({
                                          kind: 'product',
                                          id: prod.id,
                                          name: prod.name,
                                        })
                                      }}
                                    >
                                      <Trash2 size={13} /> Excluir produto…
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'identidade' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Aparência e Identidade da Marca</h2>
                  <p>Defina nome comercial, apresentação institucional, densidade de layout e cor de ação.</p>
                </div>
              </div>

              <Stack gap={8}>
                <Field
                  label="Nome comercial da loja"
                  value={full.name}
                  maxLength={60}
                  onValueChange={v =>
                    updateConfig({
                      name: v,
                      settings: { ...full.settings, slug: slugify(v) },
                    })
                  }
                  description="Exibido no cabeçalho, rodapé e título das páginas."
                />
                <Textarea
                  label="Descrição institucional da loja"
                  value={full.description}
                  maxLength={600}
                  rows={3}
                  maxRows={5}
                  onValueChange={v => updateConfig({ description: v })}
                  description="Resumo claro do que sua loja vende e suas condições de entrega."
                />

                <div>
                  <span className="control-label">Estrutura de layout da vitrine</span>
                  <Stack direction="row" gap={4}>
                    {templates.map(t => (
                      <HardwareButton
                        key={t.id}
                        size="sm"
                        variant={full.template === t.id ? 'secondary' : 'ghost'}
                        icon={full.template === t.id ? <Check size={13} /> : undefined}
                        onClick={() => updateConfig({ template: t.id, accent: t.accent })}
                      >
                        {t.name.split(' ')[0]}
                      </HardwareButton>
                    ))}
                  </Stack>
                </div>

                <div>
                  <span className="control-label">Cor primária de ação (botões da loja)</span>
                  <div className="brand-swatches-row">
                    {BRAND_SWATCHES.map(s => (
                      <button
                        key={s.hex}
                        type="button"
                        className={`brand-swatch-pill ${full.accent.toLowerCase() === s.hex ? 'is-active' : ''}`}
                        style={{ backgroundColor: s.hex }}
                        title={`${s.name} (${s.hex})`}
                        onClick={() => updateConfig({ accent: s.hex })}
                      />
                    ))}
                  </div>
                </div>

                <div className="color-control">
                  <label htmlFor="brand-color">
                    Cor hexadecimal personalizada
                    <small>O contraste do texto do botão é ajustado automaticamente (WCAG AA).</small>
                  </label>
                  <input
                    id="brand-color"
                    type="color"
                    value={full.accent}
                    onChange={e => updateConfig({ accent: e.target.value })}
                  />
                  <code className="tabular-nums">{full.accent.toUpperCase()}</code>
                </div>

                <Panel variant="screen" className="maker-form-box">
                  <span className="control-label">
                    <Sparkles size={12} style={{ display: 'inline', marginRight: 5 }} />
                    Assistente de Texto e Estrutura (Plano Maker · 30 req/dia)
                  </span>
                  <Textarea
                    label="Descreva o segmento e os produtos da sua loja"
                    placeholder="Ex.: Loja de equipamentos fotográficos e iluminação de estúdio com envio em 24h…"
                    rows={2}
                    maxRows={4}
                    value={aiPrompt}
                    onValueChange={setAiPrompt}
                  />
                  <div style={{ marginTop: 10 }}>
                    <HardwareButton
                      size="sm"
                      variant="secondary"
                      icon={<Wand2 size={14} />}
                      onClick={handleApplyPromptSuggestion}
                    >
                      Aplicar descrição e estrutura sugerida
                    </HardwareButton>
                  </div>
                </Panel>
              </Stack>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Frete, Pagamentos e Dados Fiscais</h2>
                  <p>Configure domínio, CPF/CNPJ, CEP de origem com busca automática e meios de pagamento.</p>
                </div>
              </div>

              <Stack gap={8}>
                <Field
                  label="Subdomínio da loja (.syndetis.app)"
                  mono
                  value={full.settings.slug}
                  onValueChange={v =>
                    updateConfig({ settings: { ...full.settings, slug: slugify(v) } })
                  }
                  description="Endereço público onde seus clientes acessam o catálogo."
                />

                <div className="maker-two-cols">
                  <Field
                    label="CPF ou CNPJ do titular"
                    mono
                    placeholder="00.000.000/0001-00"
                    value={full.settings.cnpj || ''}
                    onValueChange={v => {
                      updateConfig({
                        settings: { ...full.settings, cnpj: formatCpfCnpj(v) },
                      })
                      if (fiscalErrors.cnpj) setFiscalErrors(prev => ({ ...prev, cnpj: undefined }))
                    }}
                    onBlur={() => {
                      const digits = (full.settings.cnpj || '').replace(/\D/g, '')
                      if (digits.length !== 11 && digits.length !== 14) {
                        setFiscalErrors(prev => ({
                          ...prev,
                          cnpj: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.',
                        }))
                      }
                    }}
                    description="Exibido no rodapé da loja conforme exigência do e-commerce (Decreto 7.962/13)."
                    error={fiscalErrors.cnpj}
                  />
                  <Field
                    label="CEP de origem do estoque"
                    mono
                    placeholder="04538-132"
                    value={full.settings.cep || ''}
                    onValueChange={v => {
                      updateConfig({
                        settings: { ...full.settings, cep: formatCep(v) },
                      })
                      if (fiscalErrors.cep) setFiscalErrors(prev => ({ ...prev, cep: undefined }))
                    }}
                    onBlur={() => handleCepBlur(full.settings.cep || '')}
                    description={cepLoading ? 'Consultando endereço pelo CEP…' : 'Preenche o endereço automaticamente ao sair do campo.'}
                    error={fiscalErrors.cep}
                  />
                </div>

                <Field
                  label="Endereço comercial / expedição"
                  start={<MapPin size={14} />}
                  value={full.settings.address || ''}
                  onValueChange={v =>
                    updateConfig({ settings: { ...full.settings, address: v } })
                  }
                  description="Utilizado para cálculo de prazo dos Correios/transportadora e rodapé."
                />

                <div className="maker-two-cols">
                  <Field
                    label="Frete grátis a partir de (R$)"
                    mono
                    value={String(full.settings.freeShippingThreshold)}
                    onValueChange={v =>
                      updateConfig({
                        settings: {
                          ...full.settings,
                          freeShippingThreshold: Math.max(0, Number(v) || 0),
                        },
                      })
                    }
                  />
                  <Field
                    label="Desconto para Pix à vista (%)"
                    mono
                    value={String(full.settings.pixDiscountPercent)}
                    onValueChange={v =>
                      updateConfig({
                        settings: {
                          ...full.settings,
                          pixDiscountPercent: Math.min(50, Math.max(0, Number(v) || 0)),
                        },
                      })
                    }
                  />
                </div>

                <div className="maker-two-cols">
                  <Field
                    label="Parcelamento máximo no cartão"
                    mono
                    value={String(full.settings.maxInstallments)}
                    onValueChange={v =>
                      updateConfig({
                        settings: {
                          ...full.settings,
                          maxInstallments: Math.min(12, Math.max(1, Number(v) || 1)),
                        },
                      })
                    }
                  />
                  <Field
                    label="WhatsApp de suporte ao comprador"
                    value={full.settings.whatsapp}
                    onValueChange={v =>
                      updateConfig({ settings: { ...full.settings, whatsapp: v } })
                    }
                  />
                </div>

                <Field
                  label="Título para mecanismos de busca (SEO)"
                  value={full.settings.seoTitle}
                  onValueChange={v =>
                    updateConfig({ settings: { ...full.settings, seoTitle: v } })
                  }
                />

                <Grid minItemWidth="9rem" gap={4}>
                  <Card
                    padding="compact"
                    eyebrow="Pagamento instantâneo"
                    title="Pix com QR Code"
                    meta={`${full.settings.pixDiscountPercent}% OFF`}
                  >
                    Liquidação imediata e conciliação automática do pedido.
                  </Card>
                  <Card
                    padding="compact"
                    eyebrow="Crédito à vista ou parcelado"
                    title="Cartão de Crédito"
                    meta={`Até ${full.settings.maxInstallments}x`}
                  >
                    Visa, Mastercard, Elo e Hipercard com antifraude integrado.
                  </Card>
                  <Card
                    padding="compact"
                    eyebrow="Faturamento B2B / B2C"
                    title="Boleto Registrado"
                    meta="Compensação D+1"
                  >
                    Emissão com código de barras e linha digitável no checkout.
                  </Card>
                </Grid>

                <Stack direction="row" gap={6}>
                  <HardwareButton
                    variant="secondary"
                    icon={<Download size={14} />}
                    onClick={handleExportJson}
                  >
                    Exportar backup JSON
                  </HardwareButton>
                </Stack>
              </Stack>
            </div>
          )}
        </aside>

        {/* Right Live Preview Stage */}
        <div className="editor-preview maker-live-stage">
          <div className="preview-toolbar">
            <span>
              <span className="status-pip" /> Visualização em tempo real ·{' '}
              <code>{full.settings.slug}.syndetis.app</code>
              {previewCatFilter && (
                <HardwareButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewCatFilter(null)}
                >
                  Limpar filtro de categoria
                </HardwareButton>
              )}
            </span>
            <Stack direction="row" gap={4}>
              <HardwareButton
                size="sm"
                variant={!mobile ? 'secondary' : 'ghost'}
                icon={<Monitor size={14} />}
                onClick={() => setMobile(false)}
              >
                Desktop
              </HardwareButton>
              <HardwareButton
                size="sm"
                variant={mobile ? 'secondary' : 'ghost'}
                icon={<Smartphone size={14} />}
                onClick={() => setMobile(true)}
              >
                Mobile
              </HardwareButton>
            </Stack>
          </div>

          <div className={`preview-canvas ${mobile ? 'preview-is-mobile' : ''}`}>
            {mobile ? (
              <Iphone>
                <StorePreview
                  config={full}
                  mobile
                  selectedComponentId={selectedCompId}
                  onSelectComponent={id => {
                    setSelectedCompId(id)
                    setActiveTab('componentes')
                  }}
                  activeCategoryFilter={previewCatFilter}
                />
              </Iphone>
            ) : (
              <MacbookPro className="editor-macbook">
                <StorePreview
                  config={full}
                  selectedComponentId={selectedCompId}
                  onSelectComponent={id => {
                    setSelectedCompId(id)
                    setActiveTab('componentes')
                  }}
                  activeCategoryFilter={previewCatFilter}
                />
              </MacbookPro>
            )}
          </div>

          <div className="preview-footer-bar">
            <span className="preview-note">
              Clique em qualquer seção da vitrine para selecioná-la e editar seus textos na lateral esquerda.
            </span>
            <HardwareButton
              size="sm"
              variant="ghost"
              href="#/dashboard"
              icon={<BarChart3 size={14} />}
              trailingIcon={<ArrowUpRight size={13} />}
            >
              Abrir pedidos e faturamento
            </HardwareButton>
          </div>
        </div>
      </div>

      {/* Destructive Action Confirmation Modal (Closes on Esc, names the exact item, red button) */}
      {pendingDelete && (
        <div
          className="saas-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={() => setPendingDelete(null)}
        >
          <div className="saas-modal" onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <div className="saas-modal-danger-icon">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 id="delete-modal-title">Confirmar exclusão</h3>
                <p>Pressione Esc ou clique em Cancelar para manter o item.</p>
              </div>
              <button
                type="button"
                className="saas-modal-close"
                aria-label="Fechar janela (Esc)"
                onClick={() => setPendingDelete(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="saas-modal-body">
              <p>
                Tem certeza de que deseja excluir{' '}
                <strong>"{pendingDelete.name}"</strong>?
              </p>
              <p className="saas-modal-sub">
                Você poderá desfazer esta ação imediatamente após a confirmação usando o aviso no topo da tela.
              </p>
            </div>

            <div className="saas-modal-footer">
              <HardwareButton
                size="sm"
                variant="secondary"
                onClick={() => setPendingDelete(null)}
              >
                Cancelar (Esc)
              </HardwareButton>
              <button
                type="button"
                className="saas-btn-danger"
                onClick={confirmPendingDelete}
              >
                <Trash2 size={14} /> Excluir "{pendingDelete.name.slice(0, 28)}"
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
