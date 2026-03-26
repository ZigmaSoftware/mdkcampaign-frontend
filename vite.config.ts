import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',             // accessible from other machines on the LAN
    port: Number(process.env.VITE_PORT) || 8973,
    strictPort: false,           // fall back to next free port if occupied
    allowedHosts: [
      'makkalparvai.in',
      'www.makkalparvai.in'
    ]
  },
})
