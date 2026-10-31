import { MakerHistory } from '../src/lib/maker-history'
import { templates, getStoreTemplate } from '../src/lib/maker'
import { applyStoreTemplate } from '../src/lib/store-templates'
import { test, expect } from '@playwright/test'
import { createMakerDraft } from '../src/lib/maker-project'
import { editorDocumentSchema, toEditorDocument } from '../src/lib/editor-document'
import { ensureFullConfig } from '../src/lib/maker'
import { toCoreLayoutPayload } from '../src/lib/layout-payload'
import { publishedLayout } from '../src/lib/published-layout'

test('documento versionado valida slots de conteúdo e rejeita URL executável',()=>{
 const config=createMakerDraft('Minha marca','linha')
 expect(toEditorDocument(config).schemaVersion).toBe(1)
 config.components![1].ctaUrl='javascript:alert(1)'
 expect(()=>toEditorDocument(config)).toThrow()
})
test('schema rejeita identificadores duplicados e rodapé oculto',()=>{
 const doc=toEditorDocument(createMakerDraft('Minha marca','linha'))
 doc.page.sections.push(doc.page.sections[0])
 expect(editorDocumentSchema.safeParse(doc).success).toBe(false)
 doc.page.sections.pop()
 doc.page.sections.find(section=>section.type==='footer')!.visible=false
 expect(editorDocumentSchema.safeParse(doc).success).toBe(false)
})
test('contrato publicado preserva identidade, texto, imagem e ação no mesmo renderer',()=>{
 const config=ensureFullConfig(createMakerDraft('Minha marca','linha'))
 config.components[1].ctaUrl='https://example.test/colecao'
 config.components[1].imageUrl='https://example.test/foto.jpg'
 config.branding.backgroundColor='#fefefe'
 config.branding.bodyFontFamily='Figtree, Segoe UI, sans-serif'
 const layout=toCoreLayoutPayload(config)
 const result=publishedLayout({id:'store',name:'Nome anterior',slug:'marca',status:'ACTIVE',shippingFee:0,deliveryInstructions:'',layout},[])
 expect(result.components![1]).toMatchObject({type:'hero',title:config.components[1].title,ctaUrl:'https://example.test/colecao',imageUrl:'https://example.test/foto.jpg'})
 expect(result.name).toBe('Minha marca')
 expect(result.branding).toMatchObject({backgroundColor:'#fefefe',bodyFontFamily:'Figtree, Segoe UI, sans-serif'})
})

test('vitrine pública usa o renderer compartilhado e mantém a sacola e o checkout reais',async({page})=>{
 const config=ensureFullConfig(createMakerDraft('Marca Pública','linha'))
 config.components[1].title='Criado no Maker'
 config.components[1].ctaUrl='https://example.test/colecao'
 const layout=toCoreLayoutPayload(config)
 await page.route('**/api/core/public/stores/marca-publica**',async route=>{
   const url=new URL(route.request().url())
   await route.fulfill({json:url.pathname.endsWith('/products') ? {content:[{id:'p1',name:'Produto real',description:'Descrição',sku:'SKU',imageUrl:null,price:42}],page:0,totalPages:1,totalElements:1} : {id:'store',name:'Marca Pública',slug:'marca-publica',status:'ACTIVE',shippingFee:10,deliveryInstructions:'Entrega da loja',layout}})
 })
 await page.goto('/#/lojas/marca-publica')
 await expect(page.locator('.shop-template')).toHaveAttribute('data-store-template','linha')
 await expect(page.locator('.shop-hero h3')).toHaveText('Criado no Maker')
 await expect(page.getByRole('link',{name:'Ver produtos',exact:true})).toHaveAttribute('href','https://example.test/colecao')
 await page.getByRole('button',{name:'Adicionar ao pedido',exact:true}).click()
 await expect(page.getByRole('button',{name:'Sacola (1)',exact:true})).toBeVisible()
 await expect(page.locator('.checkout')).toContainText('1 × Produto real')
 await expect(page.getByRole('link',{name:'Entre para continuar',exact:true})).toBeVisible()
 await expect(page.locator('.shop-template')).not.toContainText('Frete demonstrativo')
 await expect(page.locator('.shop-template [contenteditable], .maker-floating-tools, .maker-insert-point')).toHaveCount(0)
})


test('trocar de modelo aplica sua identidade e mantém catálogo e edições do lojista',()=>{
  const previous=ensureFullConfig(createMakerDraft('Minha marca','linha'))
  previous.accent='#6857eb'
  previous.branding={headingFontFamily:'Georgia, serif',backgroundColor:'#ffffff',textColor:'#aabbcc',bodyFontFamily:'Arial, sans-serif',radius:0,spacing:48,typeScale:1.15,logoUrl:'https://example.test/logo.png'}
  previous.components[1].title='Meu título personalizado'
  for(const template of templates) {
    const next=applyStoreTemplate(previous,template.id)
    const preset=getStoreTemplate(next.template)
    expect(next.accent).toBe(preset.accent)
    expect(next.branding).toEqual({logoUrl:'https://example.test/logo.png'})
    expect(next.products).toEqual(previous.products)
    expect(next.categories).toEqual(previous.categories)
    expect(next.components!.find(section=>section.type==='hero')!.title).toBe('Meu título personalizado')
    expect(next.components!.map(section=>section.type)).toEqual(template.sections)
  }
  const pulso=applyStoreTemplate(createMakerDraft('Minha marca','linha'),'pulso')
  expect(pulso.components!.find(section=>section.type==='hero')!.title).toBe(getStoreTemplate('pulso').cinematic!.headline)
})


test('histórico limita 50 ações, agrupa digitação e descarta refazer após nova edição',()=>{
  const original=createMakerDraft('Marca inicial','linha')
  const history=new MakerHistory(original)
  history.record({...original,name:'A'},'name',1000)
  history.record({...original,name:'AB'},'name',1100)
  expect(history.past).toHaveLength(1)
  expect(history.undo()?.name).toBe('Marca inicial')
  expect(history.redo()?.name).toBe('AB')
  for(let index=0;index<60;index++)history.record({...original,name:'Marca '+index})
  expect(history.past).toHaveLength(50)
  const previous=history.undo()!
  history.record({...previous,name:'Outro caminho'})
  expect(history.redo()).toBeNull()
})
