import { useState } from 'react'
import { Eye, Monitor, Tablet as TabletIcon } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Modal } from '@/components/echo/modal'
import { Stack } from '@/components/echo/layout'
import { MacbookPro } from '@/components/ui/macbook-pro'
import { Tablet } from '@/components/ui/tablet'
import { StorePreview } from '@/components/store-preview'
import type { LayoutConfig } from '@/lib/maker'

export function MakerPreview({ config }: { config: LayoutConfig }) {
  const [device, setDevice] = useState<'notebook' | 'tablet'>('notebook')
  const hasSections = config.components?.some((section) => section.visible)
  return (
    <Modal
      size="lg"
      title="Visualizar sua loja"
      description="Confira o rascunho no dispositivo que preferir. Esta prévia não publica a loja."
      trigger={<HardwareButton icon={<Eye size={16} />}>Visualizar</HardwareButton>}
    >
      <Stack gap={9}>
        <Stack direction="row" gap={6} aria-label="Dispositivo da prévia">
          <HardwareButton
            aria-pressed={device === 'notebook'}
            held={device === 'notebook'}
            onClick={() => setDevice('notebook')}
            icon={<Monitor size={16} />}
          >
            Notebook
          </HardwareButton>
          <HardwareButton
            aria-pressed={device === 'tablet'}
            held={device === 'tablet'}
            onClick={() => setDevice('tablet')}
            icon={<TabletIcon size={16} />}
          >
            Tablet
          </HardwareButton>
        </Stack>
        <div className="maker-device-preview">
          {device === 'notebook' ? (
            <MacbookPro aria-label="Sua loja no notebook">
              <>
                {hasSections ? (
                  <StorePreview config={config} />
                ) : (
                  <div className="maker-preview-empty">Sua página está em branco.</div>
                )}
              </>
            </MacbookPro>
          ) : (
            <Tablet aria-label="Sua loja no tablet">
              <>
                {hasSections ? (
                  <StorePreview config={config} mobile />
                ) : (
                  <div className="maker-preview-empty">Sua página está em branco.</div>
                )}
              </>
            </Tablet>
          )}
        </div>
      </Stack>
    </Modal>
  )
}
