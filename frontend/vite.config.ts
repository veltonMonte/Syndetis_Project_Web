import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const gatewayUrl = env.VITE_GATEWAY_URL || 'http://127.0.0.1:8080'
  const target = new URL(gatewayUrl)
  const loopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      proxy: Object.fromEntries(
        ['/api', '/oauth2', '/login/oauth2', '/.well-known'].map((path) => [
          path,
          {
            target: gatewayUrl,
            changeOrigin: false,
            configure(proxy) {
              proxy.on('proxyReq', (outgoing, incoming) => {
                // The local gateway advertises its own origin to Spring. Adapt only
                // same-origin browser requests between loopback development servers.
                // Cross-origin callers and remote gateways keep their original Origin.
                const origin = incoming.headers.origin
                const host = incoming.headers.host
                if (!origin || !host || !loopback(target.hostname)) return
                try {
                  const source = new URL(origin)
                  if (source.origin === `http://${host}` && loopback(source.hostname)) {
                    outgoing.setHeader('Origin', target.origin)
                  }
                } catch {
                  /* leave malformed origins for the gateway to reject */
                }
              })
            },
          },
        ]),
      ) as import('vite').ServerOptions['proxy'],
    },
  }
})
