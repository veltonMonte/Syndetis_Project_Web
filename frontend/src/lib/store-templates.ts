import {
  getStoreTemplate,
  type LayoutConfig,
  type StoreComponent,
  type StoreTemplate,
} from './maker'

/** Template content is neutral: a template never brings example products, categories or contacts. */
export function templateSections(
  name: string,
  id: StoreTemplate['id'],
): StoreComponent[] {
  const preset = getStoreTemplate(id)
  const content: Record<string, Partial<StoreComponent>> = {
    announcement: { title: 'Conheça as novidades da nossa loja', subtitle: '' },
    hero: {
      title:
        id === 'linha'
          ? 'Uma nova forma de descobrir sua marca.'
          : id === 'forma'
            ? 'Sua marca, em cada detalhe.'
            : id === 'presenca'
              ? 'Sua marca, vista de perto.'
              : id === 'impacto'
                ? 'O seu próximo destaque.'
                : id === 'horizonte'
                  ? 'Escolhas que fazem sentido.'
                  : 'Encontre o que faz parte do seu dia.',
      subtitle:
        'Apresente seus produtos e conte o que torna sua loja especial.',
      ctaText: 'Ver produtos',
    },
    categories: {
      title: 'Explore por categoria',
      subtitle: 'Organize seus produtos para facilitar a escolha.',
    },
    products: { title: 'Nossos produtos', subtitle: '' },
    'product-detail': {
      title: 'Conheça os detalhes',
      subtitle: 'Apresente o produto e suas informações principais.',
      ctaText: 'Adicionar à sacola',
    },
    'editorial-banner': {
      title: 'Uma história que merece ser contada.',
      subtitle:
        'Apresente a sua marca: de onde veio, o que oferece e o que a torna única.',
    },
    benefits: {
      title: 'Informações para comprar',
      subtitle:
        'Descreva as formas de pagamento.\nInforme os prazos de entrega.\nExplique sua política de trocas.',
    },
    footer: { title: name, subtitle: '' },
  }
  if (preset.cinematic) {
    content.hero = {
      ...content.hero,
      title: preset.cinematic.headline,
      subtitle: 'A sua seleção, em primeiro plano.',
      ctaText: 'Explorar produtos',
      imageFit: 'contain',
      imagePresentation: 'photo',
    }
    content.announcement = {
      title: 'Novidades, coleções e histórias da sua marca',
      subtitle: '',
    }
  }
  return preset.sections.map((type) => ({
    id: 'section-' + type,
    type,
    title: '',
    subtitle: '',
    visible: true,
    variant:
      type === 'hero' ? (id === 'forma' ? 'minimal' : 'editorial') : 'grid',
    ...content[type],
  }))
}

/** A template owns geometry and theme; merchant content stays independent. */
export function applyStoreTemplate(
  config: LayoutConfig,
  id: StoreTemplate['id'],
): LayoutConfig {
  const preset = getStoreTemplate(id)
  const oldPreset = getStoreTemplate(config.template)
  const oldDefaults = templateSections(config.name, oldPreset.id)
  const sections = templateSections(config.name, id).map((section) => {
    const previous = config.components?.find(item => item.type === section.type)
    if (!previous) return section
    const oldDefault = oldDefaults.find(item => item.type === section.type)
    // Only carry actual merchant edits; the old preset's stock copy is not an edit.
    const copy = (key: 'title' | 'subtitle' | 'ctaText') =>
      previous[key] !== oldDefault?.[key] ? previous[key] : section[key]
    return {
      ...section,
      title: copy('title') || '',
      subtitle: copy('subtitle') || '',
      ctaText: copy('ctaText'),
      ctaUrl: previous.ctaUrl,
      imageUrl: previous.imageUrl,
      imageAlt: previous.imageAlt,
      ...(previous.imageUrl ? {imagePresentation: previous.imagePresentation, imageFit: previous.imageFit} : {}),
      productId: previous.productId,
      productIds: previous.productIds,
      facts: previous.facts,
    }
  })
  return {
    ...config,
    template: id,
    accent: preset.accent,
    branding: config.branding?.logoUrl ? {logoUrl:config.branding.logoUrl} : {},
    components: sections,
  }
}
