import { useCallback, useEffect, useState } from 'react'

/** One spring owns the fluid, magnetic response and press compression.
 * Read pointer coordinates from the stationary well so the cap cannot chase
 * its own bounds or flicker when the pointer rests near an edge.
 */
export function useLiquidMotion(enabled: boolean, iconOnly = false) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const attach = useCallback((element: HTMLElement | null) => setNode(element), [])
  useEffect(() => {
    if (!node || !enabled) return
    const well = node.parentElement || node
    let frame = 0, previous = 0, focused = false, over = false
    let x = 0, y = 0, vx = 0, vy = 0, targetX = 0, targetY = 0
    let hover = 0, vh = 0, targetHover = 0, press = 0, vp = 0, targetPress = 0, energy = 0
    const paint = (wave = 0) => {
      const base = Math.min(14, node.offsetHeight * .28)
      node.querySelector('[data-liquid-rim]')?.setAttribute('scale', (base + hover * 2 + x * 1.2 + wave).toFixed(2))
      node.querySelector('[data-liquid-wave]')?.setAttribute('scale', (energy * 1.5 + Math.hypot(vx, vy) * 1.8).toFixed(2))
      const flow = node.querySelector('[data-liquid-flow]')
      flow?.setAttribute('dx', (x * 12 + wave * 3).toFixed(2))
      flow?.setAttribute('dy', (y * 7).toFixed(2))
      const h = Math.max(0, Math.min(1.08, hover))
      const compression = 1 + h * .014 - Math.max(0, press) * .045
      const stretch = Math.min(.012, Math.hypot(vx, vy) * .035)
      // Echo/GSAP normalizes individual transforms to inline "none" on setup.
      // Own these properties explicitly; keep its sound/activation transform separate.
      const tx = (x * (iconOnly ? 1.5 : 2.8) * h).toFixed(2)
      const ty = (-1.6 * h + y * .8 * h + press * 1.8).toFixed(2)
      node.style.setProperty('translate', tx + 'px ' + ty + 'px')
      node.style.setProperty('scale', (compression + stretch).toFixed(4) + ' ' + (compression - stretch * .6).toFixed(4))
    }
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 16.667, 2) : 1
      previous = now
      vx = (vx + (targetX - x) * .1 * dt) * Math.pow(.76, dt)
      vy = (vy + (targetY - y) * .1 * dt) * Math.pow(.76, dt)
      vh = (vh + (targetHover - hover) * .14 * dt) * Math.pow(.73, dt)
      vp = (vp + (targetPress - press) * .24 * dt) * Math.pow(.68, dt)
      x += vx * dt; y += vy * dt; hover += vh * dt; press += vp * dt
      energy *= Math.pow(.945, dt)
      paint(Math.sin(now * .01) * energy * .45)
      const moving = energy > .008 || Math.abs(vx) + Math.abs(vy) + Math.abs(vh) + Math.abs(vp) + Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(targetHover - hover) + Math.abs(targetPress - press) > .005
      if (moving) frame = requestAnimationFrame(tick)
      else { frame = 0; previous = 0; x = targetX; y = targetY; hover = targetHover; press = targetPress; energy = 0; paint() }
    }
    const start = () => { if (!frame) { previous = 0; frame = requestAnimationFrame(tick) } }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const bounds = well.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      over = true
      const nextX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
      const nextY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
      energy = Math.min(1, energy + Math.hypot(nextX - targetX, nextY - targetY) * .5 + .08)
      targetX = nextX; targetY = nextY; targetHover = 1; start()
    }
    const leave = () => { over = false; targetX = targetY = targetPress = 0; targetHover = focused ? .65 : 0; start() }
    const down = (event: PointerEvent) => { if (event.button === 0) { targetPress = 1; energy = .7; start() } }
    const up = () => { targetPress = 0; start() }
    const focus = () => { focused = true; targetHover = .65; energy = .3; start() }
    const blur = () => { focused = false; targetHover = over ? 1 : 0; up() }
    const keydown = (event: KeyboardEvent) => { if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) { targetPress = 1; energy = .5; start() } }
    const keyup = (event: KeyboardEvent) => { if (event.key === ' ' || event.key === 'Enter') up() }
    const stop = () => {
      cancelAnimationFrame(frame); frame = previous = 0
      x = y = vx = vy = targetX = targetY = hover = vh = targetHover = press = vp = targetPress = energy = 0
      paint()
    }
    node.setAttribute('data-liquid-motion', '')
    well.addEventListener('pointerenter', move); well.addEventListener('pointermove', move)
    well.addEventListener('pointerleave', leave); well.addEventListener('pointercancel', leave)
    node.addEventListener('pointerdown', down); window.addEventListener('pointerup', up)
    node.addEventListener('focus', focus); node.addEventListener('blur', blur)
    node.addEventListener('keydown', keydown); node.addEventListener('keyup', keyup)
    paint()
    return () => {
      stop()
      well.removeEventListener('pointerenter', move); well.removeEventListener('pointermove', move)
      well.removeEventListener('pointerleave', leave); well.removeEventListener('pointercancel', leave)
      node.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up)
      node.removeEventListener('focus', focus); node.removeEventListener('blur', blur)
      node.removeEventListener('keydown', keydown); node.removeEventListener('keyup', keyup)
      node.removeAttribute('data-liquid-motion')
    }
  }, [enabled, iconOnly, node])
  return attach
}
