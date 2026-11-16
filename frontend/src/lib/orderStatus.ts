import type { OrderStatus } from './types'
export const statusLabels: Record<OrderStatus, string> = { PENDING: 'Aguardando pagamento', PAID: 'Pagamento confirmado', SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELED: 'Cancelado' }
