import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { Move } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { cleanPosition, positionFor, type FrameDevice } from '@/lib/maker-elements'
import type { ElementPosition, StoreComponent } from '@/lib/maker'

interface Drag {
  pointer: number
  startX: number
  startY: number
  scale: number
  width: number
  origin: ElementPosition
  last?: ElementPosition
  node: HTMLElement
}

/**
 * Grab to move an element anywhere on the page: sideways, up and down, or both at once.
 * Shift keeps the move on one axis. Arrow keys nudge it (Shift for bigger steps), so the
 * move never depends on a pointer. While dragging, the element follows the pointer through
 * its inline style; the layout is written once, on release, as one step of undo history.
 */
export function FreeMoveHandle({ section, device, label, onMove }: {
  section: StoreComponent
  device: FrameDevice
  label: string
  onMove: (next: ElementPosition | undefined) => void
}) {
  const drag = useRef<Drag | null>(null)

  function place(node: HTMLElement, next: ElementPosition) {
    node.style.left = next.x ? next.x + '%' : ''
    node.style.top = next.y ? next.y + 'px' : ''
    if (!section.style?.zIndex) node.style.zIndex = next.x || next.y ? '1' : ''
  }

  function start(event: PointerEvent<HTMLSpanElement>) {
    if (event.button !== 0) return
    const node = event.currentTarget.closest<HTMLElement>('.shop-section')
    const viewport = node?.closest<HTMLElement>('.shop-viewport')
    if (!node || !viewport) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    // The Maker canvas is a scaled copy of the storefront: pointer pixels are not page pixels.
    const scale = node.getBoundingClientRect().width / (node.offsetWidth || 1) || 1
    drag.current = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, scale, width: viewport.clientWidth || 1, origin: positionFor(section, device), node }
    node.dataset.dragging = 'true'
  }

  function follow(event: PointerEvent<HTMLSpanElement>) {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    let dx = (event.clientX - current.startX) / current.scale
    let dy = (event.clientY - current.startY) / current.scale
    if (event.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
    const next = cleanPosition({ x: current.origin.x + dx / current.width * 100, y: current.origin.y + dy }) || { x: 0, y: 0 }
    current.last = next
    place(current.node, next)
  }

  function finish(event: PointerEvent<HTMLSpanElement>) {
    const current = drag.current
    if (!current || current.pointer !== event.pointerId) return
    drag.current = null
    delete current.node.dataset.dragging
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (event.type === 'pointercancel') { place(current.node, current.origin); return }
    const moved = current.last
    if (moved && (moved.x !== current.origin.x || moved.y !== current.origin.y)) onMove(cleanPosition(moved))
  }

  function nudge(event: KeyboardEvent<HTMLButtonElement>) {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const step = steps[event.key]
    if (!step) return
    event.preventDefault()
    event.stopPropagation()
    const size = event.shiftKey ? 5 : 1
    const origin = positionFor(section, device)
    onMove(cleanPosition({ x: origin.x + step[0] * size, y: origin.y + step[1] * size * 8 }))
  }

  // The wrapper turns off touch scrolling under the handle, so a finger drag moves the element.
  // Pointer events bubble from the button to this wrapper, which also captures the pointer.
  return <span className="maker-free-move" onPointerDown={start} onPointerMove={follow} onPointerUp={finish} onPointerCancel={finish}>
    <HardwareButton size="sm" variant="ghost" icon={<Move size={14} />}
      aria-label={label} title="Arraste para posicionar. Shift trava em um eixo; as setas também movem."
      onKeyDown={nudge}>Mover</HardwareButton>
  </span>
}
