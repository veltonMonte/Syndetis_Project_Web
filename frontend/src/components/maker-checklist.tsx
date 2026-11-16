import { HardwareButton } from '@/components/echo/hardware-button'
import { Accordion } from '@/components/echo/accordion'
import { ensureFullConfig, type LayoutConfig } from '@/lib/maker'
export function MakerChecklist({ config, onBrand, onProducts }: { config: LayoutConfig; onBrand: () => void; onProducts: () => void }) {
  const full = ensureFullConfig(config)
  const checks = [
    { label: 'Nome da loja', done: full.name.trim().length >= 2, action: onBrand },
    { label: 'Visual escolhido', done: full.template !== 'blank', action: onBrand },
    { label: 'Logo da marca', done: !!full.branding.logoUrl?.trim(), action: onBrand },
    { label: '3 produtos reais no rascunho', done: full.products.length >= 3, action: onProducts },
  ]
  return <Accordion><Accordion.Item value="checklist"><Accordion.Trigger>Preparação da loja: {checks.filter(check => check.done).length} de {checks.length}</Accordion.Trigger><Accordion.Panel>
    <ul className="maker-checklist">{checks.map(check => <li key={check.label}><span>{check.done ? 'Concluído' : 'A fazer'}</span><HardwareButton variant="ghost" onClick={check.action}>{check.label}</HardwareButton></li>)}</ul>
    <p>Pagamento, domínio e identificação precisam ser conferidos no painel. Este checklist considera somente o conteúdo do rascunho.</p>
  </Accordion.Panel></Accordion.Item></Accordion>
}
