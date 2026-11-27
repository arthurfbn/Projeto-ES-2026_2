import { describe, expect, it } from 'vitest'
import { anyBarberSlots, assignAnyBarber, freeSlots, type SlotBarber } from './slots'

// 2026-11-30 é uma segunda-feira.
const MONDAY = '2026-11-30'
const at = (time: string, date = MONDAY) => new Date(`${date}T${time}:00-03:00`)
const hhmm = (instants: Date[]) =>
  instants.map((instant) =>
    instant.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
  )

/** Léo: seg 09:00–12:00, vigente desde 01/11, Corte de 30 min por R$ 50. */
function leo(overrides: Partial<SlotBarber> = {}): SlotBarber {
  return {
    membershipId: 'leo',
    name: 'Léo',
    isActive: true,
    acceptsAppointments: true,
    priceCents: 5000,
    durationMinutes: 30,
    availability: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, validFrom: '2026-11-01', validUntil: null }],
    busy: [],
    ...overrides,
  }
}

const sundayBefore = at('20:00', '2026-11-29')

describe('freeSlots', () => {
  it('lista de 15 em 15 os inícios em que o serviço cabe inteiro na disponibilidade (CA4)', () => {
    const slots = freeSlots({ barber: leo(), serviceIsActive: true, date: MONDAY, now: sundayBefore })

    expect(hhmm(slots)).toEqual([
      '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45',
      '11:00', '11:15', '11:30',
    ])
  })

  it('tira os horários que sobrepõem agendamento ativo do barbeiro em qualquer barbearia (CA4)', () => {
    const barber = leo({ busy: [{ startsAt: at('10:00'), endsAt: at('10:30') }] })

    const slots = hhmm(freeSlots({ barber, serviceIsActive: true, date: MONDAY, now: sundayBefore }))

    expect(slots).not.toContain('09:45')
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:15')
    expect(slots).toContain('09:30')
    expect(slots).toContain('10:30')
  })

  it('começa 30 minutos depois de agora, no próximo múltiplo de 15 (CA5)', () => {
    const barber = leo({
      availability: [{ weekday: 1, startMinute: 9 * 60, endMinute: 18 * 60, validFrom: '2026-11-01', validUntil: null }],
    })

    const slots = hhmm(freeSlots({ barber, serviceIsActive: true, date: MONDAY, now: at('14:10') }))

    expect(slots[0]).toBe('14:45')
  })

  it('não oferece nada depois de 30 dias a partir de agora (CA5)', () => {
    // Sábado 31/10 às 10:20: o limite é segunda 30/11 às 10:20.
    const now = at('10:20', '2026-10-31')

    expect(hhmm(freeSlots({ barber: leo(), serviceIsActive: true, date: MONDAY, now })).at(-1)).toBe('10:15')
    expect(freeSlots({ barber: leo(), serviceIsActive: true, date: '2026-12-07', now })).toEqual([])
  })

  it('só usa disponibilidade vigente naquele dia', () => {
    const barber = leo({
      availability: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, validFrom: '2026-12-01', validUntil: null }],
    })

    expect(freeSlots({ barber, serviceIsActive: true, date: MONDAY, now: sundayBefore })).toEqual([])
  })

  it.each([
    ['vínculo inativo', { isActive: false }, true],
    ['barbeiro sem aceitar agendamentos', { acceptsAppointments: false }, true],
    ['serviço inativo', {}, false],
  ])('não oferece horário com %s (R7)', (_case, overrides, serviceIsActive) => {
    expect(freeSlots({ barber: leo(overrides), serviceIsActive, date: MONDAY, now: sundayBefore })).toEqual([])
  })
})

describe('assignAnyBarber', () => {
  const candidate = (name: string, priceCents: number, appointmentsOnDay: number) => ({
    membershipId: name.toLowerCase(),
    name,
    priceCents,
    appointmentsOnDay,
  })

  it('atribui o barbeiro com menos agendamentos no dia (CA6)', () => {
    const chosen = assignAnyBarber([candidate('Léo', 5000, 2), candidate('Bia', 4000, 1)])
    expect(chosen?.name).toBe('Bia')
  })

  it('no empate, o de menor preço; depois, ordem alfabética', () => {
    expect(assignAnyBarber([candidate('Léo', 4000, 1), candidate('Bia', 5000, 1)])?.name).toBe('Léo')
    expect(assignAnyBarber([candidate('Léo', 4000, 1), candidate('Ana', 4000, 1)])?.name).toBe('Ana')
  })

  it('sem candidato livre, ninguém é atribuído', () => {
    expect(assignAnyBarber([])).toBeNull()
  })
})

describe('anyBarberSlots', () => {
  const bia = (overrides: Partial<SlotBarber> = {}) =>
    leo({
      membershipId: 'bia',
      name: 'Bia',
      priceCents: 4000,
      availability: [{ weekday: 1, startMinute: 10 * 60, endMinute: 11 * 60, validFrom: '2026-11-01', validUntil: null }],
      ...overrides,
    })

  it('une os horários e, em cada um, mostra quem seria atribuído (CA6)', () => {
    const result = anyBarberSlots({
      barbers: [leo(), bia()],
      serviceIsActive: true,
      date: MONDAY,
      now: sundayBefore,
      appointmentsOnDay: new Map([['leo', 2], ['bia', 1]]),
    })

    const byTime = new Map(result.slots.map((slot) => [hhmm([slot.startsAt])[0], slot.barber.name]))
    expect(byTime.get('09:00')).toBe('Léo')
    expect(byTime.get('10:00')).toBe('Bia')
    expect(byTime.get('11:30')).toBe('Léo')
    expect(result.slots).toHaveLength(11)
  })

  it('mostra "a partir de" quando os preços diferem', () => {
    const result = anyBarberSlots({
      barbers: [leo(), bia()],
      serviceIsActive: true,
      date: MONDAY,
      now: sundayBefore,
      appointmentsOnDay: new Map(),
    })

    expect(result).toMatchObject({ fromPriceCents: 4000, pricesDiffer: true })
  })

  it('não conta o preço de quem não tem horário no dia', () => {
    const result = anyBarberSlots({
      barbers: [leo(), bia({ acceptsAppointments: false })],
      serviceIsActive: true,
      date: MONDAY,
      now: sundayBefore,
      appointmentsOnDay: new Map(),
    })

    expect(result).toMatchObject({ fromPriceCents: 5000, pricesDiffer: false })
  })
})
