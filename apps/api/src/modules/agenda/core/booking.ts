import { fail, ok, type Result } from '../../../shared/result'
import { assignAnyBarber, freeSlots, type SlotBarber } from './slots'

/**
 * Agendar (spec 003, R9–R11; ADR-0013, ADR-0023). Função pura: o horário só vira agendamento se
 * ainda for um horário livre (R5–R7) de um barbeiro que realiza o serviço.
 */

export type PaymentMethod = 'online' | 'on_site'
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

/** Status em que o agendamento ocupa o horário do barbeiro (R5, R11; ADR-0013). */
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_progress'] as const satisfies AppointmentStatus[]

/** Status que contam como agendamento do dia na atribuição de "qualquer barbeiro" (R8). */
export const COUNTED_STATUSES = [...ACTIVE_STATUSES, 'completed'] as const satisfies AppointmentStatus[]

export type AppointmentPlan = {
  membershipId: string
  startsAt: Date
  endsAt: Date
  /** Congelados no momento do agendamento (R9, CA7). */
  priceCents: number
  durationMinutes: number
  paymentMethod: PaymentMethod
  status: AppointmentStatus
}

const MINUTE_MS = 60_000

/** Data do calendário de São Paulo de um instante (offset fixo de -03:00, ver slots.ts). */
const saoPauloDate = (instant: Date) => new Date(instant.getTime() - 3 * 60 * MINUTE_MS).toISOString().slice(0, 10)

/** ADR-0013: no local nasce confirmado; online nasce pendente até o pagamento. */
const initialStatus = (method: PaymentMethod): AppointmentStatus => (method === 'on_site' ? 'confirmed' : 'pending')

/**
 * R9–R11: com um barbeiro escolhido (`membershipId`), o horário precisa estar livre para ele; com
 * "qualquer barbeiro", entre os livres no horário vale a atribuição do R8. Preço e duração são os
 * do barbeiro no momento (congelados).
 */
export function planAppointment(input: {
  barbers: SlotBarber[]
  membershipId?: string
  startsAt: Date
  paymentMethod: PaymentMethod
  serviceIsActive: boolean
  now: Date
  appointmentsOnDay: ReadonlyMap<string, number>
}): Result<AppointmentPlan, 'SLOT_NOT_AVAILABLE'> {
  const date = saoPauloDate(input.startsAt)
  const candidates = input.membershipId
    ? input.barbers.filter((barber) => barber.membershipId === input.membershipId)
    : input.barbers
  const free = candidates.filter((barber) =>
    freeSlots({ barber, serviceIsActive: input.serviceIsActive, date, now: input.now }).some(
      (slot) => slot.getTime() === input.startsAt.getTime(),
    ),
  )

  const chosen = assignAnyBarber(
    free.map((barber) => ({ ...barber, appointmentsOnDay: input.appointmentsOnDay.get(barber.membershipId) ?? 0 })),
  )
  if (!chosen) return fail('SLOT_NOT_AVAILABLE')

  return ok({
    membershipId: chosen.membershipId,
    startsAt: input.startsAt,
    endsAt: new Date(input.startsAt.getTime() + chosen.durationMinutes * MINUTE_MS),
    priceCents: chosen.priceCents,
    durationMinutes: chosen.durationMinutes,
    paymentMethod: input.paymentMethod,
    status: initialStatus(input.paymentMethod),
  })
}
