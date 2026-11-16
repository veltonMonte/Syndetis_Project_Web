import { defaultSettings, getStoreTemplate, isKnownTemplate, type LayoutConfig, type StoreComponentType } from './maker'
import type { Category, PublicStore, Product } from './types'
const backendTypes: Record<string, StoreComponentType> = { hero:'hero', 'product-grid':'products', 'product-detail':'product-detail', 'category-list':'categories', text:'benefits', footer:'footer', banner:'editorial-banner' }
const knownTypes = new Set(['announcement','hero','categories','products','product-detail','editorial-banner','benefits','testimonials','newsletter','footer'])
export function publishedLayout(store: PublicStore, products: Product[], categories: Category[] = []): LayoutConfig {
  const layout = store.layout
  const template = isKnownTemplate(layout.templateId) ? layout.templateId : 'linha'
  const preset = getStoreTemplate(template)
  const theme = layout.theme
  return {
    version:1, business:'loja', name:theme.brandName || store.name, description:'', template, accent:theme.primaryColor,
    branding:{backgroundColor:theme.backgroundColor, textColor:theme.textColor, secondaryColor:theme.secondaryColor, highlightColor:theme.accentColor, headingFontFamily:theme.headingFontFamily,bodyFontFamily:theme.bodyFontFamily,logoUrl:theme.logoUrl,typeScale:theme.typeScale ? Number(theme.typeScale) : 1,radius:theme.radius ? Number(theme.radius) : preset.radius,spacing:theme.spacing ? Number(theme.spacing) : 0},
    settings:{...defaultSettings,slug:store.slug,published:true,supportEmail:'',whatsapp:''},categories:categories.map(category=>({...category,description:'',featured:true})),
    products:products.map(product=>({id:product.id,name:product.name,slug:product.id,description:product.description || '',price:product.price,image:product.imageUrl || '',stock:product.available,categoryId:product.categoryId || '',sku:product.sku,featured:true})),
    components:layout.sections.map((section,index)=>{
      const expected = layout.sections.length === preset.sections.length ? preset.sections[index] : undefined
      const matchesLegacyType =
        (section.type === 'banner' && (expected === 'announcement' || expected === 'editorial-banner' || expected === 'newsletter')) ||
        (section.type === 'text' && (expected === 'benefits' || expected === 'testimonials'))
      const type = section.editorType && knownTypes.has(section.editorType) ? section.editorType
        : matchesLegacyType ? expected
        : section.type === 'banner' && index === 0 ? 'announcement' : backendTypes[section.type] || 'editorial-banner'
      return {
        id:section.id || 'published-'+index, type:type as StoreComponentType,
        title:section.title || section.text || '',subtitle:section.subtitle || section.description || section.body || section.copyright || '',
        ctaText:section.buttonText,ctaUrl:section.buttonUrl,imageUrl:section.imageUrl,imageAlt:section.imageAlt,productId:section.productId,productIds:section.productIds,imageFit:section.imageFit,imagePresentation:section.imagePresentation,facts:section.facts,visible:true,variant:'editorial',
      }
    }),
  }
}
