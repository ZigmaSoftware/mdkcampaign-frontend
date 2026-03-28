import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8970,
    strictPort: true,
    allowedHosts: ['makkalparvai.in'],
    hmr: {
      host: 'makkalparvai.in',
      port: 4445,        // 👈 IMPORTANT (browser port)
      clientPort: 4445,  // 👈 IMPORTANT
      protocol: 'ws',    // use 'wss' if HTTPS
    },
  },
})

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: '0.0.0.0',
//     port: Number(process.env.VITE_PORT) || 8973,
//     strictPort: false,
//     allowedHosts: true   // ✅ allows ALL hosts — correct type
//   },
// })