import { describe, expect, it } from 'vitest'
import { planAppointment } from './booking'
import type { SlotBarber } from './slots'

// 2026-11-30 é uma segunda-feira.
const at = (time: string, date = '2026-11-30') => new Date(`${date}T${time}:00-03:00`)
const sundayBefore = at('20:00', '2026-11-29')

function barber(name: string, overrides: Partial<SlotBarber> = {}): SlotBarber {
  return {
    membershipId: name.toLowerCase(),
    name,
    isActive: true,
    acceptsAppointments: true,
    priceCents: 5000,
    durationMinutes: 30,
    availability: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, validFrom: '2026-11-01', validUntil: null }],
    busy: [],
    ...overrides,
  }
}

const leo = barber('Léo')
const bia = barber('Bia', { priceCents: 4000 })

describe('planAppointment', () => {
  it('CA7: pagando no local, nasce confirmado com preço e duração congelados do barbeiro', () => {
    const plan = planAppointment({
      barbers: [leo],
      membershipId: 'léo',
      startsAt: at('10:00'),
      paymentMethod: 'on_site',
      serviceIsActive: true,
      now: sundayBefore,
      appointmentsOnDay: new Map(),
    })

    expect(plan).toEqual({
      ok: true,
      value: {
        membershipId: 'léo',
        startsAt: at('10:00'),
        endsAt: at('10:30'),
        priceCents: 5000,
        durationMinutes: 30,
        paymentMethod: 'on_site',
        status: 'confirmed',
      },
    })
  })

  it('pagando online, nasce pendente (ADR-0013)', () => {
    const plan = planAppointment({
      barbers: [leo],
      membershipId: 'léo',
      startsAt: at('10:00'),
      paymentMethod: 'online',
      serviceIsActive: true,
      now: sundayBefore,
      appointmentsOnDay: new Map(),
    })

    expect(plan.ok && plan.value.status).toBe('pending')
  })

  it('"qualquer barbeiro" atribui o livre com menos agendamentos no dia (CA6 da #43)', () => {
    const plan = planAppointment({
      barbers: [leo, bia],
      startsAt: at('10:00'),
      paymentMethod: 'on_site',
      serviceIsActive: true,
      now: sundayBefore,
      appointmentsOnDay: new Map([['léo', 2], ['bia', 1]]),
    })

    expect(plan.ok && plan.value).toMatchObject({ membershipId: 'bia', priceCents: 4000 })
  })

  it('"qualquer barbeiro" ignora quem está ocupado no horário', () => {
    const busyBia = barber('Bia', { priceCents: 4000, busy: [{ startsAt: at('10:00'), endsAt: at('10:30') }] })

    const plan = planAppointment({
      barbers: [leo, busyBia],
      startsAt: at('10:00'),
      paymentMethod: 'on_site',
      serviceIsActive: true,
      now: sundayBefore,
      appointmentsOnDay: new Map(),
    })

    expect(plan.ok && plan.value.membershipId).toBe('léo')
  })

  it.each([
    ['horário que deixou de ser livre', { barbers: [barber('Léo', { busy: [{ startsAt: at('09:45'), endsAt: at('10:15') }] })] }],
    ['horário fora da janela de 30 minutos (R6)', { now: at('09:40') }],
    ['horário fora do passo de 15 minutos', { startsAt: at('10:05') }],
    ['horário fora da disponibilidade', { startsAt: at('12:00') }],
    ['barbeiro que não realiza o serviço', { membershipId: 'bia' }],
    ['serviço inativo', { serviceIsActive: false }],
  ])('recusa %s com SLOT_NOT_AVAILABLE (CA8)', (_case, overrides) => {
    const plan = planAppointment({
      barbers: [leo],
      membershipId: 'léo',
      startsAt: at('10:00'),
      paymentMethod: 'on_site',
      serviceIsActive: true,
      now: sundayBefore,
      appointmentsOnDay: new Map(),
      ...overrides,
    })

    expect(plan).toEqual({ ok: false, error: 'SLOT_NOT_AVAILABLE' })
  })
})
