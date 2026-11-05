import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Card } from '@/components/echo/card'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Modal } from '@/components/echo/modal'
import { Segmented } from '@/components/echo/segmented'
import { Stack } from '@/components/echo/layout'
import { StorePreviewFrame } from '@/components/store-preview-frame'
import { templateDemo } from '@/lib/store-templates'
import { type StoreTemplate } from '@/lib/maker'

export function TemplateCard({
  template,
  onChoose,
  name,
  headingLevel = 3,
}: {
  template: StoreTemplate
  onChoose: () => void
  name?: string
  headingLevel?: 2 | 3 | 4
}) {
  const [device, setDevice] = useState<'desktop' | 'phone'>(() =>
    window.matchMedia('(max-width: 760px)').matches ? 'phone' : 'desktop',
  )
  const demo = templateDemo(template.id, name || 'Sua marca')
  return (
    <Card
      variant="screen"
      headingLevel={headingLevel}
      title={template.name}
      description={
        <span className="template-card-description">{template.category}</span>
      }
      media={
        <TemplateThumbnail config={demo} />
      }
      footer={
        <Stack gap={6}>
          <HardwareButton fullWidth onClick={onChoose}>
            Usar {template.name}
          </HardwareButton>
          <Modal
            size="lg"
            title={'Prévia de ' + template.name}
            description="Prévia do modelo. Os produtos e preços são exemplos e não entram no seu catálogo."
            trigger={
              <HardwareButton
                fullWidth
                variant="ghost"
                icon={<Eye size={16} />}
              >
                {'Pré-visualizar ' + template.name}
              </HardwareButton>
            }
          >
            <Stack gap={8}>
              <Segmented
                aria-label="Tamanho da prévia"
                value={device === 'desktop' ? 0 : 1}
                onValueChange={(value) =>
                  setDevice(value === 0 ? 'desktop' : 'phone')
                }
                options={['Computador', 'Celular']}
              />
              <TemplateViewport device={device} config={demo} />
              {template.collection && (
                <p className="template-preview-note">
                  Experimente as variações, a sacola e o frete de demonstração.
                  A finalização mostra um exemplo de pedido, sem cobrança.
                </p>
              )}
              <p className="template-preview-note">
                Conteúdo demonstrativo. Ao usar este modelo, sua loja começa sem
                produtos, categorias, selos ou contatos fictícios.
              </p>
              <HardwareButton fullWidth onClick={onChoose}>
                {'Usar ' + template.name + ' no Maker'}
              </HardwareButton>
            </Stack>
          </Modal>
        </Stack>
      }
    />
  )
}

function TemplateThumbnail({config}: {config: ReturnType<typeof templateDemo>}) {
  return <div className="template-thumbnail" aria-hidden="true" inert>
    <StorePreviewFrame config={config} staticPreview />
  </div>
}
function TemplateViewport({device,config}: {device:'desktop'|'phone'; config:ReturnType<typeof templateDemo>}) {
  return <div className="template-inspection" data-device={device}>
    <StorePreviewFrame config={config} device={device} interactiveDemo previewNavigation />
  </div>
}
