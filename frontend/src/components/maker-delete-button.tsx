import { ConfirmButton } from '@/components/echo/confirm-button'
import { HardwareButton } from '@/components/echo/hardware-button'
export function MakerDeleteButton({ disabled, onRemove, label = 'Excluir seção' }: { disabled: boolean; onRemove: () => void; label?: string }) {
  if (disabled) return <HardwareButton size="sm" disabled>{label}</HardwareButton>
  return <ConfirmButton size="sm" align="start" feel="cut" confirmLabel="Remover seção" cancelLabel="Manter seção" onConfirm={onRemove}>{label}</ConfirmButton>
}
