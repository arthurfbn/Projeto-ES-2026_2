import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createPrismaBarberServiceRepository } from './adapters/prisma-barber-service-repository'
import { createPrismaBarbershopRepository } from './adapters/prisma-barbershop-repository'
import { createPrismaMembershipRepository } from './adapters/prisma-membership-repository'
import { createPrismaServiceRepository } from './adapters/prisma-service-repository'
import { createPrismaInvitationRepository } from './adapters/prisma-invitation-repository'
import type { AvailabilityReader, BarbershopPorts, UserDirectory } from './app/ports'
import { registerBarberServiceRoutes } from './http/barber-service-routes'
import { registerInvitationRoutes } from './http/invitation-routes'
import { registerMembershipRoutes } from './http/membership-routes'
import { registerBarbershopRoutes } from './http/routes'
import { registerServiceRoutes } from './http/service-routes'

/** API pública do módulo barbearias (barbearia, gerência, vínculos, turno, serviços, serviços do barbeiro e convites). */
export type { AvailabilityReader, UserDirectory } from './app/ports'

export type BarbershopsModuleOptions = {
  db: Db
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
  /** Do módulo identidade: busca por e-mail (convites) e nomes por id (vínculos). */
  users: UserDirectory
  /** Disponibilidade semanal (R21). Padrão: nenhuma, até a #14 ligar a do módulo agenda. */
  availability?: AvailabilityReader
}

const noAvailabilityYet: AvailabilityReader = { weeklyWindows: async () => [] }

export function createBarbershopsModule(options: BarbershopsModuleOptions) {
  const ports: BarbershopPorts = {
    barbershops: createPrismaBarbershopRepository(options.db),
    services: createPrismaServiceRepository(options.db),
    invitations: createPrismaInvitationRepository(options.db),
    memberships: createPrismaMembershipRepository(options.db),
    barberServices: createPrismaBarberServiceRepository(options.db),
    availability: options.availability ?? noAvailabilityYet,
    users: options.users,
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerBarbershopRoutes(app, ports, options.requireUser)
      registerServiceRoutes(app, ports, options.requireUser)
      registerInvitationRoutes(app, ports, options.requireUser)
      registerMembershipRoutes(app, ports, options.requireUser)
      registerBarberServiceRoutes(app, ports, options.requireUser)
    },
  }
}
