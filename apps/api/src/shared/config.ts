import { z } from 'zod'

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.url(),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
  // Origens extras aceitas em POST/PUT/DELETE, separadas por vírgula (ex.: domínio de produção da Vercel).
  WEB_ORIGINS: z.string().default(''),
  // Railway injeta o commit do deploy; localmente fica "dev".
  RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
})

export type Config = {
  env: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: string
  databaseUrl: string
  sentryDsn: string | undefined
  webOrigins: string[]
  version: string
}

/** Valida as variáveis de ambiente na inicialização: falha cedo se faltar algo. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Configuração inválida: ${problems}`)
  }
  const env = parsed.data
  return {
    env: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    sentryDsn: env.SENTRY_DSN,
    webOrigins: env.WEB_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    version: env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
  }
}
