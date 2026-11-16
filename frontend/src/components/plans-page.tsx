import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Check,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Bot,
  ChevronDown,
} from 'lucide-react'
import gsap from 'gsap'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Card } from '@/components/echo/card'
import { Panel } from '@/components/echo/panel'
import { BILLING_PLANS } from '@/lib/api'

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const context = gsap.context(() => {
      gsap.set(element, { opacity: 0, y: 24, scale: 0.985 })
      gsap.to(element, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
      })
    }, element)
    return () => context.revert()
  }, [])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

interface PlansPageProps {
  isAuthenticated: boolean
}

interface FaqItem {
  question: string
  answer: string
}

const FAQS: FaqItem[] = [
  {
    question: 'Existe cobrança de comissão ou porcentagem sobre as minhas vendas?',
    answer:
      'Não. A Syndetis não cobra nenhuma comissão sobre seu faturamento. O valor das suas vendas é 100% seu (descontando apenas a taxa de processamento padrão do meio de pagamento escolhido, como Pix ou cartão).',
  },
  {
    question: 'Posso criar uma conta e testar a plataforma antes de assinar?',
    answer:
      'Com certeza! Você pode se cadastrar gratuitamente, explorar o construtor da Sessão Maker, configurar produtos e visualizar sua loja antes de contratar qualquer plano.',
  },
  {
    question: 'Como funciona a cota de Inteligência Artificial do plano Maker?',
    answer:
      'O plano Maker inclui 30 gerações diárias de IA para criar textos atraentes de produtos, slogans e sugestões automáticas de layout validadas. A cota renova a cada 24 horas.',
  },
  {
    question: 'Posso mudar de plano ou cancelar a qualquer momento?',
    answer:
      'Sim. Você pode fazer upgrade, downgrade ou cancelamento da assinatura diretamente pelo seu Painel da Loja, sem multas contratuais e sem fidelidade.',
  },
  {
    question: 'Quais formas de pagamento são aceitas para a assinatura?',
    answer:
      'Aceitamos Pix com ativação imediata e cartões de crédito das principais bandeiras.',
  },
]

export function PlansPage({ isAuthenticated }: PlansPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const targetCta = isAuthenticated ? '#/dashboard' : '#/cadastro'

  return (
    <div className="plans-page">
      {/* HERO SECTION */}
      <section className="shell plans-hero">
        <Reveal>
          <span className="eyebrow">Planos & Preços</span>
          <h1>
            Preço simples para
            <br />
            <em>quem quer construir e vender.</em>
          </h1>
          <p>
            Sem taxas ocultas sobre suas vendas ou contratos de fidelidade.
            <br />
            Escolha o plano ideal para a sua fase e coloque sua vitrine no ar hoje mesmo.
          </p>
        </Reveal>
      </section>

      {/* PLANS CARDS SECTION */}
      <section className="shell section plans-grid-section">
        <Reveal>
          <div className="plans-cards-container">
            {BILLING_PLANS.map((plan) => {
              const isMaker = plan.code === 'MAKER'
              return (
                <div
                  key={plan.code}
                  className={`plans-card-wrapper ${isMaker ? 'is-featured' : ''}`}
                >
                  <Card
                    variant={isMaker ? 'raised' : 'screen'}
                    size="lg"
                    title={
                      <div className="plans-card-title-row">
                        <span className="plans-card-name">{plan.name}</span>
                        {isMaker ? (
                          <span className="plans-badge plans-badge-highlight">
                            <Sparkles size={11} /> Mais Escolhido
                          </span>
                        ) : (
                          <span className="plans-badge">Início Rápido</span>
                        )}
                      </div>
                    }
                    description={plan.description}
                    footer={
                      <div className="plans-card-footer">
                        <HardwareButton
                          href={targetCta}
                          size="md"
                          fullWidth
                          variant={isMaker ? 'primary' : 'neutral'}
                          icon={<ArrowRight size={15} />}
                        >
                          {isAuthenticated
                            ? `Gerenciar no Painel`
                            : isMaker
                              ? 'Começar com Maker'
                              : 'Começar com Standard'}
                        </HardwareButton>
                        <small className="plans-card-guarantee">
                          <ShieldCheck size={13} /> Cancelamento simples a qualquer momento
                        </small>
                      </div>
                    }
                  >
                    <div className="plans-pricing-block">
                      <div className="plans-price-row">
                        <span className="plans-currency">R$</span>
                        <span className="plans-price-amount">{plan.priceMonthly}</span>
                        <span className="plans-period">/mês</span>
                      </div>
                      <span className="plans-billing-cycle">Cobrança mensal fixa</span>
                    </div>

                    <div className="plans-divider" />

                    <div className="plans-features-wrapper">
                      <strong className="plans-features-heading">O que está incluído:</strong>
                      <ul className="plan-feature-list plans-page-feature-list">
                        {plan.features.map((feature) => (
                          <li key={feature}>
                            <span className="plans-check-icon">
                              <Check size={14} />
                            </span>
                            <span>{feature}</span>
                          </li>
                        ))}
                        {isMaker ? (
                          <>
                            <li>
                              <span className="plans-check-icon">
                                <Bot size={14} />
                              </span>
                              <span>IA com 30 requisições diárias para textos e layouts</span>
                            </li>
                            <li>
                              <span className="plans-check-icon">
                                <Zap size={14} />
                              </span>
                              <span>Suporte prioritário da equipe</span>
                            </li>
                          </>
                        ) : (
                          <li>
                            <span className="plans-check-icon">
                              <Check size={14} />
                            </span>
                            <span>Painel de pedidos, chat e métricas financeiras</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        </Reveal>
      </section>

      {/* COMPARISON / SPECS MATRIX */}
      <section className="shell section plans-matrix-section">
        <Reveal>
          <div className="section-heading text-center">
            <span className="eyebrow">Comparativo Detalhado</span>
            <h2>Recursos lado a lado</h2>
            <p>Compare as capacidades de cada plano com total transparência.</p>
          </div>

          <Panel variant="screen" className="plans-matrix-panel">
            <div className="plans-table-responsive">
              <table className="plans-comparison-table">
                <thead>
                  <tr>
                    <th>Recursos</th>
                    <th>Standard</th>
                    <th className="highlight-col">Maker</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Limite de produtos ativos</strong>
                      <small>Capacidade simultânea de itens à venda</small>
                    </td>
                    <td>100 produtos</td>
                    <td className="highlight-col"><strong>500 produtos</strong></td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Personalização visual básica</strong>
                      <small>Cores, fontes, logotipo e imagens de capa</small>
                    </td>
                    <td><Check size={16} className="table-check" /></td>
                    <td className="highlight-col"><Check size={16} className="table-check" /></td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Construtor modular Maker</strong>
                      <small>Adicionar, remover e reordenar blocos livremente</small>
                    </td>
                    <td><span className="text-dim">Estrutura fixa</span></td>
                    <td className="highlight-col">
                      <span className="table-highlight-badge">Liberdade total</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Assistente com Inteligência Artificial</strong>
                      <small>Geração de copys, descrições e sugestões de layout</small>
                    </td>
                    <td><span className="text-dim">—</span></td>
                    <td className="highlight-col">
                      <strong>30 req / dia</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Comissão sobre vendas</strong>
                      <small>Taxa retida pela plataforma</small>
                    </td>
                    <td><strong>0%</strong> (Zero)</td>
                    <td className="highlight-col"><strong>0%</strong> (Zero)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Painel financeiro & Pix</strong>
                      <small>Acompanhe recebíveis e solicite repasses</small>
                    </td>
                    <td><Check size={16} className="table-check" /></td>
                    <td className="highlight-col"><Check size={16} className="table-check" /></td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Chat em tempo real com clientes</strong>
                      <small>Converse diretamente com seus compradores</small>
                    </td>
                    <td><Check size={16} className="table-check" /></td>
                    <td className="highlight-col"><Check size={16} className="table-check" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </section>

      {/* FAQ ACCORDION SECTION */}
      <section className="shell section plans-faq-section">
        <Reveal>
          <div className="section-heading text-center">
            <span className="eyebrow">Dúvidas Frequentes</span>
            <h2>Perguntas comuns sobre os planos</h2>
            <p>Tudo o que você precisa saber para começar com tranquilidade.</p>
          </div>

          <div className="plans-faq-list">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={faq.question}
                  className={`plans-faq-item ${isOpen ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="plans-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={18} className="plans-faq-chevron" />
                  </button>
                  {isOpen && (
                    <div className="plans-faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Reveal>
      </section>

      {/* FINAL CALL TO ACTION */}
      <Reveal className="shell final-cta plans-final-cta">
        <span className="eyebrow">O próximo passo é seu</span>
        <h2>
          Pronto para colocar sua ideia
          <br />
          <em>no ar com a Syndetis?</em>
        </h2>
        <div className="plans-cta-actions">
          <HardwareButton href={targetCta} variant="primary" size="lg">
            {isAuthenticated ? 'Acessar meu Painel' : 'Criar minha conta grátis'}
          </HardwareButton>
          {!isAuthenticated && (
            <HardwareButton href="#/entrar" size="lg">
              Fazer login
            </HardwareButton>
          )}
        </div>
        <p>Crie sua conta em 1 minuto e comece a construir sua loja autoral.</p>
      </Reveal>
    </div>
  )
}
