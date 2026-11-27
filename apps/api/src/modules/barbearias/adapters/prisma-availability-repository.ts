import type { Clock } from '../../../shared/clock'
import type { Db } from '../../../shared/db/prisma'
import { fail, ok } from '../../../shared/result'
import { saoPauloDate } from '../core/availability'
import type { AvailabilityReader, AvailabilityRecord, AvailabilityRepository } from '../app/ports'

/** Coluna DATE do Postgres <-> AAAA-MM-DD. O Prisma representa DATE como meia-noite UTC. */
export const toDbDate = (date: string) => new Date(`${date}T00:00:00Z`)
export const fromDbDate = (date: Date) => date.toISOString().slice(0, 10)

const availabilitySelect = {
  id: true,
  weekday: true,
  startMinute: true,
  endMinute: true,
  validFrom: true,
  validUntil: true,
} as const

type Row = {
  id: string
  weekday: number
  startMinute: number
  endMinute: number
  validFrom: Date
  validUntil: Date | null
}

const toRecord = ({ validFrom, validUntil, ...window }: Row): AvailabilityRecord => ({
  ...window,
  validFrom: fromDbDate(validFrom),
  validUntil: validUntil ? fromDbDate(validUntil) : null,
})

const byDayAndStart = [{ weekday: 'asc' as const }, { startMinute: 'asc' as const }, { validFrom: 'asc' as const }]

/** A constraint EXCLUDE (23P01) chega embrulhada pelo driver; o nome dela basta para reconhecer. */
const isOverlapViolation = (error: unknown) => {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : String(error)
  return text.includes('barber_availabilities_no_overlap') || text.includes('23P01')
}

export function createPrismaAvailabilityRepository(db: Db): AvailabilityRepository {
  return {
    async listByMembership(membershipId) {
      const rows = await db.barberAvailability.findMany({
        where: { membershipId },
        select: availabilitySelect,
        orderBy: byDayAndStart,
      })
      return rows.map(toRecord)
    },

    async listForBarber(userId) {
      const rows = await db.barberAvailability.findMany({ where: { userId }, select: availabilitySelect })
      return rows.map(toRecord)
    },

    async create({ validFrom, validUntil, ...availability }) {
      try {
        const row = await db.barberAvailability.create({
          data: { ...availability, validFrom: toDbDate(validFrom), validUntil: validUntil ? toDbDate(validUntil) : null },
          select: availabilitySelect,
        })
        return ok(toRecord(row))
      } catch (error) {
        if (isOverlapViolation(error)) return fail('OVERLAPPING_AVAILABILITY')
        throw error
      }
    },

    async remove(membershipId, availabilityId) {
      const { count } = await db.barberAvailability.deleteMany({ where: { id: availabilityId, membershipId } })
      return count > 0
    },
  }
}

/** R21: janelas do barbeiro nesta barbearia que ainda valem (fim da vigência hoje ou depois, ou sem fim). */
export function createPrismaAvailabilityReader(db: Db, clock: Clock): AvailabilityReader {
  return {
    async weeklyWindows({ barbershopId, userId }) {
      const today = toDbDate(saoPauloDate(clock.now()))
      return db.barberAvailability.findMany({
        where: { barbershopId, userId, OR: [{ validUntil: null }, { validUntil: { gte: today } }] },
        select: { weekday: true, startMinute: true, endMinute: true },
      })
    },
  }
}
