/**
 * Horários livres (spec 003, R5–R8; ADR-0023). Funções puras: o "agora" e os agendamentos que
 * ocupam o barbeiro chegam por parâmetro.
 */

/** Janela semanal de disponibilidade com vigência (datas de São Paulo, AAAA-MM-DD, inclusivas). */
export type AvailabilityWindow = {
  weekday: number
  startMinute: number
  endMinute: number
  validFrom: string
  validUntil: string | null
}

/** Agendamento ativo do barbeiro, em qualquer barbearia: [início, fim). */
export type BusyInterval = { startsAt: Date; endsAt: Date }

/** Barbeiro que realiza o serviço, com o preço e a duração que valem para ele (R16 da spec 001). */
export type SlotBarber = {
  membershipId: string
  name: string
  isActive: boolean
  acceptsAppointments: boolean
  priceCents: number
  durationMinutes: number
  availability: AvailabilityWindow[]
  busy: BusyInterval[]
}

export type AssignedBarber = Pick<SlotBarber, 'membershipId' | 'name' | 'priceCents' | 'durationMinutes'>

const STEP_MINUTES = 15
const MINUTE_MS = 60_000
const MIN_LEAD_MS = 30 * MINUTE_MS
const MAX_AHEAD_MS = 30 * 24 * 60 * MINUTE_MS

/** Dia da semana (0 = domingo) de uma data do calendário, sem depender de fuso. */
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay()

/**
 * Instante de um minuto do dia em São Paulo. Offset fixo de -03:00: o Brasil não tem horário de
 * verão desde 2019.
 */
const saoPauloInstant = (date: string, minute: number) =>
  new Date(Date.parse(`${date}T00:00:00-03:00`) + minute * MINUTE_MS)

/** Início e fim ([from, to)) de um dia do calendário de São Paulo. */
export const saoPauloDayBounds = (date: string) => ({
  from: saoPauloInstant(date, 0),
  to: saoPauloInstant(date, 24 * 60),
})

const isValidOn =(window: AvailabilityWindow, date: string) =>
  window.weekday === weekdayOf(date) && window.validFrom <= date && (window.validUntil === null || date <= window.validUntil)

const overlapsAny = (startsAt: Date, endsAt: Date, busy: BusyInterval[]) =>
  busy.some((interval) => startsAt < interval.endsAt && interval.startsAt < endsAt)

/** R7: só barbeiro com vínculo ativo, aceitando agendamentos, e só serviço ativo. */
const canBeBooked = (barber: SlotBarber, serviceIsActive: boolean) =>
  serviceIsActive && barber.isActive && barber.acceptsAppointments

/**
 * R5–R7: inícios possíveis, de 15 em 15 minutos, dentro de uma disponibilidade vigente no dia,
 * cabendo a duração inteira, sem sobrepor agendamento ativo do barbeiro e entre 30 minutos e
 * 30 dias a partir de agora. Ordenados.
 */
export function freeSlots(input: { barber: SlotBarber; serviceIsActive: boolean; date: string; now: Date }): Date[] {
  const { barber, date, now } = input
  if (!canBeBooked(barber, input.serviceIsActive)) return []

  const earliest = now.getTime() + MIN_LEAD_MS
  const latest = now.getTime() + MAX_AHEAD_MS
  const slots: Date[] = []

  for (const window of barber.availability.filter((candidate) => isValidOn(candidate, date))) {
    const firstStart = Math.ceil(window.startMinute / STEP_MINUTES) * STEP_MINUTES
    for (let minute = firstStart; minute + barber.durationMinutes <= window.endMinute; minute += STEP_MINUTES) {
      const startsAt = saoPauloInstant(date, minute)
      const endsAt = new Date(startsAt.getTime() + barber.durationMinutes * MINUTE_MS)
      if (startsAt.getTime() < earliest || startsAt.getTime() > latest) continue
      if (overlapsAny(startsAt, endsAt, barber.busy)) continue
      slots.push(startsAt)
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime())
}

/**
 * R8 (ADR-0023): entre os barbeiros livres no horário, o de menos agendamentos no dia naquela
 * barbearia; empate → menor preço; depois, ordem alfabética do nome.
 */
export function assignAnyBarber<T extends { name: string; priceCents: number; appointmentsOnDay: number }>(
  candidates: T[],
): T | null {
  const sorted = [...candidates].sort(
    (a, b) =>
      a.appointmentsOnDay - b.appointmentsOnDay ||
      a.priceCents - b.priceCents ||
      a.name.localeCompare(b.name, 'pt-BR'),
  )
  return sorted[0] ?? null
}

export type AnyBarberSlots = {
  /** Cada horário com o barbeiro que seria atribuído, para mostrar nome e preço antes de confirmar. */
  slots: { startsAt: Date; barber: AssignedBarber }[]
  /** Menor preço entre os barbeiros com horário no dia; null se não há horário. */
  fromPriceCents: number | null
  /** Preços diferentes entre esses barbeiros: a lista mostra "a partir de R$ X". */
  pricesDiffer: boolean
}

/** R8: união dos horários livres dos barbeiros que realizam o serviço, com o atribuído em cada um. */
export function anyBarberSlots(input: {
  barbers: SlotBarber[]
  serviceIsActive: boolean
  date: string
  now: Date
  /** Agendamentos do dia naquela barbearia, por vínculo; ausente = nenhum. */
  appointmentsOnDay: ReadonlyMap<string, number>
}): AnyBarberSlots {
  const freeByStart = new Map<number, AssignedBarber[]>()
  const pricesWithSlots: number[] = []

  for (const barber of input.barbers) {
    const slots = freeSlots({ barber, serviceIsActive: input.serviceIsActive, date: input.date, now: input.now })
    if (slots.length > 0) pricesWithSlots.push(barber.priceCents)
    const assignable = toAssigned(barber)
    for (const startsAt of slots) {
      freeByStart.set(startsAt.getTime(), [...(freeByStart.get(startsAt.getTime()) ?? []), assignable])
    }
  }

  const slots = [...freeByStart.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([start, free]) => {
      const chosen = assignAnyBarber(
        free.map((barber) => ({ ...barber, appointmentsOnDay: input.appointmentsOnDay.get(barber.membershipId) ?? 0 })),
      )
      return chosen ? [{ startsAt: new Date(start), barber: toAssigned(chosen) }] : []
    })

  const fromPriceCents = pricesWithSlots.length > 0 ? Math.min(...pricesWithSlots) : null
  return { slots, fromPriceCents, pricesDiffer: new Set(pricesWithSlots).size > 1 }
}

const toAssigned = ({ membershipId, name, priceCents, durationMinutes }: AssignedBarber): AssignedBarber => ({
  membershipId,
  name,
  priceCents,
  durationMinutes,
})
