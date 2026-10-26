export type Upstream = 'auth' | 'core' | 'integrations' | 'frontend';
export interface Route { upstream: Upstream; authenticated: boolean; prefix?: string; replacement?: string }

export function resolveRoute(method: string, path: string): Route | undefined {
  if (/%2e|%2f|%5c|\\|\/\//i.test(path) || new URL(path, 'http://gateway').pathname !== path) return;
  if (method === 'POST' && /^\/api\/auth\/(login|register|refresh|logout|oauth2\/exchange)$/.test(path)) {
    return { upstream: 'auth', authenticated: false };
  }
  if (method === 'GET' && (path === '/.well-known/jwks.json' ||
      /^\/(oauth2\/authorization|login\/oauth2\/code)\/(google|github)$/.test(path))) {
    return { upstream: 'auth', authenticated: false };
  }
  if (method === 'POST' && path === '/api/payments/webhooks/mercadopago') {
    return { upstream: 'integrations', authenticated: false,
      prefix: '/api/payments/webhooks/mercadopago', replacement: '/payments/webhook' };
  }
  if (method === 'GET' && path.startsWith('/api/core/public/')) {
    return { upstream: 'core', authenticated: false, prefix: '/api/core' };
  }
  if (/^\/api\/core\/(stores|customers|orders)(\/|$)/.test(path)) {
    return { upstream: 'core', authenticated: true, prefix: '/api/core' };
  }
  if (method === 'POST' && path === '/api/integrations/shipping/quotes') {
    return { upstream: 'integrations', authenticated: true, prefix: '/api/integrations' };
  }
  if (method === 'POST' && /^\/api\/integrations\/webhooks\/[a-z0-9-]+$/.test(path)) {
    return { upstream: 'integrations', authenticated: false, prefix: '/api/integrations' };
  }
  if (/^\/(api|internal|oauth2|login|\.well-known|actuator|docs|swagger-ui|v3)(\/|$)/.test(path)) return;
  if (method === 'GET' || method === 'HEAD') return { upstream: 'frontend', authenticated: false };
}

export function upstreamPath(path: string, route: Route): string {
  if (!route.prefix) return path;
  const replacement = route.replacement ?? (route.upstream === 'core' ? '/api' : '');
  return replacement + path.slice(route.prefix.length);
}
