import { Dialog } from '@base-ui/react/dialog'
import { Modal } from '@/components/echo/modal'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Card } from '@/components/echo/card'
import { Grid, Stack } from '@/components/echo/layout'
import { StorePreviewFrame } from '@/components/store-preview-frame'
import { templateDemo } from '@/lib/store-templates'
import { templateCollections, type Template } from '@/lib/maker'

export function MakerTemplatePicker({ name, current, onChoose, disabled = false }: { disabled?: boolean; name: string; current: string; onChoose: (id: Template) => void }) {
  return <Modal size="lg" title="Trocar visual da loja" description="Confira miniaturas reais. A troca aplica cores, fontes e estrutura do modelo. Os textos padrão mudam; seus textos personalizados, logo e catálogo são preservados. Você pode desfazer a troca." trigger={<HardwareButton disabled={disabled}>Trocar visual</HardwareButton>}>
    <Stack gap={9}>{templateCollections.map(collection => <section key={collection.id}>
      <h3>{collection.title}</h3>
      <Grid minItemWidth="16rem" gap={8}>{collection.templates.map(template => <Card key={template.id} variant="screen" headingLevel={4} title={template.name + (current === template.id ? ' · atual' : '')} description={template.category}
        media={<div className="template-thumbnail" inert aria-hidden="true"><StorePreviewFrame config={templateDemo(template.id, name)} staticPreview /></div>}
        footer={<Dialog.Close render={<HardwareButton fullWidth onClick={() => onChoose(template.id)}>Usar {template.name}</HardwareButton>} />} />)}</Grid>
    </section>)}</Stack>
  </Modal>
}
