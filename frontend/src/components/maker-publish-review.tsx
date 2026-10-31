import { colorContrast } from '@/lib/color-contrast'
import { Dialog } from '@base-ui/react/dialog'
import { Modal } from '@/components/echo/modal'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Stack } from '@/components/echo/layout'
import { editorProblem } from '@/lib/editor-document'
import { ensureFullConfig, getStoreTemplate, type LayoutConfig } from '@/lib/maker'
import { SECTION_NAMES } from './maker-block-gallery'

export function MakerPublishReview({ config, previous, publishing, onConfirm }: { config: LayoutConfig; previous?: LayoutConfig; publishing: boolean; onConfirm: () => void }) {
  const full = ensureFullConfig(config)
  const problem = editorProblem(full)
  const base = getStoreTemplate(full.template)
  const contrast = colorContrast(full.branding.textColor || base.ink, full.branding.backgroundColor || base.background)
  const lowContrast = contrast !== null && contrast < 4.5
  const missingPhotos = full.products.filter(product => !product.image?.trim()).length
  const changed = previous ? full.components.filter(section => JSON.stringify(section) !== JSON.stringify(previous.components?.find(old => old.id === section.id))) : []
  const removed = previous?.components?.filter(section => !full.components.some(current => current.id === section.id)).length || 0
  return <Modal title="Revisar antes de publicar" size="md" description="Confira o conteúdo que seus clientes vão encontrar. A publicação só é confirmada após a resposta do servidor." trigger={<HardwareButton loading={publishing}>Publicar Loja</HardwareButton>}>
    <Stack gap={8}>
      {problem && <p role="alert">{problem}</p>}
      {lowContrast && <p role="alert">O contraste entre texto e fundo está em {contrast!.toFixed(2)}:1. Corrija em Sua marca antes de publicar; o mínimo para texto comum é 4,5:1.</p>}
      <ul className="maker-review-list">
        <li>{full.products.length ? String(full.products.length) + ' produto(s) no rascunho.' : 'O catálogo do rascunho está vazio.'}</li>
        <li>{missingPhotos ? String(missingPhotos) + ' produto(s) sem foto.' : 'Nenhum produto do rascunho está sem foto.'}</li>
        <li>Confira Pix, domínio e identificação da loja no painel. Este editor não confirma a configuração desses serviços.</li>
      </ul>
      <h3>O que mudou</h3>
      {!previous ? <p>Nenhuma publicação anterior está registrada neste navegador.</p> : <>
        <p>Comparação com a última publicação registrada neste navegador.</p>
        {full.name !== previous.name && <p>Nome da loja alterado.</p>}
        {(full.accent !== previous.accent || JSON.stringify(full.branding) !== JSON.stringify(previous.branding) || full.template !== previous.template) && <p>Visual ou identidade da marca alterados.</p>}
        {JSON.stringify(full.components.map(section=>section.id)) !== JSON.stringify(previous.components?.map(section=>section.id)) && <p>Ordem ou composição das seções alterada.</p>}
        {full.description !== previous.description && <p>Apresentação da marca alterada.</p>}
        <ul>{changed.map(section => <li key={section.id}>{SECTION_NAMES[section.type]}: conteúdo ou layout alterado.</li>)}</ul>
        {!!removed && <p>{removed} seção(ões) removida(s).</p>}
        {!changed.length && !removed && <p>Nenhuma seção teve seu conteúdo alterado.</p>}
      </>}
      <Dialog.Close render={<HardwareButton variant="primary" disabled={!!problem || lowContrast || publishing} onClick={onConfirm}>Confirmar publicação</HardwareButton>} />
    </Stack>
  </Modal>
}
