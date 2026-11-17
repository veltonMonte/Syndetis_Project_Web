import type { CSSProperties } from 'react'
import type { ElementPosition, ElementStyle, StoreComponent } from './maker'

/**
 * Free placement and per-element look of the Maker.
 *
 * A position is an offset from where the template's flow puts the element, so a layout
 * without one renders exactly as before. x is a percentage of the storefront width (it
 * keeps its meaning on any screen), y is in CSS pixels. Desktop and mobile are stored
 * apart; mobile falls back to desktop until the merchant moves the element on the phone.
 */
export type FrameDevice = 'desktop' | 'mobile'

/** The storefront switches to its phone composition below this width (see store-templates.css). */
export const MOBILE_FRAME_MAX_WIDTH = 760

export const POSITION_LIMITS = { x: [-100, 100], y: [-3000, 6000] } as const
export const STYLE_LIMITS = {
  width: [10, 100], minHeight: [0, 1200], borderWidth: [0, 12], borderRadius: [0, 64], zIndex: [0, 50],
} as const

const HEX = /^#[0-9a-f]{6}$/i
const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value))
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function cleanPosition(value: unknown): ElementPosition | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { x, y } = value as Record<string, unknown>
  if (!finite(x) || !finite(y)) return undefined
  const next = { x: Math.round(clamp(x, POSITION_LIMITS.x) * 10) / 10, y: Math.round(clamp(y, POSITION_LIMITS.y)) }
  return next.x === 0 && next.y === 0 ? undefined : next
}

export function cleanPositions(value: unknown): StoreComponent['position'] {
  if (!value || typeof value !== 'object') return undefined
  const { desktop, mobile } = value as Record<string, unknown>
  const result = { desktop: cleanPosition(desktop), mobile: cleanPosition(mobile) }
  if (!result.desktop) delete result.desktop
  if (!result.mobile) delete result.mobile
  return result.desktop || result.mobile ? result : undefined
}

/** Keeps only valid keys, so a hand-edited JSON can never inject CSS. */
export function cleanStyle(value: unknown): ElementStyle | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const style: ElementStyle = {}
  for (const key of ['width', 'minHeight', 'borderWidth', 'borderRadius', 'zIndex'] as const)
    if (finite(raw[key])) style[key] = Math.round(clamp(raw[key] as number, STYLE_LIMITS[key]))
  for (const key of ['backgroundColor', 'textColor', 'borderColor'] as const)
    if (typeof raw[key] === 'string' && HEX.test(raw[key] as string)) style[key] = raw[key] as string
  if (raw.shadow === 'soft' || raw.shadow === 'strong') style.shadow = raw.shadow
  if (raw.align === 'start' || raw.align === 'center' || raw.align === 'end') style.align = raw.align
  if (style.width === 100) delete style.width
  return Object.keys(style).length ? style : undefined
}

export function positionFor(section: StoreComponent, device: FrameDevice): ElementPosition {
  const own = cleanPosition(section.position?.[device])
  const fallback = device === 'mobile' ? cleanPosition(section.position?.desktop) : undefined
  return own || fallback || { x: 0, y: 0 }
}

/** A new `position` with one device changed; an offset of zero removes that device. */
export function withPosition(section: StoreComponent, device: FrameDevice, next: ElementPosition | undefined): StoreComponent['position'] {
  return cleanPositions({ ...section.position, [device]: next })
}

/**
 * The horizontal offset actually drawn. An element narrower than the page never leaves it: its offset stays
 * within the room its width and alignment leave. A full-width element on a phone that only has the computer's
 * position is not pushed sideways, since any sideways offset there would cut its content.
 */
function visibleOffset(section: StoreComponent, device: FrameDevice, style: ElementStyle | undefined): number {
  const { x } = positionFor(section, device)
  if (!x) return 0
  const width = style?.width ?? 100
  if (width >= 100) return device === 'mobile' && !cleanPosition(section.position?.mobile) ? 0 : x
  const room = 100 - width
  const [min, max] = style?.align === 'start' ? [0, room] : style?.align === 'end' ? [-room, 0] : [-room / 2, room / 2]
  return Math.min(max, Math.max(min, x))
}

/** Inline style of an element on the storefront. Empty when the element was never moved or styled. */
export function elementCss(section: StoreComponent, device: FrameDevice): CSSProperties {
  const css: CSSProperties = {}
  const style = cleanStyle(section.style)
  const { y } = positionFor(section, device)
  const x = visibleOffset(section, device, style)
  if (x) css.left = x + '%'
  if (y) css.top = y + 'px'
  if (style?.zIndex !== undefined) css.zIndex = style.zIndex
  else if (x || y) css.zIndex = 1 // a moved element stays above the flow it was lifted from
  if (!style) return css
  if (style.width) {
    css.width = style.width + '%'
    css.marginInlineStart = style.align === 'start' ? 0 : 'auto'
    css.marginInlineEnd = style.align === 'end' ? 0 : 'auto'
  }
  if (style.align) css.textAlign = style.align
  if (style.minHeight) css.minHeight = style.minHeight + 'px'
  if (style.backgroundColor) css.background = style.backgroundColor
  if (style.textColor) css.color = style.textColor
  if (style.borderWidth) css.border = style.borderWidth + 'px solid ' + (style.borderColor || 'currentColor')
  if (style.borderRadius) { css.borderRadius = style.borderRadius + 'px'; css.overflow = 'clip' }
  if (style.shadow === 'soft') css.boxShadow = 'var(--echo-shadow-lifted)'
  if (style.shadow === 'strong') css.boxShadow = 'var(--echo-shadow-modal)'
  return css
}

export const hasFreeLayout = (section: StoreComponent) => !!cleanPositions(section.position) || !!cleanStyle(section.style)

export function cleanItems(value: unknown): StoreComponent['items'] {
  if (!Array.isArray(value)) return undefined
  const items = value
    .filter(item => item && typeof item === 'object' && typeof item.quote === 'string')
    .slice(0, 6)
    .map(item => ({ quote: String(item.quote).slice(0, 600), author: typeof item.author === 'string' ? item.author.slice(0, 80) : '' }))
  return items.length ? items : undefined
}

export function cleanTargetDate(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? value : undefined
}

/** The fields the core-service stores for an element besides its content. */
export function freeLayoutPayload(section: StoreComponent) {
  const position = cleanPositions(section.position)
  const style = cleanStyle(section.style)
  const items = cleanItems(section.items)
  const targetDate = cleanTargetDate(section.targetDate)
  return { ...(position ? { position } : {}), ...(style ? { style } : {}), ...(items ? { items } : {}), ...(targetDate ? { targetDate } : {}) }
}
