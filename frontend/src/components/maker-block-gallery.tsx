import { Card } from '@/components/echo/card'
import { HardwareButton } from '@/components/echo/hardware-button'
import { COMPONENT_LIBRARY, type ComponentVariant, type StoreComponentType } from '@/lib/maker'

export const SECTION_NAMES: Record<StoreComponentType, string> = {
  announcement: 'Faixa de aviso', hero: 'Topo da loja', categories: 'Categorias', products: 'Produtos',
  'product-detail': 'Detalhes do produto', 'editorial-banner': 'Imagem e texto', benefits: 'Informações de compra',
  testimonials: 'Depoimentos', newsletter: 'Cadastro de e-mail', footer: 'Rodapé',
  text: 'Texto livre', image: 'Imagem', button: 'Botão', banner: 'Banner', spacer: 'Espaçador',
  divider: 'Divisor', countdown: 'Contagem regressiva',
}
const groups: { title: string; types: StoreComponentType[] }[] = [
  { title: 'Destaque', types: ['hero', 'announcement'] },
  { title: 'Produtos', types: ['products', 'product-detail', 'categories'] },
  { title: 'Conteúdo', types: ['editorial-banner', 'footer'] },
  { title: 'Conversão', types: ['benefits', 'testimonials', 'newsletter', 'countdown'] },
  { title: 'Elementos livres', types: ['text', 'image', 'button', 'banner', 'spacer', 'divider'] },
]
export function SectionSketch({ type, variant = 'editorial' }: { type: StoreComponentType; variant?: ComponentVariant }) {
  return <div className="maker-block-sketch" data-kind={type} data-variant={variant} aria-hidden="true"><span /><span /><span /><span /></div>
}
export function MakerBlockGallery({ onInsert }: { onInsert: (type: StoreComponentType) => void }) {
  return <div className="maker-block-gallery">{groups.map(group => <section key={group.title}>
    <h3>{group.title}</h3><div className="maker-block-options">{group.types.map(type => {
      const block = COMPONENT_LIBRARY.find(item => item.type === type)!
      return <Card key={type} variant="screen" headingLevel={4} title={SECTION_NAMES[type]} media={<SectionSketch type={type} />} footer={<HardwareButton fullWidth onClick={() => onInsert(type)}>Inserir {SECTION_NAMES[type]}</HardwareButton>} description={block.type === 'testimonials' ? 'Depoimentos reais que você recebeu de compradores.' : block.type === 'benefits' ? 'Condições de compra informadas pela sua loja.' : block.type === 'newsletter' ? 'Apresentação da sua lista de novidades.' : ['text', 'image', 'button', 'banner', 'spacer', 'divider', 'countdown'].includes(block.type) ? block.description : undefined} />
    })}</div>
  </section>)}</div>
}
