import { defineConfig } from 'prisma/config'

// Carrega apps/api/.env quando existir (desenvolvimento local).
try {
  process.loadEnvFile()
} catch {
  // sem .env: variáveis vêm do ambiente (CI, Railway)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
