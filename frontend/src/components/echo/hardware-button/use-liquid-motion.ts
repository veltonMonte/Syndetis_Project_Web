import { useCallback, useEffect, useState } from 'react'

/** Subtle tactile response that respects prefers-reduced-motion (WCAG 2.2 AA). */
export function useLiquidMotion(enabled: boolean, iconOnly = false) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const attach = useCallback((element: HTMLElement | null) => setNode(element), [])
  useEffect(() => {
    if (!node || !enabled) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) {
      node.style.removeProperty('translate')
      node.style.removeProperty('scale')
      return
    }
    const down = (event: PointerEvent) => {
      if (event.button === 0 && !reduced.matches) {
        node.style.setProperty('scale', '0.985')
      }
    }
    const up = () => {
      node.style.removeProperty('scale')
      node.style.removeProperty('translate')
    }
    node.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    node.addEventListener(' pointerleave', up)
    return () => {
      up()
      node.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      node.removeEventListener('pointerleave', up)
    }
  }, [enabled, iconOnly, node])
  return attach
}
