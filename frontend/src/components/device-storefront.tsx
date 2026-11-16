import { Command } from 'lucide-react'
import './device-storefront.css'

const macWallpaper = '/images/liquid-device.jpg'
const iphoneWallpaper = '/images/liquid-device-mobile.jpg'

/**
 * Custom-generated 3D cobalt/violet liquid chrome wallpapers on the MacBook and iPhone
 * screens with the centered Syndetis brand mark identical to the navbar.
 */
export function DeviceStorefront({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={`oliva-screen ${mobile ? 'oliva-phone' : 'oliva-desktop'}`}>
      <img
        className="oliva-wallpaper"
        src={mobile ? iphoneWallpaper : macWallpaper}
        alt={mobile ? 'Fluido metálico Syndetis no iPhone' : 'Fluido metálico Syndetis no MacBook'}
      />
      <div className="oliva-overlay" aria-hidden="true" />
      <div className="oliva-brand">
        <Command aria-hidden="true" />
        <span>
          syndetis<span className="brand-dot">.</span>
        </span>
      </div>
    </div>
  )
}
