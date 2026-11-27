import { defineConfig } from 'prisma/config'

// Carrega apps/api/.env quando existir (desenvolvimento local).
try {
  process.loadEnvFile()
} catch {
  // sem .env: variáveis vêm do ambiente (CI, Railway)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Seed da demo: senha das contas em SEED_DEMO_PASSWORD (nunca no código).
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
