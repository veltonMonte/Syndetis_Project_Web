import { z } from 'zod'
import { colorSchema, entityIdSchema, httpsUrlSchema, isVisibleEverywhere, nodeIdSchema, plainTextSchema, revisionSchema, systemVisibilitySchema, visibilitySchema } from './primitives.ts'

export const pageTypes = ['home','category','product','search','cart','checkout','order-success','order-tracking','login','register','password-recovery','account','institutional','not-found','unavailable'] as const
export const mvpPageTypes = pageTypes.slice(0,8)
export const pageTypeSchema = z.enum(pageTypes)
export const templateIds = ['linha','forma','essencial','presenca','impacto','horizonte','pulso','ambar','aurora','prisma','vetor','eon'] as const
export const pageTargetSchema = z.discriminatedUnion('page',[
  z.strictObject({page:z.literal('home')}),
  z.strictObject({page:z.literal('category'),categoryId:entityIdSchema}),
  z.strictObject({page:z.literal('product'),productId:entityIdSchema}),
  z.strictObject({page:z.literal('search'),query:z.string().max(200)}),
  z.strictObject({page:z.literal('cart')}),
  z.strictObject({page:z.literal('checkout')}),
  z.strictObject({page:z.literal('account')}),
  z.strictObject({page:z.literal('login')}),
  z.strictObject({page:z.literal('register')}),
  z.strictObject({page:z.literal('password-recovery')}),
  z.strictObject({page:z.literal('institutional'),pageId:entityIdSchema}),
])
export const buttonActionSchema = z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('navigate'),target:pageTargetSchema}),
  z.strictObject({type:z.literal('open-cart')}),
  z.strictObject({type:z.literal('add-to-cart'),source:z.literal('current-product')}),
  z.strictObject({type:z.literal('scroll'),sectionId:nodeIdSchema}),
  z.strictObject({type:z.literal('whatsapp'),message:z.string().max(1000)}),
  z.strictObject({type:z.literal('instagram')}),
  z.strictObject({type:z.literal('external'),url:httpsUrlSchema,advanced:z.literal(true),acknowledgeExternal:z.literal(true)}),
])
const tokenColorSchema = z.union([colorSchema,z.enum(['primary','secondary','background','text','highlight'])])
const spaceSchema = z.union([z.literal(0),z.literal(4),z.literal(8),z.literal(12),z.literal(16),z.literal(24),z.literal(32),z.literal(48),z.literal(64)])
export const styleSchema = z.strictObject({
  color:tokenColorSchema.optional(),backgroundColor:tokenColorSchema.optional(),
  fontSize:z.number().int().min(8).max(144).optional(),weight:z.enum(['regular','medium','semibold','bold']).optional(),
  align:z.enum(['left','center','right']).optional(),verticalAlign:z.enum(['top','middle','bottom']).optional(),
  padding:spaceSchema.optional(),margin:spaceSchema.optional(),width:z.enum(['contained','full']).optional(),
  border:z.enum(['none','thin','medium']).optional(),borderColor:tokenColorSchema.optional(),
  radius:z.enum(['none','small','medium','large','pill']).optional(),shadow:z.enum(['none','subtle','raised']).optional(),
})
const overrideSchema = z.strictObject({desktop:styleSchema.optional(),tablet:styleSchema.optional(),mobile:styleSchema.optional()})
const baseBlockFields = {
  id:nodeIdSchema,locked:z.boolean(),visibility:visibilitySchema,style:styleSchema,overrides:overrideSchema,
}
export const productsBindingSchema = z.strictObject({
  source:z.literal('products'),selection:z.discriminatedUnion('type',[
    z.strictObject({type:z.literal('all')}),
    z.strictObject({type:z.literal('category'),categoryId:entityIdSchema}),
    z.strictObject({type:z.literal('collection'),collectionId:entityIdSchema}),
  ]),
  sort:z.enum(['manual','newest','price-asc','price-desc','best-selling']),limit:z.number().int().min(1).max(100),
})
export const dataBindingSchema = z.discriminatedUnion('source',[
  productsBindingSchema,
  z.strictObject({source:z.literal('product'),productId:entityIdSchema}),
  z.strictObject({source:z.literal('current-product')}),
  z.strictObject({source:z.literal('current-category')}),
  z.strictObject({source:z.literal('categories'),categoryIds:z.array(entityIdSchema).max(100)}),
  z.strictObject({source:z.literal('notices'),noticeIds:z.array(entityIdSchema).max(100)}),
  z.strictObject({source:z.literal('current-page-content')}),
  z.strictObject({source:z.literal('page-content'),pageId:entityIdSchema}),
  z.strictObject({source:z.literal('reviews'),product:z.enum(['current','store'])}),
])
export const systemRoles = ['cart-control','legal-footer','verification','report-store','price','buy','shipping','checkout-fields','cart-lines','cart-summary','order-summary','order-tracking','auth-fields','account-fields'] as const
const systemStyleSchema = styleSchema.refine(style=>style.fontSize===undefined || style.fontSize>=14,'Texto de sistema deve ter pelo menos 14 px.')
const systemOverridesSchema = z.strictObject({desktop:systemStyleSchema.optional(),tablet:systemStyleSchema.optional(),mobile:systemStyleSchema.optional()})
export const systemBlockSchema = z.strictObject({
  id:nodeIdSchema,type:z.literal('system'),role:z.enum(systemRoles),
  locked:z.literal(true),visibility:systemVisibilitySchema,
  style:systemStyleSchema,overrides:systemOverridesSchema,
})
const buttonBlockSchema = z.strictObject({
  ...baseBlockFields,type:z.literal('button'),
  props:z.strictObject({label:z.string().min(1).max(100),variant:z.enum(['primary','secondary','text']),action:buttonActionSchema}),
})
export const navigationBlockSchema = z.strictObject({
  ...baseBlockFields,type:z.literal('navigation'),props:z.strictObject({items:z.array(pageTargetSchema).max(20),presentation:z.enum(['inline','drawer'])}),
})
const dataBlockSchema = z.strictObject({
  ...baseBlockFields,type:z.literal('data'),
  component:z.enum(['product-grid','category-list','notice-strip','notice-popup','product-gallery','product-description','product-reviews','related-products','page-content']),
  binding:dataBindingSchema,
})
const slideSchema = z.strictObject({id:nodeIdSchema,assetId:entityIdSchema,title:z.string().max(160),text:z.string().max(1000),button:z.strictObject({label:z.string().max(100),action:buttonActionSchema}).nullable()})
export const blockSchema = z.discriminatedUnion('type',[
  systemBlockSchema,buttonBlockSchema,dataBlockSchema,navigationBlockSchema,
  z.strictObject({...baseBlockFields,type:z.literal('heading'),props:z.strictObject({text:z.string().max(300),level:z.enum(['h1','h2','h3','h4'])})}),
  z.strictObject({...baseBlockFields,type:z.literal('text'),props:z.strictObject({text:plainTextSchema,format:z.literal('plain-text')})}),
  z.strictObject({...baseBlockFields,type:z.literal('image'),props:z.strictObject({assetId:entityIdSchema,altOverride:z.string().max(500).optional()})}),
  z.strictObject({...baseBlockFields,type:z.literal('gallery'),props:z.strictObject({assetIds:z.array(entityIdSchema).max(30),columns:z.number().int().min(1).max(4)})}),
  z.strictObject({...baseBlockFields,type:z.literal('video'),props:z.strictObject({provider:z.enum(['youtube','vimeo']),videoId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),title:z.string().min(1).max(160)})}),
  z.strictObject({...baseBlockFields,type:z.literal('banner'),props:z.strictObject({title:z.string().max(300),text:z.string().max(1000),assetId:entityIdSchema.nullable(),action:buttonActionSchema.nullable()})}),
  z.strictObject({...baseBlockFields,type:z.literal('carousel'),props:z.strictObject({
    slides:z.array(slideSchema).max(20),autoplay:z.boolean().default(false),intervalSeconds:z.number().int().min(5).max(60).default(8),
    itemsPerView:z.strictObject({desktop:z.number().int().min(1).max(6),tablet:z.number().int().min(1).max(4),mobile:z.number().int().min(1).max(2)}),
  })}),
  z.strictObject({...baseBlockFields,type:z.literal('data-carousel'),binding:z.union([productsBindingSchema,z.strictObject({source:z.literal('reviews'),product:z.enum(['current','store'])})]),props:z.strictObject({autoplay:z.boolean().default(false),intervalSeconds:z.number().int().min(5).max(60).default(8)})}),
  z.strictObject({...baseBlockFields,type:z.literal('faq'),props:z.strictObject({items:z.array(z.strictObject({question:z.string().max(300),answer:plainTextSchema})).max(30)})}),
  z.strictObject({...baseBlockFields,type:z.literal('newsletter'),props:z.strictObject({title:z.string().max(160),text:z.string().max(1000)})}),
  z.strictObject({...baseBlockFields,type:z.literal('whatsapp'),props:z.strictObject({label:z.string().min(1).max(100),message:z.string().max(1000)})}),
  z.strictObject({...baseBlockFields,type:z.literal('divider'),props:z.strictObject({})}),
  z.strictObject({...baseBlockFields,type:z.literal('spacer'),props:z.strictObject({height:spaceSchema})}),
  z.strictObject({...baseBlockFields,type:z.literal('free-area'),props:z.strictObject({
    height:z.number().int().min(120).max(800),
    placements:z.array(z.strictObject({blockId:nodeIdSchema,x:z.number().min(0).max(100),y:z.number().min(0).max(100),width:z.number().min(5).max(100),height:z.number().min(5).max(100)}).refine(value=>value.x+value.width<=100 && value.y+value.height<=100)).max(20),
  })}),
])
const backgroundSchema = z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('color'),color:tokenColorSchema}),
  z.strictObject({type:z.literal('image'),assetId:entityIdSchema}),
  z.strictObject({type:z.literal('gradient'),angle:z.number().min(0).max(360),stops:z.array(z.strictObject({color:tokenColorSchema,position:z.number().min(0).max(100)})).min(2).max(4)}).refine(value=>value.stops.every((stop,index)=>index===0 || stop.position>=value.stops[index-1].position)),
])
export const sectionSchema = z.strictObject({
  id:nodeIdSchema,kind:z.enum(['standard','free-area']),locked:z.boolean(),visibility:visibilitySchema,
  background:backgroundSchema,spacing:spaceSchema,
  layout:z.strictObject({columns:z.number().int().min(1).max(4),horizontal:z.enum(['start','center','end','between']),vertical:z.enum(['top','middle','bottom']),width:z.enum(['contained','full'])}),
  blocks:z.array(blockSchema).max(100),
})
export const pageSchema = z.strictObject({id:nodeIdSchema,type:pageTypeSchema,sections:z.array(sectionSchema).max(100)})
export const themeSchema = z.strictObject({
  primary:colorSchema,secondary:colorSchema,background:colorSchema,text:colorSchema,highlight:colorSchema,
  fontPairId:z.string().min(1).max(80),typeScale:z.enum(['compact','standard','large']),
  radius:z.enum(['none','small','medium','large']),spacing:z.enum(['compact','standard','spacious']),
  logoAssetId:entityIdSchema.nullable(),cartPresentation:z.enum(['drawer','page']),
})
export const requiredSystemRoles: Partial<Record<z.infer<typeof pageTypeSchema>, readonly z.infer<typeof systemBlockSchema>['role'][]>> = {
  product:['price','buy','shipping'],cart:['cart-lines','cart-summary'],checkout:['checkout-fields'],
  'order-success':['order-summary'],'order-tracking':['order-tracking'],
  login:['auth-fields'],register:['auth-fields'],'password-recovery':['auth-fields'],account:['account-fields'],
}
const bindingComponents: Record<z.infer<typeof dataBlockSchema>['component'],readonly string[]> = {
  'product-grid':['products'],'category-list':['categories'],'notice-strip':['notices'],'notice-popup':['notices'],
  'product-gallery':['product','current-product'],'product-description':['product','current-product'],
  'product-reviews':['reviews'],'related-products':['products'],'page-content':['page-content','current-page-content'],
}
export const layoutDocumentSchema = z.strictObject({
  schemaVersion:z.literal(2),storeId:entityIdSchema,layoutRevision:revisionSchema,
  templateId:z.enum(templateIds),theme:themeSchema,pages:z.array(pageSchema).max(30),
  chrome:z.strictObject({header:z.array(z.union([systemBlockSchema,navigationBlockSchema])).min(1).max(10),footer:z.array(systemBlockSchema).min(3).max(10)}),
}).superRefine((document,ctx)=>{
  const ids=new Set<string>()
  const issue=(message:string)=>ctx.addIssue({code:'custom',message})
  const addId=(id:string)=>{ if(ids.has(id)) issue('Identificador de layout duplicado: '+id); ids.add(id) }
  const types=new Set<string>()
  for (const block of [...document.chrome.header,...document.chrome.footer]) addId(block.id)
  const headerRoles=document.chrome.header.filter(block=>block.type==='system').map(block=>block.role)
  const footerRoles=document.chrome.footer.map(block=>block.role)
  if (!headerRoles.includes('cart-control') || ['legal-footer','verification','report-store'].some(role=>!footerRoles.includes(role as typeof footerRoles[number])))
    issue('Faltam blocos globais de sistema.')
  if (headerRoles.some(role=>role!=='cart-control') || footerRoles.some(role=>!['legal-footer','verification','report-store'].includes(role))) issue('Bloco global em contexto incompatível.')
  if(new Set([...headerRoles,...footerRoles]).size!==headerRoles.length+footerRoles.length)
    issue('Bloco global de sistema duplicado.')
  for (const page of document.pages) {
    addId(page.id)
    if(types.has(page.type)) issue('Use um único layout por tipo de página.')
    types.add(page.type)
    const blocks=page.sections.flatMap(section=>section.blocks)
    const roles=blocks.filter(block=>block.type==='system').map(block=>block.role)
    if((requiredSystemRoles[page.type] || []).some(role=>!roles.includes(role))) issue('Faltam blocos protegidos na página '+page.type)
    if(new Set(roles).size!==roles.length) issue('Bloco de sistema duplicado na página.')
    if(page.type==='checkout' && (page.sections.length!==1 || blocks.length!==1 || blocks[0]?.type!=='system' || blocks[0].role!=='checkout-fields'))
      issue('Checkout admite apenas o bloco de etapas de sistema; personalize pelo tema.')
    if(page.type==='institutional' && (!blocks.some(block=>block.type==='data' && block.component==='page-content' && block.binding.source==='current-page-content') || blocks.some(block=>['text','heading','faq'].includes(block.type))))
      issue('O texto institucional vem do gerenciamento.')
    for(const section of page.sections) {
      addId(section.id)
      if(section.blocks.some(block=>block.type==='system') && !isVisibleEverywhere(section.visibility))
        issue('Uma seção de sistema não pode ser ocultada.')
      for(const block of section.blocks) {
        addId(block.id)
        if(block.type==='system' && [block.style,...Object.values(block.overrides)].some(style=>style?.fontSize!==undefined && style.fontSize<14)) issue('Texto de sistema deve ter pelo menos 14 px.')
        if(block.type==='data' && !bindingComponents[block.component].includes(block.binding.source)) issue('Fonte de dados incompatível com o bloco.')
        const actions=block.type==='button' ? [block.props.action] : block.type==='banner' ? [block.props.action] : block.type==='carousel' ? block.props.slides.map(slide=>slide.button?.action) : []
        for(const action of actions) {
          if(action?.type==='add-to-cart') issue('Comprar é uma ação do bloco de sistema, não de um botão de marca.')
          if(action?.type==='scroll' && !page.sections.some(target=>target.id===action.sectionId)) issue('A seção de destino não existe nesta página.')
        }
        if(block.type==='free-area') {
          if(section.kind!=='free-area') issue('Posicionamento livre exige uma área livre.')
          for(const placement of block.props.placements) {
            const child=section.blocks.find(candidate=>candidate.id===placement.blockId)
            if(!child || !['heading','text','image','button','gallery','video','banner','divider','spacer'].includes(child.type)) issue('Área livre aceita somente blocos decorativos desta seção.')
          }
        }
      }
    }
  }
})
export type ButtonAction = z.infer<typeof buttonActionSchema>
export type PageTarget = z.infer<typeof pageTargetSchema>
export type DataBinding = z.infer<typeof dataBindingSchema>
export type LayoutBlock = z.infer<typeof blockSchema>
export type LayoutSection = z.infer<typeof sectionSchema>
export type LayoutPage = z.infer<typeof pageSchema>
export type StoreLayoutDocument = z.infer<typeof layoutDocumentSchema>
export type StorePageType = z.infer<typeof pageTypeSchema>

/** Real/example choice is a preview context, never persisted inside a layout. */
export const previewContextSchema = z.strictObject({
  mode:z.enum(['edit','preview']),dataSource:z.enum(['real','example']),
  paymentMode:z.literal('simulated'),pageType:pageTypeSchema,
  productId:entityIdSchema.optional(),categoryId:entityIdSchema.optional(),pageId:entityIdSchema.optional(),
})
export const publishLayoutCommandSchema = z.strictObject({
  storeId:entityIdSchema,expectedLayoutRevision:revisionSchema,
  origin:z.literal('real'),document:layoutDocumentSchema,
}).refine(command=>command.storeId===command.document.storeId && command.expectedLayoutRevision===command.document.layoutRevision,'O escopo ou a revisão do layout não confere.')
