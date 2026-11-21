import type { BarbershopProfile } from '@shavey/contracts'
import type { Db } from '../../../shared/db/prisma'

/**
 * Perfis do usuário por barbearia (R5): gerência e vínculo de barbeiro **ativo**, com o mesmo
 * critério de `findRoles`. Implementa a porta `BarbershopProfilesQuery` do módulo identidade.
 */
export function createPrismaBarbershopProfilesQuery(db: Db) {
  return {
    async listForUser(userId: string): Promise<BarbershopProfile[]> {
      const shop = { select: { id: true, name: true } } as const
      const [managed, memberships] = await Promise.all([
        db.barbershopManager.findMany({ where: { userId }, select: { barbershop: shop } }),
        db.barberMembership.findMany({ where: { userId, isActive: true }, select: { barbershop: shop } }),
      ])

      const profiles = new Map<string, BarbershopProfile>()
      const profileOf = ({ id, name }: { id: string; name: string }) => {
        let profile = profiles.get(id)
        if (!profile) {
          profile = { barbershopId: id, barbershopName: name, manager: false, barber: false }
          profiles.set(id, profile)
        }
        return profile
      }
      for (const { barbershop } of managed) profileOf(barbershop).manager = true
      for (const { barbershop } of memberships) profileOf(barbershop).barber = true

      return [...profiles.values()].sort((a, b) => a.barbershopName.localeCompare(b.barbershopName, 'pt-BR'))
    },
  }
}
