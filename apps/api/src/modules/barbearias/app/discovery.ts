import { fail, ok, type Result } from '../../../shared/result'
import {
  bookableServices,
  platformServices,
  searchBarbershops,
  type BookableBarbershop,
  type BookableService,
  type PlatformService,
} from '../core/discovery'
import type { BarbershopPorts, BarbershopRecord } from './ports'

/** R1, R2: barbearias agendáveis pelo texto e/ou pelo chip de serviço. */
export async function searchBookableBarbershops(
  ports: BarbershopPorts,
  filter: { q?: string; serviceKey?: string },
): Promise<BookableBarbershop[]> {
  return searchBarbershops(await ports.discovery.listBookable(), filter)
}

/** R2: chips dos serviços agendáveis da plataforma. */
export async function listPlatformServices(ports: BarbershopPorts): Promise<PlatformService[]> {
  return platformServices(await ports.discovery.listBookable())
}

export type BarbershopPage = { barbershop: BarbershopRecord; services: BookableService[] }

/** R3: endereço e serviços agendáveis, com os barbeiros e o preço e a duração de cada um. */
export async function getBarbershopPage(
  ports: BarbershopPorts,
  barbershopId: string,
): Promise<Result<BarbershopPage, 'BARBERSHOP_NOT_FOUND'>> {
  const barbershop = await ports.barbershops.findById(barbershopId)
  if (!barbershop) return fail('BARBERSHOP_NOT_FOUND')

  const services = await ports.discovery.pageServices(barbershopId)
  const names = await ports.users.findNamesByIds([
    ...new Set(services.flatMap((service) => service.barbers.map((barber) => barber.userId))),
  ])
  const withNames = services.map((service) => ({
    ...service,
    barbers: service.barbers.map(({ userId, ...barber }) => ({ ...barber, name: names.get(userId) ?? '' })),
  }))
  return ok({ barbershop, services: bookableServices(withNames) })
}
