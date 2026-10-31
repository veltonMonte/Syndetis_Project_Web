import { MakerDeleteButton } from '@/components/maker-delete-button'
import { Dialog } from '@base-ui/react/dialog'
import { Modal } from '@/components/echo/modal'
import { MakerHistory, readMakerVersions, saveMakerVersion } from '@/lib/maker-history'
import { useMakerSync } from '@/lib/use-maker-sync'
import { canResumeMakerProject } from '@/lib/maker-project'
import { MakerTemplatePicker } from '@/components/maker-template-picker'
import { MakerBlockGallery, SectionSketch, SECTION_NAMES } from '@/components/maker-block-gallery'
import { MakerChecklist } from '@/components/maker-checklist'
import { MakerPublishReview } from '@/components/maker-publish-review'
import { Accordion } from '@/components/echo/accordion'
import { Select } from '@/components/echo/select'
import { applyStoreTemplate } from '@/lib/store-templates'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createEchoTheme } from 'echo-ui-core/theme'
import { useAppearance } from '@/lib/appearance-context'
import { MakerCanvas, type CanvasDevice } from '@/components/maker-canvas'
import { MakerStyleControls } from '@/components/maker-style-controls'
import { editorProblem, isSystemSection, toEditorDocument } from '@/lib/editor-document'
import './visual-maker.css'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Layers3,
  PackagePlus,
  Palette,
  Plus,
  Undo2,
  Redo2,
  History,
  Trash2,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Textarea } from '@/components/echo/textarea'
import { Panel } from '@/components/echo/panel'
import { Stack } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { AppearanceSettings } from '@/components/appearance-settings'
import { MakerPreview } from '@/components/maker-preview'
import type { MakerCapabilities } from '@/lib/maker-project'
import { StorePreview } from '@/components/store-preview'
import {
  COMPONENT_LIBRARY,
  ensureFullConfig,
  formatBRL,
  getStoreTemplate,
  photo,
  PRODUCT_IMAGE_PRESETS,
  slugify,
  type Template,
  type ComponentVariant,
  type LayoutConfig,
  type StoreCategory,
  type StoreComponent,
  type StoreComponentType,
  type StoreProduct,
} from '@/lib/maker'
import { errorMessage } from '@/lib/api'

type MakerTab = 'componentes' | 'categorias' | 'produtos' | 'identidade' | 'configuracoes'

export function MakerStudio({
  config,
  setConfig,
  capabilities,
  userId,
  storeId,
  onStoreSaved,
}: {
  config: LayoutConfig
  setConfig: (config: LayoutConfig) => void | boolean
  capabilities: MakerCapabilities
  userId: string
  storeId?: string
  onStoreSaved: (id: string) => void
}) {
  const full = ensureFullConfig(config)
  const toast = useToast()
  const controlSize = window.matchMedia('(pointer: coarse)').matches ? 'md' : 'sm'
  const { theme: appearance } = useAppearance()
  const editorTheme = useMemo(() => {
    const generated = createEchoTheme({ chassis: appearance === 'dark' ? '#1b1d21' : '#f4f5f7', paper: appearance === 'dark' ? '#f8f9fa' : '#17202a', accent: '#2457a7', finish: 0, radius: .4, pills: false, fontSans: 'Segoe UI, system-ui, sans-serif' })
    return Object.fromEntries(Object.entries(generated.values.roles).map(([key,value])=>['--echo-'+key,value])) as CSSProperties
  },[appearance])
  const [device, setDevice] = useState<CanvasDevice>(() => window.matchMedia('(max-width: 760px)').matches ? 'phone' : 'desktop')
  const sidebarRef = useRef<HTMLElement>(null)
  const [showMoreTools, setShowMoreTools] = useState(false)
  const latestConfig = useRef(full)
  latestConfig.current = full
  const historyRef = useRef<MakerHistory | null>(null)
  if (!historyRef.current) historyRef.current = new MakerHistory(full)
  const history = historyRef.current
  const [versions, setVersions] = useState(() => readMakerVersions(userId, storeId))
  const [insertBeforeId, setInsertBeforeId] = useState<string | undefined>(undefined)
  const [localSaveFailed, setLocalSaveFailed] = useState(false)
  const [versionSaveFailed, setVersionSaveFailed] = useState(false)


  const [activeTab, setActiveTab] = useState<MakerTab>('componentes')
  const [publishing, setPublishing] = useState(false)
  const publicationLock = useRef(false)

  // Component builder state
  const [selectedCompId, setSelectedCompId] = useState<string | null>(
    full.components.find(section => section.type === 'hero')?.id || full.components[0]?.id || null,
  )
  const [showComponentCatalog, setShowComponentCatalog] = useState(false)
  const draggedCompId = useRef<string | null>(null)

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

  const selectedComponent = full.components.find((c) => c.id === selectedCompId) || null
  const sync = useMakerSync(full, userId, storeId, onStoreSaved, !publishing && !localSaveFailed)
  const lastVersionAt = useRef(0)
  useEffect(() => {
    if (sync.phase === 'synced' && sync.savedAt && Date.now() - lastVersionAt.current > 30000) {
      lastVersionAt.current = Date.now()
      const saved = saveMakerVersion(userId, storeId, latestConfig.current, 'Salvamento automático')
      setVersionSaveFailed(!saved)
      if (saved) setVersions(readMakerVersions(userId, storeId))
    }
  }, [sync.phase, sync.savedAt, userId, storeId])

  function updateConfig(patch: Partial<LayoutConfig>, group = '') {
    if (publicationLock.current) return
    const next = ensureFullConfig({ ...latestConfig.current, ...patch, business: 'loja' })
    history.record(next, group)
    latestConfig.current = next
    setLocalSaveFailed(setConfig(next) === false)
  }
  function restoreSnapshot(snapshot: LayoutConfig, record = false) {
    if (publicationLock.current) return
    if (!canResumeMakerProject({version:1,mode:snapshot.template === 'blank' ? 'blank' : 'template',config:snapshot}, capabilities)) {
      toast({title:'Adequação necessária',body:'Este visual precisa ser adaptado ao template do seu plano antes de restaurar.'})
      return
    }
    if (record) history.record(snapshot)
    const current = latestConfig.current
    const next = ensureFullConfig({...snapshot,settings:{...snapshot.settings!,published:current.settings.published,publishedAt:current.settings.publishedAt}})
    latestConfig.current = next
    history.synchronize(next)
    setLocalSaveFailed(setConfig(next) === false)
    setSelectedCompId(next.components.find(section=>section.type==='hero')?.id || next.components[0]?.id || null)
  }
  function undo() { if(publicationLock.current) return; const snapshot = history.undo(); if(snapshot) restoreSnapshot(snapshot) }
  function redo() { if(publicationLock.current) return; const snapshot = history.redo(); if(snapshot) restoreSnapshot(snapshot) }
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (publicationLock.current) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input,textarea,[contenteditable="plaintext-only"],[contenteditable="true"],[role="dialog"]')) return
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); if(event.shiftKey) redo(); else undo() }
      else if (modifier && event.key.toLowerCase() === 'd' && selectedCompId) { event.preventDefault(); duplicateComponent(selectedCompId) }
      else if (event.key === 'Delete' && selectedCompId) { event.preventDefault(); removeComponent(selectedCompId) }
      else if (event.key === 'Escape') setSelectedCompId(null)
    }
    window.addEventListener('keydown',shortcut)
    return () => window.removeEventListener('keydown',shortcut)
  })

  function chooseTemplate(id: Template) {
    if (publicationLock.current) return
    try {
      localStorage.setItem('syndetis-maker-previous:' + encodeURIComponent(userId), JSON.stringify({ version: 1, mode: full.template === 'blank' ? 'blank' : 'template', config: full, storeId }))
    } catch {
      toast({ title: 'Não foi possível preservar o layout', body: 'Exporte uma cópia antes de trocar o modelo.' })
      return
    }
    setVersionSaveFailed(!saveMakerVersion(userId, storeId, full, 'Antes da troca de visual'))
    setVersions(readMakerVersions(userId, storeId))
    const next = applyStoreTemplate(full, getStoreTemplate(id).id)
    updateConfig(next)
    setSelectedCompId(next.components?.find(section => section.type === 'hero')?.id || next.components?.[0]?.id || null)
    toast({ title: 'Modelo ' + getStoreTemplate(id).name + ' aplicado', body: 'Estilo do modelo aplicado; catálogo, logo e textos personalizados preservados. O layout anterior ficou salvo neste navegador.' })
  }

  // --- Component Actions ---
  function addComponent(type: StoreComponentType) {
    if (!capabilities.structuralEditing) return
    const meta = COMPONENT_LIBRARY.find((item) => item.type === type) || COMPONENT_LIBRARY[0]
    const created: StoreComponent = {
      id: `comp-${type}-${Date.now().toString(36)}`,
      type,
      title: ['benefits','announcement','testimonials','newsletter'].includes(type) ? SECTION_NAMES[type] : meta.defaultTitle,
      subtitle: ['benefits','testimonials','newsletter','announcement'].includes(type) ? '' : meta.defaultSubtitle,
      ctaText: meta.defaultCta,
      variant: meta.defaultVariant,
      visible: true,
    }
    const nextComponents = [...full.components]
    const insertIndex = insertBeforeId ? nextComponents.findIndex(section => section.id === insertBeforeId) : nextComponents.findIndex(section => section.type === 'footer')
    nextComponents.splice(insertIndex < 0 ? nextComponents.length : insertIndex, 0, created)
    if (!nextComponents.some(section => section.type === 'footer'))
      nextComponents.push({id:'system-footer',type:'footer',title:full.name,subtitle:'',variant:'minimal',visible:true})
    updateConfig({ components: nextComponents })
    setSelectedCompId(created.id)
    setShowComponentCatalog(false)
    setInsertBeforeId(undefined)
    toast({
      title: 'Componente adicionado',
      body: `"${meta.label}" foi inserido na estrutura da sua loja.`,
    })
  }

  function removeComponent(id: string) {
    if (!capabilities.structuralEditing || full.components.some(c => c.id === id && isSystemSection(c))) return
    const target = full.components.find((c) => c.id === id)
    const originalIndex = full.components.findIndex((c) => c.id === id)
    const nextComponents = full.components.filter((c) => c.id !== id)
    updateConfig({ components: nextComponents })
    if (selectedCompId === id) {
      setSelectedCompId(nextComponents[0]?.id || null)
    }
    toast({
      title: 'Seção removida',
      body: <span>{target ? SECTION_NAMES[target.type] + ' removido.' : 'Seção removida.'} <HardwareButton size="sm" onClick={()=>{
        if (publicationLock.current || !target || latestConfig.current.components.some(section=>section.id===id)) return
        const currentSections = latestConfig.current.components
        const position = Math.min(originalIndex, currentSections.length)
        const restored = [...currentSections.slice(0, position), target, ...currentSections.slice(position)]
        updateConfig({components:restored})
        setSelectedCompId(id)
      }}>Desfazer</HardwareButton></span>,
    })
  }

  function duplicateComponent(id: string) {
    if (!capabilities.structuralEditing) return
    const index = full.components.findIndex((c) => c.id === id)
    if (index === -1 || isSystemSection(full.components[index])) return
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
    toast({
      title: 'Componente duplicado',
      body: 'A cópia foi adicionada logo abaixo do original.',
    })
  }

  function moveComponent(id: string, direction: -1 | 1) {
    if (!capabilities.structuralEditing) return
    const index = full.components.findIndex((c) => c.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= full.components.length) return
    const next = [...full.components]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    updateConfig({ components: next })
  }

  function handleDropComponent(targetId: string) {
    if (!capabilities.structuralEditing) return
    const sourceId = draggedCompId.current
    if (!sourceId || sourceId === targetId) return
    const fromIdx = full.components.findIndex((c) => c.id === sourceId)
    const toIdx = full.components.findIndex((c) => c.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...full.components]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved)
    updateConfig({ components: next })
    draggedCompId.current = null
  }

  function updateSelectedComponent(patch: Partial<StoreComponent>) {
    if (!selectedComponent || (patch.variant && !capabilities.structuralEditing)) return
    const next = full.components.map((c) =>
      c.id === selectedComponent.id ? { ...c, ...patch } : c,
    )
    updateConfig({ components: next }, 'section:' + selectedComponent.id + ':' + Object.keys(patch).join(','))
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
    if (!full.categories.length) setNewProdCatId(created.id)
    setNewCatName('')
    setNewCatDesc('')
    setCatError('')
    toast({ title: 'Categoria criada', body: `Categoria "${created.name}" adicionada à loja.` })
  }

  function handleDeleteCategory(id: string) {
    const target = full.categories.find((c) => c.id === id)
    updateConfig({ categories: full.categories.filter((c) => c.id !== id) })
    if (previewCatFilter === id) setPreviewCatFilter(null)
    toast({
      title: 'Categoria excluída',
      body: target ? `"${target.name}" foi removida.` : 'Categoria removida.',
    })
  }

  function moveCategory(id: string, direction: -1 | 1) {
    const idx = full.categories.findIndex((c) => c.id === id)
    const nextIdx = idx + direction
    if (idx < 0 || nextIdx < 0 || nextIdx >= full.categories.length) return
    const next = [...full.categories]
    const [moved] = next.splice(idx, 1)
    next.splice(nextIdx, 0, moved)
    updateConfig({ categories: next })
  }

  // --- Product Actions ---
  function handleAddProduct() {
    if (full.products.length >= capabilities.productLimit) {
      setProdError('Você atingiu o limite de produtos deste plano.')
      return
    }
    if (!full.categories.length) {
      setProdError('Crie uma categoria antes de adicionar o primeiro produto.')
      return
    }
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
      compareAtPrice:
        Number.isFinite(parsedCompare) && parsedCompare > parsedPrice ? parsedCompare : undefined,
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
    const target = full.products.find((p) => p.id === id)
    updateConfig({ products: full.products.filter((p) => p.id !== id) })
    toast({
      title: 'Produto removido',
      body: target ? `"${target.name}" foi excluído do catálogo.` : 'Produto excluído.',
    })
  }

  // --- Save & Publish ---
  async function handleSaveDraft() {
    try {
      const result = await sync.save()
      toast({title:result.syncedWithBackend ? 'Rascunho sincronizado' : 'Rascunho salvo localmente',body:result.syncedWithBackend ? 'Alterações confirmadas pelo servidor.' : result.error})
    } catch(error) { toast({title:'Não foi possível sincronizar',body:errorMessage(error)}) }
  }

  async function handlePublishStore() {
    if (publicationLock.current) return
    publicationLock.current = true
    setPublishing(true)
    try {
      const result = await sync.save(true)
      if (result.storeId) onStoreSaved(result.storeId)
      const published = ensureFullConfig({...latestConfig.current,settings:{...latestConfig.current.settings,slug:result.storeSlug || latestConfig.current.settings.slug,published:true,publishedAt:new Date().toISOString()}})
      latestConfig.current = published
      history.synchronize(published)
      setLocalSaveFailed(setConfig(published) === false)
      const versionSaved = saveMakerVersion(userId, result.storeId || storeId, latestConfig.current, 'Publicada')
      setVersionSaveFailed(!versionSaved)
      if (versionSaved) setVersions(readMakerVersions(userId, result.storeId || storeId))
      toast({
        title: 'Loja publicada com sucesso!',
        body: 'A versão publicada está disponível no link da sua loja.',
      })
    } catch (err) {
      toast({
        title: 'Não foi possível publicar a loja',
        body: errorMessage(err),
      })
    } finally {
      publicationLock.current = false
      setPublishing(false)
    }
  }

  function handleExportJson() {
    const problem = editorProblem(full)
    if (problem) { toast({title:'Confira o rascunho',body:problem}); return }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ ...full, editorDocument: toEditorDocument(full) }, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${full.settings.slug || 'syndetis-store'}-layout.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({
      title: 'Configuração exportada',
      body: 'Arquivo JSON completo baixado para o seu dispositivo.',
    })
  }

  return (
    <section className="maker-page maker-studio visual-maker" style={editorTheme}>
      {/* Top Studio Header */}
      <div className="maker-studio-header">
        <div className="visual-maker-title">
          <h1>Editor da loja</h1>
          <span className="visual-store-name">{full.name}</span>
        </div>
        <div className="maker-header-actions">
          <span className="visual-sync-status" role="status">{localSaveFailed ? 'Falha ao salvar neste navegador' : sync.phase === 'saving' ? 'Salvando no servidor…' : sync.phase === 'waiting' ? 'Salvo no navegador · sincronizando…' : sync.phase === 'synced' ? 'Salvo automaticamente às ' + new Date(sync.savedAt!).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : sync.phase === 'error' ? 'Salvo no navegador · servidor pendente' : 'Rascunho neste navegador'}</span>
          <HardwareButton icon={<Undo2 size={14}/>} disabled={!history.past.length || publishing} onClick={undo}>Desfazer</HardwareButton>
          <HardwareButton icon={<Redo2 size={14}/>} disabled={!history.future.length || publishing} onClick={redo}>Refazer</HardwareButton>
          <MakerTemplatePicker disabled={publishing} name={full.name} current={full.template} onChoose={chooseTemplate}/>
          <MakerPreview config={full} />
          {full.settings.published && <HardwareButton href={'#/lojas/'+encodeURIComponent(full.settings.slug)}>Abrir loja publicada</HardwareButton>}
          <MakerPublishReview config={full} previous={versions.find(version=>version.label === 'Publicada')?.config} publishing={publishing} onConfirm={handlePublishStore}/>
          <HardwareButton
            size={controlSize}
            href="#/dashboard"
            icon={<BarChart3 size={14} />}
            trailingIcon={<ArrowUpRight size={13} />}
          >
            Painel da loja
          </HardwareButton>
        </div>
      </div>

      <div className="maker-workspace-grid">
      {/* Studio Navigation Tabs */}
      <nav inert={publishing || undefined} className="maker-tabs-bar" aria-label="Personalizar sua loja">
        <HardwareButton size={controlSize} held={activeTab === 'identidade'} aria-pressed={activeTab === 'identidade'} icon={<Palette size={14} />} onClick={() => setActiveTab('identidade')}>Sua marca</HardwareButton>
        <HardwareButton size={controlSize} held={activeTab === 'componentes'} aria-pressed={activeTab === 'componentes'} icon={<Layers3 size={14} />} onClick={() => setActiveTab('componentes')}>Sua página</HardwareButton>

        <HardwareButton size={controlSize} variant="ghost" aria-expanded={showMoreTools} aria-controls="maker-more-tools" onClick={() => setShowMoreTools(value => !value)}>Mais ferramentas</HardwareButton>
        {showMoreTools && <div id="maker-more-tools" className="visual-more-tools">
          <p>Ferramentas de catálogo e configurações do rascunho.</p>
          <HardwareButton size={controlSize} held={activeTab === 'categorias'} onClick={() => setActiveTab('categorias')}>Categorias</HardwareButton>
          <HardwareButton size={controlSize} held={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')}>Produtos</HardwareButton>
          <HardwareButton size={controlSize} held={activeTab === 'configuracoes'} onClick={() => setActiveTab('configuracoes')}>Configurações da Loja</HardwareButton>
          <HardwareButton onClick={handleSaveDraft} loading={sync.phase === 'saving'}>Sincronizar agora</HardwareButton>
          <Modal title="Versões neste navegador" description="Até 10 cópias locais por conta e loja. Este histórico não é compartilhado entre dispositivos." trigger={<HardwareButton icon={<History size={14}/>}>Histórico local</HardwareButton>}>
            {versionSaveFailed && <p role="alert">Não foi possível guardar a última cópia do histórico neste navegador. O status de sincronização com o servidor aparece no topo do editor.</p>}
            {!versions.length ? <p>As versões aparecerão após sincronizar, publicar ou trocar de visual.</p> : <Stack gap={8}>{versions.map(version=><div key={version.id}><p>{version.label} · {new Date(version.savedAt).toLocaleString('pt-BR')}</p><Dialog.Close render={<HardwareButton onClick={()=>{restoreSnapshot(version.config, true)}}>Restaurar esta versão</HardwareButton>}/></div>)}</Stack>}
          </Modal>
        </div>}
      </nav>

        <aside inert={publishing || undefined} ref={sidebarRef} className="maker-sidebar" aria-label="Personalização da loja">
          <MakerChecklist config={full} onBrand={()=>setActiveTab('identidade')} onProducts={()=>{setShowMoreTools(true);setActiveTab('produtos')}}/>
          {activeTab === 'componentes' && (
            <div className="maker-panel-section">
              <div className="maker-panel-head">
                <div>
                  <h2>O que você quer editar?</h2>
                  <p>
                    {capabilities.structuralEditing
                      ? 'Escolha uma parte abaixo ou use o lápis na prévia.'
                      : 'Escolha uma parte e altere os textos e imagens. Seu plano mantém a estrutura do modelo.'}
                  </p>
                </div>
                <HardwareButton
                  size={controlSize}
                  icon={<Plus size={14} />}
                  disabled={!capabilities.structuralEditing}
                  onClick={() => setShowComponentCatalog((v) => !v)}
                >
                  {showComponentCatalog ? 'Fechar lista' : 'Adicionar seção'}
                </HardwareButton>
              </div>

              {showComponentCatalog && <MakerBlockGallery onInsert={addComponent}/>}

              <Select aria-label="Seção da página" value={selectedComponent?.id || ''} options={full.components.map((section, index) => ({ value: section.id, label: String(index + 1) + '. ' + SECTION_NAMES[section.type] + (section.visible ? '' : ' (oculta)') }))} onValueChange={id => { if (id) setSelectedCompId(id) }} />
              <Accordion><Accordion.Item value="sections"><Accordion.Trigger>Organizar seções</Accordion.Trigger><Accordion.Panel>
              <div className="component-layer-list" role="list" aria-label="Componentes da vitrine">
                {full.components.map((comp, index) => {
                  const isSelected = selectedComponent?.id === comp.id
                  return (
                    <div
                      key={comp.id}
                      role="listitem"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && event.altKey && ['ArrowUp','ArrowDown'].includes(event.key)) {
                          event.preventDefault()
                          moveComponent(comp.id,event.key === 'ArrowUp' ? -1 : 1)
                          return
                        }
                        if (
                          event.target === event.currentTarget &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault()
                          setSelectedCompId(comp.id)
                        }
                      }}
                      draggable={capabilities.structuralEditing}
                      onDragEnd={() => { draggedCompId.current = null }}
                      onDragStart={(event) => {
                        draggedCompId.current = comp.id
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', comp.id)
                        event.dataTransfer.setData('application/x-syndetis-section', comp.id)
                      }}
                      onDragOver={(event) => { event.preventDefault(); event.currentTarget.dataset.dropTarget = 'true' }}
                      onDragLeave={(event)=>{if(!event.currentTarget.contains(event.relatedTarget as Node | null))delete event.currentTarget.dataset.dropTarget}}
                      onDrop={(event) => { event.preventDefault(); delete event.currentTarget.dataset.dropTarget; handleDropComponent(comp.id) }}
                      className={`component-layer-row ${isSelected ? 'is-selected' : ''} ${!comp.visible ? 'is-hidden' : ''}`}
                    >
                      <span className="layer-grip" draggable={capabilities.structuralEditing} title="Arraste para reordenar">
                        <GripVertical size={14} />
                      </span>
                      <div className="layer-info">
                        <HardwareButton fullWidth variant="ghost" onClick={() => { setSelectedCompId(comp.id); setActiveTab('componentes') }}>
                        <small>{index + 1}. {SECTION_NAMES[comp.type]}{isSystemSection(comp) ? ' · Sistema' : ''}</small>
                        <strong>{comp.title.replace(/\n/g, ' ')}</strong>
                        </HardwareButton>
                      </div>
                      {isSelected && <div className="layer-actions">
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label="Mover para cima"
                          disabled={!capabilities.structuralEditing || index === 0}
                          icon={<ArrowUp size={13} />}
                          onClick={() => moveComponent(comp.id, -1)}
                        />
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label="Mover para baixo"
                          disabled={
                            !capabilities.structuralEditing || index === full.components.length - 1
                          }
                          icon={<ArrowDown size={13} />}
                          onClick={() => moveComponent(comp.id, 1)}
                        />
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label={comp.visible ? 'Ocultar componente' : 'Mostrar componente'}
                          icon={comp.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          disabled={!capabilities.structuralEditing || isSystemSection(comp)}
                          onClick={() => {
                            if (!capabilities.structuralEditing || isSystemSection(comp)) return
                            const next = full.components.map((c) =>
                              c.id === comp.id ? { ...c, visible: !c.visible } : c,
                            )
                            updateConfig({ components: next })
                          }}
                        />
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label="Duplicar componente"
                          icon={<Copy size={13} />}
                          disabled={!capabilities.structuralEditing || isSystemSection(comp)}
                          onClick={() => duplicateComponent(comp.id)}
                        />
                        <MakerDeleteButton label="Excluir componente" disabled={!capabilities.structuralEditing || isSystemSection(comp)} onRemove={()=>removeComponent(comp.id)}/>

                      </div>}
                    </div>
                  )
                })}
              </div>
              </Accordion.Panel></Accordion.Item></Accordion>


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
                    onValueChange={(v) => {
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
                  const count = full.products.filter((p) => p.categoryId === cat.id).length
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
                          size={controlSize}
                          variant={previewCatFilter === cat.id ? 'primary' : 'ghost'}
                          onClick={() =>
                            setPreviewCatFilter(previewCatFilter === cat.id ? null : cat.id)
                          }
                        >
                          {previewCatFilter === cat.id ? 'Filtrando' : 'Filtrar'}
                        </HardwareButton>
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label="Mover categoria para cima"
                          disabled={idx === 0}
                          icon={<ArrowUp size={13} />}
                          onClick={() => moveCategory(cat.id, -1)}
                        />
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label="Mover categoria para baixo"
                          disabled={idx === full.categories.length - 1}
                          icon={<ArrowDown size={13} />}
                          onClick={() => moveCategory(cat.id, 1)}
                        />
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label={`Excluir categoria ${cat.name}`}
                          icon={<Trash2 size={13} />}
                          onClick={() => { if (window.confirm('Excluir esta categoria?')) handleDeleteCategory(cat.id) }}
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
                    onValueChange={(v) => {
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
                      {full.categories.map((cat) => (
                        <HardwareButton
                          key={cat.id}
                          size={controlSize}
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
                      {PRODUCT_IMAGE_PRESETS.map((picture) => (
                        <HardwareButton key={picture.id} aria-label={picture.label} held={newProdImage === picture.id} onClick={() => setNewProdImage(picture.id)}>
                          <img src={photo(picture.id, 180)} alt="" />
                        </HardwareButton>
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
                {full.products.map((prod) => {
                  const catName =
                    full.categories.find((c) => c.id === prod.categoryId)?.name || 'Sem categoria'
                  return (
                    <div key={prod.id} className="component-layer-row product-layer-row">
                      <img
                        src={photo(prod.image, 160)}
                        alt={prod.name}
                        className="product-row-thumb"
                      />
                      <div className="layer-info">
                        <small>
                          {catName} · SKU {prod.sku} · {prod.stock} un.
                        </small>
                        <strong>{prod.name}</strong>
                        <span className="product-row-price">{formatBRL(prod.price)}</span>
                      </div>
                      <div className="layer-actions">
                        <HardwareButton
                          size={controlSize}
                          variant="ghost"
                          iconOnly
                          aria-label={`Excluir produto ${prod.name}`}
                          icon={<Trash2 size={13} />}
                          onClick={() => { if (window.confirm('Excluir este produto?')) handleDeleteProduct(prod.id) }}
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
                  <h2>Sua marca em toda a loja</h2>
                  <p>Comece pelo nome e pelo logo. Você pode mudar tudo depois.</p>
                </div>
              </div>

              <Stack gap={10}>
                <Field
                  label="Nome da loja virtual"
                  value={full.name}
                  maxLength={60}
                  onValueChange={(v) =>
                    updateConfig({ name: v })
                  }
                />
                <Textarea
                  label="Conte um pouco sobre a loja"
                  value={full.description}
                  maxLength={600}
                  rows={3}
                  maxRows={5}
                  onValueChange={(v) => updateConfig({ description: v })}
                />

                <Field label="Logo da loja (URL)" type="url" value={full.branding.logoUrl || ''} placeholder="https://..." onValueChange={logoUrl => updateConfig({ branding: { ...full.branding, logoUrl } })} />
                <MakerStyleControls config={full} onChange={updateConfig}/>
                <p>Modelo atual: <strong>{getStoreTemplate(full.template).name}</strong></p>
                <HardwareButton onClick={() => setActiveTab('componentes')}>Editar minha página</HardwareButton>
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
                <AppearanceSettings />
                <Field
                  label="Subdomínio Syndetis (.syndetis.app)"
                  mono
                  value={full.settings.slug}
                  onValueChange={(v) =>
                    updateConfig({ settings: { ...full.settings, slug: slugify(v) } })
                  }
                />

                <div className="maker-two-cols">
                  <Field
                    label="Frete grátis acima de (R$)"
                    mono
                    value={String(full.settings.freeShippingThreshold)}
                    onValueChange={(v) =>
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
                    onValueChange={(v) =>
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
                    onValueChange={(v) =>
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
                    onValueChange={(v) =>
                      updateConfig({ settings: { ...full.settings, whatsapp: v } })
                    }
                  />
                </div>

                <Field
                  label="Título SEO (Google & Redes Sociais)"
                  value={full.settings.seoTitle}
                  onValueChange={(v) =>
                    updateConfig({ settings: { ...full.settings, seoTitle: v } })
                  }
                />
                <Textarea
                  label="Descrição SEO (Meta Description)"
                  rows={2}
                  maxRows={4}
                  value={full.settings.seoDescription}
                  onValueChange={(v) =>
                    updateConfig({ settings: { ...full.settings, seoDescription: v } })
                  }
                />

                <p>Estas são preferências do rascunho. Confira a ativação de pagamentos e frete no painel antes de vender.</p>
                <Stack direction="row" gap={8}>

                  <HardwareButton icon={<Download size={15} />} onClick={handleExportJson}>
                    Exportar JSON
                  </HardwareButton>
                </Stack>
              </Stack>
            </div>
          )}
          {activeTab === 'componentes' && <div className="visual-inspector" aria-label="Editar seção">
              {selectedComponent && (
                <Panel variant="screen" className="component-inspector">
                  <div className="inspector-header">
                    <span className="control-label">
                      Editando:{' '}
                      {SECTION_NAMES[selectedComponent.type]}
                    </span>

                  </div>
                  <Stack gap={8}>
                    <Field
                      label="Título da seção"
                      value={selectedComponent.title}
                      onValueChange={(v) => updateSelectedComponent({ title: v })}
                    />
                    {selectedComponent.type === 'hero' && selectedComponent.title.length > 60 && <p role="status">Para o topo da loja, prefira um título de até 60 caracteres. Confira a quebra de linhas no celular.</p>}
                    <Textarea
                      label="Subtítulo ou texto de apoio"
                      rows={2}
                      maxRows={4}
                      value={selectedComponent.subtitle}
                      onValueChange={(v) => updateSelectedComponent({ subtitle: v })}
                    />
                    {selectedComponent.type !== 'announcement' &&
                      selectedComponent.type !== 'benefits' &&
                      selectedComponent.type !== 'footer' && (
                        <Field
                          label="Texto do botão"
                          value={selectedComponent.ctaText || ''}
                          placeholder="Ex.: Explorar coleção"
                          onValueChange={(v) => updateSelectedComponent({ ctaText: v })}
                        />
                      )}
                    {['hero','announcement','editorial-banner'].includes(selectedComponent.type) && <Accordion><Accordion.Item value="link"><Accordion.Trigger>Destino do botão</Accordion.Trigger><Accordion.Panel><Field label="Endereço do botão" type="url" value={selectedComponent.ctaUrl || ''} placeholder="https://..." description="Um endereço HTTP ou HTTPS. Não aceitamos scripts." onValueChange={ctaUrl => updateSelectedComponent({ctaUrl})} /></Accordion.Panel></Accordion.Item></Accordion>}
                    {selectedComponent.type === 'hero' && !!selectedComponent.imageUrl && !selectedComponent.imageAlt?.trim() && <p role="status">Adicione uma descrição da imagem para quem usa leitor de tela.</p>}
                    {selectedComponent.type === 'product-detail' && <div>
                      <span className="control-label" id="featured-product-label">Produto em destaque</span>
                      <Select aria-labelledby="featured-product-label" value={selectedComponent.productId || ''} onValueChange={productId => { if (productId !== null) updateSelectedComponent({ productId: productId || undefined }) }} options={[{ value: '', label: 'Primeiro produto do catálogo' }, ...full.products.map(product => ({ value: product.id, label: product.name }))]} />
                      {!full.products.length && <p>Cadastre produtos para preencher esta seção.</p>}
                    </div>}
                    {selectedComponent.type === 'hero' && getStoreTemplate(full.template).cinematic && !!full.products.length && <Accordion><Accordion.Item value="catalogue"><Accordion.Trigger>Usar fotos do catálogo</Accordion.Trigger><Accordion.Panel><Stack gap={6}>
                      <p>Escolha o produto que vai aparecer no destaque. O modelo Pulso combina até três produtos; os demais usam a primeira seleção. Fotos com fundo são aceitas. Remova a imagem de destaque para usar o catálogo.</p>
                      {(getStoreTemplate(full.template).cinematic?.layout === 'cinematic' ? [0, 1, 2] : [0]).map(index => <div key={index}>
                        <span className="control-label" id={'motion-product-label-' + index}>{'Produto ' + (index + 1) + ' da composição'}</span>
                        <Select aria-labelledby={'motion-product-label-' + index} disabled={!!selectedComponent.imageUrl || !full.products.length} value={selectedComponent.productIds?.[index] || ''} options={[{ value: '', label: 'Automático pelo catálogo' }, ...full.products.map(product => ({ value: product.id, label: product.name }))]} onValueChange={value => {
                          if (value === null) return
                          const productIds = Array.from({ length: getStoreTemplate(full.template).cinematic?.layout === 'cinematic' ? 3 : 1 }, (_, slot) => slot === index ? value || full.products[slot]?.id || '' : selectedComponent.productIds?.[slot] || full.products[slot]?.id || '').filter(Boolean)
                          updateSelectedComponent({ productIds })
                        }} />
                      </div>)}
                    </Stack></Accordion.Panel></Accordion.Item></Accordion>}
                    {selectedComponent.type === 'hero' && getStoreTemplate(full.template).cinematic && <Accordion><Accordion.Item value="photo"><Accordion.Trigger>Enquadramento e características</Accordion.Trigger><Accordion.Panel><Stack gap={6}>
                      <span className="control-label" id="showcase-image-presentation-label">Apresentação da imagem</span>
                      <Select aria-labelledby="showcase-image-presentation-label" value={selectedComponent.imagePresentation || 'photo'} options={[{ value: 'photo', label: 'Fotografia com fundo' }, { value: 'cutout', label: 'Produto recortado' }]} onValueChange={value => { if (value) updateSelectedComponent({ imagePresentation: value as 'photo' | 'cutout' }) }} />
                      <span className="control-label" id="showcase-image-fit-label">Enquadramento da foto</span>
                      <Select aria-labelledby="showcase-image-fit-label" value={selectedComponent.imageFit || 'contain'} options={[{ value: 'contain', label: 'Mostrar imagem inteira' }, { value: 'cover', label: 'Preencher quadro' }]} onValueChange={value => { if (value) updateSelectedComponent({ imageFit: value as 'contain' | 'cover' }) }} />
                      {getStoreTemplate(full.template).cinematic?.layout === 'technical' && <>
                        <span className="control-label">Características do produto</span>
                        {[0, 1, 2].map(index => <div className="maker-two-cols" key={index}>
                          <Field label={'Característica ' + (index + 1)} value={selectedComponent.facts?.[index]?.label || ''} maxLength={60} onValueChange={label => {
                            const facts = Array.from({ length: 3 }, (_, slot) => ({ label: selectedComponent.facts?.[slot]?.label || '', value: selectedComponent.facts?.[slot]?.value || '' }))
                            facts[index].label = label; updateSelectedComponent({ facts })
                          }} />
                          <Field label={'Valor ' + (index + 1)} value={selectedComponent.facts?.[index]?.value || ''} maxLength={120} onValueChange={value => {
                            const facts = Array.from({ length: 3 }, (_, slot) => ({ label: selectedComponent.facts?.[slot]?.label || '', value: selectedComponent.facts?.[slot]?.value || '' }))
                            facts[index].value = value; updateSelectedComponent({ facts })
                          }} />
                        </div>)}
                      </>}
                    </Stack></Accordion.Panel></Accordion.Item></Accordion>}
                    {selectedComponent.type === 'hero' && <>
                      <Field label="Imagem de destaque (URL)" type="url" value={selectedComponent.imageUrl || ''} placeholder="https://..." description="Use o endereço HTTPS de uma imagem da sua marca." onValueChange={imageUrl => updateSelectedComponent({ imageUrl })} />
                      <Field label="Descrição da imagem" value={selectedComponent.imageAlt || ''} onValueChange={imageAlt => updateSelectedComponent({ imageAlt })} />
                    </>}
                    <Accordion><Accordion.Item value="layout"><Accordion.Trigger>Mais opções desta seção</Accordion.Trigger><Accordion.Panel>                    <div>
                      <span className="control-label">Distribuição do conteúdo</span>
                      <Stack direction="row" gap={4}>
                        {(['editorial', 'grid', 'minimal', 'highlight'] as ComponentVariant[]).map(
                          (variant) => (
                            <HardwareButton
                              key={variant}
                              size={controlSize}
                              variant={
                                selectedComponent.variant === variant ? 'primary' : 'neutral'
                              }
                              disabled={!capabilities.structuralEditing}
                              onClick={() => updateSelectedComponent({ variant })}
                            >
                              <SectionSketch type={selectedComponent.type} variant={variant}/>
                              {variant === 'editorial'
                                ? 'Editorial'
                                : variant === 'grid'
                                  ? 'Grade'
                                  : variant === 'minimal'
                                    ? 'Minimal'
                                    : 'Destaque'}
                            </HardwareButton>
                          ),
                        )}
                      </Stack>
                    </div>          <Stack gap={8}>
            <h3>{selectedComponent?.title || 'Selecione uma seção'}</h3>
            <p>A página se adapta ao celular automaticamente. Abra Organizar seções para mover, ocultar ou duplicar partes da página.</p>
            {!capabilities.structuralEditing && <p>A estrutura do template é preservada no plano Básico.</p>}
            {selectedComponent && <Stack direction="row" gap={6}>
              <HardwareButton disabled={!capabilities.structuralEditing || full.components[0]?.id === selectedComponent.id} onClick={() => moveComponent(selectedComponent.id,-1)}>Subir seção</HardwareButton>
              <HardwareButton disabled={!capabilities.structuralEditing || full.components.at(-1)?.id === selectedComponent.id} onClick={() => moveComponent(selectedComponent.id,1)}>Descer seção</HardwareButton>
            </Stack>}
          </Stack>
                    <MakerDeleteButton disabled={!capabilities.structuralEditing || isSystemSection(selectedComponent)} onRemove={()=>removeComponent(selectedComponent.id)}/></Accordion.Panel></Accordion.Item></Accordion>
                  </Stack>
                </Panel>
              )}
          {editorProblem(full) && <p role="alert">{editorProblem(full)}</p>}
        </div>}
        </aside>

        <div className="visual-preview-area" inert={publishing || undefined}>
        <div className="visual-device-switch" role="group" aria-label="Dispositivo do canvas">
          {([['desktop','Computador'], ['tablet','Tablet'], ['phone','Celular']] as const).map(([value,label]) => <HardwareButton key={value} held={device === value} aria-pressed={device === value} onClick={() => setDevice(value)}>{label}</HardwareButton>)}
        </div>

        {sync.phase === 'error' && <div className="maker-sync-problem" role="alert"><p>{sync.error}</p><HardwareButton onClick={handleSaveDraft}>Tentar sincronizar</HardwareButton></div>}
        <MakerCanvas device={device} onDeselect={()=>setSelectedCompId(null)}>
            {full.components.some((component) => component.visible) ? (
              <StorePreview
                config={full}
                selectedComponentId={selectedCompId}
                onSelectComponent={(id, inline) => {
                  setSelectedCompId(id)
                  setActiveTab('componentes')
                  if (!inline && window.matchMedia('(max-width: 760px)').matches) {
                    requestAnimationFrame(() => sidebarRef.current?.scrollIntoView({ block: 'start' }))
                  }
                }}
                onChangeComponent={(id,patch)=>updateConfig({components:latestConfig.current.components.map(section=>section.id===id ? {...section,...patch} : section)},'inline:'+id+':'+Object.keys(patch).join(','))}
                onDropSection={capabilities.structuralEditing ? (sourceId,targetId)=>{draggedCompId.current=sourceId;handleDropComponent(targetId)} : undefined}
                renderSectionTools={section=><div className="maker-floating-tools" data-visible={selectedCompId === section.id || undefined}>
                  <span className="maker-block-name">{SECTION_NAMES[section.type]}</span>
                  {selectedCompId === section.id && <>
                    {capabilities.structuralEditing && <span className="maker-canvas-drag" draggable title="Arraste esta seção para a posição desejada" onDragStart={event=>{event.dataTransfer.setData('application/x-syndetis-section',section.id);event.dataTransfer.effectAllowed='move'}}><GripVertical size={14} aria-hidden="true"/>Mover</span>}
                    <HardwareButton size="sm" disabled={!capabilities.structuralEditing || isSystemSection(section)} onClick={()=>duplicateComponent(section.id)}>Duplicar</HardwareButton>
                    <MakerDeleteButton label="Excluir" disabled={!capabilities.structuralEditing || isSystemSection(section)} onRemove={()=>removeComponent(section.id)}/>
                  </>}
                </div>}
                renderInsert={capabilities.structuralEditing ? beforeId=><div className="maker-insert-point"><HardwareButton size="sm" icon={<Plus size={12}/>} aria-label={beforeId ? 'Inserir seção antes de '+SECTION_NAMES[full.components.find(section=>section.id===beforeId)!.type] : 'Inserir seção no final'} onClick={()=>{setInsertBeforeId(beforeId);setShowComponentCatalog(true);setActiveTab('componentes');sidebarRef.current?.scrollTo({top:0})}}>Inserir aqui</HardwareButton></div> : undefined}
                activeCategoryFilter={previewCatFilter}
              />
            ) : (
              <div className="maker-canvas-empty">
                <Layers3 size={30} aria-hidden="true" />
                <h2 className="maker-canvas-title">Sua página está em branco.</h2>
                <p>Adicione a primeira seção e monte a loja no seu ritmo.</p>
                <HardwareButton
                  variant="primary"
                  disabled={!capabilities.structuralEditing}
                  onClick={() => {
                    setActiveTab('componentes')
                    setShowComponentCatalog(true)
                  }}
                >
                  Adicionar primeira seção
                </HardwareButton>
              </div>
            )}
        </MakerCanvas>
        </div>

      </div>
    </section>
  )
}
