import { createRoot } from 'react-dom/client'
import { HardwareButton } from '../../src/components/echo/hardware-button'
import '../../src/index.css'
import '../../src/components/echo/echo-theme.css'

// Manual rendering fixture: identical grids expose whether the backdrop is
// actually displaced. The unfiltered control is deliberately scoped here.
createRoot(document.getElementById('root')!).render(<main className="optical-fixture">
  <style>{`
    body { background: #161717; color: #f4f4f5; }
    .optical-fixture { max-width: 960px; padding: 40px; margin: auto; font-family: system-ui; }
    .comparison { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 24px; }
    .grid-sample { display: grid; place-items: center; height: 230px; background: repeating-conic-gradient(#acadaf 0 25%, #292929 0 50%) 0 0 / 28px 28px; }
    .grid-sample .echo-hw__cap { width: 220px; }
    .without-lens .echo-hw__cap { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .caption { font-size: 14px; line-height: 1.6; }
  `}</style>
  <h1>Refração do fundo</h1><p className="caption">As linhas devem curvar dentro da borda do botão à direita. Nenhuma camada adiciona luz ou cor.</p>
  <div className="comparison"><section><h2>Controle sem lente</h2><div className="grid-sample without-lens"><HardwareButton size="lg">Comparar vidro</HardwareButton></div></section><section><h2>Lente óptica</h2><div className="grid-sample"><HardwareButton size="lg">Comparar vidro</HardwareButton></div></section></div>
</main>)
