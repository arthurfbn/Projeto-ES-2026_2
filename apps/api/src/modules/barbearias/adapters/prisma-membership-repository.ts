import type { Prisma } from '../../../generated/prisma/client'
import type { Db } from '../../../shared/db/prisma'
import type { MembershipRecord, MembershipRepository } from '../app/ports'

const membershipSelect = {
  id: true,
  userId: true,
  hiredAt: true,
  isExclusive: true,
  acceptsAppointments: true,
  isActive: true,
  allowedShifts: {
    select: { weekday: true, startMinute: true, endMinute: true },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  },
} satisfies Prisma.BarberMembershipSelect

type Row = {
  id: string
  userId: string
  hiredAt: Date
  isExclusive: boolean
  acceptsAppointments: boolean
  isActive: boolean
  allowedShifts: MembershipRecord['shift']
}

const toRecord = ({ allowedShifts, ...membership }: Row): MembershipRecord => ({ ...membership, shift: allowedShifts })

export function createPrismaMembershipRepository(db: Db): MembershipRepository {
  return {
    async listByBarbershop(barbershopId) {
      const rows = await db.barberMembership.findMany({
        where: { barbershopId },
        select: membershipSelect,
        orderBy: { hiredAt: 'asc' },
      })
      return rows.map(toRecord)
    },

    async findById(barbershopId, membershipId) {
      const row = await db.barberMembership.findFirst({
        where: { id: membershipId, barbershopId },
        select: membershipSelect,
      })
      return row ? toRecord(row) : null
    },

    async replaceShift(membershipId, windows) {
      await db.$transaction([
        db.allowedShift.deleteMany({ where: { membershipId } }),
        db.allowedShift.createMany({ data: windows.map((window) => ({ ...window, membershipId })) }),
      ])
    },

    async update(membershipId, patch) {
      await db.barberMembership.update({ where: { id: membershipId }, data: patch })
    },

    async findWithOrigin(membershipId) {
      const row = await db.barberMembership.findUnique({
        where: { id: membershipId },
        select: { ...membershipSelect, barbershopId: true, approvedByUserId: true },
      })
      if (!row) return null
      const { barbershopId, approvedByUserId, ...membership } = row
      return { ...toRecord(membership), barbershopId, approvedByUserId }
    },

    async activeElsewhere(userId, barbershopId) {
      const active = await db.barberMembership.findMany({
        where: { userId, isActive: true, barbershopId: { not: barbershopId } },
        select: { isExclusive: true },
      })
      return { any: active.length > 0, exclusive: active.some((membership) => membership.isExclusive) }
    },
  }
}
