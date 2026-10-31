import { z } from 'zod'
import { centsSchema, entityIdSchema, plainTextSchema, revisionSchema, seoSchema, slugSchema } from './primitives.ts'
import { noticeSchema } from './data.ts'
import { layoutDocumentSchema } from './layout.ts'

const writeEnvelope = {
  origin:z.literal('real'),storeId:entityIdSchema,
  id:entityIdSchema.nullable(),expectedRevision:z.number().int().nonnegative(),
}
const expectedRevisionMatches=(value:{id:string|null;expectedRevision:number})=>value.id ? value.expectedRevision>0 : value.expectedRevision===0
export const saveProductCommandSchema = z.strictObject({
  ...writeEnvelope,
  fields:z.strictObject({
    name:z.string().min(1).max(160),slug:slugSchema,description:plainTextSchema,sku:z.string().min(1).max(100),
    priceCents:centsSchema,compareAtCents:centsSchema.nullable(),categoryIds:z.array(entityIdSchema).max(32),
    imageIds:z.array(entityIdSchema).max(20),status:z.enum(['draft','active','archived']),seo:seoSchema,
  }),
}).refine(expectedRevisionMatches,'Criação usa revisão zero; edição exige a revisão da entidade.')
export const saveCategoryCommandSchema = z.strictObject({
  ...writeEnvelope,
  fields:z.strictObject({name:z.string().min(1).max(120),slug:slugSchema,parentId:entityIdSchema.nullable(),imageId:entityIdSchema.nullable(),position:z.number().int().nonnegative(),seo:seoSchema}),
}).refine(expectedRevisionMatches)
export const saveLayoutDraftCommandSchema = z.strictObject({
  origin:z.literal('real'),storeId:entityIdSchema,expectedLayoutRevision:revisionSchema,document:layoutDocumentSchema,
}).refine(value=>value.storeId===value.document.storeId && value.expectedLayoutRevision===value.document.layoutRevision,'O escopo ou a revisão do layout não confere.')
export type SaveProductCommand = z.infer<typeof saveProductCommandSchema>
export type SaveLayoutDraftCommand = z.infer<typeof saveLayoutDraftCommandSchema>

export const saveNoticeCommandSchema = z.strictObject({
  ...writeEnvelope,
  fields:z.strictObject({
    title:noticeSchema.shape.title,text:noticeSchema.shape.text,
    placement:noticeSchema.shape.placement,active:noticeSchema.shape.active,
    startsAt:noticeSchema.shape.startsAt,endsAt:noticeSchema.shape.endsAt,
    audience:noticeSchema.shape.audience,destination:noticeSchema.shape.destination,
  }),
}).refine(expectedRevisionMatches).refine(value=>!value.fields.startsAt || !value.fields.endsAt || Date.parse(value.fields.startsAt)<Date.parse(value.fields.endsAt),'Intervalo de aviso inválido.')
export type SaveNoticeCommand = z.infer<typeof saveNoticeCommandSchema>
