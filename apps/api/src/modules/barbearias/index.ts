import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createPrismaBarbershopRepository } from './adapters/prisma-barbershop-repository'
import type { BarbershopPorts } from './app/ports'
import { registerBarbershopRoutes } from './http/routes'

/**
 * Perfis de um usuário por barbearia, para o /me do módulo identidade (R5). Criado à parte do
 * módulo porque a identidade nasce antes dele (o módulo barbearias usa o `requireUser` dela).
 */
export { createPrismaBarbershopProfilesQuery as createBarbershopProfilesQuery } from './adapters/prisma-barbershop-profiles-query'

/** API pública do módulo barbearias (barbearia, gerência e vínculos). */
export type BarbershopsModuleOptions = {
  db: Db
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
}

export function createBarbershopsModule(options: BarbershopsModuleOptions) {
  const ports: BarbershopPorts = {
    barbershops: createPrismaBarbershopRepository(options.db),
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerBarbershopRoutes(app, ports, options.requireUser)
    },
  }
}
