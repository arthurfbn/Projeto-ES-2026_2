import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import type { Db } from '../../shared/db/prisma'
import { createPrismaAppointmentRepository } from './adapters/prisma-appointment-repository'
import type { AgendaPorts, BarberNames, BookingCatalog } from './app/ports'
import { registerAppointmentRoutes } from './http/appointment-routes'
import { registerSlotRoutes } from './http/slot-routes'

/** API pública do módulo agenda (horários livres e agendamentos). */
export type { BookingCatalog, ServiceOffer } from './app/ports'

export type AgendaModuleOptions = {
  db: Db
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
  /** Do módulo barbearias: serviço, barbeiros que o realizam e disponibilidade. */
  catalog: BookingCatalog
  /** Do módulo identidade: nomes dos barbeiros. */
  users: BarberNames
}

export function createAgendaModule(options: AgendaModuleOptions) {
  const ports: AgendaPorts = {
    catalog: options.catalog,
    appointments: createPrismaAppointmentRepository(options.db),
    users: options.users,
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerSlotRoutes(app, ports, options.requireUser)
      registerAppointmentRoutes(app, ports, options.requireUser)
    },
  }
}
