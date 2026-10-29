import { useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Check,
  CreditCard,
  DollarSign,
  Download,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  Wallet,
  Wand2,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Panel } from '@/components/echo/panel'
import { Card } from '@/components/echo/card'
import { Grid, Stack } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { ensureFullConfig, formatBRL, slugify, type LayoutConfig } from '@/lib/maker'
import {
  BILLING_PLANS,
  readActivePlan,
  readChats,
  readOrders,
  readTransactions,
  syncStoreLayout,
  writeActivePlan,
  writeChats,
  writeOrders,
  writeTransactions,
  type AuthSession,
  type ChatMessage,
  type ChatThread,
  type DashboardOrder,
  type FinancialTransaction,
  type OrderStatus,
} from '@/lib/api'

type DashboardTab = 'vendas' | 'chat' | 'faturamento' | 'configuracoes'
type PeriodFilter = 'hoje' | '7d' | '30d' | '12m'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Aguardando Pagamento',
  PAID: 'Pago · Aprovado',
  PREPARING: 'Em Separação',
  SHIPPED: 'Enviado · Em Trânsito',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PAID',
  PAID: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}

const QUICK_REPLIES = [
  'Olá! Seu pedido já está em separação e sai ainda hoje.',
  'Segue o seu código de rastreio expresso: BR984510290SY',
  'Claro! Vamos preparar com embalagem especial de presente.',
  'Liberamos o cupom VIP10 com 10% OFF para sua próxima compra!',
]

const CUSTOMER_SIMULATED_REPLIES = [
  'Perfeito! Muito obrigado pelo retorno tão rápido!',
  'Que ótimo! Assim que chegar eu mando foto para vocês.',
  'Excelente atendimento, vou aproveitar o cupom para pedir mais um item!',
  'Confirmado! O endereço de entrega continua o mesmo cadastrado.',
]

const CHART_SERIES: Record<PeriodFilter, { labels: string[]; values: number[]; revenue: number; ordersCount: number; conversion: string }> = {
  hoje: {
    labels: ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'],
    values: [420, 680, 1240, 920, 1680, 2140, 1540, 1890],
    revenue: 10510,
    ordersCount: 24,
    conversion: '5,2%',
  },
  '7d': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    values: [3400, 4120, 3890, 5640, 6820, 7450, 6190],
    revenue: 37510,
    ordersCount: 96,
    conversion: '4,9%',
  },
  '30d': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Atual'],
    values: [9800, 12400, 11900, 15200, 17600, 19400, 22100],
    revenue: 108400,
    ordersCount: 284,
    conversion: '4,8%',
  },
  '12m': {
    labels: ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Atual'],
    values: [48000, 54000, 62000, 71000, 86000, 98000, 114000],
    revenue: 533000,
    ordersCount: 1420,
    conversion: '5,1%',
  },
}

export function SellerDashboard({
  config,
  setConfig,
  session,
}: {
  config: LayoutConfig
  setConfig: (config: LayoutConfig) => void
  session: AuthSession | null
}) {
  const full = ensureFullConfig(config)
  const toast = useToast()

  const [tab, setTab] = useState<DashboardTab>('vendas')
  const [period, setPeriod] = useState<PeriodFilter>('30d')

  // Orders state
  const [orders, setOrders] = useState<DashboardOrder[]>(() => readOrders())
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')

  // Chat state
  const [chats, setChats] = useState<ChatThread[]>(() => readChats())
  const [activeChatId, setActiveChatId] = useState<string>(() => readChats()[0]?.id || 'chat-marina')
  const [chatSearch, setChatSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')

  // Financial state
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => readTransactions())
  const [payoutAmount, setPayoutAmount] = useState('2500')
  const [pixKey, setPixKey] = useState(full.settings.supportEmail || 'financeiro@syndetis.app')
  const [activePlan, setActivePlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>(() => readActivePlan())

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0]
  const totalUnread = chats.reduce((acc, c) => acc + c.unread, 0)
  const currentSeries = CHART_SERIES[period]
  const avgTicket = currentSeries.ordersCount > 0 ? currentSeries.revenue / currentSeries.ordersCount : 0

  const filteredOrders = orders.filter(ord => {
    const matchesStatus = orderStatusFilter === 'ALL' || ord.status === orderStatusFilter
    const q = orderSearch.trim().toLowerCase()
    const matchesSearch =
      !q ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.code.toLowerCase().includes(q) ||
      ord.itemsSummary.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const filteredChats = chats.filter(c => {
    const q = chatSearch.trim().toLowerCase()
    return (
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.orderCode.toLowerCase().includes(q) ||
      c.customerCity.toLowerCase().includes(q)
    )
  })

  function selectChat(chatId: string) {
    setActiveChatId(chatId)
    const next = chats.map(c => (c.id === chatId ? { ...c, unread: 0 } : c))
    setChats(next)
    writeChats(next)
  }

  function openCustomerChatFromOrder(order: DashboardOrder) {
    const existing = chats.find(
      c => c.orderCode === order.code || c.customerEmail.toLowerCase() === order.customerEmail.toLowerCase(),
    )
    if (existing) {
      selectChat(existing.id)
      toast({
        title: `Chat com ${order.customerName}`,
        body: `Conversa vinculada ao pedido ${order.code} selecionada.`,
      })
      return
    }
    const created: ChatThread = {
      id: `chat-${Date.now().toString(36)}`,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerCity: order.customerCity,
      online: true,
      unread: 0,
      orderCode: order.code,
      orderTotal: order.total,
      orderStatus: order.status,
      lifetimeValue: order.total,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'system',
          text: `Canal direto iniciado para o pedido ${order.code} (${formatBRL(order.total)}).`,
          timestamp: 'Agora',
        },
      ],
    }
    const next = [created, ...chats]
    setChats(next)
    writeChats(next)
    setActiveChatId(created.id)
  }

  function advanceOrderStatus(orderId: string) {
    const target = orders.find(o => o.id === orderId)
    if (!target) return
    const nextStatus = NEXT_STATUS[target.status]
    if (!nextStatus) return

    const updatedOrders = orders.map(o =>
      o.id === orderId
        ? {
            ...o,
            status: nextStatus,
            trackingCode: nextStatus === 'SHIPPED' && !o.trackingCode ? `BR${Math.floor(100000000 + Math.random() * 900000000)}SY` : o.trackingCode,
          }
        : o,
    )
    setOrders(updatedOrders)
    writeOrders(updatedOrders)

    // Also post automatic status update in that customer's chat thread if present
    const updatedChats = chats.map(c => {
      if (c.orderCode !== target.code) return c
      const statusMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Status do pedido ${target.code} atualizado para: ${STATUS_LABEL[nextStatus]}.`,
        timestamp: 'Agora',
        attachment: {
          type: 'order',
          title: `${target.code} · ${STATUS_LABEL[nextStatus]}`,
          subtitle: target.itemsSummary,
        },
      }
      return {
        ...c,
        orderStatus: nextStatus,
        messages: [...c.messages, statusMsg],
      }
    })
    setChats(updatedChats)
    writeChats(updatedChats)

    toast({
      title: `Pedido ${target.code} atualizado`,
      body: `Novo status: ${STATUS_LABEL[nextStatus]} (notificado no chat do cliente).`,
    })
  }

  function sendChatMessage(textToSend = messageInput, attachment?: ChatMessage['attachment']) {
    const clean = textToSend.trim()
    if (!clean && !attachment) return
    if (!activeChat) return

    const newMsg: ChatMessage = {
      id: `m-${Date.now().toString(36)}`,
      sender: 'seller',
      text: clean || (attachment ? `Enviou informações: ${attachment.title}` : ''),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      attachment,
    }

    const next = chats.map(c =>
      c.id === activeChat.id
        ? {
            ...c,
            unread: 0,
            messages: [...c.messages, newMsg],
          }
        : c,
    )
    setChats(next)
    writeChats(next)
    if (textToSend === messageInput) setMessageInput('')
  }

  function simulateCustomerMessage() {
    if (!activeChat) return
    const randomReply = CUSTOMER_SIMULATED_REPLIES[Math.floor(Math.random() * CUSTOMER_SIMULATED_REPLIES.length)]
    const customerMsg: ChatMessage = {
      id: `c-${Date.now().toString(36)}`,
      sender: 'customer',
      text: randomReply,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    const next = chats.map(c =>
      c.id === activeChat.id
        ? {
            ...c,
            online: true,
            messages: [...c.messages, customerMsg],
          }
        : c,
    )
    setChats(next)
    writeChats(next)
    toast({
      title: `Nova mensagem de ${activeChat.customerName}`,
      body: randomReply,
    })
  }

  function handleRequestPayout() {
    const amount = Number(payoutAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', body: 'Informe um valor positivo para solicitar o repasse Pix.' })
      return
    }
    const newTx: FinancialTransaction = {
      id: `tx-${Date.now().toString(36)}`,
      description: `Saque Pix enviado para ${pixKey}`,
      type: 'payout',
      method: 'Repasse Pix',
      grossAmount: -amount,
      netAmount: -amount,
      status: 'Concluído',
      date: 'Agora',
    }
    const next = [newTx, ...transactions]
    setTransactions(next)
    writeTransactions(next)
    toast({
      title: 'Repasse Pix realizado',
      body: `${formatBRL(amount)} transferido instantaneamente para a chave ${pixKey}.`,
    })
  }

  function handleExportCsv() {
    const header = 'ID,Descricao,Metodo,Valor Bruto,Valor Liquido,Status,Data\n'
    const rows = transactions
      .map(t => `${t.id},"${t.description}",${t.method},${t.grossAmount},${t.netAmount},${t.status},"${t.date}"`)
      .join('\n')
    const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `faturamento-${full.settings.slug}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({ title: 'Relatório exportado', body: 'Arquivo CSV de faturamento baixado com sucesso.' })
  }

  function handleSelectPlan(code: 'FREE' | 'PRO' | 'ENTERPRISE') {
    setActivePlan(code)
    writeActivePlan(code)
    const planObj = BILLING_PLANS.find(p => p.code === code)
    toast({
      title: `Plano atualizado para ${planObj?.name}`,
      body: 'Novos limites e recursos já estão ativos na sua operação.',
    })
  }

  // Render the shared interactive Chat Widget (used both side-by-side on Overview AND in the dedicated Chat tab)
  function renderChatWorkspace(expanded = false) {
    return (
      <Panel variant="raised" className={`dashboard-chat-panel ${expanded ? 'is-expanded' : ''}`}>
        <div className="chat-panel-header">
          <div>
            <span className="eyebrow">Atendimento Integrado em Tempo Real</span>
            <h3>
              Chat Vendedor ↔ Cliente{' '}
              {totalUnread > 0 && <span className="chat-unread-badge">{totalUnread} novas</span>}
            </h3>
          </div>
          <Stack direction="row" gap={6}>
            <HardwareButton
              size="sm"
              variant="ghost"
              icon={<Sparkles size={13} />}
              onClick={simulateCustomerMessage}
            >
              Simular resposta do cliente
            </HardwareButton>
            {!expanded && (
              <HardwareButton
                size="sm"
                variant="neutral"
                icon={<ArrowUpRight size={13} />}
                onClick={() => setTab('chat')}
              >
                Expandir Chat
              </HardwareButton>
            )}
          </Stack>
        </div>

        <div className="chat-split-container">
          {/* Left: Thread List */}
          <div className="chat-threads-column">
            <div className="chat-search-box">
              <Field
                aria-label="Buscar conversa por cliente ou pedido"
                placeholder="Buscar cliente ou #SYN…"
                size="sm"
                start={<Search size={13} />}
                value={chatSearch}
                onValueChange={setChatSearch}
              />
            </div>
            <div className="chat-threads-list" role="list" aria-label="Conversas com clientes">
              {filteredChats.map(thread => {
                const lastMsg = thread.messages[thread.messages.length - 1]
                const isSelected = activeChat?.id === thread.id
                return (
                  <button
                    key={thread.id}
                    type="button"
                    className={`chat-thread-item ${isSelected ? 'is-active' : ''}`}
                    onClick={() => selectChat(thread.id)}
                  >
                    <div className="chat-thread-top">
                      <strong>
                        <span className={`online-dot ${thread.online ? 'is-online' : ''}`} />
                        {thread.customerName}
                      </strong>
                      <small>{thread.orderCode}</small>
                    </div>
                    <p className="chat-thread-preview">{lastMsg?.text || 'Conversa iniciada'}</p>
                    <div className="chat-thread-meta">
                      <span>{formatBRL(thread.orderTotal)}</span>
                      <span>{STATUS_LABEL[thread.orderStatus]}</span>
                      {thread.unread > 0 && <em className="unread-pip">{thread.unread}</em>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Active Conversation */}
          {activeChat && (
            <div className="chat-conversation-column">
              <div className="chat-active-topbar">
                <div>
                  <strong>{activeChat.customerName}</strong>
                  <small>
                    {activeChat.customerCity} · {activeChat.customerEmail} · LTV {formatBRL(activeChat.lifetimeValue)}
                  </small>
                </div>
                <div className="chat-order-context-pill">
                  <Package size={13} />
                  <span>
                    {activeChat.orderCode} · {formatBRL(activeChat.orderTotal)} ·{' '}
                    <strong>{STATUS_LABEL[activeChat.orderStatus]}</strong>
                  </span>
                </div>
              </div>

              <div className="chat-messages-stream" role="log" aria-live="polite">
                {activeChat.messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble-row chat-bubble-${msg.sender}`}>
                    <div className="chat-bubble">
                      <div className="chat-bubble-head">
                        <strong>
                          {msg.sender === 'seller'
                            ? `${full.name} (Você)`
                            : msg.sender === 'customer'
                              ? activeChat.customerName
                              : 'Sistema Syndetis'}
                        </strong>
                        <small>{msg.timestamp}</small>
                      </div>
                      <p>{msg.text}</p>
                      {msg.attachment && (
                        <div className="chat-attachment-card">
                          <Sparkles size={13} />
                          <div>
                            <strong>{msg.attachment.title}</strong>
                            <small>{msg.attachment.subtitle}</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick replies & attachments */}
              <div className="chat-quick-bar">
                {QUICK_REPLIES.map(reply => (
                  <button
                    key={reply}
                    type="button"
                    className="quick-reply-chip"
                    onClick={() => sendChatMessage(reply)}
                  >
                    {reply}
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-reply-chip is-accent"
                  onClick={() =>
                    sendChatMessage(`Atualização do seu pedido ${activeChat.orderCode}:`, {
                      type: 'order',
                      title: `${activeChat.orderCode} · ${STATUS_LABEL[activeChat.orderStatus]}`,
                      subtitle: `Total: ${formatBRL(activeChat.orderTotal)} · Garantia Syndetis`,
                    })
                  }
                >
                  + Anexar Card do Pedido
                </button>
              </div>

              <form
                className="chat-composer-bar"
                onSubmit={e => {
                  e.preventDefault()
                  sendChatMessage()
                }}
              >
                <div className="chat-composer-input">
                  <Field
                    aria-label="Digite sua mensagem para o cliente"
                    placeholder={`Responder a ${activeChat.customerName}…`}
                    value={messageInput}
                    onValueChange={setMessageInput}
                  />
                </div>
                <HardwareButton
                  variant="primary"
                  icon={<Send size={14} />}
                  onClick={() => sendChatMessage()}
                >
                  Enviar
                </HardwareButton>
              </form>
            </div>
          )}
        </div>
      </Panel>
    )
  }

  const maxChartVal = Math.max(...currentSeries.values, 1)

  return (
    <section className="shell dashboard-page">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">
            <span className="status-pip" style={{ marginRight: 6 }} />
            Operação em Tempo Real · {full.settings.slug}.syndetis.app
          </span>
          <h1>
            Dashboard · <em>{full.name}</em>
          </h1>
        </div>

        <div className="dashboard-header-controls">
          <div className="period-pills" role="group" aria-label="Período de análise">
            {(
              [
                ['hoje', 'Hoje'],
                ['7d', '7 dias'],
                ['30d', '30 dias'],
                ['12m', '12 meses'],
              ] as [PeriodFilter, string][]
            ).map(([id, label]) => (
              <HardwareButton
                key={id}
                size="sm"
                variant={period === id ? 'primary' : 'ghost'}
                onClick={() => setPeriod(id)}
              >
                {label}
              </HardwareButton>
            ))}
          </div>
          <HardwareButton size="sm" href="#/criar" icon={<Wand2 size={14} />}>
            Editar no Maker
          </HardwareButton>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="dashboard-tabs-bar" role="tablist" aria-label="Seções do Dashboard">
        <HardwareButton
          size="sm"
          variant={tab === 'vendas' ? 'primary' : 'neutral'}
          icon={<BarChart3 size={14} />}
          onClick={() => setTab('vendas')}
        >
          Visão Geral & Vendas
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={tab === 'chat' ? 'primary' : 'neutral'}
          icon={<MessageSquare size={14} />}
          onClick={() => setTab('chat')}
        >
          Chat com Clientes {totalUnread > 0 ? `(${totalUnread})` : ''}
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={tab === 'faturamento' ? 'primary' : 'neutral'}
          icon={<Wallet size={14} />}
          onClick={() => setTab('faturamento')}
        >
          Faturamento & Planos
        </HardwareButton>
        <HardwareButton
          size="sm"
          variant={tab === 'configuracoes' ? 'primary' : 'neutral'}
          icon={<Settings2 size={14} />}
          onClick={() => setTab('configuracoes')}
        >
          Configurações da Loja
        </HardwareButton>
      </div>

      {/* TAB 1: VISÃO GERAL & VENDAS + CHAT JUNTO AO DASHBOARD */}
      {tab === 'vendas' && (
        <div className="dashboard-content-stack">
          <Grid minItemWidth="14rem" gap={8}>
            <Card
              variant="screen"
              title={formatBRL(currentSeries.revenue)}
              description="Faturamento Bruto no período"
              action={<TrendingUp size={16} />}
            >
              <span className="kpi-subline">+18,4% em relação ao ciclo anterior · Pix e Cartão</span>
            </Card>
            <Card
              variant="screen"
              title={`${currentSeries.ordersCount} pedidos`}
              description="Pedidos aprovados e em processamento"
              action={<ShoppingBag size={16} />}
            >
              <span className="kpi-subline">98,2% de aprovação no checkout transparente</span>
            </Card>
            <Card
              variant="screen"
              title={formatBRL(avgTicket)}
              description="Ticket Médio por cliente"
              action={<DollarSign size={16} />}
            >
              <span className="kpi-subline">Frete grátis ativo acima de R$ {full.settings.freeShippingThreshold}</span>
            </Card>
            <Card
              variant="screen"
              title={currentSeries.conversion}
              description="Taxa de conversão da vitrine"
              action={<Sparkles size={16} />}
            >
              <span className="kpi-subline">{full.products.length} produtos ativos no catálogo</span>
            </Card>
          </Grid>

          {/* Revenue Chart + Top Products */}
          <div className="dashboard-chart-row">
            <Panel variant="screen" className="revenue-chart-panel">
              <div className="chart-panel-head">
                <div>
                  <span className="eyebrow">Curva de Receita & Liquidez</span>
                  <h3>Evolução de Vendas ({period.toUpperCase()})</h3>
                </div>
                <span className="chart-total-pill">{formatBRL(currentSeries.revenue)}</span>
              </div>

              <div className="revenue-bars-stage">
                {currentSeries.values.map((val, idx) => {
                  const pct = Math.max(14, Math.round((val / maxChartVal) * 100))
                  return (
                    <div key={currentSeries.labels[idx]} className="revenue-bar-col">
                      <span className="revenue-bar-value">{formatBRL(val)}</span>
                      <div className="revenue-bar-track">
                        <div className="revenue-bar-fill" style={{ height: `${pct}%` }} />
                      </div>
                      <small className="revenue-bar-label">{currentSeries.labels[idx]}</small>
                    </div>
                  )
                })}
              </div>
            </Panel>

            <Panel variant="screen" className="top-products-panel">
              <span className="eyebrow">Catálogo da Loja</span>
              <h3>Produtos Mais Vendidos</h3>
              <div className="top-products-list">
                {full.products.slice(0, 4).map((prod, idx) => (
                  <div key={prod.id} className="top-product-item">
                    <span className="top-rank">0{idx + 1}</span>
                    <div>
                      <strong>{prod.name}</strong>
                      <small>
                        {formatBRL(prod.price)} · Estoque: {prod.stock} un.
                      </small>
                    </div>
                    <span className="top-sales-count">{28 - idx * 5} vendas</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <HardwareButton size="sm" fullWidth href="#/criar">
                  Gerenciar produtos no Maker
                </HardwareButton>
              </div>
            </Panel>
          </div>

          {/* Orders Table + Live Seller-Customer Chat side-by-side */}
          <div className="dashboard-orders-chat-grid">
            <Panel variant="raised" className="orders-management-panel">
              <div className="orders-panel-head">
                <div>
                  <span className="eyebrow">Operação & Logística</span>
                  <h3>Pedidos Recentes ({filteredOrders.length})</h3>
                </div>
                <div className="orders-filter-bar">
                  <Field
                    aria-label="Filtrar pedidos"
                    placeholder="Buscar cliente ou pedido…"
                    size="sm"
                    start={<Search size={13} />}
                    value={orderSearch}
                    onValueChange={setOrderSearch}
                  />
                </div>
              </div>

              <div className="order-status-pills">
                {(
                  [
                    ['ALL', 'Todos'],
                    ['PAID', 'Pagos'],
                    ['PREPARING', 'Em separação'],
                    ['SHIPPED', 'Enviados'],
                    ['DELIVERED', 'Entregues'],
                  ] as [OrderStatus | 'ALL', string][]
                ).map(([st, label]) => (
                  <HardwareButton
                    key={st}
                    size="sm"
                    variant={orderStatusFilter === st ? 'primary' : 'ghost'}
                    onClick={() => setOrderStatusFilter(st)}
                  >
                    {label}
                  </HardwareButton>
                ))}
              </div>

              <div className="orders-table-list">
                {filteredOrders.map(order => {
                  const hasNext = Boolean(NEXT_STATUS[order.status])
                  return (
                    <div key={order.id} className="order-card-row">
                      <div className="order-row-main">
                        <div className="order-row-top">
                          <strong>
                            {order.code} · {order.customerName}
                          </strong>
                          <span className="order-status-tag" data-status={order.status}>
                            {STATUS_LABEL[order.status]}
                          </span>
                        </div>
                        <p className="order-items-line">{order.itemsSummary}</p>
                        <small className="order-meta-line">
                          {order.createdAt} · {order.customerCity} · {order.paymentMethod} ·{' '}
                          <strong>{formatBRL(order.total)}</strong>
                          {order.trackingCode && ` · Rastreio: ${order.trackingCode}`}
                        </small>
                      </div>
                      <div className="order-row-actions">
                        <HardwareButton
                          size="sm"
                          icon={<MessageSquare size={13} />}
                          onClick={() => openCustomerChatFromOrder(order)}
                        >
                          Chat
                        </HardwareButton>
                        {hasNext && (
                          <HardwareButton
                            size="sm"
                            variant="primary"
                            icon={<Truck size={13} />}
                            onClick={() => advanceOrderStatus(order.id)}
                          >
                            Avançar
                          </HardwareButton>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>

            {/* Chat right alongside the sales dashboard */}
            {renderChatWorkspace(false)}
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED CHAT VIEW */}
      {tab === 'chat' && <div className="dashboard-content-stack">{renderChatWorkspace(true)}</div>}

      {/* TAB 3: FATURAMENTO & PLANOS */}
      {tab === 'faturamento' && (
        <div className="dashboard-content-stack">
          <Grid minItemWidth="14rem" gap={8}>
            <Card
              variant="screen"
              title="R$ 18.450,00"
              description="Saldo disponível para saque imediato"
              action={<Wallet size={16} />}
            >
              <span className="kpi-subline">Liquidação D+0 para vendas via Pix</span>
            </Card>
            <Card
              variant="screen"
              title="R$ 9.320,00"
              description="Saldo a receber (próximos 14 dias)"
              action={<CreditCard size={16} />}
            >
              <span className="kpi-subline">Parcelamentos de cartão com antecipação ativa</span>
            </Card>
            <Card
              variant="screen"
              title="R$ 104.120,00"
              description="Faturamento Líquido Acumulado"
              action={<TrendingUp size={16} />}
            >
              <span className="kpi-subline">Já descontadas taxas de processamento (1,19% média)</span>
            </Card>
            <Card
              variant="screen"
              title={BILLING_PLANS.find(p => p.code === activePlan)?.name || 'Studio Pro'}
              description="Plano de assinatura ativo na loja"
              action={<ShieldCheck size={16} />}
            >
              <span className="kpi-subline">Integração Asaas & Gateway Syndetis ativa</span>
            </Card>
          </Grid>

          <div className="billing-split-grid">
            <Panel variant="screen" className="payout-request-panel">
              <span className="eyebrow">Transferência Instantânea</span>
              <h3>Solicitar Saque via Pix</h3>
              <p className="panel-muted-copy">
                Transfira seu saldo disponível diretamente para a conta bancária da sua empresa sem tarifa de saque.
              </p>
              <Stack gap={8}>
                <Field
                  label="Valor do saque (R$)"
                  mono
                  value={payoutAmount}
                  onValueChange={setPayoutAmount}
                />
                <Field
                  label="Chave Pix de destino (CNPJ, E-mail ou Telefone)"
                  mono
                  value={pixKey}
                  onValueChange={setPixKey}
                />
                <HardwareButton
                  variant="primary"
                  icon={<ArrowUpRight size={15} />}
                  onClick={handleRequestPayout}
                >
                  Confirmar Saque Pix Imediato
                </HardwareButton>
              </Stack>

              <div className="payment-methods-breakdown">
                <span className="control-label">Volume por Meio de Pagamento</span>
                <div className="method-bar-row">
                  <div>
                    <strong>Pix Instantâneo</strong>
                    <span>64% · R$ 69.376,00</span>
                  </div>
                  <div className="method-progress">
                    <i style={{ width: '64%' }} />
                  </div>
                </div>
                <div className="method-bar-row">
                  <div>
                    <strong>Cartão de Crédito (1x a 10x)</strong>
                    <span>31% · R$ 33.604,00</span>
                  </div>
                  <div className="method-progress">
                    <i style={{ width: '31%' }} />
                  </div>
                </div>
                <div className="method-bar-row">
                  <div>
                    <strong>Boleto Registrado</strong>
                    <span>5% · R$ 5.420,00</span>
                  </div>
                  <div className="method-progress">
                    <i style={{ width: '5%' }} />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel variant="raised" className="transactions-history-panel">
              <div className="orders-panel-head">
                <div>
                  <span className="eyebrow">Extrato Conciliado</span>
                  <h3>Movimentações e Repasses</h3>
                </div>
                <HardwareButton size="sm" icon={<Download size={14} />} onClick={handleExportCsv}>
                  Exportar CSV
                </HardwareButton>
              </div>

              <div className="transactions-list">
                {transactions.map(tx => (
                  <div key={tx.id} className="transaction-row">
                    <div>
                      <strong>{tx.description}</strong>
                      <small>
                        {tx.date} · {tx.method} · Bruto: {formatBRL(tx.grossAmount)}
                      </small>
                    </div>
                    <div className="transaction-amount-col">
                      <strong className={tx.netAmount < 0 ? 'tx-negative' : 'tx-positive'}>
                        {tx.netAmount > 0 ? `+${formatBRL(tx.netAmount)}` : formatBRL(tx.netAmount)}
                      </strong>
                      <small>{tx.status}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Subscription Plans */}
          <div className="plans-section">
            <div className="orders-panel-head" style={{ marginBottom: 18 }}>
              <div>
                <span className="eyebrow">Planos & Assinaturas Syndetis</span>
                <h3>Escale a capacidade da sua loja</h3>
              </div>
              <HardwareButton
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={13} />}
                onClick={() =>
                  toast({
                    title: 'Assinatura sincronizada',
                    body: 'Status e limites verificados junto ao serviço de faturamento.',
                  })
                }
              >
                Sincronizar assinatura
              </HardwareButton>
            </div>
            <Grid minItemWidth="16rem" gap={8}>
              {BILLING_PLANS.map(plan => {
                const isCurrent = activePlan === plan.code
                return (
                  <Card
                    key={plan.code}
                    variant={isCurrent ? 'raised' : 'screen'}
                    title={`${plan.name} · ${plan.priceMonthly === 0 ? 'Grátis' : `${formatBRL(plan.priceMonthly)}/mês`}`}
                    description={plan.description}
                    footer={
                      <HardwareButton
                        size="sm"
                        fullWidth
                        variant={isCurrent ? 'primary' : 'neutral'}
                        icon={isCurrent ? <Check size={13} /> : undefined}
                        onClick={() => handleSelectPlan(plan.code)}
                      >
                        {isCurrent ? 'Plano Atual Ativo' : `Mudar para ${plan.name}`}
                      </HardwareButton>
                    }
                  >
                    <ul className="plan-feature-list">
                      {plan.features.map(f => (
                        <li key={f}>
                          <Check size={12} /> {f}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )
              })}
            </Grid>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURAÇÕES DA OPERAÇÃO */}
      {tab === 'configuracoes' && (
        <div className="dashboard-content-stack">
          <div className="billing-split-grid">
            <Panel variant="raised" className="settings-panel-card">
              <span className="eyebrow">Identidade & Domínio</span>
              <h3>Dados Gerais da Loja</h3>
              <Stack gap={8}>
                <Field
                  label="Nome público da loja"
                  value={full.name}
                  onValueChange={v => setConfig(ensureFullConfig({ ...full, name: v }))}
                />
                <Field
                  label="Subdomínio oficial (.syndetis.app)"
                  mono
                  value={full.settings.slug}
                  onValueChange={v =>
                    setConfig(
                      ensureFullConfig({
                        ...full,
                        settings: { ...full.settings, slug: slugify(v) },
                      }),
                    )
                  }
                />
                <Field
                  label="E-mail de suporte ao cliente"
                  value={full.settings.supportEmail}
                  onValueChange={v =>
                    setConfig(
                      ensureFullConfig({
                        ...full,
                        settings: { ...full.settings, supportEmail: v },
                      }),
                    )
                  }
                />
                <Field
                  label="WhatsApp comercial"
                  value={full.settings.whatsapp}
                  onValueChange={v =>
                    setConfig(
                      ensureFullConfig({
                        ...full,
                        settings: { ...full.settings, whatsapp: v },
                      }),
                    )
                  }
                />
                <HardwareButton
                  variant="primary"
                  onClick={async () => {
                    await syncStoreLayout(full, false)
                    toast({
                      title: 'Configurações salvas',
                      body: 'Dados operacionais sincronizados com a vitrine e o Maker.',
                    })
                  }}
                >
                  Salvar configurações da loja
                </HardwareButton>
              </Stack>
            </Panel>

            <Panel variant="screen" className="settings-panel-card">
              <span className="eyebrow">Segurança & Contas Conectadas</span>
              <h3>Autenticação & OAuth2</h3>
              <p className="panel-muted-copy">
                Sessão autenticada como <strong>{session?.user.email || 'criador@syndetis.app'}</strong>.
              </p>
              <Stack gap={8}>
                <Card
                  variant="raised"
                  size="sm"
                  title="GitHub OAuth 2.0"
                  description="Login rápido e deploy contínuo de temas"
                  action={<UserCheck size={15} />}
                  footer={
                    <HardwareButton
                      size="sm"
                      onClick={() =>
                        toast({
                          title: 'Conta GitHub vinculada',
                          body: 'Integração OAuth2 GitHub verificada para sua conta.',
                        })
                      }
                    >
                      Conectado
                    </HardwareButton>
                  }
                />
                <Card
                  variant="raised"
                  size="sm"
                  title="Google Workspace OAuth 2.0"
                  description="Acesso unificado e notificações de pedidos"
                  action={<UserCheck size={15} />}
                  footer={
                    <HardwareButton
                      size="sm"
                      onClick={() =>
                        toast({
                          title: 'Conta Google vinculada',
                          body: 'Integração OAuth2 Google verificada para sua conta.',
                        })
                      }
                    >
                      Conectado
                    </HardwareButton>
                  }
                />
              </Stack>
            </Panel>
          </div>
        </div>
      )}
    </section>
  )
}
