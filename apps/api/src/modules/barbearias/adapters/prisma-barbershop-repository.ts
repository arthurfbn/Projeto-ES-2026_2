import type { Db } from '../../../shared/db/prisma'
import type { BarbershopRepository } from '../app/ports'

const barbershopFields = {
  id: true,
  name: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
} as const

export function createPrismaBarbershopRepository(db: Db): BarbershopRepository {
  return {
    async hasActiveExclusiveMembership(userId) {
      const count = await db.barberMembership.count({ where: { userId, isActive: true, isExclusive: true } })
      return count > 0
    },

    create(barbershop, plan) {
      return db.$transaction(async (tx) => {
        const created = await tx.barbershop.create({ data: barbershop, select: barbershopFields })
        await tx.barbershopManager.create({ data: { barbershopId: created.id, userId: plan.managerUserId } })
        if (plan.membership) {
          const { barberUserId, ...membership } = plan.membership
          await tx.barberMembership.create({
            data: { ...membership, barbershopId: created.id, userId: barberUserId },
          })
        }
        return created
      })
    },

    findById: (barbershopId) => db.barbershop.findUnique({ where: { id: barbershopId }, select: barbershopFields }),

    async findRoles(barbershopId, userId) {
      const [managers, memberships] = await Promise.all([
        db.barbershopManager.count({ where: { barbershopId, userId } }),
        db.barberMembership.count({ where: { barbershopId, userId, isActive: true } }),
      ])
      return { manager: managers > 0, barber: memberships > 0 }
    },
  }
}
