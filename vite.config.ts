import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT) || 8973,
    strictPort: false,
    allowedHosts: true   // ✅ allows ALL hosts — correct type
  },
})