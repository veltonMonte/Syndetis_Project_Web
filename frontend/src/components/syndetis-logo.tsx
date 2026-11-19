import { useEffect, useRef } from 'react'
import './syndetis-logo.css'

/**
 * Syndetis mark, direction "Bloco livre": three modules joined by bridges, and a fourth one
 * moved out of its slot, the way a block moves freely in the Sessão Maker.
 * Geometry lives on a 48-unit grid; the viewBox crops it to the drawing (4..44).
 * Usage rules: docs/product/marca.md.
 */
export const SYMBOL_BASE_PATH =
  'M8 8h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4v4a4 4 0 0 1 4 4h4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4h-4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4v-4a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Z'

type SymbolProps = {
  /** Side of the square symbol. Defaults to 1em so it follows the surrounding text. */
  size?: number | string
  className?: string
  /** Accessible name. Leave empty when a parent already names the brand (a link, a heading). */
  title?: string
}

/** The free block (x 28, y 4, 16 × 16 on the grid), drawn on its own 16-unit square inside an HTML box. */
function Block({ className }: { className: string }) {
  return (
    <span className={className}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <rect width="16" height="16" rx="4" />
      </svg>
    </span>
  )
}

/*
 * The block is a separate HTML box over the base, not a <rect> inside it. A transform on an SVG element (the
 * <rect>, or even an <svg>) runs on the main thread, with style, layout and paint every frame; a transform on an
 * HTML box runs on the compositor.
 */
export function SyndetisSymbol({ size = '1em', className, title }: SymbolProps) {
  return (
    <span
      className={className ? `syndetis-symbol ${className}` : 'syndetis-symbol'}
      style={{ width: size, height: size }}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <svg className="syndetis-symbol__base" viewBox="4 4 40 40" aria-hidden="true" focusable="false">
        <path d={SYMBOL_BASE_PATH} />
      </svg>
      <Block className="syndetis-symbol__block" />
    </span>
  )
}

/*
 * The free block's trip into its slot, as one physical move: it is picked up (lifts away and tilts, a little
 * bigger, as if closer to the eye), travels on an arc and lands with a short squash. Only transform, in % of the
 * block's own side (the slot is 4 grid units = 25 % left and down), so it runs on the compositor.
 * Leaving plays the same path backwards, a bit quicker: it takes off from the slot and drops back where it was.
 */
const SNAP_IN: Keyframe[] = [
  { offset: 0, transform: 'translate(0%, 0%) rotate(0deg) scale(1)', easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
  { offset: 0.3, transform: 'translate(12%, -38%) rotate(9deg) scale(1.14)', easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
  { offset: 0.78, transform: 'translate(-25%, 25%) rotate(-2deg) scale(1.06, 0.9)', easing: 'cubic-bezier(0.2, 0, 0.2, 1)' },
  { offset: 0.9, transform: 'translate(-25%, 25%) rotate(0.5deg) scale(0.98, 1.03)', easing: 'ease-out' },
  { offset: 1, transform: 'translate(-25%, 25%) rotate(0deg) scale(1)' },
]
const SNAP_DURATION = 780
const LEAVE_RATE = 1.3

/**
 * Plays SNAP_IN while the link around the logo is pointed at or keyboard-focused, and reverses it when it is
 * left, from wherever it is: hovering out halfway turns the block around mid-air instead of jumping.
 * It plays even when the system asks for reduced motion: a product decision recorded in DESIGN.md
 * ("Movimento da marca"), since without the trip the block only seemed to teleport.
 */
function useFreeBlockMotion() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const block = ref.current?.querySelector<HTMLElement>('.syndetis-symbol__block')
    const link = ref.current?.closest('a')
    if (!block || !link) return
    let animation: Animation | null = null
    let hovered = false
    let focused = false
    let engaged = false
    const update = () => {
      const next = hovered || focused
      if (next === engaged) return
      engaged = next
      if (!animation) {
        // Only ever created on the way in: engaged starts false.
        animation = block.animate(SNAP_IN, { duration: SNAP_DURATION, fill: 'both' })
        return
      }
      animation.playbackRate = next ? 1 : -LEAVE_RATE
      animation.play()
    }
    const enter = () => { hovered = true; update() }
    const leave = () => { hovered = false; update() }
    const focus = () => { focused = link.matches(':focus-visible'); update() }
    const blur = () => { focused = false; update() }
    link.addEventListener('pointerenter', enter)
    link.addEventListener('pointerleave', leave)
    link.addEventListener('focus', focus)
    link.addEventListener('blur', blur)
    return () => {
      link.removeEventListener('pointerenter', enter)
      link.removeEventListener('pointerleave', leave)
      link.removeEventListener('focus', focus)
      link.removeEventListener('blur', blur)
      animation?.cancel()
    }
  }, [])
  return ref
}

/**
 * Symbol + wordmark. Decorative by itself: give the link or heading around it aria-label="Syndetis".
 * Its size follows font-size (the wordmark is 1em, the symbol 1.11em). Inside a link, the free block
 * snaps into its slot while the link is pointed at or focused.
 */
export function SyndetisLogo({ className }: { className?: string }) {
  const ref = useFreeBlockMotion()
  return (
    <span ref={ref} className={className ? `syndetis-logo ${className}` : 'syndetis-logo'} aria-hidden="true">
      <SyndetisSymbol size="1.11em" />
      <span className="syndetis-logo__word">syndetis</span>
    </span>
  )
}
