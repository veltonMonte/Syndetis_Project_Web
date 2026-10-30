import { getStoreTemplate, type LayoutConfig } from './maker'
import type { Layout } from './types'

/** Serialize content rather than flattening all templates to the old skeleton. */
export function toCoreLayoutPayload(full: Required<LayoutConfig>): Layout {
  const preset = getStoreTemplate(full.template)
  const legacySkeleton =
    full.components.length === 3 &&
    full.components.every(
      (section, index) =>
        section.type === ['hero', 'products', 'footer'][index],
    )
  const templateId =
    !['editorial', 'organico', 'blank'].includes(full.template) &&
    !legacySkeleton
      ? preset.id
      : 'ecommerce'
  return {
    schemaVersion: 1,
    templateId,
    theme: {
      brandName: full.name,
      primaryColor: full.accent,
      backgroundColor: full.branding.backgroundColor || preset.background,
      textColor: full.branding.textColor || preset.ink,
      ...(full.branding.secondaryColor ? { secondaryColor: full.branding.secondaryColor } : {}),
      ...(full.branding.highlightColor ? { accentColor: full.branding.highlightColor } : {}),
      ...(full.branding.typeScale !== undefined ? { typeScale: String(full.branding.typeScale) } : {}),
      ...(full.branding.radius !== undefined ? { radius: String(full.branding.radius) } : {}),
      ...(full.branding.spacing !== undefined ? { spacing: String(full.branding.spacing) } : {}),
      headingFontFamily: full.branding.headingFontFamily || preset.headingFont,
      bodyFontFamily:
        full.branding.bodyFontFamily ||
        preset.bodyFont ||
        'DM Sans, Segoe UI, sans-serif',
      ...(full.branding.logoUrl ? { logoUrl: full.branding.logoUrl } : {}),
    },
    sections: full.components
      .filter((section) => section.visible)
      .map((section) => {
        if (section.type === 'hero')
          return {
            type: 'hero',
            title: section.title.slice(0, 160),
            subtitle: section.subtitle,
            ...(section.ctaText ? { buttonText: section.ctaText } : {}),
            ...(section.ctaUrl ? { buttonUrl: section.ctaUrl } : {}),
            ...(section.imageFit ? { imageFit: section.imageFit } : {}),
            ...(section.imagePresentation
              ? { imagePresentation: section.imagePresentation }
              : {}),
            ...(section.facts ? { facts: section.facts.slice(0, 3) } : {}),
            ...(section.productIds
              ? { productIds: section.productIds.slice(0, 3) }
              : {}),
            ...(section.imageUrl
              ? { imageUrl: section.imageUrl, imageAlt: section.imageAlt || '' }
              : {}),
          }
        if (section.type === 'product-detail')
          return {
            type: 'product-detail',
            title: section.title,
            description: section.subtitle,
            ...(section.productId ? { productId: section.productId } : {}),
            ...(section.ctaText ? { buttonText: section.ctaText } : {}),
          }
        if (section.type === 'products')
          return {
            type: 'product-grid',
            title: section.title,
            description: section.subtitle,
          }
        if (section.type === 'categories')
          return {
            type: 'category-list',
            title: section.title,
            description: section.subtitle,
          }
        if (
          section.type === 'announcement' ||
          section.type === 'editorial-banner' ||
          section.type === 'newsletter'
        )
          return {
            type: 'banner',
            title: section.title,
            description: section.subtitle,
            ...(section.ctaText ? { buttonText: section.ctaText } : {}),
            ...(section.ctaUrl ? { buttonUrl: section.ctaUrl } : {}),
          }
        if (section.type === 'benefits' || section.type === 'testimonials')
          return { type: 'text', title: section.title, body: section.subtitle }
        return {
          type: 'footer',
          text: section.title,
          copyright: section.subtitle,
        }
      }).map((section,index) => ({...section, id: full.components.filter(item => item.visible)[index].id, editorType: full.components.filter(item => item.visible)[index].type})),
  }
}
