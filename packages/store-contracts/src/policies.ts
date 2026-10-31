import { checkDataReferences, dataSnapshotSchema, type DataSnapshot } from './data.ts'
import { isVisibleEverywhere } from './primitives.ts'
import { layoutDocumentSchema, mvpPageTypes, pageTypes, type StoreLayoutDocument } from './layout.ts'

export type ContractIssue = {code:string;message:string;nodeId?:string}
function protectedNodes(layout:StoreLayoutDocument) {
  return [
    ...layout.chrome.header.filter(block=>block.type==='system').map(block=>({block,parentVisible:true,context:'header'})),
    ...layout.chrome.footer.map(block=>({block,parentVisible:true,context:'footer'})),
    ...layout.pages.flatMap(page=>page.sections.flatMap(section=>section.blocks.filter(block=>block.type==='system').map(block=>({block,parentVisible:isVisibleEverywhere(section.visibility),context:page.type})))),
  ]
}
export function checkLayoutTransition(previous:StoreLayoutDocument,next:StoreLayoutDocument):ContractIssue[] {
  const issues:ContractIssue[]=[]
  if(previous.storeId!==next.storeId) issues.push({code:'store-scope',message:'Não é possível mover um layout para outra loja.'})
  for(const {block,context} of protectedNodes(previous)) {
    const found=protectedNodes(next).find(item=>item.block.id===block.id)
    if(!found || found.block.type!=='system' || block.type!=='system' || found.block.role!==block.role || !found.parentVisible || found.context!==context || !isVisibleEverywhere(found.block.visibility))
      issues.push({code:'protected-block',message:'Bloco de sistema removido, substituído ou ocultado.',nodeId:block.id})
  }
  return issues
}
/** Membership of referenced IDs is checked against one store-scoped selection snapshot. */
export function checkLayoutBindings(layout:StoreLayoutDocument,snapshot:DataSnapshot):ContractIssue[] {
  const issues:ContractIssue[]=[]
  if(layout.storeId!==snapshot.storeId) return [{code:'store-scope',message:'A fonte de dados pertence a outra loja.'}]
  const missing=(nodeId:string,kind:string)=>issues.push({code:'missing-binding',nodeId,message:kind+' não existe nesta loja.'})
  for(const page of [...layout.pages,{type:'chrome',sections:[{blocks:[...layout.chrome.header,...layout.chrome.footer]}]}]) for(const section of page.sections) for(const block of section.blocks) {
    if(block.type==='data' || block.type==='data-carousel') {
      const binding=block.binding
      switch(binding.source) {
        case 'products':
          if(binding.selection.type==='category') {
            const id=binding.selection.categoryId
            if(!snapshot.categories.some(item=>item.id===id)) missing(block.id,'Categoria')
          }
          if(binding.selection.type==='collection') {
            const id=binding.selection.collectionId
            if(!snapshot.collections.some(item=>item.id===id)) missing(block.id,'Coleção')
          }
          break
        case 'product': if(!snapshot.products.some(item=>item.id===binding.productId)) missing(block.id,'Produto'); break
        case 'categories': if(binding.categoryIds.some(id=>!snapshot.categories.some(item=>item.id===id))) missing(block.id,'Categoria'); break
        case 'notices': if(binding.noticeIds.some(id=>!snapshot.notices.some(item=>item.id===id))) missing(block.id,'Aviso'); break
        case 'page-content': if(!snapshot.pages.some(item=>item.id===binding.pageId)) missing(block.id,'Página'); break
        case 'current-product': if(page.type!=='product') missing(block.id,'Contexto de produto'); break
        case 'current-category': if(page.type!=='category') missing(block.id,'Contexto de categoria'); break
        case 'current-page-content': if(page.type!=='institutional') missing(block.id,'Contexto de página'); break
      }
    }
    const actions=block.type==='navigation' ? block.props.items.map(target=>({type:'navigate' as const,target})) : block.type==='button' ? [block.props.action] : block.type==='banner' ? [block.props.action] : block.type==='carousel' ? block.props.slides.map(slide=>slide.button?.action) : []
    for(const action of actions) if(action?.type==='navigate') {
      const target=action.target
      if(target.page==='product' && !snapshot.products.some(item=>item.id===target.productId)) missing(block.id,'Produto de destino')
      if(target.page==='category' && !snapshot.categories.some(item=>item.id===target.categoryId)) missing(block.id,'Categoria de destino')
      if(target.page==='institutional' && !snapshot.pages.some(item=>item.id===target.pageId)) missing(block.id,'Página de destino')
    }
  }
  return issues
}
export function checkPublication(layoutInput:unknown,dataInput:unknown,scope:'mvp'|'complete'='mvp'):ContractIssue[] {
  const parsedLayout=layoutDocumentSchema.safeParse(layoutInput)
  const parsedData=dataSnapshotSchema.safeParse(dataInput)
  if(!parsedLayout.success || !parsedData.success) return [{code:'invalid-contract',message:'Layout ou dados inválidos.'}]
  const layout=parsedLayout.data
  const snapshot=parsedData.data
  const issues=checkLayoutBindings(layout,snapshot)
  issues.push(...checkDataReferences(snapshot).map(message=>({code:'data-reference',message})))
  if(snapshot.origin!=='real') issues.push({code:'example-data',message:'Dados de exemplo não podem ser publicados.'})
  const required=scope==='mvp' ? mvpPageTypes : pageTypes
  for(const type of required) if(!layout.pages.some(page=>page.type===type))
    issues.push({code:'missing-page',message:'Falta o layout da página '+type+'.'})
  return issues
}
/** Evaluating a schedule never mutates a notice or a layout. Timestamps are instants with offsets. */
export function isNoticeActive(notice:DataSnapshot['notices'][number],at:Date,audience:'new-visitors'|'returning-visitors'|'signed-in') {
  const time=at.getTime()
  return Number.isFinite(time) && notice.active &&
    (!notice.startsAt || Date.parse(notice.startsAt)<=time) &&
    (!notice.endsAt || time<Date.parse(notice.endsAt)) &&
    (notice.audience==='all' || notice.audience===audience)
}
