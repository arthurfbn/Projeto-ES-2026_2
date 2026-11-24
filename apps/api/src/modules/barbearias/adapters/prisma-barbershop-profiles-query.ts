import type { ManagedBarbershop, MembershipSummary } from '@shavey/contracts'
import type { Db } from '../../../shared/db/prisma'

/**
 * O que o Início mostra de barbearias para um usuário (R5; ADR-0022): onde é gerente e seus
 * vínculos **ativos** (mesmo critério de `findRoles`). Implementa a porta `BarbershopProfilesQuery`
 * do módulo identidade, que não lê tabelas deste módulo (ADR-0003).
 */
export function createPrismaBarbershopProfilesQuery(db: Db) {
  const barbershop = { select: { id: true, name: true } } as const
  const byName = { barbershop: { name: 'asc' } } as const

  return {
    async listForUser(
      userId: string,
    ): Promise<{ managedBarbershops: ManagedBarbershop[]; memberships: MembershipSummary[] }> {
      const [managed, memberships] = await Promise.all([
        db.barbershopManager.findMany({ where: { userId }, select: { barbershop }, orderBy: byName }),
        db.barberMembership.findMany({
          where: { userId, isActive: true },
          select: { id: true, barbershop },
          orderBy: byName,
        }),
      ])
      return {
        managedBarbershops: managed.map((row) => row.barbershop),
        memberships: memberships.map((row) => ({
          id: row.id,
          barbershopId: row.barbershop.id,
          barbershopName: row.barbershop.name,
        })),
      }
    },
  }
}
