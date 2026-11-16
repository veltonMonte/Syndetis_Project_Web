import { z } from 'zod'
import { assetSchema, centsSchema, dateTimeSchema, entityIdSchema, plainTextSchema, publicChannelsSchema, recordFields, revisionSchema, seoSchema, slugSchema } from './primitives.ts'

export const productSchema = z.strictObject({
  ...recordFields, name: z.string().min(1).max(160), slug: slugSchema,
  description: plainTextSchema, status: z.enum(['draft','active','archived']),
  sku: z.string().min(1).max(100), priceCents: centsSchema, compareAtCents: centsSchema.nullable(),
  stockAvailable: z.number().int().nonnegative().nullable(),
  categoryIds: z.array(entityIdSchema).max(32),
  collectionIds: z.array(entityIdSchema).max(100), variantIds: z.array(entityIdSchema).max(200),
  images: z.array(assetSchema).max(20), seo: seoSchema,
}).superRefine((product,ctx)=>{
  if (product.images.some(image=>image.storeId !== product.storeId || image.purpose !== 'product'))
    ctx.addIssue({code:'custom',message:'As fotos precisam pertencer ao produto desta loja.'})
  for (const ids of [product.categoryIds,product.collectionIds,product.variantIds])
    if (new Set(ids).size !== ids.length) ctx.addIssue({code:'custom',message:'Referências duplicadas.'})
})
export const variantSchema = z.strictObject({
  ...recordFields, productId: entityIdSchema, sku: z.string().min(1).max(100),
  attributes: z.array(z.strictObject({name:z.string().min(1).max(60),value:z.string().min(1).max(100)})).min(1).max(5),
  priceCents: centsSchema, stockAvailable: z.number().int().nonnegative().nullable(),
  imageId: entityIdSchema.nullable(), active: z.boolean(),
})
export const categorySchema = z.strictObject({
  ...recordFields, name:z.string().min(1).max(120),slug:slugSchema,
  parentId:entityIdSchema.nullable(),position:z.number().int().nonnegative(),
  imageId:entityIdSchema.nullable(),seo:seoSchema,
}).refine(value=>value.parentId!==value.id,'Uma categoria não pode ser sua própria mãe.')
const collectionRuleSchema = z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('category'),categoryId:entityIdSchema}),
  z.strictObject({type:z.literal('price-range'),minCents:centsSchema,maxCents:centsSchema}).refine(value=>value.minCents<=value.maxCents),
  z.strictObject({type:z.literal('available')}),
])
export const collectionSchema = z.strictObject({
  ...recordFields,name:z.string().min(1).max(120),slug:slugSchema,
  imageId:entityIdSchema.nullable(),position:z.number().int().nonnegative(),
  membership:z.discriminatedUnion('type',[
    z.strictObject({type:z.literal('manual'),productIds:z.array(entityIdSchema).max(500)}),
    z.strictObject({type:z.literal('automatic'),match:z.enum(['all','any']),rules:z.array(collectionRuleSchema).min(1).max(20)}),
  ]),
})
export const noticeSchema = z.strictObject({
  ...recordFields,title:z.string().min(1).max(160),text:z.string().max(1000),
  placement:z.enum(['strip','popup']),active:z.boolean(),
  startsAt:dateTimeSchema.nullable(),endsAt:dateTimeSchema.nullable(),
  audience:z.enum(['all','new-visitors','returning-visitors','signed-in']),
  // The management team owns the notice's destination, not its Maker block.
  destination:z.discriminatedUnion('type',[
    z.strictObject({type:z.literal('none')}),
    z.strictObject({type:z.literal('product'),productId:entityIdSchema}),
    z.strictObject({type:z.literal('category'),categoryId:entityIdSchema}),
    z.strictObject({type:z.literal('page'),pageId:entityIdSchema}),
  ]),
}).refine(value=>!value.startsAt || !value.endsAt || Date.parse(value.startsAt)<Date.parse(value.endsAt),'O fim do aviso deve vir depois do início.')
export const pageContentSchema = z.strictObject({
  ...recordFields,kind:z.enum(['about','contact','returns','privacy','terms','custom']),
  title:z.string().min(1).max(160),slug:slugSchema,body:plainTextSchema,
  // Plain text in v1: no raw HTML or executable rich text.
  format:z.literal('plain-text'),status:z.enum(['draft','published']),seo:seoSchema,
})
export const storeProfileSchema = z.strictObject({
  ...recordFields,displayName:z.string().min(1).max(160),slug:slugSchema,
  legalName:z.string().max(200),taxIdentity:z.strictObject({
    kind:z.enum(['cpf','cnpj']),value:z.string().min(1).max(32),
  }).nullable(),
  channels:publicChannelsSchema,
  status:z.enum(['active','maintenance','suspended']),
  unavailableReason:z.string().max(1000).nullable(),
  verification:z.strictObject({
    status:z.enum(['unverified','pending','verified','rejected']),
    checkedAt:dateTimeSchema.nullable(),
  }),
  paymentConnection:z.strictObject({
    provider:z.string().min(1).max(60),merchantAccountRef:z.string().min(1).max(200),
    status:z.enum(['disconnected','pending','connected']),
  }).nullable(),
})
// Public projection: neither a document number nor provider credentials are delivered to a designer.
export const publicStoreProfileSchema = z.strictObject({
  storeId:entityIdSchema,displayName:z.string().min(1).max(160),slug:slugSchema,
  legalName:z.string().max(200),documentDisplay:z.string().max(32).nullable(),
  channels:publicChannelsSchema,verificationStatus:z.enum(['unverified','pending','verified','rejected']),
  status:z.enum(['active','maintenance','suspended']),unavailableReason:z.string().max(1000).nullable(),
})
export const addressSchema = z.strictObject({
  zipCode:z.string().regex(/^\d{8}$/),street:z.string().min(1).max(200),
  number:z.string().min(1).max(30),complement:z.string().max(100),
  neighborhood:z.string().min(1).max(100),city:z.string().min(1).max(100),
  state:z.string().regex(/^[A-Z]{2}$/),country:z.literal('BR'),
})
export const customerSchema = z.strictObject({
  ...recordFields,authUserId:entityIdSchema.nullable(),name:z.string().min(1).max(160),
  email:z.string().email(),phone:z.string().max(25).nullable(),
  addresses:z.array(z.strictObject({id:entityIdSchema,label:z.string().max(60),address:addressSchema})).max(20),
})
export const orderSchema = z.strictObject({
  ...recordFields,customerId:entityIdSchema,number:z.string().min(1).max(40),
  status:z.enum(['PENDING','PAID','SHIPPED','DELIVERED','CANCELED','REFUNDED']),
  currency:z.literal('BRL'),items:z.array(z.strictObject({
    productId:entityIdSchema,variantId:entityIdSchema.nullable(),nameSnapshot:z.string().min(1).max(160),
    quantity:z.number().int().min(1).max(100),unitPriceCents:centsSchema,
  })).min(1).max(100),
  subtotalCents:centsSchema,shippingCents:centsSchema,discountCents:centsSchema,totalCents:centsSchema,
  deliveryAddress:addressSchema.nullable(),providerPaymentRef:z.string().max(200).nullable(),
  createdAt:dateTimeSchema,
}).superRefine((order,ctx)=>{
  const subtotal=order.items.reduce((sum,item)=>sum+item.unitPriceCents*item.quantity,0)
  if (order.subtotalCents!==subtotal || order.totalCents!==subtotal+order.shippingCents-order.discountCents)
    ctx.addIssue({code:'custom',message:'Os totais do pedido não conferem.'})
})
export const shippingRuleSchema = z.strictObject({
  ...recordFields,name:z.string().min(1).max(120),active:z.boolean(),
  fulfillment:z.discriminatedUnion('type',[
    z.strictObject({type:z.literal('pickup'),address:addressSchema,instructions:z.string().max(1000)}),
    z.strictObject({type:z.literal('flat'),feeCents:centsSchema,minDays:z.number().int().nonnegative(),maxDays:z.number().int().nonnegative()}),
    z.strictObject({type:z.literal('postal-range'),from:z.string().regex(/^\d{8}$/),to:z.string().regex(/^\d{8}$/),feeCents:centsSchema,minDays:z.number().int().nonnegative(),maxDays:z.number().int().nonnegative()}),
  ]),
}).superRefine((rule,ctx)=>{
  const value=rule.fulfillment
  if (value.type!=='pickup' && (value.minDays>value.maxDays || (value.type==='postal-range' && value.from>value.to)))
    ctx.addIssue({code:'custom',message:'Confira o intervalo de CEP e de prazo.'})
})
// Creating an order never accepts a client-supplied price or card data.
export const createOrderCommandSchema = z.strictObject({
  storeId:entityIdSchema,addressId:entityIdSchema.nullable(),
  items:z.array(z.strictObject({productId:entityIdSchema,variantId:entityIdSchema.nullable(),quantity:z.number().int().min(1).max(100)})).min(1).max(100),
  idempotencyKey:z.string().uuid(),
})
export const dataSnapshotSchema = z.strictObject({
  schemaVersion:z.literal(1),dataRevision:revisionSchema,storeId:entityIdSchema,
  origin:z.enum(['real','example']),profile:publicStoreProfileSchema,
  products:z.array(productSchema).max(500),variants:z.array(variantSchema).max(10000),
  categories:z.array(categorySchema).max(500),collections:z.array(collectionSchema).max(500),
  notices:z.array(noticeSchema).max(100),pages:z.array(pageContentSchema).max(100),
}).superRefine((snapshot,ctx)=>{
  if(snapshot.profile.storeId!==snapshot.storeId)
    ctx.addIssue({code:'custom',message:'Perfil de outra loja.'})
  for (const records of [snapshot.products,snapshot.variants,snapshot.categories,snapshot.collections,snapshot.notices,snapshot.pages]) {
    if(new Set(records.map(record=>record.id)).size!==records.length || records.some(record=>record.storeId!==snapshot.storeId))
      ctx.addIssue({code:'custom',message:'Dados duplicados ou pertencentes a outra loja.'})
  }
})
export type Product = z.infer<typeof productSchema>
export type Variant = z.infer<typeof variantSchema>
export type Category = z.infer<typeof categorySchema>
export type Collection = z.infer<typeof collectionSchema>
export type Notice = z.infer<typeof noticeSchema>
export type Order = z.infer<typeof orderSchema>
export type Customer = z.infer<typeof customerSchema>
export type ShippingRule = z.infer<typeof shippingRuleSchema>
export type PageContent = z.infer<typeof pageContentSchema>
export type StoreProfile = z.infer<typeof storeProfileSchema>
export type DataSnapshot = z.infer<typeof dataSnapshotSchema>

/** Graph checks require a store-scoped snapshot, beyond one entity's JSON shape. */
export function checkDataReferences(snapshot: DataSnapshot): string[] {
  const errors: string[] = []
  for (const category of snapshot.categories) {
    const visited=new Set<string>()
    let current:Category|undefined=category
    while(current) {
      if(visited.has(current.id)) { errors.push('Árvore de categorias contém ciclo.'); break }
      visited.add(current.id)
      const parent:string|null=current.parentId
      if(!parent) break
      current=snapshot.categories.find(item=>item.id===parent)
      if(!current) errors.push('Categoria mãe inexistente.')
    }
  }
  for(const product of snapshot.products) {
    if(product.categoryIds.some(id=>!snapshot.categories.some(category=>category.id===id))) errors.push('Categoria do produto inexistente.')
    if(product.collectionIds.some(id=>!snapshot.collections.some(collection=>collection.id===id))) errors.push('Coleção do produto inexistente.')
    if(product.variantIds.some(id=>!snapshot.variants.some(variant=>variant.id===id && variant.productId===product.id))) errors.push('Variação incompatível com o produto.')
  }
  for(const variant of snapshot.variants)
    if(!snapshot.products.some(product=>product.id===variant.productId && product.variantIds.includes(variant.id))) errors.push('Produto da variação inexistente ou sem vínculo.')
  return errors
}
