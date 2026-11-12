/**
 * Cloudflare Worker for the Syndetis web app.
 *
 * Static files (the React SPA in ./dist) are served by Workers Static Assets. Paths that belong
 * to the platform API are forwarded to the AWS gateway, so the browser keeps a single origin:
 * cookies, OAuth redirects and the app's relative `/api` calls work exactly as behind Caddy.
 *
 * The origin only accepts requests carrying EDGE_SECRET (see gateway/Caddyfile.cloudflare),
 * so nobody can reach the EC2 directly and spoof the client IP used by the rate limits.
 */

export interface Env {
  /** HTTPS origin of the AWS edge, e.g. https://3-90-12-34.sslip.io */
  API_ORIGIN: string
  /** Shared with the AWS edge; set with `wrangler secret put EDGE_SECRET`. */
  EDGE_SECRET: string
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

/** Same prefixes the gateway owns; everything else is the SPA. */
export const PROXIED_PATH = /^\/(api|oauth2|login\/oauth2|\.well-known)(\/|$)/

export const EDGE_SECRET_HEADER = 'X-Syndetis-Edge'
export const CLIENT_IP_HEADER = 'X-Syndetis-Client-IP'

export function isProxied(pathname: string): boolean {
  return PROXIED_PATH.test(pathname)
}

export function toOriginRequest(request: Request, env: Pick<Env, 'API_ORIGIN' | 'EDGE_SECRET'>): Request {
  if (!env.API_ORIGIN || !env.EDGE_SECRET) throw new Error('API_ORIGIN e EDGE_SECRET precisam estar configurados.')
  const origin = new URL(env.API_ORIGIN)
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search) {
    throw new Error('API_ORIGIN deve ser somente uma origem HTTPS.')
  }
  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, origin)
  const headers = new Headers(request.headers)
  // Never trust these from the client: the edge sets them.
  headers.set(EDGE_SECRET_HEADER, env.EDGE_SECRET)
  headers.set(CLIENT_IP_HEADER, request.headers.get('CF-Connecting-IP') ?? '')
  headers.delete('Host')
  const hasBody = !['GET', 'HEAD'].includes(request.method)
  return new Request(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // OAuth and payment returns are redirects the browser must follow itself.
    redirect: 'manual',
    // Required by the Fetch spec when streaming a request body.
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (!isProxied(pathname)) return env.ASSETS.fetch(request)
    try {
      return await fetch(toOriginRequest(request, env))
    } catch {
      return Response.json(
        { message: 'O serviço está indisponível no momento. Tente novamente em instantes.' },
        { status: 502 },
      )
    }
  },
}
