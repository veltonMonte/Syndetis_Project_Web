import type { HTMLAttributes } from 'react'

export function Tablet({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="group" className="maker-tablet" {...props}>
      <span className="maker-tablet-camera" aria-hidden="true" />
      <div className="maker-tablet-screen">{children}</div>
      <span className="maker-tablet-home" aria-hidden="true" />
    </div>
  )
}
