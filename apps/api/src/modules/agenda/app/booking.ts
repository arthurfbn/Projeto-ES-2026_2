import { fail, ok, type Result } from '../../../shared/result'
import { planAppointment, type PaymentMethod } from '../core/booking'
import type { AgendaPorts, AppointmentRecord } from './ports'
import { loadBookingContext } from './slots'

/** Data do calendário de São Paulo (AAAA-MM-DD) de um instante; offset fixo, ver core/slots.ts. */
const saoPauloDate = (instant: Date) => new Date(instant.getTime() - 3 * 60 * 60_000).toISOString().slice(0, 10)

export type BookedAppointment = AppointmentRecord & { barberName: string }

/**
 * R9–R11: o cliente agenda um horário livre, com um barbeiro ou com "qualquer barbeiro". O core
 * confere que o horário ainda é livre; a constraint do banco resolve a corrida entre dois clientes.
 */
export async function bookAppointment(
  ports: AgendaPorts,
  input: {
    clientUserId: string
    barbershopId: string
    serviceId: string
    membershipId?: string
    startsAt: Date
    paymentMethod: PaymentMethod
  },
): Promise<Result<BookedAppointment, 'SERVICE_NOT_FOUND' | 'SLOT_NOT_AVAILABLE'>> {
  const context = await loadBookingContext(ports, { ...input, date: saoPauloDate(input.startsAt) })
  if (!context) return fail('SERVICE_NOT_FOUND')

  const plan = planAppointment({ ...context, ...input, now: ports.clock.now() })
  if (!plan.ok) return plan
  const barber = context.barbers.find((candidate) => candidate.membershipId === plan.value.membershipId)
  if (!barber) return fail('SLOT_NOT_AVAILABLE')

  const created = await ports.appointments.create({
    ...plan.value,
    barbershopId: input.barbershopId,
    clientUserId: input.clientUserId,
    barberUserId: barber.userId,
    serviceId: input.serviceId,
  })
  if (!created.ok) return created
  return ok({ ...created.value, barberName: barber.name })
}
