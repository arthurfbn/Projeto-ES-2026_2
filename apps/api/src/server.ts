import { buildApp } from './app'
import { createBarbershopsModule } from './modules/barbearias'
import { createIdentityModule } from './modules/identidade'
import { systemClock } from './shared/clock'
import { loadConfig } from './shared/config'
import { createDb } from './shared/db/prisma'
import { createPrismaDatabaseProbe } from './shared/db/prisma-database-probe'
import { createConsoleErrorReporter, type ErrorReporter } from './shared/observability/error-reporter'
import { createSentryErrorReporter } from './shared/observability/sentry-error-reporter'

// Desenvolvimento local: carrega apps/api/.env se existir; variáveis já definidas no ambiente têm prioridade.
// Feito aqui e não com a flag --env-file, que falha sob `pnpm --parallel` no Windows.
try {
  process.loadEnvFile()
} catch {
  // sem .env: variáveis vêm do ambiente (CI, Railway)
}

// Composição: único lugar que escolhe adapters concretos a partir da configuração (ADR-0017).
const config = loadConfig()
const db = createDb(config.databaseUrl)

const logger = {
  level: config.logLevel,
  // Nunca logar segredos (skill seguranca-authz).
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
}

let errorReporter: ErrorReporter = createConsoleErrorReporter((obj, msg) => console.error(msg, obj))
if (config.sentryDsn) {
  errorReporter = createSentryErrorReporter({
    dsn: config.sentryDsn,
    environment: config.env,
    release: config.version,
  })
}

const identity = createIdentityModule({ db, clock: systemClock })

const app = await buildApp({
  probe: createPrismaDatabaseProbe(db),
  errorReporter,
  version: config.version,
  logger,
  allowedOrigins: config.webOrigins,
  modules: [
    identity,
    createBarbershopsModule({
      db,
      clock: systemClock,
      requireUser: identity.requireUser,
      findUserNames: identity.findUserNames,
    }),
  ],
})

async function shutdown(signal: string) {
  app.log.info({ signal }, 'encerrando')
  await app.close()
  await db.$disconnect()
  await errorReporter.flush()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

await app.listen({ host: config.host, port: config.port })
