import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// HMR_CLIENT_PORT: set this on the server to the external proxy port (e.g. 4445)
// Leave unset for local dev — Vite auto-detects correctly.
const hmrClientPort = process.env.HMR_CLIENT_PORT
  ? Number(process.env.HMR_CLIENT_PORT)
  : undefined

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT) || 8973,
    strictPort: false,
    allowedHosts: true,
    hmr: hmrClientPort
      ? { clientPort: hmrClientPort }   // tells browser: "WebSocket → same host, port 4445"
      : true,                           // local: default behaviour
  },
})
