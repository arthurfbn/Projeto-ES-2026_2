import type { Db } from '../../../shared/db/prisma'
import type { BarberServiceRecord, BarberServiceRepository } from '../app/ports'

const barberServiceSelect = {
  serviceId: true,
  priceCents: true,
  durationMinutes: true,
  service: { select: { name: true, isActive: true, priceCents: true, durationMinutes: true } },
} as const

type Row = {
  serviceId: string
  priceCents: number | null
  durationMinutes: number | null
  service: { name: string; isActive: boolean; priceCents: number; durationMinutes: number }
}

const toRecord = ({ service, ...own }: Row): BarberServiceRecord => ({
  ...own,
  name: service.name,
  serviceIsActive: service.isActive,
  defaultPriceCents: service.priceCents,
  defaultDurationMinutes: service.durationMinutes,
})

export function createPrismaBarberServiceRepository(db: Db): BarberServiceRepository {
  return {
    async listByMembership(barbershopId, membershipId) {
      const rows = await db.barberService.findMany({
        where: { barbershopId, membershipId },
        select: barberServiceSelect,
        orderBy: { createdAt: 'asc' },
      })
      return rows.map(toRecord)
    },

    async find(barbershopId, membershipId, serviceId) {
      const row = await db.barberService.findFirst({
        where: { barbershopId, membershipId, serviceId },
        select: barberServiceSelect,
      })
      return row ? toRecord(row) : null
    },

    async upsert({ barbershopId, membershipId, serviceId, priceCents, durationMinutes }) {
      await db.barberService.upsert({
        where: { membershipId_serviceId: { membershipId, serviceId } },
        create: { barbershopId, membershipId, serviceId, priceCents, durationMinutes },
        update: { priceCents, durationMinutes },
      })
    },

    async remove(barbershopId, membershipId, serviceId) {
      const { count } = await db.barberService.deleteMany({ where: { barbershopId, membershipId, serviceId } })
      return count > 0
    },
  }
}
