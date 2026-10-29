import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const gatewayUrl = env.VITE_GATEWAY_URL || 'http://127.0.0.1:8080'
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      proxy: Object.fromEntries(['/api', '/oauth2', '/login/oauth2', '/.well-known'].map((path) =>
        [path, { target: gatewayUrl, changeOrigin: false }])),
    },
  }
})
