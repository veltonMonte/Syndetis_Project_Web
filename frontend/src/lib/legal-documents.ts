import termsOfUse from '@/legal/termos-de-uso.md?raw'
import privacy from '@/legal/privacidade.md?raw'
import cookies from '@/legal/cookies.md?raw'
import subscription from '@/legal/assinatura.md?raw'
import verifiedBadge from '@/legal/selo-verificado.md?raw'
import storeTemplate from '@/legal/modelo-para-lojas.md?raw'
import type { LegalSlug } from './legal-versions'

export interface LegalDocument {
  slug: LegalSlug
  /** The short name used in the footer, the index and the tab title. */
  title: string
  /** One sentence on who it is for. */
  summary: string
  source: string
}

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  'termos-de-uso': {
    slug: 'termos-de-uso',
    title: 'Termos de Uso',
    summary: 'As regras para quem cria uma loja, um cardápio ou uma bilheteria na Syndetis.',
    source: termsOfUse,
  },
  privacidade: {
    slug: 'privacidade',
    title: 'Política de Privacidade',
    summary: 'Quais dados tratamos, por quê, com quem compartilhamos e como exercer seus direitos.',
    source: privacy,
  },
  cookies: {
    slug: 'cookies',
    title: 'Política de Cookies',
    summary: 'O que o site grava no seu navegador. Só usamos o necessário para funcionar.',
    source: cookies,
  },
  assinatura: {
    slug: 'assinatura',
    title: 'Planos, teste grátis e assinatura',
    summary: 'Preços, teste de 7 dias, cobrança, cancelamento, reembolso e direito de arrependimento.',
    source: subscription,
  },
  'selo-verificado': {
    slug: 'selo-verificado',
    title: 'Selo Verificado Syndetis',
    summary: 'O que o selo garante, o que não garante e quando ele é retirado.',
    source: verifiedBadge,
  },
  'modelo-para-lojas': {
    slug: 'modelo-para-lojas',
    title: 'Modelo de termos para lojas',
    summary: 'Um ponto de partida para os termos e a política de privacidade que sua loja mostra aos compradores.',
    source: storeTemplate,
  },
}
