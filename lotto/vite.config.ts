import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // LAN(다른 기기)에서 접속할 수 있도록 0.0.0.0 에 바인딩
    host: true,
    port: 5180,
    strictPort: true,
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
