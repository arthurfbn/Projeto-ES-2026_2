import type { Db } from '../../../shared/db/prisma'
import { fail, ok } from '../../../shared/result'
import type { AppointmentReader, AppointmentRepository } from '../app/ports'
import { ACTIVE_STATUSES, COUNTED_STATUSES } from '../core/booking'
import type { BusyInterval } from '../core/slots'

/** A constraint EXCLUDE (23P01) chega embrulhada pelo driver; o nome dela basta para reconhecer. */
const isOverlapViolation = (error: unknown) => {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : String(error)
  return text.includes('appointments_no_overlap') || text.includes('23P01')
}

/** Agendamentos (R5, R8, R9–R11): leitura para os horários livres e criação. */
export function createPrismaAppointmentRepository(db: Db): AppointmentReader & AppointmentRepository {
  return {
    async busyByBarber({ userIds, from, to }) {
      const rows = await db.appointment.findMany({
        where: {
          barberUserId: { in: userIds },
          status: { in: [...ACTIVE_STATUSES] },
          startsAt: { lt: to },
          endsAt: { gt: from },
        },
        select: { barberUserId: true, startsAt: true, endsAt: true },
      })
      const busy = new Map<string, BusyInterval[]>()
      for (const { barberUserId, startsAt, endsAt } of rows) {
        busy.set(barberUserId, [...(busy.get(barberUserId) ?? []), { startsAt, endsAt }])
      }
      return busy
    },

    async countsOnDay({ barbershopId, from, to }) {
      const rows = await db.appointment.groupBy({
        by: ['membershipId'],
        where: { barbershopId, status: { in: [...COUNTED_STATUSES] }, startsAt: { gte: from, lt: to } },
        _count: { _all: true },
      })
      return new Map(rows.map((row) => [row.membershipId, row._count._all]))
    },

    async create(appointment) {
      try {
        const { id } = await db.appointment.create({ data: appointment, select: { id: true } })
        return ok({ ...appointment, id })
      } catch (error) {
        if (isOverlapViolation(error)) return fail('SLOT_NOT_AVAILABLE')
        throw error
      }
    },
  }
}
