import { PASSWORD_MIN_LENGTH } from '@shavey/contracts'
import { createArgon2PasswordHasher } from '../src/modules/identidade/adapters/argon2-password-hasher'
import { createDb } from '../src/shared/db/prisma'
import { DEMO_EMAIL_DOMAIN, seedDemo } from '../src/shared/db/demo-seed'

// Seed da demo: `pnpm db:seed` (local, com apps/api/.env) ou no Railway com as variáveis do ambiente.
try {
  process.loadEnvFile()
} catch {
  // sem .env: variáveis vêm do ambiente
}

const databaseUrl = process.env.DATABASE_URL
const password = process.env.SEED_DEMO_PASSWORD
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória para a seed.')
if (!password || password.length < PASSWORD_MIN_LENGTH) {
  throw new Error(`Defina SEED_DEMO_PASSWORD (pelo menos ${PASSWORD_MIN_LENGTH} caracteres) para criar as contas da demo.`)
}

const db = createDb(databaseUrl)
try {
  const { created } = await seedDemo(db, await createArgon2PasswordHasher().hash(password))
  console.log(
    created
      ? `Seed da demo criada. Contas: <login>@${DEMO_EMAIL_DOMAIN} (ex.: joao.souza@${DEMO_EMAIL_DOMAIN}).`
      : 'Seed da demo já estava no banco; nada mudou.',
  )
} finally {
  await db.$disconnect()
}
