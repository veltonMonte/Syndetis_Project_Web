import {
  getStoreTemplate,
  defaultSettings,
  type LayoutConfig,
  type StoreComponent,
  type StoreTemplate,
} from './maker'

/** Template content is neutral; example products belong only to gallery previews. */
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

export function templateDemo(
  id: StoreTemplate['id'],
  name = 'Sua marca',
): LayoutConfig {
  const preset = getStoreTemplate(id)
  return {
    version: 1,
    business: 'loja',
    template: id,
    name,
    description: '',
    accent: preset.accent,
    components: templateSections(name, id).map((section) => {
      if (!preset.cinematic) return section
      if (section.type === 'hero')
        return {
          ...section,
          imageUrl: preset.cinematic.artwork,
          imagePresentation: 'cutout',
          imageFit: 'contain',
          ...(preset.cinematic.layout === 'technical'
            ? {
                title: 'Modelo X250',
                subtitle: 'Exemplo de apresentação do produto: destaque os materiais, o acabamento e as informações que ajudam na escolha.',
                facts: [
                  { label: 'Autonomia · exemplo', value: '30 km' },
                  { label: 'Peso · exemplo', value: '13,5 kg' },
                  { label: 'Velocidade · exemplo', value: '25 km/h' },
                ],
              }
            : {}),
          imageAlt: preset.cinematic.alt,
        }
      if (section.type === 'announcement')
        return { ...section, title: 'Frete grátis · Campanha de demonstração' }
      return section
    }),
    settings: {
      ...defaultSettings,
      supportEmail: '',
      whatsapp: '',
      published: false,
      publishedAt: undefined,
    },
    categories: ['Coleção 01', 'Coleção 02', 'Coleção 03'].map((name, i) => ({
      id: 'demo-cat-' + i,
      name,
      slug: 'colecao-' + i,
      description: '',
      featured: true,
    })),
    products: [129, 189, 249, 89]
      .slice(0, id === 'forma' ? 3 : 4)
      .map((price, i) => ({
        id: 'demo-' + i,
        name:
          preset.cinematic?.layout === 'technical' && i === 0
            ? 'Modelo X250 · exemplo'
            : 'Produto de exemplo ' + (i + 1).toString().padStart(2, '0'),
        slug: 'exemplo-' + i,
        categoryId: 'demo-cat-' + (i % 3),
        price:
          preset.cinematic?.layout === 'technical' && i === 0 ? 750 : price,
        stock: 8,
        sku: '',
        image: ['catalog', 'mosaic', 'editorial'].includes(
          preset.cinematic?.layout || '',
        )
          ? [
              'photo-1523275335684-37898b6baf30',
              'photo-1505740420928-5e560c06d30e',
              'photo-1526170375885-4d8ecf77b99f',
              'photo-1513506003901-1e6a229e2d15',
            ][i]
          : preset.cinematic?.layout === 'technical' && i === 0
            ? preset.cinematic.artwork
            : '',
        featured: true,
        compareAtPrice: i === 2 ? 299 : undefined,
        ...(preset.collection
          ? {
              description:
                'Descrição demonstrativa: apresente características, medidas e materiais do produto.',
              options: [
                {
                  label: 'Variação',
                  values: ['Opção A', 'Opção B', 'Opção C'],
                },
              ],
              returnPolicy:
                'Texto demonstrativo. As regras de troca e devolução serão definidas pela loja.',
            }
          : {}),
      })),
  }
}

/** Apply a new structure, retaining matching content and the merchant's catalog. */
export function applyStoreTemplate(
  config: LayoutConfig,
  id: StoreTemplate['id'],
): LayoutConfig {
  const preset = getStoreTemplate(id)
  const sections = templateSections(config.name, id).map((section) => {
    const previous = config.components?.find(
      (item) => item.type === section.type,
    )
    return previous
      ? { ...previous, id: section.id, variant: section.variant, visible: true }
      : section
  })
  return {
    ...config,
    template: id,
    accent: preset.accent,
    components: sections,
  }
}
