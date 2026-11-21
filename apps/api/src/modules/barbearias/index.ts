import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createPrismaBarbershopRepository } from './adapters/prisma-barbershop-repository'
import { createPrismaMembershipRepository } from './adapters/prisma-membership-repository'
import { createPrismaServiceRepository } from './adapters/prisma-service-repository'
import type { AvailabilityReader, BarbershopPorts, FindUserNames } from './app/ports'
import { registerMembershipRoutes } from './http/membership-routes'
import { registerBarbershopRoutes } from './http/routes'
import { registerServiceRoutes } from './http/service-routes'

/** API pública do módulo barbearias (barbearia, gerência, vínculos, turno e serviços). */
export type { AvailabilityReader } from './app/ports'

export type BarbershopsModuleOptions = {
  db: Db
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
  /** Do módulo identidade: nome dos barbeiros na lista de vínculos. */
  findUserNames: FindUserNames
  /** Disponibilidade semanal (R21). Padrão: nenhuma, até a #14 ligar a do módulo agenda. */
  availability?: AvailabilityReader
}

const noAvailabilityYet: AvailabilityReader = { weeklyWindows: async () => [] }

export function createBarbershopsModule(options: BarbershopsModuleOptions) {
  const ports: BarbershopPorts = {
    barbershops: createPrismaBarbershopRepository(options.db),
    services: createPrismaServiceRepository(options.db),
    memberships: createPrismaMembershipRepository(options.db),
    availability: options.availability ?? noAvailabilityYet,
    findUserNames: options.findUserNames,
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerBarbershopRoutes(app, ports, options.requireUser)
      registerServiceRoutes(app, ports, options.requireUser)
      registerMembershipRoutes(app, ports, options.requireUser)
    },
  }
}
