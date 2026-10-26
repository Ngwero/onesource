import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/admin": { target: "http://localhost:3001", changeOrigin: true, xfwd: true },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        xfwd: true,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
})
