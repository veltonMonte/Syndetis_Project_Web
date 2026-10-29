import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  BarChart3,
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
import { MakerStudio } from '@/components/maker-studio'
import { SellerDashboard } from '@/components/seller-dashboard'
import { ensureFullConfig, initialConfig, readDraft, templates, type LayoutConfig } from '@/lib/maker'
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
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          const duration =
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--echo-duration-flood')) / 1000 ||
            0.7
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

function Brand() {
  return (
    <a href="#/" className="brand" aria-label="Syndetis, início">
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
        <Brand />
        <nav className={open ? 'navigation navigation-open' : 'navigation'} aria-label="Navegação principal">
          <a href="#/" aria-current={route === '/' ? 'page' : undefined}>
            Início
          </a>
          <a href="#/modelos" aria-current={route === '/modelos' ? 'page' : undefined}>
            Modelos
          </a>
          <a href="#/criar" aria-current={route === '/criar' ? 'page' : undefined}>
            Maker
          </a>
          <a href="#/dashboard" aria-current={route === '/dashboard' ? 'page' : undefined}>
            Dashboard
          </a>
          <a href="#/sobre" aria-current={route === '/sobre' ? 'page' : undefined}>
            Sobre
          </a>
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
              <HardwareButton href="#/cadastro" size="sm">
                Criar conta
              </HardwareButton>
              <HardwareButton href="#/criar" size="sm" variant="primary">
                Abrir o Maker
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
    <div role="group" className="devices" aria-label="Prévia da plataforma Syndetis em computador e celular">
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
}: {
  onChoose: (config: LayoutConfig) => void
  standalone?: boolean
}) {
  return (
    <section className={`shell section template-section ${standalone ? 'standalone' : ''}`} id="modelos">
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
            Escolha uma arquitetura de loja virtual e personalize cada componente.
            <br />
            Adicione seções, categorias, produtos e cores em tempo real.
          </p>
        </div>
      </Reveal>
      <Grid minItemWidth="17rem" gap={10}>
        {templates.map(template => (
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
                  Usar {template.name} no Maker
                </HardwareButton>
              }
            />
          </Reveal>
        ))}
      </Grid>
      <p className="section-footnote">Modelos 100% editáveis na Sessão Maker. Reordene e crie componentes livremente.</p>
    </section>
  )
}

function TemplatePreview({ template }: { template: (typeof templates)[number] }) {
  return (
    <div className="template-preview" style={{ '--preview-accent': template.accent } as CSSProperties}>
      <div className="template-window">
        <div className="template-browser" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>syndetis.app/{template.id}</span>
        </div>
        <div className="template-nav">
          <span>syndetis.</span>
          <small>Catálogo &nbsp; Maker</small>
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
            <span className="template-mini-cta">Personalizar loja</span>
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

function Home({ onChoose }: { onChoose: (config: LayoutConfig) => void }) {
  return (
    <>
      <section className="shell hero">
        <div className="hero-copy">
          <div className="announcement">
            <HardwareButton href="#/criar" size="sm" trailingIcon={<ArrowUpRight size={13} />}>
              Novo · Maker Visual + Dashboard Integrado
            </HardwareButton>
          </div>
          <h1>
            Sua loja merece
            <br />
            um lugar <em>no mundo.</em>
          </h1>
          <p>
            Da criação visual no Maker à gestão de vendas, chat em tempo real com o cliente e faturamento Pix.
            <br className="desktop-break" /> Construa sua loja virtual autoral sem escrever uma linha de código.
          </p>
          <div className="hero-actions">
            <HardwareButton href="#/cadastro" size="lg" variant="primary" impact>
              Começar minha loja
            </HardwareButton>
            <HardwareButton href="#/criar" size="lg">
              Abrir o Maker
            </HardwareButton>
            <a className="text-link" href="#/dashboard">
              Ver Dashboard & Chat <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="hero-subline">
            <span>
              <Check size={13} /> Login com GitHub & Google
            </span>
            <span>
              <Check size={13} /> Componentes Drag & Drop
            </span>
            <span>
              <Check size={13} /> Chat Vendedor ↔ Cliente
            </span>
          </div>
        </div>
        <Devices />
      </section>

      <div className="shell categories-strip">
        <span>
          Fluxo completo.
          <br />
          <strong>Em uma única plataforma.</strong>
        </span>
        <div>
          <ShoppingBag /> Construtor Visual de Lojas
        </div>
        <div>
          <MessageSquare /> Chat Integrado ao Pedido
        </div>
        <div>
          <Wallet /> Faturamento & Saque Pix
        </div>
        <div className="categories-browse">
          <HardwareButton
            href="#/dashboard"
            size="sm"
            iconOnly
            aria-label="Ir para o Dashboard"
            icon={<ArrowDown size={18} />}
          />
        </div>
      </div>

      <section className="shell section maker-intro">
        <Reveal className="intro-copy">
          <span className="eyebrow">Conheça a Sessão Maker</span>
          <h2>
            Você imagina.
            <br />
            <em>O resto ganha forma.</em>
          </h2>
          <p>
            Crie e exclua componentes, troque seções de lugar com drag & drop, cadastre categorias e produtos e publique sua loja virtual com um clique.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <HardwareButton href="#/criar" variant="primary" size="md" trailingIcon={<ArrowUpRight size={14} />}>
              Experimentar o Maker
            </HardwareButton>
            <a href="#/dashboard" className="text-link">
              Explorar o Dashboard <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="feature-index">
            <div>
              <MousePointer2 />
              <span>Crie, exclua e troque componentes de posição</span>
            </div>
            <div>
              <Palette />
              <span>Gerencie categorias, produtos, preços e estoque ao vivo</span>
            </div>
            <div>
              <Globe2 />
              <span>Dashboard de vendas com chat direto com o comprador</span>
            </div>
          </div>
        </Reveal>
        <Reveal className="maker-art">
          <div className="art-toolbar">
            <span>
              <Layers3 size={15} /> Sua identidade
            </span>
            <span>01 / Maker Studio</span>
          </div>
          <div className="typography-sample">
            Com a<br />
            <em>sua essência.</em>
          </div>
          <div className="palette-art">
            <span>Paleta da marca</span>
            <div>
              {['olive', 'sand', 'ink', 'paper', 'clay'].map(c => (
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

      <TemplateGallery onChoose={onChoose} />

      <Reveal className="shell final-cta">
        <span className="eyebrow">O próximo passo é seu</span>
        <h2>
          Uma ideia já é<br />
          <em>um ótimo começo.</em>
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <HardwareButton href="#/cadastro" variant="primary" size="lg">
            Criar minha conta grátis
          </HardwareButton>
          <HardwareButton href="#/dashboard" size="lg" icon={<BarChart3 size={16} />}>
            Acessar Dashboard Demo
          </HardwareButton>
        </div>
        <p>Conecte-se com GitHub ou Google e publique sua vitrine em minutos.</p>
      </Reveal>
    </>
  )
}

function About() {
  const steps = [
    {
      title: 'Conecte sua conta com 1 clique.',
      text: 'Entre com GitHub, Google ou e-mail profissional. Sua sessão é protegida com tokens RS256 e sincronizada automaticamente.',
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
            Construímos um ecossistema enxuto e poderoso para marcas independentes venderem online com identidade própria.
          </p>
          <a href="#/sobre/tutorial" className="text-link">
            Veja o fluxo completo da plataforma <ArrowDown size={16} />
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
            A Sessão Maker combina blocos modulares, catálogo integrado e prévia em tempo real em computadores e celulares. Você tem liberdade total para criar seções, trocar ordens e publicar instantaneamente.
          </p>
          <p>
            Junto ao Maker, o Dashboard unifica pedidos, chat direto entre vendedor e cliente e gestão de faturamento, eliminando ferramentas desconectadas.
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
                  <a href="#/cadastro" className="text-link">
                    Criar conta agora <ArrowUpRight size={15} />
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
          Vamos colocar sua loja
          <br />
          <em>no ar hoje?</em>
        </h2>
        <HardwareButton href="#/criar" size="lg" variant="primary">
          Abrir a Sessão Maker
        </HardwareButton>
      </Reveal>
    </>
  )
}

function Footer() {
  return (
    <footer className="shell footer">
      <div>
        <Brand />
        <p>Conectando marcas autorais. Da vitrine ao faturamento.</p>
      </div>
      <nav aria-label="Links do rodapé">
        <a href="#/modelos">Modelos</a>
        <a href="#/criar">Sessão Maker</a>
        <a href="#/dashboard">Dashboard & Chat</a>
        <a href="#/entrar">Entrar</a>
        <a href="#/sobre">Sobre</a>
      </nav>
      <span>
        Ecossistema Syndetis · 2026
        <br />
        Lojas Virtuais, Chat & Faturamento
      </span>
    </footer>
  )
}

export default function App() {
  const previousRoute = useRef<string | null>(null)
  const [route, setRoute] = useState(() => location.hash.slice(1).split('?')[0] || '/')
  const [config, setConfig] = useState<LayoutConfig>(() => readDraft() || initialConfig)
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const toast = useToast()

  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1).split('?')[0] || '/')
      window.scrollTo({ top: 0 })
    }
    const authSync = () => setSession(readSession())
    window.addEventListener('hashchange', change)
    window.addEventListener('syndetis-auth-change', authSync)
    return () => {
      window.removeEventListener('hashchange', change)
      window.removeEventListener('syndetis-auth-change', authSync)
    }
  }, [])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Sua loja virtual em movimento',
      '/criar': 'Sessão Maker · Construtor Visual',
      '/dashboard': 'Dashboard de Vendas, Chat & Faturamento',
      '/entrar': 'Entrar na sua conta',
      '/cadastro': 'Criar conta grátis',
      '/modelos': 'Modelos de Loja',
      '/sobre': 'Sobre a plataforma',
    }
    document.title = `Syndetis — ${titles[route] || 'Ecossistema de E-commerce'}`
    if (route === '/sobre/tutorial') {
      document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' })
    } else if (previousRoute.current !== null && previousRoute.current !== route) {
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    previousRoute.current = route
  }, [route])

  function choose(next: LayoutConfig) {
    setConfig(ensureFullConfig(next))
    location.hash = '/criar'
  }

  function handleAuthenticated(nextSession: AuthSession, redirectTo: string) {
    setSession(nextSession)
    location.hash = redirectTo
  }

  async function handleLogout() {
    await logoutSession()
    setSession(null)
    toast({ title: 'Sessão encerrada', body: 'Você saiu da sua conta com segurança.' })
    location.hash = '/'
  }

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={e => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Pular para o conteúdo
      </a>
      <Header key={`${route}-${session?.user.email || 'guest'}`} route={route} session={session} onLogout={handleLogout} />
      <main id="main" tabIndex={-1}>
        {route === '/' ? (
          <Home onChoose={choose} />
        ) : route === '/modelos' ? (
          <TemplateGallery standalone onChoose={choose} />
        ) : route === '/sobre' || route === '/sobre/tutorial' ? (
          <About />
        ) : route === '/entrar' ? (
          <AuthPage mode="login" onAuthenticated={handleAuthenticated} />
        ) : route === '/cadastro' ? (
          <AuthPage mode="register" onAuthenticated={handleAuthenticated} />
        ) : route === '/auth/callback' ? (
          <AuthPage mode="callback" onAuthenticated={handleAuthenticated} />
        ) : route === '/criar' ? (
          <MakerStudio config={config} setConfig={setConfig} />
        ) : route === '/dashboard' ? (
          <SellerDashboard config={config} setConfig={setConfig} session={session} />
        ) : (
          <section className="shell final-cta">
            <h1>Página não encontrada.</h1>
            <HardwareButton href="#/">Voltar ao início</HardwareButton>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
