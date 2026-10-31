import { z } from 'zod'

export const entityIdSchema = z.string().uuid()
export const nodeIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
export const revisionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const centsSchema = z.number().int().nonnegative().max(999_999_999_999)
export const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const plainTextSchema = z.string().max(10_000)
export const httpsUrlSchema = z.string().max(2048).refine(value => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password
  } catch { return false }
}, 'Use um endereço HTTPS sem credenciais.')
export const dateTimeSchema = z.string().datetime({ offset: true })
export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)
export const visibilitySchema = z.strictObject({
  desktop: z.boolean(), tablet: z.boolean(), mobile: z.boolean(),
})
export const systemVisibilitySchema = z.strictObject({
  desktop: z.literal(true), tablet: z.literal(true), mobile: z.literal(true),
})
export const recordFields = {
  schemaVersion: z.literal(1), id: entityIdSchema, storeId: entityIdSchema,
  revision: revisionSchema,
}
export const assetSchema = z.strictObject({
  ...recordFields, purpose: z.enum(['product', 'decorative', 'brand']),
  url: httpsUrlSchema, alt: z.string().max(500), width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000), bytes: z.number().int().positive().max(10_000_000),
  mimeType: z.enum(['image/jpeg','image/png','image/webp','image/avif']),
  focalPoint: z.strictObject({x: z.number().min(0).max(1), y: z.number().min(0).max(1)}),
})
export const seoSchema = z.strictObject({ title: z.string().max(160), description: z.string().max(320) })
export const publicChannelsSchema = z.strictObject({
  email: z.string().email().nullable(),
  whatsapp: z.string().regex(/^\+[1-9]\d{7,14}$/).nullable(),
  instagram: z.string().regex(/^[a-zA-Z0-9._]{1,30}$/).nullable(),
})
export function isVisibleEverywhere(value: {desktop:boolean;tablet:boolean;mobile:boolean}) {
  return value.desktop && value.tablet && value.mobile
}
