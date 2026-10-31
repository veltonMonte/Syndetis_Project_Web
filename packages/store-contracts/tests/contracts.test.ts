import { z } from 'zod'
import { resourceStateSchema, saveNoticeCommandSchema } from '../src/index.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buttonActionSchema, categorySchema, checkDataReferences, checkLayoutBindings, checkLayoutTransition,
  checkPublication, checkoutStepsForLayout, dataSnapshotSchema, isNoticeActive, layoutDocumentSchema,
  managementPath, makerPath, orderSchema, ownership, pageTypes, previewContextSchema, publicStoreProfileSchema,
  publishLayoutCommandSchema, resolvePageTarget, resolveSocialAction, saveLayoutDraftCommandSchema,
  saveProductCommandSchema, createOrderCommandSchema, canPerform, templateIds,
} from '../src/index.ts'
import { dataFixture, everyone, id, layoutFixture, storeId } from './fixtures.ts'

test('contratos completos são válidos e cobrem as páginas dinâmicas uma vez',()=>{
 const data=dataFixture(),layout=layoutFixture()
 assert.equal(dataSnapshotSchema.safeParse(data).success,true)
 assert.equal(layoutDocumentSchema.safeParse(layout).success,true)
 assert.equal(layout.pages.length,pageTypes.length)
 assert.deepEqual(checkPublication(layout,data,'complete'),[])
 assert.equal(templateIds.length,12)
})

test('layout não aceita dados operacionais nem preço disfarçado em props de binding',()=>{
 const layout=layoutFixture()
 assert.equal(layoutDocumentSchema.safeParse({...layout,products:[]}).success,false)
 const page=layout.pages.find(page=>page.type==='home')!
 const block={id:'grid',type:'data',component:'product-grid',locked:false,visibility:everyone,style:{},overrides:{},binding:{source:'products',selection:{type:'category',categoryId:id(20)},sort:'newest',limit:8}}
 page.sections[0].blocks.push(block as never)
 assert.equal(layoutDocumentSchema.safeParse(layout).success,true)
 ;(page.sections[0].blocks[0] as unknown as {priceCents:number}).priceCents=1
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})

test('bloco de avisos não aceita texto ou agendamento no layout',()=>{
 const layout=layoutFixture()
 const block={id:'notice',type:'data',component:'notice-strip',locked:false,visibility:everyone,style:{},overrides:{},binding:{source:'notices',noticeIds:[id(30)]}}
 layout.pages[0].sections[0].blocks.push(block as never)
 assert.equal(layoutDocumentSchema.safeParse(layout).success,true)
 ;(layout.pages[0].sections[0].blocks[0] as unknown as {text:string}).text='Alteração operacional'
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})

test('links internos exigem IDs e não guardam slug ou URL digitada',()=>{
 assert.equal(buttonActionSchema.safeParse({type:'navigate',target:{page:'product',productId:id(10)}}).success,true)
 assert.equal(buttonActionSchema.safeParse({type:'navigate',target:{page:'product',url:'/produto/antigo'}}).success,false)
 assert.equal(buttonActionSchema.safeParse({type:'navigate',target:{page:'home',url:'https://example.test'}}).success,false)
})

test('trocar o slug no gerenciamento não altera o layout nem quebra a navegação por ID',()=>{
 const data=dataFixture(),layout=layoutFixture()
 const unchanged=JSON.stringify(layout)
 assert.deepEqual(resolvePageTarget({page:'product',productId:id(10)},data),{ok:true,path:'/produto/produto-teste'})
 data.products[0].slug='novo-nome'
 data.dataRevision++
 assert.deepEqual(resolvePageTarget({page:'product',productId:id(10)},data),{ok:true,path:'/produto/novo-nome'})
 assert.equal(JSON.stringify(layout),unchanged)
})

test('destinos removidos retornam estado de indisponibilidade, sem URL inventada',()=>{
 const data=dataFixture()
 assert.equal(resolvePageTarget({page:'product',productId:id(99)},data).ok,false)
 data.products[0].status='archived'
 assert.equal(resolvePageTarget({page:'product',productId:id(10)},data).ok,false)
})

test('link externo requer modo avançado, aviso explícito e HTTPS sem credenciais',()=>{
 const valid={type:'external',url:'https://example.test/colecao',advanced:true,acknowledgeExternal:true}
 assert.equal(buttonActionSchema.safeParse(valid).success,true)
 for(const url of ['http://example.test','javascript:alert(1)','data:text/html,hello','https://user:secret@example.test']) assert.equal(buttonActionSchema.safeParse({...valid,url}).success,false)
 assert.equal(buttonActionSchema.safeParse({...valid,acknowledgeExternal:false}).success,false)
})

test('WhatsApp e Instagram vêm dos canais da loja e não de uma URL do layout',()=>{
 const data=dataFixture()
 assert.equal(resolveSocialAction({type:'whatsapp',message:'Olá & obrigado'},data).ok,true)
 assert.deepEqual(resolveSocialAction({type:'instagram'},data),{ok:true,path:'https://www.instagram.com/marca_teste/'})
 assert.equal(buttonActionSchema.safeParse({type:'instagram',url:'https://example.test'}).success,false)
 data.profile.channels.whatsapp=null
 assert.equal(resolveSocialAction({type:'whatsapp',message:''},data).ok,false)
})

test('layout não remove rodapé, selo ou denúncia mesmo sem loja verificada',()=>{
 for(const role of ['legal-footer','verification','report-store']) {
   const layout=layoutFixture()
   layout.chrome.footer=layout.chrome.footer.filter(block=>block.role!==role)
   assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
 }
})

test('preço e compra são protegidos inclusive contra ocultação do contêiner',()=>{
 const layout=layoutFixture()
 const page=layout.pages.find(page=>page.type==='product')!
 page.sections[0].visibility.mobile=false
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
 page.sections[0].visibility.mobile=true
 page.sections[0].blocks=page.sections[0].blocks.filter(block=>block.type!=='system' || block.role!=='buy')
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})

test('overrides de celular não conseguem esconder ou zerar texto de sistema',()=>{
 const layout=layoutFixture()
 layout.chrome.footer[0].visibility.mobile=false as true
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
 layout.chrome.footer[0].visibility.mobile=true
 const price=layout.pages.find(page=>page.type==='product')!.sections[0].blocks.find(block=>block.type==='system' && block.role==='price')!
 price.overrides.mobile={fontSize:8}
 // Chrome and page system blocks must both reject tiny text.
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})

test('transição preserva identidade e contexto dos blocos de sistema',()=>{
 const previous=layoutFixture(),next=layoutFixture()
 next.chrome.footer[0].id='replacement'
 assert.equal(layoutDocumentSchema.safeParse(next).success,true)
 assert.equal(checkLayoutTransition(previous,next)[0]?.code,'protected-block')
})

test('reposicionar blocos protegidos dentro do mesmo contexto é permitido',()=>{
 const previous=layoutFixture(),next=layoutFixture()
 next.pages.find(page=>page.type==='product')!.sections[0].blocks.reverse()
 next.chrome.footer.reverse()
 assert.deepEqual(checkLayoutTransition(previous,next),[])
})

test('checkout não permite inserir banners nem reordenar etapas pelo layout',()=>{
 const layout=layoutFixture()
 const checkout=layout.pages.find(page=>page.type==='checkout')!
 checkout.sections[0].blocks.push({id:'extra',type:'text',locked:false,visibility:everyone,style:{},overrides:{},props:{text:'Mudança',format:'plain-text'}})
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
 assert.deepEqual(checkoutStepsForLayout(),['identification','delivery','payment','review'])
})

test('texto institucional vem do gerenciamento e não de texto livre do Maker',()=>{
 const layout=layoutFixture(),page=layout.pages.find(page=>page.type==='institutional')!
 page.sections[0].blocks.push({id:'policy-text',type:'text',locked:false,visibility:everyone,style:{},overrides:{},props:{text:'Política alterada',format:'plain-text'}})
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})

test('dados de outra loja não são resolvidos e não podem ser publicados',()=>{
 const layout=layoutFixture(),data=dataFixture()
 data.storeId=id(99)
 assert.equal(checkLayoutBindings(layout,data)[0]?.code,'store-scope')
 assert.equal(checkPublication(layout,data)[0]?.code,'invalid-contract')
})

test('dados de exemplo são permitidos na prévia e recusados na publicação e gravação',()=>{
 assert.equal(previewContextSchema.safeParse({mode:'preview',dataSource:'example',paymentMode:'simulated',pageType:'home'}).success,true)
 const layout=layoutFixture(),data=dataFixture()
 data.origin='example'
 assert.equal(checkPublication(layout,data).some(issue=>issue.code==='example-data'),true)
 assert.equal(saveLayoutDraftCommandSchema.safeParse({origin:'example',storeId,expectedLayoutRevision:1,document:layout}).success,false)
})

test('publicar visual não inclui produtos e usa somente a revisão de layout',()=>{
 const layout=layoutFixture()
 const valid={origin:'real',storeId,expectedLayoutRevision:1,document:layout}
 assert.equal(publishLayoutCommandSchema.safeParse(valid).success,true)
 assert.equal(publishLayoutCommandSchema.safeParse({...valid,products:[]}).success,false)
 assert.equal(publishLayoutCommandSchema.safeParse({...valid,expectedLayoutRevision:2}).success,false)
 const data=dataFixture()
 data.dataRevision=50
 assert.deepEqual(checkPublication(layout,data),[])
})

test('designer só acessa o Maker e a projeção de seleção, sem dados operacionais',()=>{
 const context={authenticatedUserId:id(2),storeId,membership:{userId:id(2),storeId,role:'designer' as const},structuralEditing:true,mayPublish:true}
 assert.equal(canPerform('layout.edit',context),true)
 assert.equal(canPerform('data.select',context),true)
 assert.equal(canPerform('data.write',context),false)
 assert.equal(canPerform('data.read',context),false)
 assert.equal(canPerform('layout.publish',context),false)
 assert.equal(canPerform('payments.manage',context),false)
 assert.equal(canPerform('layout.reorder',{...context,structuralEditing:false}),false)
 assert.equal(canPerform('layout.edit',{...context,storeId:id(99)}),false)
 assert.equal(canPerform('layout.edit',{...context,authenticatedUserId:id(99)}),false)
})

test('gerente opera dados, mas não recebe edição do Maker por consequência',()=>{
 const context={authenticatedUserId:id(2),storeId,membership:{userId:id(2),storeId,role:'manager' as const},structuralEditing:true,mayPublish:true}
 assert.equal(canPerform('data.write',context),true)
 assert.equal(canPerform('layout.edit',context),false)
})

test('projection pública não aceita CPF/CNPJ bruto, pagamentos ou clientes',()=>{
 const profile=dataFixture().profile
 assert.equal(publicStoreProfileSchema.safeParse({...profile,taxIdentity:{kind:'cpf',value:'11111111111'}}).success,false)
 assert.equal(dataSnapshotSchema.safeParse({...dataFixture(),customers:[]}).success,false)
})

test('pedido usa centavos inteiros e comando de compra não aceita preço ou cartão',()=>{
 const command={storeId,addressId:null,items:[{productId:id(10),variantId:null,quantity:2}],idempotencyKey:id(50)}
 assert.equal(createOrderCommandSchema.safeParse(command).success,true)
 assert.equal(createOrderCommandSchema.safeParse({...command,cardNumber:'4111111111111111'}).success,false)
 assert.equal(createOrderCommandSchema.safeParse({...command,items:[{...command.items[0],priceCents:1}]}).success,false)
 const order={schemaVersion:1,id:id(60),storeId,revision:1,customerId:id(2),number:'T-1',status:'PENDING',currency:'BRL',items:[{productId:id(10),variantId:null,nameSnapshot:'Produto',quantity:2,unitPriceCents:4900}],subtotalCents:9800,shippingCents:1000,discountCents:0,totalCents:10800,deliveryAddress:null,providerPaymentRef:null,createdAt:'2026-10-30T15:00:00Z'}
 assert.equal(orderSchema.safeParse(order).success,true)
 assert.equal(orderSchema.safeParse({...order,totalCents:1}).success,false)
 assert.equal(orderSchema.safeParse({...order,totalCents:10800.5}).success,false)
})

test('produtos são gravados somente com revisão da entidade e sem campos de layout',()=>{
 const fields={name:'Produto',slug:'produto',description:'',sku:'SKU',priceCents:4900,compareAtCents:null,categoryIds:[],imageIds:[],status:'draft',seo:{title:'Produto',description:''}}
 const create={origin:'real',storeId,id:null,expectedRevision:0,fields}
 assert.equal(saveProductCommandSchema.safeParse(create).success,true)
 assert.equal(saveProductCommandSchema.safeParse({...create,expectedRevision:1}).success,false)
 assert.equal(saveProductCommandSchema.safeParse({...create,layoutRevision:1}).success,false)
 assert.equal(saveProductCommandSchema.safeParse({...create,fields:{...fields,stockAvailable:100}}).success,false)
})

test('agendamento usa instante com offset e não exige republicar o visual',()=>{
 const notice=dataFixture().notices[0]
 assert.equal(isNoticeActive(notice,new Date('2026-10-30T14:59:59Z'),'new-visitors'),false)
 assert.equal(isNoticeActive(notice,new Date('2026-10-30T15:00:00Z'),'new-visitors'),true)
 assert.equal(isNoticeActive(notice,new Date('2026-10-30T16:00:00Z'),'new-visitors'),false)
 assert.equal(isNoticeActive(notice,new Date('invalid'),'new-visitors'),false)
})

test('referências removidas e ciclos de categorias são detectados',()=>{
 const data=dataFixture()
 const second={...data.categories[0],id:id(21),slug:'segunda',parentId:id(20)}
 data.categories[0].parentId=id(21)
 data.categories.push(second)
 assert.equal(checkDataReferences(data).includes('Árvore de categorias contém ciclo.'),true)
 assert.equal(categorySchema.safeParse({...second,parentId:second.id}).success,false)
})

test('fonte que aponta para item inexistente gera erro de binding',()=>{
 const layout=layoutFixture(),data=dataFixture()
 layout.pages[0].sections[0].blocks.push({id:'missing',type:'data',component:'product-grid',locked:false,visibility:everyone,style:{},overrides:{},binding:{source:'products',selection:{type:'category',categoryId:id(99)},sort:'newest',limit:8}})
 assert.equal(checkLayoutBindings(layout,data)[0]?.code,'missing-binding')
})

test('página ausente bloqueia publicação do conjunto navegável MVP',()=>{
 const layout=layoutFixture()
 layout.pages=layout.pages.filter(page=>page.type!=='cart')
 assert.equal(checkPublication(layout,dataFixture()).some(issue=>issue.code==='missing-page'),true)
})

test('rotas de ferramentas são separadas e matriz não concede operação ao Maker',()=>{
 assert.equal(makerPath(storeId),'/maker/'+storeId+'/home')
 assert.equal(managementPath(storeId,'products'),'/gerenciamento/'+storeId+'/products')
 assert.equal(ownership.find(row=>row.domain.startsWith('Produtos'))?.owner,'management')
 assert.equal(ownership.find(row=>row.domain.startsWith('Tema'))?.owner,'maker')
})


test('estilo do rodapé legal e seus overrides também preservam o tamanho mínimo',()=>{
 const layout=layoutFixture()
 layout.chrome.footer[0].overrides.mobile={fontSize:8}
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})

test('schema rejeita CSS arbitrário e HTML livre',()=>{
 const layout=layoutFixture()
 ;(layout.pages[0].sections[0].background as unknown as {css:string}).css='url(javascript:alert(1))'
 assert.equal(layoutDocumentSchema.safeParse(layout).success,false)
})


test('páginas distinguem carregamento, vazio, erro e conteúdo, sem dados fictícios',()=>{
 const state=resourceStateSchema(z.array(z.string()))
 assert.equal(state.safeParse({state:'loading'}).success,true)
 assert.equal(state.safeParse({state:'empty',message:'Nenhum produto encontrado.'}).success,true)
 assert.equal(state.safeParse({state:'error',code:'catalog-unavailable',message:'Tente novamente.',retryable:true}).success,true)
 assert.equal(state.safeParse({state:'ready',data:['produto']}).success,true)
 assert.equal(state.safeParse({state:'error',data:['produto']}).success,false)
})

test('comando de aviso não aceita um agendamento invertido nem revisão de layout',()=>{
 const notice=dataFixture().notices[0]
 const {schemaVersion: _schemaVersion,id: _id,storeId: _storeId,revision: _revision,...fields}=notice
 const command={origin:'real',storeId,id:null,expectedRevision:0,fields}
 assert.equal(saveNoticeCommandSchema.safeParse(command).success,true)
 assert.equal(saveNoticeCommandSchema.safeParse({...command,fields:{...fields,endsAt:'2026-10-30T11:00:00-03:00'}}).success,false)
 assert.equal(saveNoticeCommandSchema.safeParse({...command,layoutRevision:1}).success,false)
})


test('ser proprietário não dispensa a regra do plano nem a condição de publicação',()=>{
 const context={authenticatedUserId:id(2),storeId,membership:{userId:id(2),storeId,role:'owner' as const},structuralEditing:false,mayPublish:false}
 assert.equal(canPerform('layout.edit',context),true)
 assert.equal(canPerform('layout.reorder',context),false)
 assert.equal(canPerform('layout.publish',context),false)
 assert.equal(canPerform('team.manage',context),true)
})
