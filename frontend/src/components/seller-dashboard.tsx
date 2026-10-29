import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  MessageSquare,
  MoreHorizontal,
  Package,
  RefreshCw,
  RotateCcw,
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
  X,
  XCircle,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Panel } from '@/components/echo/panel'
import { Card } from '@/components/echo/card'
import { Grid, Stack } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { ensureFullConfig, formatBRL, formatDateBR, slugify, type LayoutConfig } from '@/lib/maker'
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
  type PlanCode,
} from '@/lib/api'

export type DashboardTab = 'vendas' | 'chat' | 'faturamento' | 'configuracoes'
type PeriodFilter = 'hoje' | '7d' | '30d' | '12m'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago · Aprovado',
  PREPARING: 'Em separação',
  SHIPPED: 'Enviado · Em trânsito',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PAID',
  PAID: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}

function StatusIcon({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'PAID':
    case 'DELIVERED':
      return <CheckCircle2 size={13} />
    case 'PENDING':
      return <Clock size={13} />
    case 'PREPARING':
    case 'SHIPPED':
      return <Truck size={13} />
    case 'CANCELED':
      return <XCircle size={13} />
  }
}

const QUICK_REPLIES = [
  'Olá! Seu pedido já está em separação e será despachado hoje.',
  'Segue o código de rastreio atualizado: BR984510290SY',
  'Confirmado! Prepararemos com embalagem reforçada para presente.',
  'A nota fiscal eletrônica (NF-e) já foi enviada para o seu e-mail.',
]

const CUSTOMER_SIMULATED_REPLIES = [
  'Perfeito! Muito obrigado pelo retorno rápido.',
  'Ótimo, recebi a nota fiscal no e-mail agora mesmo.',
  'Excelente atendimento, vou acompanhar o código de rastreio.',
  'Confirmado! O endereço de entrega permanece o mesmo.',
]

const CHART_SERIES: Record<
  PeriodFilter,
  { labels: string[]; values: number[]; revenue: number; ordersCount: number; conversion: string }
> = {
  hoje: {
    labels: ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'],
    values: [420, 680, 1240, 920, 1680, 2140, 1540, 1890],
    revenue: 10510,
    ordersCount: 15,
    conversion: '3,8%',
  },
  '7d': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    values: [3400, 4120, 3890, 5640, 6820, 7450, 6190],
    revenue: 37510,
    ordersCount: 54,
    conversion: '3,6%',
  },
  '30d': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Atual'],
    values: [9800, 12400, 11900, 15200, 17600, 19400, 22100],
    revenue: 108400,
    ordersCount: 156,
    conversion: '3,7%',
  },
  '12m': {
    labels: ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Atual'],
    values: [48000, 54000, 62000, 71000, 86000, 98000, 114000],
    revenue: 533000,
    ordersCount: 748,
    conversion: '3,9%',
  },
}

export function SellerDashboard({
  config,
  setConfig,
  session,
  activeTab: controlledTab,
  onTabChange,
}: {
  config: LayoutConfig
  setConfig: (config: LayoutConfig) => void
  session: AuthSession | null
  activeTab?: DashboardTab
  onTabChange?: (tab: DashboardTab) => void
}) {
  const full = ensureFullConfig(config)
  const toast = useToast()

  const [internalTab, setInternalTab] = useState<DashboardTab>('vendas')
  const tab = controlledTab ?? internalTab
  function setTab(next: DashboardTab) {
    setInternalTab(next)
    onTabChange?.(next)
  }

  const [period, setPeriod] = useState<PeriodFilter>('30d')
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false)

  // Orders & Table state
  const [orders, setOrders] = useState<DashboardOrder[]>(() => readOrders())
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [orderSortBy, setOrderSortBy] = useState<'code' | 'customer' | 'total'>('code')
  const [orderSortAsc, setOrderSortAsc] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [openOrderMenuId, setOpenOrderMenuId] = useState<string | null>(null)

  // Chat state
  const [chats, setChats] = useState<ChatThread[]>(() => readChats())
  const [activeChatId, setActiveChatId] = useState<string>(() => readChats()[0]?.id || 'chat-marina')
  const [chatSearch, setChatSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')

  // Financial & Subscription state
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => readTransactions())
  const [payoutAmount, setPayoutAmount] = useState('2500')
  const [payoutError, setPayoutError] = useState('')
  const [pixKey, setPixKey] = useState(full.settings.supportEmail || 'financeiro@syndetis.com.br')
  const [activePlan, setActivePlan] = useState<PlanCode>(() => readActivePlan())
  const [subscriptionCanceled, setSubscriptionCanceled] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [checkoutModalPlan, setCheckoutModalPlan] = useState<PlanCode | null>(null)
  const [checkoutMethod, setCheckoutMethod] = useState<'pix' | 'card' | 'boleto'>('pix')

  // Close menus and modals on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (openOrderMenuId) setOpenOrderMenuId(null)
        if (showCancelModal) setShowCancelModal(false)
        if (checkoutModalPlan) setCheckoutModalPlan(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openOrderMenuId, showCancelModal, checkoutModalPlan])

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0]
  const totalUnread = chats.reduce((acc, c) => acc + c.unread, 0)
  const currentSeries = CHART_SERIES[period]
  const avgTicket = currentSeries.ordersCount > 0 ? currentSeries.revenue / currentSeries.ordersCount : 0

  const filteredOrders = orders
    .filter(ord => {
      const matchesStatus = orderStatusFilter === 'ALL' || ord.status === orderStatusFilter
      const q = orderSearch.trim().toLowerCase()
      const matchesSearch =
        !q ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.code.toLowerCase().includes(q) ||
        ord.itemsSummary.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      const dir = orderSortAsc ? 1 : -1
      if (orderSortBy === 'code') return a.code.localeCompare(b.code) * dir
      if (orderSortBy === 'customer') return a.customerName.localeCompare(b.customerName, 'pt-BR') * dir
      return (a.total - b.total) * dir
    })

  function toggleOrderSort(col: 'code' | 'customer' | 'total') {
    if (orderSortBy === col) {
      setOrderSortAsc(v => !v)
    } else {
      setOrderSortBy(col)
      setOrderSortAsc(false)
    }
  }

  function triggerOrdersRefresh() {
    setIsRefreshingOrders(true)
    setTimeout(() => {
      setIsRefreshingOrders(false)
      toast({
        title: 'Pedidos sincronizados',
        body: `${orders.length} pedidos verificados com o serviço de pagamentos.`,
      })
    }, 650)
  }

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
    setOpenOrderMenuId(null)
    const existing = chats.find(
      c => c.orderCode === order.code || c.customerEmail.toLowerCase() === order.customerEmail.toLowerCase(),
    )
    if (existing) {
      selectChat(existing.id)
      toast({
        title: `Conversa com ${order.customerName}`,
        body: `Atendimento vinculado ao pedido ${order.code} selecionado.`,
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
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }
    const next = [created, ...chats]
    setChats(next)
    writeChats(next)
    setActiveChatId(created.id)
  }

  function advanceOrderStatus(orderId: string) {
    setOpenOrderMenuId(null)
    const target = orders.find(o => o.id === orderId)
    if (!target) return
    const nextStatus = NEXT_STATUS[target.status]
    if (!nextStatus) return

    const updatedOrders = orders.map(o =>
      o.id === orderId
        ? {
            ...o,
            status: nextStatus,
            trackingCode:
              nextStatus === 'SHIPPED' && !o.trackingCode
                ? `BR${Math.floor(100000000 + Math.random() * 900000000)}SY`
                : o.trackingCode,
          }
        : o,
    )
    setOrders(updatedOrders)
    writeOrders(updatedOrders)

    const updatedChats = chats.map(c => {
      if (c.orderCode !== target.code) return c
      const statusMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Status do pedido ${target.code} atualizado para: ${STATUS_LABEL[nextStatus]}.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
      body: `Novo status: ${STATUS_LABEL[nextStatus]}.`,
    })
  }

  function handleBulkAdvanceStatus() {
    if (selectedOrderIds.length === 0) return
    const idSet = new Set(selectedOrderIds)
    const updated = orders.map(o => {
      if (!idSet.has(o.id)) return o
      const nextSt = NEXT_STATUS[o.status]
      return nextSt ? { ...o, status: nextSt } : o
    })
    setOrders(updated)
    writeOrders(updated)
    toast({
      title: 'Pedidos atualizados em massa',
      body: `${selectedOrderIds.length} pedidos avançaram para a próxima etapa operacional.`,
    })
    setSelectedOrderIds([])
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
      setPayoutError('Informe um valor numérico positivo maior que R$ 0,00.')
      return
    }
    setPayoutError('')
    const todayStr = formatDateBR(new Date().toISOString())
    const newTx: FinancialTransaction = {
      id: `tx-${Date.now().toString(36)}`,
      description: `Repasse Pix enviado para ${pixKey}`,
      type: 'payout',
      method: 'Repasse Pix',
      grossAmount: -amount,
      netAmount: -amount,
      status: 'Concluído',
      date: `${todayStr} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    }
    const next = [newTx, ...transactions]
    setTransactions(next)
    writeTransactions(next)
    toast({
      title: 'Repasse Pix liquidado',
      body: `${formatBRL(amount)} transferido para a chave ${pixKey}.`,
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
    a.download = `conciliacao-${full.settings.slug}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({ title: 'Extrato CSV exportado', body: 'O arquivo de conciliação foi salvo no seu dispositivo.' })
  }

  function confirmPlanChange(code: PlanCode) {
    setActivePlan(code)
    writeActivePlan(code)
    setSubscriptionCanceled(false)
    setCheckoutModalPlan(null)
    const planObj = BILLING_PLANS.find(p => p.code === code)
    toast({
      title: `Assinatura atualizada para ${planObj?.name}`,
      body: `Plano ${planObj?.name} (${formatBRL(planObj?.priceMonthly || 0)}/mês) ativo na conta.`,
    })
  }

  function renderChatWorkspace(expanded = false) {
    return (
      <Panel variant="raised" className={`dashboard-chat-panel ${expanded ? 'is-expanded' : ''}`}>
        <div className="chat-panel-header">
          <div>
            <span className="eyebrow">Atendimento vinculado ao pedido</span>
            <h3>
              Chat com Clientes{' '}
              {totalUnread > 0 && <span className="chat-unread-badge tabular-nums">{totalUnread} novas</span>}
            </h3>
          </div>
          <Stack direction="row" gap={4}>
            <HardwareButton
              size="sm"
              variant="ghost"
              icon={<Sparkles size={13} />}
              onClick={simulateCustomerMessage}
            >
              Simular resposta
            </HardwareButton>
            {!expanded && (
              <HardwareButton
                size="sm"
                variant="secondary"
                icon={<ArrowUpRight size={13} />}
                onClick={() => setTab('chat')}
              >
                Tela cheia
              </HardwareButton>
            )}
          </Stack>
        </div>

        <div className="chat-split-container">
          <div className="chat-threads-column">
            <div className="chat-search-box">
              <div className="saas-table-search">
                <Search size={13} />
                <input
                  type="search"
                  placeholder="Filtrar cliente ou #SYN…"
                  value={chatSearch}
                  onChange={e => setChatSearch(e.target.value)}
                  aria-label="Buscar conversa por cliente ou código do pedido"
                />
              </div>
            </div>
            <div className="chat-threads-list" role="list" aria-label="Conversas com clientes">
              {filteredChats.length === 0 ? (
                <div className="saas-empty-state" style={{ padding: 16 }}>
                  <p>Nenhuma conversa encontrada para "{chatSearch}".</p>
                </div>
              ) : (
                filteredChats.map(thread => {
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
                        <small className="tabular-nums">{thread.orderCode}</small>
                      </div>
                      <p className="chat-thread-preview">{lastMsg?.text || 'Conversa iniciada'}</p>
                      <div className="chat-thread-meta tabular-nums">
                        <span>{formatBRL(thread.orderTotal)}</span>
                        <span>{STATUS_LABEL[thread.orderStatus]}</span>
                        {thread.unread > 0 && <em className="unread-pip">{thread.unread}</em>}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {activeChat && (
            <div className="chat-conversation-column">
              <div className="chat-active-topbar">
                <div>
                  <strong>{activeChat.customerName}</strong>
                  <small className="tabular-nums">
                    {activeChat.customerCity} · {activeChat.customerEmail} · Total acumulado:{' '}
                    {formatBRL(activeChat.lifetimeValue)}
                  </small>
                </div>
                <div className="chat-order-context-pill tabular-nums">
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
                            ? `${full.name} (Atendimento)`
                            : msg.sender === 'customer'
                              ? activeChat.customerName
                              : 'Notificação do Pedido'}
                        </strong>
                        <small className="tabular-nums">{msg.timestamp}</small>
                      </div>
                      <p>{msg.text}</p>
                      {msg.attachment && (
                        <div className="chat-attachment-card">
                          <Package size={13} />
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
                    sendChatMessage(`Resumo atualizado do pedido ${activeChat.orderCode}:`, {
                      type: 'order',
                      title: `${activeChat.orderCode} · ${STATUS_LABEL[activeChat.orderStatus]}`,
                      subtitle: `Valor: ${formatBRL(activeChat.orderTotal)}`,
                    })
                  }
                >
                  + Enviar status do pedido
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
                    aria-label="Digite sua mensagem para o comprador"
                    placeholder={`Escrever mensagem para ${activeChat.customerName}…`}
                    value={messageInput}
                    onValueChange={setMessageInput}
                  />
                </div>
                <HardwareButton
                  type="submit"
                  variant="primary"
                  icon={<Send size={14} />}
                >
                  Enviar mensagem
                </HardwareButton>
              </form>
            </div>
          )}
        </div>
      </Panel>
    )
  }

  const maxChartVal = Math.max(...currentSeries.values, 1)
  const allOrdersSelected =
    filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))

  return (
    <section className="dashboard-page">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">
            Painel Operacional · {full.settings.slug}.syndetis.app
          </span>
          <h1>Operação e Vendas — {full.name}</h1>
        </div>

        <div className="dashboard-header-controls">
          <div className="period-pills" role="group" aria-label="Período de apuração">
            {(
              [
                ['hoje', 'Hoje'],
                ['7d', '7 dias'],
                ['30d', '30 dias'],
                ['12m', '12 meses'],
              ] as [PeriodFilter, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`saas-period-btn ${period === id ? 'is-active' : ''}`}
                onClick={() => setPeriod(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <HardwareButton size="sm" variant="secondary" href="#/criar" icon={<Wand2 size={14} />}>
            Abrir Construtor (Maker)
          </HardwareButton>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="dashboard-tabs-bar" role="tablist" aria-label="Áreas do painel">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vendas'}
          className={`saas-tab-btn ${tab === 'vendas' ? 'is-active' : ''}`}
          onClick={() => setTab('vendas')}
        >
          <BarChart3 size={15} />
          <span>Pedidos e Receita ({orders.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'chat'}
          className={`saas-tab-btn ${tab === 'chat' ? 'is-active' : ''}`}
          onClick={() => setTab('chat')}
        >
          <MessageSquare size={15} />
          <span>Chat com Clientes {totalUnread > 0 ? `(${totalUnread})` : ''}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'faturamento'}
          className={`saas-tab-btn ${tab === 'faturamento' ? 'is-active' : ''}`}
          onClick={() => setTab('faturamento')}
        >
          <Wallet size={15} />
          <span>Repasses Pix e Assinatura</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'configuracoes'}
          className={`saas-tab-btn ${tab === 'configuracoes' ? 'is-active' : ''}`}
          onClick={() => setTab('configuracoes')}
        >
          <Settings2 size={15} />
          <span>Dados da Conta e OAuth</span>
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL, TABELA DE PEDIDOS E CHAT */}
      {tab === 'vendas' && (
        <div className="dashboard-content-stack">
          <Grid minItemWidth="14rem" gap={6}>
            <Card
              padding="compact"
              eyebrow="Faturamento bruto no período"
              title={formatBRL(currentSeries.revenue)}
              meta={<TrendingUp size={15} />}
            >
              <span className="kpi-subline tabular-nums">
                +14,2% vs. período anterior · Liquidação Pix e Cartão
              </span>
            </Card>
            <Card
              padding="compact"
              eyebrow="Volume de pedidos"
              title={`${currentSeries.ordersCount} pedidos`}
              meta={<ShoppingBag size={15} />}
            >
              <span className="kpi-subline tabular-nums">
                98,2% de aprovação no checkout
              </span>
            </Card>
            <Card
              padding="compact"
              eyebrow="Ticket médio"
              title={formatBRL(avgTicket)}
              meta={<DollarSign size={15} />}
            >
              <span className="kpi-subline tabular-nums">
                Frete grátis a partir de {formatBRL(full.settings.freeShippingThreshold)}
              </span>
            </Card>
            <Card
              padding="compact"
              eyebrow="Conversão da loja"
              title={currentSeries.conversion}
              meta={<CheckCircle2 size={15} />}
            >
              <span className="kpi-subline tabular-nums">
                {full.products.length} produtos ativos no catálogo
              </span>
            </Card>
          </Grid>

          {/* Revenue Chart + Top Products */}
          <div className="dashboard-chart-row">
            <Panel variant="screen" className="revenue-chart-panel">
              <div className="chart-panel-head">
                <div>
                  <span className="eyebrow">Apuração financeira</span>
                  <h3>Receita por período ({period.toUpperCase()})</h3>
                </div>
                <span className="chart-total-pill tabular-nums">{formatBRL(currentSeries.revenue)}</span>
              </div>

              <div className="revenue-bars-stage">
                {currentSeries.values.map((val, idx) => {
                  const pct = Math.max(14, Math.round((val / maxChartVal) * 100))
                  return (
                    <div key={currentSeries.labels[idx]} className="revenue-bar-col">
                      <span className="revenue-bar-value tabular-nums">{formatBRL(val)}</span>
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
              <span className="eyebrow">Giro de estoque</span>
              <h3>Itens com maior saída</h3>
              <div className="top-products-list">
                {full.products.slice(0, 4).map((prod, idx) => (
                  <div key={prod.id} className="top-product-item">
                    <span className="top-rank tabular-nums">0{idx + 1}</span>
                    <div>
                      <strong>{prod.name}</strong>
                      <small className="tabular-nums">
                        {formatBRL(prod.price)} · Saldo: {prod.stock} un.
                      </small>
                    </div>
                    <span className="top-sales-count tabular-nums">{28 - idx * 5} un.</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <HardwareButton size="sm" variant="secondary" fullWidth href="#/criar">
                  Gerenciar estoque no Maker
                </HardwareButton>
              </div>
            </Panel>
          </div>

          {/* Orders Fixed-Header Table + Live Seller-Customer Chat side-by-side */}
          <div className="dashboard-orders-chat-grid">
            <Panel variant="raised" className="orders-management-panel">
              <div className="orders-panel-head">
                <div>
                  <span className="eyebrow">Gestão de pedidos e expedição</span>
                  <h3>Pedidos ({filteredOrders.length})</h3>
                </div>
                <div className="orders-filter-bar">
                  <div className="saas-table-search">
                    <Search size={14} />
                    <input
                      type="search"
                      placeholder="Buscar cliente, item ou #SYN…"
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      aria-label="Filtrar pedidos por cliente ou código"
                    />
                  </div>
                  <HardwareButton
                    size="sm"
                    variant="ghost"
                    icon={<RefreshCw size={13} />}
                    onClick={triggerOrdersRefresh}
                  >
                    Atualizar
                  </HardwareButton>
                </div>
              </div>

              <div className="order-status-pills" role="group" aria-label="Filtrar por status do pedido">
                {(
                  [
                    ['ALL', 'Todos'],
                    ['PENDING', 'Aguardando'],
                    ['PAID', 'Pagos'],
                    ['PREPARING', 'Em separação'],
                    ['SHIPPED', 'Enviados'],
                    ['DELIVERED', 'Entregues'],
                  ] as [OrderStatus | 'ALL', string][]
                ).map(([st, label]) => (
                  <button
                    key={st}
                    type="button"
                    className={`saas-filter-chip ${orderStatusFilter === st ? 'is-active' : ''}`}
                    onClick={() => setOrderStatusFilter(st)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {selectedOrderIds.length > 0 && (
                <div className="saas-bulk-bar" role="region" aria-label="Ações em lote nos pedidos">
                  <span className="tabular-nums">
                    <strong>{selectedOrderIds.length}</strong>{' '}
                    {selectedOrderIds.length === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
                  </span>
                  <div className="saas-bulk-actions">
                    <button
                      type="button"
                      className="saas-text-button"
                      onClick={() => setSelectedOrderIds([])}
                    >
                      Limpar seleção
                    </button>
                    <HardwareButton size="sm" variant="secondary" icon={<Truck size={13} />} onClick={handleBulkAdvanceStatus}>
                      Avançar etapa logística
                    </HardwareButton>
                  </div>
                </div>
              )}

              {/* Content-shaped Skeleton when refreshing */}
              {isRefreshingOrders ? (
                <div className="saas-skeleton-table" aria-busy="true" aria-label="Carregando pedidos">
                  {[1, 2, 3, 4].map(row => (
                    <div key={row} className="saas-skeleton-row">
                      <span className="saas-skel saas-skel-chk" />
                      <span className="saas-skel saas-skel-title" />
                      <span className="saas-skel saas-skel-badge" />
                      <span className="saas-skel saas-skel-num" />
                    </div>
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="saas-empty-state">
                  <Package size={20} />
                  <strong>Nenhum pedido encontrado</strong>
                  <p>
                    Não há pedidos correspondentes ao filtro "{orderSearch || STATUS_LABEL[orderStatusFilter as OrderStatus] || orderStatusFilter}".
                  </p>
                  <HardwareButton
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setOrderSearch('')
                      setOrderStatusFilter('ALL')
                    }}
                  >
                    Limpar filtros
                  </HardwareButton>
                </div>
              ) : (
                <div className="saas-table-wrap">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os pedidos visíveis"
                            checked={allOrdersSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedOrderIds(filteredOrders.map(o => o.id))
                              } else {
                                setSelectedOrderIds([])
                              }
                            }}
                          />
                        </th>
                        <th>
                          <button type="button" className="saas-th-sort" onClick={() => toggleOrderSort('code')}>
                            Pedido / Data <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th>
                          <button type="button" className="saas-th-sort" onClick={() => toggleOrderSort('customer')}>
                            Comprador / Itens <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th>Status</th>
                        <th className="num-col">
                          <button type="button" className="saas-th-sort" onClick={() => toggleOrderSort('total')}>
                            Total <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th style={{ width: 44 }} aria-label="Ações do pedido" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(order => {
                        const hasNext = Boolean(NEXT_STATUS[order.status])
                        const isChecked = selectedOrderIds.includes(order.id)
                        const menuOpen = openOrderMenuId === order.id
                        return (
                          <tr key={order.id} className={isChecked ? 'is-selected' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Selecionar pedido ${order.code}`}
                                checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(prev => [...prev, order.id])
                                  } else {
                                    setSelectedOrderIds(prev => prev.filter(id => id !== order.id))
                                  }
                                }}
                              />
                            </td>
                            <td className="tabular-nums">
                              <strong>{order.code}</strong>
                              <small className="saas-cell-sub">{order.createdAt}</small>
                            </td>
                            <td>
                              <strong>{order.customerName}</strong>
                              <small className="saas-cell-sub">
                                {order.itemsSummary} · {order.paymentMethod}
                              </small>
                            </td>
                            <td>
                              <span className="order-status-tag" data-status={order.status}>
                                <StatusIcon status={order.status} />
                                <span>{STATUS_LABEL[order.status]}</span>
                              </span>
                            </td>
                            <td className="num-col tabular-nums">
                              <strong>{formatBRL(order.total)}</strong>
                            </td>
                            <td className="action-col">
                              <div className="saas-row-menu-anchor">
                                <button
                                  type="button"
                                  className="saas-row-dots-btn"
                                  aria-label={`Opções para o pedido ${order.code}`}
                                  aria-expanded={menuOpen}
                                  onClick={() => setOpenOrderMenuId(menuOpen ? null : order.id)}
                                >
                                  <MoreHorizontal size={15} />
                                </button>
                                {menuOpen && (
                                  <div className="saas-row-dropdown" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => openCustomerChatFromOrder(order)}
                                    >
                                      <MessageSquare size={13} /> Abrir chat com cliente
                                    </button>
                                    {hasNext && (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => advanceOrderStatus(order.id)}
                                      >
                                        <Truck size={13} /> Avançar status logístico
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="saas-table-footer tabular-nums">
                    <span>
                      Exibindo <strong>{filteredOrders.length}</strong> de <strong>{orders.length}</strong> pedidos
                    </span>
                    <span>Valores conciliados em BRL (R$)</span>
                  </div>
                </div>
              )}
            </Panel>

            {renderChatWorkspace(false)}
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED CHAT VIEW */}
      {tab === 'chat' && <div className="dashboard-content-stack">{renderChatWorkspace(true)}</div>}

      {/* TAB 3: FATURAMENTO, PIX & ASSINATURA */}
      {tab === 'faturamento' && (
        <div className="dashboard-content-stack">
          <Grid minItemWidth="14rem" gap={6}>
            <Card
              padding="compact"
              eyebrow="Saldo livre para saque"
              title="R$ 18.450,00"
              meta={<Wallet size={15} />}
            >
              <span className="kpi-subline">Liquidação D+0 para vendas via Pix</span>
            </Card>
            <Card
              padding="compact"
              eyebrow="Agenda de recebíveis (14 dias)"
              title="R$ 9.320,00"
              meta={<CreditCard size={15} />}
            >
              <span className="kpi-subline">Parcelas de cartão de crédito</span>
            </Card>
            <Card
              padding="compact"
              eyebrow="Volume líquido acumulado"
              title="R$ 104.120,00"
              meta={<TrendingUp size={15} />}
            >
              <span className="kpi-subline">Taxa média efetiva de intermediação: 1,19%</span>
            </Card>
            <Card
              padding="compact"
              eyebrow="Assinatura ativa"
              title={
                subscriptionCanceled
                  ? 'Cancelamento agendado'
                  : `${BILLING_PLANS.find(p => p.code === activePlan)?.name || 'Maker'} · ${formatBRL(BILLING_PLANS.find(p => p.code === activePlan)?.priceMonthly || 49)}/mês`
              }
              meta={<ShieldCheck size={15} />}
            >
              <span className="kpi-subline">
                {subscriptionCanceled
                  ? 'Acesso mantido até o fim do ciclo vigente (sem novas cobranças)'
                  : activePlan === 'MAKER'
                    ? 'Até 500 produtos · Edição estrutural + 30 req/dia de IA'
                    : 'Até 100 produtos · Personalização de conteúdo do template'}
              </span>
            </Card>
          </Grid>

          <div className="billing-split-grid">
            <Panel variant="screen" className="payout-request-panel">
              <span className="eyebrow">Transferência bancária</span>
              <h3>Transferir saldo via Pix</h3>
              <p className="panel-muted-copy">
                Transfira o saldo disponível diretamente para a conta bancária do CNPJ/CPF titular sem tarifa de transferência.
              </p>
              <Stack gap={6}>
                <Field
                  label="Valor da transferência (R$)"
                  mono
                  value={payoutAmount}
                  onValueChange={v => {
                    setPayoutAmount(v)
                    if (payoutError) setPayoutError('')
                  }}
                  onBlur={() => {
                    const num = Number(payoutAmount.replace(',', '.'))
                    if (!Number.isFinite(num) || num <= 0) {
                      setPayoutError('Informe um valor válido maior que R$ 0,00.')
                    }
                  }}
                  description="Disponível para saque imediato: R$ 18.450,00."
                  error={payoutError || undefined}
                />
                <Field
                  label="Chave Pix de destino (CNPJ, e-mail ou telefone)"
                  mono
                  value={pixKey}
                  onValueChange={setPixKey}
                  description="A conta de destino deve pertencer à mesma titularidade cadastrada."
                />
                <HardwareButton
                  variant="primary"
                  icon={<ArrowUpRight size={15} />}
                  onClick={handleRequestPayout}
                >
                  Transferir valor via Pix
                </HardwareButton>
              </Stack>

              <div className="payment-methods-breakdown">
                <span className="control-label">Participação por meio de pagamento</span>
                <div className="method-bar-row tabular-nums">
                  <div>
                    <strong>Pix Instantâneo</strong>
                    <span>64% · R$ 69.376,00</span>
                  </div>
                  <div className="method-progress">
                    <i style={{ width: '64%' }} />
                  </div>
                </div>
                <div className="method-bar-row tabular-nums">
                  <div>
                    <strong>Cartão de Crédito (1x a 10x)</strong>
                    <span>31% · R$ 33.604,00</span>
                  </div>
                  <div className="method-progress">
                    <i style={{ width: '31%' }} />
                  </div>
                </div>
                <div className="method-bar-row tabular-nums">
                  <div>
                    <strong>Boleto Bancário</strong>
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
                  <span className="eyebrow">Extrato financeiro conciliado</span>
                  <h3>Movimentações e Repasses</h3>
                </div>
                <HardwareButton size="sm" variant="secondary" icon={<Download size={14} />} onClick={handleExportCsv}>
                  Exportar CSV
                </HardwareButton>
              </div>

              <div className="transactions-list">
                {transactions.map(tx => (
                  <div key={tx.id} className="transaction-row tabular-nums">
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

          {/* Transparent Subscription Plans + Clear Cancellation Option */}
          <div className="plans-section">
            <div className="orders-panel-head" style={{ marginBottom: 16 }}>
              <div>
                <span className="eyebrow">Planos e assinatura mensal</span>
                <h3>Gerenciar plano da loja</h3>
              </div>
              <div className="maker-header-actions">
                {subscriptionCanceled ? (
                  <HardwareButton
                    size="sm"
                    variant="secondary"
                    icon={<RotateCcw size={13} />}
                    onClick={() => {
                      setSubscriptionCanceled(false)
                      toast({
                        title: 'Assinatura reativada',
                        body: 'Sua assinatura continuará ativa normalmente.',
                      })
                    }}
                  >
                    Reativar assinatura
                  </HardwareButton>
                ) : (
                  <button
                    type="button"
                    className="saas-danger-btn-sm"
                    onClick={() => setShowCancelModal(true)}
                  >
                    Cancelar assinatura…
                  </button>
                )}
              </div>
            </div>

            <Grid minItemWidth="18rem" gap={6}>
              {BILLING_PLANS.map(plan => {
                const isCurrent = activePlan === plan.code && !subscriptionCanceled
                const isRecommended = plan.code === 'MAKER'
                return (
                  <Card
                    key={plan.code}
                    eyebrow={isRecommended ? 'Recomendado · Edição estrutural + IA' : 'Operação essencial'}
                    title={`${plan.name} — ${formatBRL(plan.priceMonthly)}/mês`}
                    meta={isCurrent ? 'Plano atual' : 'Mensal sem fidelidade'}
                    footer={
                      <HardwareButton
                        size="sm"
                        fullWidth
                        variant={isCurrent ? 'secondary' : 'primary'}
                        icon={isCurrent ? <Check size={13} /> : undefined}
                        onClick={() => {
                          if (!isCurrent) setCheckoutModalPlan(plan.code)
                        }}
                      >
                        {isCurrent ? 'Plano ativo nesta conta' : `Alterar para ${plan.name} (${formatBRL(plan.priceMonthly)}/mês)`}
                      </HardwareButton>
                    }
                  >
                    <p style={{ margin: '0 0 12px', color: 'var(--saas-text-secondary)' }}>{plan.description}</p>
                    <ul className="plan-feature-list">
                      {plan.features.map(f => (
                        <li key={f}>
                          <Check size={13} /> <span>{f}</span>
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

      {/* TAB 4: CONFIGURAÇÕES DA CONTA */}
      {tab === 'configuracoes' && (
        <div className="dashboard-content-stack">
          <div className="billing-split-grid">
            <Panel variant="raised" className="settings-panel-card">
              <span className="eyebrow">Identificação da loja</span>
              <h3>Dados operacionais e canais de contato</h3>
              <Stack gap={6}>
                <Field
                  label="Nome público da loja"
                  value={full.name}
                  onValueChange={v => setConfig(ensureFullConfig({ ...full, name: v }))}
                />
                <Field
                  label="Subdomínio (.syndetis.app)"
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
                  label="E-mail de atendimento ao cliente"
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
                  label="WhatsApp de suporte"
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
                      title: 'Alterações salvas',
                      body: 'Dados operacionais sincronizados.',
                    })
                  }}
                >
                  Salvar alterações
                </HardwareButton>
              </Stack>
            </Panel>

            <Panel variant="screen" className="settings-panel-card">
              <span className="eyebrow">Segurança, LGPD e provedores OAuth</span>
              <h3>Credenciais conectadas</h3>
              <p className="panel-muted-copy">
                Autenticado como <strong>{session?.user.email || 'lojista@syndetis.com.br'}</strong>.
              </p>
              <Stack gap={6}>
                <Card
                  padding="compact"
                  eyebrow="Provedor OAuth 2.0"
                  title="Google Workspace"
                  meta={<UserCheck size={14} />}
                >
                  Login social verificado com token RS256.
                </Card>
                <Card
                  padding="compact"
                  eyebrow="Provedor OAuth 2.0"
                  title="GitHub"
                  meta={<UserCheck size={14} />}
                >
                  Vinculado para autenticação de desenvolvedor.
                </Card>
                <div className="saas-status-banner saas-status-banner--info">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Portabilidade e exclusão de dados (LGPD)</strong>
                    <p>
                      Você pode exportar todo o seu catálogo em JSON e o histórico de pedidos em CSV a qualquer momento, sem bloqueio contratual.
                    </p>
                  </div>
                </div>
              </Stack>
            </Panel>
          </div>
        </div>
      )}

      {/* Checkout Modal for Changing Plan (Shows Pix, Card, Boleto, Total Price & Cancellation Policy before confirming) */}
      {checkoutModalPlan && (
        <div
          className="saas-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
          onClick={() => setCheckoutModalPlan(null)}
        >
          <div className="saas-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const targetPlan = BILLING_PLANS.find(p => p.code === checkoutModalPlan) || BILLING_PLANS[1]
              return (
                <>
                  <div className="saas-modal-header">
                    <div>
                      <h3 id="checkout-modal-title">Confirmar alteração para o plano {targetPlan.name}</h3>
                      <p>Revise o valor total e a política de cancelamento antes de confirmar.</p>
                    </div>
                    <button
                      type="button"
                      className="saas-modal-close"
                      aria-label="Fechar janela (Esc)"
                      onClick={() => setCheckoutModalPlan(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="saas-modal-body">
                    <div className="saas-checkout-methods" role="radiogroup" aria-label="Forma de pagamento">
                      {(
                        [
                          ['pix', 'Pix (aprovação imediata)'],
                          ['card', 'Cartão de Crédito'],
                          ['boleto', 'Boleto Registrado'],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className={`saas-method-option ${checkoutMethod === id ? 'is-selected' : ''}`}
                          onClick={() => setCheckoutMethod(id)}
                        >
                          <Check size={13} /> {label}
                        </button>
                      ))}
                    </div>

                    <div className="saas-checkout-summary tabular-nums">
                      <div>
                        <span>Assinatura mensal — Plano {targetPlan.name}</span>
                        <strong>{formatBRL(targetPlan.priceMonthly)}/mês</strong>
                      </div>
                      <div>
                        <span>Taxas adicionais de ativação</span>
                        <strong>R$ 0,00</strong>
                      </div>
                      <div className="is-total">
                        <span>Total a pagar hoje</span>
                        <strong>{formatBRL(targetPlan.priceMonthly)}</strong>
                      </div>
                    </div>

                    <p className="saas-modal-sub">
                      Renovação mensal automática. Você pode cancelar a assinatura a qualquer momento em{' '}
                      <strong>Repasses Pix e Assinatura → Cancelar assinatura</strong>, sem multa ou fidelidade.
                    </p>
                  </div>

                  <div className="saas-modal-footer">
                    <HardwareButton size="sm" variant="secondary" onClick={() => setCheckoutModalPlan(null)}>
                      Voltar (Esc)
                    </HardwareButton>
                    <HardwareButton
                      size="sm"
                      variant="primary"
                      icon={<Check size={14} />}
                      onClick={() => confirmPlanChange(targetPlan.code)}
                    >
                      Confirmar assinatura ({formatBRL(targetPlan.priceMonthly)})
                    </HardwareButton>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Cancel Subscription Confirmation Modal (Closes on Esc, names the plan, red destructive button) */}
      {showCancelModal && (
        <div
          className="saas-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-sub-title"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="saas-modal" onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <div className="saas-modal-danger-icon">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 id="cancel-sub-title">
                  Cancelar assinatura do plano {BILLING_PLANS.find(p => p.code === activePlan)?.name}
                </h3>
                <p>Sem multa contratual. Seus dados e catálogo permanecem disponíveis para exportação.</p>
              </div>
              <button
                type="button"
                className="saas-modal-close"
                aria-label="Fechar janela (Esc)"
                onClick={() => setShowCancelModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="saas-modal-body">
              <p>
                Ao confirmar o cancelamento do plano{' '}
                <strong>{BILLING_PLANS.find(p => p.code === activePlan)?.name}</strong>, nenhuma nova cobrança será realizada nos próximos ciclos.
              </p>
              <p className="saas-modal-sub">
                Sua loja permanecerá acessível até o fim do período já pago e você poderá reativar a assinatura em 1 clique.
              </p>
            </div>

            <div className="saas-modal-footer">
              <HardwareButton size="sm" variant="secondary" onClick={() => setShowCancelModal(false)}>
                Manter assinatura (Esc)
              </HardwareButton>
              <button
                type="button"
                className="saas-btn-danger"
                onClick={() => {
                  setSubscriptionCanceled(true)
                  setShowCancelModal(false)
                  toast({
                    title: 'Assinatura cancelada',
                    body: 'Nenhuma cobrança futura será lançada. Você pode reativar quando quiser.',
                  })
                }}
              >
                Confirmar cancelamento da assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
