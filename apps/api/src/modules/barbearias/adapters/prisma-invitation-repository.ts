import type { Db } from '../../../shared/db/prisma'
import type { InvitationRepository } from '../app/ports'

const sentFields = { id: true, kind: true, isExclusive: true, status: true, expiresAt: true } as const

export function createPrismaInvitationRepository(db: Db): InvitationRepository {
  return {
    create: (invitation) => db.invitation.create({ data: invitation, select: sentFields }),

    findById: (invitationId) =>
      db.invitation.findUnique({
        where: { id: invitationId },
        select: {
          id: true,
          barbershopId: true,
          invitedByUserId: true,
          inviteeUserId: true,
          kind: true,
          isExclusive: true,
          status: true,
        },
      }),

    async listPendingForInvitee(userId) {
      const rows = await db.invitation.findMany({
        where: { inviteeUserId: userId, status: 'pending' },
        select: {
          id: true,
          barbershopId: true,
          kind: true,
          isExclusive: true,
          expiresAt: true,
          barbershop: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return rows.map(({ barbershop, ...invitation }) => ({ ...invitation, barbershopName: barbershop.name }))
    },

    accept(plan) {
      return db.$transaction(async (tx) => {
        // Só vira aceito se ainda estiver pendente: corrida entre dois aceites (ou aceite e cancelamento).
        const updated = await tx.invitation.updateMany({
          where: { id: plan.invitationId, status: 'pending' },
          data: { status: 'accepted', respondedAt: plan.acceptedAt },
        })
        if (updated.count === 0) return false

        const { grant } = plan
        if (grant.kind === 'manager') {
          await tx.barbershopManager.create({ data: { barbershopId: grant.barbershopId, userId: grant.managerUserId } })
        } else {
          const { barberUserId, ...membership } = grant.membership
          await tx.barberMembership.create({
            data: { ...membership, barbershopId: grant.barbershopId, userId: barberUserId },
          })
        }
        return true
      })
    },
  }
}
