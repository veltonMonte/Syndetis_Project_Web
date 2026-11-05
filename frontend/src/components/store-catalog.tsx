import { useState } from 'react'
import { Field } from '@/components/echo/field'
import { Textarea } from '@/components/echo/textarea'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Stack } from '@/components/echo/layout'
import { Select } from '@/components/echo/select'
import { Pagination } from '@/components/echo/pagination'
import { core, json, money } from '@/lib/api'
import { useAction, useResource } from '@/lib/hooks'
import { slugify } from '@/lib/maker'
import type { Inventory, Page, Product } from '@/lib/types'

type Category = { id:string; name:string; slug:string; position:number }
const empty = {name:'',sku:'',price:'',description:'',imageUrl:'',categoryId:'',active:true}
export function StoreCatalog({storeId}:{storeId:string}) {
  const [page,setPage]=useState(1)
  const products=useResource<Page<Product>>(`/stores/${storeId}/products?page=${page-1}`)
  const categories=useResource<Category[]>(`/stores/${storeId}/categories`)
  const inventory=useResource<Inventory[]>(`/stores/${storeId}/inventory`)
  const [form,setForm]=useState(empty)
  const [editing,setEditing]=useState<string|null>(null)
  const [categoryName,setCategoryName]=useState('')
  const [units,setUnits]=useState<Record<string,string>>({})
  const [message,setMessage]=useState('')
  const action=useAction()
  const refresh=()=>{products.reload();inventory.reload()}
  return <Stack gap={9}>
    <h2>Catálogo e estoque</h2>
    <p>Os produtos cadastrados aqui são usados na vitrine e nos pedidos. Depois de cadastrar, adicione unidades ao estoque. O servidor aplica os limites do plano.</p>
    <HardwareButton href="#/criar">Voltar ao Maker</HardwareButton>
    <form onSubmit={event=>{event.preventDefault();void action.run(async()=>{
      await core(`/stores/${storeId}/categories`,{method:'POST',body:json({name:categoryName.trim(),slug:slugify(categoryName),position:categories.data?.length || 0})})
      setCategoryName('');setMessage('Categoria cadastrada.');categories.reload()
    })}}><Stack gap={6}>
      <Field label="Nova categoria" value={categoryName} onValueChange={setCategoryName} required minLength={2} maxLength={100}/>
      <HardwareButton type="submit" disabled={action.busy}>Cadastrar categoria</HardwareButton>
    </Stack></form>
    <h3>{editing ? 'Editar produto' : 'Novo produto'}</h3>
    <form onSubmit={event=>{event.preventDefault();void action.run(async()=>{
      const price=Number(form.price.replace(',','.'))
      if(!Number.isFinite(price) || price<=0)throw new Error('Informe um preço maior que zero.')
      await core(`/stores/${storeId}/products${editing ? '/'+editing : ''}`,{method:editing?'PUT':'POST',body:json({...form,name:form.name.trim(),sku:form.sku.trim(),price,imageUrl:form.imageUrl || null,categoryId:form.categoryId || null})})
      setForm(empty);setEditing(null);setMessage('Produto salvo no catálogo real. Confira o estoque antes de vender.');refresh()
    })}}><Stack gap={6}>
      <Field label="Nome do produto no catálogo" required minLength={2} maxLength={160} value={form.name} onValueChange={name=>setForm({...form,name})}/>
      <Field label="SKU do produto" required maxLength={100} value={form.sku} onValueChange={sku=>setForm({...form,sku})}/>
      <Field label="Preço de venda (R$)" inputMode="decimal" required value={form.price} onValueChange={price=>setForm({...form,price})}/>
      <Field label="Foto do produto (URL)" type="url" maxLength={2048} value={form.imageUrl} onValueChange={imageUrl=>setForm({...form,imageUrl})}/>
      <Textarea label="Descrição do produto" maxLength={10000} value={form.description} onValueChange={description=>setForm({...form,description})}/>
      <Select aria-label="Categoria do produto" value={form.categoryId || 'none'} options={[{value:'none',label:'Sem categoria'},...(categories.data||[]).map(item=>({value:item.id,label:item.name}))]} onValueChange={value=>setForm({...form,categoryId:value==='none'?'':value || ''})}/>
      <Select aria-label="Disponibilidade do produto" value={form.active?'active':'inactive'} options={[{value:'active',label:'Ativo na loja'},{value:'inactive',label:'Inativo'}]} onValueChange={value=>setForm({...form,active:value==='active'})}/>
      <HardwareButton type="submit" variant="primary" disabled={action.busy}>{editing?'Salvar produto':'Cadastrar produto real'}</HardwareButton>
      {editing && <HardwareButton onClick={()=>{setEditing(null);setForm(empty)}}>Cancelar edição</HardwareButton>}
    </Stack></form>
    {(action.error || products.error || categories.error || inventory.error) && <div role="alert"><p>{action.error || products.error || categories.error || inventory.error}</p><HardwareButton onClick={()=>{refresh();categories.reload()}}>Tentar carregar catálogo novamente</HardwareButton></div>}
    <p role="status">{message}</p>
    {products.loading ? <p role="status">Carregando catálogo…</p> : !products.data?.content.length && <p>Nenhum produto cadastrado nesta página.</p>}
    {(products.data?.content || []).map(product=><section key={product.id}>
      <h3>{product.name}</h3><p>{money(product.price)} · {product.active===false?'Inativo':'Ativo'} · Disponíveis: {inventory.data?.find(item=>item.productId===product.id)?.available ?? 'Não informado'}</p>
      <HardwareButton onClick={()=>{setEditing(product.id);setForm({name:product.name,sku:product.sku,price:String(product.price),description:product.description || '',imageUrl:product.imageUrl || '',categoryId:product.categoryId || '',active:product.active!==false});window.scrollTo({top:0})}}>Editar {product.name}</HardwareButton>
      <form onSubmit={event=>{event.preventDefault();void action.run(async()=>{
        const delta=Number(units[product.id])
        if(!Number.isInteger(delta)||delta<1||delta>100000)throw new Error('Informe de 1 a 100.000 unidades inteiras.')
        await core(`/stores/${storeId}/inventory/${product.id}/movements`,{method:'POST',body:json({delta,reason:'Entrada pelo painel do lojista'})})
        setUnits({...units,[product.id]:''});setMessage('Estoque atualizado.');inventory.reload()
      })}}><Stack gap={6}>
        <Field label={'Adicionar unidades de '+product.name} inputMode="numeric" required value={units[product.id] || ''} onValueChange={value=>setUnits({...units,[product.id]:value})}/>
        <HardwareButton type="submit" disabled={action.busy}>Adicionar estoque</HardwareButton>
      </Stack></form>
    </section>)}
    <Pagination page={page} count={products.data?.totalPages || 1} onPageChange={setPage} aria-label="Páginas do catálogo"/>
  </Stack>
}
