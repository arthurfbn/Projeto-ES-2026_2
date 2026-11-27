import { fail, ok, type Result } from '../../../shared/result'
import { anyBarberSlots, saoPauloDayBounds, type AnyBarberSlots, type SlotBarber } from '../core/slots'
import type { AgendaPorts } from './ports'

export type BookingContext = {
  serviceIsActive: boolean
  /** Barbeiros que realizam o serviço (filtrados pelo `membershipId`, se veio), com ocupação. */
  barbers: (SlotBarber & { userId: string })[]
  appointmentsOnDay: Map<string, number>
}

/** Tudo o que o core precisa para os horários de um serviço num dia, numa barbearia. */
export async function loadBookingContext(
  ports: AgendaPorts,
  input: { barbershopId: string; serviceId: string; date: string; membershipId?: string },
): Promise<BookingContext | null> {
  const offer = await ports.catalog.serviceOffer(input)
  if (!offer) return null

  const offered = input.membershipId
    ? offer.barbers.filter((barber) => barber.membershipId === input.membershipId)
    : offer.barbers
  const userIds = offered.map((barber) => barber.userId)
  const day = saoPauloDayBounds(input.date)

  const [busy, names, appointmentsOnDay] = await Promise.all([
    ports.appointments.busyByBarber({ userIds, ...day }),
    ports.users.findNamesByIds(userIds),
    ports.appointments.countsOnDay({ barbershopId: input.barbershopId, ...day }),
  ])

  return {
    serviceIsActive: offer.serviceIsActive,
    barbers: offered.map((barber) => ({
      ...barber,
      name: names.get(barber.userId) ?? '',
      busy: busy.get(barber.userId) ?? [],
    })),
    appointmentsOnDay,
  }
}

/**
 * R5–R8: horários livres de um serviço num dia, para um barbeiro (`membershipId`) ou para
 * "qualquer barbeiro". Barbeiro que não realiza o serviço nesta barbearia não tem horário.
 */
export async function listSlots(
  ports: AgendaPorts,
  input: { barbershopId: string; serviceId: string; date: string; membershipId?: string },
): Promise<Result<AnyBarberSlots, 'SERVICE_NOT_FOUND'>> {
  const context = await loadBookingContext(ports, input)
  if (!context) return fail('SERVICE_NOT_FOUND')

  return ok(anyBarberSlots({ ...context, date: input.date, now: ports.clock.now() }))
}
