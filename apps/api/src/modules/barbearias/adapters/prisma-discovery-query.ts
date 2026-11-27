import type { Db } from '../../../shared/db/prisma'
import type { DiscoveryQuery } from '../app/ports'

/** Barbeiro agendável (CONTEXT.md): vínculo ativo e aceitando agendamentos. */
const bookableBarber = { isActive: true, acceptsAppointments: true } as const

/**
 * Descoberta (spec 003, R1–R3). A busca sem acento filtra no core sobre as barbearias agendáveis,
 * que são poucas no MVP (ADR-0010); se crescer, vira coluna normalizada com índice.
 */
export function createPrismaDiscoveryQuery(db: Db): DiscoveryQuery {
  return {
    async listBookable() {
      const bookableService = { isActive: true, barberServices: { some: { membership: bookableBarber } } }
      const rows = await db.barbershop.findMany({
        where: { services: { some: bookableService } },
        select: {
          id: true,
          name: true,
          neighborhood: true,
          city: true,
          state: true,
          services: { where: bookableService, select: { name: true } },
        },
      })
      return rows.map(({ services, ...shop }) => ({ ...shop, serviceNames: services.map((service) => service.name) }))
    },

    async pageServices(barbershopId) {
      const rows = await db.service.findMany({
        where: { barbershopId },
        select: {
          id: true,
          name: true,
          isActive: true,
          priceCents: true,
          durationMinutes: true,
          barberServices: {
            select: {
              priceCents: true,
              durationMinutes: true,
              membership: { select: { id: true, userId: true, isActive: true, acceptsAppointments: true } },
            },
          },
        },
      })
      return rows.map(({ barberServices, ...service }) => ({
        ...service,
        barbers: barberServices.map(({ membership, priceCents, durationMinutes }) => ({
          membershipId: membership.id,
          userId: membership.userId,
          isActive: membership.isActive,
          acceptsAppointments: membership.acceptsAppointments,
          ownPriceCents: priceCents,
          ownDurationMinutes: durationMinutes,
        })),
      }))
    },
  }
}
