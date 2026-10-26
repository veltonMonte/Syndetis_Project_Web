import type { ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthPage, OAuthCallback } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { StorePage } from './pages/StorePage'
import { OrderPage, OrdersPage } from './pages/OrdersPage'
import { SellerPage } from './pages/SellerPage'
import { clearSession, getRefreshToken, useSession } from './lib/session'
import { json, request } from './lib/api'
import './App.css'

function Protected({ children, seller = false }: { children: ReactNode; seller?: boolean }) {
  const session = useSession()
  const location = useLocation()
  if (!session) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname)}`} replace />
  if (seller && session.role !== 'SELLER' && session.role !== 'ADMIN') return <p className="notice">Esta área está disponível para contas de lojista.</p>
  return <div key={session.userId}>{children}</div>
}
function Shell() {
  const session = useSession()
  return <><a className="skip-link" href="#content">Pular para o conteúdo</a><header className="site-header"><Link className="wordmark" to="/">syndetis<span>.</span></Link><nav aria-label="Navegação principal">
    {session ? <><Link to="/pedidos">Meus pedidos</Link>{session.role !== 'CUSTOMER' && <Link to="/painel">Minha loja</Link>}<button className="text-button" onClick={() => {
      const token = getRefreshToken(); clearSession()
      if (token) void request('/api/auth/logout', { method: 'POST', body: json({ refreshToken: token }) }).catch(() => {})
    }}>Sair</button></> : <><Link to="/entrar">Entrar</Link><Link className="button small" to="/cadastro">Criar conta</Link></>}
    </nav></header><main id="content"><Routes>
      <Route path="/" element={<HomePage />} /><Route path="/entrar" element={<AuthPage />} /><Route path="/cadastro" element={<AuthPage register />} /><Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/lojas/:slug" element={<StorePage />} /><Route path="/pedidos" element={<Protected><OrdersPage /></Protected>} /><Route path="/pedidos/:orderId" element={<Protected><OrderPage /></Protected>} /><Route path="/painel" element={<Protected seller><SellerPage /></Protected>} />
      <Route path="*" element={<section className="panel"><h1>Página não encontrada</h1><Link to="/">Voltar ao início</Link></section>} />
    </Routes></main><footer className="site-footer"><span>Syndetis</span><span>Conectando quem cria a quem compra.</span></footer></>
}
export default function App() { return <BrowserRouter><Shell /></BrowserRouter> }
