import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { NavItem } from '@/lib/primary-nav'
import './tab-bar.css'

/*
 * The marker is the brand's free block: one piece that is carried from the old tab to the new one the way the
 * logo's block is carried into its slot (lifted, stretched along the way, set down with a short squash).
 * Only transform, so it runs on the compositor; the tabs themselves never move. Like the logo, it plays even
 * under reduced motion (DESIGN.md, "Movimento da marca").
 */
const CARRY_DURATION = 560

function carry(from: number, to: number): Keyframe[] {
  const lift = from + (to - from) * 0.35
  return [
    { offset: 0, transform: `translate(${from}px, 0) scale(1, 1)`, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
    { offset: 0.35, transform: `translate(${lift}px, -3px) scale(1.14, 0.9)`, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    { offset: 0.8, transform: `translate(${to}px, 0) scale(0.95, 1.05)`, easing: 'ease-out' },
    { offset: 1, transform: `translate(${to}px, 0) scale(1, 1)` },
  ]
}

/**
 * The main navigation on phones and tablets: a glass bar fixed to the bottom of the screen, within thumb reach.
 * CSS shows it only below the desktop breakpoint; the header's links take over above it.
 * Rendered once by App (not inside the Header, which remounts per route), so the marker can travel.
 */
export function TabBar({ items }: { items: NavItem[] }) {
  const current = items.findIndex((item) => item.current)
  const list = useRef<HTMLUListElement>(null)
  const marker = useRef<HTMLSpanElement>(null)
  const previous = useRef(current)
  const flight = useRef<Animation | null>(null)

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = current
    const node = marker.current
    const row = list.current
    if (!node || !row || from === current || from < 0 || current < 0) return
    const step = node.offsetWidth + parseFloat(getComputedStyle(row).columnGap || '0')
    // Interrupted mid-flight: leave from where the block is now, not from the old tab.
    const start = flight.current ? new DOMMatrix(getComputedStyle(node).transform).m41 : from * step
    flight.current?.cancel()
    const animation = node.animate(carry(start, current * step), { duration: CARRY_DURATION })
    flight.current = animation
    animation.onfinish = () => {
      if (flight.current === animation) flight.current = null
    }
  }, [current])

  return (
    <nav
      className="tab-bar"
      aria-label="Navegação principal"
      style={{ '--tab-count': items.length, '--tab-current': Math.max(current, 0) } as CSSProperties}
    >
      <span ref={marker} className="tab-bar__marker" aria-hidden="true" data-hidden={current < 0 ? '' : undefined} />
      <ul ref={list} className="tab-bar__list">
        {items.map(({ href, label, current: isCurrent, icon: Icon }) => (
          <li key={href}>
            <a className="tab-bar__item" href={href} aria-current={isCurrent ? 'page' : undefined}>
              <Icon className="tab-bar__icon" size={22} strokeWidth={isCurrent ? 2.25 : 1.75} aria-hidden="true" />
              <span className="tab-bar__label">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
