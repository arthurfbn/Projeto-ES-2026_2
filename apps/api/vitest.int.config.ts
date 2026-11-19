import { defineConfig } from 'vitest/config'

// Testes de integração: Postgres real (docker compose local ou service no CI).
// Precisam de DATABASE_URL apontando para um banco descartável.
// Localmente vem do apps/api/.env; no CI, do ambiente (que tem prioridade sobre o arquivo).
try {
  process.loadEnvFile()
} catch {
  // sem .env: variáveis vêm do ambiente
}

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
})
