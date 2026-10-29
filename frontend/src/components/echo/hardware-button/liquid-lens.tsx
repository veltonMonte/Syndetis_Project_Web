import { useEffect, useId, useRef, useState } from 'react'
import { createLensPixels } from './lens-map'

const maps = new Map<string, string>()
function lensTexture(width: number, height: number) {
  const key = `${width}:${height}`
  const cached = maps.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return ''
  const image = context.createImageData(width, height)
  image.data.set(createLensPixels(width, height))
  context.putImageData(image, 0, 0)
  const url = canvas.toDataURL()
  if (maps.size >= 64) maps.delete(maps.keys().next().value!)
  maps.set(key, url)
  return url
}

/** Optical backdrop displacement, following the liquid-refract technique in
 * glasscn-components (https://github.com/kostyniuk/glasscn-components).
 * Geometry and motion here are specific to Syndetis pill controls.
 */
export function LiquidLens() {
  const id = `lens-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const ref = useRef<HTMLSpanElement>(null)
  const [geometry, setGeometry] = useState({ width: 0, height: 0, texture: '' })
  useEffect(() => {
    const element = ref.current?.parentElement
    // SVG backdrop filters currently render in Chromium; other engines get
    // transparent, lightly blurred glass rather than a fake animated light.
    if (!element || !/(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent)) return
    let pending = 0
    const measure = () => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(() => {
        const width = Math.min(640, Math.max(0, Math.round(element.offsetWidth)))
        const height = Math.min(120, Math.max(0, Math.round(element.offsetHeight)))
        if (!width || !height) return
        setGeometry(previous => previous.width === width && previous.height === height ? previous : { width, height, texture: lensTexture(width, height) })
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(pending) }
  }, [])
  const optical = geometry.texture !== ''
  const filter = optical
    ? `url("#${id}") blur(1px)`
    : 'blur(4px)'
  useEffect(() => {
    const button = ref.current?.parentElement
    if (!button) return
    const previous = button.style.backdropFilter
    const previousWebkit = button.style.getPropertyValue('-webkit-backdrop-filter')
    // Sample BEFORE the control's own border/background are painted. A filter
    // on a child samples the parent border and bends it back into the lens,
    // producing the doubled outlines and pointed tails seen in the screenshot.
    button.style.setProperty('backdrop-filter', filter)
    button.style.setProperty('-webkit-backdrop-filter', filter)
    return () => {
      button.style.setProperty('backdrop-filter', previous)
      button.style.setProperty('-webkit-backdrop-filter', previousWebkit)
    }
  }, [filter])
  return <>
    <span ref={ref} className="echo-hw__lens" aria-hidden="true" data-refraction={optical ? 'optical' : 'blur'} />
    {optical && <svg className="echo-hw__optics" width="0" height="0" aria-hidden="true" focusable="false"><defs>
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={geometry.texture} width="100%" height="100%" preserveAspectRatio="none" result="shape" />
        <feDisplacementMap data-liquid-rim="" in="SourceGraphic" in2="shape" scale={Math.min(14, geometry.height * .28)} xChannelSelector="R" yChannelSelector="G" result="curved" />
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.055" numOctaves="1" seed="7" result="ripple" />
        <feOffset data-liquid-flow="" in="ripple" dx="0" dy="0" result="flow" />
        <feDisplacementMap data-liquid-wave="" in="curved" in2="flow" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs></svg>}
  </>
}
