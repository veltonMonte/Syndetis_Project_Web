import type { DataSnapshot } from './data.ts'
import type { ButtonAction, PageTarget, StorePageType } from './layout.ts'

/** Paths on a store host. Current hash URLs are a transport detail of the SPA. */
export const storefrontRoutes: Record<StorePageType,string> = {
  home:'/',category:'/categoria/:slug',product:'/produto/:slug',search:'/busca',
  cart:'/sacola',checkout:'/checkout','order-success':'/pedido/:id/concluido','order-tracking':'/pedido/:id',
  login:'/entrar',register:'/criar-conta','password-recovery':'/recuperar-senha',account:'/conta',
  institutional:'/p/:slug','not-found':'*',unavailable:'/indisponivel',
}
export const managementModules = ['products','categories','collections','notices','orders','customers','coupons','shipping','payments','profile','verification','pages','channels','domain','team'] as const
export type ManagementModule = typeof managementModules[number]
export function managementPath(storeId:string,module:ManagementModule) {
  return '/gerenciamento/'+encodeURIComponent(storeId)+'/'+module
}
export function makerPath(storeId:string,page:StorePageType='home') {
  return '/maker/'+encodeURIComponent(storeId)+'/'+page
}
export type ResolvedNavigation = {ok:true;path:string} | {ok:false;reason:string}
function missing(kind:string):ResolvedNavigation { return {ok:false,reason:kind+' indisponível; selecione outro item no gerenciamento.'} }
export function resolvePageTarget(target:PageTarget,snapshot:DataSnapshot):ResolvedNavigation {
  switch(target.page) {
    case 'home': return {ok:true,path:'/'}
    case 'category': {
      const item=snapshot.categories.find(item=>item.id===target.categoryId)
      return item ? {ok:true,path:'/categoria/'+encodeURIComponent(item.slug)} : missing('Categoria')
    }
    case 'product': {
      const item=snapshot.products.find(item=>item.id===target.productId && item.status==='active')
      return item ? {ok:true,path:'/produto/'+encodeURIComponent(item.slug)} : missing('Produto')
    }
    case 'institutional': {
      const item=snapshot.pages.find(item=>item.id===target.pageId && item.status==='published')
      return item ? {ok:true,path:'/p/'+encodeURIComponent(item.slug)} : missing('Página')
    }
    case 'search': return {ok:true,path:'/busca'+(target.query ? '?q='+encodeURIComponent(target.query) : '')}
    default: return {ok:true,path:storefrontRoutes[target.page]}
  }
}
export function resolveSocialAction(action:Extract<ButtonAction,{type:'whatsapp'|'instagram'}>,snapshot:DataSnapshot):ResolvedNavigation {
  const channels=snapshot.profile.channels
  if(action.type==='instagram')
    return channels.instagram ? {ok:true,path:'https://www.instagram.com/'+encodeURIComponent(channels.instagram)+'/'} : missing('Instagram')
  return channels.whatsapp ? {ok:true,path:'https://wa.me/'+channels.whatsapp.slice(1)+(action.message ? '?text='+encodeURIComponent(action.message) : '')} : missing('WhatsApp')
}
export const checkoutSteps = ['identification','delivery','payment','review'] as const
export function checkoutStepsForLayout():readonly typeof checkoutSteps[number][] { return checkoutSteps }
