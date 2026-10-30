import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Command,
  Globe2,
  Layers3,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquare,
  MousePointer2,
  Palette,
  ShoppingBag,
  Sparkles,
  User,
  Wallet,
  Wand2,
  X,
} from 'lucide-react'
import gsap from 'gsap'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Card } from '@/components/echo/card'
import { Grid } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { MacbookPro } from '@/components/ui/macbook-pro'
import { Iphone } from '@/components/ui/iphone'
import { DeviceStorefront } from '@/components/device-storefront'
import { AuthPage } from '@/components/auth-page'
import { MakerEntry } from '@/components/maker-entry'
import { StoreDashboard } from '@/components/store-dashboard'
import { ensureFullConfig, initialConfig, templates, type LayoutConfig } from '@/lib/maker'
import { logoutSession, readSession, type AuthSession } from '@/lib/api'
import './App.css'
import './components/ui/device-hardware.css'

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const context = gsap.context(() => {
      gsap.set(element, { opacity: 0, y: 24, scale: 0.985 })
    }, element)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const duration =
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue('--echo-duration-flood'),
            ) / 1000 || 0.7
          gsap.to(element, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: duration * 1.25,
            ease: 'expo.out',
            clearProps: 'scale,transform',
          })
          observer.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      gsap.killTweensOf(element)
      context.revert()
    }
  }, [])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

function Brand({ session }: { session?: AuthSession | null }) {
  return (
    <a href={session ? '#/criar' : '#/'} className="brand" aria-label="Syndetis">
      <Command aria-hidden="true" />
      <span>
        syndetis<span className="brand-dot">.</span>
      </span>
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
  const [open, setOpen] = useState(false)
  return (
    <header className="header">
      <div className="shell header-inner">
        <Brand session={session} />
        <nav
          className={open ? 'navigation navigation-open' : 'navigation'}
          aria-label="Navegação principal"
        >
          {!session ? (
            <>
              <a href="#/" aria-current={route === '/' ? 'page' : undefined}>
                Início
              </a>
              <a href="#/sobre" aria-current={route === '/sobre' ? 'page' : undefined}>
                Sobre
              </a>
            </>
          ) : (
            <>
              <a
                href="#/criar"
                aria-current={route === '/criar' || route === '/' ? 'page' : undefined}
              >
                Maker
              </a>
              <a href="#/modelos" aria-current={route === '/modelos' ? 'page' : undefined}>
                Modelos
              </a>
              <a href="#/dashboard" aria-current={route === '/dashboard' ? 'page' : undefined}>
                Dashboard
              </a>
            </>
          )}
          <span className="nav-divider" />
          {session ? (
            <div className="nav-auth-cluster">
              <a href="#/dashboard" className="user-session-pill" title={session.user.email}>
                <User size={13} />
                <span>{session.user.firstName}</span>
              </a>
              <HardwareButton href="#/criar" size="sm" variant="primary">
                Abrir o Maker
              </HardwareButton>
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
              <HardwareButton href="#/entrar" size="sm" variant="ghost">
                Entrar
              </HardwareButton>
              <HardwareButton href="#/cadastro" size="sm" variant="primary">
                Criar conta
              </HardwareButton>
            </div>
          )}
        </nav>
        <div className="mobile-menu">
          <HardwareButton
            iconOnly
            aria-label={open ? 'Fechar navegação' : 'Abrir navegação'}
            icon={open ? <X size={18} /> : <Menu size={18} />}
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>
    </header>
  )
}

function Devices({ config = initialConfig }: { config?: LayoutConfig }) {
  return (
    <div
      role="group"
      className="devices"
      aria-label="Prévia da plataforma Syndetis em computador e celular"
    >
      <div className="device-stage">
        <div className="device-orbit" aria-hidden="true" />
        <MacbookPro className="hero-macbook" aria-label="Prévia da plataforma Syndetis no MacBook">
          <DeviceStorefront />
        </MacbookPro>
        <Iphone className="hero-iphone" aria-label="Prévia da Sessão Maker Syndetis no iPhone">
          <DeviceStorefront mobile />
        </Iphone>
        <div className="floating-note">
          <span className="status-pip" /> Sua marca. Em qualquer tela.
        </div>
      </div>
      <div className="device-caption">
        <span>{config.name}</span>
        <span>Ecossistema Syndetis · E-commerce Autoral</span>
      </div>
    </div>
  )
}

function TemplateGallery({
  onChoose,
  standalone = false,
  isAuthenticated = false,
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
      <Reveal>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Um ponto de partida, infinitas possibilidades</span>
            {standalone ? (
              <h1>Encontre o seu começo.</h1>
            ) : (
              <h2>
                Comece com uma boa base.
                <br />
                <em>Termine com a sua cara.</em>
              </h2>
            )}
          </div>
          <p>
            Escolha uma arquitetura de loja virtual e personalize cada detalhe.
            <br />
            Entre na sua conta para editar seções, categorias, produtos e cores ao vivo.
          </p>
        </div>
      </Reveal>
      <Grid minItemWidth="17rem" gap={10}>
        {templates.map((template) => (
          <Reveal key={template.id} className="template-card-wrapper">
            <Card
              variant="screen"
              title={template.name}
              description={template.category}
              media={<TemplatePreview template={template} />}
              footer={
                <HardwareButton
                  size="md"
                  fullWidth
                  onClick={() =>
                    onChoose(
                      ensureFullConfig({
                        ...initialConfig,
                        template: template.id,
                        accent: template.accent,
                      }),
                    )
                  }
                >
                  {isAuthenticated
                    ? `Usar ${template.name} no Maker`
                    : `Começar com ${template.name}`}
                </HardwareButton>
              }
            />
          </Reveal>
        ))}
      </Grid>
      <p className="section-footnote">
        Modelos demonstrativos. Faça login para personalizar e publicar sua loja no Maker.
      </p>
    </section>
  )
}

function TemplatePreview({ template }: { template: (typeof templates)[number] }) {
  return (
    <div
      className="template-preview"
      style={{ '--preview-accent': template.accent } as CSSProperties}
    >
      <div className="template-window">
        <div className="template-browser" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>syndetis.app/{template.id}</span>
        </div>
        <div className="template-nav">
          <span>syndetis.</span>
          <small>Catálogo &nbsp; Vitrine</small>
        </div>
        <div className={`template-composition template-${template.id}`}>
          <div>
            <small>Loja Virtual · {template.name}</small>
            <h3>
              {template.id === 'editorial'
                ? 'Seu jeito.\nSua essência.'
                : template.id === 'essencial'
                  ? 'O essencial\npermanece.'
                  : 'Sua marca.\nNo mundo.'}
            </h3>
            <span className="template-mini-cta">Ver direção visual</span>
          </div>
          <img
            src={`https://images.unsplash.com/${template.image}?auto=format&fit=crop&w=700&q=90`}
            alt={`Composição do modelo ${template.name}`}
            loading="lazy"
          />
        </div>
        <div className="template-bottom">
          <span>Ecossistema Syndetis.</span>
          <span>Vitrine, Checkout, Chat e Faturamento.</span>
        </div>
      </div>
    </div>
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
          <div className="announcement">
            <HardwareButton href="#/sobre" size="sm" trailingIcon={<ArrowUpRight size={13} />}>
              Conheça a plataforma Syndetis
            </HardwareButton>
          </div>
          <h1>
            Sua loja merece
            <br />
            um lugar <em>no mundo.</em>
          </h1>
          <p>
            Da criação visual à sua próxima venda.
            <br />
            Construa e opere sua loja virtual autoral com identidade própria, chat integrado e
            gestão completa.
            <br className="desktop-break" /> Sem precisar escrever uma linha de código.
          </p>
          <div className="hero-actions">
            <HardwareButton href={startHref} size="lg" variant="primary" impact>
              {isAuthenticated ? 'Continuar no Maker' : 'Começar minha loja'}
            </HardwareButton>
            {!isAuthenticated && (
              <HardwareButton href={loginHref} size="lg">
                Entrar na minha conta
              </HardwareButton>
            )}
            <a className="text-link" href="#/sobre">
              Veja como funciona <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="hero-subline">
            <span>
              <Check size={13} /> Sua identidade em cada detalhe
            </span>
            <span>
              <Check size={13} /> Feito para qualquer tela
            </span>
          </div>
        </div>
        <Devices />
      </section>

      <div className="shell categories-strip">
        <span>
          Um ecossistema.
          <br />
          <strong>Para a sua marca.</strong>
        </span>
        <div>
          <ShoppingBag /> Construtor Visual de Lojas
        </div>
        <div>
          <MessageSquare /> Atendimento & Chat ao Vivo
        </div>
        <div>
          <Wallet /> Gestão de Vendas & Faturamento
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
        <Reveal className="intro-copy">
          <span className="eyebrow">Experiência de Criação</span>
          <h2>
            Você imagina.
            <br />
            <em>O resto ganha forma.</em>
          </h2>
          <p>
            Seu negócio tem um jeito só dele. A sua presença digital também deveria ter. Crie sua
            conta para acessar o construtor visual, organizar produtos e acompanhar cada pedido.
          </p>
          <a href={startHref} className="text-link">
            {isAuthenticated ? 'Abrir a Sessão Maker' : 'Criar conta e experimentar'}{' '}
            <ArrowUpRight size={16} />
          </a>
          <div className="feature-index">
            <div>
              <MousePointer2 />
              <span>Edição visual modular, do seu jeito</span>
            </div>
            <div>
              <Palette />
              <span>Cores e categorias que contam a sua história</span>
            </div>
            <div>
              <Globe2 />
              <span>Operação completa em qualquer tela</span>
            </div>
          </div>
        </Reveal>
        <Reveal className="maker-art">
          <div className="art-toolbar">
            <span>
              <Layers3 size={15} /> Sua identidade
            </span>
            <span>01 / Syndetis</span>
          </div>
          <div className="typography-sample">
            Com a<br />
            <em>sua essência.</em>
          </div>
          <div className="palette-art">
            <span>Paleta da marca</span>
            <div>
              {['olive', 'sand', 'ink', 'paper', 'clay'].map((c) => (
                <i className={`art-swatch ${c}`} key={c} />
              ))}
            </div>
            <small>Minimalista, líquido, autoral.</small>
          </div>
          <div className="art-cursor">
            <MousePointer2 size={15} /> Você, criando
          </div>
        </Reveal>
      </section>

      <TemplateGallery onChoose={onChoose} isAuthenticated={isAuthenticated} />

      <Reveal className="shell final-cta">
        <span className="eyebrow">O próximo passo é seu</span>
        <h2>
          Uma ideia já é<br />
          <em>um ótimo começo.</em>
        </h2>
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
        <p>Conecte-se com GitHub, Google ou e-mail para liberar o Maker e o Dashboard.</p>
      </Reveal>
    </>
  )
}

function About({ isAuthenticated }: { isAuthenticated: boolean }) {
  const startHref = isAuthenticated ? '#/criar' : '#/cadastro'
  const steps = [
    {
      title: 'Conecte sua conta com 1 clique.',
      text: 'Entre com GitHub, Google ou e-mail profissional. Após o login, seu ambiente de criação e operação é liberado imediatamente.',
      icon: Sparkles,
    },
    {
      title: 'Monte sua vitrine no Maker.',
      text: 'Adicione, exclua e reordene componentes visuais. Crie categorias, cadastre seus produtos e ajuste cores e configurações de frete e Pix.',
      icon: LayoutTemplate,
    },
    {
      title: 'Acompanhe vendas e converse no Chat.',
      text: 'No Dashboard do vendedor, gerencie o status de cada pedido e fale em tempo real com seus clientes sem sair da tela de operação.',
      icon: MessageSquare,
    },
    {
      title: 'Controle seu faturamento e saques.',
      text: 'Visualize a curva de receita, recebíveis de cartão, extrato detalhado e solicite repasses imediatos via Pix.',
      icon: Wallet,
    },
  ]
  return (
    <>
      <section className="shell about-hero">
        <Reveal>
          <span className="eyebrow">Sobre a Syndetis</span>
          <h1>
            Boas marcas conectam.
            <br />
            <em>Nós damos estrutura a elas.</em>
          </h1>
          <p>
            Da construção visual da vitrine ao relacionamento pós-venda e controle financeiro.
            <br />
            Construímos um ecossistema enxuto e poderoso para marcas independentes venderem online
            com identidade própria.
          </p>
          <a href="#/sobre/tutorial" className="text-link">
            Veja como funciona em 4 passos <ArrowDown size={16} />
          </a>
        </Reveal>
      </section>
      <section className="shell about-manifesto">
        <Reveal>
          <span className="eyebrow">Um ecossistema, a sua identidade</span>
          <h2>
            A tecnologia cuida da operação.
            <br />
            <em>Você cuida do que torna sua loja única.</em>
          </h2>
        </Reveal>
        <Reveal>
          <p>
            Ao entrar na sua conta, a Sessão Maker combina blocos modulares, catálogo integrado e
            prévia em tempo real em computadores e celulares. Você tem liberdade total para criar
            seções, trocar ordens e publicar instantaneamente.
          </p>
          <p>
            Junto ao Maker, o Dashboard exclusivo para lojistas autenticados unifica pedidos, chat
            direto entre vendedor e cliente e gestão de faturamento.
          </p>
        </Reveal>
      </section>
      <section className="shell section tutorial" id="tutorial">
        <Reveal>
          <span className="eyebrow">Da criação ao faturamento</span>
          <h2>
            Sua operação completa
            <br />
            <em>em quatro etapas.</em>
          </h2>
        </Reveal>
        <div className="tutorial-steps">
          {steps.map((step, i) => (
            <Reveal className="tutorial-step" key={step.title}>
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
              <div className="step-art" aria-hidden="true">
                {i === 0 ? (
                  <>
                    <Sparkles />
                    <span>
                      OAuth 2.0 com GitHub e Google
                      <br />+ Autenticação Segura.
                    </span>
                  </>
                ) : i === 1 ? (
                  <>
                    <Wand2 />
                    <span>
                      Componentes Drag & Drop,
                      <br />
                      Categorias e Produtos.
                    </span>
                  </>
                ) : i === 2 ? (
                  <>
                    <MessageSquare />
                    <span>
                      Dashboard de Vendas
                      <br />+ Chat com Cliente ao Vivo.
                    </span>
                  </>
                ) : (
                  <>
                    <Wallet />
                    <span>
                      Faturamento, Extrato
                      <br />e Repasse Pix Instantâneo.
                    </span>
                  </>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <Reveal className="shell final-cta">
        <span className="eyebrow">Agora é com você</span>
        <h2>
          Vamos tirar essa ideia
          <br />
          <em>do papel?</em>
        </h2>
        <HardwareButton href={startHref} size="lg" variant="primary">
          {isAuthenticated ? 'Abrir a Sessão Maker' : 'Entrar ou criar minha conta'}
        </HardwareButton>
      </Reveal>
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
          </>
        ) : (
          <>
            <a href="#/">Início</a>
            <a href="#/sobre">Sobre o projeto</a>
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
    </footer>
  )
}

export default function App() {
  const previousRoute = useRef<string | null>(null)
  const [route, setRoute] = useState(() => location.hash.slice(1).split('?')[0] || '/')
  const [templateIntent, setTemplateIntent] = useState<LayoutConfig['template'] | null>(null)
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState('')
  const toast = useToast()

  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1).split('?')[0] || '/')
      window.scrollTo({ top: 0 })
    }
    const authSync = (event: Event) => {
      setSession(readSession())
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
      '/entrar': 'Entrar na sua conta',
      '/cadastro': 'Criar conta grátis',
      '/modelos': 'Modelos de Loja',
      '/sobre': 'Sobre o projeto',
    }
    document.title = `Syndetis — ${titles[route] || 'Sobre o projeto'}`
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
    setSession(nextSession)
    setAuthNotice('')
    const target =
      route === '/dashboard' || route === '/criar'
        ? route
        : pendingRedirect || defaultTarget || '/dashboard'
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

  const isProtectedRoute = route === '/criar' || route === '/dashboard'

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
      <main id="main" tabIndex={-1}>
        {session ? (
          route === '/modelos' ? (
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
        ) : isProtectedRoute || route === '/modelos' ? (
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
