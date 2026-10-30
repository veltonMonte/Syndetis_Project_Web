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
    components: templateSections(name, id),
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
        name: 'Produto de exemplo ' + (i + 1).toString().padStart(2, '0'),
        slug: 'exemplo-' + i,
        categoryId: 'demo-cat-' + (i % 3),
        price,
        stock: 8,
        sku: '',
        image: '',
        featured: true,
        compareAtPrice: i === 2 ? 299 : undefined,
        ...(preset.collection === 'premium'
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
