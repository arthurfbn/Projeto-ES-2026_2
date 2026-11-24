import type { Db } from '../../../shared/db/prisma'
import type { InvitationRepository } from '../app/ports'

const sentFields = { id: true, kind: true, isExclusive: true, status: true, expiresAt: true } as const

/** Pendente e ainda válido em `now` (R12). */
const openAt = (now: Date) => ({ status: 'pending' as const, expiresAt: { gt: now } })

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
          expiresAt: true,
        },
      }),

    async findInviteeSituation(barbershopId, userId, now) {
      const [managers, membership, pending] = await Promise.all([
        db.barbershopManager.count({ where: { barbershopId, userId } }),
        db.barberMembership.findUnique({
          where: { barbershopId_userId: { barbershopId, userId } },
          select: { isActive: true },
        }),
        db.invitation.findMany({
          where: { barbershopId, inviteeUserId: userId, ...openAt(now) },
          select: { kind: true },
        }),
      ])
      return {
        isManager: managers > 0,
        membership: membership ? (membership.isActive ? 'active' : 'inactive') : null,
        pendingKinds: pending.map((invitation) => invitation.kind),
      }
    },

    async listPendingForInvitee(userId, now) {
      const rows = await db.invitation.findMany({
        where: { inviteeUserId: userId, ...openAt(now) },
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

    listPendingForBarbershop: (barbershopId, now) =>
      db.invitation.findMany({
        where: { barbershopId, ...openAt(now) },
        select: { id: true, inviteeUserId: true, kind: true, isExclusive: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),

    async activeMembershipsElsewhere(userId, barbershopId) {
      const rows = await db.barberMembership.findMany({
        where: { userId, isActive: true, barbershopId: { not: barbershopId } },
        select: { id: true, barbershopId: true, isExclusive: true, barbershop: { select: { name: true } } },
        orderBy: { barbershop: { name: 'asc' } },
      })
      return rows.map(({ barbershop, ...membership }) => ({ ...membership, barbershopName: barbershop.name }))
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
          return true
        }

        const { barberUserId, ...membership } = grant.membership
        // R14c: sai das outras barbearias (só vínculos do próprio barbeiro). As disponibilidades
        // desses vínculos são encerradas na #14, quando a disponibilidade existir.
        if (plan.deactivateMembershipIds.length > 0) {
          await tx.barberMembership.updateMany({
            where: { id: { in: plan.deactivateMembershipIds }, userId: barberUserId },
            data: { isActive: false },
          })
        }
        await tx.barberMembership.create({
          data: { ...membership, barbershopId: grant.barbershopId, userId: barberUserId },
        })
        return true
      })
    },

    async close(closing) {
      const updated = await db.invitation.updateMany({
        where: { id: closing.invitationId, status: 'pending' },
        data: { status: closing.status, respondedAt: closing.respondedAt },
      })
      return updated.count > 0
    },

    async markExpired(invitationId) {
      await db.invitation.updateMany({ where: { id: invitationId, status: 'pending' }, data: { status: 'expired' } })
    },
  }
}
