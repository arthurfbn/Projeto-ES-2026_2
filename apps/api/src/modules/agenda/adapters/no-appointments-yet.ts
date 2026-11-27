import type { AppointmentReader } from '../app/ports'

/**
 * Enquanto a tabela de agendamentos não existe (nasce na fatia de agendar, #45): nenhum barbeiro
 * ocupado e nenhum agendamento no dia. Substituído pelo adapter do Prisma nessa fatia.
 */
export const noAppointmentsYet: AppointmentReader = {
  async busyByBarber() {
    return new Map()
  },
  async countsOnDay() {
    return new Map()
  },
}
