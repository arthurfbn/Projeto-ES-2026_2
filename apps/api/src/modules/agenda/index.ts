import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify'
import type { Clock } from '../../shared/clock'
import { noAppointmentsYet } from './adapters/no-appointments-yet'
import type { AgendaPorts, AppointmentReader, BarberNames, BookingCatalog } from './app/ports'
import { registerSlotRoutes } from './http/slot-routes'

/** API pública do módulo agenda (horários livres; agendamentos entram na #45). */
export type { BookingCatalog, ServiceOffer } from './app/ports'

export type AgendaModuleOptions = {
  clock: Clock
  /** preHandler do módulo identidade: garante `request.user`. */
  requireUser: preHandlerAsyncHookHandler
  /** Do módulo barbearias: serviço, barbeiros que o realizam e disponibilidade. */
  catalog: BookingCatalog
  /** Do módulo identidade: nomes dos barbeiros. */
  users: BarberNames
  /** Padrão: nenhum agendamento (a tabela nasce na #45); testes podem trocar. */
  appointments?: AppointmentReader
}

export function createAgendaModule(options: AgendaModuleOptions) {
  const ports: AgendaPorts = {
    catalog: options.catalog,
    appointments: options.appointments ?? noAppointmentsYet,
    users: options.users,
    clock: options.clock,
  }

  return {
    register(app: FastifyInstance) {
      registerSlotRoutes(app, ports, options.requireUser)
    },
  }
}
