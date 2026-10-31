import { z } from 'zod'
import { entityIdSchema } from './primitives.ts'
import type { ManagementModule } from './routes.ts'

export const staffRoleSchema = z.enum(['owner','manager','designer'])
export const membershipSchema = z.strictObject({userId:entityIdSchema,storeId:entityIdSchema,role:staffRoleSchema})
export type StaffMembership = z.infer<typeof membershipSchema>
export type Operation = 'layout.read'|'layout.edit'|'layout.reorder'|'layout.publish'|'data.select'|'data.read'|'data.write'|'payments.manage'|'team.manage'
const grants:Record<StaffMembership['role'],readonly Operation[]> = {
  owner:['layout.read','layout.edit','layout.reorder','layout.publish','data.select','data.read','data.write','payments.manage','team.manage'],
  manager:['data.read','data.write','data.select'],
  designer:['layout.read','layout.edit','layout.reorder','data.select'],
}
/** Policy specification: the backend must supply the authenticated membership, never trust request-body roles. */
export function canPerform(operation:Operation,context:{
  authenticatedUserId:string;storeId:string;membership:StaffMembership;
  structuralEditing:boolean;mayPublish:boolean;
}):boolean {
  if(context.membership.userId!==context.authenticatedUserId || context.membership.storeId!==context.storeId) return false
  if(!grants[context.membership.role].includes(operation)) return false
  if(operation==='layout.reorder' && !context.structuralEditing) return false
  if(operation==='layout.publish' && !context.mayPublish) return false
  return true
}
export const ownership = [
  {domain:'Produtos, variações, fotos, preço, estoque e SEO',owner:'management',module:'products'},
  {domain:'Categorias e coleções',owner:'management',module:'categories'},
  {domain:'Avisos: texto, destino, público e agendamento',owner:'management',module:'notices'},
  {domain:'Pedidos e clientes',owner:'management',module:'orders'},
  {domain:'Cupons',owner:'management',module:'coupons'},
  {domain:'Frete e retirada',owner:'management',module:'shipping'},
  {domain:'Conexão ao provedor do lojista',owner:'management',module:'payments'},
  {domain:'Empresa, CNPJ/CPF, contatos e selo',owner:'management',module:'profile'},
  {domain:'Textos institucionais e políticas',owner:'management',module:'pages'},
  {domain:'WhatsApp e Instagram',owner:'management',module:'channels'},
  {domain:'Domínio e equipe',owner:'management',module:'domain'},
  {domain:'Tema, fontes, cores e layout',owner:'maker'},
  {domain:'Banners e imagens decorativas',owner:'maker'},
  {domain:'Títulos e textos de marca',owner:'maker'},
  {domain:'Fonte, ordenação e quantidade dos blocos',owner:'maker'},
  {domain:'Estilo da faixa, menu, sacola e cards',owner:'maker'},
] satisfies {domain:string;owner:'management'|'maker';module?:ManagementModule}[]
