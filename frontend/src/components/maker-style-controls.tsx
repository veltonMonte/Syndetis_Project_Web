import { useRef } from 'react'
import { colorContrast, luminance } from '@/lib/color-contrast'
import { Accordion } from '@/components/echo/accordion'
import { Field } from '@/components/echo/field'
import { Select } from '@/components/echo/select'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Stack } from '@/components/echo/layout'
import { getStoreTemplate, type LayoutConfig } from '@/lib/maker'

const serif = ['Newsreader, Georgia, serif', 'Instrument Serif, Georgia, serif', 'Bodoni Moda, Georgia, serif', 'Georgia, serif']
const sans = ['DM Sans, Segoe UI, sans-serif', 'Figtree, Segoe UI, sans-serif', 'Jost, Segoe UI, sans-serif', 'Barlow, Segoe UI, sans-serif', 'Bricolage Grotesque, Arial, sans-serif']
export const fontPairs = [...serif, 'Space Grotesk, Arial, sans-serif'].flatMap((heading, index) => sans.slice(0, 4).map((body, number) => ({
  value: String(index * 4 + number), label: heading.split(',')[0] + ' / ' + body.split(',')[0], heading, body,
})))
export function MakerStyleControls({ config, onChange }: { config: LayoutConfig; onChange: (patch: Partial<LayoutConfig>) => void }) {
  const preset = getStoreTemplate(config.template)
  const brand = config.branding || {}
  const latestBrand = useRef(brand)
  latestBrand.current = brand
  const setBrand = (patch: NonNullable<LayoutConfig['branding']>) => {
    latestBrand.current = { ...latestBrand.current, ...patch }
    onChange({ branding: latestBrand.current })
  }
  const colors = [
    { label: 'Cor principal', value: config.accent, change: (value: string) => onChange({ accent: value }) },
    { label: 'Cor secundária', value: brand.secondaryColor ?? preset.accent, change: (value: string) => setBrand({ secondaryColor: value }) },
    { label: 'Fundo da loja', value: brand.backgroundColor ?? preset.background, change: (value: string) => setBrand({ backgroundColor: value }) },
    { label: 'Texto da loja', value: brand.textColor ?? preset.ink, change: (value: string) => setBrand({ textColor: value }) },
    { label: 'Cor de destaque', value: brand.highlightColor ?? config.accent, change: (value: string) => setBrand({ highlightColor: value }) },
  ]
  const background = brand.backgroundColor || preset.background
  const ink = brand.textColor || preset.ink
  const ratio = colorContrast(ink, background)
  const pair = fontPairs.find(item => item.heading === brand.headingFontFamily && item.body === brand.bodyFontFamily)?.value || ''
  return <Stack gap={9}>
    <h2>Cores e fontes</h2>
    <p>As alterações valem para toda a loja. A aparência do painel continua independente.</p>
    {colors.slice(0,1).map(item => <Field key={item.label} type="color" label={item.label} value={item.value} description="Escolha a cor dos botões e destaques da sua loja." onValueChange={item.change} error={!/^#[0-9a-f]{6}$/i.test(item.value) ? 'Use uma cor como #2457A7.' : undefined} />)}
    <Select aria-label="Par de fontes"  value={pair} placeholder="Escolha uma combinação" options={fontPairs} onValueChange={value => {
      const selected = fontPairs.find(item => item.value === value)
      if (selected) setBrand({ headingFontFamily: selected.heading, bodyFontFamily: selected.body })
    }} />
    <Select aria-label="Cantos da loja" value={String(brand.radius ?? preset.radius)} options={[{ value: '0', label: 'Retos' }, { value: '0.4', label: 'Suaves' }, { value: '0.8', label: 'Arredondados' }, { value: '1', label: 'Muito arredondados' }, ...(![0,.4,.8,1].includes(brand.radius ?? preset.radius) ? [{value: String(brand.radius ?? preset.radius), label: 'Do modelo'}] : [])]} onValueChange={value => { if (value) setBrand({ radius: Number(value) }) }} />
    <Accordion><Accordion.Item value="appearance"><Accordion.Trigger>Mais opções de aparência</Accordion.Trigger><Accordion.Panel><Stack gap={8}>
    {colors.slice(1).map(item => <Field key={item.label} type="color" label={item.label} value={item.value} description="Escolha a cor ou informe seu código no seletor." onValueChange={item.change} error={!/^#[0-9a-f]{6}$/i.test(item.value) ? 'Use uma cor como #2457A7.' : undefined} />)}
    {ratio !== null && ratio < 4.5 && <Stack gap={6}><p role="status">Contraste de texto e fundo: {ratio.toFixed(2)}:1. Use pelo menos 4,5:1 para texto comum.</p><HardwareButton onClick={()=>setBrand({textColor:luminance(background)>.179 ? '#000000' : '#ffffff'})}>Corrigir contraste do texto</HardwareButton></Stack>}
    <Select aria-label="Escala de texto" value={String(brand.typeScale ?? 1)} options={[{ value: '0.9', label: 'Compacta' }, { value: '1', label: 'Padrão' }, { value: '1.15', label: 'Ampliada' }]} onValueChange={value => { if (value) setBrand({ typeScale: Number(value) }) }} />

    <Select aria-label="Respiro entre seções" value={String(brand.spacing ?? 0)} options={[{value:'0',label:'Do modelo'}, {value:'16',label:'16 px'}, {value:'32',label:'32 px'}, {value:'48',label:'48 px'}]} onValueChange={value => { if (value) setBrand({ spacing: Number(value) }) }} />
    </Stack></Accordion.Panel></Accordion.Item></Accordion>
  </Stack>
}
