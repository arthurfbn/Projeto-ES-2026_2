import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createPrismaBarbershopRepository } from './adapters/prisma-barbershop-repository'
import { createPrismaServiceRepository } from './adapters/prisma-service-repository'
import { createPrismaInvitationRepository } from './adapters/prisma-invitation-repository'
import type { BarbershopPorts, UserDirectory } from './app/ports'
import { registerInvitationRoutes } from './http/invitation-routes'
import { registerBarbershopRoutes } from './http/routes'
import { registerServiceRoutes } from './http/service-routes'

/** API pública do módulo barbearias (barbearia, gerência, vínculos, serviços e convites). */
export type { UserDirectory } from './app/ports'

export type BarbershopsModuleOptions = {
  db: Db
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
  /** Busca de usuário por e-mail, vinda do módulo identidade (convites). */
  users: UserDirectory
}

export function createBarbershopsModule(options: BarbershopsModuleOptions) {
  const ports: BarbershopPorts = {
    barbershops: createPrismaBarbershopRepository(options.db),
    services: createPrismaServiceRepository(options.db),
    invitations: createPrismaInvitationRepository(options.db),
    users: options.users,
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerBarbershopRoutes(app, ports, options.requireUser)
      registerServiceRoutes(app, ports, options.requireUser)
      registerInvitationRoutes(app, ports, options.requireUser)
    },
  }
}
