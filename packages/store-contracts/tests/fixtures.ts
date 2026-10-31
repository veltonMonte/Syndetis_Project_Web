import { dataSnapshotSchema } from '../src/data.ts'
import { layoutDocumentSchema, pageTypes, requiredSystemRoles } from '../src/layout.ts'

export const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
export const storeId=id(1)
export const everyone={desktop:true,tablet:true,mobile:true} as const
const meta=(n:number)=>({schemaVersion:1 as const,id:id(n),storeId,revision:1})
export function dataFixture() {
  return dataSnapshotSchema.parse({
    schemaVersion:1,dataRevision:1,storeId,origin:'real',
    profile:{storeId,displayName:'Marca de teste',slug:'marca',legalName:'',documentDisplay:null,channels:{email:'contato@example.test',whatsapp:'+5511999999999',instagram:'marca_teste'},verificationStatus:'unverified',status:'active',unavailableReason:null},
    products:[{...meta(10),name:'Produto de teste',slug:'produto-teste',description:'Texto do gerenciamento',status:'active',sku:'SKU-1',priceCents:4900,compareAtCents:null,stockAvailable:10,categoryIds:[id(20)],collectionIds:[],variantIds:[],images:[],seo:{title:'Produto',description:''}}],
    variants:[],collections:[],
    categories:[{...meta(20),name:'Coleção',slug:'colecao',parentId:null,position:0,imageId:null,seo:{title:'Coleção',description:''}}],
    notices:[{...meta(30),title:'Aviso de teste',text:'Texto do gerenciamento',placement:'strip',active:true,startsAt:'2026-10-30T12:00:00-03:00',endsAt:'2026-10-30T13:00:00-03:00',audience:'all',destination:{type:'category',categoryId:id(20)}}],
    pages:[{...meta(40),kind:'privacy',title:'Privacidade',slug:'privacidade',body:'Política de teste',format:'plain-text',status:'published',seo:{title:'Privacidade',description:''}}],
  })
}
export function layoutFixture() {
  const system=(role:string,nodeId:string)=>({id:nodeId,type:'system',role,locked:true,visibility:{...everyone},style:{},overrides:{}})
  return layoutDocumentSchema.parse({
    schemaVersion:2,storeId,layoutRevision:1,templateId:'linha',
    theme:{primary:'#2457a7',secondary:'#142338',background:'#ffffff',text:'#17202a',highlight:'#28693f',fontPairId:'newsreader-dm-sans',typeScale:'standard',radius:'small',spacing:'standard',logoAssetId:null,cartPresentation:'drawer'},
    chrome:{header:[system('cart-control','global-cart')],footer:[system('legal-footer','global-legal'),system('verification','global-verification'),system('report-store','global-report')]},
    pages:pageTypes.map(type=>({
      id:'page-'+type,type,
      sections:[{id:'section-'+type,kind:'standard',locked:false,visibility:{...everyone},background:{type:'color',color:'background'},spacing:16,
        layout:{columns:1,horizontal:'start',vertical:'top',width:'contained'},
        blocks:type==='institutional' ? [{id:'content-institutional',type:'data',component:'page-content',locked:false,visibility:{...everyone},style:{},overrides:{},binding:{source:'current-page-content'}}] :
          (requiredSystemRoles[type] || []).map(role=>system(role,type+'-'+role)),
      }],
    })),
  })
}
