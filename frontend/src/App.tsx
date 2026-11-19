import { HashRouter, Routes, Route } from 'react-router-dom'
import { MerchantDocumentPage } from './components/merchant-document-page'
import { StorePage } from '@/pages/StorePage'
import { OrderPage, OrdersPage } from '@/pages/OrdersPage'
import { StoreOrdersPage } from '@/pages/StoreOrdersPage'
import { TemplateCard } from '@/components/template-card'
import { createMakerDraft } from '@/lib/maker-project'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  Globe2,
  LayoutTemplate,
  LogOut,
  Package,
  Settings2,
  MousePointer2,
  Palette,
  ShoppingBag,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { SyndetisLogo } from '@/components/syndetis-logo'
import { TabBar } from '@/components/tab-bar'
import { primaryNav } from '@/lib/primary-nav'
import { Grid } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { MacbookPro } from '@/components/ui/macbook-pro'
import { Iphone } from '@/components/ui/iphone'
import { DeviceStorefront } from '@/components/device-storefront'
import { AuthPage } from '@/components/auth-page'
import { AppearanceSettings } from '@/components/appearance-settings'
import { MakerEntry } from '@/components/maker-entry'
import { StoreDashboard } from '@/components/store-dashboard'
import { PlansPage } from '@/components/plans-page'
import { LegalIndex, LegalPage } from '@/components/legal-page'
import { LegalAcceptancePage } from '@/components/legal-acceptance'
import { LEGAL_DOCUMENTS } from '@/lib/legal-documents'
import { acceptLegalTerms, clearLegalIntent, fetchLegalStatus, hasLegalIntent } from '@/lib/legal-api'
import { isLegalSlug, SYNDETIS_COMPANY } from '@/lib/legal-versions'
import { templateCollections, type LayoutConfig } from '@/lib/maker'
import { logoutSession, readSession, type AuthSession } from '@/lib/api'
import './App.css'
import './components/ui/device-hardware.css'

function Brand({ session }: { session?: AuthSession | null }) {
  return (
    <a href={session ? '#/criar' : '#/'} className="brand" aria-label="Syndetis">
      <SyndetisLogo />
    </a>
  )
}

function Header({
  route,
  session,
  onLogout,
}: {
  route: string
  session: AuthSession | null
  onLogout: () => void
}) {
  const items = primaryNav(route, Boolean(session))
  return (
    <header className="header">
      <div className="shell header-inner">
        <Brand session={session} />
        <div className="header-end">
          <nav className="navigation" aria-label="Navegação principal">
            {items
              .filter((item) => !item.tabOnly)
              .map((item) => (
                <a key={item.href} href={item.href} aria-current={item.current ? 'page' : undefined}>
                  {item.label}
                </a>
              ))}
          </nav>
          <span className="nav-divider" />
          {session ? (
            <div className="nav-auth-cluster">
              <a href="#/dashboard" className="user-session-pill" title={session.user.email}>
                <User size={13} />
                <span>{session.user.firstName}</span>
              </a>
              {/* The tab bar already leads to the Maker on small screens. */}
              <span className="header-wide-only">
                <HardwareButton href="#/criar" size="sm" variant="primary">
                  Abrir o Maker
                </HardwareButton>
              </span>
              <HardwareButton
                href="#/configuracoes"
                size="sm"
                variant="ghost"
                iconOnly
                aria-label="Configurações da conta"
                icon={<Settings2 size={16} />}
              />
              <HardwareButton
                size="sm"
                variant="ghost"
                iconOnly
                aria-label="Encerrar sessão"
                icon={<LogOut size={15} />}
                onClick={onLogout}
              />
            </div>
          ) : (
            <div className="nav-auth-cluster">
              {/* On small screens "Entrar" is a tab of the tab bar. */}
              <span className="header-wide-only">
                <HardwareButton href="#/entrar" size="sm" variant="ghost">
                  Entrar
                </HardwareButton>
              </span>
              <HardwareButton href="#/cadastro" size="sm" variant="primary">
                Criar conta
              </HardwareButton>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Devices() {
  return (
    <div
      role="group"
      className="devices"
      aria-label="Identidade visual da Syndetis em computador e celular"
    >
      <div className="device-stage" aria-hidden="true" inert>
        <MacbookPro className="hero-macbook">
          <DeviceStorefront />
        </MacbookPro>
        <Iphone className="hero-iphone">
          <DeviceStorefront mobile />
        </Iphone>
      </div>
    </div>
  )
}

function TemplateGallery({
  onChoose,
  standalone = false,
}: {
  onChoose: (config: LayoutConfig) => void
  standalone?: boolean
  isAuthenticated?: boolean
}) {
  return (
    <section
      className={`shell section template-section ${standalone ? 'standalone' : ''}`}
      id="modelos"
    >
      <div>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Um ponto de partida, infinitas possibilidades</span>
            {standalone ? (
              <h1>Modelos de loja virtual</h1>
            ) : (
              <h2>
                Comece com uma boa base.
                <br />
                <em>Termine com a sua cara.</em>
              </h2>
            )}
          </div>
          <p>
            Composições para diferentes identidades de loja.
            <br />
            Escolha o estilo e aplique a identidade da sua marca no Maker.
          </p>
        </div>
      </div>
      {templateCollections.map(collection => <div key={collection.id} className="template-collection">
        <div className="template-collection-heading">{standalone ? <h2>{collection.title}</h2> : <h3>{collection.title}</h3>}<p>{collection.description}</p></div>
        <Grid minItemWidth="max(17rem, calc((100% - var(--echo-space-10) * 2) / 3))" gap={10}>{collection.templates.map(template => <div key={template.id} className="template-card-wrapper"><TemplateCard template={template} headingLevel={standalone ? 3 : 4} onChoose={() => onChoose(createMakerDraft('Minha loja', template.id))} /></div>)}</Grid>
      </div>)}
      <p className="section-footnote">
        Modelos demonstrativos. Faça login para personalizar e publicar sua loja no Maker.
      </p>
    </section>
  )
}


function Home({
  onChoose,
  isAuthenticated,
}: {
  onChoose: (config: LayoutConfig) => void
  isAuthenticated: boolean
}) {
  const startHref = isAuthenticated ? '#/criar' : '#/cadastro'
  const loginHref = isAuthenticated ? '#/criar' : '#/entrar'

  return (
    <>
      <section className="shell hero">
        <div className="hero-copy">
          <h1>Crie sua loja virtual</h1>
          <p>Escolha um modelo, personalize a vitrine no Maker e cadastre os produtos que quer vender.</p>
          <div className="hero-actions">
            <HardwareButton href={startHref} size="lg" variant="primary" impact>
              {isAuthenticated ? 'Continuar no Maker' : 'Começar minha loja'}
            </HardwareButton>
            {!isAuthenticated && (
              <HardwareButton href={loginHref} size="lg">
                Entrar na minha conta
              </HardwareButton>
            )}
            {isAuthenticated && <a className="text-link" href="#/modelos">
              Explorar modelos <ArrowUpRight size={15} />
            </a>}
          </div>
        </div>
        <Devices />
      </section>

      <div className="shell categories-strip">
        <span><strong>Ferramentas da loja</strong></span>
        <div>
          <ShoppingBag /> Construtor Visual de Lojas
        </div>
        <div>
          <Package /> Acompanhamento de pedidos
        </div>
        <div>
          <LayoutTemplate /> Gestão de produtos e estoque
        </div>
        <div className="categories-browse">
          <HardwareButton
            href="#/modelos"
            size="sm"
            iconOnly
            aria-label="Explorar modelos"
            icon={<ArrowDown size={18} />}
          />
        </div>
      </div>

      <section className="shell section maker-intro">
        <div className="intro-copy">
          <h2>Da edição à publicação</h2>
          <p>Veja como a loja vai aparecer no celular e no computador antes de publicar.</p>
          <a href="#/sobre" className="text-link">
            Como funciona o Maker <ArrowUpRight size={16} />
          </a>
        </div>
        <ol className="feature-index">
          <li><Palette aria-hidden="true" /><span>Escolha as cores, fontes e imagens da loja.</span></li>
          <li><MousePointer2 aria-hidden="true" /><span>Organize as seções da vitrine e confira a prévia.</span></li>
          <li><Globe2 aria-hidden="true" /><span>Publique a loja e compartilhe o endereço com seus clientes.</span></li>
        </ol>
      </section>

      <TemplateGallery onChoose={onChoose} isAuthenticated={isAuthenticated} />

      <div className="shell final-cta">
        <h2>Abra o Maker para montar sua vitrine</h2>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <HardwareButton href={startHref} variant="primary" size="lg">
            {isAuthenticated ? 'Acessar Sessão Maker' : 'Criar minha conta grátis'}
          </HardwareButton>
          {!isAuthenticated && (
            <HardwareButton href="#/entrar" size="lg">
              Fazer login
            </HardwareButton>
          )}
        </div>
        <p>Entre com sua conta para acessar o Maker.</p>
      </div>
    </>
  )
}

function About({ isAuthenticated }: { isAuthenticated: boolean }) {
  const startHref = isAuthenticated ? '#/criar' : '#/cadastro'
  const steps = [
    {
      title: 'Crie sua conta.',
      text: 'Cadastre-se com e-mail e senha para acessar os recursos disponíveis para o seu perfil.',
      icon: Sparkles,
    },
    {
      title: 'Monte sua vitrine no Maker.',
      text: 'Escolha um modelo e ajuste textos, fotos e cores. As opções de estrutura dependem do plano.',
      icon: Wand2,
    },
    {
      title: 'Organize seu catálogo.',
      text: 'No painel da loja, cadastre produtos, organize as categorias e atualize o estoque.',
      icon: ShoppingBag,
    },
    {
      title: 'Publique a vitrine e acompanhe os pedidos.',
      text: 'Confira a prévia, publique a vitrine e acompanhe o status de cada pedido no painel.',
      icon: Package,
    },
  ]
  return (
    <>
      <section className="shell about-hero">
        <div>
          <span className="eyebrow">Sobre a Syndetis</span>
          <h1>
            Boas marcas conectam.
            <br />
            <em>Nós damos estrutura a elas.</em>
          </h1>
          <p>
            Monte a vitrine da sua loja, organize o catálogo e acompanhe os pedidos no painel.
          </p>
          <a href="#/sobre/tutorial" className="text-link">
            Veja como funciona em 4 passos <ArrowDown size={16} />
          </a>
        </div>
      </section>
      <section className="shell about-manifesto">
        <div>
          <span className="eyebrow">Um ecossistema, a sua identidade</span>
          <h2>
            A tecnologia cuida da operação.
            <br />
            <em>Você cuida do que torna sua loja única.</em>
          </h2>
        </div>
        <div>
          <p>
            O Maker reúne edição visual e prévia da loja em computador e celular.
            No painel do lojista, você gerencia produtos, estoque e pedidos.
          </p>
        </div>
      </section>
      <section className="shell section tutorial" id="tutorial">
        <div>
          <span className="eyebrow">Da criação à publicação</span>
          <h2>
            Como montar sua loja
          </h2>
        </div>
        <div className="tutorial-steps">
          {steps.map((step, i) => (
            <div className="tutorial-step" key={step.title}>
              <span className="step-number">0{i + 1}</span>
              <div>
                <step.icon size={23} />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {i === 0 && (
                  <a href={startHref} className="text-link">
                    {isAuthenticated ? 'Abrir o Maker' : 'Criar conta agora'}{' '}
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="shell final-cta">
        <span className="eyebrow">Agora é com você</span>
        <h2>
          Vamos tirar essa ideia
          <br />
          <em>do papel?</em>
        </h2>
        <HardwareButton href={startHref} size="lg" variant="primary">
          {isAuthenticated ? 'Abrir a Sessão Maker' : 'Entrar ou criar minha conta'}
        </HardwareButton>
      </div>
    </>
  )
}

function Footer({ session }: { session: AuthSession | null }) {
  return (
    <footer className="shell footer">
      <div>
        <Brand session={session} />
        <p>Conectando ideias. Criando possibilidades.</p>
      </div>
      <nav aria-label="Links do rodapé">
        {session ? (
          <>
            <a href="#/criar">Sessão Maker</a>
            <a href="#/modelos">Modelos</a>
            <a href="#/dashboard">Painel da loja</a>
            <a href="#/planos">Planos</a>
          </>
        ) : (
          <>
            <a href="#/">Início</a>
            <a href="#/modelos">Modelos</a>
            <a href="#/sobre">Sobre o projeto</a>
            <a href="#/planos">Planos</a>
            <a href="#/entrar">Entrar</a>
            <a href="#/cadastro">Criar conta</a>
          </>
        )}
      </nav>
      <span>
        Ecossistema Syndetis · 2026
        <br />
        Plataforma de E-commerce Autoral
      </span>
      <div className="footer-legal">
        <nav aria-label="Documentos legais">
          <a href="#/legal/termos-de-uso">Termos de Uso</a>
          <a href="#/legal/privacidade">Privacidade</a>
          <a href="#/legal/cookies">Cookies</a>
          <a href="#/legal/assinatura">Assinatura e reembolso</a>
          <a href="#/legal/selo-verificado">Selo Verificado</a>
          <a href="#/legal">Todos os documentos</a>
        </nav>
        <p>
          {SYNDETIS_COMPANY.legalName} · CNPJ {SYNDETIS_COMPANY.cnpj} · {SYNDETIS_COMPANY.address} · {SYNDETIS_COMPANY.email}
        </p>
      </div>
    </footer>
  )
}

/** The Syndetis site only knows merchants: a storefront buyer's access is not a platform session. */
function readMerchantSession(): AuthSession | null {
  const current = readSession()
  return current && current.user.role !== 'CUSTOMER' ? current : null
}

export default function App() {
  const previousRoute = useRef<string | null>(null)
  const [route, setRoute] = useState(() => location.hash.slice(1).split('?')[0] || '/')
  const [templateIntent, setTemplateIntent] = useState<LayoutConfig['template'] | null>(null)
  const [session, setSession] = useState<AuthSession | null>(() => readMerchantSession())
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState('')
  // Whether the merchant still has to accept the Terms of Use in force (docs/legal/README.md).
  const [legalGate, setLegalGate] = useState<'ok' | 'first' | 'update'>('ok')
  const toast = useToast()
  const sellerId = session?.user.role === 'SELLER' ? session.user.id : null

  useEffect(() => {
    if (!sellerId) return
    let alive = true
    fetchLegalStatus()
      .then(async (status): Promise<'ok' | 'first' | 'update'> => {
        if (!status.pending) { clearLegalIntent(); return 'ok' }
        // Ticked on the signup page before leaving for Google or GitHub.
        if (hasLegalIntent()) { await acceptLegalTerms(); clearLegalIntent(); return 'ok' }
        return status.acceptedAt ? 'update' : 'first'
      })
      // The check never locks a merchant out: signup already requires the acceptance.
      .catch((): 'ok' => 'ok')
      .then(next => { if (alive) setLegalGate(next) })
    return () => { alive = false; setLegalGate('ok') }
  }, [sellerId])

  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1).split('?')[0] || '/')
      window.scrollTo({ top: 0 })
    }
    const authSync = (event: Event) => {
      setSession(readMerchantSession())
      if ((event as CustomEvent<{ reason?: string }>).detail?.reason === 'expired') {
        setAuthNotice('Sua sessão expirou. Entre novamente para continuar.')
      }
    }
    window.addEventListener('hashchange', change)
    window.addEventListener('syndetis-auth-change', authSync)
    return () => {
      window.removeEventListener('hashchange', change)
      window.removeEventListener('syndetis-auth-change', authSync)
    }
  }, [])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Sua ideia, em movimento',
      '/criar': session ? 'Sessão Maker · Construtor Visual' : 'Entrar para acessar o Maker',
      '/dashboard': session ? 'Painel da loja' : 'Entrar para acessar o Dashboard',
      '/configuracoes': 'Configurações da conta',
      '/entrar': 'Entrar na sua conta',
      '/cadastro': 'Criar conta grátis',
      '/modelos': 'Modelos de Loja',
      '/sobre': 'Sobre o projeto',
      '/sobre/tutorial': 'Como funciona o Maker',
      '/planos': 'Planos e Preços',
      '/auth/callback': 'Concluindo o login',
      '/legal': 'Documentos legais',
    }
    const legalSlug = route.slice('/legal/'.length)
    if (route.startsWith('/legal/') && isLegalSlug(legalSlug)) titles[route] = LEGAL_DOCUMENTS[legalSlug].title
    // Public stores and order pages name their own tab.
    if (!route.startsWith('/lojas/') && route !== '/pedidos' && !route.startsWith('/pedidos/'))
      document.title = `Syndetis — ${titles[route] || 'Página não encontrada'}`
    if (route === '/sobre/tutorial') {
      document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' })
    } else if (previousRoute.current !== null && previousRoute.current !== route) {
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    previousRoute.current = route
  }, [route, session])

  function choose(next: LayoutConfig) {
    setTemplateIntent(next.template)
    if (session) {
      location.hash = '/criar'
    } else {
      setPendingRedirect('/criar')
      toast({
        title: 'Modelo selecionado!',
        body: 'Entre ou crie sua conta para abrir a Sessão Maker com este modelo.',
      })
      location.hash = '/entrar'
    }
  }

  function handleAuthenticated(nextSession: AuthSession, defaultTarget: string) {
    if (nextSession.user.role === 'CUSTOMER') {
      void logoutSession()
      setSession(null)
      setAuthNotice('Esta é uma conta de comprador. Para acompanhar uma compra, use "Meus pedidos" na loja em que você comprou.')
      location.hash = '/entrar'
      return
    }
    setSession(nextSession)
    setAuthNotice('')
    const next = route === '/entrar' ? new URLSearchParams(location.hash.split('?')[1]).get('next') : null
    const returnTarget = next && (/^\/lojas\/[a-z0-9-]+\?etapa=finalizar$/.test(next) || /^\/pedidos\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(next)) ? next : null
    const target =
      route === '/dashboard' || route === '/criar' || route === '/configuracoes'
        ? route
        : returnTarget || pendingRedirect || defaultTarget || '/dashboard'
    setPendingRedirect(null)
    location.hash = target
  }

  function handleLogout() {
    setAuthNotice('')
    setTemplateIntent(null)
    void logoutSession()
    setSession(null)
    toast({
      title: 'Sessão encerrada',
      body: 'Você saiu da sua conta com segurança.',
    })
    location.hash = '/'
  }

  const publicStoreRoute = route.startsWith('/lojas/') || route === '/pedidos' || route.startsWith('/pedidos/')
  if (publicStoreRoute) return <HashRouter><Routes><Route path="/lojas/:slug" element={<StorePage />} /><Route path="/lojas/:slug/pedidos" element={<StoreOrdersPage />} /><Route path="/pedidos" element={<OrdersPage />} /><Route path="/pedidos/:orderId" element={<OrderPage />} /></Routes></HashRouter>

  const legalSlug = route.startsWith('/legal/') ? route.slice('/legal/'.length) : ''
  const legalRoute = route === '/legal' || isLegalSlug(legalSlug)

  const isProtectedRoute =
    route === '/criar' || route === '/dashboard' || route === '/configuracoes'

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Pular para o conteúdo
      </a>
      <Header
        key={`${route}-${session?.user.email || 'guest'}`}
        route={route}
        session={session}
        onLogout={handleLogout}
      />
      {/* Outside the Header, which remounts on every route: the bar stays, so its marker can travel between tabs. */}
      <TabBar items={primaryNav(route, Boolean(session))} />
      <main id="main" tabIndex={-1}>
        {route === '/planos' ? (
          <PlansPage isAuthenticated={Boolean(session)} />
        ) : legalRoute ? (
          isLegalSlug(legalSlug) ? <LegalPage key={legalSlug} slug={legalSlug} /> : <LegalIndex />
        ) : session && legalGate !== 'ok' ? (
          <LegalAcceptancePage firstTime={legalGate === 'first'} onAccepted={() => setLegalGate('ok')} />
        ) : session ? (
          // Merchants from Google/GitHub confirm a CPF or CNPJ before the Maker and the dashboard.
          session.user.role === 'SELLER' && session.user.documentVerified === false && route !== '/configuracoes' ? (
            <MerchantDocumentPage session={session} onConfirmed={setSession} />
          ) : route === '/configuracoes' ? (
            <section className="shell dashboard-page appearance-page">
              <header className="appearance-page-heading">
                <h1>Configurações</h1>
                <p>Deixe o painel confortável para o seu dia a dia.</p>
              </header>
              <AppearanceSettings />
            </section>
          ) : route === '/modelos' ? (
            <TemplateGallery standalone onChoose={choose} isAuthenticated />
          ) : route === '/dashboard' ? (
            <StoreDashboard key={session.user.id} session={session} />
          ) : (
            <MakerEntry key={session.user.id} session={session} templateIntent={templateIntent} />
          )
        ) : route === '/' ? (
          <Home onChoose={choose} isAuthenticated={false} />
        ) : route === '/sobre' || route === '/sobre/tutorial' ? (
          <About isAuthenticated={false} />
        ) : route === '/entrar' ? (
          <AuthPage
            key="login"
            mode="login"
            notice={authNotice}
            onAuthenticated={handleAuthenticated}
          />
        ) : route === '/cadastro' ? (
          <AuthPage key="register" mode="register" onAuthenticated={handleAuthenticated} />
        ) : route === '/auth/callback' ? (
          <AuthPage mode="callback" onAuthenticated={handleAuthenticated} />
        ) : route === '/modelos' ? (
          <TemplateGallery standalone onChoose={choose} />
        ) : isProtectedRoute ? (
          <AuthPage
            key="login"
            mode="login"
            notice={authNotice}
            onAuthenticated={handleAuthenticated}
          />
        ) : (
          <section className="shell final-cta">
            <h1>Página não encontrada.</h1>
            <HardwareButton href="#/">Voltar ao início</HardwareButton>
          </section>
        )}
      </main>
      <Footer session={session} />
    </>
  )
}
