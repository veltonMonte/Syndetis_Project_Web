import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/echo/echo-theme.css'
import './components/echo/echo-theme-light.css'
import { SoundProvider } from 'echo-ui-core/sound'
import { EchoCheck } from 'echo-ui-core/check'
import { Toaster } from './components/echo/toast'
import echoConfig from '../echo.json'
import App from './App.tsx'
import { AppearanceProvider } from './components/appearance-provider'
import { initializeAppearance } from './lib/appearance'
import './appearance.css'

initializeAppearance()

// External providers return to regular paths. Keep their query for the callback.
if (!location.hash && (/^\/pedidos\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/?$/i.test(location.pathname) ||
  location.pathname === '/auth/callback')) {
  const route = location.pathname.replace(/\/$/, '')
  history.replaceState(history.state, '', '/' + location.search + '#' + route)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider>
      <Toaster>
        <AppearanceProvider>
          <App />
          <EchoCheck colours={echoConfig.check.colours} />
        </AppearanceProvider>
      </Toaster>
    </SoundProvider>
  </StrictMode>,
)
