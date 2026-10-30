import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Package,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  User,
  Wand2,
} from 'lucide-react'
import { AppearanceSettings } from '@/components/appearance-settings'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Card } from '@/components/echo/card'
import { Panel } from '@/components/echo/panel'
import { Grid, Stack } from '@/components/echo/layout'
import { Select } from '@/components/echo/select'
import { Skeleton } from '@/components/echo/skeleton'
import { Table } from '@/components/echo/table'
import { Pagination } from '@/components/echo/pagination'
import { useToast } from '@/components/echo/toast'
import { core, json, money, type AuthSession } from '@/lib/api'
import { useAction, useResource } from '@/lib/hooks'
import type { Order, OrderStatus, Page, Store } from '@/lib/types'
import './store-dashboard.css'

interface Entitlements {
  planId: string
  enforced: boolean
  paid: boolean
  capabilities: { structuralEditing: boolean; ai: boolean }
  products: {
    limit: number
    used: number
    remaining: number
    overLimit: boolean
  }
  ai: {
    limit: number
    used: number
    remaining: number
    resetsAt: string
    timezone: string
  }
  layoutAdaptationRequired: boolean
  canRepublish: boolean
}
interface Subscription {
  enabled: boolean
  sandbox: boolean
  planId: string | null
  monthlyPrice: number | null
  status: string
  canPublish: boolean
  paidUntil: string | null
  cancelled: boolean
  payments: { id: string; status: string; amount: number; dueDate: string }[]
}
const STATUS: Record<OrderStatus, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
}
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}
const ACTION: Partial<Record<OrderStatus, string>> = {
  PAID: 'Marcar como enviado',
  SHIPPED: 'Marcar como entregue',
}
const date = (value: string | null, withTime = false) => {
  if (!value) return 'Não informado'
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.getTime())
    ? 'Não informado'
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        ...(withTime ? { timeStyle: 'short' as const } : {}),
      }).format(parsed)
}
const planName = (id: string | null) =>
  id === 'STANDARD' ? 'Standard' : id === 'MAKER' ? 'Maker' : 'Sem plano contratado'
const subscriptionStatus = (status: string) =>
  ({
    ACTIVE: 'Ativa',
    PREPARING: 'Preparando assinatura',
    PENDING: 'Aguardando pagamento',
    OVERDUE: 'Pagamento em atraso',
    CANCELLED: 'Cancelada',
    CANCELED: 'Cancelada',
    NONE: 'Sem assinatura',
    DISABLED: 'Cobrança desativada',
    EXPIRED: 'Expirada',
  })[status] || 'Verificação pendente'

function Feedback({
  title,
  children,
  retry,
}: {
  title: string
  children: ReactNode
  retry?: () => void
}) {
  return (
    <Panel variant="screen" className="store-panel">
      <Stack gap={8}>
        <h2 className="store-section-title">{title}</h2>
        <div className="store-feedback-message" role={retry ? 'alert' : undefined}>
          {children}
        </div>
        {retry && (
          <div>
            <HardwareButton onClick={retry} icon={<RefreshCw size={16} />}>
              Tentar novamente
            </HardwareButton>
          </div>
        )}
      </Stack>
    </Panel>
  )
}

export function StoreDashboard({ session }: { session: AuthSession }) {
  return (
    <section className="shell dashboard-page store-dashboard">
      {session.user.role === 'SELLER' || session.user.role === 'ADMIN' ? (
        <OwnedStores session={session} />
      ) : (
        <>
          <div className="dashboard-header">
            <div>
              <span className="eyebrow">Sua conta</span>
              <h1>Bem-vindo, {session.user.firstName}.</h1>
            </div>
          </div>
          <Feedback title="Gestão de loja ainda não habilitada">
            Sua conta está cadastrada como cliente. O acesso para criar e gerenciar lojas precisa
            ser habilitado no serviço de contas.
          </Feedback>
          <Account session={session} />
        </>
      )}
    </section>
  )
}

function OwnedStores({ session }: { session: AuthSession }) {
  const stores = useResource<Store[]>('/stores/me', session.user.id)
  const [selectedId, selectStore] = useState('')
  const selected = stores.data?.find((store) => store.id === selectedId) || stores.data?.[0]
  return (
    <Stack gap={10}>
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Seu negócio, em movimento</span>
          <h1>Painel da loja</h1>
          <p>Olá, {session.user.firstName}. Acompanhe os próximos passos da sua loja.</p>
        </div>
        {selected && (
          <div className="store-selector">
            <label id="store-selector-label">Loja em gerenciamento</label>
            <Select
              aria-labelledby="store-selector-label"
              value={selected.id}
              onValueChange={selectStore}
              options={stores.data!.map((store) => ({
                value: store.id,
                label: store.name,
              }))}
            />
          </div>
        )}
      </div>
      {stores.loading ? (
        <Skeleton lines={4} label="Carregando suas lojas" />
      ) : stores.error ? (
        <Feedback title="Não foi possível carregar suas lojas" retry={stores.reload}>
          {stores.error}
        </Feedback>
      ) : !selected ? (
        <Feedback title="Sua primeira loja começa aqui">
          Você ainda não tem lojas cadastradas. Abra o Maker e salve sua loja para começar a
          gerenciar os pedidos.
          <span className="store-empty-action">
            <HardwareButton href="#/criar" variant="primary" icon={<Wand2 size={16} />}>
              Criar minha loja
            </HardwareButton>
          </span>
        </Feedback>
      ) : (
        <StoreWorkspace key={selected.id} store={selected} session={session} />
      )}
    </Stack>
  )
}

function StoreWorkspace({ store, session }: { store: Store; session: AuthSession }) {
  const [tab, setTab] = useState<'orders' | 'plan' | 'account'>('orders')
  return (
    <Stack gap={10}>
      <div className="store-identity">
        <ShoppingBag size={18} aria-hidden="true" />
        <strong>{store.name}</strong>
        <span>{store.status === 'ACTIVE' ? 'Loja ativa' : 'Loja inativa'}</span>
      </div>
      <Stack as="nav" direction="row" gap={6} aria-label="Áreas do painel">
        <HardwareButton
          aria-pressed={tab === 'orders'}
          held={tab === 'orders'}
          icon={<Package size={16} />}
          onClick={() => setTab('orders')}
        >
          Pedidos
        </HardwareButton>
        <HardwareButton
          aria-pressed={tab === 'plan'}
          held={tab === 'plan'}
          icon={<SlidersHorizontal size={16} />}
          onClick={() => setTab('plan')}
        >
          Plano e limites
        </HardwareButton>
        <HardwareButton
          aria-pressed={tab === 'account'}
          held={tab === 'account'}
          icon={<User size={16} />}
          onClick={() => setTab('account')}
        >
          Minha conta
        </HardwareButton>
      </Stack>
      {tab === 'orders' ? (
        <Orders store={store} />
      ) : tab === 'plan' ? (
        <Plan store={store} />
      ) : (
        <Account session={session} />
      )}
    </Stack>
  )
}

function Orders({ store }: { store: Store }) {
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selectedId, selectOrder] = useState<string | null>(null)
  const focusBack = useRef<HTMLButtonElement | null>(null)
  const details = useRef<HTMLDivElement>(null)
  const query = `?page=${page - 1}&size=10${filter === 'ALL' ? '' : `&status=${filter}`}`
  const orders = useResource<Page<Order>>(`/stores/${encodeURIComponent(store.id)}/orders${query}`)
  const selected =
    !orders.loading && !orders.error
      ? orders.data?.content.find((order) => order.id === selectedId)
      : undefined
  const detailId = selected?.id
  useEffect(() => {
    if (detailId) details.current?.focus({ preventScroll: true })
  }, [detailId])
  const closeDetails = () => selectOrder(null)
  return (
    <Stack gap={10}>
      <Panel variant="screen" className="store-panel">
        <div className="orders-panel-head">
          <div>
            <h2 className="store-section-title">Pedidos da loja</h2>
            <p>
              {orders.loading
                ? 'Consultando pedidos…'
                : orders.data
                  ? `${orders.data.totalElements} pedido(s) ${filter === 'ALL' ? 'no total' : 'com este status'}`
                  : 'Acompanhe pagamentos e entregas.'}
            </p>
          </div>
          <HardwareButton
            onClick={() => {
              closeDetails()
              orders.reload()
            }}
            disabled={orders.loading}
            icon={<RefreshCw size={16} />}
          >
            Atualizar pedidos
          </HardwareButton>
        </div>
        <div className="store-filter">
          <label id="order-status-label">Status do pedido</label>
          <Select
            aria-labelledby="order-status-label"
            value={filter}
            options={[
              { value: 'ALL', label: 'Todos os status' },
              ...Object.entries(STATUS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onValueChange={(value) => {
              setFilter(value)
              setPage(1)
              closeDetails()
            }}
          />
        </div>
        {orders.loading ? (
          <Skeleton lines={5} label="Carregando pedidos" />
        ) : orders.error ? (
          <div className="store-feedback">
            <p role="alert">{orders.error}</p>
            <HardwareButton onClick={orders.reload}>Tentar novamente</HardwareButton>
          </div>
        ) : !orders.data?.content.length ? (
          <div className="store-feedback">
            <h3>{filter === 'ALL' ? 'Ainda não há pedidos' : 'Nenhum pedido com este status'}</h3>
            <p>
              {filter === 'ALL'
                ? 'Os pedidos recebidos pela sua loja vão aparecer aqui.'
                : 'Escolha outro status para consultar os demais pedidos.'}
            </p>
            {filter !== 'ALL' && (
              <HardwareButton
                onClick={() => {
                  setFilter('ALL')
                  setPage(1)
                }}
              >
                Ver todos os pedidos
              </HardwareButton>
            )}
          </div>
        ) : (
          <Stack gap={8}>
            <Table caption={`Pedidos de ${store.name}`}>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>Pedido</Table.HeaderCell>
                  <Table.HeaderCell>Data</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell align="end">Total</Table.HeaderCell>
                  <Table.HeaderCell>Detalhes</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {orders.data.content.map((order) => (
                  <Table.Row key={order.id}>
                    <Table.HeaderCell scope="row">
                      <span title={order.id}>#{order.id.slice(0, 8)}</span>
                    </Table.HeaderCell>
                    <Table.Cell>{date(order.createdAt, true)}</Table.Cell>
                    <Table.Cell>
                      {STATUS[order.status]}
                      {order.paymentReviewRequired && (
                        <small className="store-review">Pagamento em revisão</small>
                      )}
                    </Table.Cell>
                    <Table.Cell numeric>{money(order.total)}</Table.Cell>
                    <Table.Cell>
                      <HardwareButton
                        size="sm"
                        aria-label={`Ver pedido ${order.id.slice(0, 8)}`}
                        onClick={(event) => {
                          focusBack.current = event.currentTarget
                          selectOrder(order.id)
                        }}
                      >
                        Ver pedido
                      </HardwareButton>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            {orders.data.totalPages > 1 && (
              <Pagination
                label="Páginas de pedidos"
                previousLabel="Página anterior"
                nextLabel="Próxima página"
                page={page}
                count={orders.data.totalPages}
                onPageChange={(next) => {
                  setPage(next)
                  closeDetails()
                }}
              />
            )}
          </Stack>
        )}
      </Panel>
      {selected && (
        <div
          ref={details}
          tabIndex={-1}
          className="store-order-detail"
          role="region"
          aria-label={`Detalhes do pedido ${selected.id.slice(0, 8)}`}
        >
          <OrderDetails
            key={`${selected.id}-${selected.status}`}
            order={selected}
            store={store}
            onUpdated={() => {
              closeDetails()
              orders.reload()
            }}
            onClose={() => {
              closeDetails()
              focusBack.current?.focus()
            }}
          />
        </div>
      )}
    </Stack>
  )
}

function OrderDetails({
  order,
  store,
  onUpdated,
  onClose,
}: {
  order: Order
  store: Store
  onUpdated: () => void
  onClose: () => void
}) {
  const action = useAction()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const next = NEXT[order.status]
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  async function update() {
    if (!next) return
    await action.run(async () => {
      await core<Order>(
        `/stores/${encodeURIComponent(store.id)}/orders/${encodeURIComponent(order.id)}/status`,
        { method: 'PATCH', body: json({ status: next }) },
      )
      if (!alive.current) return
      toast({
        title: 'Pedido atualizado',
        body: `${store.name}: pedido ${order.id.slice(0, 8)} ${next === 'SHIPPED' ? 'enviado' : 'entregue'}.`,
      })
      onUpdated()
    })
  }
  return (
    <Card
      headingLevel={2}
      variant="screen"
      title={`Pedido #${order.id.slice(0, 8)}`}
      description={`${STATUS[order.status]} · ${date(order.createdAt, true)}`}
      action={
        <HardwareButton size="sm" onClick={onClose} disabled={action.busy}>
          Fechar detalhes
        </HardwareButton>
      }
    >
      <Stack gap={9}>
        <Table caption="Itens do pedido">
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>Produto</Table.HeaderCell>
              <Table.HeaderCell align="end">Quantidade</Table.HeaderCell>
              <Table.HeaderCell align="end">Unitário</Table.HeaderCell>
              <Table.HeaderCell align="end">Subtotal</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {order.items.map((item) => (
              <Table.Row key={item.productId}>
                <Table.HeaderCell scope="row">{item.productName}</Table.HeaderCell>
                <Table.Cell numeric>{item.quantity}</Table.Cell>
                <Table.Cell numeric>{money(item.unitPrice)}</Table.Cell>
                <Table.Cell numeric>{money(item.lineTotal)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <Grid minItemWidth="15rem" gap={9}>
          <div>
            <h3 className="store-subtitle">Entrega</h3>
            <p className="store-wrap">
              {order.deliveryAddress || 'Endereço não informado neste pedido.'}
            </p>
            {order.deliveryInstructions && <p>{order.deliveryInstructions}</p>}
          </div>
          <dl className="store-facts">
            <div>
              <dt>Produtos</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Frete</dt>
              <dd>{money(order.shipping)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </Grid>
        {order.paymentReviewRequired && (
          <p role="status">
            Este pagamento precisa de revisão. Confira a situação antes de preparar a entrega.
          </p>
        )}
        {order.status === 'PENDING' && (
          <p>
            O pagamento ainda não foi confirmado. A confirmação é recebida pelo serviço de
            pagamentos.
          </p>
        )}
        {action.error && <p role="alert">{action.error}</p>}
        {next &&
          !order.paymentReviewRequired &&
          (confirm ? (
            <Stack gap={8}>
              <p>
                Confirmar que este pedido foi {next === 'SHIPPED' ? 'enviado' : 'entregue'}? Esta
                alteração será salva na loja.
              </p>
              <Stack direction="row" gap={6}>
                <HardwareButton variant="primary" loading={action.busy} onClick={update}>
                  Confirmar {next === 'SHIPPED' ? 'envio' : 'entrega'}
                </HardwareButton>
                <HardwareButton disabled={action.busy} onClick={() => setConfirm(false)}>
                  Voltar
                </HardwareButton>
              </Stack>
            </Stack>
          ) : (
            <div>
              <HardwareButton
                variant="primary"
                icon={<Truck size={16} />}
                onClick={() => setConfirm(true)}
              >
                {ACTION[order.status]}
              </HardwareButton>
            </div>
          ))}
      </Stack>
    </Card>
  )
}

function Plan({ store }: { store: Store }) {
  const entitlements = useResource<Entitlements>(
    `/stores/${encodeURIComponent(store.id)}/entitlements`,
  )
  const subscription = useResource<Subscription>(
    `/stores/${encodeURIComponent(store.id)}/subscription`,
  )
  const limits = entitlements.data
  const billing = subscription.data
  return (
    <Stack gap={10}>
      <div>
        <h2 className="store-section-title">Plano e limites</h2>
        <p>Os limites abaixo são os retornados pelo serviço da sua loja.</p>
      </div>
      {entitlements.loading ? (
        <Skeleton lines={4} label="Carregando limites do plano" />
      ) : entitlements.error ? (
        <Feedback title="Não foi possível consultar os limites" retry={entitlements.reload}>
          {entitlements.error}
        </Feedback>
      ) : (
        limits && (
          <>
            {!limits.enforced && (
              <p role="status">
                As regras de assinatura estão desativadas neste ambiente de testes.
              </p>
            )}
            <Grid minItemWidth="15rem" gap={8}>
              <Card variant="screen" title="Produtos" description="Uso do catálogo">
                <p className="store-readout">
                  {limits.products.used}{' '}
                  <small>
                    {limits.enforced ? `de ${limits.products.limit}` : 'produtos cadastrados'}
                  </small>
                </p>
                <p>
                  {limits.products.overLimit
                    ? 'Acima do limite: adeque o catálogo antes de adicionar produtos.'
                    : limits.enforced
                      ? `${limits.products.remaining} espaço(s) disponível(is).`
                      : 'Contagem atual de produtos cadastrados.'}
                </p>
              </Card>
              <Card variant="screen" title="Personalização" description={planName(limits.planId)}>
                <p>
                  {limits.capabilities.structuralEditing
                    ? 'Pode mover, remover e configurar componentes.'
                    : 'Personalize textos, fontes, cores, logo e imagens dentro dos templates.'}
                </p>
                {limits.layoutAdaptationRequired && (
                  <p>Seu layout precisa ser adequado ao plano antes de republicar.</p>
                )}
              </Card>
              <Card
                variant="screen"
                title="Uso de IA"
                description={
                  limits.capabilities.ai ? 'Franquia diária' : 'Indisponível neste plano'
                }
              >
                {limits.capabilities.ai ? (
                  <>
                    <p className="store-readout">
                      {limits.ai.remaining} <small>de {limits.ai.limit} restantes</small>
                    </p>
                    <p>
                      {limits.ai.used} solicitação(ões) utilizada(s). Renovação:{' '}
                      {date(limits.ai.resetsAt, true)} (horário de Brasília).
                    </p>
                    <p>A disponibilidade da geração depende da integração de IA.</p>
                  </>
                ) : (
                  <p>Seu plano não inclui solicitações de IA.</p>
                )}
              </Card>
            </Grid>
          </>
        )
      )}
      {subscription.loading ? (
        <Skeleton lines={3} label="Carregando assinatura" />
      ) : subscription.error ? (
        <Feedback title="Não foi possível consultar a assinatura" retry={subscription.reload}>
          {subscription.error}
        </Feedback>
      ) : (
        billing && (
          <Card
            headingLevel={2}
            variant="screen"
            title="Assinatura"
            description={
              billing.enabled
                ? subscriptionStatus(billing.status)
                : 'Cobrança desativada neste ambiente'
            }
          >
            <Stack gap={8}>
              {billing.sandbox && <p>Ambiente de testes do provedor de pagamentos.</p>}
              {billing.enabled && (
                <dl className="store-facts">
                  <div>
                    <dt>Plano</dt>
                    <dd>{planName(billing.planId)}</dd>
                  </div>
                  <div>
                    <dt>Mensalidade</dt>
                    <dd>
                      {billing.monthlyPrice != null
                        ? money(billing.monthlyPrice)
                        : 'Não contratada'}
                    </dd>
                  </div>
                  <div>
                    <dt>Acesso pago até</dt>
                    <dd>{date(billing.paidUntil)}</dd>
                  </div>
                  <div>
                    <dt>Publicação</dt>
                    <dd>
                      {billing.canPublish
                        ? 'Permitida pela assinatura'
                        : 'Pendente de adequação ou pagamento'}
                    </dd>
                  </div>
                </dl>
              )}
              {billing.payments.length > 0 && (
                <Table caption="Cobranças da assinatura">
                  <Table.Head>
                    <Table.Row>
                      <Table.HeaderCell>Vencimento</Table.HeaderCell>
                      <Table.HeaderCell>Situação</Table.HeaderCell>
                      <Table.HeaderCell align="end">Valor</Table.HeaderCell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {billing.payments.map((payment) => (
                      <Table.Row key={payment.id}>
                        <Table.Cell>{date(payment.dueDate)}</Table.Cell>
                        <Table.Cell>
                          {{
                            CONFIRMED: 'Confirmado',
                            RECEIVED: 'Recebido',
                            PENDING: 'Pendente',
                            OVERDUE: 'Em atraso',
                            REFUNDED: 'Estornado',
                          }[payment.status] || 'Em processamento'}
                        </Table.Cell>
                        <Table.Cell numeric>{money(payment.amount)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </Stack>
          </Card>
        )
      )}
    </Stack>
  )
}

function Account({ session }: { session: AuthSession }) {
  return (
    <Stack gap={10}>
      <Card
        headingLevel={2}
        variant="screen"
        title="Minha conta"
        description="Identidade usada nesta sessão"
      >
        <dl className="store-facts">
          <div>
            <dt>Nome</dt>
            <dd>{session.user.firstName}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd className="store-wrap">{session.user.email}</dd>
          </div>
          <div>
            <dt>Acesso</dt>
            <dd>
              {session.user.role === 'ADMIN'
                ? 'Administrador'
                : session.user.role === 'SELLER'
                  ? 'Lojista'
                  : 'Cliente'}
            </dd>
          </div>
        </dl>
        <p>Para sair deste dispositivo, use “Encerrar sessão” no menu superior.</p>
      </Card>
      <AppearanceSettings />
    </Stack>
  )
}
