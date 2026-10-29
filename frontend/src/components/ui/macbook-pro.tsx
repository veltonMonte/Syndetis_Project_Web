import { useId, type CSSProperties, type ReactNode, type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export interface MacbookProProps extends SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  src?: string
  children?: ReactNode
}

/** HTML screen stays at the browser's native resolution, outside the SVG layer. */
export function MacbookPro({ width = 650, height = 400, src, children, className, style, 'aria-label': label = 'Prévia em um MacBook', ...props }: MacbookProProps) {
  const clipId = useId().replace(/:/g, '')
  return (
    <div role="group" aria-label={label} className={cn('macbook-pro', className)} style={{ '--macbook-width': `${width}px`, ...style } as CSSProperties}>
    <svg aria-hidden="true" className="macbook-frame" width={width} height={height} viewBox="0 0 650 400" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="325" cy="378" rx="255" ry="3" fill="#000" opacity=".65" filter={`url(#${clipId}-contact)`} />
      <path fill={`url(#${clipId}-metal)`} d="M79.56,13.18h491.32c7.23,0,13.1,5.87,13.1,13.1v336.61H66.46V26.28c0-7.23,5.87-13.1,13.1-13.1Z" />
      <path fill="#222" d="M79.96,14.24h490.45c6.83,0,12.37,5.54,12.37,12.37v336.28H67.59V26.6c0-6.83,5.54-12.37,12.37-12.37Z" />
      <path fill="#000" d="M570.25,15.74H80.34c-6.12,0-11.08,4.96-11.08,11.08v336.07h512.08V26.82c0-6.12-4.96-11.08-11.08-11.08ZM575.74,345.17H74.52V27.31c0-3.31,2.68-5.99,5.99-5.99h489.24c3.31,0,5.99,2.68,5.99,5.99v317.86Z" />
      <rect fill="currentColor" x="74.52" y="21.32" width="501.22" height="323.85" rx="5" />
      {src && <image href={src} x="74.52" y="21.32" width="501.22" height="323.85" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />}
      <rect fill="#1d1d1d" x="69.09" y="350.51" width="512.11" height="12.48" />
      <path d="M70 349.5V27C70 21.5 74 17 80 17H570C576 17 580 21.5 580 27V349.5" stroke="#676868" strokeWidth=".5" />
      <path fill="#000" d="M298.14,21.02h54.07v6.5c0,1.56-1.27,2.82-2.82,2.82h-48.42c-1.56,0-2.82-1.27-2.82-2.82v-6.5Z" />
      <path fill={`url(#${clipId}-base)`} d="M19,362.77H631V366c0,5-5,8-11,8H30c-6,0-11-3-11-8Z" />
      <path d="M22 363.25H628" stroke="#acadaf" strokeWidth=".7" />
      <path d="M31 373H619" stroke="#222" strokeWidth="1.2" />
      <path fill="#080d4c" d="M325.11,25.14c-1.99.03-1.99-3.09,0-3.06,1.99-.03,1.99,3.09,0,3.06Z" />
      <rect x="50" y="374" width="34" height="2" rx="1" fill="#222" />
      <rect x="566" y="374" width="34" height="2" rx="1" fill="#222" />
      <path fill="#292929" d="M278.11,362.6h94.05c0,2.3-2.95,4.3-6.58,4.3h-80.89c-3.63,0-6.58-2-6.58-4.3Z" />
      <defs>
        <filter id={`${clipId}-contact`} x="-10%" y="-300%" width="120%" height="700%"><feGaussianBlur stdDeviation="2" /></filter>
        <clipPath id={clipId}><rect x="74.52" y="21.32" width="501.22" height="323.85" rx="5" /></clipPath>
        <linearGradient id={`${clipId}-metal`} x1="66" y1="16" x2="580" y2="360" gradientUnits="userSpaceOnUse"><stop stopColor="#acadaf" /><stop offset=".18" stopColor="#292929" /><stop offset=".48" stopColor="#8f9091" /><stop offset=".75" stopColor="#222" /><stop offset="1" stopColor="#676868" /></linearGradient>
        <linearGradient id={`${clipId}-base`} x1="325" y1="362" x2="325" y2="374" gradientUnits="userSpaceOnUse"><stop stopColor="#acadaf" /><stop offset=".14" stopColor="#8f9091" /><stop offset=".45" stopColor="#676868" /><stop offset=".72" stopColor="#292929" /><stop offset="1" stopColor="#222" /></linearGradient>
      </defs>
    </svg>
    {children && <div className="macbook-screen">{children}</div>}
    <span className="macbook-notch" aria-hidden="true"><i /></span>
    </div>
  )
}
