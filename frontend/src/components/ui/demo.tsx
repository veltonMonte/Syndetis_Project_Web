import { MacbookPro } from '@/components/ui/macbook-pro'
import { Iphone } from '@/components/ui/iphone'
import { GlassButton } from '@/components/ui/glasscn/glass-button'

export function ButtonDemo() {
  return <GlassButton glassVariant="liquid">Button</GlassButton>
}

export function MacbookProDemo() {
  return <MacbookPro src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" className="size-full" role="img" aria-label="MacBook com uma fotografia de floresta" />
}

export function IphoneDemo() {
  return <div className="device-demo"><Iphone aria-label="Moldura de iPhone" /></div>
}
