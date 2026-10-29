import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
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
  Monitor,
  PackagePlus,
  Palette,
  Plus,
  Rocket,
  Settings2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
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
import { syncStoreLayout } from '@/lib/api'

type MakerTab = 'componentes' | 'categorias' | 'produtos' | 'identidade' | 'configuracoes'

const BRAND_SWATCHES = [
  { name: 'Violeta Cobalto', hex: '#6857eb' },
  { name: 'Lavanda Óptica', hex: '#7d73ff' },
  { name: 'Índigo Profundo', hex: '#5346bf' },
  { name: 'Azul Safira', hex: '#3b82f6' },
  { name: 'Esmeralda Escuro', hex: '#10b981' },
  { name: 'Âmbar Editorial', hex: '#d97706' },
  { name: 'Carmim Studio', hex: '#e11d48' },
]

export function MakerStudio({
  config,
  setConfig,
}: {
  config: LayoutConfig
  setConfig: (config: LayoutConfig) => void
}) {
  const full = ensureFullConfig(config)
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<MakerTab>('componentes')
  const [mobile, setMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Component builder state
  const [selectedCompId, setSelectedCompId] = useState<string | null>(full.components[1]?.id || full.components[0]?.id || null)
  const [showComponentCatalog, setShowComponentCatalog] = useState(false)
  const [draggedCompId, setDraggedCompId] = useState<string | null>(null)

  // Category form state
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [catError, setCatError] = useState('')
  const [previewCatFilter, setPreviewCatFilter] = useState<string | null>(null)

  // Product form state
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('490')
  const [newProdCompare, setNewProdCompare] = useState('590')
  const [newProdStock, setNewProdStock] = useState('15')
  const [newProdSku, setNewProdSku] = useState('')
  const [newProdBadge, setNewProdBadge] = useState('Novo')
  const [newProdCatId, setNewProdCatId] = useState(full.categories[0]?.id || 'cat-essenciais')
  const [newProdImage, setNewProdImage] = useState(PRODUCT_IMAGE_PRESETS[0].id)
  const [prodError, setProdError] = useState('')

  // AI prompt assistant state
  const [aiPrompt, setAiPrompt] = useState('')

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
      title: 'Componente adicionado',
      body: `"${meta.label}" foi inserido na estrutura da sua loja.`,
    })
  }

  function removeComponent(id: string) {
    if (full.components.length <= 1) {
      toast({
        title: 'Mantenha ao menos um componente',
        body: 'Sua vitrine precisa de pelo menos uma seção visível.',
      })
      return
    }
    const target = full.components.find(c => c.id === id)
    const nextComponents = full.components.filter(c => c.id !== id)
    updateConfig({ components: nextComponents })
    if (selectedCompId === id) {
      setSelectedCompId(nextComponents[0]?.id || null)
    }
    toast({
      title: 'Componente removido',
      body: target ? `Seção "${target.title.replace(/\n/g, ' ')}" excluída.` : 'Seção excluída da vitrine.',
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
    toast({ title: 'Componente duplicado', body: 'A cópia foi adicionada logo abaixo do original.' })
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
      setCatError('Digite um nome para a categoria (mínimo 2 caracteres).')
      return
    }
    const created: StoreCategory = {
      id: `cat-${Date.now().toString(36)}`,
      name: newCatName.trim(),
      slug: slugify(newCatName),
      description: newCatDesc.trim() || 'Coleção exclusiva da loja.',
      featured: true,
    }
    updateConfig({ categories: [...full.categories, created] })
    setNewCatName('')
    setNewCatDesc('')
    setCatError('')
    toast({ title: 'Categoria criada', body: `Categoria "${created.name}" adicionada à loja.` })
  }

  function handleDeleteCategory(id: string) {
    const target = full.categories.find(c => c.id === id)
    updateConfig({ categories: full.categories.filter(c => c.id !== id) })
    if (previewCatFilter === id) setPreviewCatFilter(null)
    toast({ title: 'Categoria excluída', body: target ? `"${target.name}" foi removida.` : 'Categoria removida.' })
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
  function handleAddProduct() {
    if (newProdName.trim().length < 2) {
      setProdError('Informe o nome do produto.')
      return
    }
    const parsedPrice = Number(newProdPrice.replace(',', '.'))
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setProdError('Informe um preço válido maior que zero.')
      return
    }
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
    setProdError('')
    toast({ title: 'Produto adicionado', body: `"${created.name}" já está visível na vitrine.` })
  }

  function handleDeleteProduct(id: string) {
    const target = full.products.find(p => p.id === id)
    updateConfig({ products: full.products.filter(p => p.id !== id) })
    toast({ title: 'Produto removido', body: target ? `"${target.name}" foi excluído do catálogo.` : 'Produto excluído.' })
  }

  // --- Save & Publish ---
  async function handleSaveDraft() {
    setSaving(true)
    try {
      await syncStoreLayout(full, false)
      toast({
        title: 'Alterações salvas',
        body: 'Componentes, categorias, produtos e configurações foram salvos.',
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
        title: 'Loja publicada com sucesso!',
        body: `Sua vitrine (${full.settings.slug}.syndetis.app) está online e sincronizada com o Dashboard.`,
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
    toast({ title: 'Configuração exportada', body: 'Arquivo JSON completo baixado para o seu dispositivo.' })
  }

  function handleApplyPromptSuggestion() {
    if (aiPrompt.trim().length < 10) {
      toast({ title: 'Descreva um pouco mais', body: 'Escreva pelo menos 10 caracteres sobre o estilo da sua loja.' })
      return
    }
    const lower = aiPrompt.toLowerCase()
    const nextTemplate = /editorial|moda|luxo|minimal/.test(lower)
      ? 'editorial'
      : /essencial|tech|tecnologia|modern/.test(lower)
        ? 'essencial'
        : 'organico'
    updateConfig({
      description: aiPrompt.trim(),
      template: nextTemplate,
    })
    toast({
      title: 'Direção aplicada à loja',
      body: `Modelo ajustado para ${nextTemplate.toUpperCase()} com sua nova descrição.`,
    })
  }

  return (
    <section className="shell maker-page maker-studio">
      {/* Top Studio Header */}
      <div className="maker-studio-header">
        <div>
          <span className="eyebrow">
            <ShoppingBag size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            Sessão Maker · Construtor de Loja Virtual
          </span>
          <h1>
            {full.name}
            <span>.</span>
          </h1>
        </div>

        <div className="maker-header-actions">
          <span className="demo-label">
            <span className="status-pip" /> {full.components.filter(c => c.visible).length} seções ·{' '}
            {full.categories.length} categorias · {full.products.length} produtos
          </span>
          <HardwareButton size="sm" onClick={handleSaveDraft} loading={saving}>
            Salvar rascunho
          </HardwareButton>
          <HardwareButton
            size="sm"
            variant="primary"
            icon={<Rocket size={14} />}
            loading={publishing}
            onClick={handlePublishStore}
          >
            Publicar Loja
          </HardwareButton>
          <HardwareButton
            size="sm"
            href="#/dashboard"
            icon={<BarChart3 size={14} />}
            trailingIcon={<ArrowUpRight size={13} />}
          >
            Dashboard & Chat
          </HardwareButton>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="maker-tabs-bar" role="tablist" aria-label="Áreas do Maker">
        <HardwareButton
          size="sm"
          variant={activeTab === 'componentes' ? 'primary' : 'neutral'}
          icon={<Layers3 size={14} />}
          onClick={() => setActiveTab('componentes')}
        >
          01 · Componentes ({full.components.length})
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={activeTab === 'categorias' ? 'primary' : 'neutral'}
          icon={<Tag size={14} />}
          onClick={() => setActiveTab('categorias')}
        >
          02 · Categorias ({full.categories.length})
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={activeTab === 'produtos' ? 'primary' : 'neutral'}
          icon={<ShoppingBag size={14} />}
          onClick={() => setActiveTab('produtos')}
        >
          03 · Produtos ({full.products.length})
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={activeTab === 'identidade' ? 'primary' : 'neutral'}
          icon={<Palette size={14} />}
          onClick={() => setActiveTab('identidade')}
        >
          04 · Identidade & Estilo
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={activeTab === 'configuracoes' ? 'primary' : 'neutral'}
          icon={<Settings2 size={14} />}
          onClick={() => setActiveTab('configuracoes')}
        >
          05 · Configurações da Loja
        </HardwareButton>
      </div>

      {/* Main Split Workspace: Left Controls + Right Live Storefront */}
      <div className="maker-workspace-grid">
        <aside className="maker-sidebar">
          {activeTab === 'componentes' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Estrutura da Página</h2>
                  <p>Arraste ou use as setas para trocar componentes de lugar, editar ou excluir.</p>
                </div>
                <HardwareButton
                  size="sm"
                  variant="primary"
                  icon={<Plus size={14} />}
                  onClick={() => setShowComponentCatalog(v => !v)}
                >
                  {showComponentCatalog ? 'Fechar catálogo' : 'Adicionar'}
                </HardwareButton>
              </div>

              {showComponentCatalog && (
                <Panel variant="screen" className="component-catalog-drawer">
                  <span className="control-label">Escolha um componente para inserir na loja</span>
                  <div className="component-catalog-grid">
                    {COMPONENT_LIBRARY.map(item => (
                      <div key={item.type} className="catalog-item-card">
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </div>
                        <HardwareButton
                          size="sm"
                          icon={<Plus size={13} />}
                          onClick={() => addComponent(item.type)}
                        >
                          Inserir
                        </HardwareButton>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              <div className="component-layer-list" role="list" aria-label="Componentes da vitrine">
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
                        <small>
                          0{index + 1} · {meta?.label || comp.type}
                        </small>
                        <strong>{comp.title.replace(/\n/g, ' ')}</strong>
                      </div>
                      <div className="layer-actions" onClick={e => e.stopPropagation()}>
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Mover para cima"
                          disabled={index === 0}
                          icon={<ArrowUp size={13} />}
                          onClick={() => moveComponent(comp.id, -1)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Mover para baixo"
                          disabled={index === full.components.length - 1}
                          icon={<ArrowDown size={13} />}
                          onClick={() => moveComponent(comp.id, 1)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label={comp.visible ? 'Ocultar componente' : 'Mostrar componente'}
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
                          aria-label="Duplicar componente"
                          icon={<Copy size={13} />}
                          onClick={() => duplicateComponent(comp.id)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Excluir componente"
                          icon={<Trash2 size={13} />}
                          onClick={() => removeComponent(comp.id)}
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
                      Editando: {COMPONENT_LIBRARY.find(m => m.type === selectedComponent.type)?.label}
                    </span>
                    <HardwareButton
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={13} />}
                      onClick={() => removeComponent(selectedComponent.id)}
                    >
                      Excluir seção
                    </HardwareButton>
                  </div>
                  <Stack gap={8}>
                    <Field
                      label="Título da seção"
                      value={selectedComponent.title}
                      onValueChange={v => updateSelectedComponent({ title: v })}
                    />
                    <Textarea
                      label="Subtítulo ou texto de apoio"
                      rows={2}
                      maxRows={4}
                      value={selectedComponent.subtitle}
                      onValueChange={v => updateSelectedComponent({ subtitle: v })}
                    />
                    {selectedComponent.type !== 'announcement' &&
                      selectedComponent.type !== 'benefits' &&
                      selectedComponent.type !== 'footer' && (
                        <Field
                          label="Texto do botão de ação (CTA)"
                          value={selectedComponent.ctaText || ''}
                          placeholder="Ex.: Explorar coleção"
                          onValueChange={v => updateSelectedComponent({ ctaText: v })}
                        />
                      )}
                    <div>
                      <span className="control-label">Variação de layout do componente</span>
                      <Stack direction="row" gap={4}>
                        {(['editorial', 'grid', 'minimal', 'highlight'] as ComponentVariant[]).map(variant => (
                          <HardwareButton
                            key={variant}
                            size="sm"
                            variant={selectedComponent.variant === variant ? 'primary' : 'neutral'}
                            onClick={() => updateSelectedComponent({ variant })}
                          >
                            {variant === 'editorial'
                              ? 'Editorial'
                              : variant === 'grid'
                                ? 'Grade'
                                : variant === 'minimal'
                                  ? 'Minimal'
                                  : 'Destaque'}
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
                  <h2>Categorias da Loja</h2>
                  <p>Organize suas coleções e seções de navegação.</p>
                </div>
              </div>

              <Panel variant="screen" className="maker-form-box">
                <span className="control-label">Nova Categoria</span>
                <Stack gap={8}>
                  <Field
                    label="Nome da categoria"
                    placeholder="Ex.: Relógios Autorais, Cerâmica, Bolsas…"
                    value={newCatName}
                    onValueChange={v => {
                      setNewCatName(v)
                      if (catError) setCatError('')
                    }}
                    error={catError || undefined}
                  />
                  <Field
                    label="Descrição curta"
                    placeholder="Ex.: Peças numeradas produzidas artesanalmente."
                    value={newCatDesc}
                    onValueChange={setNewCatDesc}
                  />
                  <HardwareButton
                    size="md"
                    variant="primary"
                    icon={<FolderPlus size={15} />}
                    onClick={handleAddCategory}
                  >
                    Adicionar categoria
                  </HardwareButton>
                </Stack>
              </Panel>

              <div className="component-layer-list">
                {full.categories.map((cat, idx) => {
                  const count = full.products.filter(p => p.categoryId === cat.id).length
                  return (
                    <div key={cat.id} className="component-layer-row">
                      <div className="layer-info">
                        <small>
                          /{cat.slug} · {count} {count === 1 ? 'produto' : 'produtos'}
                        </small>
                        <strong>{cat.name}</strong>
                        <p className="layer-subtext">{cat.description}</p>
                      </div>
                      <div className="layer-actions">
                        <HardwareButton
                          size="sm"
                          variant={previewCatFilter === cat.id ? 'primary' : 'ghost'}
                          onClick={() => setPreviewCatFilter(previewCatFilter === cat.id ? null : cat.id)}
                        >
                          {previewCatFilter === cat.id ? 'Filtrando' : 'Filtrar'}
                        </HardwareButton>
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Mover categoria para cima"
                          disabled={idx === 0}
                          icon={<ArrowUp size={13} />}
                          onClick={() => moveCategory(cat.id, -1)}
                        />
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label="Mover categoria para baixo"
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
                          onClick={() => handleDeleteCategory(cat.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'produtos' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Catálogo de Produtos</h2>
                  <p>Cadastre produtos, vincule categorias e atualize a vitrine em tempo real.</p>
                </div>
              </div>

              <Panel variant="screen" className="maker-form-box">
                <span className="control-label">Cadastrar Novo Produto</span>
                <Stack gap={8}>
                  <Field
                    label="Nome do produto"
                    placeholder="Ex.: Luminária Escultural Aura"
                    value={newProdName}
                    onValueChange={v => {
                      setNewProdName(v)
                      if (prodError) setProdError('')
                    }}
                    error={prodError || undefined}
                  />
                  <div className="maker-two-cols">
                    <Field
                      label="Preço de venda (R$)"
                      mono
                      value={newProdPrice}
                      onValueChange={setNewProdPrice}
                    />
                    <Field
                      label="Preço original (opcional)"
                      mono
                      value={newProdCompare}
                      onValueChange={setNewProdCompare}
                    />
                  </div>
                  <div className="maker-two-cols">
                    <Field
                      label="Estoque disponível"
                      mono
                      value={newProdStock}
                      onValueChange={setNewProdStock}
                    />
                    <Field
                      label="Selo de destaque"
                      placeholder="Ex.: Novo, Oferta"
                      value={newProdBadge}
                      onValueChange={setNewProdBadge}
                    />
                  </div>

                  <div>
                    <span className="control-label">Categoria do produto</span>
                    <div className="pill-selector-wrap">
                      {full.categories.map(cat => (
                        <HardwareButton
                          key={cat.id}
                          size="sm"
                          variant={newProdCatId === cat.id ? 'primary' : 'neutral'}
                          onClick={() => setNewProdCatId(cat.id)}
                        >
                          {cat.name}
                        </HardwareButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="control-label">Fotografia do produto</span>
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
                    size="md"
                    variant="primary"
                    icon={<PackagePlus size={15} />}
                    onClick={handleAddProduct}
                  >
                    Adicionar produto à vitrine
                  </HardwareButton>
                </Stack>
              </Panel>

              <div className="component-layer-list">
                {full.products.map(prod => {
                  const catName = full.categories.find(c => c.id === prod.categoryId)?.name || 'Sem categoria'
                  return (
                    <div key={prod.id} className="component-layer-row product-layer-row">
                      <img src={photo(prod.image, 160)} alt={prod.name} className="product-row-thumb" />
                      <div className="layer-info">
                        <small>
                          {catName} · SKU {prod.sku} · {prod.stock} un.
                        </small>
                        <strong>{prod.name}</strong>
                        <span className="product-row-price">{formatBRL(prod.price)}</span>
                      </div>
                      <div className="layer-actions">
                        <HardwareButton
                          size="sm"
                          variant="ghost"
                          iconOnly
                          aria-label={`Excluir produto ${prod.name}`}
                          icon={<Trash2 size={13} />}
                          onClick={() => handleDeleteProduct(prod.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'identidade' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>Identidade & Direção Visual</h2>
                  <p>Personalize nome, atmosfera, modelo estrutural e paleta da sua marca.</p>
                </div>
              </div>

              <Stack gap={10}>
                <Field
                  label="Nome da loja virtual"
                  value={full.name}
                  maxLength={60}
                  onValueChange={v =>
                    updateConfig({
                      name: v,
                      settings: { ...full.settings, slug: slugify(v) },
                    })
                  }
                />
                <Textarea
                  label="Manifesto / Apresentação da marca"
                  value={full.description}
                  maxLength={600}
                  rows={3}
                  maxRows={5}
                  onValueChange={v => updateConfig({ description: v })}
                />

                <div>
                  <span className="control-label">Modelo Base de Arquitetura</span>
                  <Stack direction="row" gap={6}>
                    {templates.map(t => (
                      <HardwareButton
                        key={t.id}
                        size="sm"
                        variant={full.template === t.id ? 'primary' : 'neutral'}
                        icon={full.template === t.id ? <Check size={13} /> : undefined}
                        onClick={() => updateConfig({ template: t.id, accent: t.accent })}
                      >
                        {t.name}
                      </HardwareButton>
                    ))}
                  </Stack>
                </div>

                <div>
                  <span className="control-label">Paleta Metálica & Editorial</span>
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
                    Cor personalizada (HEX)
                    <small>Contraste calculado automaticamente por luminância WCAG.</small>
                  </label>
                  <input
                    id="brand-color"
                    type="color"
                    value={full.accent}
                    onChange={e => updateConfig({ accent: e.target.value })}
                  />
                  <code>{full.accent.toUpperCase()}</code>
                </div>

                <Panel variant="screen" className="maker-form-box">
                  <span className="control-label">
                    <Sparkles size={12} style={{ display: 'inline', marginRight: 5 }} />
                    Assistente de Direção Criativa
                  </span>
                  <Textarea
                    label="Descreva a atmosfera desejada para sua loja"
                    placeholder="Ex.: Uma loja de relógios e objetos minimalistas com estética editorial escura…"
                    rows={2}
                    maxRows={4}
                    value={aiPrompt}
                    onValueChange={setAiPrompt}
                  />
                  <div style={{ marginTop: 10 }}>
                    <HardwareButton
                      size="sm"
                      icon={<Wand2 size={14} />}
                      onClick={handleApplyPromptSuggestion}
                    >
                      Sugerir combinação visual
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
                  <h2>Configurações da Loja</h2>
                  <p>Domínio, checkout, regras de frete, SEO e publicação.</p>
                </div>
              </div>

              <Stack gap={10}>
                <Field
                  label="Subdomínio Syndetis (.syndetis.app)"
                  mono
                  value={full.settings.slug}
                  onValueChange={v =>
                    updateConfig({ settings: { ...full.settings, slug: slugify(v) } })
                  }
                />

                <div className="maker-two-cols">
                  <Field
                    label="Frete grátis acima de (R$)"
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
                    label="Desconto no Pix (%)"
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
                    label="Parcelamento máx. sem juros"
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
                    label="WhatsApp de Atendimento"
                    value={full.settings.whatsapp}
                    onValueChange={v =>
                      updateConfig({ settings: { ...full.settings, whatsapp: v } })
                    }
                  />
                </div>

                <Field
                  label="Título SEO (Google & Redes Sociais)"
                  value={full.settings.seoTitle}
                  onValueChange={v =>
                    updateConfig({ settings: { ...full.settings, seoTitle: v } })
                  }
                />
                <Textarea
                  label="Descrição SEO (Meta Description)"
                  rows={2}
                  maxRows={4}
                  value={full.settings.seoDescription}
                  onValueChange={v =>
                    updateConfig({ settings: { ...full.settings, seoDescription: v } })
                  }
                />

                <Grid minItemWidth="10rem" gap={6}>
                  <Card
                    variant="screen"
                    size="sm"
                    title="Pix Instantâneo"
                    description={`${full.settings.pixDiscountPercent}% OFF automático no checkout`}
                    action={<Check size={14} />}
                  />
                  <Card
                    variant="screen"
                    size="sm"
                    title="Cartão de Crédito"
                    description={`Até ${full.settings.maxInstallments}x sem juros ativado`}
                    action={<Check size={14} />}
                  />
                </Grid>

                <Stack direction="row" gap={8}>
                  <HardwareButton
                    variant="primary"
                    icon={<Rocket size={15} />}
                    loading={publishing}
                    onClick={handlePublishStore}
                  >
                    Publicar e Sincronizar
                  </HardwareButton>
                  <HardwareButton icon={<Download size={15} />} onClick={handleExportJson}>
                    Exportar JSON
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
              <span className="status-pip" /> Prévia interativa ao vivo ·{' '}
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
                variant={!mobile ? 'primary' : 'neutral'}
                icon={<Monitor size={15} />}
                onClick={() => setMobile(false)}
              >
                Desktop
              </HardwareButton>
              <HardwareButton
                size="sm"
                variant={mobile ? 'primary' : 'neutral'}
                icon={<Smartphone size={15} />}
                onClick={() => setMobile(true)}
              >
                Celular
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
              Clique em qualquer seção dentro da tela para selecioná-la e editá-la no painel esquerdo.
            </span>
            <HardwareButton
              size="sm"
              href="#/dashboard"
              trailingIcon={<ArrowUpRight size={13} />}
            >
              Ir para o Dashboard de Vendas & Chat
            </HardwareButton>
          </div>
        </div>
      </div>
    </section>
  )
}
