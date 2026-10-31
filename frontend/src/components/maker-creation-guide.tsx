import { useState } from 'react'
import { safeUrl } from '@/lib/editor-document'
import { TemplateCard } from '@/components/template-card'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Select } from '@/components/echo/select'
import { Grid, Stack } from '@/components/echo/layout'
import { templateCollections, type Template } from '@/lib/maker'

export interface CreationDetails { name: string; logo: string; segment: string }
export const SEGMENTS = [
  {value:'general',label:'Multimarcas ou outro segmento'},
  {value:'fashion',label:'Moda e acessórios'},
  {value:'home',label:'Casa e decoração'},
  {value:'care',label:'Beleza e cuidados'},
  {value:'food',label:'Alimentos e bebidas'},
  {value:'technology',label:'Tecnologia e utilidades'},
]
export const SEGMENT_COPY: Record<string,{title:string;subtitle:string}> = {
  fashion:{title:'Encontre o seu próximo favorito.',subtitle:'Conheça as peças e os detalhes da nossa seleção.'},
  home:{title:'Detalhes que fazem parte de casa.',subtitle:'Explore nossa seleção para os seus espaços.'},
  care:{title:'Cuidado em cada escolha.',subtitle:'Conheça nossa seleção e encontre o que combina com sua rotina.'},
  food:{title:'Escolhas para saborear.',subtitle:'Descubra os produtos e conheça nossa seleção.'},
  technology:{title:'Novas possibilidades para o seu dia.',subtitle:'Explore os produtos e confira cada detalhe.'},
}
export function MakerCreationGuide({ initialName, intent, onFinish }: { initialName: string; intent?: Template | null; onFinish: (template:Template,details:CreationDetails)=>void }) {
  const [step,setStep] = useState(1)
  const [segment,setSegment] = useState('general')
  const [template,setTemplate] = useState<Template | null>(intent || null)
  const [name,setName] = useState(initialName === 'Minha loja' ? '' : initialName)
  const [logo,setLogo] = useState('')
  const [error,setError] = useState('')
  function finish() {
    if(name.trim().length<2) { setError('Informe um nome com pelo menos 2 caracteres.'); return }
    if(!safeUrl.safeParse(logo).success) { setError('Use o endereço HTTP ou HTTPS da imagem do logo.'); return }
    if(template) onFinish(template,{name:name.trim(),logo,segment})
  }
  return <Stack gap={9}>
    <ol className="maker-guide-steps" aria-label="Etapas de criação">{['O que você vende','Escolha um visual','Nome e logo'].map((label,index)=><li key={label} aria-current={step===index+1 ? 'step' : undefined}><span>{index+1}</span>{label}</li>)}</ol>
    {step===1 && <Stack gap={8}>
      <h2>O que você vende?</h2><p>O segmento ajuda a preparar os textos. Você pode usar qualquer visual e mudar o conteúdo depois.</p>
      <Select aria-label="Segmento da loja" value={segment} options={SEGMENTS} onValueChange={value=>{if(value)setSegment(value)}}/>
      <p>Os exemplos aparecem somente na prévia. Seu catálogo real começa vazio.</p>
      <HardwareButton variant="primary" onClick={()=>setStep(2)}>Escolher visual</HardwareButton>
    </Stack>}
    {step===2 && <>
      <HardwareButton variant="ghost" onClick={()=>setStep(1)}>Voltar ao segmento</HardwareButton>
      <div>{templateCollections.map(collection=><section className="template-collection" key={collection.id}><h2>{collection.title}</h2><p>{collection.description}</p><Grid minItemWidth="max(18rem, calc((100% - var(--echo-space-9) * 2) / 3))" gap={9}>{collection.templates.map(item=><TemplateCard key={item.id} template={item} name={name || 'Sua marca'} onChoose={()=>{setTemplate(item.id);setStep(3)}}/>)}</Grid></section>)}</div>
    </>}
    {step===3 && <Stack gap={8}>
      <h2>Agora, a sua marca</h2><p>Visual escolhido: {templateCollections.flatMap(collection=>collection.templates).find(item=>item.id===template)?.name}</p>
      <Field label="Nome da sua loja" value={name} onValueChange={value=>{setName(value);setError('')}} maxLength={60} autoComplete="organization" placeholder="Digite o nome da sua marca"/>
      <Field label="Logo da loja (opcional)" type="url" value={logo} onValueChange={value=>{setLogo(value);setError('')}} placeholder="https://..." description="Cole o endereço da imagem ou adicione o logo depois."/>
      {error && <p role="alert">{error}</p>}
      <HardwareButton variant="primary" onClick={finish}>Abrir minha loja no Maker</HardwareButton>
      <HardwareButton variant="ghost" onClick={()=>setStep(2)}>Voltar aos visuais</HardwareButton>
    </Stack>}
  </Stack>
}
