export interface GatewayConfig {
  port: number;
  publicOrigin: string;
  authUrl: string;
  coreUrl: string;
  integrationsUrl: string;
  frontendUrl: string;
  jwksUrl: string;
  issuer: string;
  audience: string;
  proxyTimeoutMs: number;
  publicReadRateLimit: number;
  shippingRateLimit: number;
  webhookRateLimit: number;
  authRateLimit: number;
  trustedProxyHops: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const authUrl = origin(env.AUTH_SERVICE_URL ?? 'http://localhost:8081');
  return {
    port: integer(env.GATEWAY_PORT, 8080, 1, 65535),
    publicOrigin: origin(env.PUBLIC_ORIGIN ?? 'http://localhost:8080'),
    authUrl,
    coreUrl: origin(env.CORE_SERVICE_URL ?? 'http://localhost:8082'),
    integrationsUrl: origin(env.INTEGRATION_HUB_URL ?? 'http://localhost:3001'),
    frontendUrl: origin(env.FRONTEND_URL ?? 'http://localhost:5173'),
    jwksUrl: `${authUrl}/.well-known/jwks.json`,
    issuer: env.JWT_ISSUER ?? 'http://localhost:8081',
    audience: env.JWT_AUDIENCE ?? 'syndetis',
    proxyTimeoutMs: integer(env.PROXY_TIMEOUT_MS, 15000, 100, 60000),
    publicReadRateLimit: integer(env.PUBLIC_READ_RATE_LIMIT, 300, 1, 1000000),
    shippingRateLimit: integer(env.SHIPPING_RATE_LIMIT, 20, 1, 1000000),
    webhookRateLimit: integer(env.WEBHOOK_RATE_LIMIT, 600, 1, 1000000),
    authRateLimit: integer(env.AUTH_RATE_LIMIT, 30, 1, 10000),
    trustedProxyHops: integer(env.TRUSTED_PROXY_HOPS, 0, 0, 5),
  };
}

function origin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('As URLs dos serviços devem conter somente uma origem HTTP(S).');
  }
  return url.origin;
}

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Configuração numérica fora do intervalo ${min}–${max}.`);
  }
  return parsed;
}
