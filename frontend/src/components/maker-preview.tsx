import { useState } from 'react'
import { Eye, Monitor, Tablet as TabletIcon } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Modal } from '@/components/echo/modal'
import { Stack } from '@/components/echo/layout'
import { MacbookPro } from '@/components/ui/macbook-pro'
import { Tablet } from '@/components/ui/tablet'
import { StorePreviewFrame } from '@/components/store-preview-frame'
import type { LayoutConfig } from '@/lib/maker'

export function MakerPreview({ config }: { config: LayoutConfig }) {
  const [device, setDevice] = useState<'notebook' | 'tablet' | 'page'>('notebook')
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
        <HardwareButton aria-pressed={device === 'page'} onClick={()=>setDevice('page')}>Página completa</HardwareButton>
        <p>Use as abas da prévia para navegar da vitrine até a finalização.</p>
        <div className="maker-device-preview">
          {device === 'page' ? <div className="maker-full-preview"><StorePreviewFrame config={config} interactiveDemo previewNavigation /></div> : device === 'notebook' ? (
            <MacbookPro aria-label="Sua loja no notebook">
              <>
                {hasSections ? (
                  <StorePreviewFrame config={config} device="desktop" interactiveDemo previewNavigation />
                ) : (
                  <div className="maker-preview-empty">Sua página está em branco.</div>
                )}
              </>
            </MacbookPro>
          ) : (
            <Tablet aria-label="Sua loja no tablet">
              <>
                {hasSections ? (
                  <StorePreviewFrame config={config} device="tablet" mobile interactiveDemo previewNavigation />
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
