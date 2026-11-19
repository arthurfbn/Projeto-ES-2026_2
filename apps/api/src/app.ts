import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify'
import helmet from '@fastify/helmet'
import type { DatabaseProbe } from './shared/health/database-probe'
import type { ErrorReporter } from './shared/observability/error-reporter'
import { registerHealthRoute } from './shared/health/health-route'

export type AppDeps = {
  probe: DatabaseProbe
  errorReporter: ErrorReporter
  version: string
  logger?: FastifyServerOptions['logger']
}

/**
 * Monta a aplicação HTTP a partir de portas. Não cria conexões nem lê variáveis de ambiente:
 * quem decide os adapters é server.ts (produção) ou o teste (fakes). Ver ADR-0017.
 */
export async function buildApp(deps: AppDeps) {
  const app = Fastify({
    logger: deps.logger ?? false,
    genReqId: () => crypto.randomUUID(),
  })

  await app.register(helmet)

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode ?? 500
    if (status >= 500) {
      deps.errorReporter.capture(error, { requestId: request.id, route: request.routeOptions.url })
      return reply.code(500).send({ error: 'INTERNAL_ERROR', requestId: request.id })
    }
    return reply.code(status).send({ error: error.code ?? 'BAD_REQUEST', message: error.message })
  })

  registerHealthRoute(app, { probe: deps.probe, version: deps.version })

  // Módulos de negócio entram aqui, cada um pela sua função de registro (modules/<m>/index.ts).

  return app
}
