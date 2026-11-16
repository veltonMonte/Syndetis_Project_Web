import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { BatteryFull, Wifi, Signal } from 'lucide-react'

export function Iphone({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={cn('iphone relative flex justify-center', className)} {...props}>
    <div className="iphone-screen"><div className="iphone-status" aria-hidden="true"><span>9:41</span><span><Signal /><Wifi /><BatteryFull /></span></div>{children}</div>
    <span className="iphone-notch" aria-hidden="true"><i /></span>
    <span className="iphone-volume iphone-volume-one" aria-hidden="true" />
    <span className="iphone-volume iphone-volume-two" aria-hidden="true" />
    <span className="iphone-power" aria-hidden="true" />
    <span className="iphone-action" aria-hidden="true" />
    <span className="iphone-antenna iphone-antenna-top" aria-hidden="true" />
    <span className="iphone-antenna iphone-antenna-bottom" aria-hidden="true" />
    <span className="iphone-home" aria-hidden="true" />
  </div>
}

export const Component = Iphone
