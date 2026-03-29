import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Permite conexão externa
    strictPort: true, // Evita mudança automática de porta
    hmr: {
      port: 5173,
      host: 'localhost'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
