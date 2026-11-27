import { fail, ok, type Result } from '../../../shared/result'
import { anyBarberSlots, saoPauloDayBounds, type AnyBarberSlots, type SlotBarber } from '../core/slots'
import type { AgendaPorts } from './ports'

/**
 * R5–R8: horários livres de um serviço num dia, para um barbeiro (`membershipId`) ou para
 * "qualquer barbeiro". Barbeiro que não realiza o serviço nesta barbearia não tem horário.
 */
export async function listSlots(
  ports: AgendaPorts,
  input: { barbershopId: string; serviceId: string; date: string; membershipId?: string },
): Promise<Result<AnyBarberSlots, 'SERVICE_NOT_FOUND'>> {
  const offer = await ports.catalog.serviceOffer(input)
  if (!offer) return fail('SERVICE_NOT_FOUND')

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

  const barbers: SlotBarber[] = offered.map(({ userId, ...barber }) => ({
    ...barber,
    name: names.get(userId) ?? '',
    busy: busy.get(userId) ?? [],
  }))

  return ok(
    anyBarberSlots({
      barbers,
      serviceIsActive: offer.serviceIsActive,
      date: input.date,
      now: ports.clock.now(),
      appointmentsOnDay,
    }),
  )
}
