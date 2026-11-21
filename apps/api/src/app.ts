import Fastify, { type FastifyError, type FastifyInstance, type FastifyServerOptions } from 'fastify'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import type { DatabaseProbe } from './shared/health/database-probe'
import type { ErrorReporter } from './shared/observability/error-reporter'
import { registerHealthRoute } from './shared/health/health-route'
import { registerOriginCheck } from './shared/http/origin-check'

/** Módulo de negócio: registra rotas e hooks no nível raiz do app (modules/<m>/index.ts). */
export type AppModule = { register(app: FastifyInstance): void | Promise<void> }

export type AppDeps = {
  probe: DatabaseProbe
  errorReporter: ErrorReporter
  version: string
  logger?: FastifyServerOptions['logger']
  /** Origens extras aceitas em requisições que mudam estado (além do host acessado). */
  allowedOrigins?: readonly string[]
  modules?: readonly AppModule[]
}

/**
 * Monta a aplicação HTTP a partir de portas. Não cria conexões nem lê variáveis de ambiente:
 * quem decide os adapters é server.ts (produção) ou o teste (fakes ou banco de teste). Ver ADR-0017.
 */
export async function buildApp(deps: AppDeps) {
  const app = Fastify({
    logger: deps.logger ?? false,
    genReqId: () => crypto.randomUUID(),
    // Atrás dos proxies da Vercel e do Railway: IP real (rate limit) vem do X-Forwarded-For.
    trustProxy: true,
  })

  await app.register(helmet)
  await app.register(cookie)
  // Limite só nas rotas que pedem (config.rateLimit), como cadastro e login.
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Muitas tentativas. Espere um minuto e tente de novo.',
    }),
  })
  registerOriginCheck(app, deps.allowedOrigins ?? [])

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode ?? 500
    if (status >= 500) {
      deps.errorReporter.capture(error, { requestId: request.id, route: request.routeOptions.url })
      return reply.code(500).send({ error: 'INTERNAL_ERROR', requestId: request.id })
    }
    return reply.code(status).send({ error: error.code ?? 'BAD_REQUEST', message: error.message })
  })

  registerHealthRoute(app, { probe: deps.probe, version: deps.version })

  for (const module of deps.modules ?? []) await module.register(app)

  return app
}
