import {
  defaultSettings,
  ensureFullConfig,
  slugify,
  templates,
  type LayoutConfig,
  type Template,
} from './maker'

export type CreationMode = 'blank' | 'template'
export interface MakerProject {
  version: 1
  mode: CreationMode
  config: LayoutConfig
  storeId?: string
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
      !['blank', ...templates.map((item) => item.id)].includes(config.template) ||
      !Array.isArray(config.components) ||
      !Array.isArray(config.categories) ||
      !Array.isArray(config.products)
    )
      return null
    return { ...project, config: ensureFullConfig(config) }
  } catch {
    return null
  }
}
export function writeMakerProject(userId: string, project: MakerProject): boolean {
  try {
    localStorage.setItem(makerProjectKey(userId), JSON.stringify(project))
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
  const preset = templates.find((item) => item.id === template)
  return {
    version: 1,
    business: 'loja',
    name: storeName,
    description: '',
    template,
    accent: preset?.accent || '#6857eb',
    categories: [],
    products: [],
    components:
      template === 'blank'
        ? []
        : [
            {
              id: 'section-hero',
              type: 'hero',
              title: `Conheça ${storeName}`,
              subtitle: 'Conte aqui o que torna sua marca especial.',
              ctaText: 'Ver produtos',
              visible: true,
              variant: template === 'editorial' ? 'editorial' : 'minimal',
            },
            {
              id: 'section-products',
              type: 'products',
              title: 'Nossos produtos',
              subtitle: '',
              visible: true,
              variant: 'grid',
            },
            {
              id: 'section-footer',
              type: 'footer',
              title: storeName,
              subtitle: '',
              visible: true,
              variant: 'minimal',
            },
          ],
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
  return (
    sections.length === 3 &&
    sections.every(
      (section, index) => section.visible && section.type === ['hero', 'products', 'footer'][index],
    )
  )
}
