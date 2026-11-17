import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation.js';

/** A merchant's Mercado Pago account, connected through OAuth (the merchant never copies an API key). */
export interface MercadoPagoAccount {
  accessToken: string;
  refreshToken: string;
  publicKey?: string;
  userId: string;
  nickname?: string;
  liveMode: boolean;
  /** Seconds until the access token expires (Mercado Pago issues 180-day tokens). */
  expiresIn: number;
}

const AUTHORIZE_URL = 'https://auth.mercadopago.com/authorization';
const API = 'https://api.mercadopago.com';

/**
 * Mercado Pago's OAuth for platforms: the merchant authorizes the Syndetis application on Mercado Pago's own
 * page; the code that comes back is exchanged (with PKCE) for a token that charges into the merchant's account.
 */
@Injectable()
export class MercadoPagoOAuth {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get configured(): boolean {
    return !!(this.config.get('MP_CLIENT_ID', { infer: true }) && this.config.get('MP_CLIENT_SECRET', { infer: true }));
  }

  /** Where the merchant's browser comes back: the gateway sends it to the core-service, which owns the state. */
  get redirectUri(): string {
    return `${this.config.get('PUBLIC_ORIGIN', { infer: true }).replace(/\/$/, '')}/api/core/public/payments/mercadopago/callback`;
  }

  authorizationUrl(state: string, codeChallenge: string): string {
    this.requireConfigured();
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: this.config.get('MP_CLIENT_ID', { infer: true }),
      response_type: 'code',
      platform_id: 'mp',
      state,
      redirect_uri: this.redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.href;
  }

  exchange(code: string, codeVerifier: string): Promise<MercadoPagoAccount> {
    return this.token({ grant_type: 'authorization_code', code, code_verifier: codeVerifier, redirect_uri: this.redirectUri });
  }

  refresh(refreshToken: string): Promise<MercadoPagoAccount> {
    return this.token({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  private async token(grant: Record<string, string>): Promise<MercadoPagoAccount> {
    this.requireConfigured();
    const sandbox = this.config.get('MP_SANDBOX', { infer: true });
    const response = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.config.get('MP_CLIENT_ID', { infer: true }),
        client_secret: this.config.get('MP_CLIENT_SECRET', { infer: true }),
        ...grant,
        // In the sandbox Mercado Pago hands out test credentials for the merchant's account.
        ...(sandbox ? { test_token: 'true' } : {}),
      }),
    }).catch(() => undefined);
    if (!response) throw new ServiceUnavailableException('O Mercado Pago não respondeu. Tente conectar de novo.');
    // 400: the code expired, was used already or does not match the verifier. Nothing to retry silently.
    if (response.status === 400 || response.status === 401) {
      throw new BadRequestException('O Mercado Pago recusou a autorização. Conecte a conta de novo.');
    }
    if (!response.ok) throw new ServiceUnavailableException('O Mercado Pago está indisponível. Tente conectar de novo em instantes.');
    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = text(data.access_token);
    const refreshToken = text(data.refresh_token);
    const userId = typeof data.user_id === 'number' || typeof data.user_id === 'string' ? String(data.user_id) : '';
    if (!accessToken || !refreshToken || !/^\d{1,30}$/.test(userId)) {
      throw new ServiceUnavailableException('O Mercado Pago retornou uma autorização incompleta.');
    }
    return {
      accessToken,
      refreshToken,
      publicKey: text(data.public_key),
      userId,
      nickname: await this.nickname(accessToken),
      liveMode: data.live_mode === true,
      expiresIn: Number(data.expires_in) > 0 ? Number(data.expires_in) : 15_552_000,
    };
  }

  /** The account's name, so the merchant can see which Mercado Pago account is connected. */
  private async nickname(accessToken: string): Promise<string | undefined> {
    const response = await fetch(`${API}/users/me`, {
      signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }).catch(() => undefined);
    if (!response?.ok) return undefined;
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return text(data.nickname)?.slice(0, 80);
  }

  private requireConfigured(): void {
    if (!this.configured) throw new ServiceUnavailableException('A conexão com o Mercado Pago ainda não foi configurada na plataforma.');
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
