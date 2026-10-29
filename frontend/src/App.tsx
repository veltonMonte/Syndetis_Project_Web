import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Command,
  FileSpreadsheet,
  Layers3,
  LayoutTemplate,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Palette,
  Phone,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Card } from '@/components/echo/card'
import { Panel } from '@/components/echo/panel'
import { Grid } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { MacbookPro } from '@/components/ui/macbook-pro'
import { Iphone } from '@/components/ui/iphone'
import { DeviceStorefront } from '@/components/device-storefront'
import { AuthPage } from '@/components/auth-page'
import { MakerStudio, type MakerTab } from '@/components/maker-studio'
import { SellerDashboard, type DashboardTab } from '@/components/seller-dashboard'
import { ensureFullConfig, formatBRL, initialConfig, readDraft, templates, type LayoutConfig } from '@/lib/maker'
import { BILLING_PLANS, logoutSession, readSession, type AuthSession } from '@/lib/api'
import './App.css'
import './components/ui/device-hardware.css'

const FAQ_ITEMS = [
  {
    q: 'Como funciona o cancelamento da assinatura? Há multa ou fidelidade?',
    a: 'Não há fidelidade nem multa contratual. Você pode cancelar sua assinatura a qualquer momento em Painel → Repasses Pix e Assinatura → Cancelar assinatura. O acesso permanece ativo até o encerramento do período já pago e nenhuma cobrança futura é gerada.',
  },
  {
    q: 'Meus dados e catálogo ficam presos na plataforma se eu quiser sair?',
    a: 'Não. Você é o único titular dos dados da sua operação. Pelo painel, você exporta toda a estrutura e o catálogo de produtos em formato JSON e o histórico completo de pedidos e clientes em CSV a qualquer momento.',
  },
  {
    q: 'Qual a diferença prática entre o plano Standard (R$ 29/mês) e o Maker (R$ 49/mês)?',
    a: 'O plano Standard (R$ 29/mês) permite operar até 100 produtos ativos personalizando textos, cores, logotipo e imagens dentro da estrutura fixa do template. O plano Maker (R$ 49/mês) amplia o limite para 500 produtos ativos, libera a edição estrutural completa (adicionar, remover e reordenar seções da página) e inclui até 30 solicitações diárias ao assistente de IA.',
  },
  {
    q: 'Como a Syndetis protege os dados dos compradores e atende à LGPD?',
    a: 'Todas as conexões utilizam criptografia TLS 1.3 (HTTPS). As sessões são autenticadas via tokens JWT assinados com chave assimétrica RS256 e OAuth 2.0. Tratamos os dados pessoais estritamente para execução do pedido e emissão fiscal, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
  },
  {
    q: 'Quais meios de pagamento estão disponíveis no checkout da loja?',
    a: 'Sua vitrine aceita Pix com QR Code e aprovação em segundos (com opção de desconto automático configurável), Cartão de Crédito em até 12x e Boleto Bancário registrado.',
  },
  {
    q: 'Como funciona o suporte se eu tiver uma dúvida técnica ou operacional?',
    a: 'Oferecemos atendimento humano em português por e-mail (suporte@syndetis.com.br) e WhatsApp comercial de segunda a sexta, das 9h às 18h (horário de Brasília).',
  },
]

function Brand({ session }: { session?: AuthSession | null }) {
  return (
    <a href={session ? '#/criar' : '#/'} className="brand" aria-label="Syndetis — Ir para a página inicial">
      <span className="brand-mark" aria-hidden="true">
        <Command size={15} />
      </span>
      <span>
        syndetis<span className="brand-dot">.</span>
      </span>
    </a>
  )
}

/**
 * Public Top Header — shown ONLY when logged out (!session).
 * Follows the SaaS rule: "barra superior na landing, Sidebar à esquerda no app".
 */
function PublicHeader({ route }: { route: string }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="header">
      <div className="shell header-inner">
        <Brand session={null} />
        <nav className={open ? 'navigation navigation-open' : 'navigation'} aria-label="Navegação institucional">
          <a href="#/" aria-current={route === '/' ? 'page' : undefined} onClick={() => setOpen(false)}>
            Início
          </a>
          <a href="#/recursos" aria-current={route === '/recursos' || route === '/sobre' ? 'page' : undefined} onClick={() => setOpen(false)}>
            Recursos
          </a>
          <a href="#/precos" aria-current={route === '/precos' ? 'page' : undefined} onClick={() => setOpen(false)}>
            Preços
          </a>
          <a href="#/faq" aria-current={route === '/faq' ? 'page' : undefined} onClick={() => setOpen(false)}>
            Perguntas frequentes
          </a>
          <a href="#/seguranca" aria-current={route === '/seguranca' ? 'page' : undefined} onClick={() => setOpen(false)}>
            Segurança e LGPD
          </a>
          <span className="nav-divider" />
          <div className="nav-auth-cluster">
            <HardwareButton href="#/entrar" size="sm" variant="ghost">
              Entrar
            </HardwareButton>
            <HardwareButton href="#/cadastro" size="sm" variant="primary">
              Criar conta
            </HardwareButton>
          </div>
        </nav>
        <div className="mobile-menu">
          <HardwareButton
            iconOnly
            variant="secondary"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
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
    <div role="group" className="devices" aria-label="Interface real da loja Syndetis em desktop e celular">
      <div className="device-stage">
        <MacbookPro className="hero-macbook" aria-label="Vitrine Syndetis no computador">
          <DeviceStorefront />
        </MacbookPro>
        <Iphone className="hero-iphone" aria-label="Vitrine Syndetis no celular">
          <DeviceStorefront mobile />
        </Iphone>
      </div>
      <div className="device-caption tabular-nums">
        <span>{config.name} · Catálogo real em execução</span>
        <span>Pix D+0 · Cartão até 12x · Chat vinculado ao pedido</span>
      </div>
    </div>
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
          <span>{template.id}.syndetis.app</span>
        </div>
        <div className="template-nav">
          <span>syndetis.</span>
          <small>Catálogo · Pix · Rastreio</small>
        </div>
        <div className={`template-composition template-${template.id}`}>
          <div>
            <small>{template.category}</small>
            <h3>{template.name}</h3>
            <span className="template-mini-cta">Selecionar estrutura</span>
          </div>
          <img
            src={`https://images.unsplash.com/${template.image}?auto=format&fit=crop&w=700&q=85`}
            alt={`Estrutura do modelo ${template.name}`}
            loading="lazy"
          />
        </div>
        <div className="template-bottom tabular-nums">
          <span>Contraste WCAG AA verificado</span>
          <span>Responsivo (Mobile 16px)</span>
        </div>
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
    <section className={`shell section template-section ${standalone ? 'standalone' : ''}`} id="modelos">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Estruturas base de vitrine</span>
          {standalone ? (
            <h1>Escolha a estrutura inicial da sua loja</h1>
          ) : (
            <h2>Três layouts otimizados para leitura e conversão</h2>
          )}
        </div>
        <p>
          Todos os layouts utilizam números tabulares para preços, alvos de toque de 44 px no celular e cálculo de frete no checkout.
        </p>
      </div>
      <Grid minItemWidth="18rem" gap={6}>
        {templates.map(template => (
          <div key={template.id} className="template-card-wrapper">
            <Card
              eyebrow={template.category}
              title={template.name}
              footer={
                <HardwareButton
                  size="sm"
                  variant="secondary"
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
                  {isAuthenticated ? `Aplicar layout ${template.name.split(' ')[0]}` : `Usar layout ${template.name.split(' ')[0]}`}
                </HardwareButton>
              }
            >
              <TemplatePreview template={template} />
            </Card>
          </div>
        ))}
      </Grid>
    </section>
  )
}

function PricingSection({
  standalone = false,
}: {
  standalone?: boolean
}) {
  return (
    <section className={`shell section pricing-section ${standalone ? 'standalone' : ''}`} id="precos">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Preços transparentes · Sem taxa de adesão</span>
          {standalone ? (
            <h1>Planos claros para cada etapa da sua operação</h1>
          ) : (
            <h2>Escolha o plano ideal para o volume do seu catálogo</h2>
          )}
        </div>
        <p>
          Valores fixos mensais em Reais (R$). Cancele ou altere de plano a qualquer momento direto no painel, sem multa contratual.
        </p>
      </div>

      <div className="saas-pricing-grid">
        {BILLING_PLANS.map(plan => {
          const isRecommended = plan.code === 'MAKER'
          return (
            <div
              key={plan.code}
              className={`saas-pricing-card ${isRecommended ? 'is-recommended' : ''}`}
            >
              <div className="saas-pricing-head">
                <div>
                  <span className="saas-plan-badge">
                    {isRecommended ? 'Recomendado · Mais completo' : 'Operação essencial'}
                  </span>
                  <h3>Plano {plan.name}</h3>
                </div>
                <div className="saas-price-block tabular-nums">
                  <strong>{formatBRL(plan.priceMonthly)}</strong>
                  <span>/mês</span>
                </div>
              </div>

              <p className="saas-pricing-desc">{plan.description}</p>

              <ul className="saas-pricing-features">
                {plan.features.map(f => (
                  <li key={f}>
                    <Check size={15} />
                    <span>{f}</span>
                  </li>
                ))}
                <li>
                  <Check size={15} />
                  <span>Checkout transparente com Pix, Cartão (até 12x) e Boleto</span>
                </li>
                <li>
                  <Check size={15} />
                  <span>Painel de pedidos com chat vinculado ao comprador</span>
                </li>
                <li>
                  <Check size={15} />
                  <span>Exportação completa de dados (JSON e CSV) conforme LGPD</span>
                </li>
              </ul>

              <div className="saas-pricing-cta">
                <HardwareButton
                  href="#/cadastro"
                  variant={isRecommended ? 'primary' : 'secondary'}
                  fullWidth
                  trailingIcon={<ArrowRight size={15} />}
                >
                  {isRecommended ? 'Começar com o plano Maker' : 'Começar com o plano Standard'}
                </HardwareButton>
                <small className="tabular-nums">
                  Cobrança mensal de {formatBRL(plan.priceMonthly)} · Cancelamento em 1 clique
                </small>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison Table */}
      <div className="saas-comparison-box">
        <h3>Comparativo técnico de recursos por plano</h3>
        <div className="saas-table-wrap">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Recurso operacional</th>
                <th className="num-col">Standard (R$ 29/mês)</th>
                <th className="num-col">Maker (R$ 49/mês)</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td>Limite de produtos ativos no catálogo</td>
                <td className="num-col">Até 100 produtos</td>
                <td className="num-col">
                  <strong>Até 500 produtos</strong>
                </td>
              </tr>
              <tr>
                <td>Edição de textos, cores, logotipo e imagens</td>
                <td className="num-col">Incluído</td>
                <td className="num-col">
                  <strong>Incluído</strong>
                </td>
              </tr>
              <tr>
                <td>Edição estrutural (adicionar, remover e reordenar seções)</td>
                <td className="num-col">Estrutura fixa</td>
                <td className="num-col">
                  <strong>Liberada no Maker</strong>
                </td>
              </tr>
              <tr>
                <td>Solicitações diárias de IA para geração de textos e layout</td>
                <td className="num-col">Não incluído (0/dia)</td>
                <td className="num-col">
                  <strong>Até 30 solicitações/dia</strong>
                </td>
              </tr>
              <tr>
                <td>Pagamentos via Pix (QR Code), Cartão de Crédito e Boleto</td>
                <td className="num-col">Incluído</td>
                <td className="num-col">
                  <strong>Incluído</strong>
                </td>
              </tr>
              <tr>
                <td>Chat em tempo real integrado ao pedido + Exportação CSV</td>
                <td className="num-col">Incluído</td>
                <td className="num-col">
                  <strong>Incluído</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="saas-payment-trust-strip">
          <span>Meios de pagamento aceitos na assinatura e no checkout:</span>
          <div className="saas-payment-badges">
            <span className="saas-pay-pill">Pix Banco Central (D+0)</span>
            <span className="saas-pay-pill">Cartão de Crédito (Visa, Mastercard, Elo)</span>
            <span className="saas-pay-pill">Boleto Bancário Registrado</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`shell section faq-section ${standalone ? 'standalone' : ''}`} id="faq">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Dúvidas frequentes</span>
          {standalone ? (
            <h1>Respostas diretas sobre cobrança, dados e operação</h1>
          ) : (
            <h2>Tudo o que você precisa saber antes de publicar sua loja</h2>
          )}
        </div>
        <p>
          Transparência sobre cancelamento, portabilidade de dados, segurança e suporte humano.
        </p>
      </div>

      <div className="saas-faq-grid">
        {FAQ_ITEMS.map(item => (
          <div key={item.q} className="saas-faq-item">
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SecurityAndLgpdPage() {
  return (
    <section className="shell section standalone">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Segurança da Informação, Privacidade (LGPD) e Status</span>
          <h1>Como protegemos os dados da sua loja e dos seus clientes</h1>
        </div>
        <p>
          Explicação em linguagem simples sobre nossa arquitetura de autenticação, armazenamento de dados, direitos do titular (Lei nº 13.709/2018) e disponibilidade operacional.
        </p>
      </div>

      <Grid minItemWidth="20rem" gap={6}>
        <Card
          eyebrow="Criptografia e Autenticação"
          title="HTTPS (TLS 1.3), JWT RS256 e OAuth 2.0"
          meta={<Lock size={15} />}
        >
          Todas as informações trafegam sob criptografia TLS 1.3. As senhas são processadas com hash irreversível (bcrypt) e as sessões utilizam chaves assimétricas RS256 com opção de autenticação via Google e GitHub.
        </Card>
        <Card
          eyebrow="Conformidade com a LGPD"
          title="Onde os dados ficam e quem tem acesso"
          meta={<ShieldCheck size={15} />}
        >
          Os bancos de dados de catálogo, pedidos e autenticação operam em instâncias isoladas com controle estrito de acesso. Não comercializamos dados de lojistas ou compradores com terceiros sob nenhuma hipótese.
        </Card>
        <Card
          eyebrow="Portabilidade e Exclusão"
          title="Seus dados pertencem à sua empresa"
          meta={<FileSpreadsheet size={15} />}
        >
          Você pode exportar todo o seu catálogo em JSON e o livro de pedidos em CSV a qualquer momento. Caso solicite o encerramento da conta, os dados pessoais são removidos respeitando apenas as obrigações fiscais legais.
        </Card>
      </Grid>

      <div className="saas-comparison-box" style={{ marginTop: 32 }}>
        <div className="orders-panel-head" style={{ marginBottom: 12 }}>
          <div>
            <span className="eyebrow">Monitoramento em tempo real</span>
            <h3>Status operacional dos serviços Syndetis</h3>
          </div>
          <span className="order-status-tag" data-status="PAID">
            <CheckCircle2 size={13} /> Todos os serviços operacionais
          </span>
        </div>

        <div className="saas-table-wrap">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Componente da plataforma</th>
                <th>Descrição</th>
                <th>Status atual</th>
                <th className="num-col">Disponibilidade (90 dias)</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td>
                  <strong>API Gateway & Storefront CDN</strong>
                </td>
                <td>Entrega das vitrines públicas (.syndetis.app) e roteamento</td>
                <td>
                  <span className="order-status-tag" data-status="PAID">
                    <CheckCircle2 size={12} /> Operacional
                  </span>
                </td>
                <td className="num-col">99,98%</td>
              </tr>
              <tr>
                <td>
                  <strong>Auth Service (Go · RS256 / OAuth 2.0)</strong>
                </td>
                <td>Login com credenciais, Google, GitHub e emissão de tokens JWT</td>
                <td>
                  <span className="order-status-tag" data-status="PAID">
                    <CheckCircle2 size={12} /> Operacional
                  </span>
                </td>
                <td className="num-col">99,99%</td>
              </tr>
              <tr>
                <td>
                  <strong>Core Service & Maker Studio (Java)</strong>
                </td>
                <td>Persistência de catálogo, estrutura da loja e planos de assinatura</td>
                <td>
                  <span className="order-status-tag" data-status="PAID">
                    <CheckCircle2 size={12} /> Operacional
                  </span>
                </td>
                <td className="num-col">99,95%</td>
              </tr>
              <tr>
                <td>
                  <strong>Processamento Pix, Cartão e Webhooks</strong>
                </td>
                <td>Liquidação instantânea e conciliação de pedidos no painel</td>
                <td>
                  <span className="order-status-tag" data-status="PAID">
                    <CheckCircle2 size={12} /> Operacional
                  </span>
                </td>
                <td className="num-col">99,97%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function Home({
  onChoose,
}: {
  onChoose: (config: LayoutConfig) => void
}) {
  return (
    <>
      {/* 1. HERO: Concrete value statement, 1-2 line subtitle, 1 Primary CTA, 1 Secondary CTA, Real Product UI */}
      <section className="shell hero">
        <div className="hero-copy">
          <span className="eyebrow">Plataforma de e-commerce e gestão operacional B2B/B2C</span>
          <h1>
            Monte sua loja virtual, receba por Pix em segundos e atenda clientes junto ao pedido.
          </h1>
          <p>
            Cadastre produtos com controle de estoque por SKU, calcule frete automático por CEP e acompanhe pagamentos em Pix, cartão e boleto no mesmo painel.
          </p>
          <div className="hero-actions">
            <HardwareButton href="#/cadastro" size="lg" variant="primary" trailingIcon={<ArrowRight size={16} />}>
              Criar minha loja
            </HardwareButton>
            <HardwareButton href="#/precos" size="lg" variant="secondary">
              Ver planos (R$ 29 e R$ 49)
            </HardwareButton>
          </div>
          <div className="hero-subline tabular-nums">
            <span>
              <Check size={14} /> Planos a partir de R$ 29,00/mês
            </span>
            <span>
              <Check size={14} /> Sem fidelidade · Cancelamento em 1 clique
            </span>
            <span>
              <Check size={14} /> Conformidade integral com a LGPD
            </span>
          </div>
        </div>
        <Devices />
      </section>

      {/* 2. COMO FUNCIONA: 3 passos objetivos com interface real */}
      <section className="shell section how-it-works-section" id="como-funciona">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Fluxo direto de implantação</span>
            <h2>Da configuração do catálogo ao primeiro pedido pago em 3 etapas</h2>
          </div>
          <p>
            Sem configurações complexas de servidor. Tudo funciona direto no navegador com sincronização imediata.
          </p>
        </div>

        <div className="saas-steps-grid">
          <div className="saas-step-card">
            <div className="saas-step-num tabular-nums">Passo 01</div>
            <h3>Cadastre produtos, categorias e CEP de origem</h3>
            <p>
              Defina preços em Reais (R$), código SKU, saldo de estoque e o CEP do seu depósito para cálculo de frete e preenchimento automático de endereço.
            </p>
            <div className="saas-step-mini-ui tabular-nums">
              <div>
                <strong>SYN-MN-01 · Cronógrafo Monolith</strong>
                <span>Estoque: 18 un.</span>
              </div>
              <strong>R$ 680,00</strong>
            </div>
          </div>

          <div className="saas-step-card">
            <div className="saas-step-num tabular-nums">Passo 02</div>
            <h3>Personalize a vitrine no Construtor Maker</h3>
            <p>
              Organize a ordem das seções da página, ajuste textos, cores com validação automática de contraste (WCAG AA) e publique seu endereço <code>.syndetis.app</code>.
            </p>
            <div className="saas-step-mini-ui tabular-nums">
              <div>
                <strong>syndetis-store.syndetis.app</strong>
                <span>TLS 1.3 ativo</span>
              </div>
              <span className="order-status-tag" data-status="PAID">
                <CheckCircle2 size={12} /> Publicada
              </span>
            </div>
          </div>

          <div className="saas-step-card">
            <div className="saas-step-num tabular-nums">Passo 03</div>
            <h3>Receba por Pix ou cartão e converse no pedido</h3>
            <p>
              Acompanhe a aprovação instantânea dos pagamentos, envie o código de rastreio pelos Correios ou transportadora e tire dúvidas do cliente no chat vinculado à compra.
            </p>
            <div className="saas-step-mini-ui tabular-nums">
              <div>
                <strong>Pedido #SYN-1048 · Pix aprovado</strong>
                <span>Marina Vasconcelos (SP)</span>
              </div>
              <strong>+R$ 673,20 líq.</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RECURSOS: Blocos alternados de texto e interface real (não grade de cards genéricos) */}
      <section className="shell section features-alternating-section" id="recursos">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Recursos da plataforma</span>
            <h2>Ferramentas densas e funcionais para operar todos os dias</h2>
          </div>
          <p>
            Projetado com foco em legibilidade, atalhos de teclado (Ctrl+K) e precisão contábil.
          </p>
        </div>

        {/* Bloco Alternado 1 */}
        <div className="saas-feature-block">
          <div className="saas-feature-copy">
            <span className="eyebrow">01 · Construtor de Vitrine (Maker)</span>
            <h3>Edite a estrutura da loja vendo o resultado real em desktop e celular</h3>
            <p>
              Adicione, oculte, duplique ou reordene seções de cabeçalho, grade de categorias, vitrine de produtos, regras de garantia e rodapé fiscal sem tocar em código.
            </p>
            <ul className="saas-feature-bullets">
              <li>
                <Check size={15} /> Contraste de botões calculado automaticamente por luminância WCAG 2.2 AA
              </li>
              <li>
                <Check size={15} /> Confirmação de segurança e botão "Desfazer" antes de excluir qualquer seção
              </li>
              <li>
                <Check size={15} /> Exportação integral do layout em arquivo JSON a qualquer momento
              </li>
            </ul>
            <HardwareButton href="#/cadastro" variant="secondary" trailingIcon={<ArrowRight size={14} />}>
              Testar o construtor de vitrine
            </HardwareButton>
          </div>

          <Panel variant="screen" className="saas-feature-ui-preview">
            <div className="saas-ui-window-bar">
              <span>Maker · Árvore de Seções da Página</span>
              <code className="tabular-nums">6 seções ativas</code>
            </div>
            <div className="saas-ui-mock-list tabular-nums">
              <div className="saas-ui-mock-row">
                <span>1. Barra de Avisos</span>
                <small>Frete grátis acima de R$ 299,00 · 5% OFF no Pix</small>
                <span className="saas-badge-neutral">Visível</span>
              </div>
              <div className="saas-ui-mock-row is-highlighted">
                <span>2. Cabeçalho da Vitrine (Hero)</span>
                <small>Equipamentos e objetos para trabalho e estúdio</small>
                <span className="saas-badge-primary">Editando</span>
              </div>
              <div className="saas-ui-mock-row">
                <span>3. Grade de Categorias</span>
                <small>4 categorias vinculadas</small>
                <span className="saas-badge-neutral">Visível</span>
              </div>
              <div className="saas-ui-mock-row">
                <span>4. Grade de Produtos em Estoque</span>
                <small>Preços tabulares e parcelamento em até 10x</small>
                <span className="saas-badge-neutral">Visível</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Bloco Alternado 2 (Invertido) */}
        <div className="saas-feature-block is-reversed">
          <div className="saas-feature-copy">
            <span className="eyebrow">02 · Gestão de Pedidos e Chat Integrado</span>
            <h3>Fale com o comprador na mesma tela em que você gerencia a entrega</h3>
            <p>
              Chega de procurar o número do pedido em conversas soltas de WhatsApp. Na Syndetis, cada conversa já traz o valor pago, os itens comprados, o status de separação e o histórico do cliente.
            </p>
            <ul className="saas-feature-bullets">
              <li>
                <Check size={15} /> Tabela com cabeçalho fixo, ordenação por valor/data e seleção em massa
              </li>
              <li>
                <Check size={15} /> Notificação automática no chat quando o pedido é despachado
              </li>
              <li>
                <Check size={15} /> Respostas rápidas com 1 clique para envio de código de rastreio e NF-e
              </li>
            </ul>
            <HardwareButton href="#/cadastro" variant="secondary" trailingIcon={<ArrowRight size={14} />}>
              Conhecer o painel de pedidos
            </HardwareButton>
          </div>

          <Panel variant="screen" className="saas-feature-ui-preview">
            <div className="saas-ui-window-bar">
              <span>Pedidos Conciliados & Atendimento</span>
              <code className="tabular-nums">#SYN-1048 · São Paulo/SP</code>
            </div>
            <div className="saas-ui-mock-list tabular-nums">
              <div className="saas-ui-mock-row">
                <div>
                  <strong>#SYN-1048 · Marina Vasconcelos</strong>
                  <small>1× Cronógrafo Monolith 01 · 29/10/2026 14:22</small>
                </div>
                <span className="order-status-tag" data-status="PAID">
                  <CheckCircle2 size={12} /> Pago via Pix · R$ 680,00
                </span>
              </div>
              <div className="saas-ui-mock-row">
                <div>
                  <strong>#SYN-1047 · Lucas Andrade</strong>
                  <small>1× Headphone Studio + 1× Luminária · 29/10/2026 11:08</small>
                </div>
                <span className="order-status-tag" data-status="PREPARING">
                  <Truck size={12} /> Em separação · R$ 1.460,00
                </span>
              </div>
              <div className="saas-ui-mock-chat">
                <small>Chat vinculado ao pedido #SYN-1048:</small>
                <p>"Olá! Acabei de pagar via Pix. Conseguem enviar com nota fiscal e embalagem para presente?"</p>
              </div>
            </div>
          </Panel>
        </div>

        {/* Bloco Alternado 3 */}
        <div className="saas-feature-block">
          <div className="saas-feature-copy">
            <span className="eyebrow">03 · Conciliação Financeira e Contexto Brasileiro</span>
            <h3>Receba por Pix com liquidação imediata e exporte relatórios contábeis</h3>
            <p>
              Acompanhe o saldo disponível livre de taxas ocultas, configure desconto automático para pagamentos à vista no Pix e transfira seus recebíveis para a conta bancária do seu CNPJ.
            </p>
            <ul className="saas-feature-bullets">
              <li>
                <Check size={15} /> Máscaras nativas para CPF, CNPJ e CEP com preenchimento de endereço
              </li>
              <li>
                <Check size={15} /> Extrato detalhado com valor bruto, taxa efetiva e valor líquido em BRL (R$)
              </li>
              <li>
                <Check size={15} /> Exportação em 1 clique para planilha CSV compatível com seu contador
              </li>
            </ul>
            <HardwareButton href="#/precos" variant="secondary" trailingIcon={<ArrowRight size={14} />}>
              Comparar planos e taxas
            </HardwareButton>
          </div>

          <Panel variant="screen" className="saas-feature-ui-preview">
            <div className="saas-ui-window-bar">
              <span>Conciliação Financeira (BRL)</span>
              <code className="tabular-nums">Liquidação Pix D+0</code>
            </div>
            <div className="saas-ui-mock-list tabular-nums">
              <div className="saas-ui-mock-row">
                <div>
                  <strong>Venda #SYN-1048 · Pix Instantâneo</strong>
                  <small>Bruto: R$ 680,00 · Taxa: R$ 6,80</small>
                </div>
                <strong style={{ color: 'var(--saas-success-text)' }}>+R$ 673,20</strong>
              </div>
              <div className="saas-ui-mock-row">
                <div>
                  <strong>Venda #SYN-1046 · Pix Instantâneo</strong>
                  <small>Bruto: R$ 1.240,00 · Taxa: R$ 12,40</small>
                </div>
                <strong style={{ color: 'var(--saas-success-text)' }}>+R$ 1.227,60</strong>
              </div>
              <div className="saas-ui-mock-row">
                <div>
                  <strong>Transferência Pix enviada ao CNPJ titular</strong>
                  <small>26/10/2026 às 17:10 · Tarifa R$ 0,00</small>
                </div>
                <strong>-R$ 4.500,00</strong>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* 4. MODELOS BASE */}
      <TemplateGallery onChoose={onChoose} isAuthenticated={false} />

      {/* 5. PREÇOS TRANSPARENTES */}
      <PricingSection />

      {/* 6. FAQ */}
      <FaqSection />

      {/* 7. CTA FINAL */}
      <section className="shell final-cta">
        <span className="eyebrow">Comece sua operação hoje</span>
        <h2>Configure sua loja virtual e publique quando estiver pronto</h2>
        <p>
          Crie sua conta gratuitamente para testar o construtor Maker e o painel de pedidos. Você só ativa o plano mensal quando decidir publicar.
        </p>
        <div className="final-cta-buttons">
          <HardwareButton href="#/cadastro" variant="primary" size="lg" trailingIcon={<ArrowRight size={16} />}>
            Criar conta agora
          </HardwareButton>
          <HardwareButton href="#/entrar" variant="secondary" size="lg">
            Acessar conta existente
          </HardwareButton>
        </div>
      </section>
    </>
  )
}

function Footer({ session }: { session: AuthSession | null }) {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div className="footer-brand-col">
          <Brand session={session} />
          <p>
            Plataforma SaaS de comércio eletrônico, catálogo técnico, conciliação Pix/Cartão e atendimento integrado ao pedido.
          </p>
          <div className="footer-legal-id tabular-nums">
            <strong>Syndetis Tecnologia e Comércio Digital Ltda.</strong>
            <span>CNPJ: 48.921.304/0001-72</span>
            <span>Av. Brigadeiro Faria Lima, 3477 — Itaim Bibi, São Paulo/SP · CEP 04538-132</span>
          </div>
        </div>

        <div className="footer-links-col">
          <strong>Produto e Planos</strong>
          <nav aria-label="Links do produto">
            {session ? (
              <>
                <a href="#/criar">Construtor de Vitrine (Maker)</a>
                <a href="#/modelos">Estruturas de Layout</a>
                <a href="#/dashboard">Painel de Pedidos e Chat</a>
              </>
            ) : (
              <>
                <a href="#/">Visão geral da plataforma</a>
                <a href="#/recursos">Recursos operacionais</a>
                <a href="#/precos">Planos Standard (R$ 29) e Maker (R$ 49)</a>
                <a href="#/faq">Perguntas frequentes (FAQ)</a>
              </>
            )}
          </nav>
        </div>

        <div className="footer-links-col">
          <strong>Segurança, Legal e Status</strong>
          <nav aria-label="Links jurídicos e segurança">
            <a href="#/seguranca">Segurança da Informação (TLS / RS256)</a>
            <a href="#/seguranca">Privacidade e Proteção de Dados (LGPD)</a>
            <a href="#/seguranca">Termos de Uso e Política de Cancelamento</a>
            <a href="#/status">
              <span className="status-pip" style={{ display: 'inline-block', marginRight: 6 }} />
              Status dos Sistemas: 99,98% Operacional
            </a>
          </nav>
        </div>

        <div className="footer-links-col">
          <strong>Atendimento Humano</strong>
          <div className="footer-contact-list tabular-nums">
            <a href="mailto:suporte@syndetis.com.br">
              <Mail size={14} /> suporte@syndetis.com.br
            </a>
            <a href="https://wa.me/5511998124400" target="_blank" rel="noreferrer">
              <Phone size={14} /> WhatsApp: +55 (11) 99812-4400
            </a>
            <span>Segunda a sexta, das 09h às 18h (BRT)</span>
          </div>
        </div>
      </div>

      <div className="shell footer-bottom-bar tabular-nums">
        <span>© 2026 Syndetis Tecnologia e Comércio Digital Ltda. Todos os direitos reservados.</span>
        <span>Pagamentos processados via Pix Banco Central, Cartão de Crédito e Boleto Registrado.</span>
      </div>
    </footer>
  )
}

export default function App() {
  const previousRoute = useRef<string | null>(null)
  const [route, setRoute] = useState(() => location.hash.slice(1).split('?')[0] || '/')
  const [config, setConfig] = useState<LayoutConfig>(() => readDraft() || initialConfig)
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const [pendingRedirect, setPendingRedirect] = useState<string>('/criar')

  // Logged-in Workspace sub-navigation state (Left Sidebar + Command Palette Ctrl+K)
  const [makerTab, setMakerTab] = useState<MakerTab>('componentes')
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('vendas')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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

  // Global Command Palette Shortcut: Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
      } else if (e.key === 'Escape' && cmdOpen) {
        setCmdOpen(false)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [cmdOpen])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Plataforma de Loja Virtual, Pix e Atendimento Integrado',
      '/recursos': 'Recursos Operacionais',
      '/precos': 'Planos e Preços — Standard R$ 29 e Maker R$ 49',
      '/faq': 'Perguntas Frequentes',
      '/seguranca': 'Segurança da Informação, LGPD e Termos',
      '/status': 'Status Operacional do Sistema',
      '/criar': session ? 'Construtor de Vitrine (Maker)' : 'Entrar para acessar o Construtor',
      '/dashboard': session ? 'Painel de Pedidos, Chat e Repasses Pix' : 'Entrar para acessar o Painel',
      '/entrar': 'Entrar na sua conta',
      '/cadastro': 'Criar nova conta comercial',
      '/modelos': 'Estruturas Base de Vitrine',
      '/sobre': 'Recursos e Arquitetura',
    }
    document.title = `Syndetis — ${titles[route] || 'E-commerce e Operação'}`
    if (previousRoute.current !== null && previousRoute.current !== route) {
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    previousRoute.current = route
  }, [route, session])

  function choose(next: LayoutConfig) {
    setConfig(ensureFullConfig(next))
    if (session) {
      location.hash = '/criar'
      setMakerTab('componentes')
    } else {
      setPendingRedirect('/criar')
      toast({
        title: 'Estrutura selecionada',
        body: 'Entre ou crie sua conta para abrir o construtor com este modelo.',
      })
      location.hash = '/entrar'
    }
  }

  function handleAuthenticated(nextSession: AuthSession, defaultTarget: string) {
    setSession(nextSession)
    const target = route === '/dashboard' ? '/dashboard' : pendingRedirect || defaultTarget || '/criar'
    setPendingRedirect('/criar')
    location.hash = target
  }

  async function handleLogout() {
    await logoutSession()
    setSession(null)
    toast({ title: 'Sessão encerrada', body: 'Você saiu da sua conta com segurança.' })
    location.hash = '/'
  }

  function navigateWorkspace(targetRoute: '/criar' | '/dashboard' | '/modelos', subTab?: MakerTab | DashboardTab) {
    location.hash = targetRoute
    if (targetRoute === '/criar' && subTab) {
      setMakerTab(subTab as MakerTab)
    } else if (targetRoute === '/dashboard' && subTab) {
      setDashboardTab(subTab as DashboardTab)
    }
    setMobileSidebarOpen(false)
    setCmdOpen(false)
    setCmdQuery('')
  }

  const commandActions = [
    {
      label: 'Construtor: Editar seções da vitrine',
      category: 'Vitrine (Maker)',
      run: () => navigateWorkspace('/criar', 'componentes'),
    },
    {
      label: 'Catálogo: Gerenciar produtos, preços e estoque',
      category: 'Vitrine (Maker)',
      run: () => navigateWorkspace('/criar', 'produtos'),
    },
    {
      label: 'Catálogo: Gerenciar categorias da loja',
      category: 'Vitrine (Maker)',
      run: () => navigateWorkspace('/criar', 'categorias'),
    },
    {
      label: 'Configurações: Informar CPF/CNPJ, CEP e desconto Pix',
      category: 'Vitrine (Maker)',
      run: () => navigateWorkspace('/criar', 'configuracoes'),
    },
    {
      label: 'Operação: Ver tabela de pedidos e expedição',
      category: 'Painel & Vendas',
      run: () => navigateWorkspace('/dashboard', 'vendas'),
    },
    {
      label: 'Atendimento: Abrir chat em tempo real com clientes',
      category: 'Painel & Vendas',
      run: () => navigateWorkspace('/dashboard', 'chat'),
    },
    {
      label: 'Financeiro: Solicitar saque Pix ou exportar CSV',
      category: 'Financeiro & Assinatura',
      run: () => navigateWorkspace('/dashboard', 'faturamento'),
    },
    {
      label: 'Assinatura: Alterar plano (R$ 29 / R$ 49) ou cancelar assinatura',
      category: 'Financeiro & Assinatura',
      run: () => navigateWorkspace('/dashboard', 'faturamento'),
    },
    {
      label: 'Conta: Dados gerais, segurança OAuth e exportação LGPD',
      category: 'Configurações',
      run: () => navigateWorkspace('/dashboard', 'configuracoes'),
    },
  ]

  const filteredCommands = commandActions.filter(item => {
    const q = cmdQuery.trim().toLowerCase()
    return !q || item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  })

  const isProtectedRoute = route === '/criar' || route === '/dashboard'
  const activeWorkspaceRoute = route === '/dashboard' ? '/dashboard' : route === '/modelos' ? '/modelos' : '/criar'

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
        Pular para o conteúdo principal
      </a>

      {/* LOGGED-IN APP SHELL: Left Sidebar (Ícone + Texto) + Top Command Bar (Ctrl+K) */}
      {session ? (
        <div className="saas-app-shell">
          <aside
            className={`saas-app-sidebar ${mobileSidebarOpen ? 'is-open' : ''}`}
            aria-label="Navegação principal do aplicativo"
          >
            <div className="saas-sidebar-top">
              <Brand session={session} />
              <button
                type="button"
                className="saas-sidebar-close-mobile"
                aria-label="Fechar menu lateral"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <button
              type="button"
              className="saas-cmd-trigger"
              onClick={() => setCmdOpen(true)}
              title="Abrir paleta de comandos (Ctrl+K)"
            >
              <Search size={14} />
              <span>Buscar ação ou tela…</span>
              <kbd>Ctrl K</kbd>
            </button>

            <div className="saas-sidebar-group">
              <span className="saas-sidebar-label">Vitrine & Catálogo (Maker)</span>
              <nav aria-label="Menu do Construtor">
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/criar' && makerTab === 'componentes' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/criar', 'componentes')}
                >
                  <Layers3 size={16} />
                  <span>Seções da Página</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/criar' && makerTab === 'produtos' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/criar', 'produtos')}
                >
                  <ShoppingBag size={16} />
                  <span>Catálogo de Produtos</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/criar' && makerTab === 'categorias' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/criar', 'categorias')}
                >
                  <Tag size={16} />
                  <span>Categorias</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/criar' && makerTab === 'identidade' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/criar', 'identidade')}
                >
                  <Palette size={16} />
                  <span>Aparência e Marca</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/criar' && makerTab === 'configuracoes' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/criar', 'configuracoes')}
                >
                  <Truck size={16} />
                  <span>Frete, CEP e Fiscal</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/modelos' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/modelos')}
                >
                  <LayoutTemplate size={16} />
                  <span>Estruturas Base</span>
                </button>
              </nav>
            </div>

            <div className="saas-sidebar-group">
              <span className="saas-sidebar-label">Operação & Financeiro</span>
              <nav aria-label="Menu de Operação e Vendas">
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/dashboard' && dashboardTab === 'vendas' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/dashboard', 'vendas')}
                >
                  <BarChart3 size={16} />
                  <span>Pedidos e Receita</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/dashboard' && dashboardTab === 'chat' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/dashboard', 'chat')}
                >
                  <MessageSquare size={16} />
                  <span>Chat com Clientes</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/dashboard' && dashboardTab === 'faturamento' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/dashboard', 'faturamento')}
                >
                  <Wallet size={16} />
                  <span>Repasses Pix e Planos</span>
                </button>
                <button
                  type="button"
                  className={`saas-nav-item ${activeWorkspaceRoute === '/dashboard' && dashboardTab === 'configuracoes' ? 'is-active' : ''}`}
                  onClick={() => navigateWorkspace('/dashboard', 'configuracoes')}
                >
                  <Settings2 size={16} />
                  <span>Conta, OAuth e LGPD</span>
                </button>
              </nav>
            </div>

            <div className="saas-sidebar-footer">
              <div className="saas-user-badge">
                <User size={15} />
                <div>
                  <strong>{session.user.firstName}</strong>
                  <small>{session.user.email}</small>
                </div>
              </div>
              <button
                type="button"
                className="saas-logout-btn"
                onClick={handleLogout}
                title="Encerrar sessão com segurança"
              >
                <LogOut size={15} />
                <span>Sair</span>
              </button>
            </div>
          </aside>

          <div className="saas-app-main-col">
            {/* Mobile & Workspace Top Utility Bar */}
            <header className="saas-workspace-topbar">
              <div className="saas-topbar-left">
                <button
                  type="button"
                  className="saas-mobile-menu-btn"
                  aria-label="Abrir navegação lateral"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <Menu size={18} />
                </button>
                <span className="saas-breadcrumb">
                  <strong>{config.name}</strong>
                  <span>/</span>
                  <span>
                    {activeWorkspaceRoute === '/dashboard'
                      ? 'Operação e Faturamento'
                      : activeWorkspaceRoute === '/modelos'
                        ? 'Estruturas Base'
                        : 'Construtor de Vitrine (Maker)'}
                  </span>
                </span>
              </div>

              <div className="saas-topbar-right">
                <button
                  type="button"
                  className="saas-topbar-cmd-pill"
                  onClick={() => setCmdOpen(true)}
                >
                  <Search size={13} />
                  <span>Comando rápido</span>
                  <kbd>Ctrl K</kbd>
                </button>
                <a href="#/seguranca" className="saas-topbar-link">
                  <ShieldCheck size={14} /> LGPD & Status
                </a>
              </div>
            </header>

            <main id="main" tabIndex={-1} className="saas-workspace-content">
              {route === '/modelos' ? (
                <TemplateGallery standalone onChoose={choose} isAuthenticated />
              ) : route === '/seguranca' || route === '/status' ? (
                <SecurityAndLgpdPage />
              ) : route === '/dashboard' ? (
                <SellerDashboard
                  config={config}
                  setConfig={setConfig}
                  session={session}
                  activeTab={dashboardTab}
                  onTabChange={setDashboardTab}
                />
              ) : (
                <MakerStudio
                  config={config}
                  setConfig={setConfig}
                  activeTab={makerTab}
                  onTabChange={setMakerTab}
                />
              )}
            </main>
          </div>

          {/* Command Palette Modal (Ctrl/Cmd + K, closes on Esc) */}
          {cmdOpen && (
            <div
              className="saas-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Paleta de comandos rápidos"
              onClick={() => setCmdOpen(false)}
            >
              <div className="saas-cmd-modal" onClick={e => e.stopPropagation()}>
                <div className="saas-cmd-input-row">
                  <Search size={16} />
                  <input
                    type="search"
                    autoFocus
                    placeholder="Digite uma ação (ex.: produtos, pedidos, pix, cancelar assinatura, cep)…"
                    value={cmdQuery}
                    onChange={e => setCmdQuery(e.target.value)}
                  />
                  <kbd onClick={() => setCmdOpen(false)} style={{ cursor: 'pointer' }}>
                    Esc
                  </kbd>
                </div>
                <div className="saas-cmd-list" role="listbox">
                  {filteredCommands.length === 0 ? (
                    <div className="saas-cmd-empty">
                      Nenhum comando encontrado para "{cmdQuery}".
                    </div>
                  ) : (
                    filteredCommands.map(cmd => (
                      <button
                        key={cmd.label}
                        type="button"
                        className="saas-cmd-item"
                        onClick={cmd.run}
                      >
                        <span>{cmd.label}</span>
                        <small>{cmd.category}</small>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LOGGED-OUT PUBLIC MARKETING & AUTH FLOW */
        <>
          <PublicHeader route={route} />
          <main id="main" tabIndex={-1}>
            {route === '/' || route === '/recursos' || route === '/sobre' ? (
              <Home onChoose={choose} />
            ) : route === '/precos' ? (
              <PricingSection standalone />
            ) : route === '/faq' ? (
              <FaqSection standalone />
            ) : route === '/seguranca' || route === '/status' ? (
              <SecurityAndLgpdPage />
            ) : route === '/entrar' ? (
              <AuthPage mode="login" onAuthenticated={handleAuthenticated} />
            ) : route === '/cadastro' ? (
              <AuthPage mode="register" onAuthenticated={handleAuthenticated} />
            ) : route === '/auth/callback' ? (
              <AuthPage mode="callback" onAuthenticated={handleAuthenticated} />
            ) : isProtectedRoute || route === '/modelos' ? (
              <AuthPage mode="login" onAuthenticated={handleAuthenticated} />
            ) : (
              <section className="shell final-cta">
                <h1>Página não encontrada</h1>
                <p>O endereço solicitado não existe ou foi movido.</p>
                <HardwareButton href="#/" variant="primary">
                  Voltar para a página inicial
                </HardwareButton>
              </section>
            )}
          </main>
          <Footer session={null} />
        </>
      )}
    </>
  )
}
