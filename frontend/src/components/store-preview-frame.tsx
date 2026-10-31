import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { StorePreview } from '@/components/store-preview'
import { STORE_VIEWPORTS } from '@/lib/store-viewport'
import './store-preview-frame.css'

/** Scale a fixed logical viewport. A small card must never select the mobile layout. */
export function StorePreviewFrame({device = 'desktop', ...props}: ComponentProps<typeof StorePreview> & {device?: keyof typeof STORE_VIEWPORTS}) {
  const ref = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(STORE_VIEWPORTS[device] as number)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setAvailable(Math.max(1,entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const width = STORE_VIEWPORTS[device]
  const scale = available / width
  return <div ref={ref} className="store-preview-frame" data-preview-device={device}>
    <div className="store-preview-frame-content" style={{width,height:'calc(100% / '+scale+')',transform:'scale('+scale+')'}}>
      <StorePreview {...props} />
    </div>
  </div>
}
