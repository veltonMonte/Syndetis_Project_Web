import { z } from 'zod'
import { getStoreTemplate, type LayoutConfig, type StoreComponent } from './maker'

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use uma cor hexadecimal com seis dígitos.')
export const safeUrl = z.string().max(2048, 'Use um endereço com até 2.048 caracteres.').refine(value => {
  if (!value) return true
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}, 'Use um endereço HTTP ou HTTPS válido.')
export const themeSchema = z.object({
  primary: color, secondary: color, background: color, text: color, highlight: color,
  headingFont: z.string().min(1).max(120), bodyFont: z.string().min(1).max(120),
  typeScale: z.number().min(.8).max(1.4), radius: z.number().min(0).max(1),
  spacing: z.number().int().min(0).max(64),
})
export const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['heading', 'text', 'image', 'button']),
  props: z.object({ text: z.string().max(10000, 'Use até 10.000 caracteres.').optional(), url: safeUrl.optional(), alt: z.string().max(500, 'Use até 500 caracteres na descrição.').optional() }),
})
export const sectionSchema = z.object({
  id: z.string().min(1), type: z.string().min(1), locked: z.boolean(),
  visible: z.boolean(), blocks: z.array(blockSchema).max(4),
})
export const editorDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  page: z.object({ name: z.string().min(1).max(120), sections: z.array(sectionSchema).max(100) }),
  theme: themeSchema,
}).superRefine((doc, ctx) => {
  if (new Set(doc.page.sections.map(section => section.id)).size !== doc.page.sections.length)
    ctx.addIssue({ code: 'custom', message: 'As seções precisam de identificadores únicos.' })
  if (doc.page.sections.some(section => section.type === 'footer' && !section.visible))
    ctx.addIssue({ code: 'custom', message: 'O rodapé de sistema deve permanecer visível.' })
})
export type EditorDocument = z.infer<typeof editorDocumentSchema>
export const isSystemSection = (section: StoreComponent) => section.type === 'footer'
/** Versioned projection of the phase-one content slots. API v1 remains compatible. */
export function toEditorDocument(config: LayoutConfig): EditorDocument {
  const preset = getStoreTemplate(config.template)
  const brand = config.branding || {}
  return editorDocumentSchema.parse({
    schemaVersion: 1,
    page: { name: config.name, sections: (config.components || []).map(section => ({
      id: section.id, type: section.type, locked: isSystemSection(section),
      visible: section.visible,
      blocks: [
        { id: section.id + '-title', type: 'heading', props: { text: section.title } },
        { id: section.id + '-text', type: 'text', props: { text: section.subtitle } },
        ...(section.imageUrl ? [{ id: section.id + '-image', type: 'image', props: { url: section.imageUrl, alt: section.imageAlt || '' } }] : []),
        ...(section.ctaText ? [{ id: section.id + '-button', type: 'button', props: { text: section.ctaText, url: section.ctaUrl || '' } }] : []),
      ],
    })) },
    theme: {
      primary: config.accent, secondary: brand.secondaryColor || preset.accent,
      background: brand.backgroundColor || preset.background, text: brand.textColor || preset.ink,
      highlight: brand.highlightColor || config.accent,
      headingFont: brand.headingFontFamily || preset.headingFont,
      bodyFont: brand.bodyFontFamily || preset.bodyFont || 'DM Sans, Segoe UI, sans-serif',
      typeScale: brand.typeScale ?? 1, radius: brand.radius ?? preset.radius, spacing: brand.spacing ?? 0,
    },
  })
}
export function editorProblem(config: LayoutConfig) {
  try { toEditorDocument(config); if (config.branding?.logoUrl) safeUrl.parse(config.branding.logoUrl); return '' }
  catch (error) { return error instanceof z.ZodError ? error.issues[0].message : 'Confira os dados da loja.' }
}
