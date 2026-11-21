import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createPrismaBarbershopRepository } from './adapters/prisma-barbershop-repository'
import { createPrismaServiceRepository } from './adapters/prisma-service-repository'
import type { BarbershopPorts } from './app/ports'
import { registerBarbershopRoutes } from './http/routes'
import { registerServiceRoutes } from './http/service-routes'

/** API pública do módulo barbearias (barbearia, gerência, vínculos e serviços). */
export type BarbershopsModuleOptions = {
  db: Db
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
}

export function createBarbershopsModule(options: BarbershopsModuleOptions) {
  const ports: BarbershopPorts = {
    barbershops: createPrismaBarbershopRepository(options.db),
    services: createPrismaServiceRepository(options.db),
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerBarbershopRoutes(app, ports, options.requireUser)
      registerServiceRoutes(app, ports, options.requireUser)
    },
  }
}
