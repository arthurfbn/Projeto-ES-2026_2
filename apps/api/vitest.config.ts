import { defineConfig } from 'vitest/config'

// Testes de unidade: rápidos, sem banco, sem rede.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts', 'node_modules/**'],
  },
})
