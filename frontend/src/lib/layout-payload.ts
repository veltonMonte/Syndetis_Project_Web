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
      primaryColor: full.accent,
      backgroundColor: preset.background,
      textColor: preset.ink,
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
          }
        if (section.type === 'benefits' || section.type === 'testimonials')
          return { type: 'text', title: section.title, body: section.subtitle }
        return {
          type: 'footer',
          text: section.title,
          copyright: section.subtitle,
        }
      }),
  }
}
