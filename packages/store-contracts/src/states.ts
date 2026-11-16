import { z } from 'zod'
import { publicChannelsSchema } from './primitives.ts'

/** A page cannot represent an empty/error result as a fake successful response. */
export function resourceStateSchema<T extends z.ZodType>(data:T) {
  return z.discriminatedUnion('state',[
    z.strictObject({state:z.literal('loading')}),
    z.strictObject({state:z.literal('empty'),message:z.string().min(1).max(500)}),
    z.strictObject({state:z.literal('error'),code:z.string().min(1).max(80),message:z.string().min(1).max(500),retryable:z.boolean()}),
    z.strictObject({state:z.literal('ready'),data}),
    z.strictObject({state:z.literal('not-found')}),
    z.strictObject({state:z.literal('unavailable'),reason:z.enum(['maintenance','suspended']),message:z.string().min(1).max(1000),contact:publicChannelsSchema}),
  ])
}
