import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Eye } from 'lucide-react'
import { Card } from '@/components/echo/card'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Modal } from '@/components/echo/modal'
import { Segmented } from '@/components/echo/segmented'
import { Stack } from '@/components/echo/layout'
import { StorePreview } from '@/components/store-preview'
import { templateDemo } from '@/lib/store-templates'
import { getStoreTemplate, type StoreTemplate } from '@/lib/maker'

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
        <div
          className="template-thumbnail"
          data-motion={template.collection === 'movimento' || undefined}
          aria-hidden="true"
          inert
        >
          <div className="template-thumbnail-content">
            <StorePreview config={demo} staticPreview />
          </div>
        </div>
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
                  A finalização de compra fica desativada nesta prévia.
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

function TemplateViewport({
  device,
  config,
}: {
  device: 'desktop' | 'phone'
  config: ReturnType<typeof templateDemo>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const scale = device === 'desktop' ? width / 1100 : 1
  return (
    <div ref={ref} className="template-inspection" data-device={device}>
      <div
        className="template-inspection-content"
        style={{ '--template-scale': scale } as CSSProperties}
      >
        <StorePreview
          config={config}
          interactiveDemo={!!getStoreTemplate(config.template).collection}
        />
      </div>
    </div>
  )
}
