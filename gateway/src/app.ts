import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { tokenVerifier, type VerifyToken } from './auth.ts';
import type { GatewayConfig } from './config.ts';
import { resolveRoute, upstreamPath, type Upstream } from './routes.ts';
import { receiveBody } from './request-body.ts';
import { routeRateLimits } from './rate-limits.ts';

export function createApp(config: GatewayConfig, verify: VerifyToken = tokenVerifier(config)) {
  const app = express();
  const publicUrl = new URL(config.publicOrigin);
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustedProxyHops);
  app.use(helmet({
    strictTransportSecurity: publicUrl.protocol === 'https:',
    contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'data:', 'https:'], upgradeInsecureRequests: publicUrl.protocol === 'https:' ? [] : null } },
  }));
  app.use((_request, response, next) => {
    response.setHeader('X-Request-Id', randomUUID());
    next();
  });
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use(routeRateLimits(config));

  const targets: Record<Upstream, string> = {
    auth: config.authUrl, core: config.coreUrl,
    integrations: config.integrationsUrl, frontend: config.frontendUrl,
  };
  const proxies = Object.fromEntries(Object.entries(targets).map(([name, target]) => [name,
    createProxyMiddleware<Request, Response>({
      target, changeOrigin: true, proxyTimeout: config.proxyTimeoutMs, timeout: config.proxyTimeoutMs,
      pathRewrite: (path, request) => upstreamPath(path, resolveRoute(request.method, request.path)!),
      on: {
        proxyReq: (proxyRequest, request, response) => {
          const signedRequestId = request.originalUrl.split('?')[0] === '/api/payments/webhooks/mercadopago' ? request.headers['x-request-id'] : undefined;
          proxyRequest.setHeader('X-Request-Id', signedRequestId ?? String(response.getHeader('X-Request-Id')));
          proxyRequest.removeHeader('Forwarded');
          proxyRequest.setHeader('X-Forwarded-For', request.ip ?? request.socket.remoteAddress ?? '');
          proxyRequest.setHeader('X-Forwarded-Host', publicUrl.host);
          proxyRequest.setHeader('X-Forwarded-Proto', publicUrl.protocol.slice(0, -1));
          proxyRequest.setHeader('X-Forwarded-Port', publicUrl.port || (publicUrl.protocol === 'https:' ? '443' : '80'));
          for (const header of ['x-user-id', 'x-user-role', 'x-authenticated-user', 'x-internal-token']) proxyRequest.removeHeader(header);
          if (Buffer.isBuffer(request.body)) {
            proxyRequest.removeHeader('Transfer-Encoding');
            proxyRequest.setHeader('Content-Length', request.body.length);
            if (request.body.length) proxyRequest.write(request.body);
          }
        },
        error: (_error, _request, response) => {
          if ('writeHead' in response && !response.headersSent) {
            response.writeHead(502, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ message: 'Serviço temporariamente indisponível.' }));
          }
        },
      },
    }),
  ])) as Record<Upstream, ReturnType<typeof createProxyMiddleware<Request, Response>>>;

  app.use(async (request, response, next) => {
    const route = resolveRoute(request.method, request.path);
    if (!route) { response.status(404).json({ message: 'Rota não encontrada.' }); return; }
    if (route.authenticated) {
      const authorization = request.headers.authorization;
      if (!authorization?.startsWith('Bearer ')) {
        response.status(401).json({ message: 'Autenticação necessária.' }); return;
      }
      try { await verify(authorization.slice(7)); }
      catch { response.status(401).json({ message: 'Sessão inválida ou expirada.' }); return; }
    }
    if (request.path.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store');
    const bodyLimit = /^\/api\/auth\//.test(request.path) ? 16 * 1024 : undefined;
    receiveBody(bodyLimit)(request, response, () => proxies[route.upstream](request, response, next));
  });
  return app;
}
