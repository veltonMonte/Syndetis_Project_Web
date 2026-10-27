import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { GatewayConfig } from './config.ts';

export function routeRateLimits(config: GatewayConfig): RequestHandler {
  const limiter = (limit: number, windowMs: number) => rateLimit({
    limit, windowMs, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Muitas requisições. Aguarde antes de tentar novamente.' },
  });
  const auth = limiter(config.authRateLimit, 15 * 60 * 1000);
  const publicRead = limiter(config.publicReadRateLimit, 5 * 60 * 1000);
  const shipping = limiter(config.shippingRateLimit, 60 * 1000);
  const webhook = limiter(config.webhookRateLimit, 60 * 1000);
  return (request, response, next) => {
    if (request.method === 'POST' && /^\/api\/auth\/(login|register)$/.test(request.path)) return auth(request, response, next);
    if ((request.method === 'GET' || request.method === 'HEAD') && request.path.startsWith('/api/core/public/')) return publicRead(request, response, next);
    if (request.method === 'POST' && request.path === '/api/integrations/shipping/quotes') return shipping(request, response, next);
    if (request.method === 'POST' && (/^\/api\/(payments|billing)\/webhooks\//.test(request.path) ||
        request.path.startsWith('/api/integrations/webhooks/'))) return webhook(request, response, next);
    next();
  };
}
