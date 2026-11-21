/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Mesmo papel do rewrite da Vercel (ADR-0015): /api/* → API, sem o prefixo.
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        // Mantém o Host do navegador: a checagem de Origin da API (ADR-0006) compara com ele.
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
