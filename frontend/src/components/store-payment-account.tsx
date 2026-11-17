import { useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { Card } from '@/components/echo/card'
import { ConfirmButton } from '@/components/echo/confirm-button'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Stack } from '@/components/echo/layout'
import { Skeleton } from '@/components/echo/skeleton'
import { useToast } from '@/components/echo/toast'
import { core } from '@/lib/api'
import { useAction, useResource } from '@/lib/hooks'
import type { Store } from '@/lib/types'

interface PaymentAccount {
  available: boolean
  connected: boolean
  nickname?: string | null
  liveMode?: boolean | null
  connectedAt?: string | null
}

const OUTCOMES: Record<string, { title: string; body: string }> = {
  conectado: { title: 'Mercado Pago conectado', body: 'Os pagamentos da loja agora caem direto na sua conta do Mercado Pago.' },
  cancelado: { title: 'Conexão cancelada', body: 'Nada foi alterado. Conecte quando quiser.' },
  erro: { title: 'Não foi possível conectar o Mercado Pago', body: 'A autorização expirou ou foi recusada. Tente conectar de novo.' },
}

/** What came back from Mercado Pago's authorization page (#/dashboard?mercadopago=conectado|cancelado|erro). */
export function mercadoPagoOutcome(): string | null {
  const value = new URLSearchParams(location.hash.split('?')[1]).get('mercadopago')
  return value && value in OUTCOMES ? value : null
}

/**
 * The store's Mercado Pago account. The merchant connects it with Mercado Pago's own sign-in (OAuth): no API key
 * to find or copy, and payments go straight to the merchant.
 */
export function StorePaymentAccount({ store }: { store: Store }) {
  const toast = useToast()
  const account = useResource<PaymentAccount>(`/stores/${store.id}/payments/mercadopago`)
  const action = useAction()

  useEffect(() => {
    const outcome = mercadoPagoOutcome()
    if (!outcome) return
    toast(OUTCOMES[outcome])
    history.replaceState(null, '', location.pathname + location.search + '#/dashboard')
  }, [toast])

  function connect() {
    return action.run(async () => {
      const { authorizationUrl } = await core<{ authorizationUrl: string }>(`/stores/${store.id}/payments/mercadopago/authorize`, { method: 'POST' })
      if (!authorizationUrl.startsWith('https://auth.mercadopago.com/')) throw new Error('Endereço de autorização inesperado.')
      window.location.assign(authorizationUrl)
    })
  }

  function disconnect() {
    return action.run(async () => {
      await core(`/stores/${store.id}/payments/mercadopago`, { method: 'DELETE' })
      toast({ title: 'Mercado Pago desconectado', body: 'Conecte uma conta de novo para voltar a receber pela loja.' })
      account.reload()
    })
  }

  const data = account.data
  return (
    <Card
      headingLevel={2}
      variant="screen"
      title={<span className="store-plan-name"><Wallet size={20} aria-hidden="true" />Recebimentos</span>}
      description={data?.connected ? 'Mercado Pago conectado' : 'Receba os pagamentos da loja na sua conta do Mercado Pago'}
    >
      {account.loading ? (
        <Skeleton lines={2} label="Carregando a conta de recebimento" />
      ) : account.error ? (
        <Stack gap={6}>
          <p role="alert">{account.error}</p>
          <HardwareButton onClick={account.reload}>Tentar de novo</HardwareButton>
        </Stack>
      ) : data?.connected ? (
        <Stack gap={8}>
          <dl className="store-facts">
            <div><dt>Conta</dt><dd>{data.nickname || 'Conta do Mercado Pago'}</dd></div>
            <div><dt>Ambiente</dt><dd>{data.liveMode ? 'Produção' : 'Testes do Mercado Pago'}</dd></div>
            {data.connectedAt && <div><dt>Conectada em</dt><dd>{new Date(data.connectedAt).toLocaleDateString('pt-BR')}</dd></div>}
          </dl>
          {action.error && <p role="alert">{action.error}</p>}
          <div>
            <ConfirmButton onConfirm={() => void disconnect()} confirmLabel="Desconectar" cancelLabel="Manter">
              Desconectar Mercado Pago
            </ConfirmButton>
          </div>
        </Stack>
      ) : (
        <Stack gap={8}>
          <p>
            Você entra na sua conta do Mercado Pago e autoriza a Syndetis a criar cobranças em seu nome. Não é preciso copiar
            chaves de API, e o dinheiro de cada venda cai direto na sua conta.
          </p>
          {!data?.available && <p role="status">A conexão com o Mercado Pago ainda não foi ativada nesta plataforma.</p>}
          {action.error && <p role="alert">{action.error}</p>}
          <div>
            <HardwareButton variant="primary" loading={action.busy} disabled={!data?.available} onClick={() => void connect()}>
              Conectar Mercado Pago
            </HardwareButton>
          </div>
        </Stack>
      )}
    </Card>
  )
}
