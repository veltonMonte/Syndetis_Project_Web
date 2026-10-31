import { STORE_VIEWPORTS } from '@/lib/store-viewport'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Select } from '@/components/echo/select'
export type CanvasDevice = 'desktop' | 'tablet' | 'phone'
export function MakerCanvas({ device, children }: { device: CanvasDevice; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(650)
  const [zoom, setZoom] = useState('fit')
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const width = STORE_VIEWPORTS[device]
  const scale = zoom === 'fit' ? Math.min(1, Math.max(200, available - 32) / width) : Number(zoom)
  return <div className="maker-canvas-stage" data-canvas-device={device}>
    <div className="visual-canvas-toolbar">
      <span>Página inicial</span>
      <Select size="sm" aria-label="Zoom do canvas" value={zoom} onValueChange={value => { if(value) setZoom(value) }} options={[{value:'fit',label:'Ajustar'}, {value:'.5',label:'50%'}, {value:'.75',label:'75%'}, {value:'1',label:'100%'}, {value:'1.25',label:'125%'}]} />
    </div>
    <div className="visual-canvas-scroll" ref={ref}>
      <div className="visual-canvas-size" style={{width:width*scale,height:900*scale}}>
        <div className="maker-canvas-surface" style={{width,height:900,transform:'scale('+scale+')',transformOrigin:'top left'}}>{children}</div>
      </div>
    </div>
    <p className="visual-canvas-caption">Selecione o lápis de uma seção para editar. As colunas se adaptam ao dispositivo.</p>
  </div>
}
