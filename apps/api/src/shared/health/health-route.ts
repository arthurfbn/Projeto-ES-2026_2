import type { FastifyInstance } from 'fastify'
import type { HealthResponse } from '@shavey/contracts'
import type { DatabaseProbe } from './database-probe'

/**
 * GET /health — usado pelo healthcheck do Railway e pela tela de status da web.
 * 200 quando o banco responde; 503 quando não.
 */
export function registerHealthRoute(
  app: FastifyInstance,
  deps: { probe: DatabaseProbe; version: string },
): void {
  app.get('/health', async (_request, reply) => {
    const databaseUp = await deps.probe.isUp()
    const body: HealthResponse = {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'up' : 'down',
      version: deps.version,
    }
    return reply.code(databaseUp ? 200 : 503).send(body)
  })
}
