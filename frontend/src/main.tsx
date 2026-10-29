import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/echo/echo-theme.css'
import { SoundProvider } from 'echo-ui-core/sound'
import { EchoCheck } from 'echo-ui-core/check'
import { Toaster } from './components/echo/toast'
import echoConfig from '../echo.json'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider><Toaster><App /><EchoCheck colours={echoConfig.check.colours} /></Toaster></SoundProvider>
  </StrictMode>,
)
