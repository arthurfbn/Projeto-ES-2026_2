import type { Db } from '../../../shared/db/prisma'
import type { ServiceRepository } from '../app/ports'

const serviceFields = { id: true, name: true, priceCents: true, durationMinutes: true, isActive: true } as const

export function createPrismaServiceRepository(db: Db): ServiceRepository {
  return {
    listByBarbershop: (barbershopId) =>
      db.service.findMany({ where: { barbershopId }, select: serviceFields, orderBy: { createdAt: 'asc' } }),

    findById: (barbershopId, serviceId) =>
      db.service.findFirst({ where: { id: serviceId, barbershopId }, select: serviceFields }),

    create: (barbershopId, service) => db.service.create({ data: { ...service, barbershopId }, select: serviceFields }),

    // O id composto com barbershopId garante que só se altera serviço desta barbearia.
    update: (barbershopId, serviceId, patch) =>
      db.service.update({ where: { id: serviceId, barbershopId }, data: patch, select: serviceFields }),
  }
}
