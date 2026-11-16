import { toEditorDocument, type EditorDocument } from './editor-document'
import { templateSections } from './store-templates'
import {
  defaultSettings,
  ensureFullConfig,
  slugify,
  isKnownTemplate,
  getStoreTemplate,
  type LayoutConfig,
  type Template,
} from './maker'

export type CreationMode = 'blank' | 'template'
export interface MakerProject {
  version: 1
  mode: CreationMode
  config: LayoutConfig
  storeId?: string
  editorDocument?: EditorDocument
}
export interface MakerCapabilities {
  structuralEditing: boolean
  ai: boolean
  productLimit: number
  aiRemaining: number
  enforced: boolean
  layoutAdaptationRequired?: boolean
  planId: string
}
export interface MakerEntitlements {
  layoutAdaptationRequired?: boolean
  planId: string
  enforced: boolean
  capabilities: { structuralEditing: boolean; ai: boolean }
  products: { limit: number }
  ai: { remaining: number; limit: number }
}
export const BASIC_MAKER_CAPABILITIES: MakerCapabilities = {
  structuralEditing: false,
  ai: false,
  productLimit: 100,
  aiRemaining: 0,
  enforced: true,
  planId: 'STANDARD',
}
export const makerProjectKey = (userId: string) =>
  `syndetis-maker-project-v1:${encodeURIComponent(userId)}`
export const makerNameKey = (userId: string) =>
  `syndetis-maker-name-v1:${encodeURIComponent(userId)}`

export function readMakerProject(userId: string): MakerProject | null {
  try {
    const project = JSON.parse(
      localStorage.getItem(makerProjectKey(userId)) || 'null',
    ) as MakerProject | null
    if (!project || project.version !== 1 || !['blank', 'template'].includes(project.mode))
      return null
    const config = project.config
    if (
      !config ||
      typeof config.name !== 'string' ||
      typeof config.description !== 'string' ||
      !isKnownTemplate(config.template) ||
      !Array.isArray(config.components) ||
      !Array.isArray(config.categories) ||
      !Array.isArray(config.products)
    )
      return null
    const normalized = ensureFullConfig(config)
    normalized.components = normalized.components.map(section => section.type === 'footer' ? {...section,visible:true} : section)
    return { ...project, config: normalized }
  } catch {
    return null
  }
}
export function writeMakerProject(userId: string, project: MakerProject): boolean {
  try {
    let editorDocument: EditorDocument | undefined
    try { editorDocument = toEditorDocument(project.config) } catch { /* Preserve unfinished fields in the working draft. */ }
    localStorage.setItem(makerProjectKey(userId), JSON.stringify({...project,editorDocument}))
    return true
  } catch {
    return false
  }
}
export function initialStoreName(userId: string, existingName?: string) {
  if (existingName) return existingName
  try {
    return localStorage.getItem(makerNameKey(userId)) || 'Minha loja'
  } catch {
    return 'Minha loja'
  }
}
export function createMakerDraft(name: string, template: Template = 'blank'): LayoutConfig {
  const storeName = name.trim() || 'Minha loja'
  const preset = template === 'blank' ? null : getStoreTemplate(template)
  return {
    version: 1,
    business: 'loja',
    name: storeName,
    description: '',
    template: template === 'blank' ? 'blank' : getStoreTemplate(template).id,
    accent: preset?.accent || '#6857eb',
    categories: [],
    products: [],
    components: template === 'blank' ? [] : templateSections(storeName, getStoreTemplate(template).id),
    settings: {
      ...defaultSettings,
      slug: slugify(storeName),
      supportEmail: '',
      whatsapp: '',
      seoTitle: storeName,
      seoDescription: '',
      published: false,
      publishedAt: undefined,
    },
  }
}

export function canResumeMakerProject(
  project: MakerProject | null,
  capabilities: MakerCapabilities,
) {
  if (!project) return false
  if (capabilities.structuralEditing) return true
  if (project.mode !== 'template' || project.config.template === 'blank') return false
  const sections = project.config.components || []
  // Legacy drafts used a three-section skeleton; preserve their compatibility.
  const expected = ['editorial', 'organico'].includes(project.config.template) || (project.config.template === 'essencial' && sections.length === 3)
    ? ['hero', 'products', 'footer']
    : getStoreTemplate(project.config.template).sections
  return sections.length === expected.length && sections.every(
    (section, index) => section.visible && section.type === expected[index],
  )
}
