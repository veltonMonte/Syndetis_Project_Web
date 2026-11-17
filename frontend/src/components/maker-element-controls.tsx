import { Accordion } from '@/components/echo/accordion'
import { Field } from '@/components/echo/field'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Stack } from '@/components/echo/layout'
import { NumberField } from '@/components/echo/number-field'
import { Segmented } from '@/components/echo/segmented'
import { Select } from '@/components/echo/select'
import { cleanStyle, positionFor, POSITION_LIMITS, STYLE_LIMITS, withPosition, type FrameDevice } from '@/lib/maker-elements'
import type { ElementStyle, StoreComponent } from '@/lib/maker'

const ALIGN = ['start', 'center', 'end'] as const
const HEX = /^#[0-9a-f]{6}$/i

/** Position and look of the selected element: what the canvas handle does, in numbers, plus size, colour, border, shadow, layer and alignment. */
export function MakerElementControls({ section, device, disabled, onChange }: {
  section: StoreComponent
  device: FrameDevice
  disabled: boolean
  onChange: (patch: Partial<StoreComponent>) => void
}) {
  const position = positionFor(section, device)
  const style = cleanStyle(section.style) || {}
  const where = device === 'mobile' ? 'no celular' : 'no computador'
  const setStyle = (patch: Partial<ElementStyle>) => onChange({ style: cleanStyle({ ...section.style, ...patch }) })
  const number = (key: keyof typeof STYLE_LIMITS, label: string, fallback: number, unit = 'px') => <NumberField
    label={label + ' (' + unit + ')'} size="sm" disabled={disabled}
    min={STYLE_LIMITS[key][0]} max={STYLE_LIMITS[key][1]} step={1} smallStep={1} largeStep={10}
    incrementLabel={'Aumentar ' + label.toLowerCase()} decrementLabel={'Diminuir ' + label.toLowerCase()}
    value={(style[key] as number | undefined) ?? fallback}
    onValueChange={value => { if (value !== null) setStyle({ [key]: value }) }} />
  const color = (key: 'backgroundColor' | 'textColor' | 'borderColor', label: string, fallback: string) => <Field
    type="color" size="sm" label={label} disabled={disabled} value={style[key] || fallback}
    description={style[key] ? 'Cor personalizada.' : 'Segue o modelo até você escolher uma cor.'}
    onValueChange={value => { if (HEX.test(value)) setStyle({ [key]: value }) }} />
  return <Accordion><Accordion.Item value="free-layout"><Accordion.Trigger>Posição e aparência</Accordion.Trigger><Accordion.Panel><Stack gap={8}>
    {disabled && <p>Seu plano mantém a posição e a aparência do modelo.</p>}
    <p>Arraste <strong>Mover</strong> no canvas para levar este elemento a qualquer lugar. A posição {where} é salva separadamente.</p>
    <div className="maker-two-cols">
      <NumberField label={'Horizontal ' + where + ' (%)'} size="sm" disabled={disabled}
        min={POSITION_LIMITS.x[0]} max={POSITION_LIMITS.x[1]} step={1} smallStep={0.5} largeStep={10}
        incrementLabel="Mover para a direita" decrementLabel="Mover para a esquerda" value={position.x}
        onValueChange={x => { if (x !== null) onChange({ position: withPosition(section, device, { x, y: position.y }) }) }} />
      <NumberField label={'Vertical ' + where + ' (px)'} size="sm" disabled={disabled}
        min={POSITION_LIMITS.y[0]} max={POSITION_LIMITS.y[1]} step={8} smallStep={1} largeStep={80}
        incrementLabel="Mover para baixo" decrementLabel="Mover para cima" value={position.y}
        onValueChange={y => { if (y !== null) onChange({ position: withPosition(section, device, { x: position.x, y }) }) }} />
    </div>
    <HardwareButton size="sm" disabled={disabled || !section.position?.[device]} onClick={() => onChange({ position: withPosition(section, device, undefined) })}>
      {'Voltar à posição do modelo ' + where}
    </HardwareButton>

    <span className="control-label" id={'align-' + section.id}>Alinhamento</span>
    <Segmented aria-labelledby={'align-' + section.id} size="sm"
      options={['Esquerda', 'Centro', 'Direita'].map(label => ({ label, disabled }))} value={style.align ? ALIGN.indexOf(style.align) : -1}
      onValueChange={index => setStyle({ align: ALIGN[index] })} />

    <div className="maker-two-cols">
      {number('width', 'Largura', 100, '%')}
      {number('minHeight', 'Altura mínima', 0)}
    </div>
    <div className="maker-two-cols">
      {color('backgroundColor', 'Cor de fundo', '#ffffff')}
      {color('textColor', 'Cor do texto', '#000000')}
    </div>
    <div className="maker-two-cols">
      {number('borderWidth', 'Borda', 0)}
      {number('borderRadius', 'Cantos', 0)}
    </div>
    {!!style.borderWidth && color('borderColor', 'Cor da borda', '#000000')}
    <div className="maker-two-cols">
      <Select aria-label="Sombra" size="sm" disabled={disabled} value={style.shadow || 'none'}
        options={[{ value: 'none', label: 'Sem sombra' }, { value: 'soft', label: 'Sombra suave' }, { value: 'strong', label: 'Sombra forte' }]}
        onValueChange={value => { if (value) setStyle({ shadow: value === 'none' ? undefined : value as ElementStyle['shadow'] }) }} />
      {number('zIndex', 'Camada', 0, 'nível')}
    </div>
    <HardwareButton size="sm" disabled={disabled || !section.style} onClick={() => onChange({ style: undefined })}>Limpar aparência</HardwareButton>
  </Stack></Accordion.Panel></Accordion.Item></Accordion>
}
