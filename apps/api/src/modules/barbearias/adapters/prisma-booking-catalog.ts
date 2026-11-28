import type { Db } from '../../../shared/db/prisma'
import { effectiveTerms } from '../core/barber-service'
import { fromDbDate } from './prisma-availability-repository'

/**
 * O que a agenda precisa para os horários livres (spec 003, R5–R8): o serviço desta barbearia e
 * os barbeiros que o realizam, com preço e duração que valem para cada um (R16 da spec 001) e a
 * disponibilidade deles aqui. Implementa a porta `BookingCatalog` do módulo agenda, que não lê
 * tabelas deste módulo (ADR-0003).
 */
export function createPrismaBookingCatalog(db: Db) {
  return {
    async serviceOffer({ barbershopId, serviceId }: { barbershopId: string; serviceId: string }) {
      const service = await db.service.findFirst({
        where: { id: serviceId, barbershopId },
        select: {
          isActive: true,
          priceCents: true,
          durationMinutes: true,
          barberServices: {
            select: {
              priceCents: true,
              durationMinutes: true,
              membership: {
                select: {
                  id: true,
                  userId: true,
                  isActive: true,
                  acceptsAppointments: true,
                  availabilities: {
                    select: { weekday: true, startMinute: true, endMinute: true, validFrom: true, validUntil: true },
                  },
                },
              },
            },
          },
        },
      })
      if (!service) return null

      return {
        serviceIsActive: service.isActive,
        barbers: service.barberServices.map(({ membership, ...own }) => ({
          membershipId: membership.id,
          userId: membership.userId,
          isActive: membership.isActive,
          acceptsAppointments: membership.acceptsAppointments,
          ...effectiveTerms(service, own),
          availability: membership.availabilities.map(({ validFrom, validUntil, ...window }) => ({
            ...window,
            validFrom: fromDbDate(validFrom),
            validUntil: validUntil ? fromDbDate(validUntil) : null,
          })),
        })),
      }
    },
  }
}
